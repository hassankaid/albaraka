import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, ArrowRight, CheckCircle2, PlayCircle, Clock, Video,
} from "lucide-react";
import { toast } from "sonner";
import { useParcours, useCompleteChapitre } from "@/hooks/useParcours";
import { useParcoursChapitreContent } from "@/hooks/useParcoursChapitreContent";
import { VideoPlayer } from "@/components/training/VideoPlayer";
import { ExternalLink, FileText as FileTextIcon, Image as ImageIcon, Link as LinkIcon } from "lucide-react";

export default function ParcoursChapitreDetail() {
  const { slug, chapitreId } = useParams<{ slug: string; chapitreId: string }>();
  const navigate = useNavigate();
  const { parcours, progress, isLoading } = useParcours(slug);
  const completeMutation = useCompleteChapitre();

  // Flatten chapitres avec leur phase pour navigation
  const ordered = useMemo(() => {
    if (!parcours) return [];
    return parcours.phases.flatMap((ph) =>
      ph.chapitres.map((c) => ({ ...c, phase_numero: ph.numero, phase_titre: ph.titre, phase_emoji: ph.emoji }))
    );
  }, [parcours]);

  const idx = ordered.findIndex((c) => c.id === chapitreId);
  const chapitre = idx >= 0 ? ordered[idx] : null;
  const prev = idx > 0 ? ordered[idx - 1] : null;
  const next = idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1] : null;

  const isCompleted = chapitre ? progress?.completedChapitreIds.has(chapitre.id) ?? false : false;
  const isAccessible = chapitre ? progress?.isChapitreAccessible(chapitre.id) ?? false : false;

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!parcours || !chapitre) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center">
        <p className="text-muted-foreground">Chapitre introuvable.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(`/parcours/${slug}`)}>
          Retour au parcours
        </Button>
      </div>
    );
  }

  // Redirige si type spécial : un redirect_formation ne devrait pas avoir de page détail,
  // un milestone non plus (gérés dans ParcoursView).
  if (chapitre.type !== "video") {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center space-y-3">
        <p className="text-muted-foreground">Ce chapitre s'ouvre directement depuis le parcours.</p>
        <Button onClick={() => navigate(`/parcours/${slug}`)}>Retour au parcours</Button>
      </div>
    );
  }

  const handleComplete = async () => {
    try {
      await completeMutation.mutateAsync(chapitre.id);
      toast.success("Chapitre terminé ✓");
      if (next) navigate(`/parcours/${slug}/chapitre/${next.id}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur");
    }
  };

  const goto = (c: typeof prev) => {
    if (!c) return;
    if (c.type === "video") navigate(`/parcours/${slug}/chapitre/${c.id}`);
    else navigate(`/parcours/${slug}`);
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
      {/* Fil d'Ariane */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <button
          onClick={() => navigate(`/parcours/${slug}`)}
          className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {parcours.titre}
        </button>
        <span>/</span>
        <span>
          Phase {chapitre.phase_numero} · {chapitre.phase_emoji} {chapitre.phase_titre}
        </span>
      </div>

      {/* Titre */}
      <div className="space-y-2">
        <Badge variant="outline" className="text-xs tracking-wider">
          Chapitre {chapitre.numero}
        </Badge>
        <h1 className="font-heading text-3xl md:text-4xl text-foreground">
          {chapitre.titre}
        </h1>
        {chapitre.duree_estimee_minutes && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            {chapitre.duree_estimee_minutes} min
          </div>
        )}
      </div>

      <ChapitreContent chapitreId={chapitre.id} legacyVimeoId={chapitre.vimeo_id} legacyUrl={chapitre.video_url} />

      {/* Description */}

      {/* Description */}
      {chapitre.description && (
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-foreground whitespace-pre-line leading-relaxed">
              {chapitre.description}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-between items-center pt-2">
        <Button
          variant="ghost"
          onClick={() => goto(prev)}
          disabled={!prev}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Précédent
        </Button>

        {isCompleted ? (
          <Badge className="gap-1 bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15 border-emerald-500/40">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Terminé
          </Badge>
        ) : isAccessible ? (
          <Button
            onClick={handleComplete}
            disabled={completeMutation.isPending}
            className="gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            Marquer terminé
          </Button>
        ) : (
          <Badge variant="secondary" className="text-xs">
            Verrouillé — termine les chapitres précédents
          </Badge>
        )}

        <Button
          variant="ghost"
          onClick={() => goto(next)}
          disabled={!next}
          className="gap-2"
        >
          Suivant
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function ChapitreContent({
  chapitreId,
  legacyVimeoId,
  legacyUrl,
}: {
  chapitreId: string;
  legacyVimeoId: string | null;
  legacyUrl: string | null;
}) {
  const { data, isLoading } = useParcoursChapitreContent(chapitreId);
  const videos = data?.videos ?? [];
  const ressources = data?.ressources ?? [];

  const effectiveVideos =
    videos.length > 0
      ? videos
      : legacyVimeoId || legacyUrl
      ? [
          {
            id: "legacy",
            chapitre_id: chapitreId,
            titre: "Vidéo",
            url: legacyUrl,
            vimeo_id: legacyVimeoId,
            notes: null,
            duree_secondes: null,
            ordre: 0,
          },
        ]
      : [];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-0">
          <Skeleton className="aspect-video w-full" />
        </CardContent>
      </Card>
    );
  }

  if (effectiveVideos.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <div className="aspect-video bg-muted flex items-center justify-center flex-col gap-3 text-muted-foreground">
            <Video className="h-16 w-16 opacity-40" />
            <div className="text-sm">Vidéo à venir</div>
            <div className="text-xs opacity-70">Les vidéos du parcours sont en tournage.</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chapterLevelRessources = ressources.filter((r) => !r.video_id);

  return (
    <div className="space-y-5">
      {effectiveVideos.map((v) => {
        const videoRessources = ressources.filter((r) => r.video_id === v.id);
        return (
          <div key={v.id} className="space-y-3">
            <Card>
              <CardContent className="p-0">
                <VideoPlayer vimeoId={v.vimeo_id} url={v.url} title={v.titre} />
              </CardContent>
            </Card>
            {effectiveVideos.length > 1 && v.titre && (
              <h3 className="text-base font-semibold text-foreground">{v.titre}</h3>
            )}
            {v.notes && (
              <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                {v.notes}
              </p>
            )}
            {videoRessources.length > 0 && <RessourcesList ressources={videoRessources} />}
          </div>
        );
      })}
      {chapterLevelRessources.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Ressources du chapitre
          </h3>
          <RessourcesList ressources={chapterLevelRessources} />
        </div>
      )}
    </div>
  );
}

function RessourcesList({
  ressources,
}: {
  ressources: Array<{ id: string; titre: string; type: string; url: string }>;
}) {
  return (
    <div className="grid sm:grid-cols-2 gap-2">
      {ressources.map((r) => {
        const Icon = r.type === "pdf" ? FileTextIcon : r.type === "image" ? ImageIcon : LinkIcon;
        return (
          <a
            key={r.id}
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-3 rounded-lg border border-border/40 hover:border-primary/40 hover:bg-accent/30 transition-colors text-sm"
          >
            <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="flex-1 truncate">{r.titre}</span>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          </a>
        );
      })}
    </div>
  );
}
