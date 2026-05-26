import { ArrowLeft, ArrowRight, Sparkles, AlertTriangle } from "lucide-react";
import { Btn, Actions, LoadingScreen } from "../../m1-niche/components/ui";
import { ScoreCard } from "./ScoreCard";
import type { AIFeedback } from "../lib/types";

interface StepFooterProps {
  feedback: AIFeedback | null;
  attempts: number;
  forced: boolean;
  evaluating: boolean;
  canEvaluate: boolean;
  onEvaluate: () => void;
  onBack: () => void;
  onNext: () => void;
  onForce: () => void;
  /** Texte du bouton secondary "Étape suivante" personnalisé selon l'étape. */
  nextLabel?: string;
}

const PASSING_SCORE = 60;

/**
 * Pied de page commun aux 8 étapes du M2.
 * - Affiche un ScoreCard placeholder tant que pas d'évaluation
 * - Bouton "Évaluer mon travail" qui déclenche l'IA Claude
 * - Bouton "Étape suivante" (activé si score >= 60 OU forced)
 * - Bouton "Forcer la suite" si score < 60 (assume le risque)
 */
export function StepFooter({
  feedback, attempts, forced, evaluating, canEvaluate,
  onEvaluate, onBack, onNext, onForce, nextLabel,
}: StepFooterProps) {
  const score = feedback?.score ?? null;
  const passing = score !== null && score >= PASSING_SCORE;
  const canGoNext = passing || forced;

  if (evaluating) {
    return (
      <LoadingScreen
        message="Claude évalue ton travail…"
        hint="~10-20 secondes"
      />
    );
  }

  return (
    <>
      <ScoreCard feedback={feedback} attempts={attempts} forced={forced} />

      <Actions>
        <Btn variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Étape précédente
        </Btn>
        <div className="flex flex-wrap gap-2">
          <Btn variant="ghost" disabled={!canEvaluate} onClick={onEvaluate}>
            <Sparkles className="h-4 w-4" />
            {feedback ? "Réévaluer" : "Évaluer mon travail"}
          </Btn>
          {canGoNext ? (
            <Btn variant="primary" onClick={onNext}>
              {nextLabel ?? "Étape suivante"}
              <ArrowRight className="h-4 w-4" />
            </Btn>
          ) : (
            feedback && score !== null && score < PASSING_SCORE && (
              <Btn variant="ghost" onClick={onForce} className="!border-amber-500/40 !text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                Forcer la suite quand même
              </Btn>
            )
          )}
        </div>
      </Actions>

      {!feedback && (
        <p className="mt-2 text-right text-[11px] text-white/40">
          Une évaluation IA est requise pour avancer (objectif : score ≥ {PASSING_SCORE}/100).
        </p>
      )}
    </>
  );
}
