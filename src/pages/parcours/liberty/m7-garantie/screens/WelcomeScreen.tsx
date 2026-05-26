import type { ReactNode } from "react";
import { ArrowRight, Play, Sparkles, Target, User, Brain, Layers, ShieldCheck, AlertCircle } from "lucide-react";
import { Btn } from "../../m1-niche/components/ui";
import { type M7State, pickAvatarName, pickHTName, pickHTPrice, pickPointB, validationThreshold } from "../lib/types";

interface WelcomeScreenProps {
  state: M7State;
  setState: (next: (prev: M7State) => M7State) => void;
  onStart: () => void;
  onOpenDemo: () => void;
}

export function WelcomeScreen({ state, onStart, onOpenDemo }: WelcomeScreenProps) {
  const hasM1 = !!state.m1_data;
  const hasM2 = !!state.m2_data;
  const hasM3 = !!(state.m3_data && state.m3_data.complete);
  const hasM4 = !!(state.m4_data && state.m4_data.complete);
  const hasM5 = !!(state.m5_data && state.m5_data.complete);
  const hasM6 = !!(state.m6_data && state.m6_data.complete);
  const upstreamForced = !!state.upstream_forced;
  const threshold = validationThreshold(state);

  const canStart = hasM1 && hasM3 && hasM4 && hasM5 && hasM6;
  const avatar = pickAvatarName(state);
  const htName = pickHTName(state);
  const htPrice = pickHTPrice(state);
  const pointB = pickPointB(state);
  const m4Strategy = state.m4_data?.entry_strategy ?? "—";
  const m6Avg = state.m6_data?.handoff_to_m7?.avg_score ?? null;

  return (
    <div className="px-0 pb-2 pt-2">
      <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#C9A84C]">
        <ShieldCheck className="h-3.5 w-3.5" />
        Module 7 · Garantie
      </div>
      <h1 className="mb-2 text-[26px] font-semibold leading-tight tracking-tight text-white">
        {hasM1 ? `Garantie pour ${avatar}` : "Construction de la garantie"}
      </h1>
      <p className="mb-6 max-w-[640px] text-[13px] leading-[1.65] text-white/60">
        Une garantie qui inverse le risque = +20 à +50% de conversion. 6 étapes pour construire une garantie{" "}
        <strong className="text-[#C9A84C]">crédible</strong>,{" "}
        <strong className="text-[#C9A84C]">défendable</strong> et{" "}
        <strong className="text-[#C9A84C]">économiquement viable</strong>. L'IA détecte 12 anti-cheats classiques
        (« satisfait ou remboursé », delta négatif, T&C vide…).
      </p>

      {upstreamForced && (
        <div
          className="mb-5 rounded-xl p-4 text-[13px] leading-[1.55]"
          style={{ background: "rgba(201,138,76,0.08)", border: "0.5px solid #c98a4c", color: "#e8c9a0" }}
        >
          <div className="mb-1 flex items-center gap-2 font-semibold">
            <AlertCircle className="h-4 w-4" />
            Stratégie M4/M5/M6 forcée en amont
          </div>
          <p className="text-white/70">
            L'un des modules précédents a été forcé. M7 monte le seuil de validation à
            <strong className="text-[#e8c9a0]"> {threshold}/100</strong> sur chacune des 6 étapes pour compenser.
          </p>
        </div>
      )}

      {(hasM1 || hasM2 || hasM3 || hasM4 || hasM5 || hasM6) && (
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
              <ContextRow icon={<User className="h-3.5 w-3.5" />} label="Avatar (M1)" value={avatar} sub={state.m1_data?.avatar?.socio?.situation} />
            )}
            {hasM1 && (
              <ContextRow icon={<Target className="h-3.5 w-3.5" />} label="Niche (M1)" value={state.m1_data?.sous_niche_2?.phrase_finale || state.m1_data?.sous_niche_2?.phrase || "—"} />
            )}
            {hasM2 && (
              <ContextRow icon={<Brain className="h-3.5 w-3.5" />} label="Douleur (M2)" value={state.m2_data?.data?.dominant_pain || "—"} />
            )}
            {hasM3 && (
              <ContextRow icon={<Layers className="h-3.5 w-3.5" />} label="HT M3/M4" value={htName} sub={htPrice} />
            )}
            {hasM4 && (
              <ContextRow icon={<Sparkles className="h-3.5 w-3.5" />} label="Stratégie d'entrée (M4)" value={String(m4Strategy)} sub={state.m4_data?.ht_monthly_target ? `Cible HT/mois : ${state.m4_data.ht_monthly_target}` : null} />
            )}
            {hasM5 && pointB && (
              <ContextRow
                icon={<ShieldCheck className="h-3.5 w-3.5" />}
                label="Point B (M5)"
                value={pointB.measurable || pointB.text}
                sub={`Délai : ${pointB.days} jours`}
                accent="Pré-rempli en étape Promesse"
              />
            )}
            {hasM6 && m6Avg != null && (
              <ContextRow
                icon={<Sparkles className="h-3.5 w-3.5" />}
                label="Audit M6 (pricing)"
                value={`Score moyen : ${m6Avg}/100`}
                sub={state.m6_data?.handoff_to_m7?.pitch_fractionnement ? "Pitch fractionnement importé" : null}
              />
            )}
          </div>
        </div>
      )}

      {/* Bloqueurs */}
      {!hasM1 && (
        <BlockerBanner title="Le Module 1 doit être terminé." body="Le M7 utilise ton avatar et ta niche du M1." cta="Aller au M1" href="/parcours/liberty/m1" demo={onOpenDemo} />
      )}
      {hasM1 && !hasM3 && (
        <BlockerBanner title="Le Module 3 doit être bouclé." body="Le M7 prend ta promesse HT du M3." cta="Aller au M3" href="/parcours/liberty/m3" demo={onOpenDemo} />
      )}
      {hasM1 && hasM3 && !hasM4 && (
        <BlockerBanner title="Le Module 4 doit être signé." body="Le M7 a besoin de ta stratégie d'entrée M4." cta="Aller au M4" href="/parcours/liberty/m4" demo={onOpenDemo} />
      )}
      {hasM1 && hasM3 && hasM4 && !hasM5 && (
        <BlockerBanner title="Le Module 5 doit être signé." body="Le M7 importe ton Point B (résultat mesurable) du M5." cta="Aller au M5" href="/parcours/liberty/m5" demo={onOpenDemo} />
      )}
      {hasM1 && hasM3 && hasM4 && hasM5 && !hasM6 && (
        <BlockerBanner title="Le Module 6 doit être signé." body="Le M7 consomme le handoff_to_m7 (prix HT + paiements + pitch fractionnement) du M6." cta="Aller au M6" href="/parcours/liberty/m6" demo={onOpenDemo} />
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Btn variant="cta" disabled={!canStart} onClick={onStart} className="w-full sm:w-auto">
          Démarrer la construction garantie
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
        ~45-75 min · 6 étapes IA scorées · seuil {threshold}/100{upstreamForced ? " (upstream forcé)" : ""} · sauvegarde auto
      </p>
    </div>
  );
}

function ContextRow({ icon, label, value, sub, accent }: { icon: ReactNode; label: string; value: string; sub?: string | null; accent?: string | null }) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#C9A84C]">
        {icon}{label}
      </div>
      <div className="text-[12.5px] leading-[1.5] text-white/85">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-white/40">{sub}</div>}
      {accent && <div className="mt-0.5 text-[11px] font-semibold text-[#C9A84C]">{accent}</div>}
    </div>
  );
}

function BlockerBanner({ title, body, cta, href, demo }: { title: string; body: string; cta: string; href: string; demo: () => void }) {
  return (
    <div
      className="mb-6 rounded-xl p-4 text-[13px] leading-[1.6]"
      style={{ background: "rgba(255,180,80,0.06)", border: "0.5px solid rgba(255,180,80,0.4)", color: "#FFB450" }}
    >
      <div className="flex items-center gap-2 font-semibold"><AlertCircle className="h-4 w-4" />{title}</div>
      <p className="mt-2 text-white/70">{body}</p>
      <div className="mt-3 flex gap-2">
        <a href={href} className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-bold text-white"
          style={{ background: "linear-gradient(135deg, #C9A84C 0%, #E8C770 100%)", textShadow: "0 1px 2px rgba(0,0,0,0.45)" }}>
          {cta}<ArrowRight className="h-3 w-3" />
        </a>
        <button type="button" onClick={demo} className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-semibold"
          style={{ background: "rgba(255,180,80,0.06)", border: "0.5px solid rgba(255,180,80,0.4)", color: "#FFB450" }}>
          <Play className="h-3 w-3" />Voir une démo
        </button>
      </div>
    </div>
  );
}
