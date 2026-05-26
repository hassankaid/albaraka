import { ArrowLeft, ChevronRight, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Btn, Actions } from "../../m1-niche/components/ui";
import { M4_DEMO_CASES, type M4DemoCase } from "../lib/demo-cases";

interface Props {
  onBack: () => void;
  onSelect: (c: M4DemoCase) => void;
}

const SEG_META: Record<M4DemoCase["segment"], { emoji: string; label: string; tag: string }> = {
  argent: { emoji: "💰", label: "Argent", tag: "Business · Liberté financière" },
  relations: { emoji: "❤️", label: "Relations", tag: "Couple · Famille · Mariage" },
  sante: { emoji: "🌱", label: "Santé", tag: "Corps · Esprit · Bien-être" },
};

export function DemoSelectorScreen({ onBack, onSelect }: Props) {
  const groups = (Object.keys(SEG_META) as M4DemoCase["segment"][]).map((s) => ({
    segment: s,
    cases: M4_DEMO_CASES.filter((c) => c.segment === s),
  }));
  const readyCount = M4_DEMO_CASES.filter((c) => c.ready).length;
  const antiPatternCount = M4_DEMO_CASES.filter((c) => c.is_anti_pattern).length;

  function handleClick(c: M4DemoCase) {
    if (!c.ready) {
      toast.info(`« ${c.title} » sera prêt prochainement.`, {
        description: "Cake Design + Karim + Lina sont disponibles pour explorer le flux.",
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
      <p className="mb-6 max-w-[620px] text-[13px] leading-[1.6] text-white/60">
        10 cas synchronisés M1 + M2 + M3 + M4 ({readyCount} disponible, {10 - readyCount} en production) pour explorer le M4 sans toucher à ton vrai parcours.
        Dont <strong className="text-[#FFB450]">{antiPatternCount} anti-pattern(s)</strong> où l'IA pousse back contre des stratégies trompeuses.{" "}
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
                        ? c.is_anti_pattern
                          ? "0.5px solid rgba(255,180,80,0.4)"
                          : "0.5px solid rgba(201,168,76,0.18)"
                        : "0.5px dashed rgba(255,255,255,0.1)",
                      opacity: c.ready ? 1 : 0.55,
                    }}
                    onMouseEnter={(e) => {
                      if (c.ready) {
                        e.currentTarget.style.borderColor = c.is_anti_pattern
                          ? "rgba(255,180,80,0.7)"
                          : "rgba(255,200,120,0.5)";
                        e.currentTarget.style.background = "#1A180F";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = c.ready
                        ? c.is_anti_pattern ? "rgba(255,180,80,0.4)" : "rgba(201,168,76,0.18)"
                        : "rgba(255,255,255,0.1)";
                      e.currentTarget.style.background = "#14130E";
                    }}
                  >
                    <div className="shrink-0 text-2xl">{c.emoji}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="text-[14px] font-semibold leading-tight text-white">{c.title}</div>
                        {c.is_anti_pattern && (
                          <span
                            className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.06em]"
                            style={{ background: "rgba(255,180,80,0.14)", color: "#FFB450", border: "0.5px solid rgba(255,180,80,0.4)" }}
                          >
                            <AlertTriangle className="h-2.5 w-2.5" />
                            Anti-pattern
                          </span>
                        )}
                      </div>
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
