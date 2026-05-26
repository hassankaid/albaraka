import type { ReactNode } from "react";
import { ArrowRight, Play, Sparkles, Target, User, Brain, Layers, AlertCircle } from "lucide-react";
import { Option, Btn } from "../../m1-niche/components/ui";
import { pickAvatarName, pickNiche, type M4State, type MarketType } from "../lib/types";

interface WelcomeScreenProps {
  state: M4State;
  setState: (next: (prev: M4State) => M4State) => void;
  onStart: () => void;
  onOpenDemo: () => void;
}

const MARKET_OPTIONS: Array<{ value: MarketType; emoji: string; label: string; desc: string }> = [
  { value: "b2c_info", emoji: "📚", label: "B2C · Info (savoir, compétence)", desc: "Tu vends une connaissance, une méthode, un skill." },
  { value: "b2c_transfo", emoji: "🦋", label: "B2C · Transformation", desc: "Tu vends un changement de vie : corps, finances, relations." },
  { value: "b2b", emoji: "🏢", label: "B2B", desc: "Tu vends à des entreprises ou indépendants. ROI clair." },
];

export function WelcomeScreen({ state, setState, onStart, onOpenDemo }: WelcomeScreenProps) {
  const hasM1 = !!state.m1_data;
  const hasM2 = !!state.m2_data;
  const hasM3 = !!(state.m3_data && state.m3_data.complete);

  const setMarket = (m: MarketType) => setState((prev) => ({ ...prev, market_type: m }));

  const canStart = hasM1 && hasM3 && !!state.market_type;
  const m3PrixScore = state.m3_data?.prix_score_global ?? null;

  return (
    <div className="px-0 pb-2 pt-2">
      <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#C9A84C]">
        <Sparkles className="h-3.5 w-3.5" />
        Module 4 · Value Ladder
      </div>
      <h1 className="mb-2 text-[26px] font-semibold leading-tight tracking-tight text-white">
        {hasM1 ? `Pose la value ladder pour ${pickAvatarName(state)}` : "Pose ta value ladder"}
      </h1>
      <p className="mb-6 max-w-[640px] text-[13px] leading-[1.65] text-white/60">
        Une value ladder = <strong className="text-[#C9A84C]">4 marches</strong> (Freemium · Low · Mid · High) +{" "}
        <strong className="text-[#C9A84C]">1 stratégie d'entrée</strong> (par où tu commercialises d'abord) +{" "}
        <strong className="text-[#C9A84C]">passerelles</strong> (comment tu fais monter ton client). Tu vas poser uniquement le High-ticket (M3) ici — les autres marches viendront en M6/M14/M16.
      </p>

      {/* Bloc imports */}
      {(hasM1 || hasM2 || hasM3) && (
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
                <ContextRow icon={<Target className="h-3.5 w-3.5" />} label="Niche (M1)" value={pickNiche(state)} />
                <ContextRow
                  icon={<User className="h-3.5 w-3.5" />}
                  label="Avatar (M1)"
                  value={pickAvatarName(state)}
                  sub={state.m1_data?.avatar?.socio?.situation}
                />
              </>
            )}
            {hasM2 && (
              <ContextRow
                icon={<Brain className="h-3.5 w-3.5" />}
                label="Positionnement (M2)"
                value={state.m2_data?.data?.step8?.positionnement || "—"}
              />
            )}
            {hasM3 && (
              <ContextRow
                icon={<Layers className="h-3.5 w-3.5" />}
                label="High-ticket M3"
                value={state.m3_data?.mecanisme?.nom || state.m3_data?.promesse?.slice(0, 60) || "—"}
                sub={state.m3_data?.prix?.montant ? `${state.m3_data.prix.montant}€` : null}
                accent={m3PrixScore != null ? `Score prix moyen : ${m3PrixScore}/100` : null}
              />
            )}
          </div>
        </div>
      )}

      {/* Blocage si M1 manquant */}
      {!hasM1 && (
        <BlockerBanner
          tone="warn"
          icon={<AlertCircle className="h-4 w-4" />}
          title="Le Module 1 doit être terminé en premier."
          body="Le M4 utilise ta sous-niche et ton avatar du M1."
          ctaLabel="Aller au M1"
          ctaHref="/parcours/liberty/m1"
          secondary={{ label: "Voir une démo", onClick: onOpenDemo }}
        />
      )}

      {/* Blocage si M3 manquant */}
      {hasM1 && !hasM3 && (
        <BlockerBanner
          tone="warn"
          icon={<AlertCircle className="h-4 w-4" />}
          title="Le Module 3 (Anatomie d'offre) doit être bouclé."
          body="Le M4 reprend ton high-ticket pré-construit en M3 (promesse + mécanisme + prix). Sans M3, impossible de poser la marche HT proprement."
          ctaLabel="Aller au M3"
          ctaHref="/parcours/liberty/m3"
          secondary={{ label: "Voir une démo", onClick: onOpenDemo }}
        />
      )}

      {/* Sélecteur market_type */}
      {hasM1 && hasM3 && (
        <div className="mb-6">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#C9A84C]">
            Type de marché — pré-rempli depuis M3/M1, ajustable
          </div>
          <div className="flex flex-col gap-2">
            {MARKET_OPTIONS.map((m) => (
              <Option key={m.value} selected={state.market_type === m.value} onClick={() => setMarket(m.value)}>
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
          Démarrer la value ladder
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
        ~45-75 min · 4 étapes · scoring IA sur la stratégie · seuil 80/100 · sauvegarde auto
      </p>
    </div>
  );
}

function ContextRow({
  icon, label, value, sub, accent,
}: {
  icon: ReactNode; label: string; value: string; sub?: string | null; accent?: string | null;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#C9A84C]">
        {icon}
        {label}
      </div>
      <div className="text-[12.5px] leading-[1.5] text-white/85">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-white/40">{sub}</div>}
      {accent && <div className="mt-0.5 text-[11px] font-semibold text-[#C9A84C]">{accent}</div>}
    </div>
  );
}

function BlockerBanner({
  tone, icon, title, body, ctaLabel, ctaHref, secondary,
}: {
  tone: "warn" | "info"; icon: ReactNode; title: string; body: string;
  ctaLabel: string; ctaHref: string; secondary?: { label: string; onClick: () => void };
}) {
  const isWarn = tone === "warn";
  return (
    <div
      className="mb-6 rounded-xl p-4 text-[13px] leading-[1.6]"
      style={{
        background: isWarn ? "rgba(255,180,80,0.06)" : "rgba(201,168,76,0.06)",
        border: `0.5px solid ${isWarn ? "rgba(255,180,80,0.4)" : "rgba(201,168,76,0.4)"}`,
        color: isWarn ? "#FFB450" : "#C9A84C",
      }}
    >
      <div className="flex items-center gap-2 font-semibold">
        {icon}
        {title}
      </div>
      <p className="mt-2 text-white/70">{body}</p>
      <div className="mt-3 flex gap-2">
        <a
          href={ctaHref}
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-bold text-white"
          style={{ background: "linear-gradient(135deg, #C9A84C 0%, #E8C770 100%)", textShadow: "0 1px 2px rgba(0,0,0,0.45)" }}
        >
          {ctaLabel}
          <ArrowRight className="h-3 w-3" />
        </a>
        {secondary && (
          <button
            type="button"
            onClick={secondary.onClick}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-semibold"
            style={{ background: "rgba(255,180,80,0.06)", border: "0.5px solid rgba(255,180,80,0.4)", color: "#FFB450" }}
          >
            <Play className="h-3 w-3" />
            {secondary.label}
          </button>
        )}
      </div>
    </div>
  );
}
