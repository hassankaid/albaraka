import { ArrowLeft, ArrowRight, Loader2, AlertTriangle, Zap } from "lucide-react";
import { Btn, Actions } from "../../m1-niche/components/ui";
import type { AIFeedback } from "../lib/types";

interface Props {
  feedback: AIFeedback | null;
  score: number | null;
  attempts: number;
  forced: boolean;
  validated: boolean;
  evaluating: boolean;
  canEvaluate: boolean;
  threshold: number;
  aiMode?: "cloud" | "local" | null;
  onEvaluate: () => void;
  onBack: () => void;
  onNext: () => void;
  onForce: () => void;
}

export function StepFooter({
  feedback, score, attempts, forced, validated, evaluating,
  canEvaluate, threshold, aiMode, onEvaluate, onBack, onNext, onForce,
}: Props) {
  const canForce = attempts >= 3 && (score == null || score < threshold);

  return (
    <div>
      {score !== null && feedback && (
        <div
          className="mb-5 rounded-xl p-4"
          style={{
            background: "rgba(11,10,7,0.6)",
            border: `0.5px solid ${score >= threshold ? "rgba(127,176,105,0.45)" : score >= 60 ? "rgba(255,180,80,0.45)" : "rgba(232,107,107,0.45)"}`,
          }}
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/50">
              ⚡ Évaluation · Tentative {attempts}
              {aiMode && (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] uppercase tracking-[0.06em]"
                  style={{
                    background: aiMode === "cloud" ? "rgba(127,176,105,0.14)" : "rgba(255,180,80,0.14)",
                    color: aiMode === "cloud" ? "#7FB069" : "#FFB450",
                  }}
                >
                  {aiMode === "cloud" ? "IA Claude" : "⚙ Évaluation locale"}
                </span>
              )}
              {forced && (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] uppercase tracking-[0.06em]"
                  style={{ background: "rgba(255,180,80,0.18)", color: "#FFB450" }}
                >
                  ⚠ Forcé
                </span>
              )}
            </div>
            <div
              className="text-[28px] font-bold leading-none"
              style={{ color: score >= threshold ? "#7FB069" : score >= 60 ? "#FFB450" : "#E86B6B" }}
            >
              {score}<span className="ml-1 text-[14px] text-white/40">/100</span>
            </div>
          </div>

          {feedback.verdict && (
            <p className="mb-3 text-[13px] font-semibold leading-[1.5] text-white/90">{feedback.verdict}</p>
          )}
          {feedback.strengths && feedback.strengths.length > 0 && (
            <div className="mb-2">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#7FB069]">Forces</div>
              <ul className="space-y-0.5 text-[12.5px] leading-[1.45] text-white/75">
                {feedback.strengths.map((s, i) => <li key={i}>✓ {s}</li>)}
              </ul>
            </div>
          )}
          {feedback.weaknesses && feedback.weaknesses.length > 0 && (
            <div className="mb-2">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#FFB450]">Faiblesses</div>
              <ul className="space-y-0.5 text-[12.5px] leading-[1.45] text-white/75">
                {feedback.weaknesses.map((s, i) => <li key={i}>✗ {s}</li>)}
              </ul>
            </div>
          )}
          {feedback.suggestions && feedback.suggestions.length > 0 && (
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#C9A84C]">Suggestions</div>
              <ul className="space-y-0.5 text-[12.5px] leading-[1.45] text-white/75">
                {feedback.suggestions.map((s, i) => <li key={i}>→ {s}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      <Actions>
        <Btn variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Précédent
        </Btn>
        <div className="flex flex-wrap items-center gap-2">
          <Btn variant="primary" disabled={!canEvaluate || evaluating} onClick={onEvaluate}>
            {evaluating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            {evaluating ? "Évaluation…" : "Faire évaluer"}
          </Btn>
          {canForce && (
            <button
              type="button"
              onClick={onForce}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-semibold"
              style={{ background: "rgba(255,180,80,0.08)", border: "0.5px solid rgba(255,180,80,0.4)", color: "#FFB450" }}
            >
              <AlertTriangle className="h-3 w-3" />
              Forcer ({attempts} essais)
            </button>
          )}
          {validated && (
            <Btn variant="cta" onClick={onNext}>
              Suivant
              <ArrowRight className="h-4 w-4" />
            </Btn>
          )}
        </div>
      </Actions>
    </div>
  );
}
