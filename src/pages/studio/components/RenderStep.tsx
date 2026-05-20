import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Sparkles, Film, Download, RefreshCw, AlertTriangle, Lock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  useRenderFinal,
  useRenderJobStatus,
  useStudioSignedUrl,
  type CaptionPreset,
} from "../hooks/useStudioProjects";
import type { StudioProject } from "../types";

/**
 * Brique B5 — Rendu final MP4 9:16 via JSON2Video.
 *
 * Flow :
 *   1. L'élève choisit un preset de sous-titres (karaoke / classic / hormozi)
 *   2. Clique "Lancer le rendu" → submit JSON2Video avec webhook
 *   3. UI passe en "En cours de rendu..." avec spinner + polling 5s
 *   4. Quand le webhook a persisté le MP4, output_path est rempli →
 *      on affiche le player vidéo + bouton télécharger
 *   5. L'élève peut relancer un rendu avec un autre preset si besoin
 */

interface PresetOption {
  id: CaptionPreset;
  label: string;
  description: string;
  /** Aperçu inline : mot-clé + style (CSS pour donner une idée). */
  previewClass: string;
  previewLabel: string;
}

const PRESETS: PresetOption[] = [
  {
    id: "karaoke",
    label: "Karaoke",
    description: "Bloc 3-4 mots, mot courant surligné en or. Style Submagic / Iman Gadzhi.",
    previewClass:
      "bg-black text-white px-3 py-1 rounded font-black uppercase tracking-wide text-xs",
    previewLabel: 'Mot <span class="text-[#F5D547]">EN OR</span>',
  },
  {
    id: "classic",
    label: "Classique",
    description: "Texte blanc outliné noir, 5-6 mots par ligne. Style YouTube Shorts standard.",
    previewClass:
      "bg-black/30 text-white px-3 py-1 font-bold text-xs",
    previewLabel: "Texte simple blanc outliné",
  },
  {
    id: "hormozi",
    label: "Hormozi",
    description: "1 mot à la fois, ÉNORME, jaune saturé centré. Style Alex Hormozi / Mr Beast.",
    previewClass:
      "bg-black text-[#FFEB3B] px-3 py-1 rounded font-black uppercase text-sm",
    previewLabel: "BOOM",
  },
];

const PRESET_LABEL: Record<CaptionPreset, string> = {
  karaoke: "Karaoke",
  classic: "Classique",
  hormozi: "Hormozi",
};

interface RenderStepProps {
  project: StudioProject;
  variant: "locked" | "active" | "done";
}

export default function RenderStep({ project, variant }: RenderStepProps) {
  const [selectedPreset, setSelectedPreset] = useState<CaptionPreset>("karaoke");
  const renderFinal = useRenderFinal();
  const renderJobQuery = useRenderJobStatus(project.id);

  const job = renderJobQuery.data;
  const isRendering =
    project.status === "processing" || (job?.status === "pending");

  const hasFinalVideo =
    !!project.output_path && project.status === "done";

  // Pré-sélectionne le dernier preset utilisé (UX : l'élève qui re-render
  // garde son choix précédent).
  useEffect(() => {
    if (job?.caption_preset && job.caption_preset !== selectedPreset) {
      setSelectedPreset(job.caption_preset);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.caption_preset]);

  const handleRender = async () => {
    try {
      await renderFinal.mutateAsync({
        projectId: project.id,
        captionPreset: selectedPreset,
      });
      toast({
        title: "Rendu lancé",
        description:
          "JSON2Video assemble la vidéo. Ça prend ~30s à 2min selon la durée.",
      });
    } catch (e) {
      toast({
        title: "Échec du lancement",
        description: (e as Error)?.message ?? "Erreur inconnue",
        variant: "destructive",
      });
    }
  };

  // ─── Verrouillé : B-rolls pas encore prêts ─────────────────────
  if (variant === "locked") {
    return (
      <Card className="border-border opacity-60">
        <CardContent className="p-4 flex items-start gap-3">
          <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 bg-muted text-muted-foreground/60">
            <Lock className="h-3.5 w-3.5" />
          </div>
          <div className="flex-1 min-w-0 space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-foreground">
                5. Rendu final
              </p>
              <span className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                B5
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Termine la génération des b-rolls pour débloquer cette étape.
            </p>
          </div>
          <div className="shrink-0 self-center text-[11px] text-muted-foreground/60">
            Verrouillé
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={
        hasFinalVideo
          ? "border-emerald-500/30 bg-emerald-500/[0.02]"
          : "border-border"
      }
    >
      <CardContent className="p-5 space-y-5">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div
            className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
              hasFinalVideo
                ? "bg-emerald-500/15 text-emerald-500"
                : isRendering
                ? "bg-amber-500/15 text-amber-500"
                : "bg-primary/15 text-primary"
            }`}
          >
            {hasFinalVideo ? (
              <Film className="h-4 w-4" />
            ) : isRendering ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-foreground">5. Rendu final</p>
              <span className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                B5
              </span>
              {hasFinalVideo && (
                <Badge className="bg-emerald-500/15 text-emerald-500 border-0 text-[10px]">
                  ✓ Prêt
                </Badge>
              )}
              {isRendering && (
                <Badge className="bg-amber-500/15 text-amber-500 border-0 text-[10px]">
                  En cours de rendu…
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
              Assemblage final : voix-off + b-rolls + sous-titres viraux → MP4 9:16
              prêt à poster sur Instagram Reels / TikTok / YouTube Shorts.
            </p>
          </div>
        </div>

        {/* ─── Cas 1 : Rendu en cours ────────────────────────────── */}
        {isRendering && !hasFinalVideo && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/[0.04] p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 text-amber-500 animate-spin shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  Rendu JSON2Video en cours…
                </p>
                <p className="text-xs text-muted-foreground">
                  Préset : <span className="font-mono">{PRESET_LABEL[selectedPreset]}</span>{" "}
                  · Durée typique : 30s à 2min · La page se rafraîchit
                  automatiquement.
                </p>
              </div>
            </div>
            {job?.error_message && (
              <div className="rounded border border-destructive/30 bg-destructive/[0.05] p-2 text-[11px] text-destructive">
                {job.error_message}
              </div>
            )}
          </div>
        )}

        {/* ─── Cas 2 : Échec ──────────────────────────────────────── */}
        {job?.status === "failed" && !isRendering && !hasFinalVideo && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/[0.04] p-4 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium text-destructive">
                  Le rendu précédent a échoué
                </p>
                {job.error_message && (
                  <p className="text-[11px] text-muted-foreground font-mono break-words">
                    {job.error_message}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── Cas 3 : MP4 prêt — preview + download ─────────────── */}
        {hasFinalVideo && project.output_path && (
          <FinalVideoPlayer
            path={project.output_path}
            durationS={project.output_duration_seconds}
          />
        )}

        {/* ─── Sélecteur de preset (sauf pendant le rendu) ──────── */}
        {!isRendering && (
          <div className="space-y-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium mb-2">
                {hasFinalVideo ? "Refaire le rendu avec un autre style" : "Style des sous-titres"}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPreset(p.id)}
                    className={`text-left rounded-lg border p-3 transition-colors ${
                      selectedPreset === p.id
                        ? "border-primary bg-primary/[0.06]"
                        : "border-border bg-card hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`text-sm font-medium ${
                          selectedPreset === p.id ? "text-primary" : "text-foreground"
                        }`}
                      >
                        {p.label}
                      </span>
                      {selectedPreset === p.id && (
                        <span className="text-[10px] text-primary">●</span>
                      )}
                    </div>
                    <div
                      className={p.previewClass}
                      dangerouslySetInnerHTML={{ __html: p.previewLabel }}
                    />
                    <p className="text-[11px] text-muted-foreground mt-2 leading-snug">
                      {p.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleRender}
              disabled={renderFinal.isPending}
              className="w-full sm:w-auto gap-2"
            >
              {renderFinal.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Lancement…
                </>
              ) : hasFinalVideo ? (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Refaire le rendu en {PRESET_LABEL[selectedPreset]}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Lancer le rendu final
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Player vidéo 9:16 avec bouton télécharger. URL signée Storage (1h cache).
 */
function FinalVideoPlayer({
  path,
  durationS,
}: {
  path: string;
  durationS: number | null;
}) {
  const signedUrlQuery = useStudioSignedUrl(path);
  const url = signedUrlQuery.data;

  const filename = useMemo(() => {
    const base = path.split("/").pop() ?? "studio-final.mp4";
    return base;
  }, [path]);

  if (signedUrlQuery.isLoading) {
    return <Skeleton className="aspect-[9/16] w-full max-w-[270px] rounded-lg" />;
  }
  if (!url) {
    return (
      <p className="text-xs text-destructive">
        Impossible de charger la vidéo finale (URL signée échouée).
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-emerald-500/30 bg-black p-3 space-y-3">
      <div className="flex justify-center">
        <video
          src={url}
          controls
          playsInline
          className="aspect-[9/16] w-full max-w-[270px] rounded-md bg-black"
        />
      </div>
      <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
        <div className="text-muted-foreground">
          {durationS && (
            <span>
              Durée : <span className="text-foreground font-mono">{durationS.toFixed(1)}s</span>
            </span>
          )}
        </div>
        <Button asChild size="sm" variant="secondary" className="gap-2">
          <a href={url} download={filename} target="_blank" rel="noreferrer">
            <Download className="h-3.5 w-3.5" />
            Télécharger le MP4
          </a>
        </Button>
      </div>
    </div>
  );
}
