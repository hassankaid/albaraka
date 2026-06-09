/**
 * M8 PREUVE SOCIALE — types + générateurs de templates.
 * Portage React du code source Sidali v1.3.1 (outil léger, SANS scoring IA).
 * Le module génère 3 messages personnalisés (DM témoignage, invitation coaching
 * bilan, script d'interview) à partir d'un brief client + propage le handoff M9.
 */

export const SCHEMA_VERSION = "m8_v1";
export const VERSION = "v1.3.1";

export const SALUTATIONS = {
  salam_alaykoum: { label: "Salamou 'alaykoum", meta: "Salutation islamique complète" },
  bonjour: { label: "Bonjour", meta: "Neutre, non-musulman" },
} as const;

export const POSTURES = {
  seul: { label: "Seul (je, mon, moi)", meta: "Solo · auto-entrepreneur, EI, micro" },
  plusieurs: { label: "Plusieurs (nous, notre)", meta: "Équipe · SASU, SARL, agence" },
} as const;

export const CONTEXTES = {
  lifestyle: { label: "B2C lifestyle", meta: "Coaching/formation grand public · ton chaleureux" },
  b2b_premium: { label: "B2B premium", meta: "Consulting B2B, agence, audit · vocabulaire pro" },
  intime: { label: "Sujet intime", meta: "Matrimonial, parental, santé · ton pudique" },
} as const;

export type TonSalutation = keyof typeof SALUTATIONS;
export type Posture = keyof typeof POSTURES;
export type Contexte = keyof typeof CONTEXTES;

export interface BriefClient {
  prenom_client: string;
  nom_offre: string;
  ton_salutation: TonSalutation;
  posture: Posture;
  contexte: Contexte;
  douleur_passe_hint: string;
}

export type M8Step = "welcome" | "brief_client" | "messages_generes" | "lock";

export interface M8Templates {
  A: string;
  B: string;
  C: string;
}

export interface M8State {
  current: M8Step;
  data: {
    brief_client: BriefClient;
    generation_count: number;
  };
  // Imports amont (lus depuis liberty_user_profile) — typage souple, lecture défensive
  m1_data?: Record<string, unknown> | null;
  m2_data?: Record<string, unknown> | null;
  m3_data?: Record<string, unknown> | null;
  m4_data?: Record<string, unknown> | null;
  m5_data?: Record<string, unknown> | null;
  m6_data?: Record<string, unknown> | null;
  m7_data?: Record<string, unknown> | null;
  upstream_forced: boolean;
  // Signature / verrou
  signed: boolean;
  signed_by: string;
  signed_at: string | null;
  completed: boolean;
  // Démo (RAM only)
  demoMode: string | null;
  _activeDemo?: string | null;
  _updated_at?: string;
  last_save?: string | null;
}

export function defaultBrief(): BriefClient {
  return {
    prenom_client: "",
    nom_offre: "",
    ton_salutation: "salam_alaykoum",
    posture: "plusieurs",
    contexte: "lifestyle",
    douleur_passe_hint: "",
  };
}

export function defaultM8State(): M8State {
  return {
    current: "welcome",
    data: { brief_client: defaultBrief(), generation_count: 0 },
    upstream_forced: false,
    signed: false,
    signed_by: "",
    signed_at: null,
    completed: false,
    demoMode: null,
  };
}

// ─── Champs obligatoires ──────────────────────────────────────────────
export function missingBriefFields(bc: BriefClient): string[] {
  const missing: string[] = [];
  if (!bc.prenom_client?.trim()) missing.push("le prénom du client");
  if (!bc.nom_offre?.trim()) missing.push("le nom de l'offre");
  if (!bc.posture) missing.push("la posture");
  if (!bc.ton_salutation) missing.push("le ton de salutation");
  if (!bc.contexte) missing.push("le contexte");
  return missing;
}

export function canGenerate(bc: BriefClient): boolean {
  return missingBriefFields(bc).length === 0;
}

// ─── Générateurs de templates (port verbatim Sidali) ──────────────────
function salutationStr(ton: TonSalutation, prenom: string): string {
  const p = (prenom || "").trim() || "Prénom";
  if (ton === "bonjour") return "Bonjour " + p;
  return "Salamou 'alaykoum " + p; // défaut
}

function possessifs(posture: Posture) {
  if (posture === "seul") {
    return {
      mon_accompagnement: "mon accompagnement",
      ma_solution: "ma solution",
      mon_service: "mon service",
      me_rejoindre: "me rejoindre",
      je_te_propose: "je te propose",
      grace_a_moi: "grâce à moi",
    };
  }
  return {
    mon_accompagnement: "notre accompagnement",
    ma_solution: "notre solution",
    mon_service: "notre service",
    me_rejoindre: "nous rejoindre",
    je_te_propose: "nous te proposons",
    grace_a_moi: "grâce à nous",
  };
}

function contexteVocab(contexte: Contexte) {
  if (contexte === "b2b_premium") {
    return {
      victoire_phrase: "j'ai vu le résultat que tu as obtenu :",
      placeholder_text: "[décris ici le résultat concret obtenu — chiffre + délai]",
      compliment: " Bravo pour ce résultat.",
      confidant: "à quelqu'un en qui tu as confiance",
    };
  }
  if (contexte === "intime") {
    return {
      victoire_phrase: "j'ai vu ta progression sur",
      placeholder_text: "[décris ici sa progression en une ligne]",
      compliment: "",
      confidant: "à une personne proche en qui tu as confiance",
    };
  }
  return {
    victoire_phrase: "j'ai vu ta victoire sur",
    placeholder_text: "[décris ici sa victoire en une ligne — chiffre + délai si possible]",
    compliment: " Bon travail.",
    confidant: "à un ami",
  };
}

/** Template A — DM témoignage vidéo. */
export function buildTemplateA(bc: BriefClient): string {
  const sal = salutationStr(bc.ton_salutation, bc.prenom_client);
  const p = possessifs(bc.posture);
  const v = contexteVocab(bc.contexte);
  const nomOffre = (bc.nom_offre || "ton offre").trim();

  return (
    sal + ", " + v.victoire_phrase + " « " + v.placeholder_text + " »." + v.compliment + " " +
    "Cela te dérangerait de prendre une seconde pour faire un bref témoignage vidéo et donner ton avis sur " + nomOffre + " ? Je t'en serais très reconnaissant.\n\n" +
    "Tout ce qu'il te faudrait, c'est une courte vidéo respectant ces consignes :\n" +
    "1. Durée : 1 à 2 minutes maximum.\n" +
    "2. Qualité vidéo : filmer en mode horizontal avec une bonne lumière et un arrière-plan propre.\n" +
    "3. Qualité audio : parler fort et distinctement dans un endroit calme.\n\n" +
    "Plan de ton témoignage :\n" +
    "1. Présente-toi : qui es-tu ? Que fais-tu ?\n" +
    "2. Ton problème avant " + p.mon_accompagnement + " : quelles difficultés rencontrais-tu ?\n" +
    "3. Qu'est-ce qui t'a fait basculer pour t'inscrire malgré tes doutes initiaux ?\n" +
    "4. Les résultats obtenus : qu'est-ce qui a changé depuis ? (gains, transformation, bénéfices concrets)\n" +
    "5. Recommanderais-tu " + p.mon_service + " ? Pourquoi ?\n\n" +
    "Astuce : sois naturel et parle comme si tu racontais ton expérience " + v.confidant + ". Merci."
  );
}

/** Template B — Invitation "coaching bilan" Zoom. */
export function buildTemplateB(bc: BriefClient): string {
  const sal = salutationStr(bc.ton_salutation, bc.prenom_client);
  const p = possessifs(bc.posture);
  const nomOffre = (bc.nom_offre || "ton offre").trim();

  return (
    sal + ", j'aimerais te prendre 20 minutes en visio pour un \"coaching bilan\" sur ton parcours dans " + nomOffre + ". " +
    "Le but, c'est qu'on fasse le point ensemble sur ce que tu en as retiré jusqu'ici et que, grâce à tes retours, je puisse améliorer le programme.\n\n" +
    "Si tu es OK, " + p.je_te_propose + " plusieurs créneaux : « [propose ici 3 créneaux concrets sur les 5 prochains jours] ». Dis-moi celui qui te convient et je t'envoie le lien Zoom dans la foulée.\n\n" +
    "Merci."
  );
}

/** Template C — Script d'interview "coaching bilan". */
export function buildTemplateC(bc: BriefClient): string {
  const p = possessifs(bc.posture);
  const nomOffre = (bc.nom_offre || "ton offre").trim();
  const douleur = (bc.douleur_passe_hint || "").trim();
  const douleurLine = douleur
    ? "   – Exemple à creuser pour ton client : « " + douleur + " ». Adapte selon sa situation réelle.\n"
    : "   – → Creuse 1-2 questions selon ce qu'il a dit en bloc 1.\n";

  return (
    "SCRIPT D'INTERVIEW \"COACHING BILAN\" — à garder sous les yeux pendant l'enregistrement Zoom.\n" +
    "Durée cible : 20 à 40 minutes. Enregistre ton écran dès le début (n'annonce pas l'enregistrement au client en amont — fais-le et garde la vidéo pour ton arsenal de preuve).\n\n" +
    "Note : les « Top ! » dans le bloc 3 sont des marqueurs de transition pour toi, pas du texte à prononcer mot pour mot. Traduis-les en transitions naturelles à l'oral (« ok cool », « super, dis-moi maintenant... »).\n\n" +
    "═══ AVANT L'APPEL ═══\n" +
    "Étape 1 — Envoie le lien Zoom au client et prépare-toi à enregistrer ton écran.\n" +
    "Étape 2 — Fais un test d'enregistrement pour être sûr que l'audio et la vidéo sont OK.\n" +
    "Étape 3 — Commence l'interview en respectant le cadre ci-dessous.\n\n" +
    "═══ BLOC 1 · PRÉSENTATION DU CLIENT ═══\n" +
    "   – Demande-lui de parler de qui il est et de ce qu'il fait.\n" +
    "   – Laisse-le poser son contexte tranquillement, ne coupe pas.\n\n" +
    "═══ BLOC 2 · DÉCOUVERTE DU \"PASSÉ\" ═══\n" +
    "Même structure qu'un call commercial, mais au passé. Tu cherches la résonance pour les prospects qui regarderont la vidéo plus tard.\n" +
    "   – Quel était le problème auquel tu étais confronté avant " + p.mon_accompagnement + " ?\n" +
    "   – Comment tu te sentais vis-à-vis de cette situation à cette époque ?\n" +
    douleurLine +
    "\n" +
    "═══ BLOC 3 · QUESTIONNEMENT SUR LE PROGRAMME ═══\n" +
    "   – Super, maintenant qu'est-ce que tu aimes dans " + nomOffre + " ?\n" +
    "   – Top ! Et aujourd'hui quels sont les résultats que tu as obtenus en " + p.me_rejoindre + " ? (chiffres, délai, transformation)\n" +
    "   – Top ! Que dirais-tu à quelqu'un qui hésite à " + p.me_rejoindre + " aujourd'hui ?\n\n" +
    "═══ BLOC 4 · QUESTION FINALE (la plus puissante) ═══\n" +
    "   – Que dirais-tu à quelqu'un qui était là où tu étais, qui veut être là où tu es maintenant ?\n\n" +
    "═══ APRÈS L'APPEL ═══\n" +
    "   – Coupe l'enregistrement, vérifie qu'il est bien sauvegardé.\n" +
    "   – Range la vidéo dans ton dossier local de preuves, prêt à être partagé en call avec un prospect.\n" +
    "   – Remercie le client par message."
  );
}

export function buildAllTemplates(bc: BriefClient): M8Templates {
  return { A: buildTemplateA(bc), B: buildTemplateB(bc), C: buildTemplateC(bc) };
}

// ─── Lecture défensive des imports amont ──────────────────────────────
function g(obj: unknown, key: string): unknown {
  return obj && typeof obj === "object" ? (obj as Record<string, unknown>)[key] : undefined;
}

/** Nom d'offre suggéré depuis l'amont (M6/M7/M3) pour préremplir le brief. */
export function prefillNomOffre(state: M8State): string {
  const m6 = state.m6_data, m7 = state.m7_data, m3 = state.m3_data;
  const fromM7 = g(m7, "nom_offre") ?? g(g(m7, "or"), "nom") ?? g(m7, "formule_marketing");
  const fromM6 = g(g(m6, "or"), "nom") ?? g(m6, "nom_offre");
  const fromM3 = g(m3, "hero_mecanisme_nom") ?? g(m3, "headline_promesse");
  const v = fromM6 ?? fromM7 ?? fromM3;
  return typeof v === "string" ? v : "";
}

/** Douleur dominante suggérée (M2) pour préremplir le hint du script. */
export function prefillDouleur(state: M8State): string {
  const v = g(state.m2_data, "dominant_pain") ?? g(state.m7_data, "dominant_pain") ?? g(state.m6_data, "dominant_pain");
  return typeof v === "string" ? v : "";
}

export function pickAvatarName(state: M8State): string {
  const v = g(state.m1_data, "avatar_nom") ?? g(state.m1_data, "avatar") ?? g(state.m7_data, "avatar");
  return typeof v === "string" && v.trim() ? v : "ton client";
}
