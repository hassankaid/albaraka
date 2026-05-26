import { ArrowLeft, ChevronRight } from "lucide-react";
import { StepEyebrow, StepTitle, StepSub, Btn, Actions } from "../components/ui";
import { DEMO_NICHES, type DemoNiche } from "../lib/demo-niches";

interface DemoSelectorScreenProps {
  onBack: () => void;
  onSelect: (niche: DemoNiche) => void;
}

const SEGMENT_META: Record<DemoNiche["market"], { emoji: string; tag: string; color: string }> = {
  Argent: { emoji: "💰", tag: "Argent · Business · Liberté financière", color: "#FFD580" },
  Relations: { emoji: "❤️", tag: "Relations · Couple · Famille · Mariage", color: "#FFB4D8" },
  Santé: { emoji: "🌱", tag: "Santé · Corps · Esprit · Bien-être", color: "#A8E6CF" },
};

export function DemoSelectorScreen({ onBack, onSelect }: DemoSelectorScreenProps) {
  const grouped = (Object.keys(SEGMENT_META) as DemoNiche["market"][]).map((m) => ({
    market: m,
    niches: DEMO_NICHES.filter((n) => n.market === m),
  }));

  return (
    <div>
      <StepEyebrow>Mode démo</StepEyebrow>
      <StepTitle>Choisis une niche démo</StepTitle>
      <StepSub>
        10 niches halal pré-remplies — 4 Argent, 3 Relations, 3 Santé. Tu peux explorer, lire,
        éditer, t'entraîner.{" "}
        <strong className="text-[#C9A84C]">Aucune donnée de la démo n'est sauvegardée — ton vrai
        parcours est préservé.</strong>
      </StepSub>

      <div className="space-y-6">
        {grouped.map(({ market, niches }) => {
          const meta = SEGMENT_META[market];
          return (
            <div key={market}>
              <div className="mb-3 flex items-center gap-3">
                <span className="text-2xl">{meta.emoji}</span>
                <div>
                  <div className="text-[14px] font-semibold text-white">{market}</div>
                  <div className="text-[10px] uppercase tracking-[0.08em] text-white/40">
                    {meta.tag}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {niches.map((n) => (
                  <button
                    key={n.key}
                    type="button"
                    onClick={() => onSelect(n)}
                    className="group flex w-full items-center gap-3 rounded-xl p-4 text-left transition-all"
                    style={{
                      background: "#14130E",
                      border: "0.5px solid rgba(201,168,76,0.18)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#1A180F";
                      e.currentTarget.style.borderColor = "rgba(255,180,80,0.5)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#14130E";
                      e.currentTarget.style.borderColor = "rgba(201,168,76,0.18)";
                    }}
                  >
                    <div className="shrink-0 text-2xl">{n.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-semibold leading-tight text-white">
                        {n.label}
                      </div>
                      <div className="mt-0.5 text-[12px] leading-snug text-white/60">
                        {n.summary}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[#C9A84C] opacity-60 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Actions align="center">
        <Btn variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour
        </Btn>
      </Actions>
    </div>
  );
}
