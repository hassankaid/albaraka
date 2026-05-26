import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  StepEyebrow, StepTitle, StepSub, InputLabel, TextArea, Btn, Actions,
} from "../components/ui";
import type { M1State, ValidationState } from "../lib/types";

interface ValidationScreenProps {
  state: M1State;
  setState: (next: (prev: M1State) => M1State) => void;
  onBack: () => void;
  onNext: () => void;
}

interface SectionDef {
  title: string;
  questions: { key: keyof ValidationState; label: string }[];
}

const SECTIONS: SectionDef[] = [
  {
    title: "📊 Demande — est-ce que les gens veulent ce que tu proposes ?",
    questions: [
      {
        key: "demande_q1",
        label:
          "Est-ce que les gens cherchent déjà des produits ou services similaires en ligne ? Donne 2-3 exemples concrets.",
      },
      {
        key: "demande_q2",
        label:
          "Y a-t-il beaucoup de gens intéressés par ce que tu vas proposer ? Comment tu le sais ?",
      },
    ],
  },
  {
    title: "⚔️ Concurrence — y a-t-il de la place pour toi ?",
    questions: [
      {
        key: "concurrence_q1",
        label: "Liste 3 concurrents qui vendent à 1000€+ sur ta niche (ou très proche).",
      },
      {
        key: "concurrence_q2",
        label:
          "Est-ce qu'il y a déjà beaucoup d'autres entreprises qui proposent EXACTEMENT la même chose que toi ?",
      },
    ],
  },
  {
    title: "🌱 Pérennité — est-ce que ça va durer ?",
    questions: [
      {
        key: "perennite_q1",
        label: "Est-ce que les gens vont toujours vouloir ce que tu proposes dans 5 ans ?",
      },
      {
        key: "perennite_q2",
        label:
          "Quels événements pourraient affecter cette niche ? (régulation, mode, IA, démographie...)",
      },
      {
        key: "perennite_q3",
        label: "Est-ce difficile pour d'autres personnes de faire ce que tu fais ? Pourquoi ?",
      },
    ],
  },
  {
    title: "🎯 Alignement — est-ce que ça te correspond ?",
    questions: [
      {
        key: "alignement_q1",
        label: "Est-ce que tu aimes vraiment travailler avec ce type de personnes ?",
      },
      {
        key: "alignement_q2",
        label: "Est-ce que cette niche correspond à tes objectifs de vie sur 3-5 ans ?",
      },
      {
        key: "alignement_q3",
        label: "Quelle expérience concrète tu as déjà dans ce domaine ?",
      },
    ],
  },
];

export function ValidationScreen({ state, setState, onBack, onNext }: ValidationScreenProps) {
  const set = (key: keyof ValidationState, val: string) =>
    setState((prev) => ({ ...prev, validation: { ...prev.validation, [key]: val } }));

  const allKeys = SECTIONS.flatMap((s) => s.questions.map((q) => q.key));
  const filled = allKeys.filter((k) => (state.validation[k] ?? "").length >= 10).length;
  const total = allKeys.length;
  const canNext = filled === total;

  return (
    <div>
      <StepEyebrow>Validation finale</StepEyebrow>
      <StepTitle>Regarde ta niche en face</StepTitle>
      <StepSub>
        10 questions sur 4 axes. <strong className="text-[#C9A84C]">Pas de score automatique.</strong>{" "}
        Tu réponds toi-même, tu vois si ça tient ou pas. C'est ton intégrité qui valide.
      </StepSub>

      {SECTIONS.map((s) => (
        <div key={s.title} className="mb-6">
          <h3 className="mb-3 text-[13px] font-semibold leading-tight text-white">{s.title}</h3>
          <div className="space-y-3">
            {s.questions.map((q) => (
              <div key={q.key}>
                <InputLabel>{q.label}</InputLabel>
                <TextArea
                  rows={2}
                  value={state.validation[q.key]}
                  onChange={(e) => set(q.key, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      <Actions>
        <Btn variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Btn>
        <Btn variant="primary" disabled={!canNext} onClick={onNext}>
          Verrouiller ma niche
          <ArrowRight className="h-4 w-4" />
        </Btn>
      </Actions>
      <p className="mt-2 text-right text-[11px] text-white/40">
        {filled}/{total} questions complétées{canNext ? " ✓" : ""}
      </p>
    </div>
  );
}
