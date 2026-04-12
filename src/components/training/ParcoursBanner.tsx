import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles } from "lucide-react";
import { useParcours } from "@/hooks/useParcours";
import { useUserPass } from "@/hooks/useUserPass";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";

export function ParcoursBanner() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { passLevel, hasAnyPass } = useUserPass();
  const isCeo = profile?.role === "ceo";
  // CEO : affiche AL BARAKA par défaut pour visualiser le parcours
  // User : affiche le parcours correspondant à son pass actif
  const slug = hasAnyPass
    ? (passLevel === "liberty" ? "liberty" : "al-baraka")
    : isCeo
      ? "al-baraka"
      : null;
  const { parcours, progress, isLoading } = useParcours(slug);

  if (!slug) return null;

  if (isLoading) {
    return <Skeleton className="h-32 w-full rounded-2xl" />;
  }

  if (!parcours || parcours.phases.length === 0) {
    // Liberty en draft : bandeau "bientôt disponible"
    return (
      <div className="rounded-2xl border bg-gradient-to-br from-amber-500/5 via-card to-card p-6">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="gap-1 border-amber-500/40 text-amber-700 dark:text-amber-400">
            <Sparkles className="h-3 w-3" /> {passLevel === "liberty" ? "Pack Liberty" : "Pass Al-Baraka"}
          </Badge>
        </div>
        <h2 className="mt-2 font-heading text-xl text-foreground">Ton parcours arrive bientôt</h2>
        <p className="text-sm text-muted-foreground mt-1">
          En attendant, explore les formations débloquées ci-dessous.
        </p>
      </div>
    );
  }

  const percent = progress?.percent ?? 0;
  const totalPhases = parcours.phases.length;
  const phaseNum = progress?.currentPhaseNumero ?? 1;
  const currentPhase = parcours.phases.find((p) => p.numero === phaseNum);
  const nextChapitre =
    progress?.currentChapitreId
      ? parcours.phases.flatMap((p) => p.chapitres).find((c) => c.id === progress.currentChapitreId)
      : null;

  return (
    <div className="rounded-2xl border bg-gradient-to-br from-amber-500/10 via-card to-card p-5 md:p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1.5">
          <Badge variant="outline" className="gap-1 border-amber-500/40 text-amber-700 dark:text-amber-400">
            <Sparkles className="h-3 w-3" />
            {parcours.pass_type === "al_baraka" ? "Pass Al-Baraka" : "Pack Liberty"}
          </Badge>
          <h2 className="font-heading text-xl md:text-2xl text-foreground">{parcours.titre}</h2>
          {currentPhase && (
            <p className="text-xs text-muted-foreground">
              Phase {phaseNum}/{totalPhases} · {currentPhase.emoji} {currentPhase.titre}
            </p>
          )}
        </div>
        <Button onClick={() => navigate(`/parcours/${parcours.slug}`)} className="gap-2">
          {percent === 0 ? "Commencer" : "Continuer"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="mt-4 space-y-1.5">
        <Progress value={percent} className="h-1.5" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{percent}%</span>
          {nextChapitre && (
            <span className="truncate ml-3 max-w-[60%] text-right">
              Prochain : {nextChapitre.titre}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
