import type { ReactNode } from "react";
import { ArrowRight, Play, Sparkles, Target, User, Brain, Layers, Compass, AlertCircle } from "lucide-react";
import { Btn } from "../../m1-niche/components/ui";
import { type M5State, pickAvatarName, validationThreshold } from "../lib/types";

interface WelcomeScreenProps {
  state: M5State;
  setState: (next: (prev: M5State) => M5State) => void;
  onStart: () => void;
  onOpenDemo: () => void;
}

export function WelcomeScreen({ state, onStart, onOpenDemo }: WelcomeScreenProps) {
  const hasM1 = !!state.m1_data;
  const hasM2 = !!state.m2_data;
  const hasM3 = !!(state.m3_data && state.m3_data.complete);
  const hasM4 = !!(state.m4_data && state.m4_data.complete);
  const m4Forced = !!state.m4_data?.strategy_score_is_forced;
  const threshold = validationThreshold(state);

  const canStart = hasM1 && hasM3 && hasM4;
  const avatar = pickAvatarName(state);
  const m4Strategy = state.m4_data?.entry_strategy_label
    || state.m4_data?.entry_strategy
    || "—";
  const htMonthly = state.m4_data?.ht_monthly_target ?? "—";
  const htName = state.m4_data?.ht?.name ?? state.m3_data?.hero_mecanisme_nom ?? "—";
  const htPrice = state.m4_data?.ht?.price ?? state.m3_data?.prix_display ?? "—";

  return (
    <div className="px-0 pb-2 pt-2">
      <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#C9A84C]">
        <Sparkles className="h-3.5 w-3.5" />
        Module 5 · High-Ticket
      </div>
      <h1 className="mb-2 text-[26px] font-semibold leading-tight tracking-tight text-white">
        {hasM1 ? `Audit High-Ticket pour ${avatar}` : "Audit High-Ticket"}
      </h1>
      <p className="mb-6 max-w-[640px] text-[13px] leading-[1.65] text-white/60">
        Un HT crédible se construit en <strong className="text-[#C9A84C]">5 audits</strong> : le pont (point A → B) ·
        les 4 conditions Hormozi (simple/rapide/systématique/aspirante) · eat-the-complexity (tu manges, le client digère) ·
        structure 12 semaines/90 jours · conviction interne. Ton offre M3+M4 va être stress-testée à l'os.
      </p>

      {/* Bandeau forced si M4 a été forcé */}
      {m4Forced && (
        <div
          className="mb-5 rounded-xl p-4 text-[13px] leading-[1.55]"
          style={{
            background: "rgba(255,180,80,0.06)",
            border: "0.5px solid rgba(255,180,80,0.4)",
            color: "#FFB450",
          }}
        >
          <div className="mb-1 flex items-center gap-2 font-semibold">
            <AlertCircle className="h-4 w-4" />
            Ta stratégie M4 a été forcée
          </div>
          <p className="text-white/70">
            Tu as forcé la validation de M4 (Value Ladder) au-delà du seuil normal. M5 compense en montant
            le seuil de validation à <strong className="text-[#FFB450]">{threshold}/100</strong> (au lieu de 80) sur
            chacune des 5 étapes. C'est le mécanisme pédagogique : si tu as triché plus haut, tu travailles plus dur ici.
          </p>
        </div>
      )}

      {/* Bloc contextes importés */}
      {(hasM1 || hasM2 || hasM3 || hasM4) && (
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
              <ContextRow
                icon={<Target className="h-3.5 w-3.5" />}
                label="Niche (M1)"
                value={state.m1_data?.sous_niche_2?.phrase_finale || state.m1_data?.sous_niche_2?.phrase || "—"}
              />
            )}
            {hasM1 && (
              <ContextRow
                icon={<User className="h-3.5 w-3.5" />}
                label={`Avatar (M1)`}
                value={avatar}
                sub={state.m1_data?.avatar?.socio?.situation}
              />
            )}
            {hasM2 && (
              <ContextRow
                icon={<Brain className="h-3.5 w-3.5" />}
                label="Douleur dominante (M2)"
                value={state.m2_data?.data?.dominant_pain || state.m2_data?.data?.step8?.hook_principal || "—"}
              />
            )}
            {hasM3 && (
              <ContextRow
                icon={<Layers className="h-3.5 w-3.5" />}
                label="High-ticket M3"
                value={htName}
                sub={htPrice ? `${htPrice}` : null}
                accent={state.m3_data?.prix_score_global != null ? `Score prix moyen : ${state.m3_data.prix_score_global}/100` : null}
              />
            )}
            {hasM4 && (
              <ContextRow
                icon={<Compass className="h-3.5 w-3.5" />}
                label="Stratégie d'entrée (M4)"
                value={String(m4Strategy)}
                sub={`Cible HT/mois : ${htMonthly}`}
                accent={state.m4_data?.strategy_score != null ? `Score stratégie : ${state.m4_data.strategy_score}/100${m4Forced ? " (forcé)" : ""}` : null}
              />
            )}
          </div>
        </div>
      )}

      {/* Bloqueurs */}
      {!hasM1 && (
        <BlockerBanner
          icon={<AlertCircle className="h-4 w-4" />}
          title="Le Module 1 doit être terminé en premier."
          body="Le M5 utilise ta sous-niche et ton avatar du M1."
          ctaLabel="Aller au M1"
          ctaHref="/parcours/liberty/m1"
          secondary={{ label: "Voir une démo", onClick: onOpenDemo }}
        />
      )}
      {hasM1 && !hasM3 && (
        <BlockerBanner
          icon={<AlertCircle className="h-4 w-4" />}
          title="Le Module 3 (Anatomie d'offre) doit être bouclé."
          body="Le M5 audite le HT pré-construit en M3."
          ctaLabel="Aller au M3"
          ctaHref="/parcours/liberty/m3"
          secondary={{ label: "Voir une démo", onClick: onOpenDemo }}
        />
      )}
      {hasM1 && hasM3 && !hasM4 && (
        <BlockerBanner
          icon={<AlertCircle className="h-4 w-4" />}
          title="Le Module 4 (Value Ladder) doit être signé."
          body="Le M5 consomme ta stratégie d'entrée et ta cible HT mensuelle du M4."
          ctaLabel="Aller au M4"
          ctaHref="/parcours/liberty/m4"
          secondary={{ label: "Voir une démo", onClick: onOpenDemo }}
        />
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Btn variant="cta" disabled={!canStart} onClick={onStart} className="w-full sm:w-auto">
          Démarrer l'audit High-Ticket
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
        ~75-120 min · 5 étapes IA scorées · seuil {threshold}/100{m4Forced ? " (M4 forcé)" : ""} · sauvegarde auto
      </p>
    </div>
  );
}

function ContextRow({
  icon, label, value, sub, accent,
}: { icon: ReactNode; label: string; value: string; sub?: string | null; accent?: string | null }) {
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
  icon, title, body, ctaLabel, ctaHref, secondary,
}: {
  icon: ReactNode; title: string; body: string; ctaLabel: string; ctaHref: string;
  secondary?: { label: string; onClick: () => void };
}) {
  return (
    <div
      className="mb-6 rounded-xl p-4 text-[13px] leading-[1.6]"
      style={{
        background: "rgba(255,180,80,0.06)",
        border: "0.5px solid rgba(255,180,80,0.4)",
        color: "#FFB450",
      }}
    >
      <div className="flex items-center gap-2 font-semibold">{icon}{title}</div>
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
