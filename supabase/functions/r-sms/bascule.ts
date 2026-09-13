// ─────────────────────────────────────────────────────────────────────────
// À quelle heure le lien des SMS passe-t-il au groupe de la semaine suivante ?
//
// À MIDI, HEURE DE PARIS — PAS À L'HEURE DE DÉBUT. Le tunnel bascule à 11h,
// quand la conférence commence : un nouvel inscrit doit rejoindre la suivante.
// Mais les SMS du jour même servent à faire ENTRER dans le direct en cours,
// dont le lien est posté dans le groupe du jour. Avec une bascule à 11h, le SMS
// « C'est en cours depuis 15 min » de 11h15 envoyait vers le groupe de la
// semaine d'après : le 06/09/2026, ses 57 cliqueurs ont tous atterri dans le
// groupe du 13/09, où le lien du direct n'était pas. Règle fixée par Hassan le
// 13/09/2026 : avant midi le dimanche, groupe du jour ; après midi, groupe de
// la conférence suivante.
//
// Fichier sans import, pour être testé côté Vitest comme exécuté côté Deno.
// ─────────────────────────────────────────────────────────────────────────

/** Heure de Paris (HH:MM) à partir de laquelle le lien sert le groupe suivant. */
export const BASCULE_LIEN_SMS = "12:00";

/**
 * Le dimanche avant midi à Paris, la date (YYYY-MM-DD) de la conférence du jour.
 * Sinon `null` : l'appelant se rabat sur `conference_courante()`.
 */
export function conferenceDuJourAvantMidi(maintenant: Date): string | null {
  const p: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(maintenant)) {
    p[part.type] = part.value;
  }
  if (p.weekday !== "Sun") return null;
  if (`${p.hour}:${p.minute}` >= BASCULE_LIEN_SMS) return null;
  return `${p.year}-${p.month}-${p.day}`;
}
