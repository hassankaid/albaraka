import { useState } from "react";
import { toast } from "sonner";
import { TextInput, TextArea, InputBlock, InputLabel, InputHelper, Card } from "../../m1-niche/components/ui";
import { StepHeader } from "../components/StepHeader";
import { StepFooter } from "../components/StepFooter";
import { evaluateExposeGarantie } from "../lib/aiEvaluator";
import { type M7State, validationThreshold, GARANTIE_TYPES } from "../lib/types";

interface Props {
  state: M7State;
  setState: (n: (p: M7State) => M7State) => void;
  onBack: () => void;
  onNext: () => void;
}

export function ExposeGarantieScreen({ state, setState, onBack, onNext }: Props) {
  const [evaluating, setEvaluating] = useState(false);
  const d = state.data.expose_garantie;
  const threshold = validationThreshold(state);
  const typeMeta = state.data.type_garantie.type_choisi ? GARANTIE_TYPES[state.data.type_garantie.type_choisi] : null;

  const set = (patch: Partial<typeof d>) =>
    setState((prev) => ({ ...prev, data: { ...prev.data, expose_garantie: { ...prev.data.expose_garantie, ...patch } } }));

  const canEvaluate = d.pitch_text.trim().length >= 120 && d.formule_marketing.trim().length >= 20;

  async function handleEvaluate() {
    setEvaluating(true);
    try {
      const fb = await evaluateExposeGarantie(state);
      setState((prev) => ({
        ...prev,
        scores: { ...prev.scores, expose_garantie: fb.score },
        attempts: { ...prev.attempts, expose_garantie: prev.attempts.expose_garantie + 1 },
        lastFb: { ...prev.lastFb, expose_garantie: fb },
        highest: fb.score >= validationThreshold(prev) && prev.highest === "expose_garantie" ? "termes_conditions" : prev.highest,
      }));
    } catch (e: any) { toast.error("Erreur évaluation : " + (e?.message ?? "inconnue")); }
    finally { setEvaluating(false); }
  }
  function handleForce() {
    setState((prev) => ({ ...prev, forced: { ...prev.forced, expose_garantie: true }, highest: prev.highest === "expose_garantie" ? "termes_conditions" : prev.highest }));
  }

  const score = state.scores.expose_garantie;
  const fb = state.lastFb.expose_garantie;
  const validated = (score !== null && score >= threshold) || state.forced.expose_garantie;

  return (
    <div>
      <StepHeader
        current={5}
        total={6}
        title="Pitch d'exposition · montre, ne raconte pas"
        sub="Le prospect ne croit pas ce qu'il entend. Il croit ce qu'il voit. Énonce la garantie, donne le critère, mentionne le contrat, propose de partager l'écran. Pas d'auto-rassurance."
        hint={typeMeta ? `Type choisi : ${typeMeta.label}. Formule type : « ${typeMeta.formule} ».` : undefined}
      />

      <Card className="mb-4">
        <InputBlock>
          <InputLabel>Pitch d'exposition en call (120+ chars) *</InputLabel>
          <TextArea
            rows={6}
            value={d.pitch_text}
            onChange={(e) => set({ pitch_text: e.target.value })}
            placeholder="Ex : « Le programme AFFILIÉ AL BARAKA est garanti — si tu n'as pas encaissé ta première commission de 300€+ sur 60 jours, je te rembourse 100%. Le critère c'est ta capture Stripe. Tu peux relire les conditions dans les T&C — je te partage l'écran si tu veux. Et le contrat est signé électroniquement à la souscription. »"
          />
          <InputHelper>Séquence : énonce + critère + contrat + partage d'écran. Pas de « je suis confiant », « ne vous inquiétez pas ».</InputHelper>
        </InputBlock>
      </Card>

      <Card className="mb-5">
        <InputBlock>
          <InputLabel>Formule marketing courte (20+ chars) *</InputLabel>
          <TextInput
            value={d.formule_marketing}
            onChange={(e) => set({ formule_marketing: e.target.value })}
            placeholder="Ex : AFFILIÉ AL BARAKA ou vous ne nous payez pas"
          />
          <InputHelper>Ta phrase d'accroche dans les pubs et le pitch. Type : « [Offre] {typeMeta?.formule || "ou vous ne nous payez pas"} ».</InputHelper>
        </InputBlock>
      </Card>

      <StepFooter
        feedback={fb}
        score={score}
        attempts={state.attempts.expose_garantie}
        forced={state.forced.expose_garantie}
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
