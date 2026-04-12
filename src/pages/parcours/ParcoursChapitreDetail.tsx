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

      {/* Placeholder vidéo */}
      <Card>
        <CardContent className="p-0">
          <div className="aspect-video bg-muted flex items-center justify-center flex-col gap-3 text-muted-foreground">
            {chapitre.vimeo_id || chapitre.video_url ? (
              // TODO : brancher le lecteur Vimeo quand les vidéos seront uploadées.
              <>
                <PlayCircle className="h-16 w-16" />
                <div className="text-sm">Lecteur vidéo à brancher</div>
              </>
            ) : (
              <>
                <Video className="h-16 w-16 opacity-40" />
                <div className="text-sm">Vidéo à venir</div>
                <div className="text-xs opacity-70">
                  Les vidéos du parcours sont en tournage.
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

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
