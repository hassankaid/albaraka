/** Stats hebdo + recap motivant — portage verbatim de la source Plan90. */
import { EMOTIONS, TARGETS, type WeekData, type Plan90Data } from "./config";

export interface WeekStats {
  rpD: number; rpC: number; vt: number; act: number;
  hitD: boolean; hitC: boolean; hitB: boolean;
  topEmotions: [string, number][];
  posCount: number; negCount: number; avgEnergy: number | null; totalEmotions: number;
}

export function wStats(wd: WeekData): WeekStats {
  const ds = Object.values(wd.days);
  const rpD = ds.reduce((s, d) => s + (parseInt(d.rpD) || 0), 0);
  const rpC = ds.reduce((s, d) => s + (parseInt(d.rpC) || 0), 0);
  const vt = ds.reduce((s, d) => s + (parseInt(d.ventes) || 0), 0);
  const act = ds.filter((d) => d.rpD || d.rpC || d.ventes || (d.emotions && d.emotions.length > 0)).length;
  // Emotion analysis
  const allEmotions = ds.flatMap((d) => d.emotions || []);
  const emotionCounts: Record<string, number> = {};
  allEmotions.forEach((e) => { emotionCounts[e] = (emotionCounts[e] || 0) + 1; });
  const topEmotions = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1]).slice(0, 3) as [string, number][];
  const posCount = allEmotions.filter((e) => EMOTIONS.find((em) => em.id === e)?.cat === "positive").length;
  const negCount = allEmotions.filter((e) => EMOTIONS.find((em) => em.id === e)?.cat === "negatif").length;
  const avgEnergy = allEmotions.length > 0
    ? allEmotions.reduce((s, e) => s + (EMOTIONS.find((em) => em.id === e)?.energy || 3), 0) / allEmotions.length
    : null;
  return {
    rpD, rpC, vt, act,
    hitD: rpD >= TARGETS.rpDecouverte, hitC: rpC >= TARGETS.rpClosing,
    hitB: rpD >= TARGETS.rpDecouverte && rpC >= TARGETS.rpClosing,
    topEmotions, posCount, negCount, avgEnergy, totalEmotions: allEmotions.length,
  };
}

export interface WeekRecap { h: string; det: string; emotionInsight: string; tip: string; learnings: string[]; }

export function getRecap(wd: WeekData, wn: number, all: Plan90Data): WeekRecap | null {
  const st = wStats(wd);
  if (st.act === 0) return null;
  const prev = all[wn - 1];
  const pSt = prev ? wStats(prev) : null;
  const impr = pSt ? (st.rpD + st.rpC) > (pSt.rpD + pSt.rpC) : false;
  // Headline
  let h = "";
  if (st.hitB && st.vt > 0) {
    h = ["Semaine exceptionnelle ! 🏆", "Tu es en feu cette semaine ! 🔥", "Machine de guerre ! 💪", "Semaine parfaite, bravo ! ⭐"][wn % 4];
  } else if (st.hitB) {
    h = "Objectifs RP atteints ! Les ventes vont suivre. 💪";
  } else if ((st.rpD + st.rpC) >= (TARGETS.rpDecouverte + TARGETS.rpClosing) * 0.7) {
    h = "Presque ! Continue comme ça. 📈";
  } else if (st.act >= 3) {
    h = "La régularité est là. Continue. 🌱";
  } else {
    h = "C'est un début. Chaque jour compte. 🎯";
  }
  // Detail
  const p: string[] = [];
  p.push(st.hitD ? st.rpD + " RP découverte ✓" : st.rpD + "/" + TARGETS.rpDecouverte + " RP découverte");
  p.push(st.hitC ? st.rpC + " RP closing ✓" : st.rpC + "/" + TARGETS.rpClosing + " RP closing");
  if (st.vt > 0) p.push(st.vt + " vente" + (st.vt > 1 ? "s" : "") + " 🎉");
  p.push(st.act + "/7 jours actifs");
  const det = p.join("  ·  ");
  // Emotional insight
  let emotionInsight = "";
  if (st.topEmotions.length > 0) {
    const topLabels = st.topEmotions.map(([id, count]) => {
      const em = EMOTIONS.find((e) => e.id === id);
      return em ? em.emoji + " " + em.label + " (" + count + "x)" : "";
    }).filter(Boolean);
    emotionInsight = "Émotions dominantes : " + topLabels.join(", ");
    if (st.posCount > st.negCount * 2) {
      emotionInsight += "\n→ Ton état d'esprit est excellent cette semaine. Capitalise dessus.";
    } else if (st.negCount > st.posCount * 2) {
      emotionInsight += "\n→ Beaucoup de tension cette semaine. Pense à libérer tes émotions avant chaque appel.";
    } else if (st.posCount > 0 && st.negCount > 0) {
      emotionInsight += "\n→ Semaine contrastée. Note quels jours étaient les meilleurs et pourquoi.";
    }
    if (st.avgEnergy !== null) {
      emotionInsight += "\nÉnergie moyenne : " + st.avgEnergy.toFixed(1) + "/5";
    }
  }
  // Tip
  let tip = "";
  if (st.avgEnergy && st.avgEnergy <= 2) {
    tip = ["Chaque « non » est une information, pas un échec.", "Les meilleurs closers ont traversé des phases difficiles.", "Le secret c'est la régularité. Même un jour dur compte.", "Réécoute tes meilleurs appels pour te rebooster."][wn % 4];
  } else if (impr) {
    tip = "Tu progresses par rapport à la semaine dernière. La consistance paie.";
  } else if (wn <= 4) {
    tip = "Phase Fondations : focus qualité des RP, pas quantité de ventes.";
  } else if (wn <= 8) {
    tip = "Phase Traction : les automatismes s'installent.";
  } else {
    tip = "Phase Performance : affine ton style personnel.";
  }
  const learnings = Object.values(wd.days).map((d) => d.learning).filter((l) => l && l.trim());
  return { h, det, emotionInsight, tip, learnings };
}
