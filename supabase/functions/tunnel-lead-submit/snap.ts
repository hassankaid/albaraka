// ─────────────────────────────────────────────────────────────────────────
// API de conversion Snap (24/11/2026, demande du media buyer).
//
// Le serveur envoie à Snap l'inscription (SIGN_UP) en plus du pixel du
// navigateur : les bloqueurs de pub et les iPhone font perdre une partie des
// évènements du pixel, et le serveur ajoute l'e-mail et le téléphone chiffrés.
//
// RÈGLE : le serveur n'envoie que ce que le pixel envoie déjà.
//   - tunnel conférence (sources webi_wa_* et webi_vsl_*) : ni Liberty (autre
//     pixel Snap), ni le site vitrine ;
//   - inscription faite sur le domaine historique, le seul qui charge le pixel
//     Snap (GTM-K3VGV2PX) ; le domaine des pubs Meta n'a pas Snap ;
//   - téléphone +33, +32, +41 ou +352 (zone ciblée, Suisse et Luxembourg
//     ajoutés le 27/11/2026), comme la balise Snap dans GTM ;
//   - avec l'identifiant d'évènement du navigateur : c'est le client_dedup_id
//     du pixel, Snap ne compte l'inscription qu'une fois.
//
// Aucune dépendance Deno ici : module pur, testé par snap_test.ts.
// ─────────────────────────────────────────────────────────────────────────

export const PIXEL_SNAP = "b0f831b6-1982-4430-929b-e1417e4ac700";
// Second pixel (26/11/2026, demande du media buyer) : nouvelle campagne qui
// n'apprend que sur la zone cible. Même évènement, même event_id ; chaque
// pixel a son propre jeton d'accès (SNAP_CAPI_TOKEN_FR_BE).
export const PIXEL_SNAP_FR_BE = "ac23d601-2f64-4e24-ad8e-d4c20e1eb551";

/** Pixels destinataires et le secret qui porte le jeton de chacun. */
export const PIXELS_CAPI: { cle: string; pixel: string; secret: string }[] = [
  { cle: "ancien", pixel: PIXEL_SNAP, secret: "SNAP_CAPI_TOKEN" },
  { cle: "fr_be", pixel: PIXEL_SNAP_FR_BE, secret: "SNAP_CAPI_TOKEN_FR_BE" },
];
export const DOMAINE_PIXEL_SNAP = "event.albarakaecosysteme.com";
export const INDICATIFS_ZONE = ["+33", "+32", "+41", "+352"];

/** Le numéro E.164 est-il dans la zone ciblée ? */
export function dansLaZone(telephoneE164: string | null | undefined): boolean {
  return !!telephoneE164 && INDICATIFS_ZONE.some((i) => telephoneE164.startsWith(i));
}

/** Identifiant d'évènement accepté : celui que génère le navigateur (UUID ou repli). */
export function idEvenement(v: unknown): string | null {
  return typeof v === "string" && /^[A-Za-z0-9-]{8,64}$/.test(v) ? v : null;
}

/** Hôte d'une origine (« https://event.x.com » → « event.x.com »), ou null. */
export function hoteDe(origine: string | null | undefined): string | null {
  if (!origine) return null;
  try {
    return new URL(origine).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export type Decision = { envoyer: true } | { envoyer: false; raison: string };

export function decisionSnap(p: {
  source: string;
  origine: string | null | undefined;
  telephoneE164: string | null;
  eventId: string | null;
}): Decision {
  if (!/^webi_(wa|vsl)_/.test(p.source)) return { envoyer: false, raison: "hors tunnel conférence" };
  if (hoteDe(p.origine) !== DOMAINE_PIXEL_SNAP) return { envoyer: false, raison: "domaine sans pixel Snap" };
  if (!dansLaZone(p.telephoneE164)) {
    return { envoyer: false, raison: "hors zone" };
  }
  if (!p.eventId) return { envoyer: false, raison: "sans identifiant d'évènement" };
  return { envoyer: true };
}

async function sha256(texte: string): Promise<string> {
  const octets = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texte));
  return Array.from(new Uint8Array(octets)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Normalisations demandées par Snap avant chiffrement. */
export const normaliser = {
  email: (e: string) => e.trim().toLowerCase(),
  // Chiffres seuls, indicatif compris, sans « + » ni « 00 »
  telephone: (t: string) => t.replace(/\D/g, "").replace(/^00/, ""),
  prenom: (p: string) => p.toLowerCase().replace(/[^\p{L}]/gu, ""),
};

export async function evenementSignUp(p: {
  eventId: string;
  email: string;
  telephoneE164: string;
  prenom: string | null;
  urlPage: string;
  ip: string | null;
  userAgent: string | null;
  sccid?: string | null;
  scid?: string | null;
  maintenant?: number;
}) {
  const user_data: Record<string, unknown> = {
    em: [await sha256(normaliser.email(p.email))],
    ph: [await sha256(normaliser.telephone(p.telephoneE164))],
  };
  const prenom = p.prenom ? normaliser.prenom(p.prenom) : "";
  if (prenom) user_data.fn = [await sha256(prenom)];
  if (p.ip) user_data.client_ip_address = p.ip;
  if (p.userAgent) user_data.client_user_agent = p.userAgent;
  if (p.sccid) user_data.sc_click_id = p.sccid;
  if (p.scid) user_data.sc_cookie1 = p.scid;
  return {
    data: [{
      event_name: "SIGN_UP",
      action_source: "WEB",
      event_time: p.maintenant ?? Date.now(),
      event_source_url: p.urlPage,
      event_id: p.eventId,
      user_data,
    }],
  };
}

/** Envoie l'évènement ; `valider` passe par /events/validate (rien n'est enregistré). */
export async function envoyerASnap(
  jeton: string,
  corps: unknown,
  valider = false,
  pixel: string = PIXEL_SNAP,
): Promise<{ http: number; reponse: string }> {
  const url = `https://tr.snapchat.com/v3/${pixel}/events${valider ? "/validate" : ""}?access_token=${encodeURIComponent(jeton)}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corps),
    signal: AbortSignal.timeout(8000),
  });
  return { http: r.status, reponse: (await r.text()).slice(0, 300) };
}
