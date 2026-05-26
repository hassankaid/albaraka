import { useState } from "react";
import { toast } from "sonner";
import { TextArea, InputBlock, InputLabel, InputHelper, Card } from "../../m1-niche/components/ui";
import { StepHeader } from "../components/StepHeader";
import { StepFooter } from "../components/StepFooter";
import { evaluateConditionsClient } from "../lib/aiEvaluator";
import { type M7State, validationThreshold } from "../lib/types";

interface Props {
  state: M7State;
  setState: (n: (p: M7State) => M7State) => void;
  onBack: () => void;
  onNext: () => void;
}

export function ConditionsClientScreen({ state, setState, onBack, onNext }: Props) {
  const [evaluating, setEvaluating] = useState(false);
  const d = state.data.conditions_client;
  const threshold = validationThreshold(state);

  const set = (val: string) =>
    setState((prev) => ({ ...prev, data: { ...prev.data, conditions_client: { conditions_text: val } } }));

  const canEvaluate = d.conditions_text.trim().length >= 100;

  async function handleEvaluate() {
    setEvaluating(true);
    try {
      const fb = await evaluateConditionsClient(state);
      setState((prev) => ({
        ...prev,
        scores: { ...prev.scores, conditions_client: fb.score },
        attempts: { ...prev.attempts, conditions_client: prev.attempts.conditions_client + 1 },
        lastFb: { ...prev.lastFb, conditions_client: fb },
        highest: fb.score >= validationThreshold(prev) && prev.highest === "conditions_client" ? "math_garantie" : prev.highest,
      }));
    } catch (e: any) { toast.error("Erreur évaluation : " + (e?.message ?? "inconnue")); }
    finally { setEvaluating(false); }
  }
  function handleForce() {
    setState((prev) => ({ ...prev, forced: { ...prev.forced, conditions_client: true }, highest: prev.highest === "conditions_client" ? "math_garantie" : prev.highest }));
  }

  const score = state.scores.conditions_client;
  const fb = state.lastFb.conditions_client;
  const validated = (score !== null && score >= threshold) || state.forced.conditions_client;

  return (
    <div>
      <StepHeader
        current={3}
        total={6}
        title="Conditions client · bouclier anti-abus"
        sub="Sans conditions = garantie ouverte aux abus. Liste 3+ conditions concrètes que le client doit remplir pour POUVOIR activer."
        hint="⚠ Anti-cheat D : « satisfait ou remboursé », « sans condition », « rembourse sans question » → 100% d'activation abusive."
      />

      <Card className="mb-5">
        <InputBlock>
          <InputLabel>Conditions d'activation (100+ chars · 3+ conditions concrètes) *</InputLabel>
          <TextArea
            rows={8}
            value={d.conditions_text}
            onChange={(e) => set(e.target.value)}
            placeholder={`Ex :\n• Avoir suivi les 12 modules du programme (preuve : 100% progression dans la plateforme)\n• Avoir envoyé au minimum 50 DM prospects avec les scripts fournis (preuve : capture du tracker Notion)\n• Avoir participé à au moins 8 calls de groupe sur les 12 (preuve : présence loggée)\n• Faire la demande de garantie entre J60 et J90 (pas avant, pas après)\n• Avoir fourni 3 captures d'écran des conversations DM commencées`}
          />
          <InputHelper>
            Verbes d'action + preuves attendues. Évite les formulations qui ouvrent à 100% d'activation.
          </InputHelper>
        </InputBlock>
      </Card>

      <StepFooter
        feedback={fb}
        score={score}
        attempts={state.attempts.conditions_client}
        forced={state.forced.conditions_client}
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
