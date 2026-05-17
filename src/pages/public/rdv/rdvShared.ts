// Constantes partagées par les 5 pages du funnel /rdv.
// - THEME AL BARAKA (cohérent avec ScoringStart/ScoringQuiz)
// - Contenu textuel exact du brief client (funnel-rdv-structure.docx)
// - Mapping des disqualifications A..E (slug URL <-> question / message)

export const THEME = {
  bg: "#0A0A0A",
  bgSoft: "#111111",
  gold: "#C9A04E",
  goldBright: "#E4C57A",
  goldDim: "rgba(201,160,78,0.18)",
  goldLine: "rgba(201,160,78,0.28)",
  cream: "#F5F1E6",
  creamMuted: "rgba(245,241,230,0.62)",
  creamDim: "rgba(245,241,230,0.38)",
  danger: "#E08A6A",
};

// sessionStorage : on persiste juste l'ID du lead courant.
// On NE persiste PAS les coordonnées ni les réponses (déjà en BDD).
export const RDV_LEAD_ID_KEY = "rdv_funnel_lead_id";
// On persiste aussi le prénom/nom/email/téléphone pour pré-remplir Calendly.
// Stockés ici car l'edge function ne nous retourne pas ces infos après coup.
export const RDV_PREFILL_KEY = "rdv_funnel_prefill";

export type RdvPrefill = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
};

// ─── Les 5 questions de qualification (intitulés exacts du brief) ────────
export type QuestionConfig = {
  index: 1 | 2 | 3 | 4 | 5;
  title: string;
  yesLabel: string;
  noLabel: string;
  disqualSlug: "a" | "b" | "c" | "d" | "e";
};

export const QUESTIONS: QuestionConfig[] = [
  {
    index: 1,
    title: "Avez-vous bien regardé la conférence ?",
    yesLabel: "Oui",
    noLabel: "Non",
    disqualSlug: "a",
  },
  {
    index: 2,
    title: "Confirmez-vous votre souhait de rejoindre l'écosystème et profiter de l'offre actuelle ?",
    yesLabel: "Oui, je confirme",
    noLabel: "Non, je ne suis pas décidé(e)",
    disqualSlug: "b",
  },
  {
    index: 3,
    title: "Confirmez-vous avoir pris connaissance de l'investissement nécessaire pour notre accompagnement ?",
    yesLabel: "Oui, je confirme",
    noLabel: "Non, je n'en ai pas pris connaissance",
    disqualSlug: "c",
  },
  {
    index: 4,
    title: "Souhaitez-vous sincèrement nous rejoindre et faire les causes ?",
    yesLabel: "Oui, je veux m'engager",
    noLabel: "Non, c'est de la curiosité",
    disqualSlug: "d",
  },
  {
    index: 5,
    title: "Confirmez-vous avoir un budget raisonnable pour cet accompagnement ?",
    yesLabel: "Oui, je suis conscient(e) qu'investir pour un accompagnement sérieux est nécessaire pour obtenir du résultat",
    noLabel: "Non, je n'ai pas du tout de budget",
    disqualSlug: "e",
  },
];

// ─── Pages de disqualification A..E ──────────────────────────────────────
export type DisqualConfig = {
  slug: "a" | "b" | "c" | "d" | "e";
  questionIndex: 1 | 2 | 3 | 4 | 5;
  title: string;
  message: string;
};

export const DISQUALIFICATIONS: Record<"a" | "b" | "c" | "d" | "e", DisqualConfig> = {
  a: {
    slug: "a",
    questionIndex: 1,
    title: "Conférence non visionnée",
    message:
      "Désolé, seules les personnes ayant regardé la totalité de la conférence peuvent prendre rendez-vous.",
  },
  b: {
    slug: "b",
    questionIndex: 2,
    title: "Décision non actée",
    message:
      "Désolé, seules les personnes ayant acté leur décision peuvent prendre rendez-vous afin d'éviter la perte de temps pour chacun.",
  },
  c: {
    slug: "c",
    questionIndex: 3,
    title: "Investissement non pris en compte",
    message:
      "Désolé, seules les personnes ayant pris connaissance de toutes les informations peuvent réserver un appel, et ce afin d'éviter la perte de temps pour chacun.",
  },
  d: {
    slug: "d",
    questionIndex: 4,
    title: "Curiosité non engagée",
    message:
      "Désolé, seules les personnes ayant pris connaissance de toutes les informations peuvent réserver un appel, et ce afin d'éviter la perte de temps pour chacun.",
  },
  e: {
    slug: "e",
    questionIndex: 5,
    title: "Pas de budget",
    message:
      "Désolé, sans budget, ce genre d'accompagnement ne sera pas accessible.",
  },
};

// Rappel global affiché sur toutes les pages de disqualification (texte exact du brief).
export const RDV_4_CONDITIONS = `Pour réserver un rendez-vous, vous devez : avoir regardé la totalité de la conférence, être décidé(e) à rejoindre l'écosystème, avoir pris connaissance de l'investissement nécessaire, et disposer d'un budget raisonnable. Si l'une de ces conditions n'est pas remplie, merci de ne pas prendre rendez-vous.`;

// ─── Helpers sessionStorage ──────────────────────────────────────────────
export function getStoredLeadId(): string | null {
  try {
    return sessionStorage.getItem(RDV_LEAD_ID_KEY);
  } catch {
    return null;
  }
}

export function setStoredLeadId(id: string): void {
  try {
    sessionStorage.setItem(RDV_LEAD_ID_KEY, id);
  } catch {
    /* sessionStorage indispo (mode privé strict) → tant pis, le funnel se cassera proprement */
  }
}

export function clearStoredLeadId(): void {
  try {
    sessionStorage.removeItem(RDV_LEAD_ID_KEY);
    sessionStorage.removeItem(RDV_PREFILL_KEY);
  } catch {
    /* ignore */
  }
}

export function getStoredPrefill(): RdvPrefill | null {
  try {
    const raw = sessionStorage.getItem(RDV_PREFILL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.first_name === "string" &&
      typeof parsed.last_name === "string" &&
      typeof parsed.email === "string" &&
      typeof parsed.phone === "string"
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function setStoredPrefill(prefill: RdvPrefill): void {
  try {
    sessionStorage.setItem(RDV_PREFILL_KEY, JSON.stringify(prefill));
  } catch {
    /* ignore */
  }
}
