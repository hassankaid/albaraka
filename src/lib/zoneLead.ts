// Zone ciblée par les pubs (demande du media buyer, 24/11/2026) : la France (+33)
// et la Belgique (+32). Un lead dont le téléphone a un autre indicatif est
// « hors zone » : il est signalé dans le CRM (rien d'autre ne change pour les
// setters) et le site n'envoie pas de conversion à Snap pour lui.
//
// Règle volontairement stricte, choix assumé : l'outre-mer (+262, +594…) est
// hors zone. Un numéro sans indicatif lisible (vieux formats sans « + ») n'est
// jamais marqué : on ne signale que ce dont on est sûr.

export const INDICATIFS_ZONE = ["33", "32"] as const;

/** Chiffres du numéro après l'indicatif international (« + » ou « 00 »), ou null si format inconnu. */
function international(tel: string | null | undefined): string | null {
  if (!tel) return null;
  const t = tel.replace(/[\s.\-()/]/g, "");
  const m = /^(?:\+|00)(\d{6,})$/.exec(t);
  return m ? m[1] : null;
}

/** Le lead est-il hors zone (indicatif lisible, autre que +33 et +32) ? */
export function estHorsZone(tel: string | null | undefined): boolean {
  const n = international(tel);
  if (!n) return false;
  return !INDICATIFS_ZONE.some((i) => n.startsWith(i));
}

/** Zone envoyée au suivi pub : « cible », « hors_zone » ou « inconnue ». */
export function zoneDuTelephone(tel: string | null | undefined): "cible" | "hors_zone" | "inconnue" {
  if (!international(tel)) return "inconnue";
  return estHorsZone(tel) ? "hors_zone" : "cible";
}

/** Indicatif affiché sur le badge (« +253 »), d'après la table des indicatifs à 1, 2 ou 3 chiffres. */
export function indicatifAffiche(tel: string | null | undefined): string | null {
  const n = international(tel);
  if (!n) return null;
  // Indicatifs à 1 chiffre : +1 (Amérique du Nord) et +7 (Russie, Kazakhstan)
  if (n[0] === "1" || n[0] === "7") return `+${n[0]}`;
  // Indicatifs à 2 chiffres (UIT) ; les autres en ont 3
  const deux = ["20", "27", "30", "31", "32", "33", "34", "36", "39", "40", "41", "43", "44", "45", "46", "47", "48", "49",
    "51", "52", "53", "54", "55", "56", "57", "58", "60", "61", "62", "63", "64", "65", "66", "81", "82", "84", "86",
    "90", "91", "92", "93", "94", "95", "98"];
  return deux.includes(n.slice(0, 2)) ? `+${n.slice(0, 2)}` : `+${n.slice(0, 3)}`;
}
