import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  useParcours,
  useCompleteChapitre,
  useUnlockFormation,
  type ParcoursChapitre,
  type ParcoursPhase,
} from "@/hooks/useParcours";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Lock, CheckCircle2, PlayCircle, BookOpen, ArrowRight,
  Sparkles, GraduationCap, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function ParcoursView() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { parcours, progress, isLoading } = useParcours(slug);
  const [milestone, setMilestone] = useState<ParcoursChapitre | null>(null);

  // Détecte quand un milestone devient accessible → modal plein écran auto
  useEffect(() => {
    if (!parcours || !progress) return;
    const lastSeenKey = `parcours:${parcours.id}:lastMilestoneSeen`;
    const lastSeen = localStorage.getItem(lastSeenKey);
    const target = parcours.phases
      .flatMap((ph) => ph.chapitres)
      .find(
        (c) =>
          c.type === "milestone" &&
          progress.isChapitreAccessible(c.id) &&
          !progress.completedChapitreIds.has(c.id) &&
          c.id !== lastSeen
      );
    if (target) {
      setMilestone(target);
      localStorage.setItem(lastSeenKey, target.id);
    }
  }, [parcours, progress]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!parcours) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center">
        <p className="text-muted-foreground">Parcours introuvable.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/training")}>
          Retour aux formations
        </Button>
      </div>
    );
  }

  if (parcours.status !== "published" || parcours.phases.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center space-y-3">
        <h2 className="font-heading text-2xl">{parcours.titre}</h2>
        <p className="text-muted-foreground">
          Ce parcours arrive bientôt. Reviens plus tard.
        </p>
        <Button variant="outline" onClick={() => navigate("/training")}>
          Retour aux formations
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-8">
      <ParcoursHeader parcours={parcours} progress={progress} />

      <div className="space-y-10">
        {parcours.phases.map((phase) => (
          <PhaseBlock
            key={phase.id}
            phase={phase}
            isCurrentPhase={progress?.currentPhaseNumero === phase.numero}
            completedIds={progress?.completedChapitreIds ?? new Set()}
            isAccessible={progress?.isChapitreAccessible ?? (() => false)}
          />
        ))}
      </div>

      <MilestoneDialog
        chapitre={milestone}
        onClose={() => setMilestone(null)}
      />
    </div>
  );
}

function ParcoursHeader({
  parcours, progress,
}: {
  parcours: NonNullable<ReturnType<typeof useParcours>["parcours"]>;
  progress: ReturnType<typeof useParcours>["progress"];
}) {
  const percent = progress?.percent ?? 0;
  const phaseNum = progress?.currentPhaseNumero ?? 1;
  const currentPhase = parcours.phases.find((p) => p.numero === phaseNum);

  return (
    <div className="rounded-2xl border bg-gradient-to-br from-amber-500/5 via-card to-card p-6 md:p-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <Badge variant="outline" className="gap-1 border-amber-500/40 text-amber-700 dark:text-amber-400">
            <Sparkles className="h-3 w-3" />
            {parcours.pass_type === "al_baraka" ? "Pass Al-Baraka" : "Pack Liberty"}
          </Badge>
          <h1 className="font-heading text-3xl md:text-4xl text-foreground">
            {parcours.titre}
          </h1>
          {parcours.subtitle && (
            <p className="font-heading italic text-muted-foreground">{parcours.subtitle}</p>
          )}
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-foreground">{percent}%</div>
          <div className="text-xs text-muted-foreground">
            {progress?.completedCount ?? 0} / {progress?.totalChapitres ?? 0} chapitres
          </div>
        </div>
      </div>
      <Progress value={percent} className="mt-6 h-2" />
      {currentPhase && (
        <div className="mt-4 text-sm text-muted-foreground flex items-center gap-2">
          <span>Phase {currentPhase.numero}/{parcours.phases.length}</span>
          <span>·</span>
          <span className="font-medium text-foreground">
            {currentPhase.emoji} {currentPhase.titre}
          </span>
        </div>
      )}
    </div>
  );
}

function PhaseBlock({
  phase, isCurrentPhase, completedIds, isAccessible,
}: {
  phase: ParcoursPhase;
  isCurrentPhase: boolean;
  completedIds: Set<string>;
  isAccessible: (id: string) => boolean;
}) {
  return (
    <section className={cn("space-y-3", !isCurrentPhase && "opacity-90")}>
      <div className="flex items-baseline gap-3 flex-wrap">
        <Badge variant={isCurrentPhase ? "default" : "secondary"} className="text-xs">
          Phase {phase.numero}
        </Badge>
        <h2 className="font-heading text-2xl text-foreground">
          {phase.emoji} {phase.titre}
        </h2>
      </div>
      {phase.description && (
        <p className="text-sm text-muted-foreground">{phase.description}</p>
      )}
      <div className="space-y-2 pt-2">
        {phase.chapitres.map((ch) => (
          <ChapitreRow
            key={ch.id}
            chapitre={ch}
            isCompleted={completedIds.has(ch.id)}
            isAccessible={isAccessible(ch.id)}
          />
        ))}
      </div>
    </section>
  );
}

function ChapitreRow({
  chapitre, isCompleted, isAccessible,
}: {
  chapitre: ParcoursChapitre;
  isCompleted: boolean;
  isAccessible: boolean;
}) {
  if (chapitre.type === "milestone") {
    return (
      <MilestoneRow
        chapitre={chapitre}
        isCompleted={isCompleted}
        isAccessible={isAccessible}
      />
    );
  }
  if (chapitre.type === "redirect_formation") {
    return (
      <RedirectFormationRow
        chapitre={chapitre}
        isCompleted={isCompleted}
        isAccessible={isAccessible}
      />
    );
  }
  return (
    <VideoRow chapitre={chapitre} isCompleted={isCompleted} isAccessible={isAccessible} />
  );
}

function BaseRow({
  className, children, accent,
}: { className?: string; children: React.ReactNode; accent?: "current" | "done" | "locked" | "milestone" }) {
  return (
    <Card
      className={cn(
        "transition-colors",
        accent === "current" && "border-primary/60 bg-primary/5",
        accent === "done" && "border-emerald-500/40 bg-emerald-500/5",
        accent === "locked" && "opacity-60",
        accent === "milestone" && "border-amber-500/50 bg-gradient-to-r from-amber-500/10 to-transparent",
        className
      )}
    >
      <CardContent className="p-4 flex items-start gap-4">{children}</CardContent>
    </Card>
  );
}

function VideoRow({
  chapitre, isCompleted, isAccessible,
}: { chapitre: ParcoursChapitre; isCompleted: boolean; isAccessible: boolean }) {
  const completeMutation = useCompleteChapitre();
  const accent = isCompleted ? "done" : !isAccessible ? "locked" : "current";

  return (
    <BaseRow accent={accent}>
      <div className="shrink-0 mt-1">
        {isCompleted ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        ) : !isAccessible ? (
          <Lock className="h-5 w-5 text-muted-foreground" />
        ) : (
          <PlayCircle className="h-5 w-5 text-primary" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Ch. {chapitre.numero}</span>
          <h3 className="font-medium text-foreground">{chapitre.titre}</h3>
          {chapitre.duree_estimee_minutes && (
            <span className="text-xs text-muted-foreground">· {chapitre.duree_estimee_minutes} min</span>
          )}
        </div>
        {chapitre.description && isAccessible && (
          <p className="mt-1 text-xs text-muted-foreground whitespace-pre-line line-clamp-3">
            {chapitre.description}
          </p>
        )}
        {isAccessible && !isCompleted && (
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => completeMutation.mutate(chapitre.id)}
              disabled={completeMutation.isPending}
              className="gap-2"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Marquer terminé
            </Button>
          </div>
        )}
      </div>
    </BaseRow>
  );
}

function RedirectFormationRow({
  chapitre, isCompleted, isAccessible,
}: { chapitre: ParcoursChapitre; isCompleted: boolean; isAccessible: boolean }) {
  const navigate = useNavigate();
  const unlockMutation = useUnlockFormation();

  const openFormation = async () => {
    if (!chapitre.formation_id) return;
    try {
      await unlockMutation.mutateAsync(chapitre.formation_id);
      const { data } = await supabase
        .from("formations")
        .select("slug")
        .eq("id", chapitre.formation_id)
        .single();
      toast.success("Formation débloquée 🎉");
      navigate(`/training/${data?.slug ?? ""}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur d'accès");
    }
  };

  const accent = isCompleted ? "done" : !isAccessible ? "locked" : "current";

  return (
    <BaseRow accent={accent} className="border-dashed">
      <div className="shrink-0 mt-1">
        {isCompleted ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        ) : !isAccessible ? (
          <Lock className="h-5 w-5 text-muted-foreground" />
        ) : (
          <GraduationCap className="h-5 w-5 text-primary" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
            VA TE FORMER
          </Badge>
          <h3 className="font-medium text-foreground">{chapitre.titre.replace("VA TE FORMER → ", "")}</h3>
        </div>
        {chapitre.description && isAccessible && (
          <p className="mt-1.5 text-xs text-muted-foreground whitespace-pre-line">
            {chapitre.description}
          </p>
        )}
        {isAccessible && !isCompleted && (
          <div className="mt-3">
            <Button size="sm" onClick={openFormation} className="gap-2" disabled={unlockMutation.isPending}>
              <BookOpen className="h-3.5 w-3.5" />
              Accéder à la formation
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </BaseRow>
  );
}

function MilestoneRow({
  chapitre, isCompleted, isAccessible,
}: { chapitre: ParcoursChapitre; isCompleted: boolean; isAccessible: boolean }) {
  const completeMutation = useCompleteChapitre();
  const accent = isCompleted ? "done" : !isAccessible ? "locked" : "milestone";

  return (
    <BaseRow accent={accent}>
      <div className="shrink-0 text-3xl">{chapitre.milestone_emoji ?? "⚡"}</div>
      <div className="flex-1 min-w-0">
        <h3 className="font-heading text-lg text-foreground">{chapitre.titre}</h3>
        {(isAccessible || isCompleted) && chapitre.milestone_message && (
          <p className="mt-1 text-sm text-muted-foreground whitespace-pre-line">
            {chapitre.milestone_message}
          </p>
        )}
        {isAccessible && !isCompleted && (
          <Button
            size="sm"
            variant="outline"
            className="mt-3 gap-2"
            onClick={() => completeMutation.mutate(chapitre.id)}
            disabled={completeMutation.isPending}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Valider cette étape
          </Button>
        )}
      </div>
    </BaseRow>
  );
}

function MilestoneDialog({
  chapitre, onClose,
}: { chapitre: ParcoursChapitre | null; onClose: () => void }) {
  const completeMutation = useCompleteChapitre();
  return (
    <Dialog open={!!chapitre} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden border-amber-500/40">
        <div className="bg-gradient-to-br from-amber-500/20 via-background to-background p-10 text-center space-y-6 relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1 rounded hover:bg-muted text-muted-foreground"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="text-6xl">{chapitre?.milestone_emoji ?? "⚡"}</div>
          <h2 className="font-heading text-3xl text-foreground">{chapitre?.titre}</h2>
          {chapitre?.milestone_message && (
            <p className="text-base text-muted-foreground whitespace-pre-line max-w-md mx-auto">
              {chapitre.milestone_message}
            </p>
          )}
          <Button
            size="lg"
            className="gap-2 mt-2"
            onClick={async () => {
              if (chapitre) await completeMutation.mutateAsync(chapitre.id);
              onClose();
            }}
            disabled={completeMutation.isPending}
          >
            Continuer
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
