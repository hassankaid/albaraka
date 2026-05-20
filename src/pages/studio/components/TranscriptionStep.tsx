import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Lock,
  RotateCcw,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { useTriggerTranscription } from "../hooks/useStudioProjects";
import type { StudioProject, StudioSegment } from "../types";

interface Props {
  project: StudioProject;
  /** "locked" si audio pas uploadé · "active" si audio_uploaded · "done" si segments existants */
  variant: "locked" | "active" | "done";
}

function formatMs(ms: number): string {
  const totalSec = ms / 1000;
  const m = Math.floor(totalSec / 60);
  const s = totalSec - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, "0")}`;
}

function formatDuration(ms: number): string {
  const sec = ms / 1000;
  return `${sec.toFixed(1)}s`;
}

export default function TranscriptionStep({ project, variant }: Props) {
  const transcribeMutation = useTriggerTranscription();
  const [expanded, setExpanded] = useState(false);

  const handleTranscribe = async () => {
    try {
      const result = await transcribeMutation.mutateAsync(project.id);
      toast.success(
        `Transcription OK · ${result.nb_segments} segments générés ✦`,
      );
    } catch (e: any) {
      // Erreurs courantes : clé OpenAI manquante, audio corrompu, quotas
      toast.error(e?.message ?? "Transcription échouée", { duration: 8000 });
    }
  };

  const segments = (project.segments_json ?? []) as StudioSegment[];
  const transcriptText = project.transcript_json?.text ?? "";
  const transcriptLang = project.transcript_json?.language ?? "fr";
  const totalDurationMs =
    segments.length > 0 ? segments[segments.length - 1].end_ms : 0;

  // ─── LOCKED ────────────────────────────────────────────────────────
  if (variant === "locked") {
    return (
      <Card className="border-border opacity-60">
        <CardContent className="p-4 flex items-start gap-3">
          <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-foreground">3. Sous-titres</p>
              <span className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                B3
              </span>
              <span className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                Verrouillé
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Uploade ta voix-off (étape 2) pour débloquer la transcription Whisper.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─── DONE ──────────────────────────────────────────────────────────
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
                <p className="text-sm font-medium text-foreground">
                  3. Sous-titres
                </p>
                <span className="text-[10px] font-mono bg-emerald-500/15 text-emerald-500 px-1.5 py-0.5 rounded">
                  ✓ Transcrit
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {segments.length} segments · {formatDuration(totalDurationMs)} ·
                langue : <span className="uppercase font-mono">{transcriptLang}</span>
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleTranscribe}
              disabled={transcribeMutation.isPending}
              className="text-xs text-muted-foreground hover:text-foreground"
              title="Re-générer la transcription (écrase l'actuelle)"
            >
              {transcribeMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>

          {/* Toggle expand */}
          <button
            onClick={() => setExpanded((e) => !e)}
            className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          >
            <span>
              {expanded ? "Masquer" : "Voir"} les segments timestampés
            </span>
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>

          {expanded && (
            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {segments.map((seg) => (
                <div
                  key={seg.idx}
                  className="rounded-md border border-border/60 bg-background/40 p-2.5 flex items-start gap-2 text-xs"
                >
                  <div className="shrink-0 text-[10px] font-mono text-muted-foreground/80 leading-snug w-20">
                    <div>{formatMs(seg.start_ms)}</div>
                    <div className="text-muted-foreground/60">
                      → {formatMs(seg.end_ms)}
                    </div>
                  </div>
                  <p className="flex-1 text-foreground/90 leading-relaxed">
                    {seg.text}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Bandeau anecdotique : texte complet en details */}
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              Voir le texte complet (pour vérif)
            </summary>
            <p className="mt-2 p-3 rounded-md bg-muted/30 text-foreground/80 leading-relaxed whitespace-pre-wrap">
              {transcriptText}
            </p>
          </details>
        </CardContent>
      </Card>
    );
  }

  // ─── ACTIVE ────────────────────────────────────────────────────────
  const isFailed = project.status === "failed";
  return (
    <Card
      className={
        isFailed
          ? "border-destructive/40 bg-destructive/[0.04]"
          : "border-primary/40 bg-primary/[0.03]"
      }
    >
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div
            className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
              isFailed
                ? "bg-destructive/15 text-destructive"
                : "bg-primary/15 text-primary"
            }`}
          >
            {isFailed ? (
              <AlertTriangle className="h-4 w-4" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
          </div>
          <div className="flex-1 min-w-0 space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-foreground">
                3. Sous-titres
              </p>
              <span className="text-[10px] font-mono bg-primary/15 text-primary px-1.5 py-0.5 rounded">
                Étape 3
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isFailed
                ? "La transcription précédente a échoué — relance pour réessayer."
                : "Whisper (OpenAI) va écouter ta voix-off et générer des sous-titres timestampés mot par mot. Coût ~0.01€ par minute."}
            </p>
          </div>
        </div>

        {isFailed && project.error_message && (
          <div className="rounded-md bg-destructive/[0.08] border border-destructive/40 px-3 py-2 text-xs text-destructive flex items-start gap-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span className="break-all">{project.error_message}</span>
          </div>
        )}

        <Button
          onClick={handleTranscribe}
          disabled={transcribeMutation.isPending}
          className="gap-2"
        >
          {transcribeMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Whisper transcrit ton audio…
            </>
          ) : isFailed ? (
            <>
              <RotateCcw className="h-4 w-4" />
              Réessayer la transcription
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Lancer la transcription
            </>
          )}
        </Button>

        <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
          💡 Compte ~5 à 15 secondes pour un audio de 30 secondes. Tu pourras
          ajuster les segments avant la génération des b-rolls (étape 4).
        </p>
      </CardContent>
    </Card>
  );
}
