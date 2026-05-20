import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  ClipboardList,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  useGenerateBroll,
  useGenerateBrollMultishot,
  usePlanBrolls,
  useStudioSignedUrl,
} from "../hooks/useStudioProjects";
import type { StudioProject, StudioSegment } from "../types";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  project: StudioProject;
  variant: "locked" | "active" | "done";
}

// B4 v7 — Groupage des segments pour multi-shot Kling 3.0
// Contraintes : max 6 shots par appel, max 15s par appel, durations ≥ 3s
const MAX_SEGMENTS_PER_GROUP = 3; // 3 × 5s = 15s, safe pour Kling 15s max

function groupSegmentsForMultishot(segments: StudioSegment[]): number[][] {
  const groups: number[][] = [];
  let current: number[] = [];
  for (const seg of segments) {
    current.push(seg.idx);
    if (current.length >= MAX_SEGMENTS_PER_GROUP) {
      groups.push(current);
      current = [];
    }
  }
  if (current.length > 0) groups.push(current);
  return groups;
}

export default function BrollStep({ project, variant }: Props) {
  const generateMutation = useGenerateBroll();
  const generateMultishotMutation = useGenerateBrollMultishot();
  const planMutation = usePlanBrolls();
  const [generatingIds, setGeneratingIds] = useState<Set<number>>(new Set());

  const segments = (project.segments_json ?? []) as StudioSegment[];
  const segmentsWithBroll = segments.filter((s) => !!s.broll_path);
  const segmentsWithoutBroll = segments.filter((s) => !s.broll_path);
  const allPlanned = segments.length > 0 && segments.every((s) => !!s.broll_prompt);
  const allReady = segments.length > 0 && segmentsWithoutBroll.length === 0;

  const handlePlan = async () => {
    try {
      const res = await planMutation.mutateAsync(project.id);
      toast.success(
        `${res.nb_segments} prompts planifiés — édite-les si besoin avant génération`,
        { duration: 4000 },
      );
    } catch (e: any) {
      toast.error(e?.message ?? "Planification échouée", { duration: 8000 });
    }
  };

  const generateOne = async (segmentIdx: number) => {
    if (generatingIds.has(segmentIdx)) return;
    setGeneratingIds((prev) => new Set(prev).add(segmentIdx));
    try {
      const res = await generateMutation.mutateAsync({
        projectId: project.id,
        segmentIdx,
      });
      if (res.all_ready) {
        toast.success(`Tous les b-rolls sont prêts ✦`, { duration: 4000 });
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
    if (!allPlanned) {
      toast.error(
        "Lance d'abord 'Planifier' pour générer des prompts cohérents avant l'IA vidéo",
        { duration: 6000 },
      );
      return;
    }

    // B4 v7 — groupage par 3 segments max pour multi-shot Kling natif
    const groups = groupSegmentsForMultishot(segmentsWithoutBroll);
    const totalSegments = segmentsWithoutBroll.length;
    const ok = confirm(
      `Générer ${totalSegments} b-rolls en ${groups.length} appel(s) multi-shot Kling 3.0 Pro ?\n\n` +
        `→ ${groups.length} appel(s) au lieu de ${totalSegments} → cohérence visuelle native entre les shots du même groupe\n` +
        `→ Coût estimé : ~${(groups.length * 1.26).toFixed(2)}$ (Kling 3.0 Pro 1080p, 15s × ${groups.length} groupes)\n` +
        `→ Durée : ~60-120s par groupe en parallèle`,
    );
    if (!ok) return;

    // Marque tous les segments du groupe comme "en génération" pendant l'appel
    const setIdsForGroup = (groupIdx: number[], add: boolean) => {
      setGeneratingIds((prev) => {
        const next = new Set(prev);
        for (const idx of groupIdx) {
          if (add) next.add(idx);
          else next.delete(idx);
        }
        return next;
      });
    };

    const groupPromises = groups.map(async (groupIdx) => {
      setIdsForGroup(groupIdx, true);
      try {
        const res = await generateMultishotMutation.mutateAsync({
          projectId: project.id,
          segmentIndices: groupIdx,
        });
        if (res.all_ready) {
          toast.success("Tous les b-rolls sont prêts ✦", { duration: 4000 });
        }
      } catch (e: any) {
        toast.error(
          `Groupe [${groupIdx.join(", ")}] : ${e?.message ?? "génération échouée"}`,
          { duration: 8000 },
        );
      } finally {
        setIdsForGroup(groupIdx, false);
      }
    });

    await Promise.allSettled(groupPromises);
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

  return (
    <div className="space-y-3">
      {/* ─── Card principale b-rolls ────────────────────────────── */}
      <Card
        className={
          allReady
            ? "border-emerald-500/30 bg-emerald-500/[0.03]"
            : "border-primary/40 bg-primary/[0.03]"
        }
      >
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div
              className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
                allReady
                  ? "bg-emerald-500/15 text-emerald-500"
                  : "bg-primary/15 text-primary"
              }`}
            >
              {allReady ? <CheckCircle2 className="h-4 w-4" /> : <Wand2 className="h-4 w-4" />}
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
                  {allReady ? "✓ Terminé" : `${segmentsWithBroll.length}/${segments.length}`}
                </span>
                {allPlanned && !allReady && (
                  <span className="text-[10px] font-mono bg-primary/15 text-primary px-1.5 py-0.5 rounded">
                    📋 Plan prêt
                  </span>
                )}
                <span className="text-[10px] font-mono bg-primary/10 text-primary/80 px-1.5 py-0.5 rounded">
                  Kling 3.0 multi-shot
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {allReady
                  ? "Tous les clips générés. Tu peux régénérer un segment si tu n'aimes pas le rendu."
                  : allPlanned
                  ? "Plan visuel cohérent généré. Édite les prompts ci-dessous si besoin avant de lancer la génération."
                  : "Étape 1 : clique 'Planifier' pour qu'une IA conçoive un plan visuel cohérent (même personnage, même style). Étape 2 : édite les prompts si besoin. Étape 3 : 'Tout générer'."}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              {!allReady && !allPlanned && (
                <Button
                  onClick={handlePlan}
                  disabled={planMutation.isPending}
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                >
                  {planMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ClipboardList className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">Planifier</span>
                </Button>
              )}
              {allPlanned && !allReady && (
                <Button
                  onClick={handlePlan}
                  disabled={planMutation.isPending}
                  size="sm"
                  variant="ghost"
                  className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  title="Refaire la planification (écrase les prompts actuels)"
                >
                  {planMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">Re-planifier</span>
                </Button>
              )}
              {!allReady && segmentsWithoutBroll.length > 0 && (
                <Button
                  onClick={generateAll}
                  disabled={generatingIds.size > 0 || planMutation.isPending}
                  size="sm"
                  className="gap-1.5"
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
          </div>

          {/* Bandeau coût + mode i2v/t2v */}
          {!allReady && segmentsWithoutBroll.length > 0 && (
            <div className="rounded-md bg-primary/[0.05] border border-primary/20 px-3 py-2 text-xs text-muted-foreground flex items-start gap-2">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
              <span>
                Coût estimé pour {segmentsWithoutBroll.length} clip(s) en{" "}
                <strong className="text-foreground">
                  {Math.ceil(segmentsWithoutBroll.length / 3)} appel(s) multi-shot
                </strong>{" "}
                :{" "}
                <strong className="text-foreground">
                  ~{(Math.ceil(segmentsWithoutBroll.length / 3) * 1.26).toFixed(2)}$
                </strong>
                {" · "}
                <strong className="text-foreground">Kling 3.0 Pro 1080p</strong>
                {" · "}
                Cohérence visuelle native entre shots du même groupe
              </span>
            </div>
          )}

          {/* Grille des segments */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {segments.map((seg) => (
              <SegmentCard
                key={seg.idx}
                project={project}
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
    </div>
  );
}

// ─── Card par segment avec prompt éditable ────────────────────────────
function SegmentCard({
  project,
  segment,
  isGenerating,
  onGenerate,
}: {
  project: StudioProject;
  segment: StudioSegment;
  isGenerating: boolean;
  onGenerate: () => void;
}) {
  const hasBroll = !!segment.broll_path;
  const hasPrompt = !!segment.broll_prompt;
  const signedUrlQuery = useStudioSignedUrl(hasBroll ? segment.broll_path : null);
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(segment.broll_prompt ?? "");
  const [savingPrompt, setSavingPrompt] = useState(false);

  const handleSavePrompt = async () => {
    if (editedPrompt.trim() === (segment.broll_prompt ?? "")) {
      setEditingPrompt(false);
      return;
    }
    setSavingPrompt(true);
    try {
      const { error } = await supabase.rpc(
        "update_studio_segment_broll" as any,
        {
          p_project_id: project.id,
          p_segment_idx: segment.idx,
          p_broll_path: null,
          p_broll_prompt: editedPrompt.trim(),
        },
      );
      if (error) throw error;
      toast.success(`Prompt segment ${segment.idx + 1} mis à jour`, { duration: 2000 });
      setEditingPrompt(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Sauvegarde échouée");
    } finally {
      setSavingPrompt(false);
    }
  };

  return (
    <div
      className={`rounded-lg border overflow-hidden flex flex-col ${
        hasBroll
          ? "border-emerald-500/30 bg-background/40"
          : isGenerating
          ? "border-primary/40 bg-primary/[0.04]"
          : hasPrompt
          ? "border-primary/30 bg-background/40"
          : "border-border bg-background/40"
      }`}
    >
      {/* Video preview ou placeholder 9:16 */}
      <div className="relative aspect-[9/16] bg-gradient-to-br from-muted to-background flex items-center justify-center">
        {hasBroll && signedUrlQuery.data ? (
          <SegmentVideo
            url={signedUrlQuery.data}
            startMs={segment.broll_start_ms ?? null}
            endMs={segment.broll_end_ms ?? null}
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
            <p className="text-[10px] uppercase tracking-wider">
              {hasPrompt ? "Prompt prêt" : "Pas planifié"}
            </p>
          </div>
        )}
        <div className="absolute top-2 left-2 h-6 w-6 rounded-full bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center text-[11px] font-mono font-semibold">
          {segment.idx + 1}
        </div>
      </div>

      <div className="p-2.5 space-y-2 flex-1 flex flex-col">
        <p className="text-xs text-foreground/90 leading-snug line-clamp-2">
          {segment.text}
        </p>

        {/* Prompt visuel éditable */}
        {hasPrompt && (
          <div className="text-[10px] space-y-1">
            <div className="flex items-center justify-between gap-1">
              <span className="text-muted-foreground uppercase tracking-wider font-semibold">
                Prompt visuel
              </span>
              {!editingPrompt && !hasBroll && (
                <button
                  onClick={() => {
                    setEditedPrompt(segment.broll_prompt ?? "");
                    setEditingPrompt(true);
                  }}
                  className="text-primary hover:underline"
                >
                  Éditer
                </button>
              )}
            </div>
            {editingPrompt ? (
              <div className="space-y-1">
                <Textarea
                  value={editedPrompt}
                  onChange={(e) => setEditedPrompt(e.target.value)}
                  rows={3}
                  className="text-[10px] leading-snug resize-none"
                  placeholder="Prompt visuel en anglais"
                />
                <div className="flex justify-end gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingPrompt(false)}
                    disabled={savingPrompt}
                    className="text-[10px] h-6"
                  >
                    Annuler
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSavePrompt}
                    disabled={savingPrompt}
                    className="text-[10px] h-6 gap-1"
                  >
                    {savingPrompt && <Loader2 className="h-3 w-3 animate-spin" />}
                    Sauvegarder
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground italic leading-snug">
                {segment.broll_prompt}
              </p>
            )}
          </div>
        )}

        <Button
          variant={hasBroll ? "outline" : "default"}
          size="sm"
          onClick={onGenerate}
          disabled={isGenerating || editingPrompt}
          className="w-full gap-1.5 text-xs h-7 mt-auto"
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
              {hasPrompt ? "Générer ce clip" : "Générer (prompt en silo)"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── SegmentVideo : lit UN sous-clip d'une vidéo partagée ──────────────
// Quand on est en mode multi-shot Kling, plusieurs segments partagent
// la même vidéo broll_path mais avec des offsets différents. Ce composant
// joue uniquement la portion [start_ms, end_ms] de la vidéo, en boucle.
function SegmentVideo({
  url,
  startMs,
  endMs,
}: {
  url: string;
  startMs: number | null;
  endMs: number | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasOffsets = startMs !== null && endMs !== null && endMs > startMs;

  useEffect(() => {
    if (!hasOffsets || !videoRef.current) return;
    const video = videoRef.current;
    const startSec = (startMs ?? 0) / 1000;
    const endSec = (endMs ?? 0) / 1000;

    const onLoaded = () => {
      try {
        video.currentTime = startSec;
      } catch {
        // ignore (currentTime not yet supported on some browsers before metadata)
      }
    };
    const onTimeUpdate = () => {
      if (video.currentTime >= endSec) {
        // Loop : reviens au start
        try {
          video.currentTime = startSec;
        } catch {
          // ignore
        }
      }
    };

    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("timeupdate", onTimeUpdate);

    return () => {
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, [hasOffsets, startMs, endMs, url]);

  return (
    <video
      ref={videoRef}
      src={url}
      controls
      className="w-full h-full object-cover"
      preload="metadata"
      playsInline
    />
  );
}
