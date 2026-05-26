import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  StepEyebrow, StepTitle, StepSub, InputBlock, InputLabel, InputHelper,
  TextInput, TextArea, Btn, Option, Card, Actions,
} from "../components/ui";
import { HintBtn } from "../components/HintBtn";
import { ARCHETYPES, MARCHES, type Archetype, type Marche } from "../lib/bilan-options";
import type { M1State } from "../lib/types";

interface BilanScreenProps {
  state: M1State;
  setState: (next: (prev: M1State) => M1State) => void;
  onBack: () => void;
  onNext: () => void;
}

type SubStep = "archetype" | "marche" | "sous_segment" | "vecu" | "competence" | "recap";
const ORDER: SubStep[] = ["archetype", "marche", "sous_segment", "vecu", "competence", "recap"];

const TITLES: Record<SubStep, { title: string; sub: string }> = {
  archetype: {
    title: "Quel est ton archétype dominant ?",
    sub: "Choisis celui qui te correspond le plus, intuitivement. Pas la version idéalisée — la version réelle.",
  },
  marche: {
    title: "Quel marché core te parle le plus ?",
    sub: "Le e-learning a 3 marchés principaux. Lequel résonne avec toi ?",
  },
  sous_segment: {
    title: "Précise le sous-segment",
    sub: "Dans ce marché, où te sens-tu le plus à l'aise ?",
  },
  vecu: {
    title: "Ton vécu transformateur",
    sub: "En 2-3 phrases : qu'as-tu traversé personnellement qui t'a fait passer d'un état à un autre ? Burn-out, rupture, transformation physique, reconversion réussie, etc. Sois précis.",
  },
  competence: {
    title: "Ta compétence centrale",
    sub: "En 1-2 phrases : qu'est-ce que tu sais faire mieux que 90% des gens ? Pas une qualité abstraite — une compétence opérationnelle.",
  },
  recap: {
    title: "Récap de ton Bilan",
    sub: "Voilà ce que tu m'as dit. Continue si c'est juste, ou reviens en arrière pour modifier.",
  },
};

export function BilanScreen({ state, setState, onBack, onNext }: BilanScreenProps) {
  // bilan_step est persisté dans le state global pour reprise exacte au reload.
  const subIdx = Math.max(0, Math.min(ORDER.length - 1, state.bilan_step ?? 0));
  const setSubIdx = (next: number | ((prev: number) => number)) => {
    setState((prev) => {
      const cur = prev.bilan_step ?? 0;
      const val = typeof next === "function" ? (next as (p: number) => number)(cur) : next;
      return { ...prev, bilan_step: Math.max(0, Math.min(ORDER.length - 1, val)) };
    });
  };

  const sub = ORDER[subIdx];
  const meta = TITLES[sub];

  const selectArchetype = (a: Archetype) => {
    setState((prev) => ({
      ...prev,
      bilan: { ...prev.bilan, archetype: { id: a.id, emoji: a.emoji, label: a.label } },
      bilan_step: 1,
    }));
  };

  const selectMarche = (m: Marche) => {
    setState((prev) => ({
      ...prev,
      bilan: { ...prev.bilan, marche: { id: m.id, label: m.label, sous_segment: "" } },
      bilan_step: 2,
    }));
  };

  const selectSousSegment = (label: string) => {
    setState((prev) => ({
      ...prev,
      bilan: {
        ...prev.bilan,
        marche: prev.bilan.marche ? { ...prev.bilan.marche, sous_segment: label } : null,
      },
      bilan_step: 3,
    }));
  };

  const setVecu = (val: string) => {
    setState((prev) => ({ ...prev, bilan: { ...prev.bilan, vecu: val } }));
  };
  const setCompetence = (val: string) => {
    setState((prev) => ({ ...prev, bilan: { ...prev.bilan, competence: val } }));
  };

  // canNext
  let canNext = false;
  if (sub === "archetype") canNext = !!state.bilan.archetype;
  else if (sub === "marche") canNext = !!state.bilan.marche;
  else if (sub === "sous_segment") canNext = !!state.bilan.marche?.sous_segment;
  else if (sub === "vecu") canNext = (state.bilan.vecu ?? "").length >= 30;
  else if (sub === "competence") canNext = (state.bilan.competence ?? "").length >= 15;
  else canNext = true;

  const handleNext = () => {
    if (sub === "recap") onNext();
    else setSubIdx((i) => Math.min(i + 1, ORDER.length - 1));
  };
  const handlePrev = () => {
    if (subIdx === 0) onBack();
    else setSubIdx((i) => Math.max(0, i - 1));
  };

  return (
    <div>
      <StepEyebrow>Bilan d'orientation · {subIdx + 1}/{ORDER.length}</StepEyebrow>
      <StepTitle>{meta.title}</StepTitle>
      <StepSub>{meta.sub}</StepSub>

      {sub === "archetype" && (
        <div className="flex flex-col gap-1.5">
          {ARCHETYPES.map((a) => (
            <Option
              key={a.id}
              selected={state.bilan.archetype?.id === a.id}
              onClick={() => selectArchetype(a)}
            >
              <span className="flex items-center gap-3">
                <span className="text-xl">{a.emoji}</span>
                <span className="flex flex-col">
                  <span className="font-semibold">{a.label}</span>
                  <span className="text-[11px] text-white/40 leading-snug">{a.desc}</span>
                </span>
              </span>
            </Option>
          ))}
        </div>
      )}

      {sub === "marche" && (
        <div className="flex flex-col gap-1.5">
          {MARCHES.map((m) => (
            <Option
              key={m.id}
              selected={state.bilan.marche?.id === m.id}
              onClick={() => selectMarche(m)}
            >
              <span className="font-semibold">{m.label}</span>
            </Option>
          ))}
        </div>
      )}

      {sub === "sous_segment" && (
        <>
          {!state.bilan.marche && (
            <p className="text-[13px] text-amber-400">
              Reviens en arrière, tu n'as pas encore choisi de marché.
            </p>
          )}
          {state.bilan.marche?.id === "autre" && (
            <InputBlock>
              <InputLabel>Décris ton domaine en quelques mots</InputLabel>
              <TextInput
                value={state.bilan.marche.sous_segment ?? ""}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    bilan: {
                      ...prev.bilan,
                      marche: prev.bilan.marche
                        ? { ...prev.bilan.marche, sous_segment: e.target.value }
                        : null,
                    },
                  }))
                }
                placeholder="Ex : Calligraphie islamique, Cake design, Programmation jeux vidéo…"
              />
              <InputHelper>Sois précis — c'est ce qui orientera l'IA.</InputHelper>
            </InputBlock>
          )}
          {state.bilan.marche && state.bilan.marche.id !== "autre" && (
            <div className="flex flex-col gap-1.5">
              {MARCHES.find((m) => m.id === state.bilan.marche?.id)?.sous.map((s) => (
                <Option
                  key={s}
                  selected={state.bilan.marche?.sous_segment === s}
                  onClick={() => selectSousSegment(s)}
                >
                  {s}
                </Option>
              ))}
            </div>
          )}
        </>
      )}

      {sub === "vecu" && (
        <InputBlock>
          <InputLabel>
            Ton vécu transformateur
            <HintBtn hintKey="bilan_vecu" />
          </InputLabel>
          <TextArea
            rows={4}
            value={state.bilan.vecu}
            onChange={(e) => setVecu(e.target.value)}
            placeholder="Ex : J'ai vécu un burn-out parental pendant 2 ans après la naissance de mon 2e enfant. J'ai mis en place une méthode Montessori adaptée à la maison qui m'a permis de retrouver l'équilibre en 90 jours."
          />
          <InputHelper>
            Un vécu transformateur authentique est ta plus grande force. Pas d'inventions.
          </InputHelper>
          <InputHelper intent={state.bilan.vecu.length >= 30 ? "neutral" : "warning"}>
            {state.bilan.vecu.length}/30 caractères min.
          </InputHelper>
        </InputBlock>
      )}

      {sub === "competence" && (
        <InputBlock>
          <InputLabel>
            Ta compétence centrale
            <HintBtn hintKey="bilan_competence" />
          </InputLabel>
          <TextArea
            rows={3}
            value={state.bilan.competence}
            onChange={(e) => setCompetence(e.target.value)}
            placeholder="Ex : Je maîtrise la pédagogie Montessori adaptée au domicile + les outils de gestion émotionnelle des enfants 2-10 ans."
          />
          <InputHelper>
            Sois opérationnel : "Je sais faire X" plutôt que "Je suis empathique".
          </InputHelper>
          <InputHelper intent={state.bilan.competence.length >= 15 ? "neutral" : "warning"}>
            {state.bilan.competence.length}/15 caractères min.
          </InputHelper>
        </InputBlock>
      )}

      {sub === "recap" && (
        <Card>
          <div className="flex flex-col gap-3 text-[13px] leading-[1.6]">
            <div>
              <strong className="text-[#C9A84C]">Archétype :</strong>{" "}
              {state.bilan.archetype
                ? `${state.bilan.archetype.emoji} ${state.bilan.archetype.label}`
                : "—"}
            </div>
            <div>
              <strong className="text-[#C9A84C]">Marché :</strong>{" "}
              {state.bilan.marche
                ? `${state.bilan.marche.label}${state.bilan.marche.sous_segment ? " / " + state.bilan.marche.sous_segment : ""}`
                : "—"}
            </div>
            <div>
              <strong className="text-[#C9A84C]">Vécu :</strong>
              <p className="mt-1 whitespace-pre-line text-white/80">{state.bilan.vecu || "—"}</p>
            </div>
            <div>
              <strong className="text-[#C9A84C]">Compétence :</strong>
              <p className="mt-1 whitespace-pre-line text-white/80">
                {state.bilan.competence || "—"}
              </p>
            </div>
          </div>
        </Card>
      )}

      <Actions>
        <Btn variant="ghost" onClick={handlePrev}>
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Btn>
        <Btn variant="primary" disabled={!canNext} onClick={handleNext}>
          {sub === "recap" ? "Continuer vers brainstorm" : "Continuer"}
          <ArrowRight className="h-4 w-4" />
        </Btn>
      </Actions>
    </div>
  );
}
