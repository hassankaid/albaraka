import { useState } from "react";
import { toast } from "sonner";
import { TextArea, InputBlock, InputLabel, InputHelper, Card } from "../../m1-niche/components/ui";
import { StepHeader } from "../components/StepHeader";
import { StepFooter } from "../components/StepFooter";
import { evaluatePromesse } from "../lib/aiEvaluator";
import { pickAvatarName, type M3State, VALIDATION_THRESHOLD } from "../lib/types";

interface Props { state: M3State; setState: (n: (p: M3State) => M3State) => void; onBack: () => void; onNext: () => void; }

export function PromesseScreen({ state, setState, onBack, onNext }: Props) {
  const [evaluating, setEvaluating] = useState(false);
  const avatar = pickAvatarName(state);
  const p = state.promesse;

  const set = (val: string) => setState((prev) => ({ ...prev, promesse: { ...prev.promesse, text: val } }));

  async function handleEvaluate() {
    setEvaluating(true);
    try {
      const fb = await evaluatePromesse(state);
      setState((prev) => ({
        ...prev,
        promesse: {
          ...prev.promesse,
          score: fb.score,
          attempts: prev.promesse.attempts + 1,
          feedback: fb,
          validated: fb.score >= VALIDATION_THRESHOLD,
          history: [...prev.promesse.history, { ts: new Date().toISOString(), score: fb.score, snapshot: { text: prev.promesse.text } }],
        },
      }));
    } catch (e: any) { toast.error("Erreur évaluation : " + (e?.message ?? "inconnue")); }
    finally { setEvaluating(false); }
  }
  function handleForce() {
    setState((prev) => ({ ...prev, promesse: { ...prev.promesse, forced: true, validated: true } }));
    onNext();
  }

  return (
    <div>
      <StepHeader
        current={1}
        total={7}
        title="Promesse de transformation"
        sub={`Une promesse qui vend = Spécifique + Mesurable + Délai + Cible (SMDC). Si elle peut être prononcée par un concurrent générique, elle est nulle. Si ${avatar} se reconnaît dans 5 secondes, elle est forte.`}
      />

      <Card>
        <InputBlock>
          <InputLabel>Ta promesse de transformation pour {avatar}</InputLabel>
          <TextArea
            rows={4}
            value={p.text}
            onChange={(e) => set(e.target.value)}
            placeholder={`Ex : Aider les cake designers passionnées à signer leur premier wedding cake à 600€+ en 90 jours, sans passer par le CAP Pâtissier ni louer un atelier.`}
          />
          <InputHelper>
            ✓ Format SMDC : "Aider [cible précise] à [résultat chiffrable] en [délai], sans [obstacle classique]."
          </InputHelper>
        </InputBlock>
      </Card>

      <StepFooter
        feedback={p.feedback}
        score={p.score}
        attempts={p.attempts}
        forced={p.forced}
        validated={p.validated}
        evaluating={evaluating}
        canEvaluate={p.text.length >= 30}
        onEvaluate={handleEvaluate}
        onBack={onBack}
        onNext={onNext}
        onForce={handleForce}
      />
    </div>
  );
}
