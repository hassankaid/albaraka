// Studio, Voix off : liens signés vers la banque de vidéos (bucket privé studio-banque)
// pour les machines de montage, qui n'ont qu'un jeton à usage unique. La clé de
// service ne quitte jamais cette fonction.
//
// POST { action: "indexation", job, jeton }
//   → les vidéos du job d'indexation, avec un lien de lecture de l'original (3 h).
// POST { action: "depots", job, jeton, chemins: [...] }
//   → liens de dépôt, seulement sous travail/<vidéo>.mp4 et images/<vidéo>/ des vidéos du job.
// POST { action: "montage", montage_id, jeton, chemins: [...] }
//   → liens de lecture des versions de travail (plans choisis pour un montage Voix off).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const BUCKET = "studio-banque";
const DUREE_LIEN = 3 * 3600;
const supabase = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");

const reponse = (status: number, corps: unknown) =>
  new Response(JSON.stringify(corps), { status, headers: { "Content-Type": "application/json" } });

async function empreinte(jeton: string): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(jeton));
  return Array.from(new Uint8Array(h), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function jobValide(job: string, jeton: string) {
  const { data } = await supabase.from("studio_banque_jobs").select("id, jeton_hash, statut, videos").eq("id", job).maybeSingle();
  if (!data || data.statut !== "en_cours" || data.jeton_hash !== (await empreinte(jeton))) return null;
  return data as { id: string; videos: string[] };
}

async function montageValide(id: string, jeton: string) {
  const { data } = await supabase.from("studio_montages").select("id, jeton_hash, statut, outil").eq("id", id).maybeSingle();
  if (!data || !["preparation", "en_cours"].includes(data.statut) || data.jeton_hash !== (await empreinte(jeton))) return null;
  return data;
}

async function lire(chemins: string[]) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(chemins, DUREE_LIEN);
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((d) => [d.path, d.signedUrl]));
}

serve(async (req) => {
  let corps: { action?: string; job?: string; montage_id?: string; jeton?: string; chemins?: string[] };
  try {
    corps = await req.json();
  } catch {
    return reponse(400, { error: "Requête illisible" });
  }
  const jeton = String(corps.jeton ?? "");
  try {
    if (corps.action === "indexation" || corps.action === "depots") {
      const job = await jobValide(String(corps.job ?? ""), jeton);
      if (!job) return reponse(403, { error: "Jeton invalide" });
      if (corps.action === "indexation") {
        const { data: videos, error } = await supabase
          .from("studio_banque_videos")
          .select("id, nom, chemin_original")
          .in("id", job.videos);
        if (error) throw error;
        const liens = await lire((videos ?? []).map((v) => v.chemin_original));
        return reponse(200, { videos: (videos ?? []).map((v) => ({ ...v, lire: liens[v.chemin_original] })) });
      }
      const chemins = (corps.chemins ?? []).slice(0, 500);
      const permis = (c: string) =>
        job.videos.some((v) => c === `travail/${v}.mp4` || (c.startsWith(`images/${v}/`) && /^[\w./-]+\.jpg$/.test(c)));
      if (!chemins.length || !chemins.every(permis)) return reponse(403, { error: "Chemin refusé" });
      const depots: Record<string, string> = {};
      for (const c of chemins) {
        const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(c, { upsert: true });
        if (error) throw error;
        depots[c] = data.signedUrl;
      }
      return reponse(200, { depots });
    }

    if (corps.action === "montage") {
      const m = await montageValide(String(corps.montage_id ?? ""), jeton);
      if (!m) return reponse(403, { error: "Jeton invalide" });
      const chemins = [...new Set((corps.chemins ?? []).slice(0, 200))];
      const { data: connus, error } = await supabase
        .from("studio_banque_videos")
        .select("chemin_travail")
        .in("chemin_travail", chemins)
        .eq("statut", "indexee");
      if (error) throw error;
      if ((connus ?? []).length !== chemins.length) return reponse(403, { error: "Chemin refusé" });
      return reponse(200, { liens: await lire(chemins) });
    }

    return reponse(400, { error: "Action inconnue" });
  } catch (e) {
    return reponse(500, { error: e instanceof Error ? e.message : String(e) });
  }
});
