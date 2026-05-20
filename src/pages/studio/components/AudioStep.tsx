import { useCallback, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Mic,
  Upload,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Trash2,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  useUpdateStudioProject,
  useStudioSignedUrl,
} from "../hooks/useStudioProjects";
import type { StudioProject } from "../types";

interface Props {
  project: StudioProject;
  /** "locked" si le script n'est pas prêt · "active" si on attend l'audio · "done" si audio uploadé */
  variant: "locked" | "active" | "done";
}

// Contraintes côté front. RLS storage policies enforcent côté back.
const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
const MIN_DURATION_S = 5;
const MAX_DURATION_S = 5 * 60; // 5 min
const ACCEPTED_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/webm",
  "audio/ogg",
];
const ACCEPTED_EXTENSIONS = [".mp3", ".m4a", ".wav", ".webm", ".ogg"];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Lit la durée d'un fichier audio côté navigateur via HTMLAudioElement.
 * Si le décodage échoue, retourne null (on garde le fichier mais sans valider la durée).
 */
async function probeAudioDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    const cleanup = () => URL.revokeObjectURL(url);
    audio.addEventListener(
      "loadedmetadata",
      () => {
        const d = audio.duration;
        cleanup();
        resolve(Number.isFinite(d) ? d : null);
      },
      { once: true },
    );
    audio.addEventListener(
      "error",
      () => {
        cleanup();
        resolve(null);
      },
      { once: true },
    );
    audio.src = url;
  });
}

function getExtension(file: File): string {
  const dot = file.name.lastIndexOf(".");
  if (dot < 0) return "";
  return file.name.slice(dot).toLowerCase();
}

function isAcceptableFile(file: File): boolean {
  if (ACCEPTED_TYPES.includes(file.type)) return true;
  // Certains navigateurs renvoient un type vide pour .m4a — on fallback sur l'ext.
  return ACCEPTED_EXTENSIONS.includes(getExtension(file));
}

export default function AudioStep({ project, variant }: Props) {
  const updateMutation = useUpdateStudioProject();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const signedUrlQuery = useStudioSignedUrl(
    variant === "done" || (variant === "active" && project.audio_path)
      ? project.audio_path
      : null,
  );

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      // ─── Validations côté client ──────────────────────────────────
      if (!isAcceptableFile(file)) {
        setError(
          `Format non supporté. Formats acceptés : ${ACCEPTED_EXTENSIONS.join(", ")}`,
        );
        return;
      }
      if (file.size > MAX_SIZE_BYTES) {
        setError(
          `Fichier trop lourd (${formatSize(file.size)}). Max 50 MB.`,
        );
        return;
      }

      const duration = await probeAudioDuration(file);
      if (duration !== null) {
        if (duration < MIN_DURATION_S) {
          setError(
            `Audio trop court (${formatDuration(duration)}). Minimum 5 secondes.`,
          );
          return;
        }
        if (duration > MAX_DURATION_S) {
          setError(
            `Audio trop long (${formatDuration(duration)}). Maximum 5 minutes pour cette V1.`,
          );
          return;
        }
      }

      // ─── Upload Supabase Storage ─────────────────────────────────
      setUploading(true);
      setUploadProgress(10); // visuel pour montrer qu'on a démarré

      try {
        // Path : <user_id>/projects/<project_id>/voice.<ext>
        // RLS storage policy enforce que (storage.foldername(name))[1] = auth.uid()
        const ext = getExtension(file) || ".mp3";
        const path = `${project.user_id}/projects/${project.id}/voice${ext}`;

        // Supabase JS n'a pas de hook native progress — on simule un palier
        // de 50% au début, puis 100% à la fin.
        const progressTimer = setTimeout(() => setUploadProgress(50), 300);

        const { error: upErr } = await supabase.storage
          .from("studio")
          .upload(path, file, {
            cacheControl: "3600",
            upsert: true,
            contentType: file.type || "audio/mpeg",
          });

        clearTimeout(progressTimer);

        if (upErr) throw upErr;

        setUploadProgress(80);

        await updateMutation.mutateAsync({
          id: project.id,
          updates: {
            audio_path: path,
            audio_duration_seconds: duration ?? null,
            status: "audio_uploaded",
          },
        });

        setUploadProgress(100);
        toast.success("Voix-off uploadée ✦");
      } catch (e: any) {
        console.error("[studio] audio upload failed", e);
        setError(e?.message ?? "Upload échoué. Réessaie dans un instant.");
      } finally {
        setUploading(false);
        // Petit délai avant de reset la barre pour qu'on voie le 100%
        setTimeout(() => setUploadProgress(0), 600);
      }
    },
    [project.id, project.user_id, updateMutation],
  );

  const onPickFile = () => fileInputRef.current?.click();

  const onInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await handleFile(file);
    // reset l'input pour permettre de re-uploader le même fichier
    e.target.value = "";
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await handleFile(file);
  };

  const handleRemoveAudio = async () => {
    if (!project.audio_path) return;
    if (!confirm("Supprimer l'audio uploadé ?")) return;
    try {
      await supabase.storage.from("studio").remove([project.audio_path]);
      await updateMutation.mutateAsync({
        id: project.id,
        updates: {
          audio_path: null,
          audio_duration_seconds: null,
          status: "draft",
        },
      });
      toast.success("Audio supprimé");
    } catch (e: any) {
      toast.error(e?.message ?? "Suppression échouée");
    }
  };

  // ─── MODE LOCKED (script pas prêt) ─────────────────────────────────
  if (variant === "locked") {
    return (
      <Card className="border-border opacity-60">
        <CardContent className="p-4 flex items-start gap-3">
          <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-foreground">2. Voix-off</p>
              <span className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                Verrouillé
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Écris d'abord ton script (étape 1) avant d'uploader ta voix-off.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─── MODE DONE (audio uploadé) ─────────────────────────────────────
  if (variant === "done") {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/[0.03]">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-foreground">2. Voix-off</p>
                <span className="text-[10px] font-mono bg-emerald-500/15 text-emerald-500 px-1.5 py-0.5 rounded">
                  ✓ Uploadée
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {project.audio_duration_seconds
                  ? `Durée ${formatDuration(project.audio_duration_seconds)}`
                  : "Durée non détectée"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemoveAudio}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          {signedUrlQuery.data ? (
            <audio
              src={signedUrlQuery.data}
              controls
              className="w-full"
              preload="metadata"
            />
          ) : signedUrlQuery.isLoading ? (
            <div className="h-10 rounded bg-muted/40 animate-pulse" />
          ) : null}
        </CardContent>
      </Card>
    );
  }

  // ─── MODE ACTIVE (en attente d'upload) ─────────────────────────────
  return (
    <Card className="border-primary/40 bg-primary/[0.03]">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <Mic className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0 space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-foreground">2. Voix-off</p>
              <span className="text-[10px] font-mono bg-primary/15 text-primary px-1.5 py-0.5 rounded">
                Étape 2
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Uploade ton enregistrement audio de la voix-off (MP3, M4A, WAV, OGG, WebM). Max 50 MB, 5 secondes à 5 minutes.
            </p>
          </div>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={uploading ? undefined : onPickFile}
          role="button"
          tabIndex={0}
          className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors cursor-pointer ${
            dragOver
              ? "border-primary bg-primary/10"
              : "border-border hover:border-primary/50 hover:bg-primary/[0.04]"
          } ${uploading ? "pointer-events-none opacity-60" : ""}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS.join(",")}
            onChange={onInputChange}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-2">
            {uploading ? (
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            ) : (
              <Upload className="h-8 w-8 text-primary" />
            )}
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-foreground">
                {uploading
                  ? "Upload en cours…"
                  : "Glisse-dépose ton audio ici"}
              </p>
              <p className="text-xs text-muted-foreground">
                {uploading
                  ? "Ne ferme pas cette page"
                  : "ou clique pour sélectionner un fichier"}
              </p>
            </div>
          </div>

          {uploading && uploadProgress > 0 && (
            <Progress value={uploadProgress} className="mt-4 h-1.5" />
          )}
        </div>

        {error && (
          <div className="rounded-md bg-destructive/[0.08] border border-destructive/40 px-3 py-2 text-xs text-destructive flex items-start gap-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
          💡 Lis ton script avec un débit naturel, dans un endroit calme. Pas besoin d'un studio — un téléphone proche de la bouche suffit. Tu peux ré-uploader autant de fois que tu veux jusqu'à validation.
        </p>
      </CardContent>
    </Card>
  );
}
