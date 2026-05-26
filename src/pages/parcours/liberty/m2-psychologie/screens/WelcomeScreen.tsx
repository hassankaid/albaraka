import { ArrowRight, Sparkles, User, Target, TrendingUp, Compass, Play } from "lucide-react";
import type { M2State } from "../lib/types";

interface WelcomeScreenProps {
  state: M2State;
  onStart: () => void;
  onOpenDemo: () => void;
}

/**
 * Écran d'accueil M2 — affiche le contexte importé depuis M1.
 * Si pas d'import M1 disponible (utilisateur n'a pas fini M1), bouton vers M1.
 */
export function WelcomeScreen({ state, onStart, onOpenDemo }: WelcomeScreenProps) {
  const hasM1 = !!state.m1 && state.data.welcome.imported;

  if (!hasM1) {
    return (
      <div className="px-0 pb-4 pt-2 text-center">
        <div
          className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[18px] text-3xl shadow-[0_8px_24px_rgba(201,168,76,0.3)]"
          style={{ background: "linear-gradient(135deg, #C9A84C 0%, #E8C770 100%)" }}
        >
          🧠
        </div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#C9A84C]">
          Module 2 · LIBERTY
        </p>
        <h1 className="mx-auto mb-3 max-w-[520px] text-[26px] font-semibold leading-tight tracking-tight text-white">
          Psychologie de l'acheteur
        </h1>
        <div
          className="mx-auto mb-6 max-w-[520px] rounded-xl p-4 text-left text-[13px] leading-[1.6]"
          style={{
            background: "rgba(255,180,80,0.06)",
            border: "0.5px solid rgba(255,180,80,0.4)",
            color: "#FFB450",
          }}
        >
          <strong>Le Module 1 doit être terminé en premier.</strong>
          <p className="mt-2 text-white/70">
            Le M2 utilise automatiquement ta sous-niche cristallisée, ton avatar incarné et ta
            promesse de transformation issus du M1. Va finir le M1, puis reviens.
          </p>
        </div>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <a
            href="/parcours/liberty/m1"
            className="inline-flex items-center gap-2 rounded-full px-7 py-3 text-[14px] font-bold text-white shadow-[0_12px_32px_rgba(201,168,76,0.45)] transition-all hover:-translate-y-0.5"
            style={{
              background: "linear-gradient(135deg, #C9A84C 0%, #E8C770 100%)",
              textShadow: "0 1px 2px rgba(0,0,0,0.45)",
            }}
          >
            Aller au Module 1 — NICHE
            <ArrowRight className="h-4 w-4" />
          </a>
          <button
            type="button"
            onClick={onOpenDemo}
            className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[12px] font-semibold transition-colors"
            style={{
              background: "rgba(255,180,80,0.06)",
              border: "0.5px solid rgba(255,180,80,0.4)",
              color: "#FFB450",
            }}
          >
            <Play className="h-3.5 w-3.5" />
            Voir une démo guidée
          </button>
        </div>
      </div>
    );
  }

  const m1 = state.m1!;
  const niche = m1.niche.sub_niche || "Sous-niche cristallisée";
  const avatar = m1.avatar.name || "—";
  const promise = m1.promise.statement || "—";
  const market = m1.market || "—";

  return (
    <div className="px-0 pb-2 pt-2">
      <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#C9A84C]">
        <Sparkles className="h-3.5 w-3.5" />
        Contexte du Module 1 importé automatiquement
      </div>
      <h1 className="mb-2 text-[26px] font-semibold leading-tight tracking-tight text-white">
        Cartographie psychologique de {avatar}
      </h1>
      <p className="mb-6 text-[13px] leading-[1.65] text-white/60">
        Pendant les 8 prochaines étapes, tu vas descendre dans le quotidien de{" "}
        <strong className="text-[#C9A84C]">{avatar}</strong> — ses douleurs, ses désirs, les
        preuves qui le rassurent, les biais qui le bloquent — pour produire un{" "}
        <strong className="text-[#C9A84C]">brief stratégique</strong> qui guidera tout le
        copywriting du M3.
      </p>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ContextCard
          icon={<Target className="h-4 w-4" />}
          label="Niche"
          value={niche}
        />
        <ContextCard
          icon={<User className="h-4 w-4" />}
          label="Avatar"
          value={avatar}
          subValue={m1.avatar.age || m1.avatar.location || undefined}
        />
        <ContextCard
          icon={<Compass className="h-4 w-4" />}
          label="Promesse"
          value={promise}
        />
        <ContextCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Type de marché"
          value={
            market === "B2C_INFO"
              ? "B2C · Info (savoir, compétence)"
              : market === "B2C_TRANSFO"
                ? "B2C · Transformation"
                : market === "B2B"
                  ? "B2B"
                  : "—"
          }
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={onStart}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full px-9 py-4 text-[15px] font-bold text-white shadow-[0_12px_32px_rgba(201,168,76,0.45)] transition-all hover:-translate-y-0.5 sm:w-auto"
          style={{
            background: "linear-gradient(135deg, #C9A84C 0%, #E8C770 100%)",
            textShadow: "0 1px 2px rgba(0,0,0,0.45)",
          }}
        >
          Démarrer le mapping psychologique
          <ArrowRight className="h-4 w-4" />
        </button>
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
        ~60-90 min · 8 étapes · sauvegarde auto · évaluation IA par étape
      </p>
    </div>
  );
}

function ContextCard({
  icon, label, value, subValue,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
}) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "#14130E", border: "0.5px solid rgba(201,168,76,0.18)" }}
    >
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#C9A84C]">
        {icon}
        {label}
      </div>
      <div className="text-[13px] leading-[1.5] text-white/90">{value}</div>
      {subValue && <div className="mt-0.5 text-[11px] text-white/40">{subValue}</div>}
    </div>
  );
}
