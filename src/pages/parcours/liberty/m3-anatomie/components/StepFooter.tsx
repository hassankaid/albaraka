import { ArrowLeft, ArrowRight, Sparkles, AlertTriangle } from "lucide-react";
import { Btn, Actions, LoadingScreen } from "../../m1-niche/components/ui";
import { ScoreCard } from "./ScoreCard";
import { VALIDATION_THRESHOLD, FORCE_AVAILABLE_AFTER } from "../lib/types";
import type { AIFeedback } from "../lib/types";

interface StepFooterProps {
  feedback: AIFeedback | null;
  score: number;
  attempts: number;
  forced: boolean;
  validated: boolean;
  evaluating: boolean;
  canEvaluate: boolean;
  onEvaluate: () => void;
  onBack: () => void;
  onNext: () => void;
  onForce: () => void;
  nextLabel?: string;
  evaluateLabel?: string;
}

export function StepFooter({
  feedback, score, attempts, forced, validated, evaluating, canEvaluate,
  onEvaluate, onBack, onNext, onForce, nextLabel, evaluateLabel,
}: StepFooterProps) {
  const passing = validated || score >= VALIDATION_THRESHOLD;
  const canGoNext = passing || forced;
  const canForce = !passing && !forced && attempts >= FORCE_AVAILABLE_AFTER;

  if (evaluating) {
    return <LoadingScreen message="Claude évalue ton travail…" hint="~10-20 secondes" />;
  }

  return (
    <>
      <ScoreCard feedback={feedback} score={score} attempts={attempts} forced={forced} validated={validated} />

      <Actions>
        <Btn variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Étape précédente
        </Btn>
        <div className="flex flex-wrap gap-2">
          <Btn variant="ghost" disabled={!canEvaluate} onClick={onEvaluate}>
            <Sparkles className="h-4 w-4" />
            {evaluateLabel ?? (feedback ? "Réévaluer" : "Évaluer")}
          </Btn>
          {canGoNext && (
            <Btn variant="primary" onClick={onNext}>
              {nextLabel ?? "Étape suivante"}
              <ArrowRight className="h-4 w-4" />
            </Btn>
          )}
          {canForce && !canGoNext && (
            <Btn variant="ghost" onClick={onForce} className="!border-amber-500/40 !text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              Forcer la suite quand même
            </Btn>
          )}
        </div>
      </Actions>

      {!feedback && (
        <p className="mt-2 text-right text-[11px] text-white/40">
          Objectif : score ≥ {VALIDATION_THRESHOLD}/100 pour valider (ou forcer après {FORCE_AVAILABLE_AFTER} tentatives).
        </p>
      )}
    </>
  );
}
