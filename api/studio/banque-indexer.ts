// Studio, Voix off : lance l'indexation de la banque de vidéos sur une machine de
// montage (Vercel Sandbox, Paris). Réservé au CEO (page Studio → Banque).
//
// POST /api/studio/banque-indexer   Authorization: Bearer <jeton Supabase du CEO>
//   { videos?: string[] }   sans liste : toutes les vidéos à indexer (ou en erreur), 200 au plus
//
// La fonction agit avec les droits du CEO : studio_banque_lancer_indexation crée le job
// et son jeton. La machine ne reçoit que ce jeton et l'adresse de l'edge function
// studio-banque, qui lui signe les liens de la banque. Voir studio/banque.py.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Sandbox } from "@vercel/sandbox";
import { getVercelOidcToken } from "@vercel/oidc";
import { createClient } from "@supabase/supabase-js";

const REGION = "cdg1";
const DUREE_MACHINE_MS = 5 * 60 * 60 * 1000; // une grosse banque prend des heures

const repondre = (status: number, corps: unknown) =>
  new Response(JSON.stringify(corps), { status, headers: { "Content-Type": "application/json" } });

function fichiersDuMoteur(): { path: string; content: Buffer }[] {
  const racine = join(process.cwd(), "studio");
  return readdirSync(racine, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".py"))
    .map((e) => ({ path: `studio/${e.name}`, content: readFileSync(join(racine, e.name)) }));
}

function identifiants() {
  return process.env.VERCEL_TOKEN
    ? { token: process.env.VERCEL_TOKEN, teamId: process.env.VERCEL_TEAM_ID, projectId: process.env.VERCEL_PROJECT_ID }
    : {};
}

async function jetonArret(): Promise<{ token: string; teamId: string }> {
  const token = process.env.VERCEL_TOKEN ?? (await getVercelOidcToken());
  const teamId =
    process.env.VERCEL_TEAM_ID ?? JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()).owner_id;
  return { token, teamId };
}

export async function POST(request: Request): Promise<Response> {
  const url = process.env.SUPABASE_URL!;
  const anon = process.env.SUPABASE_ANON_KEY!;
  const jwt = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return repondre(401, { error: "Non connecté" });
  let corps: { videos?: string[] } = {};
  try {
    corps = await request.json();
  } catch {
    // corps vide : toutes les vidéos à indexer
  }

  const sb = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb.rpc("studio_banque_lancer_indexation", {
    p_videos: corps.videos?.length ? corps.videos : null,
  });
  if (error) return repondre(error.message.includes("CEO") ? 403 : 409, { error: error.message });
  const r = data as { job: string | null; jeton?: string; videos: number };
  if (!r.job) return repondre(200, { job: null, videos: 0 });

  try {
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
      args: ["studio/banque.py"],
      detached: true,
      env: {
        JOB: r.job,
        JETON: r.jeton!,
        FONCTION_BANQUE: `${url}/functions/v1/studio-banque`,
        SUPABASE_URL: url,
        SUPABASE_ANON: anon,
        OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY!,
        STOP_URL: `https://vercel.com/api/v2/sandboxes/sessions/${sbx.currentSession().sessionId}/stop?teamId=${arret.teamId}`,
        STOP_TOKEN: arret.token,
      },
    });
    return repondre(202, { job: r.job, videos: r.videos });
  } catch (e) {
    const message = `La machine d'indexation n'a pas pu démarrer (${e instanceof Error ? e.message : String(e)}).`;
    await sb.rpc("studio_banque_job_erreur", { p_job: r.job, p_jeton: r.jeton, p_video: null, p_message: message });
    return repondre(500, { error: message });
  }
}
