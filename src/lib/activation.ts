// Activation de l'accès (lien reçu après le paiement) — panne du 20/10/2026.
//
// Sur 7 jours, 40 liens ouverts pour 13 mots de passe enregistrés : la page attendait la
// bibliothèque de connexion de Supabase sans limite de temps, et celle-ci restait parfois
// bloquée (verrou partagé entre onglets, session ouverte deux fois à l'arrivée du lien).
// Le bouton « Activer mon accès » tournait alors sans fin, sans rien envoyer.
//
// Désormais le mot de passe part directement au serveur d'authentification avec le jeton
// du lien, avec un délai maximum, et chaque essai est noté (réussite ou échec) dans
// activation_journal pour suivre le taux de réussite.

/** Le lien tel qu'il est arrivé sur /reset-password, lu avant que la bibliothèque ne le retire de l'adresse. */
export const LIEN_INITIAL =
  typeof window !== "undefined" && window.location.pathname.startsWith("/reset-password") ? window.location.hash : "";

export interface JetonsLien {
  access_token: string;
  refresh_token: string | null;
  type: string | null;
}

/** Ce que contient le lien : des jetons (lien valide), une erreur (expiré, déjà utilisé) ou rien. */
export function lireLien(hash: string): { jetons: JetonsLien | null; erreur: string | null } {
  const p = new URLSearchParams((hash || "").replace(/^#/, ""));
  const erreur = p.get("error_description") || p.get("error_code") || p.get("error");
  if (erreur) return { jetons: null, erreur: erreur.replace(/\+/g, " ") };
  const access = p.get("access_token");
  if (!access) return { jetons: null, erreur: null };
  return { jetons: { access_token: access, refresh_token: p.get("refresh_token"), type: p.get("type") }, erreur: null };
}

/** L'identifiant du compte dans le jeton (sans le vérifier : c'est le serveur qui vérifie). */
export function sujetDuJeton(jwt: string | null | undefined): string | null {
  try {
    const charge = jwt?.split(".")[1];
    if (!charge) return null;
    const json = atob(charge.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(charge.length / 4) * 4, "="));
    const sub = JSON.parse(json).sub;
    return typeof sub === "string" ? sub : null;
  } catch {
    return null;
  }
}

export class DelaiDepasse extends Error {
  constructor() {
    super("délai dépassé");
  }
}

/** Attend une promesse au plus `ms` millisecondes. */
export function avecDelai<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((ok, ko) => {
    const t = setTimeout(() => ko(new DelaiDepasse()), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        ok(v);
      },
      (e) => {
        clearTimeout(t);
        ko(e);
      },
    );
  });
}

/** ok, ou ce qui a échoué : statut HTTP (0 = pas de réponse), code d'erreur, message. */
export interface Resultat {
  ok: boolean;
  statut: number;
  code: string | null;
  message: string;
}

interface Serveur {
  url: string;
  cle: string;
  fetch?: typeof fetch;
}

/** Enregistre le mot de passe (PUT /auth/v1/user), en 15 s au plus. statut 0 = pas de réponse. */
export async function changerMotDePasse(s: Serveur, jeton: string, motDePasse: string, delai = 15000): Promise<Resultat> {
  const f = s.fetch ?? fetch;
  const arret = new AbortController();
  const minuteur = setTimeout(() => arret.abort(), delai);
  try {
    const r = await f(`${s.url}/auth/v1/user`, {
      method: "PUT",
      headers: { apikey: s.cle, Authorization: `Bearer ${jeton}`, "Content-Type": "application/json" },
      body: JSON.stringify({ password: motDePasse }),
      signal: arret.signal,
    });
    if (r.ok) return { ok: true, statut: r.status, code: null, message: "" };
    let corps: { error_code?: string; code?: string | number; msg?: string; message?: string; error_description?: string } = {};
    try {
      corps = await r.json();
    } catch {
      /* corps vide */
    }
    const code = corps.error_code ?? (typeof corps.code === "string" ? corps.code : null);
    return { ok: false, statut: r.status, code, message: corps.msg || corps.message || corps.error_description || `HTTP ${r.status}` };
  } catch (e) {
    const delaiDepasse = (e as Error)?.name === "AbortError";
    return { ok: false, statut: 0, code: delaiDepasse ? "delai" : "reseau", message: delaiDepasse ? "délai dépassé" : String((e as Error)?.message ?? e) };
  } finally {
    clearTimeout(minuteur);
  }
}

/** Un jeton neuf à partir du jeton de rafraîchissement du lien (lien ouvert il y a plus d'une heure). */
export async function rafraichir(s: Serveur, refresh: string, delai = 10000): Promise<{ access_token: string; refresh_token: string } | null> {
  const f = s.fetch ?? fetch;
  const arret = new AbortController();
  const minuteur = setTimeout(() => arret.abort(), delai);
  try {
    const r = await f(`${s.url}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { apikey: s.cle, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
      signal: arret.signal,
    });
    if (!r.ok) return null;
    const d = await r.json();
    return d?.access_token ? { access_token: d.access_token, refresh_token: d.refresh_token } : null;
  } catch {
    return null;
  } finally {
    clearTimeout(minuteur);
  }
}

/** Le lien n'autorise plus rien (expiré, déjà utilisé) : il faut en demander un nouveau. */
export const lienPerime = (r: Resultat) => !r.ok && (r.statut === 401 || r.statut === 403 || r.code === "session_not_found");

/** Le message à montrer à l'élève. */
export function messageActivation(r: Resultat): string {
  if (r.ok) return "";
  if (r.code === "delai") return "Le serveur met trop de temps à répondre. Vérifie ta connexion internet et réessaie.";
  if (r.code === "reseau") return "Problème de connexion. Vérifie ta connexion internet et réessaie.";
  if (r.code === "same_password") return "Le nouveau mot de passe doit être différent de l'ancien.";
  if (r.code === "weak_password") return "Mot de passe trop faible. Respecte toutes les règles ci-dessous.";
  if (r.statut === 429 || r.code === "over_request_rate_limit") return "Trop de tentatives. Réessaie dans quelques minutes.";
  if (lienPerime(r)) return "Ton lien a expiré ou a déjà servi. Demande-en un nouveau ci-dessous.";
  return `Le mot de passe n'a pas pu être enregistré (${r.message}). Réessaie.`;
}

/** Le navigateur, en clair, pour le journal (« iPhone · Safari »). */
export function navigateur(ua: string): string {
  const appareil = /iPhone|iPad/.test(ua) ? "iPhone" : /Android/.test(ua) ? "Android" : /Macintosh/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : "Autre";
  const nav = /CriOS|Chrome\//.test(ua) && !/Edg\//.test(ua) ? "Chrome"
    : /GSA\//.test(ua) ? "app Google"
    : /FBAN|FBAV|Instagram/.test(ua) ? "app Facebook/Instagram"
    : /Edg\//.test(ua) ? "Edge"
    : /Firefox|FxiOS/.test(ua) ? "Firefox"
    : /Safari\//.test(ua) ? "Safari" : "autre";
  return `${appareil} · ${nav}`;
}

/** Note un essai d'activation (sans jamais bloquer ni faire échouer la page). */
export function noterActivation(
  s: Serveur,
  e: { etape: string; succes: boolean; detail?: string; duree_ms?: number; utilisateur?: string | null },
): void {
  const f = s.fetch ?? fetch;
  try {
    void f(`${s.url}/rest/v1/rpc/activation_noter`, {
      method: "POST",
      headers: { apikey: s.cle, Authorization: `Bearer ${s.cle}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        p_etape: e.etape,
        p_succes: e.succes,
        p_detail: (e.detail ?? "").slice(0, 300),
        p_duree_ms: Math.round(e.duree_ms ?? 0),
        p_navigateur: typeof navigator !== "undefined" ? navigateur(navigator.userAgent) : "",
        p_utilisateur: e.utilisateur ?? null,
      }),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    /* le journal ne doit jamais gêner l'élève */
  }
}
