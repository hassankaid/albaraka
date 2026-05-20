import { useState } from "react";
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
  usePlanBrolls,
  useStudioSignedUrl,
} from "../hooks/useStudioProjects";
import type { StudioProject, StudioSegment } from "../types";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  project: StudioProject;
  variant: "locked" | "active" | "done";
}

export default function BrollStep({ project, variant }: Props) {
  const generateMutation = useGenerateBroll();
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
      const ok = confirm(
        "⚠️ Aucun plan global n'a été fait — les prompts seront générés en silo (qualité moins bonne, pas de cohérence narrative).\n\nClique 'OK' pour lancer quand même, ou 'Annuler' puis utilise d'abord 'Planifier les b-rolls' pour un meilleur résultat.",
      );
      if (!ok) return;
    } else {
      const ok = confirm(
        `Générer ${segmentsWithoutBroll.length} b-rolls en parallèle ?\n\nModèle : Kling 3.0 Pro (1080p, cinematic).\nCoût estimé : ~${(segmentsWithoutBroll.length * 0.85).toFixed(2)}$ ($0.084/sec × 5s × ${segmentsWithoutBroll.length} clips).\nDurée : 30-90 secondes par clip, en parallèle.`,
      );
      if (!ok) return;
    }
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
                  Kling 3.0 Pro
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
                Coût estimé pour {segmentsWithoutBroll.length} clip(s) :{" "}
                <strong className="text-foreground">
                  ~{(segmentsWithoutBroll.length * 0.85).toFixed(2)}$
                </strong>
                {" · "}
                <strong className="text-foreground">Kling 3.0 Pro 1080p</strong>
                {" · "}
                {allPlanned
                  ? "Prompts pré-planifiés (cohérence narrative)"
                  : "Prompts générés en silo (qualité moindre)"}
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
