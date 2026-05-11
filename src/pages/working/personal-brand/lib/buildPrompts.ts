import type { BrandAnswers, BrandMode } from "./sections";

function g(a: BrandAnswers, k: string): string {
  const v = a[k];
  if (Array.isArray(v)) return v.join(", ");
  return (v as string) ?? "";
}

function ga(a: BrandAnswers, k: string): string {
  const v = a[k];
  if (Array.isArray(v)) return v.join(", ");
  return (v as string) || "—";
}

function slug(s: string) {
  return (s || "prenom")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "");
}

function sub(s: string, n: number) {
  return s.length > n ? s.substring(0, n) + "…" : s;
}

// ─── PROMPT — 10 PROFILS INSTAGRAM ─────────────────────────────────────
export function buildBioPrompt(a: BrandAnswers, mode: BrandMode = "pass"): string {
  const p = slug(g(a, "prenom"));
  const ctx =
    mode === "liberty"
      ? `a sa propre offre "${g(a, "offre_nom")}" (${g(a, "offre_niche")})`
      : "est apporteur d'affaires AL BARAKA";

  return `Génère 5 profils Instagram. Chaque profil = username + nom affiché + bio 4 lignes COURTES.
PERSONNE : ${g(a, "prenom")}, ${g(a, "age")}, ${g(a, "situation")}. ${ctx}.
Motivation : "${g(a, "pourquoi")}"
Déclic : "${g(a, "declic")}"
Épreuves : "${g(a, "epreuves")}"
Fierté : "${g(a, "fierte")}"
Message : "${g(a, "message_monde")}"
Cible : ${g(a, "cible_qui")}
Problème cible : "${g(a, "cible_probleme")}"
Rêve cible : "${g(a, "cible_reve")}"
Musulmane : ${g(a, "cible_communaute")}
Archétype : ${g(a, "archetype")}
Ton : ${ga(a, "ton")} | Valeurs : ${ga(a, "valeurs")}
BIO = exactement 4 lignes, ULTRA COURTES (max 6-8 mots par ligne) :
Ligne 1 : [emoji] CE QUE JE FAIS pour les autres
Ligne 2 : [emoji] POUR QUI + résultat concret
Ligne 3 : [emoji] CRÉDIBILITÉ (valeurs, parcours, foi)
Ligne 4 : [emoji] CTA + ⬇️
Exemples de FORMAT (pas de contenu à copier) :
✍️ Je t'aide à vivre de ton tel
🎯 Mamans qui veulent leur liberté
🤲 100% halal · AL BARAKA
⬇️ Commence ici
INTERDIT : coach, digital, business, closing, scale, expert, leader, entrepreneur, formation
Usernames : ${p} + (.officiel/.story/.parcours/_journal/.voice/.way/.vie/_chemin/.iam/.route)
Puise dans le vécu réel. Ton oral, zéro jargon.
JSON uniquement, pas de backticks :
[{"style":"Nom du style","username":"x","profileName":"x","lines":["l1","l2","l3","l4"]}]`;
}

export const PROFILE_BATCHES = [
  "styles : narratif, mission, vulnérable, rêveur, communauté",
  "styles : minimaliste, spirituel, rebelle, journal, poétique",
];

// ─── PROMPT PERSONNALISÉ — ÉTAPE 2 (~3000+ mots) ────────────────────────
// Ce prompt sera copié par l'utilisateur et utilisé tel quel par
// l'Étape 3 pour générer ses scripts hebdomadaires.
export function buildFullPrompt(a: BrandAnswers, mode: BrandMode = "pass"): string {
  const musulmane = String(a.cible_communaute || "").includes("Oui");
  const foi = musulmane ? "Foi et valeurs islamiques quand c'est naturel — sans forcer." : "";
  const rappelSpirituel = musulmane ? "Rappel spirituel, " : "";
  const archType = g(a, "archetype").split("—")[0].trim();
  const isFem = g(a, "cible_genre") === "Femmes uniquement";

  // Hook style selon le ton de contenu (déduit du questionnaire)
  const tonContenu = g(a, "ton_contenu") || "";
  const hookStyle =
    tonContenu.indexOf("Émotionnel") > -1
      ? "HOOKS ÉMOTIONNELS : anecdotes, confessions, moments de vie."
      : tonContenu.indexOf("Éducatif") > -1
        ? "HOOKS ÉDUCATIFS : curiosité, faits, démos, mythes à casser. Pas de sensationnalisme."
        : tonContenu.indexOf("Sensible") > -1
          ? "HOOKS SENSIBLES : connexion, douceur. INTERDIT : choc, provocation, culpabilisation."
          : "HOOKS VARIÉS.";

  // Bloc Offre (Liberty uniquement)
  const offreBlock =
    mode === "liberty"
      ? `\n═══════════════════════════════════
SON OFFRE (CŒUR DE LA STRATÉGIE LIBERTY)
═══════════════════════════════════
- Nom : "${g(a, "offre_nom")}"
- Niche : ${g(a, "offre_niche")}
- Description : "${g(a, "offre_desc")}"
- Problème résolu : "${g(a, "offre_probleme")}"
- Transformation : "${g(a, "offre_transfo")}"
- Prix : ${g(a, "offre_prix")} | Accès : ${g(a, "offre_acces")}
- Unique : "${g(a, "offre_unique")}"
- Preuves : "${g(a, "offre_preuves") || "Pas encore de témoignages"}"
⚠️ S3 = teasing de l'offre. S4 = vente directe avec CTA "${g(a, "offre_acces")}".`
      : "";

  const ctxLine =
    mode === "pass"
      ? `Membre Pass AL BARAKA — apporteur d'affaires. Compétences : ${ga(a, "competences")}`
      : `Membre Liberty — propriétaire de son offre "${g(a, "offre_nom") || "—"}"`;

  const s4Strategy =
    mode === "liberty"
      ? `S4 🔥 CONVERSION — Vendre "${g(a, "offre_nom")}", casser les objections, CTA : "${g(a, "offre_acces")}"`
      : `S4 🔥 CONVERSION — Conversion douce vers lien en bio / tunnel AL BARAKA`;

  return `Tu es un scriptwriter et stratège de contenu. Tu vas créer du contenu UNIQUE pour une personne UNIQUE.

═══════════════════════════════════
ÉTAPE 0 — COMPRENDRE L'HUMAIN
═══════════════════════════════════
Avant de générer, analyse en interne :
1. L'HISTOIRE de cette personne
2. Son DÉCLIC
3. Sa VOIX INTÉRIEURE
4. Ce qui la rend DIFFÉRENTE / irremplaçable
5. L'ÉMOTION dominante de son parcours
${mode === "liberty" ? "6. POURQUOI son offre est DIFFÉRENTE\n7. POURQUOI acheter chez ELLE plutôt qu'ailleurs" : ""}

═══════════════════════════════════
QUI EST CETTE PERSONNE
═══════════════════════════════════
- Prénom : ${g(a, "prenom")} | ${g(a, "age")} | ${g(a, "situation")}
- Objectif revenu : ${g(a, "objectif_revenu")}
- Motivation : "${g(a, "pourquoi")}"
${ctxLine}

═══════════════════════════════════
SON HISTOIRE (matière première du contenu)
═══════════════════════════════════
- Déclic : "${g(a, "declic")}"
- Vie idéale dans 6 mois : "${g(a, "vie_ideale")}"
- Épreuves marquantes : "${g(a, "epreuves")}"
- Plus grande fierté : "${g(a, "fierte")}"
- Message au monde : "${g(a, "message_monde")}"
⚠️ CE VÉCU EST LE CŒUR DU CONTENU. Scripts IMPOSSIBLES À REPRODUIRE pour quelqu'un d'autre.
${offreBlock}

═══════════════════════════════════
SA CIBLE
═══════════════════════════════════
- Qui : ${g(a, "cible_qui")}
- Âge : ${ga(a, "cible_age")} | Genre : ${g(a, "cible_genre")}
- Problème n°1 : "${g(a, "cible_probleme")}"
- Rêve / transformation : "${g(a, "cible_reve")}"
- Peur / objection : "${g(a, "cible_objection")}"
- Musulmane : ${g(a, "cible_communaute")}

═══════════════════════════════════
SA PERSONNALITÉ — ${archType}
═══════════════════════════════════
${hookStyle}
⚠️ CHAQUE HOOK DIFFÉRENT. Jamais deux pareils sur la semaine.
- Ton : ${ga(a, "ton")}
- Valeurs : ${ga(a, "valeurs")}
- Sujets interdits : ${g(a, "sujets_eviter") || "Aucun"}
- Inspirations : ${g(a, "modele") || "Aucune"}

═══════════════════════════════════
STRATÉGIE TECHNIQUE
═══════════════════════════════════
- Format : ${g(a, "format_principal")} (PAS de B-rolls si non précisé)
- Plateformes : ${ga(a, "plateformes")}
- Fréquence : ${g(a, "frequence")}
- Batching : ${ga(a, "jour_creation")}
- Piliers : ${ga(a, "piliers")}

═══════════════════════════════════
STRATÉGIE 4 SEMAINES (cycle mensuel)
═══════════════════════════════════
S1 👋 NOTORIÉTÉ — Se présenter, déclic, valeurs. CTA : "Abonne-toi"
S2 💎 CRÉDIBILITÉ — Parcours, preuves, transformation. CTA : "Enregistre / Partage"
S3 🤝 ENGAGEMENT — Éduquer, valeur pure, interaction${mode === "liberty" ? ", teasing de l'offre" : ""}. CTA : "Commente / DM"
${s4Strategy}

═══════════════════════════════════
PAR SEMAINE
═══════════════════════════════════
- 7 SCRIPTS DE REELS (~60 sec, 1/jour)
- 21 IDÉES DE STORIES (3/jour : 🌅 matin, ☀️ midi, 🌙 soir)
- Structure script : HOOK (0-5s) → VALEUR (5-45s) → CTA (45-60s)
- Mot pour mot. Langage ORAL.

═══════════════════════════════════
RÈGLES ABSOLUES
═══════════════════════════════════
→ Scripts MOT POUR MOT — ${g(a, "prenom")} lit et tourne
→ Langage ORAL, comme ${g(a, "prenom")} parle à ${isFem ? "une amie" : "un ami"}
→ S1-S2 = pas de vente. ${mode === "liberty" ? `S3 = teasing. S4 = vente directe de "${g(a, "offre_nom")}"` : "S4 = conversion douce vers lien bio (tunnel AL BARAKA)"}
${foi ? `→ ${foi}` : ""}
→ Deux élèves AL BARAKA = scripts MÉCONNAISSABLES
→ Sujets à éviter : ${g(a, "sujets_eviter") || "aucun"}`;
}

// ─── ÉTAPE 3 : prompts JSON pour scripts + stories de la semaine ────────
// Reçoit le prompt copié par l'utilisateur (Étape 2) en "brief de base"
// et y ajoute les instructions hebdomadaires.

export interface WeeklyContext {
  weekNum: 1 | 2 | 3 | 4;
  theme: string; // "Notoriété", "Crédibilité", "Engagement", "Conversion"
  focus: string;
  ctaStyle: string;
  arc: string; // "🌅citation · ☀️coulisses · 🌙sondage"
  topicsHistory: string[]; // anti-répétition
  basePrompt: string; // le prompt étape 2 collé par l'user
}

export const WEEKS: Array<{
  num: 1 | 2 | 3 | 4;
  theme: string;
  icon: string;
  desc: string;
  ctaStyle: string;
  focus: string;
  arc: string;
}> = [
  { num: 1, theme: "Notoriété", icon: "👋", desc: "Te faire connaître", ctaStyle: "Abonne-toi", focus: "Se présenter, déclic, valeurs", arc: "🌅citation · ☀️coulisses · 🌙sondage" },
  { num: 2, theme: "Crédibilité", icon: "💎", desc: "Prouver ta légitimité", ctaStyle: "Enregistre / Partage", focus: "Parcours, preuves, transformation", arc: "🌅conseil · ☀️avant/après · 🌙Q&A" },
  { num: 3, theme: "Engagement", icon: "🤝", desc: "Créer l'interaction", ctaStyle: "Commente / DM", focus: "Éduquer, valeur, interaction", arc: "🌅témoignage · ☀️tuto · 🌙spirituel" },
  { num: 4, theme: "Conversion", icon: "🔥", desc: "Inviter à l'action", ctaStyle: "Lien bio / DM NOW", focus: "Closer, objections, transformation", arc: "🌅storytelling · ☀️offre · 🌙urgence" },
];

export function buildWeeklyScriptsPrompt(ctx: WeeklyContext): string {
  const dayStart = (ctx.weekNum - 1) * 7 + 1;
  const dayEnd = ctx.weekNum * 7;
  const histLine =
    ctx.topicsHistory.length > 0
      ? `\nSujets déjà couverts (NE PAS RÉPÉTER) : ${ctx.topicsHistory.join(" · ")}`
      : "";

  return `Tu es une API JSON. UNIQUEMENT du JSON, pas de prose, pas de backticks.

Génère 7 scripts de Reels pour la SEMAINE ${ctx.weekNum} (thème : ${ctx.theme}).
Jours ${dayStart}-${dayEnd}.
Focus de la semaine : ${ctx.focus}
CTA style : ${ctx.ctaStyle}${histLine}

BRIEF COMPLET DE LA PERSONNE :
${ctx.basePrompt}

Format JSON STRICT (tableau de 7 objets) :
[{"day":${dayStart},"title":"titre court accrocheur","pilier":"Éducatif/Inspirationnel/...","objectif":"engagement/conversion/notoriété","hook":"phrase choc 0-5s","valeur":["point 1","point 2","point 3"],"cta":"CTA naturel","overlay":"texte qui apparaît à l'écran","ambiance":"description musique/ton","alt_hooks":["hook alternatif 1","hook alternatif 2","hook alternatif 3"]}]

Commence directement par [`;
}

export function buildWeeklyStoriesPrompt(ctx: WeeklyContext): string {
  const dayStart = (ctx.weekNum - 1) * 7 + 1;
  const dayEnd = ctx.weekNum * 7;
  const histLine =
    ctx.topicsHistory.length > 0
      ? `\nSujets déjà couverts (NE PAS RÉPÉTER) : ${ctx.topicsHistory.join(" · ")}`
      : "";

  return `Tu es une API JSON. UNIQUEMENT du JSON, pas de prose, pas de backticks.

Génère 3 idées de stories par jour pour la SEMAINE ${ctx.weekNum} (jours ${dayStart}-${dayEnd}).
Arc journalier : ${ctx.arc}
Total : 7 jours × 3 stories = 21 idées.${histLine}

BRIEF COMPLET DE LA PERSONNE :
${ctx.basePrompt}

Format JSON STRICT (tableau de 7 jours, chacun avec un array de 3 stories) :
[{"day":${dayStart},"stories":[{"type":"sondage/coulisses/témoignage/citation/conseil/Q&A/...","desc":"description courte de la story"},{"type":"...","desc":"..."},{"type":"...","desc":"..."}]}]

Commence directement par [`;
}

// Extraction JSON depuis la réponse Claude (peut avoir des backticks, du préambule, etc.)
export function extractProfilesJson(raw: string): any[] {
  const cleaned = raw.replace(/```json|```/g, "").trim();
  // Cherche le premier tableau JSON
  const match = cleaned.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("Pas de JSON trouvé dans la réponse");
  return JSON.parse(match[0]);
}

/**
 * Parsing robuste pour les réponses Claude qui peuvent être un peu malformées.
 * Tente plusieurs stratégies :
 *   1. Strip ```json blocks
 *   2. Trouve le tableau JSON le plus large
 *   3. Tolère les virgules traînantes
 *   4. Fallback : extraction objet par objet
 */
export function parseJsonArrayLenient<T = any>(raw: string): T[] {
  if (!raw) throw new Error("Réponse vide");
  let cleaned = raw.replace(/```json|```/g, "").trim();
  // Trouver le premier tableau
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrayMatch) cleaned = arrayMatch[0];
  // Tolérer les virgules traînantes
  cleaned = cleaned.replace(/,\s*([}\]])/g, "$1");
  // Tentative directe
  try {
    return JSON.parse(cleaned);
  } catch {
    // Fallback : extraction objet par objet
    const objects: T[] = [];
    const objRe = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
    let m;
    while ((m = objRe.exec(cleaned)) !== null) {
      try {
        objects.push(JSON.parse(m[0]));
      } catch {
        /* skip malformed */
      }
    }
    if (objects.length > 0) return objects;
    throw new Error("Impossible de parser le JSON Claude");
  }
}
