// Studio, Voix off : liens signés vers la banque de vidéos (bucket privé studio-banque)
// pour les machines de montage, qui n'ont qu'un jeton à usage unique. La clé de
// service ne quitte jamais cette fonction.
//
// POST { action: "indexation", job, jeton }
//   → les vidéos du job d'indexation, avec un lien de lecture de l'original (3 h).
// POST { action: "depots", job, jeton, chemins: [...] }
//   → liens de dépôt, seulement sous travail/<vidéo>.mp4 et images/<vidéo>/ des vidéos du job.
// POST { action: "montage", montage_id, jeton, chemins: [...] }
//   → liens de lecture des versions de travail (plans choisis pour un montage Voix off)
//     et du fond sonore.
// POST { action: "import", job, jeton, chemins: [...] }
//   → job d'import (lot venu du OneDrive de Sidali) : liens de dépôt, seulement sous
//     originaux/<empreinte>.<ext> et sons/<empreinte>.<ext>.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const BUCKET = "studio-banque";
const DUREE_LIEN = 3 * 3600;
const IMPORT = /^(originaux|sons)\/[0-9a-f]{64}\.(mp4|mov|m4v|webm|mp3|m4a|wav|aac|ogg)$/;
const supabase = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");

const reponse = (status: number, corps: unknown) =>
  new Response(JSON.stringify(corps), { status, headers: { "Content-Type": "application/json" } });

async function empreinte(jeton: string): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(jeton));
  return Array.from(new Uint8Array(h), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function jobValide(job: string, jeton: string) {
  const { data } = await supabase.from("studio_banque_jobs").select("id, jeton_hash, statut, videos, type").eq("id", job).maybeSingle();
  if (!data || data.statut !== "en_cours" || data.jeton_hash !== (await empreinte(jeton))) return null;
  return data as { id: string; videos: string[]; type: "indexation" | "import" };
}

async function montageValide(id: string, jeton: string) {
  const { data } = await supabase.from("studio_montages").select("id, jeton_hash, statut, outil").eq("id", id).maybeSingle();
  if (!data || !["preparation", "en_cours"].includes(data.statut) || data.jeton_hash !== (await empreinte(jeton))) return null;
  return data;
}

async function deposer(chemins: string[]) {
  const depots: Record<string, string> = {};
  for (const c of chemins) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(c, { upsert: true });
    if (error) throw error;
    depots[c] = data.signedUrl;
  }
  return depots;
}

// par lots de 100 : au-delà, la requête (identifiants dans l'URL) devient trop longue
const LOT = 100;
const lots = <T>(liste: T[]) => Array.from({ length: Math.ceil(liste.length / LOT) }, (_, k) => liste.slice(k * LOT, (k + 1) * LOT));

async function lire(chemins: string[]) {
  const out: Record<string, string> = {};
  for (const lot of lots(chemins)) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(lot, DUREE_LIEN);
    if (error) throw error;
    for (const d of data ?? []) out[d.path] = d.signedUrl;
  }
  return out;
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
    if (corps.action === "import") {
      const job = await jobValide(String(corps.job ?? ""), jeton);
      if (!job || job.type !== "import") return reponse(403, { error: "Jeton invalide" });
      const chemins = [...new Set((corps.chemins ?? []).slice(0, 500))];
      if (!chemins.length || !chemins.every((c) => IMPORT.test(c))) return reponse(403, { error: "Chemin refusé" });
      return reponse(200, { depots: await deposer(chemins) });
    }

    if (corps.action === "indexation" || corps.action === "depots") {
      const job = await jobValide(String(corps.job ?? ""), jeton);
      if (!job || job.type !== "indexation") return reponse(403, { error: "Jeton invalide" });
      if (corps.action === "indexation") {
        const videos: { id: string; nom: string; dossier: string | null; chemin_original: string }[] = [];
        for (const lot of lots(job.videos)) {
          const { data, error } = await supabase.from("studio_banque_videos").select("id, nom, dossier, chemin_original").in("id", lot);
          if (error) throw error;
          videos.push(...(data ?? []));
        }
        const liens = await lire(videos.map((v) => v.chemin_original));
        return reponse(200, { videos: videos.map((v) => ({ ...v, lire: liens[v.chemin_original] })) });
      }
      const chemins = (corps.chemins ?? []).slice(0, 500);
      const permis = (c: string) =>
        job.videos.some((v) => c === `travail/${v}.mp4` || (c.startsWith(`images/${v}/`) && /^[\w./-]+\.jpg$/.test(c)));
      if (!chemins.length || !chemins.every(permis)) return reponse(403, { error: "Chemin refusé" });
      return reponse(200, { depots: await deposer(chemins) });
    }

    if (corps.action === "montage") {
      const m = await montageValide(String(corps.montage_id ?? ""), jeton);
      if (!m) return reponse(403, { error: "Jeton invalide" });
      const chemins = [...new Set((corps.chemins ?? []).slice(0, 200))];
      const plans = chemins.filter((c) => !c.startsWith("sons/"));
      const sons = chemins.filter((c) => c.startsWith("sons/"));
      const [v, s] = await Promise.all([
        plans.length
          ? supabase.from("studio_banque_videos").select("chemin_travail").in("chemin_travail", plans).eq("statut", "indexee")
          : { data: [], error: null },
        sons.length ? supabase.from("studio_sons").select("chemin").in("chemin", sons).eq("actif", true) : { data: [], error: null },
      ]);
      if (v.error) throw v.error;
      if (s.error) throw s.error;
      if ((v.data ?? []).length !== plans.length || (s.data ?? []).length !== sons.length)
        return reponse(403, { error: "Chemin refusé" });
      return reponse(200, { liens: await lire(chemins) });
    }

    return reponse(400, { error: "Action inconnue" });
  } catch (e) {
    return reponse(500, { error: e instanceof Error ? e.message : String(e) });
  }
});
