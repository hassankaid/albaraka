// Studio vidéo : lance une machine de montage (Vercel Sandbox, Paris) pour un montage.
//
// POST /api/studio/demarrer   Authorization: Bearer <jeton Supabase de l'élève>
//   { montage_id, action: "preparer" }              dès la fin de l'import
//   { montage_id, action: "lancer", reglages }      bouton « Lancer le montage »
//
// La fonction agit avec les droits de l'élève (son jeton Supabase), jamais avec
// la clé de service : elle signe les liens de ses propres fichiers et passe par
// les fonctions studio_preparer / studio_lancer. La machine reçoit ces liens et
// un jeton à usage unique, rien d'autre. Elle s'éteint d'elle-même en fin de travail.
//
// Variables Vercel : SUPABASE_URL, SUPABASE_ANON_KEY, OPENROUTER_API_KEY,
// STUDIO_SNAPSHOT_ID (machine modèle, voir scripts/studio-snapshot.mjs).
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Sandbox } from "@vercel/sandbox";
import { getVercelOidcToken } from "@vercel/oidc";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "studio-videos";
const REGION = "cdg1"; // Paris : les vidéos des élèves restent en Europe
const DUREE_MACHINE_MS = 25 * 60 * 1000;
const DEPOTS = ["apercu.jpg", "travail/cut.mp4", "travail/travail.json", "sortie.mp4"];

const repondre = (status: number, corps: unknown) =>
  new Response(JSON.stringify(corps), { status, headers: { "Content-Type": "application/json" } });

// Code envoyé dans la machine : studio/ est joint à la fonction (vercel.json, includeFiles).
function fichiersDuMoteur(): { path: string; content: Buffer }[] {
  const racine = join(process.cwd(), "studio");
  const lire = (dossier: string): { path: string; content: Buffer }[] =>
    readdirSync(join(racine, dossier), { withFileTypes: true }).flatMap((e) => {
      const rel = dossier ? `${dossier}/${e.name}` : e.name;
      if (e.isDirectory()) return lire(rel);
      if (!/\.(py|onnx|rnnn|ttf)$/.test(e.name)) return [];
      return [{ path: `studio/${rel}`, content: readFileSync(join(racine, rel)) }];
    });
  return lire("");
}

// En local (essais), un jeton Vercel ; sur Vercel, l'identité OIDC du projet.
function identifiants() {
  return process.env.VERCEL_TOKEN
    ? { token: process.env.VERCEL_TOKEN, teamId: process.env.VERCEL_TEAM_ID, projectId: process.env.VERCEL_PROJECT_ID }
    : {};
}

async function jetonArret(): Promise<{ token: string; teamId: string }> {
  const token = process.env.VERCEL_TOKEN ?? (await getVercelOidcToken());
  const teamId =
    process.env.VERCEL_TEAM_ID ??
    JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()).owner_id;
  return { token, teamId };
}

export async function POST(request: Request): Promise<Response> {
  const url = process.env.SUPABASE_URL!;
  const anon = process.env.SUPABASE_ANON_KEY!;
  const jwt = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return repondre(401, { error: "Non connecté" });

  let corps: { montage_id?: string; action?: string; reglages?: unknown };
  try {
    corps = await request.json();
  } catch {
    return repondre(400, { error: "Requête illisible" });
  }
  const { montage_id: id, action } = corps;
  if (!id || (action !== "preparer" && action !== "lancer")) return repondre(400, { error: "Paramètres manquants" });

  const sb = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: user, error: eUser } = await sb.auth.getUser(jwt);
  if (eUser || !user.user) return repondre(401, { error: "Session expirée" });
  // Phase 1 : Studio réservé au CEO (et donc à Sidali).
  const { data: profil } = await sb.from("profiles").select("role").eq("id", user.user.id).maybeSingle();
  if (profil?.role !== "ceo") return repondre(403, { error: "Studio pas encore ouvert" });

  const { data: m, error: eM } = await sb
    .from("studio_montages")
    .select("id, user_id, source_path, source_nom")
    .eq("id", id)
    .maybeSingle();
  if (eM || !m || m.user_id !== user.user.id) return repondre(404, { error: "Montage introuvable" });

  let jeton: string;
  let mode: string;
  let reglages: unknown = {};
  if (action === "preparer") {
    const { data, error } = await sb.rpc("studio_preparer", { p_id: id });
    if (error) return repondre(409, { error: error.message });
    jeton = data as string;
    mode = "preparation";
  } else {
    const { data, error } = await sb.rpc("studio_lancer", { p_id: id, p_reglages: corps.reglages ?? {} });
    if (error) return repondre(409, { error: error.message });
    const r = data as { action: string; jeton?: string; mode?: string };
    // préparation encore en cours : la même machine enchaînera le rendu
    if (r.action !== "demarrer") return repondre(200, { action: r.action });
    jeton = r.jeton!;
    mode = r.mode!;
    reglages = corps.reglages ?? {};
  }

  const echouer = async (message: string) => {
    await sb.rpc("studio_job_erreur", { p_id: id, p_jeton: jeton, p_message: message });
    return repondre(500, { error: message });
  };

  try {
    const dossier = `${m.user_id}/${m.id}`;
    const stockage = sb.storage.from(BUCKET);
    const signer = async (chemin: string) => {
      const { data, error } = await stockage.createSignedUrl(chemin, 3 * 3600);
      if (error) throw new Error(`Lien de lecture impossible (${chemin}) : ${error.message}`);
      return data.signedUrl;
    };
    const deposer: Record<string, string> = {};
    for (const nom of DEPOTS) {
      const { data, error } = await stockage.createSignedUploadUrl(`${dossier}/${nom}`, { upsert: true });
      if (error) throw new Error(`Lien de dépôt impossible (${nom}) : ${error.message}`);
      deposer[nom] = data.signedUrl;
    }
    const liens = {
      source: mode === "rendu" ? null : await signer(m.source_path!),
      lire:
        mode === "rendu"
          ? {
              "travail/cut.mp4": await signer(`${dossier}/travail/cut.mp4`),
              "travail/travail.json": await signer(`${dossier}/travail/travail.json`),
            }
          : {},
      deposer,
      sortie_path: `${dossier}/sortie.mp4`,
    };

    const sbx = await Sandbox.create({
      ...identifiants(),
      source: { type: "snapshot", snapshotId: process.env.STUDIO_SNAPSHOT_ID! },
      resources: { vcpus: 8 },
      timeout: DUREE_MACHINE_MS,
      region: REGION,
    });
    await sbx.writeFiles(fichiersDuMoteur());
    const arret = await jetonArret();
    await sbx.runCommand({
      cmd: "python",
      args: ["studio/travail.py"],
      detached: true,
      env: {
        MONTAGE_ID: id,
        JETON: jeton,
        MODE: mode,
        REGLAGES: JSON.stringify(reglages ?? {}),
        LIENS: JSON.stringify(liens),
        SUPABASE_URL: url,
        SUPABASE_ANON: anon,
        OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY!,
        STOP_URL: `https://vercel.com/api/v2/sandboxes/sessions/${sbx.currentSession().sessionId}/stop?teamId=${arret.teamId}`,
        STOP_TOKEN: arret.token,
      },
    });
    return repondre(202, { action: "demarre", mode });
  } catch (e) {
    return echouer(`La machine de montage n'a pas pu démarrer (${e instanceof Error ? e.message : String(e)}).`);
  }
}
