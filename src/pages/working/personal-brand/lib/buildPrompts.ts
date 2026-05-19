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

// ─── PROMPT — 10 PROFILS INSTAGRAM ─────────────────────────────────────
export function buildBioPrompt(a: BrandAnswers, mode: BrandMode = "pass"): string {
  const p = slug(g(a, "prenom"));
  const ctx =
    mode === "liberty"
      ? `a sa propre offre "${g(a, "offre_nom")}" (${g(a, "offre_niche")})`
      : "est apporteur d'affaires AL BARAKA";

  // ⚠️ Refonte 19/05/2026 : on a supprimé la question cible_communaute du
  // quiz. La cible est musulmane par défaut (positionnement Al Baraka).
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
Musulmane : Oui
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

// ─── PROMPT PERSONNALISÉ — ÉTAPE 2 (~3800+ mots) ────────────────────────
// Refonte 19/05/2026 (Sidali) : ajout de 2 sections critiques (TONALITÉ
// NATURELLE + FRAMEWORK CTA) qui dictent strictement le style des scripts.
// Sans ces sections, Claude produisait du contenu type "influenceur Instagram"
// avec des aphorismes, impératifs en chaîne et phrases marketing.
//
// Ce prompt sera copié par l'utilisateur et utilisé tel quel par l'Étape 3
// pour générer ses scripts hebdomadaires.
export function buildFullPrompt(a: BrandAnswers, mode: BrandMode = "pass"): string {
  const archType = g(a, "archetype").split("—")[0].trim();
  // ⚠️ Refonte 19/05/2026 : cible_genre = "Femmes" (sans "uniquement")
  const isFem = g(a, "cible_genre") === "Femmes";
  const prenom = g(a, "prenom");
  const ami = isFem ? "une amie" : "un ami";

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
⚠️ S3 = teasing de l'offre. S4 = vente directe MAIS INVITANTE avec CTA "${g(a, "offre_acces")}".`
      : "";

  // ⚠️ Refonte 19/05 : Pass utilise les nouvelles options competences
  // (Personal Branding, Storytelling, Setting DM, etc.)
  const ctxLine =
    mode === "pass"
      ? `Membre Pass AL BARAKA — apporteur d'affaires. Compétences à monétiser : ${ga(a, "competences")}`
      : `Membre Liberty — propriétaire de son offre "${g(a, "offre_nom") || "—"}"`;

  const s4Strategy =
    mode === "liberty"
      ? `S4 🔥 CONVERSION — Vendre "${g(a, "offre_nom")}" en INVITANT, lever les objections, CTA vers : "${g(a, "offre_acces")}"`
      : `S4 🔥 CONVERSION — Présenter AL BARAKA en douceur, lien en bio / tunnel`;

  // ⚠️ Refonte 19/05 : format_principal réduit à 2 options (Face caméra / Voix off).
  // Donc la directive est plus stricte : pas de B-rolls/Mix.
  const formatLine = `Format : ${g(a, "format_principal")} UNIQUEMENT (PAS de B-rolls, PAS de plans illustratifs, PAS de montages)`;

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
- Prénom : ${prenom} | ${g(a, "age")} | ${g(a, "situation")}
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
- Musulmane : Oui

═══════════════════════════════════
SA PERSONNALITÉ — ${archType}
═══════════════════════════════════
${hookStyle}
⚠️ CHAQUE HOOK DIFFÉRENT. Jamais deux pareils sur les 7 jours d'une semaine.
- Ton : ${ga(a, "ton")}
- Valeurs : ${ga(a, "valeurs")}
- Sujets interdits : ${g(a, "sujets_eviter") || "Aucun"}
- ${formatLine}
- Piliers : ${ga(a, "piliers")}

═══════════════════════════════════
TONALITÉ NATURELLE (CRITIQUE — NE PAS IGNORER)
═══════════════════════════════════
${prenom} doit parler comme à ${ami} en pause-café. Pas comme une influenceuse, pas comme un coach Instagram.

✅ FAIRE SYSTÉMATIQUEMENT :
→ Parler depuis SOI : "moi j'ai vécu", "je crois que", "j'ai mis du temps". JAMAIS depuis la vérité universelle.
→ UNE seule promesse par script, formulée petit : "ça m'a aidée" plutôt que "ça change ta vie".
→ Glisser 3-4 respirations naturelles dans chaque script : "hein", "bon", "en vrai", "je crois", "je sais pas", "tu vois", "enfin".
→ Inviter au lieu d'ordonner : "si ça te parle" plutôt qu'un impératif sec.
→ Rendre la décision à l'autre en fin de script : "ou pas, tu fais ce que tu sens", "tu fais ce que tu veux de ça".

❌ INTERDIT ABSOLU :
→ Aphorismes empilés en fin de script ("C'est l'âge. C'est le diplôme. C'est la décision.").
→ Impératifs en chaîne ("Fuis. Fuis. Fuis.").
→ "Tu vas" prophétique ("tu vas douter", "tu vas abandonner", "tu vas comprendre").
→ Promesses bétonnées ("ça change ta vie à vie", "tu vas tomber de ta chaise", "garanti").
→ Fins punchy commerciales ("ça vaut tout l'or du monde", "c'est la plus haute forme de X").
→ Phrases marketing ("100% halal", "sans bullshit", "le secret que personne te dit", "sauve-toi des heures").
→ Sensationnalisme ("choquant", "vérité dérangeante", "ce que personne ne te dit").

═══════════════════════════════════
FRAMEWORK CTA (CRITIQUE — APPLIQUER À CHAQUE CTA)
═══════════════════════════════════
Chaque CTA doit dire CE QUE LA PERSONNE GAGNE EN RÉPONDANT.
Pas "fais ça". Mais "fais ça ET VOILÀ CE QUE TU REÇOIS".

4 LEVIERS DE BÉNÉFICE (en utiliser 1 à 2 par CTA) :
→ Information gagnée : "je te réponds personnellement avec un conseil adapté à toi"
→ Temps économisé : "ça t'évitera des mois de réflexion", "6 mois d'avance"
→ Risque réduit : "anonyme si tu veux", "aucune pression", "si c'est non je te le dis aussi"
→ Clarté/Décision : "tu repars avec un plan", "tu décides en connaissance de cause"

3 RÉFLEXES POUR CTA NATUREL :
1. Ouvrir avec "si" ("si ça te parle", "si tu te reconnais", "si t'as envie de") plutôt qu'un impératif.
2. Promettre depuis soi ("moi ça m'a aidée") plutôt que depuis la vérité universelle.
3. Rendre la liberté ("ou pas", "tu fais ce que tu sens", "sans pression").

EXEMPLE AVANT/APRÈS :
❌ "Commente en bas."
✅ "Si tu te reconnais dans une de ces erreurs, dis-le-moi en commentaire. Je passe lire, je réponds. Pas du copier-coller, je prends le temps."

═══════════════════════════════════
STRATÉGIE TECHNIQUE
═══════════════════════════════════
- Plateformes : ${ga(a, "plateformes")}
- Fréquence : ${g(a, "frequence")}
- Batching : ${ga(a, "jour_creation")}

═══════════════════════════════════
STRATÉGIE 4 SEMAINES (cycle mensuel)
═══════════════════════════════════
S1 👋 NOTORIÉTÉ — Se présenter, partager le déclic, poser les valeurs. CTA : "si ça te parle, abonne-toi"
S2 💎 CRÉDIBILITÉ — Parcours, preuves, transformation en cours. CTA : "enregistre / partage à ${isFem ? "une sœur" : "un frère"}"
S3 🤝 ENGAGEMENT — Éduquer, valeur pure, créer l'interaction${mode === "liberty" ? ", teasing de l'offre" : ""}. CTA : "commente / écris-moi en DM"
${s4Strategy}

═══════════════════════════════════
PAR SEMAINE
═══════════════════════════════════
- 7 SCRIPTS DE REELS (~60 sec, 1/jour)
- 21 IDÉES DE STORIES (3/jour : 🌅 matin, ☀️ midi, 🌙 soir)
- Structure script : HOOK (0-5s) → VALEUR (5-45s) → CTA (45-60s)
- MOT POUR MOT. Langage strictement ORAL.

═══════════════════════════════════
RÈGLES ABSOLUES
═══════════════════════════════════
→ Scripts MOT POUR MOT (la personne lit et tourne, pas de "compléter avec X")
→ Langage ORAL comme ${prenom} parle à ${ami}
→ S1-S2 = AUCUNE VENTE. ${mode === "liberty" ? `S3 = teasing doux. S4 = vente invitante de "${g(a, "offre_nom")}"` : "S4 = conversion douce vers le lien en bio"}
→ Foi et valeurs islamiques SI ET SEULEMENT SI c'est naturel (jamais forcé, jamais culpabilisant)
→ Deux élèves AL BARAKA = scripts TOTALEMENT MÉCONNAISSABLES (le vécu de ${prenom} doit transparaître à chaque ligne)
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

⚠️ APPLIQUE STRICTEMENT les sections "TONALITÉ NATURELLE" et "FRAMEWORK CTA" du brief ci-dessous.

BRIEF COMPLET DE LA PERSONNE :
${ctx.basePrompt}

Format JSON STRICT (tableau de 7 objets) :
[{"day":${dayStart},"title":"titre court accrocheur","pilier":"Éducatif/Inspirationnel/...","objectif":"engagement/conversion/notoriété","hook":"phrase choc 0-5s","valeur":["point 1","point 2","point 3"],"cta":"CTA naturel selon framework","overlay":"texte qui apparaît à l'écran","ambiance":"description musique/ton","alt_hooks":["hook alternatif 1","hook alternatif 2","hook alternatif 3"]}]

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

⚠️ APPLIQUE STRICTEMENT les sections "TONALITÉ NATURELLE" et "FRAMEWORK CTA" du brief ci-dessous.

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
