/**
 * Préremplissage de Script Forge depuis l'offre Liberty (`liberty_user_profile.data`).
 * Lecture défensive : l'élève peut tout éditer ensuite. Renvoie les champs trouvés + leurs clés.
 */
import type { FormData, Segment, Profile } from "./types";

function s(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}
function fmtPrice(n: unknown): string {
  const num = typeof n === "number" ? n : parseInt(String(n || "").replace(/[^\d]/g, ""), 10);
  if (!num || isNaN(num)) return "";
  return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + "€";
}
function priceNum(n: unknown): number {
  const num = typeof n === "number" ? n : parseInt(String(n || "").replace(/[^\d]/g, ""), 10);
  return !num || isNaN(num) ? 0 : num;
}
function deriveProfile(n: number): Profile | "" {
  if (!n) return "";
  if (n >= 1000) return "C";
  if (n >= 97) return "B";
  return "A";
}
function norm(x: string): string {
  return x.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}
function deriveSegment(text: string): Segment | "" {
  const t = norm(text);
  if (!t.trim()) return "";
  const sante = ["sante", "forme", "poids", "kilo", "fitness", "sport", "cycle", "fertilit", "energie", "alimentaire", "ramadan", "nutrition", "mental", "burn", "sommeil", "minceur"];
  const relations = ["mariage", "couple", "parent", "famille", "relation", "dependance affective", "divorce", "rupture", "celibat", "enfant", "conjoint", "matrimonial", "sentimental"];
  const argent = ["argent", "revenu", "business", "financ", "vente", "closing", "immo", "e-com", "ecom", "agence", "patrimoine", "salaire", "freelance", "entrepren", "ca ", "chiffre d'affaire", "monetis"];
  const score = (kw: string[]) => kw.reduce((a, k) => a + (t.includes(k) ? 1 : 0), 0);
  const sc = { argent: score(argent), sante: score(sante), relations: score(relations) };
  const best = (Object.keys(sc) as Segment[]).sort((a, b) => sc[b] - sc[a])[0];
  return sc[best] > 0 ? best : "";
}

export interface PrefillResult {
  values: Partial<FormData>;
  filledKeys: (keyof FormData)[];
  offerName: string;
}

/** Construit un préremplissage à partir de `liberty_user_profile.data`. Renvoie null si rien d'exploitable. */
export function buildPrefillFromProfile(data: any): PrefillResult | null {
  if (!data || typeof data !== "object") return null;
  const m5 = data.m5 || {};
  const m5h = m5.handoff_to_m6 || m5;
  const m6 = data.m6 || {};
  const m6h = m6.handoff_to_m7 || m6;
  const m7 = data.m7 || {};
  const m7h = m7.handoff_to_m8 || m7;
  const m11 = data.m11 || {};
  const m12 = data.m12 || {};
  const naming = m12.naming || {};
  const m14 = data.m14 || {};
  const m18 = data.m18 || {};
  const sn = data.sous_niche_2 || {};
  const avatar = data.avatar || {};

  const offerName = s(naming.programme_nom) || s(m12.programme_nom) || s(m6.or && m6.or.nom) || s(m6h.or && m6h.or.nom) || s(m14.programme_ht_nom);
  const promise = s(naming.programme_baseline) || s(m12.programme_baseline) || s(m12.headline_promesse_amont) || s(m5h.ht_point_b) || s(m5.headline_promesse) || s(m14.point_b_ht);
  const pNum = priceNum(m6h.prix_ht ?? m6.prix_ht ?? m12.prix_ht ?? m14.prix_ht ?? (m18.value_ladder && m18.value_ladder.prix_ht));
  const price = fmtPrice(pNum);
  const days = m5h.ht_point_b_timeframe_days ?? m12.ht_timeframe_days ?? m5.ht_point_b_timeframe_days;
  const delay = days ? `${parseInt(String(days), 10)} jours` : "";

  // Composantes / piliers depuis le programme (M12 commercial > M11 pédago)
  const mods: any[] = Array.isArray(naming.modules_renommes)
    ? naming.modules_renommes
    : Array.isArray(m11.programme && m11.programme.modules)
      ? m11.programme.modules
      : Array.isArray(m11.modules) ? m11.modules : [];
  const modNames = mods.map((m: any) => s(m.nom_final) || s(m.nom) || s(m.titre)).filter(Boolean);
  const components = modNames.join("\n");
  const pillar1Name = modNames[0] || "";
  const pillar2Name = modNames[1] || "";

  const guaranteeResult = s(m7h.promesse_resultat) || s(m12.formule_marketing_garantie) || s(m7h.expose_formule_marketing) || s(m7h.type_label) || s(m12.type_garantie_label);
  const bigIdea = s(naming.methode_nom) || s(m12.methode_nom) || s(naming.methode_acronyme_developpe) || s(m5h.mecanisme_anchor) || s(m12.categorie_nouvelle);
  const avatarText = s(sn.cible) || s(m12.avatar) || s(avatar.socio && avatar.socio.nom) || s(avatar.nom);
  const mainPain = s(m12.dominant_pain) || s(sn.douleur) || s(avatar.psycho && avatar.psycho.probleme) || s(m5h.ht_point_a);

  const segment = deriveSegment([offerName, promise, avatarText, mainPain, s(sn.cible)].join(" "));
  const profile = deriveProfile(pNum);

  const out: Partial<FormData> = {};
  const filled: (keyof FormData)[] = [];
  const put = (k: keyof FormData, v: string) => { if (v) { (out as any)[k] = v; filled.push(k); } };
  put("offerName", offerName);
  put("promise", promise);
  put("price", price);
  if (delay) put("delay", delay);
  put("components", components);
  put("pillar1Name", pillar1Name);
  put("pillar2Name", pillar2Name);
  put("guaranteeResult", guaranteeResult);
  put("bigIdea", bigIdea);
  put("avatar", avatarText);
  put("mainPain", mainPain);
  if (segment) { out.segment = segment; filled.push("segment"); }
  if (profile) { out.profile = profile; filled.push("profile"); }

  if (!offerName && !promise && !price && !components) return null;
  return { values: out, filledKeys: filled, offerName };
}
