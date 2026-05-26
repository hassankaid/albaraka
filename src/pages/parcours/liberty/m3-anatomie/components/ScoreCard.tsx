import { AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";
import type { AIFeedback } from "../lib/types";
import { VALIDATION_THRESHOLD } from "../lib/types";

interface ScoreCardProps {
  feedback: AIFeedback | null;
  score: number;
  attempts: number;
  forced: boolean;
  validated: boolean;
}

export function ScoreCard({ feedback, score, attempts, forced, validated }: ScoreCardProps) {
  if (!feedback || (score === 0 && attempts === 0)) {
    return (
      <div
        className="mt-5 rounded-xl p-4 text-[12.5px] leading-[1.6] text-white/50"
        style={{
          background: "rgba(201,168,76,0.04)",
          border: "0.5px dashed rgba(201,168,76,0.25)",
        }}
      >
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[#C9A84C]/70">
          <Sparkles className="h-3.5 w-3.5" />
          Évaluation IA
        </div>
        <p className="mt-2">
          Clique sur <strong className="text-[#C9A84C]">"Évaluer"</strong> pour recevoir un score
          IA + suggestions (objectif : ≥ {VALIDATION_THRESHOLD}/100 pour valider).
        </p>
      </div>
    );
  }

  const intent: "good" | "ok" | "bad" =
    score >= VALIDATION_THRESHOLD ? "good" : score >= 60 ? "ok" : "bad";
  const colorMap = {
    good: { bg: "rgba(80,200,120,0.08)", border: "rgba(80,200,120,0.4)", text: "#50C878", icon: CheckCircle2 },
    ok:   { bg: "rgba(255,180,80,0.08)",  border: "rgba(255,180,80,0.4)",  text: "#FFB450", icon: AlertTriangle },
    bad:  { bg: "rgba(232,107,107,0.08)", border: "rgba(232,107,107,0.4)", text: "#E86B6B", icon: AlertTriangle },
  } as const;
  const c = colorMap[intent];
  const Icon = c.icon;

  return (
    <div className="mt-5 rounded-2xl p-5" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: c.text }}>
          <Icon className="h-4 w-4" />
          {validated ? `✓ Validé · ${score}/100` : `Score · ${score}/100`}
        </div>
        <div className="text-[10px] text-white/40">
          Tentative {attempts}{forced && " · forcée"}
        </div>
      </div>

      {feedback.verdict && (
        <p className="mb-3 text-[13.5px] font-semibold leading-[1.5] text-white">{feedback.verdict}</p>
      )}
      {feedback.weak && (
        <div className="mb-3">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white/60">Point faible</div>
          <p className="text-[12.5px] leading-[1.55] text-white/80">{feedback.weak}</p>
        </div>
      )}
      {feedback.action_concrete && (
        <div className="mb-3">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white/60">Action concrète</div>
          <p className="text-[12.5px] leading-[1.55] text-white/80">{feedback.action_concrete}</p>
        </div>
      )}
      {Array.isArray(feedback.propositions) && feedback.propositions.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/60">
            Propositions
          </div>
          {feedback.propositions.map((p, i) => (
            <div
              key={i}
              className="rounded-lg p-3 text-[12px] leading-[1.55] text-white/80"
              style={{ background: "rgba(0,0,0,0.2)" }}
            >
              {p.cible_etape && (
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#C9A84C]">
                  → {p.cible_etape}
                </div>
              )}
              <div>{p.text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
