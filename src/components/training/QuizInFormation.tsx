import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  PlayCircle,
  RotateCcw,
  Trophy,
  Lock,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuizByModule, useQuizByFormation, useLatestQuizAttempt } from "@/hooks/useQuizzes";

/**
 * Card quiz de module — affiché en bas de chaque module dans FormationDetail.
 * Invisible si aucun quiz n'est rattaché au module.
 */
export function ModuleQuizCard({
  moduleId,
  moduleComplete,
}: {
  moduleId: string;
  /** true si tous les chapitres vidéo publiés du module sont terminés */
  moduleComplete: boolean;
}) {
  const navigate = useNavigate();
  const { data: quiz, isLoading } = useQuizByModule(moduleId);
  const { data: lastAttempt } = useLatestQuizAttempt(quiz?.id ?? null);

  if (isLoading || !quiz) return null;

  const validated = !!lastAttempt?.validated;
  const hasAttempted = !!lastAttempt;

  return (
    <div
      className={cn(
        "mt-3 mx-3 mb-3 rounded-md border p-3 transition-colors",
        validated
          ? "border-emerald-500/40 bg-emerald-500/5"
          : !moduleComplete
            ? "border-border/60 bg-muted/30"
            : "border-primary/40 bg-primary/5"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="shrink-0">
          {validated ? (
            <Trophy className="h-4 w-4 text-emerald-500" />
          ) : !moduleComplete ? (
            <Lock className="h-4 w-4 text-muted-foreground" />
          ) : (
            <PlayCircle className="h-4 w-4 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground">
              {quiz.titre}
            </span>
            <Badge variant="outline" className="text-[10px]">
              Max {quiz.max_errors} erreur{quiz.max_errors !== 1 ? "s" : ""}
            </Badge>
            {validated && (
              <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 text-[10px]">
                ✅ Validé
              </Badge>
            )}
            {!validated && hasAttempted && (
              <Badge variant="secondary" className="text-[10px]">
                {lastAttempt.errors_count} erreurs
              </Badge>
            )}
          </div>
          {!moduleComplete && !validated && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Termine les chapitres du module pour débloquer le quiz.
            </p>
          )}
        </div>
        <Button
          size="sm"
          variant={validated ? "outline" : "default"}
          onClick={() => navigate(`/training/quiz/${quiz.id}`)}
          disabled={!moduleComplete && !validated}
          className="gap-1.5 shrink-0 h-8"
        >
          {validated ? (
            <>
              <RotateCcw className="h-3.5 w-3.5" />
              Refaire
            </>
          ) : hasAttempted ? (
            <>
              <RotateCcw className="h-3.5 w-3.5" />
              Recommencer
            </>
          ) : (
            <>
              <PlayCircle className="h-3.5 w-3.5" />
              Commencer
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

/**
 * Card Quiz de Validation Finale — en bas de FormationDetail.
 * Verrouillé tant que la formation n'est pas à 100%.
 */
export function FormationFinalQuizCard({
  formationId,
  canAccess,
}: {
  formationId: string;
  /** true si la formation est à 100% (tous chapitres vidéo finis) */
  canAccess: boolean;
}) {
  const navigate = useNavigate();
  const { data: quiz, isLoading } = useQuizByFormation(formationId);
  const { data: lastAttempt } = useLatestQuizAttempt(quiz?.id ?? null);

  if (isLoading || !quiz) return null;

  const validated = !!lastAttempt?.validated;
  const hasAttempted = !!lastAttempt;

  return (
    <Card
      className={cn(
        "border-2 transition-colors",
        validated
          ? "border-emerald-500/50 bg-emerald-500/5"
          : !canAccess
            ? "border-border bg-muted/30 opacity-80"
            : "border-amber-500/50 bg-gradient-to-br from-amber-500/10 via-card to-card"
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="shrink-0">
            {validated ? (
              <div className="p-2 rounded-full bg-emerald-500/15">
                <Trophy className="h-5 w-5 text-emerald-500" />
              </div>
            ) : !canAccess ? (
              <div className="p-2 rounded-full bg-muted">
                <Lock className="h-5 w-5 text-muted-foreground" />
              </div>
            ) : (
              <div className="p-2 rounded-full bg-amber-500/15">
                <Sparkles className="h-5 w-5 text-amber-500" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className="text-[10px] tracking-wider uppercase border-amber-500/40 text-amber-700 dark:text-amber-400"
              >
                Validation finale
              </Badge>
              {validated && (
                <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 text-[10px]">
                  ✅ Formation validée
                </Badge>
              )}
            </div>
            <h3 className="font-heading text-lg text-foreground mt-1.5">
              {quiz.titre}
            </h3>
            {!canAccess && !validated ? (
              <p className="text-xs text-muted-foreground mt-1">
                Termine tous les chapitres de la formation pour débloquer le quiz de validation finale.
              </p>
            ) : !validated ? (
              <p className="text-xs text-muted-foreground mt-1">
                Valide ce quiz (max {quiz.max_errors} erreur{quiz.max_errors !== 1 ? "s" : ""}) pour finaliser la formation et débloquer le chapitre suivant de ton parcours AL BARAKA.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">
                Bravo ! Tu peux retenter le quiz pour confirmer tes acquis.
              </p>
            )}
          </div>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          {hasAttempted && !validated && (
            <Badge variant="secondary" className="text-[10px]">
              {lastAttempt.errors_count} erreurs au dernier essai
            </Badge>
          )}
          <Button
            onClick={() => navigate(`/training/quiz/${quiz.id}`)}
            disabled={!canAccess && !validated}
            variant={validated ? "outline" : "default"}
            className="gap-2"
          >
            {validated ? (
              <>
                <RotateCcw className="h-4 w-4" />
                Refaire
              </>
            ) : hasAttempted ? (
              <>
                <RotateCcw className="h-4 w-4" />
                Recommencer
              </>
            ) : (
              <>
                <PlayCircle className="h-4 w-4" />
                Passer le quiz de validation
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
