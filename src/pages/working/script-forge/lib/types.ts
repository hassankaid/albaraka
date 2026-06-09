/**
 * Script Forge — Générateur de scripts d'appel (Découverte + Closing) AL BARAKA.
 * Portage React fidèle de la source standalone (demo.html, v1). Moteur 100% déterministe.
 */

export type CallType = "discovery" | "closing";
export type Segment = "argent" | "sante" | "relations";
export type Profile = "A" | "B" | "C";
export type ProspectOrigin = "cold" | "inbound" | "webinar" | "referral";

export interface FormData {
  type: CallType;
  segment: Segment;
  profile: Profile;
  prospectOrigin: ProspectOrigin;
  offerName: string;
  price: string;
  promise: string;
  delay: string;
  founder: string;
  distinctiveValue: string;
  components: string;
  avatar: string;
  mainPain: string;
  bigIdea: string;
  mainBonus: string;
  pillar1Name: string;
  pillar2Name: string;
  guaranteeResult: string;
  marketPrice: string;
  inactionCost: string;
  callerName: string;
  channel: string;
  finalEvent: string;
}

export interface ScriptSection {
  marker: string;
  voice: string;
  text: string;
  tactic?: string;
}
export interface ScriptStep {
  num: number;
  title: string;
  duration: string;
  objective: string;
  sections: ScriptSection[];
}

export const SEGMENTS: Record<Segment, { label: string }> = {
  argent: { label: "Argent" },
  sante: { label: "Santé" },
  relations: { label: "Relations" },
};

export const PROFILES: Record<Profile, { label: string; price: string; discoveryDur: string; closingDur: string }> = {
  A: { label: "Low ticket", price: "1 — 97€", discoveryDur: "5-10 min", closingDur: "10-15 min" },
  B: { label: "Mid ticket", price: "97 — 997€", discoveryDur: "8-12 min", closingDur: "20-35 min" },
  C: { label: "High ticket", price: "1 000€+", discoveryDur: "20-30 min", closingDur: "45-75 min" },
};

export const PROFILE_DURATION = (p: Profile, type: CallType): string =>
  type === "discovery" ? PROFILES[p].discoveryDur : PROFILES[p].closingDur;

export function defaultFormData(): FormData {
  return {
    type: "discovery",
    segment: "argent",
    profile: "B",
    prospectOrigin: "cold",
    offerName: "",
    price: "",
    promise: "",
    delay: "6 mois",
    founder: "",
    distinctiveValue: "",
    components: "",
    avatar: "",
    mainPain: "",
    bigIdea: "",
    mainBonus: "",
    pillar1Name: "",
    pillar2Name: "",
    guaranteeResult: "",
    marketPrice: "",
    inactionCost: "",
    callerName: "",
    channel: "",
    finalEvent: "",
  };
}

export const STORAGE_KEY = "script_forge_form_v1";
