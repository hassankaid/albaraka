import { ArrowLeft, ChevronRight, Clock } from "lucide-react";
import { toast } from "sonner";
import { Btn, Actions } from "../../m1-niche/components/ui";
import { M3_DEMO_CASES, type M3DemoCase } from "../lib/demo-cases";

interface Props {
  onBack: () => void;
  onSelect: (c: M3DemoCase) => void;
}

const SEG_META: Record<M3DemoCase["segment"], { emoji: string; label: string; tag: string }> = {
  argent: { emoji: "💰", label: "Argent", tag: "Business · Liberté financière" },
  relations: { emoji: "❤️", label: "Relations", tag: "Couple · Famille · Mariage" },
  sante: { emoji: "🌱", label: "Santé", tag: "Corps · Esprit · Bien-être" },
};

export function DemoSelectorScreen({ onBack, onSelect }: Props) {
  const groups = (Object.keys(SEG_META) as M3DemoCase["segment"][]).map((s) => ({
    segment: s,
    cases: M3_DEMO_CASES.filter((c) => c.segment === s),
  }));
  const readyCount = M3_DEMO_CASES.filter((c) => c.ready).length;

  function handleClick(c: M3DemoCase) {
    if (!c.ready) {
      toast.info(`« ${c.title} » sera prêt prochainement.`, {
        description: "Seul Cake Design est disponible en démo complète pour l'instant.",
      });
      return;
    }
    onSelect(c);
  }

  return (
    <div>
      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#C9A84C]">Mode démo</span>
      <h2 className="mb-2 text-[22px] font-semibold leading-tight tracking-tight text-white">
        Choisis un cas démo
      </h2>
      <p className="mb-6 max-w-[580px] text-[13px] leading-[1.6] text-white/60">
        10 cas halal pré-remplis ({readyCount} disponible, {10 - readyCount} en production) pour explorer le M3 sans toucher à ton vrai parcours.{" "}
        <strong className="text-[#C9A84C]">Aucune donnée n'est sauvegardée en démo.</strong>
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
                    onClick={() => handleClick(c)}
                    className="group flex w-full items-center gap-3 rounded-xl p-4 text-left transition-all"
                    style={{
                      background: "#14130E",
                      border: c.ready
                        ? "0.5px solid rgba(201,168,76,0.18)"
                        : "0.5px dashed rgba(255,255,255,0.1)",
                      opacity: c.ready ? 1 : 0.55,
                    }}
                    onMouseEnter={(e) => {
                      if (c.ready) {
                        e.currentTarget.style.borderColor = "rgba(255,180,80,0.5)";
                        e.currentTarget.style.background = "#1A180F";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = c.ready ? "rgba(201,168,76,0.18)" : "rgba(255,255,255,0.1)";
                      e.currentTarget.style.background = "#14130E";
                    }}
                  >
                    <div className="shrink-0 text-2xl">{c.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-semibold leading-tight text-white">{c.title}</div>
                      <div className="mt-0.5 text-[12px] leading-snug text-white/60">{c.summary}</div>
                    </div>
                    {c.ready ? (
                      <ChevronRight className="h-4 w-4 shrink-0 text-[#C9A84C] opacity-60 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                    ) : (
                      <div className="flex shrink-0 items-center gap-1 text-[10px] uppercase tracking-[0.08em] text-white/40">
                        <Clock className="h-3 w-3" />
                        À venir
                      </div>
                    )}
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
