import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Wand2,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Lock,
  RotateCcw,
  Sparkles,
  Film,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import {
  useGenerateBroll,
  useStudioSignedUrl,
} from "../hooks/useStudioProjects";
import type { StudioProject, StudioSegment } from "../types";

interface Props {
  project: StudioProject;
  /** "locked" si segments pas prêts · "active" si transcribed · "done" si tous les b-rolls générés */
  variant: "locked" | "active" | "done";
}

export default function BrollStep({ project, variant }: Props) {
  const generateMutation = useGenerateBroll();
  const [generatingIds, setGeneratingIds] = useState<Set<number>>(new Set());

  const segments = (project.segments_json ?? []) as StudioSegment[];
  const segmentsWithBroll = segments.filter((s) => !!s.broll_path);
  const segmentsWithoutBroll = segments.filter((s) => !s.broll_path);

  const generateOne = async (segmentIdx: number) => {
    if (generatingIds.has(segmentIdx)) return;
    setGeneratingIds((prev) => new Set(prev).add(segmentIdx));
    try {
      const res = await generateMutation.mutateAsync({
        projectId: project.id,
        segmentIdx,
      });
      if (res.all_ready) {
        toast.success(
          `Tous les b-rolls sont prêts ✦ Direction l'étape 5 (rendu final)`,
          { duration: 4000 },
        );
      }
    } catch (e: any) {
      toast.error(
        `Segment ${segmentIdx + 1} : ${e?.message ?? "génération échouée"}`,
        { duration: 8000 },
      );
    } finally {
      setGeneratingIds((prev) => {
        const next = new Set(prev);
        next.delete(segmentIdx);
        return next;
      });
    }
  };

  const generateAll = async () => {
    if (segmentsWithoutBroll.length === 0) return;
    const ok = confirm(
      `Générer ${segmentsWithoutBroll.length} b-rolls IA en parallèle ?\n\nCoût estimé : ~${(segmentsWithoutBroll.length * 0.05).toFixed(2)}$ (Seedance 720p 5s).\nDurée : 30-90 secondes par segment, en parallèle.`,
    );
    if (!ok) return;
    // Parallèle pour gagner du temps. Les setStates sont déjà gérés dans generateOne.
    await Promise.allSettled(
      segmentsWithoutBroll.map((s) => generateOne(s.idx)),
    );
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
              <p className="text-sm font-medium text-foreground">4. B-rolls IA</p>
              <span className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                B4
              </span>
              <span className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                Verrouillé
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Lance la transcription (étape 3) avant de générer les b-rolls.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─── ACTIVE / DONE ─────────────────────────────────────────────────
  // Pas de différence visuelle majeure : on affiche toujours la grille
  // de segments, "done" ajoute juste un badge ✓ Terminé en haut.
  const allReady = segments.length > 0 && segmentsWithoutBroll.length === 0;

  return (
    <Card
      className={
        allReady
          ? "border-emerald-500/30 bg-emerald-500/[0.03]"
          : "border-primary/40 bg-primary/[0.03]"
      }
    >
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div
            className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
              allReady
                ? "bg-emerald-500/15 text-emerald-500"
                : "bg-primary/15 text-primary"
            }`}
          >
            {allReady ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-foreground">4. B-rolls IA</p>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  allReady
                    ? "bg-emerald-500/15 text-emerald-500"
                    : "bg-primary/15 text-primary"
                }`}
              >
                {allReady
                  ? "✓ Terminé"
                  : `${segmentsWithBroll.length}/${segments.length}`}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {allReady
                ? "Tous les clips sont générés. Tu peux régénérer un segment si tu n'aimes pas le rendu."
                : "L'IA génère un clip vidéo 9:16 par segment (Claude écrit le prompt visuel, Seedance produit la vidéo). ~30-90s par clip."}
            </p>
          </div>
          {!allReady && segmentsWithoutBroll.length > 0 && (
            <Button
              onClick={generateAll}
              disabled={generatingIds.size > 0}
              size="sm"
              className="gap-1.5 shrink-0"
            >
              {generatingIds.size > 0 ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">Tout générer</span>
              <span className="sm:hidden">Tout</span>
            </Button>
          )}
        </div>

        {/* Coût total estimé */}
        {!allReady && segmentsWithoutBroll.length > 0 && (
          <div className="rounded-md bg-primary/[0.05] border border-primary/20 px-3 py-2 text-xs text-muted-foreground flex items-start gap-2">
            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
            <span>
              Coût estimé pour {segmentsWithoutBroll.length} clip(s) restants :{" "}
              <strong className="text-foreground">
                ~{(segmentsWithoutBroll.length * 0.05).toFixed(2)}$
              </strong>{" "}
              (Seedance 720p 5s). Tu peux générer segment par segment ou tout d'un coup.
            </span>
          </div>
        )}

        {/* Grille des segments */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {segments.map((seg) => (
            <SegmentCard
              key={seg.idx}
              segment={seg}
              isGenerating={generatingIds.has(seg.idx)}
              onGenerate={() => generateOne(seg.idx)}
            />
          ))}
        </div>

        {allReady && (
          <p className="text-[11px] text-muted-foreground/80 leading-relaxed border-t border-emerald-500/20 pt-2">
            💡 La prochaine étape (B5) assemblera ces b-rolls avec ta voix-off et les sous-titres en un MP4 9:16 final.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Card par segment ────────────────────────────────────────────────
function SegmentCard({
  segment,
  isGenerating,
  onGenerate,
}: {
  segment: StudioSegment;
  isGenerating: boolean;
  onGenerate: () => void;
}) {
  const hasBroll = !!segment.broll_path;
  const signedUrlQuery = useStudioSignedUrl(hasBroll ? segment.broll_path : null);

  return (
    <div
      className={`rounded-lg border overflow-hidden ${
        hasBroll
          ? "border-emerald-500/30 bg-background/40"
          : isGenerating
          ? "border-primary/40 bg-primary/[0.04]"
          : "border-border bg-background/40"
      }`}
    >
      {/* Video preview ou placeholder 9:16 */}
      <div className="relative aspect-[9/16] bg-gradient-to-br from-muted to-background flex items-center justify-center">
        {hasBroll && signedUrlQuery.data ? (
          <video
            src={signedUrlQuery.data}
            controls
            className="w-full h-full object-cover"
            preload="metadata"
          />
        ) : isGenerating ? (
          <div className="flex flex-col items-center gap-2 text-primary">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-[10px] uppercase tracking-wider">Génération…</p>
            <p className="text-[9px] text-muted-foreground">30-90s</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground/60">
            <Film className="h-8 w-8" />
            <p className="text-[10px] uppercase tracking-wider">Pas encore généré</p>
          </div>
        )}
        {/* Badge segment idx */}
        <div className="absolute top-2 left-2 h-6 w-6 rounded-full bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center text-[11px] font-mono font-semibold">
          {segment.idx + 1}
        </div>
      </div>

      {/* Footer : texte + action */}
      <div className="p-2.5 space-y-2">
        <p className="text-xs text-foreground/90 leading-snug line-clamp-2">
          {segment.text}
        </p>

        {hasBroll && segment.broll_prompt && (
          <details className="text-[10px]">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              Voir le prompt visuel
            </summary>
            <p className="mt-1 px-2 py-1.5 rounded bg-muted/40 text-muted-foreground italic">
              {segment.broll_prompt}
            </p>
          </details>
        )}

        <Button
          variant={hasBroll ? "outline" : "default"}
          size="sm"
          onClick={onGenerate}
          disabled={isGenerating}
          className="w-full gap-1.5 text-xs h-7"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Génération…
            </>
          ) : hasBroll ? (
            <>
              <RotateCcw className="h-3 w-3" />
              Régénérer
            </>
          ) : (
            <>
              <Sparkles className="h-3 w-3" />
              Générer ce clip
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
