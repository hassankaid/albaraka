import { useState } from "react";
import { toast } from "sonner";
import { TextArea, InputBlock, InputLabel, InputHelper, Card } from "../../m1-niche/components/ui";
import { StepHeader } from "../components/StepHeader";
import { StepFooter } from "../components/StepFooter";
import { evaluateTypeGarantie } from "../lib/aiEvaluator";
import { type M7State, type GarantieTypeKey, GARANTIE_TYPES, validationThreshold } from "../lib/types";

interface Props {
  state: M7State;
  setState: (n: (p: M7State) => M7State) => void;
  onBack: () => void;
  onNext: () => void;
}

export function TypeGarantieScreen({ state, setState, onBack, onNext }: Props) {
  const [evaluating, setEvaluating] = useState(false);
  const d = state.data.type_garantie;
  const threshold = validationThreshold(state);

  const setType = (t: GarantieTypeKey) =>
    setState((prev) => ({ ...prev, data: { ...prev.data, type_garantie: { ...prev.data.type_garantie, type_choisi: t } } }));
  const setJust = (val: string) =>
    setState((prev) => ({ ...prev, data: { ...prev.data, type_garantie: { ...prev.data.type_garantie, justification: val } } }));

  const canEvaluate = !!d.type_choisi && d.justification.trim().length >= 80;

  async function handleEvaluate() {
    setEvaluating(true);
    try {
      const fb = await evaluateTypeGarantie(state);
      setState((prev) => ({
        ...prev,
        scores: { ...prev.scores, type_garantie: fb.score },
        attempts: { ...prev.attempts, type_garantie: prev.attempts.type_garantie + 1 },
        lastFb: { ...prev.lastFb, type_garantie: fb },
        highest: fb.score >= validationThreshold(prev) && prev.highest === "type_garantie" ? "promesse_garantie" : prev.highest,
      }));
    } catch (e: any) { toast.error("Erreur évaluation : " + (e?.message ?? "inconnue")); }
    finally { setEvaluating(false); }
  }
  function handleForce() {
    setState((prev) => ({ ...prev, forced: { ...prev.forced, type_garantie: true }, highest: prev.highest === "type_garantie" ? "promesse_garantie" : prev.highest }));
  }

  const score = state.scores.type_garantie;
  const fb = state.lastFb.type_garantie;
  const validated = (score !== null && score >= threshold) || state.forced.type_garantie;

  return (
    <div>
      <StepHeader
        current={1}
        total={6}
        title="Type de garantie · le pivot"
        sub="Une garantie qui inverse le risque = +20 à +50% de conversion. 3 types possibles, chacun avec sa logique. Choisis CONSCIEMMENT."
      />

      <Card className="mb-4">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#C9A84C]">
          Choisis ton type
        </div>
        <div className="space-y-2">
          {(Object.entries(GARANTIE_TYPES) as Array<[GarantieTypeKey, typeof GARANTIE_TYPES[GarantieTypeKey]]>).map(([key, meta]) => {
            const selected = d.type_choisi === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setType(key)}
                className="flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors hover:bg-white/[0.02]"
                style={{ border: `0.5px solid ${selected ? "rgba(127,176,105,0.5)" : "rgba(201,168,76,0.18)"}` }}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold text-white">{meta.label}</span>
                    <span className="rounded-full bg-[#C9A84C]/15 px-2 py-0.5 text-[10px] font-semibold text-[#C9A84C]">{meta.tag}</span>
                  </div>
                  <p className="mt-1 text-[12px] leading-[1.55] text-white/70">{meta.desc}</p>
                  <p className="mt-1 text-[11px] italic text-white/45">Formule : « {meta.formule} »</p>
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="mb-5">
        <InputBlock>
          <InputLabel>Pourquoi CE type pour TON offre ? (80+ chars) *</InputLabel>
          <TextArea
            rows={5}
            value={d.justification}
            onChange={(e) => setJust(e.target.value)}
            placeholder="Ex : Je choisis Refund parce que ma cible (apporteurs débutants) a besoin de la garantie la plus forte pour signer en premier — la conversion est plus importante que la simplicité opérationnelle. Refund colle aussi à mon mécanisme « 1ère commission en 60j » : si pas de commission, ça veut dire que le client n'a pas appliqué, donc condition refund clairement bornée."
          />
          <InputHelper>Justifie en lien avec ton offre, ton avatar, ta durée de transformation. Une phrase ne suffit pas.</InputHelper>
        </InputBlock>
      </Card>

      <StepFooter
        feedback={fb}
        score={score}
        attempts={state.attempts.type_garantie}
        forced={state.forced.type_garantie}
        validated={validated}
        evaluating={evaluating}
        canEvaluate={canEvaluate}
        threshold={threshold}
        aiMode={fb?.ai_mode as "cloud" | "local" | null | undefined}
        onEvaluate={handleEvaluate}
        onBack={onBack}
        onNext={onNext}
        onForce={handleForce}
      />
    </div>
  );
}
