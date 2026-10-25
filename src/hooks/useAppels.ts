// Analyse d'appels (V1 coach) : lecture des appels, dépôt du fichier, lancement de la
// machine (/api/appels/demarrer) et actions du coach (enregistrer, valider, rouvrir).
import { useQuery } from "@tanstack/react-query";
import * as tus from "tus-js-client";
import { supabase } from "@/integrations/supabase/client";
import type { Analyse, StatutAppel, Tour } from "@/lib/appels/retour";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
export const BUCKET_APPELS = "appels";

export interface AppelResume {
  id: string;
  cree_le: string;
  statut: StatutAppel;
  etape: string | null;
  type_appel: string;
  duree_s: number | null;
  note_ia: number | null;
  note_finale: number | null;
  erreur: string | null;
  alerte_duree: string | null;
  eleve: { full_name: string | null; email: string | null } | null;
  coach: { full_name: string | null } | null;
}

export interface AppelDetail extends AppelResume {
  eleve_id: string;
  fichier_nom: string | null;
  audio_path: string | null;
  audio_supprime_le: string | null;
  prospect_informe: boolean;
  voix_inversees: boolean;
  transcription: { tours: Tour[] } | null;
  mesures: { part_setter_pct?: number; part_prospect_pct?: number } | null;
  analyse_ia: Analyse | null;
  analyse_coach: Analyse | null;
  nb_corrections: number;
  exemple_reference: boolean;
  referentiel_version: string | null;
  valide_le: string | null;
  valideur: { full_name: string | null } | null;
}

const enCours = (s: StatutAppel) => s === "depose" || s === "en_cours";

const CHAMPS_RESUME =
  "id, cree_le, statut, etape, type_appel, duree_s, note_ia, note_finale, erreur, alerte_duree:analyse_ia->>alerte_duree, " +
  "eleve:profiles!appels_analyses_eleve_id_fkey(full_name, email), coach:profiles!appels_analyses_coach_id_fkey(full_name)";

export function useAppels() {
  return useQuery({
    queryKey: ["appels"],
    queryFn: async (): Promise<AppelResume[]> => {
      const { data, error } = await db.from("appels_analyses").select(CHAMPS_RESUME).order("cree_le", { ascending: false }).limit(500);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: (q) => ((q.state.data as AppelResume[] | undefined)?.some((a) => enCours(a.statut)) ? 4000 : false),
  });
}

export function useAppel(id: string | undefined) {
  return useQuery({
    queryKey: ["appel", id],
    enabled: !!id,
    queryFn: async (): Promise<AppelDetail> => {
      const { data, error } = await db
        .from("appels_analyses")
        .select(
          CHAMPS_RESUME +
            ", eleve_id, fichier_nom, audio_path, audio_supprime_le, prospect_informe, voix_inversees, transcription, mesures, " +
            "analyse_ia, analyse_coach, nb_corrections, exemple_reference, referentiel_version, valide_le, " +
            "valideur:profiles!appels_analyses_valide_par_fkey(full_name)",
        )
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    refetchInterval: (q) => (q.state.data && enCours((q.state.data as AppelDetail).statut) ? 3000 : false),
  });
}

export function useAudioAppel(chemin: string | null | undefined) {
  return useQuery({
    queryKey: ["appel-audio", chemin],
    enabled: !!chemin,
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(BUCKET_APPELS).createSignedUrl(chemin!, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}

export async function chercherEleves(q: string): Promise<{ id: string; full_name: string | null; email: string | null }[]> {
  const { data, error } = await db.rpc("appels_eleves", { p_q: q.trim() });
  if (error) throw error;
  return data ?? [];
}

const TYPES_MIME: Record<string, string> = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  ogg: "audio/ogg",
  opus: "audio/ogg",
  mp4: "video/mp4",
  mov: "video/quicktime",
  aac: "audio/aac",
  webm: "audio/webm",
};
export const EXTENSIONS_APPEL = Object.keys(TYPES_MIME);
export const TAILLE_MAX_APPEL = 500 * 1024 * 1024;

export function extension(nom: string): string {
  return (nom.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "").replace("mpeg", "mp3");
}

/**
 * Crée l'appel et envoie le fichier par morceaux (reprise automatique si la connexion coupe,
 * utile depuis un téléphone). Renvoie l'identifiant de l'appel ; l'analyse se lance ensuite
 * avec demarrerAppel (séparé : si le lancement échoue, l'appel reste relançable).
 */
export async function envoyerAppel(
  p: { fichier: File; eleveId: string; typeAppel: string; prospectInforme: boolean },
  onProgres: (pourcent: number) => void,
): Promise<string> {
  const { data: session } = await supabase.auth.getSession();
  const jeton = session.session?.access_token;
  const uid = session.session?.user.id;
  if (!jeton || !uid) throw new Error("Session expirée, reconnecte-toi.");
  const ext = extension(p.fichier.name);
  if (!TYPES_MIME[ext]) throw new Error("Format non pris en charge : MP3, M4A, WAV, OGG (WhatsApp), MP4 ou MOV.");
  if (p.fichier.size > TAILLE_MAX_APPEL) throw new Error("Le fichier dépasse 500 Mo.");
  const id = crypto.randomUUID();
  const chemin = `${id}/source.${ext}`;
  const { error } = await db.from("appels_analyses").insert({
    id,
    coach_id: uid,
    eleve_id: p.eleveId,
    type_appel: p.typeAppel,
    fichier_path: chemin,
    fichier_nom: p.fichier.name.slice(0, 200),
    prospect_informe: p.prospectInforme,
  });
  if (error) throw error;

  const projet = new URL(import.meta.env.VITE_SUPABASE_URL as string).hostname.split(".")[0];
  await new Promise<void>((ok, ko) => {
    const envoi = new tus.Upload(p.fichier, {
      endpoint: `https://${projet}.storage.supabase.co/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: { authorization: `Bearer ${jeton}`, "x-upsert": "true" },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: { bucketName: BUCKET_APPELS, objectName: chemin, contentType: TYPES_MIME[ext], cacheControl: "3600" },
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

/** Lance (ou relance) l'analyse, ou la refait après inversion des voix. */
export async function demarrerAppel(id: string, action: "lancer" | "inverser_voix") {
  const { data: session } = await supabase.auth.getSession();
  const rep = await fetch("/api/appels/demarrer", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.session?.access_token ?? ""}` },
    body: JSON.stringify({ appel_id: id, action }),
  });
  const corps = await rep.json().catch(() => ({}));
  if (!rep.ok) throw new Error(corps.error ?? `Erreur ${rep.status}`);
}

export async function enregistrerCorrections(id: string, analyse: Analyse, nbCorrections: number) {
  const { error } = await db.rpc("appel_enregistrer", {
    p_id: id,
    p_analyse: analyse,
    p_note: analyse.note_globale,
    p_nb_corrections: nbCorrections,
  });
  if (error) throw error;
}

export async function validerAppel(id: string, analyse: Analyse, nbCorrections: number, exemple: boolean) {
  const { error } = await db.rpc("appel_valider", {
    p_id: id,
    p_analyse: analyse,
    p_note: analyse.note_globale,
    p_nb_corrections: nbCorrections,
    p_exemple: exemple,
  });
  if (error) throw error;
}

export async function rouvrirAppel(id: string) {
  const { error } = await db.rpc("appel_rouvrir", { p_id: id });
  if (error) throw error;
}
