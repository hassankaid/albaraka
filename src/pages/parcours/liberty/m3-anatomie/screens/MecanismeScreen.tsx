import { useState } from "react";
import { toast } from "sonner";
import { TextInput, TextArea, InputBlock, InputLabel, InputHelper, Card } from "../../m1-niche/components/ui";
import { StepHeader } from "../components/StepHeader";
import { StepFooter } from "../components/StepFooter";
import { evaluateMecanisme } from "../lib/aiEvaluator";
import { type M3State, VALIDATION_THRESHOLD } from "../lib/types";

interface Props { state: M3State; setState: (n: (p: M3State) => M3State) => void; onBack: () => void; onNext: () => void; }

export function MecanismeScreen({ state, setState, onBack, onNext }: Props) {
  const [evaluating, setEvaluating] = useState(false);
  const m = state.mecanisme;

  const setNom = (val: string) => setState((prev) => ({ ...prev, mecanisme: { ...prev.mecanisme, nom: val } }));
  const setEtape = (idx: number, val: string) => setState((prev) => {
    const etapes = [...prev.mecanisme.etapes];
    etapes[idx] = val;
    return { ...prev, mecanisme: { ...prev.mecanisme, etapes } };
  });
  const addEtape = () => setState((prev) => ({
    ...prev, mecanisme: { ...prev.mecanisme, etapes: [...prev.mecanisme.etapes, ""] },
  }));
  const removeEtape = (i: number) => setState((prev) => ({
    ...prev,
    mecanisme: {
      ...prev.mecanisme,
      etapes: prev.mecanisme.etapes.filter((_, idx) => idx !== i),
    },
  }));

  async function handleEvaluate() {
    setEvaluating(true);
    try {
      const fb = await evaluateMecanisme(state);
      setState((prev) => ({
        ...prev,
        mecanisme: {
          ...prev.mecanisme,
          score: fb.score,
          attempts: prev.mecanisme.attempts + 1,
          feedback: fb,
          validated: fb.score >= VALIDATION_THRESHOLD,
          history: [...prev.mecanisme.history, { ts: new Date().toISOString(), score: fb.score, snapshot: { nom: prev.mecanisme.nom, etapes: prev.mecanisme.etapes } }],
        },
      }));
    } catch (e: any) { toast.error("Erreur évaluation : " + (e?.message ?? "inconnue")); }
    finally { setEvaluating(false); }
  }
  function handleForce() {
    setState((prev) => ({ ...prev, mecanisme: { ...prev.mecanisme, forced: true, validated: true } }));
    onNext();
  }

  const filledEtapes = m.etapes.filter((e) => e.trim().length > 0).length;

  return (
    <div>
      <StepHeader
        current={2}
        total={7}
        title="Mécanisme unique"
        sub={`Comment tu y arrives — pas du brouillard, une méthode nommée avec 3-4 étapes actionnables. Le nom propriétaire est important (™ optionnel) : il signale que c'est TON système, pas une recopie.`}
      />

      <Card className="mb-3">
        <InputBlock>
          <InputLabel>Nom de la méthode (™ optionnel)</InputLabel>
          <TextInput
            value={m.nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Ex : Méthode Wedding-Premium™"
          />
          <InputHelper>Un nom mémorable, qui pose une promesse implicite dans le nom lui-même.</InputHelper>
        </InputBlock>
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <InputLabel>Étapes (3-4 recommandées, actionnables, séquentielles)</InputLabel>
          <button
            type="button"
            onClick={addEtape}
            className="text-[11px] font-semibold text-[#C9A84C] hover:underline"
          >
            + Ajouter une étape
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {m.etapes.map((e, i) => (
            <div key={i} className="flex items-start gap-2">
              <div
                className="mt-2.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold"
                style={{
                  background: e.trim() ? "#C9A84C" : "rgba(201,168,76,0.12)",
                  color: e.trim() ? "#080808" : "#C9A84C",
                }}
              >
                {i + 1}
              </div>
              <TextArea
                rows={2}
                value={e}
                onChange={(ev) => setEtape(i, ev.target.value)}
                placeholder={`Étape ${i + 1}…`}
              />
              {m.etapes.length > 3 && (
                <button
                  type="button"
                  onClick={() => removeEtape(i)}
                  className="mt-2.5 text-[11px] text-white/30 hover:text-red-400"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>

      <StepFooter
        feedback={m.feedback}
        score={m.score}
        attempts={m.attempts}
        forced={m.forced}
        validated={m.validated}
        evaluating={evaluating}
        canEvaluate={m.nom.length >= 3 && filledEtapes >= 3}
        onEvaluate={handleEvaluate}
        onBack={onBack}
        onNext={onNext}
        onForce={handleForce}
      />
    </div>
  );
}
