// Analyse d'appels : lance une machine d'analyse (Vercel Sandbox, Paris) pour un appel déposé
// par un coach. Même machine modèle que le Studio (FFmpeg, Python) : studio/appel.py.
//
// POST /api/appels/demarrer   Authorization: Bearer <jeton Supabase du coach>
//   { appel_id, action: "lancer" }          après le dépôt du fichier (ou pour relancer)
//   { appel_id, action: "inverser_voix" }   l'IA a confondu l'élève et le prospect : on refait l'analyse
//
// La fonction agit avec les droits du coach (son jeton Supabase), jamais avec la clé de
// service : elle signe les liens du fichier de l'appel et passe par appel_lancer /
// appel_inverser_voix. La machine reçoit ces liens et un jeton à usage unique, rien d'autre.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Sandbox } from "@vercel/sandbox";
import { getVercelOidcToken } from "@vercel/oidc";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "appels";
const REGION = "cdg1"; // Paris : les appels restent en Europe
const DUREE_MACHINE_MS = 25 * 60 * 1000;

const repondre = (status: number, corps: unknown) =>
  new Response(JSON.stringify(corps), { status, headers: { "Content-Type": "application/json" } });

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

  let corps: { appel_id?: string; action?: string };
  try {
    corps = await request.json();
  } catch {
    return repondre(400, { error: "Requête illisible" });
  }
  const { appel_id: id, action } = corps;
  if (!id || (action !== "lancer" && action !== "inverser_voix")) return repondre(400, { error: "Paramètres manquants" });

  const sb = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: user, error: eUser } = await sb.auth.getUser(jwt);
  if (eUser || !user.user) return repondre(401, { error: "Session expirée" });
  const { data: acces } = await sb.rpc("appels_acces", { p_uid: user.user.id });
  if (!acces) return repondre(403, { error: "L'analyse d'appels est réservée aux coachs." });

  const { data: a, error: eA } = await sb.from("appels_analyses").select("id, fichier_path").eq("id", id).maybeSingle();
  if (eA || !a) return repondre(404, { error: "Appel introuvable" });

  const mode = action === "lancer" ? "complet" : "analyse";
  const { data: jeton, error: eJ } =
    action === "lancer"
      ? await sb.rpc("appel_lancer", { p_id: id, p_mode: "complet" })
      : await sb.rpc("appel_inverser_voix", { p_id: id });
  if (eJ || !jeton) return repondre(409, { error: eJ?.message ?? "Impossible de lancer l'analyse" });

  const echouer = async (message: string) => {
    await sb.rpc("appel_job_erreur", { p_id: id, p_jeton: jeton, p_message: message });
    return repondre(500, { error: message });
  };

  try {
    const stockage = sb.storage.from(BUCKET);
    const liens: Record<string, string> = {};
    if (mode === "complet") {
      const { data: lecture, error: eL } = await stockage.createSignedUrl(a.fichier_path!, 3 * 3600);
      if (eL) throw new Error(`Lien de lecture impossible : ${eL.message}`);
      const audioPath = `${id}/audio.mp3`;
      const { data: depot, error: eD } = await stockage.createSignedUploadUrl(audioPath, { upsert: true });
      if (eD) throw new Error(`Lien de dépôt impossible : ${eD.message}`);
      Object.assign(liens, { source: lecture.signedUrl, audio: depot.signedUrl, audio_path: audioPath });
    }

    const sbx = await Sandbox.create({
      ...identifiants(),
      source: { type: "snapshot", snapshotId: process.env.STUDIO_SNAPSHOT_ID! },
      resources: { vcpus: 2 },
      timeout: DUREE_MACHINE_MS,
      region: REGION,
    });
    await sbx.writeFiles([{ path: "studio/appel.py", content: readFileSync(join(process.cwd(), "studio", "appel.py")) }]);
    const arret = await jetonArret();
    await sbx.runCommand({
      cmd: "python",
      args: ["studio/appel.py"],
      detached: true,
      env: {
        APPEL_ID: id,
        JETON: jeton as string,
        MODE: mode,
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
    return echouer(`La machine d'analyse n'a pas pu démarrer (${e instanceof Error ? e.message : String(e)}).`);
  }
}
