// Studio, Voix off : la banque de vidéos (page d'administration, CEO).
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as tus from "tus-js-client";
import { supabase } from "@/integrations/supabase/client";
import type { PlanBanque, Theme, VideoBanque } from "@/lib/studio/banque";

export const BUCKET_BANQUE = "studio-banque";

// Tables absentes des types générés (src/integrations/supabase/types.ts).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export function useVideosBanque() {
  return useQuery({
    queryKey: ["banque", "videos"],
    queryFn: async (): Promise<VideoBanque[]> => {
      const { data, error } = await db
        .from("studio_banque_videos")
        .select("id, nom, dossier, statut, erreur, exclue, duree, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    // pendant une indexation, la liste se met à jour toute seule
    refetchInterval: (q) => ((q.state.data ?? []).some((v) => v.statut === "indexation") ? 5000 : false),
  });
}

export function usePlansBanque() {
  return useQuery({
    queryKey: ["banque", "plans"],
    queryFn: async (): Promise<PlanBanque[]> => {
      const tous: PlanBanque[] = [];
      for (let de = 0; ; de += 1000) {
        const { data, error } = await db
          .from("studio_banque_plans")
          .select(
            "id, video_id, rang, debut, fin, images, description, themes, mots_cles, ambiance, qualite, logo, texte_ecran, visage_reconnaissable, exclu, secours",
          )
          .order("video_id")
          .order("rang")
          .range(de, de + 999);
        if (error) throw error;
        tous.push(...(data ?? []));
        if (!data || data.length < 1000) return tous;
      }
    },
  });
}

export function useThemesBanque() {
  return useQuery({
    queryKey: ["banque", "themes"],
    queryFn: async (): Promise<Theme[]> => {
      const { data, error } = await db.from("studio_banque_themes").select("*").order("ordre");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRafraichirBanque() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["banque"] });
}

export async function majPlan(id: string, champs: Partial<Pick<PlanBanque, "exclu" | "secours" | "mots_cles">>) {
  const { error } = await db.from("studio_banque_plans").update(champs).eq("id", id);
  if (error) throw error;
}

export async function majVideo(id: string, champs: Partial<Pick<VideoBanque, "exclue">>) {
  const { error } = await db.from("studio_banque_videos").update({ ...champs, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

/** Liens de lecture temporaires (1 h) pour les images clés affichées. */
export async function liensBanque(chemins: string[]): Promise<Record<string, string>> {
  if (!chemins.length) return {};
  const { data, error } = await supabase.storage.from(BUCKET_BANQUE).createSignedUrls(chemins, 3600);
  if (error) throw error;
  return Object.fromEntries((data ?? []).filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl]));
}

/** Envoie une vidéo dans la banque (par morceaux, reprise si la connexion coupe) puis l'enregistre. */
export async function importerDansBanque(fichier: File, onProgres: (pourcent: number) => void): Promise<string> {
  const { data: session } = await supabase.auth.getSession();
  const jeton = session.session?.access_token;
  if (!jeton) throw new Error("Session expirée, reconnecte-toi.");
  const id = crypto.randomUUID();
  const ext = fichier.name.toLowerCase().split(".").pop() ?? "mp4";
  const chemin = `originaux/${id}.${ext}`;
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  const projet = new URL(url).hostname.split(".")[0];
  await new Promise<void>((ok, ko) => {
    const envoi = new tus.Upload(fichier, {
      endpoint: `https://${projet}.storage.supabase.co/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: { authorization: `Bearer ${jeton}`, "x-upsert": "true" },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: BUCKET_BANQUE,
        objectName: chemin,
        contentType: fichier.type || "video/mp4",
        cacheControl: "3600",
      },
      chunkSize: 6 * 1024 * 1024,
      onError: ko,
      onProgress: (envoye, total) => onProgres(Math.round((envoye / total) * 100)),
      onSuccess: () => ok(),
    });
    envoi.findPreviousUploads().then((precedents) => {
      if (precedents.length) envoi.resumeFromPreviousUpload(precedents[0]);
      envoi.start();
    });
  });
  const { error } = await db
    .from("studio_banque_videos")
    .insert({ id, nom: fichier.name.slice(0, 200), chemin_original: chemin, origine: "import" });
  if (error) throw error;
  return id;
}

/** Lance l'indexation des vidéos en attente (ou de celles données). */
export async function lancerIndexation(videos?: string[]): Promise<{ job: string | null; videos: number }> {
  const { data: session } = await supabase.auth.getSession();
  const rep = await fetch("/api/studio/banque-indexer", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.session?.access_token ?? ""}` },
    body: JSON.stringify(videos?.length ? { videos } : {}),
  });
  const corps = await rep.json().catch(() => ({}));
  if (!rep.ok) throw new Error(corps.error ?? `Erreur ${rep.status}`);
  return corps;
}
