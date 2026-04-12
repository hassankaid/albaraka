import { EMOTIONS_BY_ID } from "./emotions";
import { TARGETS } from "./phases";

export interface DailyLogInput {
  rp_d: number;
  rp_c: number;
  ventes: number;
  emotions: string[];
}

export interface WeekStats {
  rpD: number;
  rpC: number;
  vt: number;
  act: number;
  hitD: boolean;
  hitC: boolean;
  hitB: boolean;
  topEmotions: [string, number][];
  posCount: number;
  negCount: number;
  avgEnergy: number | null;
  totalEmotions: number;
}

export interface WeekRecap {
  headline: string;
  detail: string;
  emotionInsight: string;
  tip: string;
  learnings: string[];
}

export function computeWeekStats(days: DailyLogInput[]): WeekStats {
  const rpD = days.reduce((s, d) => s + (d.rp_d || 0), 0);
  const rpC = days.reduce((s, d) => s + (d.rp_c || 0), 0);
  const vt = days.reduce((s, d) => s + (d.ventes || 0), 0);
  const act = days.filter(
    (d) => d.rp_d || d.rp_c || d.ventes || (d.emotions && d.emotions.length > 0),
  ).length;

  const allEmotions = days.flatMap((d) => d.emotions ?? []);
  const emotionCounts: Record<string, number> = {};
  for (const e of allEmotions) emotionCounts[e] = (emotionCounts[e] ?? 0) + 1;

  const topEmotions = Object.entries(emotionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3) as [string, number][];

  const posCount = allEmotions.filter((e) => EMOTIONS_BY_ID.get(e)?.cat === "positive").length;
  const negCount = allEmotions.filter((e) => EMOTIONS_BY_ID.get(e)?.cat === "negatif").length;

  const avgEnergy =
    allEmotions.length > 0
      ? allEmotions.reduce((s, e) => s + (EMOTIONS_BY_ID.get(e)?.energy ?? 3), 0) /
        allEmotions.length
      : null;

  return {
    rpD,
    rpC,
    vt,
    act,
    hitD: rpD >= TARGETS.rpDecouverte,
    hitC: rpC >= TARGETS.rpClosing,
    hitB: rpD >= TARGETS.rpDecouverte && rpC >= TARGETS.rpClosing,
    topEmotions,
    posCount,
    negCount,
    avgEnergy,
    totalEmotions: allEmotions.length,
  };
}

export function buildWeekRecap(
  days: DailyLogInput[],
  learningsIn: string[],
  weekNumber: number,
  previousDays?: DailyLogInput[],
): WeekRecap | null {
  const st = computeWeekStats(days);
  if (st.act === 0) return null;

  const pSt = previousDays ? computeWeekStats(previousDays) : null;
  const improving = pSt ? st.rpD + st.rpC > pSt.rpD + pSt.rpC : false;

  // Headline
  let headline = "";
  if (st.hitB && st.vt > 0) {
    headline = [
      "Semaine exceptionnelle ! 🏆",
      "Tu es en feu cette semaine ! 🔥",
      "Machine de guerre ! 💪",
      "Semaine parfaite, bravo ! ⭐",
    ][weekNumber % 4];
  } else if (st.hitB) {
    headline = "Objectifs RP atteints ! Les ventes vont suivre. 💪";
  } else if (st.rpD + st.rpC >= (TARGETS.rpDecouverte + TARGETS.rpClosing) * 0.7) {
    headline = "Presque ! Continue comme ça. 📈";
  } else if (st.act >= 3) {
    headline = "La régularité est là. Continue. 🌱";
  } else {
    headline = "C'est un début. Chaque jour compte. 🎯";
  }

  // Detail
  const parts: string[] = [];
  parts.push(st.hitD ? `${st.rpD} RP découverte ✓` : `${st.rpD}/${TARGETS.rpDecouverte} RP découverte`);
  parts.push(st.hitC ? `${st.rpC} RP closing ✓` : `${st.rpC}/${TARGETS.rpClosing} RP closing`);
  if (st.vt > 0) parts.push(`${st.vt} vente${st.vt > 1 ? "s" : ""} 🎉`);
  parts.push(`${st.act}/7 jours actifs`);
  const detail = parts.join("  ·  ");

  // Emotion insight
  let emotionInsight = "";
  if (st.topEmotions.length > 0) {
    const topLabels = st.topEmotions
      .map(([id, count]) => {
        const em = EMOTIONS_BY_ID.get(id);
        return em ? `${em.emoji} ${em.label} (${count}x)` : "";
      })
      .filter(Boolean);
    emotionInsight = "Émotions dominantes : " + topLabels.join(", ");
    if (st.posCount > st.negCount * 2) {
      emotionInsight += "\n→ Ton état d'esprit est excellent cette semaine. Capitalise dessus.";
    } else if (st.negCount > st.posCount * 2) {
      emotionInsight +=
        "\n→ Beaucoup de tension cette semaine. Pense à libérer tes émotions avant chaque appel.";
    } else if (st.posCount > 0 && st.negCount > 0) {
      emotionInsight += "\n→ Semaine contrastée. Note quels jours étaient les meilleurs et pourquoi.";
    }
    if (st.avgEnergy !== null) {
      emotionInsight += `\nÉnergie moyenne : ${st.avgEnergy.toFixed(1)}/5`;
    }
  }

  // Tip
  let tip = "";
  if (st.avgEnergy !== null && st.avgEnergy <= 2) {
    tip = [
      "Chaque « non » est une information, pas un échec.",
      "Les meilleurs closers ont traversé des phases difficiles.",
      "Le secret c'est la régularité. Même un jour dur compte.",
      "Réécoute tes meilleurs appels pour te rebooster.",
    ][weekNumber % 4];
  } else if (improving) {
    tip = "Tu progresses par rapport à la semaine dernière. La consistance paie.";
  } else if (weekNumber <= 4) {
    tip = "Phase Fondations : focus qualité des RP, pas quantité de ventes.";
  } else if (weekNumber <= 8) {
    tip = "Phase Traction : les automatismes s'installent.";
  } else {
    tip = "Phase Performance : affine ton style personnel.";
  }

  const learnings = learningsIn.filter((l) => l && l.trim());

  return { headline, detail, emotionInsight, tip, learnings };
}
