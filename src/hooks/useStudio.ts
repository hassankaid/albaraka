// Studio vidéo : montages de l'élève, import de la vidéo, lancement des machines.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as tus from "tus-js-client";
import { supabase } from "@/integrations/supabase/client";
import type { Montage, Reglages } from "@/lib/studio/reglages";

export const BUCKET_STUDIO = "studio-videos";

// Table absente des types générés (src/integrations/supabase/types.ts).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const EN_MOUVEMENT = ["import", "preparation", "en_cours"];

export function useMesMontages(userId: string | undefined) {
  return useQuery({
    queryKey: ["studio", "montages", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Montage[]> => {
      const { data, error } = await db
        .from("studio_montages")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: (q) => ((q.state.data ?? []).some((m) => EN_MOUVEMENT.includes(m.statut)) ? 4000 : false),
  });
}

export function useMontage(id: string | undefined) {
  return useQuery({
    queryKey: ["studio", "montage", id],
    enabled: !!id,
    queryFn: async (): Promise<Montage | null> => {
      const { data, error } = await db.from("studio_montages").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
    // l'écran d'attente suit les étapes de la machine, même si l'onglet passe en arrière-plan
    refetchInterval: (q) => (q.state.data && EN_MOUVEMENT.includes(q.state.data.statut) ? 2500 : false),
    refetchIntervalInBackground: true,
  });
}

export function useRafraichirStudio() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["studio"] });
}

/** Lien de lecture temporaire d'un fichier du Studio (1 h). */
export async function lienStudio(chemin: string, telechargement?: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET_STUDIO)
    .createSignedUrl(chemin, 3600, telechargement ? { download: telechargement } : undefined);
  if (error) throw error;
  return data.signedUrl;
}

/**
 * Crée le montage puis envoie la vidéo par morceaux (reprise automatique si la
 * connexion coupe, indispensable pour 1 Go depuis un téléphone).
 */
export async function importerVideo(
  fichier: File,
  onProgres: (pourcent: number) => void,
): Promise<string> {
  const { data: session } = await supabase.auth.getSession();
  const jeton = session.session?.access_token;
  const uid = session.session?.user.id;
  if (!jeton || !uid) throw new Error("Session expirée, reconnecte-toi.");
  const id = crypto.randomUUID();
  const ext = fichier.name.toLowerCase().endsWith(".mov") ? "mov" : "mp4";
  const chemin = `${uid}/${id}/source.${ext}`;
  const { error } = await db.from("studio_montages").insert({
    id,
    outil: "face_camera",
    source_nom: fichier.name.slice(0, 200),
    source_path: chemin,
  });
  if (error) throw error;

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
        bucketName: BUCKET_STUDIO,
        objectName: chemin,
        contentType: ext === "mov" ? "video/quicktime" : "video/mp4",
        cacheControl: "3600",
      },
      chunkSize: 6 * 1024 * 1024, // taille imposée par Supabase
      onError: ko,
      onProgress: (envoye, total) => onProgres(Math.round((envoye / total) * 100)),
      onSuccess: () => ok(),
    });
    envoi.findPreviousUploads().then((precedents) => {
      if (precedents.length) envoi.resumeFromPreviousUpload(precedents[0]);
      envoi.start();
    });
  });
  return id;
}

/** Démarre la préparation (après l'import) ou le montage (bouton « Lancer le montage »). */
export async function demarrer(
  id: string,
  action: "preparer" | "lancer",
  reglages?: Reglages,
): Promise<{ action: string }> {
  const { data: session } = await supabase.auth.getSession();
  const rep = await fetch("/api/studio/demarrer", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.session?.access_token ?? ""}` },
    body: JSON.stringify({ montage_id: id, action, reglages }),
  });
  const corps = await rep.json().catch(() => ({}));
  if (!rep.ok) throw new Error(corps.error ?? `Erreur ${rep.status}`);
  return corps;
}

export async function signalerProbleme(id: string, texte: string) {
  const { error } = await db.rpc("studio_signaler", { p_id: id, p_texte: texte });
  if (error) throw error;
}

/**
 * Voix off : crée le montage (outil voix_off, script et thème) puis envoie
 * l'enregistrement de la voix, par morceaux comme une vidéo.
 */
export async function importerVoix(
  fichier: Blob,
  nom: string,
  script: string,
  theme: string,
  onProgres: (pourcent: number) => void,
): Promise<string> {
  const { data: session } = await supabase.auth.getSession();
  const jeton = session.session?.access_token;
  const uid = session.session?.user.id;
  if (!jeton || !uid) throw new Error("Session expirée, reconnecte-toi.");
  const id = crypto.randomUUID();
  const type = fichier.type || "audio/webm";
  const ext = type.includes("mp4") || type.includes("m4a") ? "m4a" : type.includes("mpeg") ? "mp3" : type.includes("wav") ? "wav" : "webm";
  const chemin = `${uid}/${id}/source.${ext}`;
  const { error } = await db.from("studio_montages").insert({
    id,
    outil: "voix_off",
    source_nom: nom.slice(0, 200),
    source_path: chemin,
    script: script.slice(0, 5000),
    theme,
  });
  if (error) throw error;

  const url = import.meta.env.VITE_SUPABASE_URL as string;
  const projet = new URL(url).hostname.split(".")[0];
  await new Promise<void>((ok, ko) => {
    const envoi = new tus.Upload(fichier, {
      endpoint: `https://${projet}.storage.supabase.co/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: { authorization: `Bearer ${jeton}`, "x-upsert": "true" },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: { bucketName: BUCKET_STUDIO, objectName: chemin, contentType: type, cacheControl: "3600" },
      chunkSize: 6 * 1024 * 1024,
      onError: ko,
      onProgress: (envoye, total) => onProgres(Math.round((envoye / total) * 100)),
      onSuccess: () => ok(),
    });
    envoi.start();
  });
  return id;
}

/** Voix off : thème principal du script, détecté par l'IA. */
export async function detecterTheme(script: string): Promise<string> {
  const { data: session } = await supabase.auth.getSession();
  const rep = await fetch("/api/studio/theme", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.session?.access_token ?? ""}` },
    body: JSON.stringify({ script }),
  });
  const corps = await rep.json().catch(() => ({}));
  if (!rep.ok) throw new Error(corps.error ?? `Erreur ${rep.status}`);
  return corps.theme;
}

/** Les thèmes de la banque (liste proposée à l'élève pour corriger le thème détecté). */
export function useThemes() {
  return useQuery({
    queryKey: ["studio", "themes"],
    queryFn: async (): Promise<{ id: string; nom: string }[]> => {
      const { data, error } = await db.from("studio_banque_themes").select("id, nom").eq("actif", true).order("ordre");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 3600_000,
  });
}
