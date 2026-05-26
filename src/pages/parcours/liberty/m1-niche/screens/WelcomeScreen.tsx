import { useState } from "react";
import { ArrowRight, ArrowLeft, Play, Compass, Target, RotateCcw } from "lucide-react";
import type { M1State } from "../lib/types";

interface WelcomeScreenProps {
  state: M1State;
  onChooseBranch: (branch: "A" | "B") => void;
  onOpenDemo: () => void;
  onResume: () => void;
  onRestart: () => void;
}

type LocalView = "intro" | "gate";

/**
 * Écran d'accueil + porte d'entrée (3 cards : Démo / Branche A / Branche B).
 * Replique le flow `renderWelcome` → `goTo('gate')` du HTML standalone.
 */
export function WelcomeScreen({
  state,
  onChooseBranch,
  onOpenDemo,
  onResume,
  onRestart,
}: WelcomeScreenProps) {
  const [view, setView] = useState<LocalView>("intro");

  // Détection d'une session en cours : state.step !== "welcome" ou champs remplis.
  const hasOngoingSession =
    state.branch !== null ||
    state.step !== "welcome" ||
    state.bilan.vecu.length > 0 ||
    state.capture.idee.length > 0;

  if (view === "intro") {
    return (
      <div className="px-0 pb-2 pt-4 text-center">
        <div
          className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[18px] text-3xl shadow-[0_8px_24px_rgba(201,168,76,0.3)]"
          style={{
            background:
              "linear-gradient(135deg, #C9A84C 0%, #E8C770 100%)",
          }}
        >
          🎯
        </div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#C9A84C]">
          Module 1 · LIBERTY
        </p>
        <h1
          className="mx-auto mb-3 max-w-[520px] text-[26px] font-semibold leading-tight tracking-tight"
          style={{ color: "#FFFFFF" }}
        >
          Ta Sous-Niche 2.0
        </h1>
        <p className="mx-auto mb-6 max-w-[560px] text-[13px] leading-[1.65] text-white/60">
          À la fin de ce module, tu auras{" "}
          <strong className="font-medium text-[#C9A84C]">une niche cristallisée</strong>, un{" "}
          <strong className="font-medium text-[#C9A84C]">avatar client incarné</strong>, et une{" "}
          <strong className="font-medium text-[#C9A84C]">phrase pivot</strong> qui guideront tous les
          modules suivants. Pas de scoring algorithmique, pas de verdict d'IA.{" "}
          <strong className="font-medium text-[#C9A84C]">Tu es le produit</strong> — l'IA t'aide à
          formuler ce qui est déjà en toi.
        </p>

        {hasOngoingSession && (
          <div
            className="mx-auto mb-5 max-w-[560px] rounded-xl p-4 text-left text-[12px] leading-[1.55]"
            style={{
              background: "rgba(201,168,76,0.06)",
              border: "0.5px solid rgba(201,168,76,0.4)",
            }}
          >
            <div className="mb-2 text-white/80">
              💾 Une session précédente a été retrouvée à l'étape{" "}
              <strong className="text-[#C9A84C]">{labelForStep(state.step)}</strong>.
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onResume}
                className="rounded-full px-4 py-1.5 text-[12px] font-semibold text-white transition-colors hover:brightness-110"
                style={{
                  background: "linear-gradient(135deg, #C9A84C 0%, #E8C770 100%)",
                }}
              >
                Reprendre où j'en étais
              </button>
              <button
                type="button"
                onClick={onRestart}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium text-white/50 transition-colors hover:text-white"
                style={{
                  background: "transparent",
                  border: "0.5px solid rgba(255,255,255,0.15)",
                }}
              >
                <RotateCcw className="h-3 w-3" />
                Recommencer à zéro
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setView("gate")}
          className="inline-flex items-center gap-2 rounded-full px-9 py-4 text-[15px] font-bold text-white shadow-[0_12px_32px_rgba(201,168,76,0.45)] transition-all hover:-translate-y-0.5"
          style={{
            background: "linear-gradient(135deg, #C9A84C 0%, #E8C770 100%)",
            textShadow: "0 1px 2px rgba(0,0,0,0.45)",
          }}
        >
          Commencer
          <ArrowRight className="h-4 w-4" />
        </button>
        <p className="mt-3.5 text-[11px] text-white/30">
          ~45-90 min selon ton point de départ · sauvegarde auto
        </p>
      </div>
    );
  }

  // ════ View "gate" ════════════════════════════════════════════════════════
  return (
    <div className="px-0 pb-2">
      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#C9A84C]">
        Avant de commencer
      </span>
      <h2 className="mb-2 text-[22px] font-semibold leading-tight tracking-tight text-white">
        Trois façons d'attaquer ce module
      </h2>
      <p className="mb-6 max-w-[580px] text-[13px] leading-[1.6] text-white/60">
        Découvre l'outil avec un cas réel pré-rempli, ou lance-toi directement sur ton propre
        parcours. Sois honnête avec toi-même — c'est ce qui va décider de la qualité du M1.
      </p>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <GateCard
          variant="demo"
          emoji="🎬"
          icon={<Play className="h-4 w-4" />}
          title="Démo guidée"
          desc="Je découvre l'outil sur un cas réel pré-rempli (10 niches au choix) — je peux explorer, lire, éditer, m'entraîner. Sans toucher à mon vrai parcours."
          time="Exploration libre · ~15 min"
          onClick={onOpenDemo}
        />
        <GateCard
          variant="primary"
          emoji="🧭"
          icon={<Compass className="h-4 w-4" />}
          title="Je me cherche"
          desc="J'ai des passions, des compétences, du vécu — mais je ne sais pas quoi vendre. J'ai besoin d'explorer et de découvrir ma vraie niche."
          time="Bilan + Brainstorm + IA · ~75 min"
          onClick={() => onChooseBranch("A")}
        />
        <GateCard
          variant="primary"
          emoji="🎯"
          icon={<Target className="h-4 w-4" />}
          title="J'ai déjà mon idée"
          desc="Je sais exactement dans quel domaine je veux créer mon offre. J'ai juste besoin de la cristalliser et de la stress-tester."
          time="Capture + Stress-test · ~45 min"
          onClick={() => onChooseBranch("B")}
        />
      </div>

      <div className="mt-6 flex items-center justify-center">
        <button
          type="button"
          onClick={() => setView("intro")}
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-medium transition-colors"
          style={{
            background: "rgba(201,168,76,0.06)",
            border: "0.5px solid rgba(201,168,76,0.4)",
            color: "#C9A84C",
          }}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour
        </button>
      </div>
    </div>
  );
}

// ─── Sub-component : GateCard ────────────────────────────────────────────────
interface GateCardProps {
  variant: "primary" | "demo";
  emoji: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  time: string;
  onClick: () => void;
}

function GateCard({ variant, emoji, title, desc, time, onClick }: GateCardProps) {
  const isDemo = variant === "demo";
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-[210px] flex-col gap-2.5 rounded-2xl p-6 text-left transition-all hover:-translate-y-0.5"
      style={{
        background: isDemo
          ? "linear-gradient(160deg, rgba(255,180,80,0.04), rgba(8,8,8,0))"
          : "#14130E",
        border: isDemo
          ? "0.5px solid rgba(255,180,80,0.35)"
          : "0.5px solid rgba(201,168,76,0.18)",
        boxShadow: "0 0 0 transparent",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = isDemo ? "#FFB450" : "#C9A84C";
        e.currentTarget.style.boxShadow = isDemo
          ? "0 12px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,180,80,0.5)"
          : "0 12px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(201,168,76,0.4)";
        if (!isDemo) e.currentTarget.style.background = "#1A180F";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = isDemo
          ? "rgba(255,180,80,0.35)"
          : "rgba(201,168,76,0.18)";
        e.currentTarget.style.boxShadow = "0 0 0 transparent";
        if (!isDemo) e.currentTarget.style.background = "#14130E";
      }}
    >
      <div className="text-3xl leading-none">{emoji}</div>
      <h3 className="text-[17px] font-semibold leading-tight tracking-tight text-white">
        {title}
      </h3>
      <p className="flex-1 text-[12px] leading-[1.6] text-white/60">{desc}</p>
      <p
        className="text-[10px] font-semibold uppercase tracking-[0.1em]"
        style={{ color: isDemo ? "#FFB450" : "#C9A84C" }}
      >
        {time}
      </p>
    </button>
  );
}

function labelForStep(step: M1State["step"]): string {
  switch (step) {
    case "welcome":
      return "Accueil";
    case "branchA_bilan":
      return "Bilan d'orientation";
    case "branchA_brainstorm":
      return "Brainstorm";
    case "branchA_propositions":
      return "3 propositions IA";
    case "branchB_capture":
      return "Capture de l'idée";
    case "branchB_stress":
      return "Stress test";
    case "sous_niche_2":
      return "Sous-niche 2.0";
    case "avatar":
      return "Avatar client";
    case "validation":
      return "Validation";
    case "engagement":
      return "Engagement signé";
    case "recap":
      return "Récapitulatif";
    default:
      return step;
  }
}
