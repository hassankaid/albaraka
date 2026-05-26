import { ArrowRight, Play, Sparkles, Target, User, Brain, TrendingUp } from "lucide-react";
import { Option, Btn } from "../../m1-niche/components/ui";
import { pickAvatarName, pickNiche, type M3State, type MarketType } from "../lib/types";

interface WelcomeScreenProps {
  state: M3State;
  setState: (next: (prev: M3State) => M3State) => void;
  onStart: () => void;
  onOpenDemo: () => void;
}

const MARKET_OPTIONS: Array<{ value: MarketType; emoji: string; label: string; desc: string }> = [
  {
    value: "b2c_info",
    emoji: "📚",
    label: "B2C · Info (savoir, compétence à acquérir)",
    desc: "Tu vends une connaissance, une méthode, un skill. Ex : trading, copywriting, closing, SMMA.",
  },
  {
    value: "b2c_transfo",
    emoji: "🦋",
    label: "B2C · Transformation",
    desc: "Tu vends un changement de vie : corps, finances, relations. Ex : perte de poids, couple, anxiété.",
  },
  {
    value: "b2b",
    emoji: "🏢",
    label: "B2B",
    desc: "Tu vends à des entreprises ou indépendants. Résultat chiffrable, ROI clair.",
  },
];

export function WelcomeScreen({ state, setState, onStart, onOpenDemo }: WelcomeScreenProps) {
  const hasM1 = !!state.m1_data;
  const hasM2 = !!state.m2_data;

  const setMarket = (m: MarketType) => {
    setState((prev) => ({ ...prev, market_type: m }));
  };

  const canStart = hasM1 && !!state.market_type;

  return (
    <div className="px-0 pb-2 pt-2">
      <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#C9A84C]">
        <Sparkles className="h-3.5 w-3.5" />
        Module 3 · Anatomie d'une offre
      </div>
      <h1 className="mb-2 text-[26px] font-semibold leading-tight tracking-tight text-white">
        {hasM1 ? `Construis ton offre pour ${pickAvatarName(state)}` : "Construis ton offre"}
      </h1>
      <p className="mb-6 max-w-[620px] text-[13px] leading-[1.65] text-white/60">
        Une offre = <strong className="text-[#C9A84C]">Promesse</strong> + <strong className="text-[#C9A84C]">Mécanisme</strong> + <strong className="text-[#C9A84C]">Véhicule</strong> + <strong className="text-[#C9A84C]">Bonus</strong> + <strong className="text-[#C9A84C]">Garantie</strong> + <strong className="text-[#C9A84C]">Urgence</strong> + <strong className="text-[#C9A84C]">Prix</strong>. C'est le levier n°1 du business — bien plus puissant qu'une bonne audience ou un bon copy.
      </p>

      {/* Bloc imports M1 + M2 */}
      {(hasM1 || hasM2) && (
        <div
          className="mb-6 rounded-2xl p-5"
          style={{ background: "#14130E", border: "0.5px solid rgba(201,168,76,0.4)" }}
        >
          <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#C9A84C]">
            <Sparkles className="h-3.5 w-3.5" />
            Contexte importé automatiquement
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {hasM1 && (
              <>
                <ContextRow
                  icon={<Target className="h-3.5 w-3.5" />}
                  label="Niche (M1)"
                  value={pickNiche(state)}
                />
                <ContextRow
                  icon={<User className="h-3.5 w-3.5" />}
                  label="Avatar (M1)"
                  value={pickAvatarName(state)}
                  sub={state.m1_data?.avatar?.socio?.situation}
                />
              </>
            )}
            {hasM2 && (
              <>
                <ContextRow
                  icon={<Brain className="h-3.5 w-3.5" />}
                  label="Positionnement (M2)"
                  value={state.m2_data?.data?.step8?.positionnement || "—"}
                />
                <ContextRow
                  icon={<TrendingUp className="h-3.5 w-3.5" />}
                  label="Hook (M2)"
                  value={state.m2_data?.data?.step8?.hook_principal || "—"}
                />
              </>
            )}
          </div>
        </div>
      )}

      {!hasM1 && (
        <div
          className="mb-6 rounded-xl p-4 text-[13px] leading-[1.6]"
          style={{
            background: "rgba(255,180,80,0.06)",
            border: "0.5px solid rgba(255,180,80,0.4)",
            color: "#FFB450",
          }}
        >
          <strong>Le Module 1 doit être terminé en premier.</strong>
          <p className="mt-2 text-white/70">
            Le M3 utilise ta sous-niche et ton avatar du M1. Va finir le M1 puis reviens.
          </p>
          <div className="mt-3 flex gap-2">
            <a
              href="/parcours/liberty/m1"
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-bold text-white"
              style={{
                background: "linear-gradient(135deg, #C9A84C 0%, #E8C770 100%)",
                textShadow: "0 1px 2px rgba(0,0,0,0.45)",
              }}
            >
              Aller au M1
              <ArrowRight className="h-3 w-3" />
            </a>
            <button
              type="button"
              onClick={onOpenDemo}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-semibold"
              style={{
                background: "rgba(255,180,80,0.06)",
                border: "0.5px solid rgba(255,180,80,0.4)",
                color: "#FFB450",
              }}
            >
              <Play className="h-3 w-3" />
              Voir une démo
            </button>
          </div>
        </div>
      )}

      {/* Sélecteur market_type */}
      {hasM1 && (
        <div className="mb-6">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#C9A84C]">
            Type de marché — pré-rempli depuis ton M1, ajustable
          </div>
          <div className="flex flex-col gap-2">
            {MARKET_OPTIONS.map((m) => (
              <Option
                key={m.value}
                selected={state.market_type === m.value}
                onClick={() => setMarket(m.value)}
              >
                <span className="flex items-start gap-3">
                  <span className="text-xl">{m.emoji}</span>
                  <span className="flex flex-col">
                    <span className="font-semibold">{m.label}</span>
                    <span className="text-[11px] leading-snug text-white/40">{m.desc}</span>
                  </span>
                </span>
              </Option>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Btn variant="cta" disabled={!canStart} onClick={onStart} className="w-full sm:w-auto">
          Démarrer la construction
          <ArrowRight className="h-4 w-4" />
        </Btn>
        <button
          type="button"
          onClick={onOpenDemo}
          className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-[12px] font-semibold transition-colors"
          style={{
            background: "rgba(255,180,80,0.06)",
            border: "0.5px solid rgba(255,180,80,0.4)",
            color: "#FFB450",
          }}
        >
          <Play className="h-3.5 w-3.5" />
          Voir un cas démo
        </button>
      </div>
      <p className="mt-3 text-[11px] text-white/30">
        ~75-120 min · 7 étapes IA scorées · seuil validation 80/100 · sauvegarde auto
      </p>
    </div>
  );
}

function ContextRow({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string | null }) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#C9A84C]">
        {icon}
        {label}
      </div>
      <div className="text-[12.5px] leading-[1.5] text-white/85">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-white/40">{sub}</div>}
    </div>
  );
}
