import { ArrowLeft, ChevronRight } from "lucide-react";
import { Btn, Actions } from "../../m1-niche/components/ui";
import { M6_DEMO_CASES, type M6DemoCase } from "../lib/demo-cases";

interface Props {
  onBack: () => void;
  onSelect: (c: M6DemoCase) => void;
}

const SEG_META: Record<M6DemoCase["segment"], { emoji: string; label: string; tag: string }> = {
  argent: { emoji: "💰", label: "Argent", tag: "Business · Liberté financière" },
  relations: { emoji: "❤️", label: "Relations", tag: "Couple · Famille · Mariage" },
  sante: { emoji: "🌱", label: "Santé", tag: "Corps · Esprit · Bien-être" },
};

export function DemoSelectorScreen({ onBack, onSelect }: Props) {
  const groups = (Object.keys(SEG_META) as M6DemoCase["segment"][]).map((s) => ({
    segment: s,
    cases: M6_DEMO_CASES.filter((c) => c.segment === s),
  }));
  const readyCount = M6_DEMO_CASES.filter((c) => c.ready).length;

  return (
    <div>
      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#C9A84C]">Mode démo</span>
      <h2 className="mb-2 text-[22px] font-semibold leading-tight tracking-tight text-white">
        Choisis un cas démo
      </h2>
      <p className="mb-6 max-w-[640px] text-[13px] leading-[1.6] text-white/60">
        10 cas synchronisés avec le casting M1-M5 ({readyCount}/10 disponibles). Tous des bons cas — pas d'anti-pattern en M6 selon Sidali (commentaire source : « les démos ne servent pas d'anti-pattern »).
        <strong className="text-[#C9A84C]"> Aucune donnée n'est sauvegardée en démo.</strong>
      </p>

      <div className="space-y-6">
        {groups.map(({ segment, cases }) => {
          const meta = SEG_META[segment];
          return (
            <div key={segment}>
              <div className="mb-3 flex items-center gap-3">
                <span className="text-2xl">{meta.emoji}</span>
                <div>
                  <div className="text-[14px] font-semibold text-white">{meta.label}</div>
                  <div className="text-[10px] uppercase tracking-[0.08em] text-white/40">{meta.tag}</div>
                </div>
              </div>
              <div className="space-y-2">
                {cases.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => onSelect(c)}
                    className="group flex w-full items-center gap-3 rounded-xl p-4 text-left transition-all"
                    style={{ background: "#14130E", border: "0.5px solid rgba(201,168,76,0.18)" }}
                  >
                    <div className="shrink-0 text-2xl">{c.emoji}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-semibold leading-tight text-white">{c.title}</div>
                      <div className="mt-0.5 text-[12px] leading-snug text-white/60">{c.summary}</div>
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
