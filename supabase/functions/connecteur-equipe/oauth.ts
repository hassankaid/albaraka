// Connexion OAuth 2.1 du connecteur « Data Al Baraka », indépendante du hub.
//
// Parcours : Claude s'enregistre (/register), ouvre la page /data/autoriser où la personne saisit
// son code d'accès personnel ; la page appelle /autoriser, qui renvoie Claude vers son adresse de
// retour avec un code à usage unique ; Claude l'échange (/token, PKCE S256) contre un jeton d'accès
// (1 h) et un jeton de renouvellement (30 jours, remplacé à chaque usage).
// Seules les empreintes SHA-256 des codes et jetons sont stockées.

export const DUREE_ACCES_S = 3600;
export const DUREE_RENOUVELLEMENT_S = 30 * 24 * 3600;
export const DUREE_CODE_S = 600;

export async function empreinte(valeur: string): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(valeur));
  return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function base64url(octets: Uint8Array): string {
  let s = "";
  for (const b of octets) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function aleatoire(prefixe: string, octets = 32): string {
  return prefixe + base64url(crypto.getRandomValues(new Uint8Array(octets)));
}

/** PKCE S256 : base64url(SHA-256(code_verifier)) doit valoir code_challenge. */
export async function pkceValide(verifier: string, challenge: string): Promise<boolean> {
  if (!verifier || !challenge || verifier.length < 43 || verifier.length > 128) return false;
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(h)) === challenge;
}

/** Adresses de retour acceptées : https, ou http sur la machine locale (Claude Code). */
export function adresseRetourValide(uri: string): boolean {
  try {
    const u = new URL(uri);
    if (u.hash) return false;
    if (u.protocol === "https:") return true;
    return u.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname);
  } catch {
    return false;
  }
}

export function metadonneesServeur(base: string) {
  return {
    issuer: base,
    authorization_endpoint: `${base}/data/autoriser`,
    token_endpoint: `${base}/data/token`,
    registration_endpoint: `${base}/data/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: ["data"],
    service_documentation: `${base}/data/autoriser`,
  };
}

export function metadonneesRessource(base: string) {
  return {
    resource: `${base}/data/mcp`,
    authorization_servers: [base],
    bearer_methods_supported: ["header"],
    scopes_supported: ["data"],
    resource_name: "Data Al Baraka",
  };
}
