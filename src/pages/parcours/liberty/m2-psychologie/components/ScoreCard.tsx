import { AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";
import type { AIFeedback } from "../lib/types";

interface ScoreCardProps {
  feedback: AIFeedback | null;
  attempts: number;
  forced: boolean;
}

/**
 * Carte d'évaluation IA — affichée après chaque appel `evaluateStep()`.
 * Affiche score 0-100 + feedback + suggestions de Claude.
 */
export function ScoreCard({ feedback, attempts, forced }: ScoreCardProps) {
  if (!feedback) {
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
          Clique sur <strong className="text-[#C9A84C]">"Évaluer mon travail"</strong> ci-dessous
          pour recevoir un score IA + suggestions concrètes.
        </p>
      </div>
    );
  }

  const score = feedback.score;
  const intent: "good" | "ok" | "bad" =
    score >= 80 ? "good" : score >= 60 ? "ok" : "bad";

  const colorMap = {
    good: { bg: "rgba(80,200,120,0.08)", border: "rgba(80,200,120,0.4)", text: "#50C878", icon: CheckCircle2 },
    ok:   { bg: "rgba(255,180,80,0.08)",  border: "rgba(255,180,80,0.4)",  text: "#FFB450", icon: AlertTriangle },
    bad:  { bg: "rgba(232,107,107,0.08)", border: "rgba(232,107,107,0.4)", text: "#E86B6B", icon: AlertTriangle },
  } as const;
  const c = colorMap[intent];
  const Icon = c.icon;

  return (
    <div
      className="mt-5 rounded-2xl p-5"
      style={{ background: c.bg, border: `1px solid ${c.border}` }}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: c.text }}>
          <Icon className="h-4 w-4" />
          Évaluation IA · score {score}/100
        </div>
        <div className="text-[10px] text-white/40">
          Tentative {attempts}{forced && " · forcée"}
        </div>
      </div>

      <p className="text-[13px] leading-[1.6] text-white/85">{feedback.fb}</p>

      {feedback.suggs.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/60">
            Suggestions par item ({feedback.suggs.length})
          </div>
          {feedback.suggs.map((s, i) => (
            <div
              key={i}
              className="rounded-lg p-3 text-[12px] leading-[1.55] text-white/80"
              style={{ background: "rgba(0,0,0,0.2)" }}
            >
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#C9A84C]">
                {s.target}
              </div>
              <div dangerouslySetInnerHTML={{ __html: s.tip }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
