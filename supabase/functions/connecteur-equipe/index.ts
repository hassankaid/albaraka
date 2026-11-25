// Connecteur « Data Al Baraka » : serveur MCP en lecture seule sur la base, pour l'équipe
// (Claude et Claude Code). Indépendant du hub : accès sur invitation (code d'accès personnel).
//
// Adresses publiques (réécrites par vercel.json vers cette fonction) :
//   https://plateforme.albarakaecosysteme.com/data/mcp                    → /mcp
//   …/data/register, …/data/token, …/data/api/autoriser, …/data/api/client
//   …/.well-known/oauth-protected-resource[/data/mcp], …/.well-known/oauth-authorization-server
// La page …/data/autoriser (public/connecteur.html) demande le code d'accès.
//
// Secrets : CONNECTEUR_DB_HOST, CONNECTEUR_DB_USER, CONNECTEUR_DB_PASSWORD (rôle connecteur_lecture),
// CONNECTEUR_BASE_URL (facultatif). SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont fournis par Supabase.
// verify_jwt = false : la fonction vérifie elle-même ses jetons.

import postgres from "npm:postgres@3.4.5";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import {
  adresseRetourValide, aleatoire, DUREE_ACCES_S, DUREE_CODE_S, DUREE_RENOUVELLEMENT_S, empreinte,
  metadonneesRessource, metadonneesServeur, pkceValide,
} from "./oauth.ts";
import { decrireTable, glossaire, INSTRUCTIONS, interroger, listerTables, OUTILS, type ResultatOutil } from "./outils.ts";

const BASE = (Deno.env.get("CONNECTEUR_BASE_URL") ?? "https://plateforme.albarakaecosysteme.com").replace(/\/$/, "");
const META_RESSOURCE = `${BASE}/.well-known/oauth-protected-resource/data/mcp`;
const PROTOCOLES = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let sqlLecture: ReturnType<typeof postgres> | null = null;
function lecteur() {
  if (!sqlLecture) {
    sqlLecture = postgres({
      host: Deno.env.get("CONNECTEUR_DB_HOST")!,
      port: 6543,
      database: "postgres",
      username: Deno.env.get("CONNECTEUR_DB_USER")!,
      password: Deno.env.get("CONNECTEUR_DB_PASSWORD")!,
      ssl: "require",
      prepare: false, // pooler en mode transaction
      max: 3,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return sqlLecture;
}

// ---------- HTTP ----------

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, mcp-protocol-version, mcp-session-id",
  "Access-Control-Expose-Headers": "WWW-Authenticate, Mcp-Session-Id",
};

function json(corps: unknown, statut = 200, entetes: Record<string, string> = {}) {
  return new Response(JSON.stringify(corps), {
    status: statut,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...CORS, ...entetes },
  });
}

function nonAutorise(message = "Jeton absent, invalide ou expiré.") {
  return json({ error: "invalid_token", error_description: message }, 401, {
    "WWW-Authenticate": `Bearer resource_metadata="${META_RESSOURCE}", error="invalid_token"`,
  });
}

async function lireCorps(req: Request): Promise<Record<string, string>> {
  const type = req.headers.get("content-type") ?? "";
  const texte = await req.text();
  if (type.includes("application/json")) {
    try { return JSON.parse(texte) ?? {}; } catch { return {}; }
  }
  return Object.fromEntries(new URLSearchParams(texte));
}

async function journaliser(entree: { acces_id?: string | null; outil: string; requete?: string | null; lignes?: number | null; duree_ms?: number | null; erreur?: string | null }) {
  const { error } = await admin.from("connecteur_journal").insert({
    acces_id: entree.acces_id ?? null,
    outil: entree.outil,
    requete: entree.requete ? entree.requete.slice(0, 8000) : null,
    lignes: entree.lignes ?? null,
    duree_ms: entree.duree_ms ?? null,
    erreur: entree.erreur ? entree.erreur.slice(0, 2000) : null,
  });
  if (error) console.error("journal", error.message);
}

// ---------- OAuth ----------

async function enregistrer(req: Request) {
  const c = await lireCorps(req) as unknown as { redirect_uris?: unknown; client_name?: unknown };
  const uris = Array.isArray(c.redirect_uris) ? c.redirect_uris.filter((u) => typeof u === "string") as string[] : [];
  if (!uris.length || uris.length > 10 || !uris.every(adresseRetourValide)) {
    return json({ error: "invalid_redirect_uri", error_description: "Adresses de retour https (ou http://localhost) obligatoires." }, 400);
  }
  const nom = typeof c.client_name === "string" ? c.client_name.slice(0, 120) : "Application";
  const client_id = aleatoire("alb_client_", 18);
  const { error } = await admin.from("connecteur_oauth_clients").insert({ client_id, client_name: nom, redirect_uris: uris });
  if (error) return json({ error: "server_error", error_description: error.message }, 500);
  return json({
    client_id, client_name: nom, redirect_uris: uris, client_id_issued_at: Math.floor(Date.now() / 1000),
    token_endpoint_auth_method: "none", grant_types: ["authorization_code", "refresh_token"], response_types: ["code"],
  }, 201);
}

async function clientEtRetour(client_id: string, redirect_uri: string) {
  if (!client_id || !redirect_uri) return null;
  const { data } = await admin.from("connecteur_oauth_clients").select("client_id, client_name, redirect_uris")
    .eq("client_id", client_id).maybeSingle();
  if (!data || !(data.redirect_uris as string[]).includes(redirect_uri)) return null;
  return data;
}

function retour(redirect_uri: string, params: Record<string, string | undefined>) {
  const u = new URL(redirect_uri);
  for (const [k, v] of Object.entries(params)) if (v) u.searchParams.set(k, v);
  return u.toString();
}

/** Informations affichées par la page de connexion. */
async function infosClient(url: URL) {
  const client = await clientEtRetour(url.searchParams.get("client_id") ?? "", url.searchParams.get("redirect_uri") ?? "");
  if (!client) return json({ valide: false }, 200);
  return json({ valide: true, nom: client.client_name });
}

/** Appelé par la page de connexion avec le code d'accès saisi. */
async function autoriser(req: Request) {
  const c = await lireCorps(req);
  const client = await clientEtRetour(c.client_id ?? "", c.redirect_uri ?? "");
  if (!client) return json({ erreur: "Demande de connexion invalide : relance la connexion depuis Claude." }, 400);
  if (c.refuser) return json({ redirection: retour(c.redirect_uri, { error: "access_denied", state: c.state }) });
  if (c.response_type !== "code" || c.code_challenge_method !== "S256" || !c.code_challenge) {
    return json({ erreur: "Demande de connexion incomplète (PKCE S256 obligatoire) : relance la connexion depuis Claude." }, 400);
  }
  const code = (c.code_acces ?? "").trim();
  const { data: acces } = code
    ? await admin.from("connecteur_acces").select("id, nom, actif").eq("code_hash", await empreinte(code)).maybeSingle()
    : { data: null };
  if (!acces || !acces.actif) {
    await journaliser({ outil: "connexion_refusee", erreur: `code ${acces ? "désactivé" : "inconnu"} (client ${client.client_name})` });
    await new Promise((r) => setTimeout(r, 800));
    return json({ erreur: "Code d'accès invalide ou désactivé." }, 403);
  }
  const codeAutorisation = aleatoire("alb_code_");
  const { error } = await admin.from("connecteur_oauth_codes").insert({
    code_hash: await empreinte(codeAutorisation), client_id: client.client_id, acces_id: acces.id,
    redirect_uri: c.redirect_uri, code_challenge: c.code_challenge,
    expire_le: new Date(Date.now() + DUREE_CODE_S * 1000).toISOString(),
  });
  if (error) return json({ erreur: "Erreur serveur, réessaie." }, 500);
  await journaliser({ acces_id: acces.id, outil: "connexion", requete: client.client_name });
  return json({ redirection: retour(c.redirect_uri, { code: codeAutorisation, state: c.state }), nom: acces.nom });
}

async function emettreJetons(acces_id: string, client_id: string) {
  const access = aleatoire("alb_at_");
  const refresh = aleatoire("alb_rt_");
  const maintenant = Date.now();
  const { error } = await admin.from("connecteur_oauth_jetons").insert([
    { jeton_hash: await empreinte(access), type: "access", acces_id, client_id, expire_le: new Date(maintenant + DUREE_ACCES_S * 1000).toISOString() },
    { jeton_hash: await empreinte(refresh), type: "refresh", acces_id, client_id, expire_le: new Date(maintenant + DUREE_RENOUVELLEMENT_S * 1000).toISOString() },
  ]);
  if (error) return json({ error: "server_error" }, 500);
  return json({ access_token: access, token_type: "Bearer", expires_in: DUREE_ACCES_S, refresh_token: refresh, scope: "data" });
}

async function accesActif(acces_id: string) {
  const { data } = await admin.from("connecteur_acces").select("actif").eq("id", acces_id).maybeSingle();
  return !!data?.actif;
}

async function jeton(req: Request) {
  const c = await lireCorps(req);
  const refus = (description: string) => json({ error: "invalid_grant", error_description: description }, 400);

  if (c.grant_type === "authorization_code") {
    const h = await empreinte(c.code ?? "");
    const { data: code } = await admin.from("connecteur_oauth_codes").select("*").eq("code_hash", h).maybeSingle();
    if (!code || code.utilise_le || new Date(code.expire_le) < new Date()) return refus("Code expiré ou déjà utilisé.");
    // usage unique, même en cas d'échec ensuite
    const { data: marque } = await admin.from("connecteur_oauth_codes").update({ utilise_le: new Date().toISOString() })
      .eq("code_hash", h).is("utilise_le", null).select("code_hash");
    if (!marque?.length) return refus("Code déjà utilisé.");
    if (c.client_id && c.client_id !== code.client_id) return refus("Client différent.");
    if (c.redirect_uri && c.redirect_uri !== code.redirect_uri) return refus("Adresse de retour différente.");
    if (!(await pkceValide(c.code_verifier ?? "", code.code_challenge))) return refus("Vérification PKCE échouée.");
    if (!(await accesActif(code.acces_id))) return refus("Accès désactivé.");
    return await emettreJetons(code.acces_id, code.client_id);
  }

  if (c.grant_type === "refresh_token") {
    const h = await empreinte(c.refresh_token ?? "");
    const { data: rt } = await admin.from("connecteur_oauth_jetons").select("*").eq("jeton_hash", h).eq("type", "refresh").maybeSingle();
    if (!rt || rt.revoque_le || new Date(rt.expire_le) < new Date()) return refus("Jeton de renouvellement invalide ou expiré.");
    if (c.client_id && c.client_id !== rt.client_id) return refus("Client différent.");
    if (!(await accesActif(rt.acces_id))) return refus("Accès désactivé.");
    const { data: revoque } = await admin.from("connecteur_oauth_jetons").update({ revoque_le: new Date().toISOString() })
      .eq("jeton_hash", h).is("revoque_le", null).select("jeton_hash");
    if (!revoque?.length) return refus("Jeton de renouvellement déjà utilisé.");
    return await emettreJetons(rt.acces_id, rt.client_id);
  }

  return json({ error: "unsupported_grant_type" }, 400);
}

/** Vérifie le jeton d'accès ; renvoie l'accès (id, nom) ou null. */
async function authentifier(req: Request): Promise<{ id: string; nom: string } | null> {
  const m = /^Bearer\s+(.+)$/i.exec(req.headers.get("authorization") ?? "");
  if (!m) return null;
  const { data } = await admin.from("connecteur_oauth_jetons")
    .select("acces_id, expire_le, revoque_le, connecteur_acces(nom, actif)")
    .eq("jeton_hash", await empreinte(m[1].trim())).eq("type", "access").maybeSingle();
  // deno-lint-ignore no-explicit-any
  const acces = (data as any)?.connecteur_acces;
  if (!data || data.revoque_le || new Date(data.expire_le) < new Date() || !acces?.actif) return null;
  admin.from("connecteur_acces").update({ derniere_utilisation: new Date().toISOString() }).eq("id", data.acces_id).then(() => {});
  return { id: data.acces_id, nom: acces.nom };
}

// ---------- MCP (JSON-RPC sur HTTP, sans état) ----------

type Message = { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> };

const ok = (id: Message["id"], result: unknown) => ({ jsonrpc: "2.0", id, result });
const ko = (id: Message["id"], code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

async function appelOutil(nom: string, args: Record<string, unknown>, acces: { id: string }): Promise<ResultatOutil> {
  const sql = lecteur();
  switch (nom) {
    case "lister_tables": return await listerTables(sql, args.recherche as string | undefined);
    case "decrire_table": return await decrireTable(sql, String(args.table ?? ""));
    case "interroger": return await interroger(sql, String(args.sql ?? ""), args.limite as number | undefined);
    case "glossaire": return glossaire(args.recherche as string | undefined);
    default: return { texte: "", erreur: `Outil inconnu : ${nom}` };
  }
}

async function traiter(msg: Message, acces: { id: string; nom: string }) {
  if (msg.id === undefined || msg.id === null) return null; // notification
  switch (msg.method) {
    case "initialize": {
      const demande = String(msg.params?.protocolVersion ?? "");
      return ok(msg.id, {
        protocolVersion: PROTOCOLES.includes(demande) ? demande : "2025-06-18",
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "data-albaraka", title: "Data Al Baraka", version: "1.0.0" },
        instructions: INSTRUCTIONS,
      });
    }
    case "ping": return ok(msg.id, {});
    case "tools/list": return ok(msg.id, { tools: OUTILS });
    case "tools/call": {
      const nom = String(msg.params?.name ?? "");
      const args = (msg.params?.arguments ?? {}) as Record<string, unknown>;
      const debut = Date.now();
      let r: ResultatOutil;
      try { r = await appelOutil(nom, args, acces); } catch (e) { r = { texte: "", erreur: `Erreur : ${(e as Error).message}` }; }
      await journaliser({
        acces_id: acces.id, outil: nom,
        requete: r.requete ?? (Object.keys(args).length ? JSON.stringify(args) : null),
        lignes: r.lignes ?? null, duree_ms: Date.now() - debut, erreur: r.erreur ?? null,
      });
      return ok(msg.id, { content: [{ type: "text", text: r.erreur ?? r.texte }], isError: !!r.erreur });
    }
    case "resources/list": return ok(msg.id, { resources: [] });
    case "prompts/list": return ok(msg.id, { prompts: [] });
    default: return ko(msg.id, -32601, `Méthode non prise en charge : ${msg.method}`);
  }
}

async function mcp(req: Request) {
  if (req.method !== "POST") return json({ error: "Utiliser POST (MCP Streamable HTTP, sans flux SSE)." }, 405, { Allow: "POST" });
  const acces = await authentifier(req);
  if (!acces) return nonAutorise();
  let corps: Message | Message[];
  try { corps = await req.json(); } catch { return json(ko(null, -32700, "JSON invalide"), 400); }
  const messages = Array.isArray(corps) ? corps : [corps];
  const reponses = (await Promise.all(messages.map((m) => traiter(m, acces)))).filter((r) => r !== null);
  if (!reponses.length) return new Response(null, { status: 202, headers: CORS });
  return json(Array.isArray(corps) ? reponses : reponses[0]);
}

// ---------- Aiguillage ----------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  const url = new URL(req.url);
  const chemin = url.pathname.replace(/^.*?\/connecteur-equipe/, "") || "/";
  try {
    if (chemin.startsWith("/.well-known/oauth-protected-resource")) return json(metadonneesRessource(BASE));
    if (chemin.startsWith("/.well-known/oauth-authorization-server") || chemin.startsWith("/.well-known/openid-configuration")) {
      return json(metadonneesServeur(BASE));
    }
    if (chemin === "/register" && req.method === "POST") return await enregistrer(req);
    if (chemin === "/token" && req.method === "POST") return await jeton(req);
    if (chemin === "/client" && req.method === "GET") return await infosClient(url);
    if (chemin === "/autoriser" && req.method === "POST") return await autoriser(req);
    if (chemin === "/mcp" || chemin === "/") return await mcp(req);
    return json({ error: "not_found" }, 404);
  } catch (e) {
    console.error(e);
    return json({ error: "server_error", error_description: (e as Error).message }, 500);
  }
});
