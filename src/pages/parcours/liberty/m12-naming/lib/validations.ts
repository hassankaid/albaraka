/**
 * M12 — validations heuristiques (port verbatim Sidali v1.2.1). Aucune IA.
 * Fonctions pures prenant data / strings.
 */
import {
  type M12Data, type Candidat, type Tests,
  WEAK_WORDS, YEAR_PATTERN, GENERIC_TRAPS, TRACE_MIN_LENGTH, type M12Step,
} from "./types";

export interface NameFlag { kind: "ok" | "warn" | "ko"; txt: string; }
export interface NameEval { score: number; max: number; length: number; syllables: number; words: number; flags: NameFlag[]; weak?: string[]; detail?: string; }

export function countSyllables(word: string): number {
  const w = String(word || "").trim().toLowerCase();
  if (!w) return 0;
  const cleaned = w.replace(/[^a-zà-ÿ]/g, "");
  if (!cleaned) return 0;
  const matches = cleaned.match(/[aeiouyàâäéèêëîïôöùûüœ]+/g);
  return matches ? matches.length : 1;
}
export function countTotalSyllables(name: string): number {
  return String(name || "").trim().split(/\s+/).reduce((acc, w) => acc + countSyllables(w), 0);
}
export function detectWeakWords(name: string): string[] {
  const low = String(name || "").toLowerCase();
  return WEAK_WORDS.filter((w) => low.indexOf(w) >= 0);
}
export function detectGenericTraps(text: string): string[] {
  const low = String(text || "").toLowerCase();
  return GENERIC_TRAPS.filter((w) => {
    const re = new RegExp("\\b" + w.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&") + "\\b", "i");
    return re.test(low);
  });
}
export function countDistinctTechniques(candidats: Candidat[]): number {
  const seen = new Set<string>();
  (candidats || []).forEach((c) => { if (c && c.nom && c.nom.trim() && c.technique && c.technique.trim()) seen.add(c.technique); });
  return seen.size;
}
export function hasMinTrace(s: string): boolean { return typeof s === "string" && s.trim().length >= TRACE_MIN_LENGTH; }
export function hasYear(name: string): boolean { return YEAR_PATTERN.test(String(name || "")); }
export function hasUnusualChars(name: string): boolean { return /[#@&\/\\<>{}\[\]|]/.test(String(name || "")); }

export function evaluateName(name: string): NameEval {
  const n = String(name || "").trim();
  if (!n) return { score: 0, max: 7, length: 0, syllables: 0, words: 0, flags: [], detail: "Pas de nom à évaluer." };
  const flags: NameFlag[] = [];
  let score = 0;
  const max = 7;
  const len = n.length;
  if (len >= 3 && len <= 30) { score++; flags.push({ kind: "ok", txt: "Longueur (" + len + " caractères) bien calibrée." }); }
  else if (len < 3) flags.push({ kind: "ko", txt: "Trop court (" + len + " caractères) — un nom doit avoir au moins 3 caractères." });
  else flags.push({ kind: "warn", txt: "Long (" + len + " caractères) — au-delà de 30 caractères, la mémorisation chute." });
  const syl = countTotalSyllables(n);
  if (syl >= 1 && syl <= 5) { score++; flags.push({ kind: "ok", txt: "Syllabes (" + syl + ") faciles à dire." }); }
  else if (syl > 5) flags.push({ kind: "warn", txt: "Beaucoup de syllabes (" + syl + ") — au-delà de 5, l'oral devient laborieux." });
  const weak = detectWeakWords(n);
  if (weak.length === 0) { score++; flags.push({ kind: "ok", txt: "Pas de mot générique faible détecté." }); }
  else flags.push({ kind: "warn", txt: "Mot générique faible présent : « " + weak.join(", ") + " ». Ce sont des mots que tout le monde utilise — ils diluent l'unicité de ton nom." });
  if (!hasYear(n)) { score++; flags.push({ kind: "ok", txt: "Pas d'année dans le nom." }); }
  else flags.push({ kind: "ko", txt: "Année détectée dans le nom — ton nom va sembler obsolète l'année prochaine. Retire la date." });
  if (!hasUnusualChars(n)) { score++; flags.push({ kind: "ok", txt: "Pas de caractère spécial qui poserait problème côté nom de domaine." }); }
  else flags.push({ kind: "warn", txt: "Caractères spéciaux détectés — ils empêchent l'achat d'un .com propre et compliquent l'oral." });
  if (/[aeiouyàâäéèêëîïôöùûüœ]/i.test(n)) { score++; flags.push({ kind: "ok", txt: "Le nom contient des voyelles, il est prononçable." }); }
  else flags.push({ kind: "ko", txt: "Aucune voyelle — le nom n'est pas prononçable à voix haute." });
  const words = n.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const isAcronymeLike = wordCount === 1 && /^[A-Z]{2,12}$/.test(n.replace(/[^A-Za-z]/g, ""));
  const articlePattern = /^(le|la|l['']|les|the|el)$/i;
  const strongWords = words.filter((w) => !articlePattern.test(w));
  if (isAcronymeLike || strongWords.length <= 3) { score++; flags.push({ kind: "ok", txt: "Concis (" + strongWords.length + " mot" + (strongWords.length > 1 ? "s" : "") + " fort" + (strongWords.length > 1 ? "s" : "") + ") — tient en tête d'un coup." }); }
  else flags.push({ kind: "warn", txt: "Trop long (" + strongWords.length + " mots forts) — un bon nom tient en 1 à 3 mots maximum. Au-delà, c'est un slogan, plus un nom. Compacte ou supprime." });
  return { score, max, length: len, syllables: syl, words: wordCount, flags, weak };
}

export function autoScoreLevel(score: number, max: number): "good" | "warn" | "bad" {
  if (score >= max - 1) return "good";
  if (score >= Math.ceil(max * 0.65)) return "warn";
  return "bad";
}

export function nonEmptyCandidats(data: M12Data): Candidat[] {
  return (data.candidats || []).filter((c) => c && c.nom && c.nom.trim().length >= 2);
}

export function allHumanTestsValidated(data: M12Data): boolean {
  const t = data.tests_par_candidat || {};
  const idx = (data.final || ({} as any)).candidat_idx_source;
  const key = idx >= 0 ? String(idx) : "final";
  const tests = t[key] || ({} as Tests);
  return !!(tests.telephone && hasMinTrace(tests.telephone_trace)
    && tests.google && hasMinTrace(tests.google_trace)
    && tests.promesse && hasMinTrace(tests.promesse_trace)
    && tests.resonance && hasMinTrace(tests.resonance_trace));
}

export function missingForFinal(data: M12Data): string[] {
  const f = data.final || ({} as any);
  const missing: string[] = [];
  if (!f.nom || !f.nom.trim()) missing.push("le nom final");
  if (!f.baseline || !f.baseline.trim()) missing.push("la baseline");
  return missing;
}
export function missingForPositionnement(data: M12Data): string[] {
  const p = data.positionnement || ({} as any);
  const missing: string[] = [];
  if (!p.cat_type || !p.cat_type.trim()) missing.push("le type d'accompagnement");
  if (!p.cat_cible || !p.cat_cible.trim()) missing.push("la cible précise");
  if (!p.cat_resultat || !p.cat_resultat.trim()) missing.push("le résultat spécifique");
  if (!p.ennemi_declare || !p.ennemi_declare.trim()) missing.push("le combat / ennemi que tu prends");
  return missing;
}
export function compileCategorieNouvelle(p: { cat_type?: string; cat_cible?: string; cat_resultat?: string }): string {
  const t = (p.cat_type || "").trim(), c = (p.cat_cible || "").trim(), r = (p.cat_resultat || "").trim();
  if (!t && !c && !r) return "";
  return ["Le seul", t, c, r].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

// ─── Gating cumulatif ─────────────────────────────────────────────────
export function canEnterTester(data: M12Data): boolean {
  return nonEmptyCandidats(data).length >= 5 && countDistinctTechniques(data.candidats || []) >= 3;
}
export function canEnterValider(data: M12Data): boolean { return (data.top3_indices || []).length >= 1; }
export function canEnterPositionnement(data: M12Data): boolean {
  const f = data.final || ({} as any);
  return !!(f.nom && f.nom.trim()) && !!(f.baseline && f.baseline.trim());
}
export function canEnterLock(data: M12Data): boolean {
  return canEnterValider(data) && canEnterPositionnement(data) && allHumanTestsValidated(data);
}

function joinFr(missing: string[]): string {
  if (missing.length === 0) return "";
  if (missing.length === 1) return missing[0];
  if (missing.length === 2) return missing[0] + " et " + missing[1];
  return missing.slice(0, -1).join(", ") + " et " + missing[missing.length - 1];
}

export function missingFieldsLabel(forStep: M12Step, data: M12Data): string {
  const missing: string[] = [];
  if (forStep === "tester_programme") {
    const n = nonEmptyCandidats(data).length;
    const t = countDistinctTechniques(data.candidats || []);
    if (n < 5) missing.push("au moins 5 candidats dans ta liste (tu en as " + n + ")");
    if (t < 3) missing.push("au moins 3 techniques différentes parmi tes candidats (tu en as " + t + ")");
  } else if (forStep === "valider_programme") {
    if ((data.top3_indices || []).length < 1) missing.push("au moins 1 candidat dans ton top 3");
  } else if (forStep === "positionnement" || forStep === "methode_unique" || forStep === "renommer_modules") {
    missingForFinal(data).forEach((m) => missing.push(m));
  } else if (forStep === "lock") {
    missingForFinal(data).forEach((m) => missing.push(m));
    missingForPositionnement(data).forEach((m) => missing.push(m));
    if (!allHumanTestsValidated(data)) missing.push("les 4 tests humains cochés ET justifiés par une trace sur le nom final");
  }
  return joinFr(missing);
}

/** Renvoie le bag 'final' actif (ou freshTests vide). */
export function activeTestsBag(data: M12Data, freshTests: () => Tests): Tests {
  const t = data.tests_par_candidat || {};
  const idx = (data.final || ({} as any)).candidat_idx_source;
  const key = idx >= 0 && t[String(idx)] ? String(idx) : "final";
  return t[key] || freshTests();
}
