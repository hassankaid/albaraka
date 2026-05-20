import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sparkles,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Lock,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Play,
  Pause,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import {
  useTriggerTranscription,
  useUpdateStudioProject,
  useStudioSignedUrl,
} from "../hooks/useStudioProjects";
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

  const handleTranscribe = async () => {
    try {
      const result = await transcribeMutation.mutateAsync(project.id);
      toast.success(
        `Transcription OK · ${result.nb_segments} segments générés ✦`,
      );
    } catch (e: any) {
      toast.error(e?.message ?? "Transcription échouée", { duration: 8000 });
    }
  };

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
      <SegmentsEditor
        project={project}
        onRetry={handleTranscribe}
        retrying={transcribeMutation.isPending}
      />
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
                : "Whisper (OpenAI) va écouter ta voix-off et générer des sous-titres timestampés. Tu pourras les éditer après. Coût ~0.01€ par minute."}
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
          corriger chaque phrase avant la génération des b-rolls (étape 4).
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Éditeur de segments avec audio playback ─────────────────────────
function SegmentsEditor({
  project,
  onRetry,
  retrying,
}: {
  project: StudioProject;
  onRetry: () => void;
  retrying: boolean;
}) {
  const updateMutation = useUpdateStudioProject();
  const signedUrlQuery = useStudioSignedUrl(project.audio_path);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const initialSegments = (project.segments_json ?? []) as StudioSegment[];
  const [localSegments, setLocalSegments] =
    useState<StudioSegment[]>(initialSegments);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("saved");
  const [expanded, setExpanded] = useState(true);
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);

  const lastSavedRef = useRef(JSON.stringify(initialSegments));
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Synchronise quand le projet est rechargé (re-transcription, retry, etc.)
  useEffect(() => {
    const incoming = (project.segments_json ?? []) as StudioSegment[];
    const incomingStr = JSON.stringify(incoming);
    if (incomingStr !== lastSavedRef.current) {
      setLocalSegments(incoming);
      lastSavedRef.current = incomingStr;
      setSaveState("saved");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(project.segments_json)]);

  // Auto-save debounced 1.5s
  useEffect(() => {
    const currentStr = JSON.stringify(localSegments);
    if (currentStr === lastSavedRef.current) return;

    setSaveState("saving");
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        await updateMutation.mutateAsync({
          id: project.id,
          updates: { segments_json: localSegments } as any,
        });
        lastSavedRef.current = currentStr;
        setSaveState("saved");
      } catch (e: any) {
        setSaveState("idle");
        toast.error(e?.message ?? "Sauvegarde échouée");
      }
    }, 1500);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSegments, project.id]);

  const handleSegmentEdit = (idx: number, newText: string) => {
    setLocalSegments((prev) =>
      prev.map((s) => (s.idx === idx ? { ...s, text: newText } : s)),
    );
  };

  const handlePlaySegment = (seg: StudioSegment) => {
    if (!audioRef.current || !signedUrlQuery.data) return;
    const audio = audioRef.current;

    // Si on rejoue le même segment → pause
    if (playingIdx === seg.idx && !audio.paused) {
      audio.pause();
      setPlayingIdx(null);
      return;
    }

    audio.currentTime = seg.start_ms / 1000;
    audio
      .play()
      .then(() => setPlayingIdx(seg.idx))
      .catch(() => setPlayingIdx(null));

    // Stop auto à la fin du segment
    const stopAtEnd = () => {
      if (audio.currentTime >= seg.end_ms / 1000) {
        audio.pause();
        setPlayingIdx(null);
        audio.removeEventListener("timeupdate", stopAtEnd);
      }
    };
    audio.addEventListener("timeupdate", stopAtEnd);
  };

  const totalDurationMs =
    localSegments.length > 0
      ? localSegments[localSegments.length - 1].end_ms
      : 0;
  const transcriptLang = project.transcript_json?.language ?? "fr";

  return (
    <Card className="border-emerald-500/30 bg-emerald-500/[0.03]">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
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
              <SaveIndicator state={saveState} />
            </div>
            <p className="text-xs text-muted-foreground">
              {localSegments.length} segments · {formatDuration(totalDurationMs)} ·
              langue : <span className="uppercase font-mono">{transcriptLang}</span>
              {" · "}
              <button
                onClick={() => setExpanded((e) => !e)}
                className="text-primary hover:underline inline-flex items-center gap-0.5"
              >
                {expanded ? "réduire" : "afficher"}
                {expanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </button>
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={onRetry}
            disabled={retrying}
            className="text-xs text-muted-foreground hover:text-foreground gap-1"
            title="Re-générer la transcription (écrase tes éditions)"
          >
            {retrying ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">Re-générer</span>
          </Button>
        </div>

        {/* Audio element invisible — controlé par les boutons Play par segment */}
        {signedUrlQuery.data && (
          <audio
            ref={audioRef}
            src={signedUrlQuery.data}
            preload="metadata"
            onEnded={() => setPlayingIdx(null)}
            onPause={() => setPlayingIdx(null)}
            className="hidden"
          />
        )}

        {/* Liste éditable des segments */}
        {expanded && (
          <div className="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
            {localSegments.map((seg) => (
              <SegmentRow
                key={seg.idx}
                segment={seg}
                isPlaying={playingIdx === seg.idx}
                canPlay={!!signedUrlQuery.data}
                onPlay={() => handlePlaySegment(seg)}
                onEdit={(text) => handleSegmentEdit(seg.idx, text)}
              />
            ))}
          </div>
        )}

        {/* Tip */}
        <p className="text-[11px] text-muted-foreground/80 leading-relaxed border-t border-emerald-500/20 pt-2">
          💡 Édite chaque phrase pour corriger les coquilles ou affiner la formulation. Auto-sauvegardé. Clique sur <Play className="inline h-2.5 w-2.5" /> pour réécouter le segment correspondant.
        </p>
      </CardContent>
    </Card>
  );
}

function SegmentRow({
  segment,
  isPlaying,
  canPlay,
  onPlay,
  onEdit,
}: {
  segment: StudioSegment;
  isPlaying: boolean;
  canPlay: boolean;
  onPlay: () => void;
  onEdit: (text: string) => void;
}) {
  return (
    <div className="rounded-md border border-border/60 bg-background/40 p-2.5 flex items-start gap-2 text-xs hover:border-primary/30 transition-colors">
      {/* Bouton Play */}
      <button
        onClick={onPlay}
        disabled={!canPlay}
        className={`shrink-0 mt-0.5 h-7 w-7 rounded-full flex items-center justify-center transition-colors ${
          isPlaying
            ? "bg-primary text-primary-foreground"
            : canPlay
            ? "bg-muted hover:bg-primary/15 hover:text-primary text-muted-foreground"
            : "bg-muted/50 text-muted-foreground/40 cursor-not-allowed"
        }`}
        title={canPlay ? "Écouter ce segment" : "Audio en cours de chargement…"}
      >
        {isPlaying ? (
          <Pause className="h-3 w-3" />
        ) : (
          <Play className="h-3 w-3 translate-x-[1px]" />
        )}
      </button>

      {/* Timestamps */}
      <div className="shrink-0 text-[10px] font-mono text-muted-foreground/80 leading-snug w-20 pt-1.5">
        <div>{formatMs(segment.start_ms)}</div>
        <div className="text-muted-foreground/60">
          → {formatMs(segment.end_ms)}
        </div>
      </div>

      {/* Textarea éditable */}
      <Textarea
        value={segment.text}
        onChange={(e) => onEdit(e.target.value)}
        rows={Math.max(1, Math.ceil(segment.text.length / 80))}
        className="flex-1 min-h-0 text-xs leading-relaxed resize-none border-transparent bg-transparent focus-visible:bg-background focus-visible:border-primary/30 px-2 py-1.5"
        placeholder="Phrase vide"
      />
    </div>
  );
}

function SaveIndicator({ state }: { state: "idle" | "saving" | "saved" }) {
  if (state === "saving") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
        <Loader2 className="h-2.5 w-2.5 animate-spin" /> Sauvegarde…
      </span>
    );
  }
  if (state === "saved") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-500">
        <CheckCircle2 className="h-2.5 w-2.5" /> Sauvegardé
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/60">
      <Clock className="h-2.5 w-2.5" /> Non sauvegardé
    </span>
  );
}
