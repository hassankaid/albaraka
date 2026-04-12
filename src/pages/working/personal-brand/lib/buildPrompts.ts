import type { BrandAnswers } from "./sections";

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
  return (s || "prenom").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
}

function sub(s: string, n: number) {
  return s.length > n ? s.substring(0, n) + "…" : s;
}

// ─── PROMPT — 10 PROFILS INSTAGRAM ─────────────────────────────────────
export function buildBioPrompt(a: BrandAnswers): string {
  const p = slug(g(a, "prenom"));
  return `Génère 5 profils Instagram. Chaque profil = username + nom affiché + bio 4 lignes COURTES.
PERSONNE : ${g(a, "prenom")}, ${g(a, "age")}, ${g(a, "situation")}
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

// ─── PROMPT — CONTENU PERSONNALISÉ (30 REELS + 365 STORIES) ─────────────
export function buildContentPrompt(a: BrandAnswers): string {
  const musulmane = String(a.cible_communaute || "").includes("Oui");
  const foi = musulmane ? "Foi et valeurs islamiques quand c'est naturel — sans forcer." : "";
  const rappelSpirituel = musulmane ? "Rappel spirituel, " : "";
  return `Tu es un scriptwriter et stratège de contenu. Tu vas créer du contenu UNIQUE pour une personne UNIQUE.
═══════════════════════════════════
ÉTAPE 0 — COMPRENDRE L'HUMAIN
═══════════════════════════════════
Avant de générer, rédige en 5 lignes :
1. L'HISTOIRE de cette personne
2. Son DÉCLIC
3. Sa VOIX INTÉRIEURE
4. Ce qui la rend DIFFÉRENTE
5. L'ÉMOTION dominante de son parcours
═══════════════════════════════════
QUI EST CETTE PERSONNE
═══════════════════════════════════
- Prénom : ${g(a, "prenom")} | ${g(a, "age")} | ${g(a, "situation")}
- Compétences : ${ga(a, "competences")}
- Objectif : ${g(a, "objectif_revenu")}
- Motivation : "${g(a, "pourquoi")}"
═══════════════════════════════════
SON HISTOIRE (matière première du contenu)
═══════════════════════════════════
- Déclic : "${g(a, "declic")}"
- Vie idéale dans 6 mois : "${g(a, "vie_ideale")}"
- Épreuves marquantes : "${g(a, "epreuves")}"
- Plus grande fierté : "${g(a, "fierte")}"
- Message au monde : "${g(a, "message_monde")}"
⚠️ CE VÉCU EST LE CŒUR DU CONTENU. Scripts IMPOSSIBLES À REPRODUIRE pour quelqu'un d'autre.
═══════════════════════════════════
SA CIBLE
═══════════════════════════════════
- Qui : ${g(a, "cible_qui")}
- Âge : ${ga(a, "cible_age")} | Genre : ${g(a, "cible_genre")}
- Problème n°1 : "${g(a, "cible_probleme")}"
- Rêve : "${g(a, "cible_reve")}"
- Peur/objection : "${g(a, "cible_objection")}"
- Musulmane : ${g(a, "cible_communaute")}
═══════════════════════════════════
SA PERSONNALITÉ
═══════════════════════════════════
- Archétype : ${g(a, "archetype")}
- Ton : ${ga(a, "ton")}
- Valeurs : ${ga(a, "valeurs")}
- Sujets interdits : ${g(a, "sujets_eviter") || "Aucun"}
- Inspirations : ${g(a, "modele") || "Aucune"}
═══════════════════════════════════
STRATÉGIE
═══════════════════════════════════
- Format : ${g(a, "format_principal")}
- Plateformes : ${ga(a, "plateformes")}
- Fréquence : ${g(a, "frequence")}
- Batching : ${ga(a, "jour_creation")}
- Piliers : ${ga(a, "piliers")}
═══════════════════════════════════
GÉNÈRE
═══════════════════════════════════
📌 PARTIE 1 — 30 SCRIPTS DE REELS (~60 sec, 1/jour)
Écrits COMME SI C'ÉTAIT ${g(a, "prenom")} QUI PARLAIT. Répartis sur : ${ga(a, "piliers")}
🎬 JOUR X/30 — [TITRE]
📂 Pilier : [type] | 🎯 Objectif : [engagement/conversion/notoriété/communauté]
⏱️ HOOK (0-5s) : [Phrase choc qui stoppe le scroll — touche "${sub(g(a, "cible_probleme"), 60)}" ou "${sub(g(a, "cible_reve"), 60)}"]
💡 VALEUR (5-45s) : [Mot pour mot, langage oral, max 12 mots/phrase. Indications : (ton voix), [PAUSE], [TRANSITION]]
📣 CTA (45-60s) : [Naturel, ramène vers lien en bio — tunnel AL BARAKA]
🖥️ OVERLAY — 🎵 AMBIANCE — 🔄 3 HOOKS ALTERNATIFS
UNICITÉ : puise dans son déclic ("${sub(g(a, "declic"), 60)}"), ses épreuves, sa fierté, son message ("${sub(g(a, "message_monde"), 60)}"). Archétype "${g(a, "archetype")}" = style d'écriture, pas juste les mots.
${foi}
📌 PARTIE 2 — 365 IDÉES DE STORIES (12 mois)
Mois par mois, thème évolutif :
M1: Se présenter → M2: Confiance → M3: Valeur → M4: Parcours → M5: Engagement → M6: Conversion douce → M7: Positionnement → M8: Preuves → M9: Urgence → M10: Fidélisation → M11: Accélérer → M12: Bilan
30 idées/mois : Jour X : [Type] — [Description adaptée à ${g(a, "prenom")}]
Types : Sondage, Coulisses, Témoignage, Conseil, Q&A, Lien bio, Citation, Avant/Après, Routine, ${rappelSpirituel}Partage Reel, Moment authentique.
═══════════════════════════════════
RÈGLES ABSOLUES
═══════════════════════════════════
→ Scripts MOT POUR MOT — ${g(a, "prenom")} lit et tourne
→ Langage ORAL, comme ${g(a, "prenom")} parle à ${g(a, "cible_genre") === "Femmes uniquement" ? "une amie" : "un ami"}
→ 1 script = 1 idée forte | Format : ${g(a, "format_principal")}
→ CTA → lien bio (tunnel AL BARAKA) | Interdit : ${g(a, "sujets_eviter") || "aucun"}
→ 30 sujets DIFFÉRENTS | 360 stories DIFFÉRENTES
→ Deux élèves AL BARAKA = scripts MÉCONNAISSABLES`;
}

// Extraction JSON depuis la réponse Claude (peut avoir des backticks, du préambule, etc.)
export function extractProfilesJson(raw: string): any[] {
  const cleaned = raw.replace(/```json|```/g, "").trim();
  // Cherche le premier tableau JSON
  const match = cleaned.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("Pas de JSON trouvé dans la réponse");
  return JSON.parse(match[0]);
}
