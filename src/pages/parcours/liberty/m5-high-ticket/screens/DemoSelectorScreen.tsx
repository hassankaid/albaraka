import { ArrowLeft, ChevronRight, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Btn, Actions } from "../../m1-niche/components/ui";
import { M5_DEMO_CASES, type M5DemoCase } from "../lib/demo-cases";

interface Props {
  onBack: () => void;
  onSelect: (c: M5DemoCase) => void;
}

const SEG_META: Record<M5DemoCase["segment"], { emoji: string; label: string; tag: string }> = {
  argent: { emoji: "💰", label: "Argent", tag: "Business · Liberté financière" },
  relations: { emoji: "❤️", label: "Relations", tag: "Couple · Famille · Mariage" },
  sante: { emoji: "🌱", label: "Santé", tag: "Corps · Esprit · Bien-être" },
};

export function DemoSelectorScreen({ onBack, onSelect }: Props) {
  const groups = (Object.keys(SEG_META) as M5DemoCase["segment"][]).map((s) => ({
    segment: s,
    cases: M5_DEMO_CASES.filter((c) => c.segment === s),
  }));
  const readyCount = M5_DEMO_CASES.filter((c) => c.ready).length;
  const antiPatternCount = M5_DEMO_CASES.filter((c) => c.is_anti_pattern).length;
  const warnCount = M5_DEMO_CASES.filter((c) => c.warn_zone).length;

  function handleClick(c: M5DemoCase) {
    if (!c.ready) {
      toast.info(`« ${c.title} » sera prêt prochainement.`, {
        description: "Karim (bon cas) + Lina (anti-pattern) + Aïcha v0.5 (zone warn) sont disponibles.",
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
      <p className="mb-6 max-w-[640px] text-[13px] leading-[1.6] text-white/60">
        11 cas synchronisés avec le casting M1/M2/M3/M4 ({readyCount} disponible, {11 - readyCount} en production) pour
        explorer le M5 sans toucher à ton vrai parcours. Dont <strong className="text-[#FFB450]">{antiPatternCount} anti-pattern(s)</strong> + {" "}
        <strong className="text-[#FFB450]">{warnCount} zone warn</strong> pédagogique.{" "}
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
                          : c.warn_zone
                            ? "0.5px solid rgba(255,200,120,0.3)"
                            : "0.5px solid rgba(201,168,76,0.18)"
                        : "0.5px dashed rgba(255,255,255,0.1)",
                      opacity: c.ready ? 1 : 0.55,
                    }}
                  >
                    <div className="shrink-0 text-2xl">{c.emoji}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
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
                        {c.warn_zone && (
                          <span
                            className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.06em]"
                            style={{ background: "rgba(232,199,112,0.14)", color: "#E8C770", border: "0.5px solid rgba(232,199,112,0.4)" }}
                          >
                            Warn zone
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
