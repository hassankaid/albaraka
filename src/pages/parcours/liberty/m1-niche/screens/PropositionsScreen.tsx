import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, RotateCcw, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  StepEyebrow, StepTitle, StepSub, Btn, LoadingScreen, Actions,
} from "../components/ui";
import { aiPropose3SousNiches } from "../lib/prompts";
import type { M1State, AIProposition } from "../lib/types";

interface PropositionsScreenProps {
  state: M1State;
  setState: (next: (prev: M1State) => M1State) => void;
  onBack: () => void;
  onNext: () => void;
}

export function PropositionsScreen({
  state, setState, onBack, onNext,
}: PropositionsScreenProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-fetch au premier render si propositions vides.
  useEffect(() => {
    if (state.ai_propositions.length === 0 && !loading) {
      void fetchPropositions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchPropositions() {
    setLoading(true);
    setError(null);
    try {
      const propositions = await aiPropose3SousNiches(state);
      if (!propositions || propositions.length === 0) {
        throw new Error("L'IA n'a rien retourné. Réessaie.");
      }
      setState((prev) => ({
        ...prev,
        ai_propositions: propositions,
        selected_proposition: null,
      }));
    } catch (e: any) {
      console.error("[M1 propose3]", e);
      setError(e.message ?? "Erreur de génération.");
      toast.error("L'IA n'a pas répondu. Réessaie.");
    } finally {
      setLoading(false);
    }
  }

  function regenerate() {
    setState((prev) => ({ ...prev, ai_propositions: [], selected_proposition: null }));
    void fetchPropositions();
  }

  function select(i: number) {
    setState((prev) => ({ ...prev, selected_proposition: i }));
  }

  if (loading) {
    return (
      <LoadingScreen
        message="L'IA croise ton vécu avec le marché…"
        hint="~5-15 secondes"
      />
    );
  }

  return (
    <div>
      <StepEyebrow>3 propositions de l'IA</StepEyebrow>
      <StepTitle>Choisis-en une, ou regénère</StepTitle>
      <StepSub>
        L'IA a croisé ton archétype, ton marché, tes 5 niches, tes 5 compétences et ton vécu. Voilà
        3 sous-niches 2.0 candidates.{" "}
        <strong className="text-[#C9A84C]">Aucune n'est un verdict</strong> — ce sont des points de
        départ.
      </StepSub>

      {error && (
        <div
          className="mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-[13px]"
          style={{
            background: "rgba(232,107,107,0.08)",
            border: "0.5px solid rgba(232,107,107,0.4)",
            color: "#E86B6B",
          }}
        >
          <AlertCircle className="h-4 w-4" />
          <span className="flex-1">{error}</span>
          <Btn variant="ghost" onClick={fetchPropositions}>
            <RotateCcw className="h-3.5 w-3.5" />
            Réessayer
          </Btn>
        </div>
      )}

      <div className="space-y-3">
        {state.ai_propositions.map((p, i) => (
          <PropositionCard
            key={i}
            index={i}
            proposition={p}
            selected={state.selected_proposition === i}
            onSelect={() => select(i)}
          />
        ))}
      </div>

      <Actions>
        <Btn variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Btn>
        <div className="flex flex-wrap gap-2">
          <Btn variant="ghost" onClick={regenerate}>
            <RotateCcw className="h-3.5 w-3.5" />
            Regénérer
          </Btn>
          <Btn
            variant="primary"
            disabled={state.selected_proposition === null}
            onClick={onNext}
          >
            Cristalliser cette niche
            <ArrowRight className="h-4 w-4" />
          </Btn>
        </div>
      </Actions>
    </div>
  );
}

interface PropositionCardProps {
  index: number;
  proposition: AIProposition;
  selected: boolean;
  onSelect: () => void;
}

function PropositionCard({ index, proposition, selected, onSelect }: PropositionCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="block w-full rounded-2xl p-5 text-left transition-all"
      style={{
        background: selected ? "#2A2310" : "#14130E",
        border: selected ? "1px solid #C9A84C" : "0.5px solid rgba(201,168,76,0.18)",
        boxShadow: selected
          ? "0 12px 32px rgba(0,0,0,0.4), 0 0 0 1px #C9A84C"
          : "none",
      }}
    >
      <span
        className="mb-2 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em]"
        style={{
          background: "rgba(201,168,76,0.12)",
          color: "#C9A84C",
        }}
      >
        Proposition {index + 1}
      </span>
      <h3 className="mb-3 text-[17px] font-semibold leading-tight tracking-tight text-white">
        {proposition.titre || "—"}
      </h3>
      <CardSection label="👤 Cible" content={proposition.cible} />
      <CardSection label="⚡ Douleur" content={proposition.douleur} />
      <CardSection label="💰 Pouvoir d'achat" content={proposition.pouvoir_achat} />
      <CardSection label="🎯 Pourquoi toi" content={proposition.alignement} />
    </button>
  );
}

function CardSection({ label, content }: { label: string; content: string | undefined }) {
  return (
    <div className="mb-2 last:mb-0">
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#C9A84C]">
        {label}
      </div>
      <div className="mt-1 text-[12px] leading-[1.55] text-white/70">{content || "—"}</div>
    </div>
  );
}
