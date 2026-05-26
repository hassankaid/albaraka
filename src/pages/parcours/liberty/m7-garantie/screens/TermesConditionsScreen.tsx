import { useState } from "react";
import { toast } from "sonner";
import { TextInput, TextArea, InputBlock, InputLabel, InputHelper, Card } from "../../m1-niche/components/ui";
import { StepHeader } from "../components/StepHeader";
import { StepFooter } from "../components/StepFooter";
import { evaluateTermesConditions } from "../lib/aiEvaluator";
import { type M7State, validationThreshold } from "../lib/types";

interface Props {
  state: M7State;
  setState: (n: (p: M7State) => M7State) => void;
  onBack: () => void;
  onNext: () => void;
}

export function TermesConditionsScreen({ state, setState, onBack, onNext }: Props) {
  const [evaluating, setEvaluating] = useState(false);
  const d = state.data.termes_conditions;
  const threshold = validationThreshold(state);

  const set = (patch: Partial<typeof d>) =>
    setState((prev) => ({ ...prev, data: { ...prev.data, termes_conditions: { ...prev.data.termes_conditions, ...patch } } }));

  const canEvaluate = d.tnc_text.trim().length >= 300 && d.vendeur_statut.trim().length >= 5;

  async function handleEvaluate() {
    setEvaluating(true);
    try {
      const fb = await evaluateTermesConditions(state);
      setState((prev) => ({
        ...prev,
        scores: { ...prev.scores, termes_conditions: fb.score },
        attempts: { ...prev.attempts, termes_conditions: prev.attempts.termes_conditions + 1 },
        lastFb: { ...prev.lastFb, termes_conditions: fb },
        highest: fb.score >= validationThreshold(prev) && prev.highest === "termes_conditions" ? "lock" : prev.highest,
      }));
    } catch (e: any) { toast.error("Erreur évaluation : " + (e?.message ?? "inconnue")); }
    finally { setEvaluating(false); }
  }
  function handleForce() {
    setState((prev) => ({ ...prev, forced: { ...prev.forced, termes_conditions: true }, highest: prev.highest === "termes_conditions" ? "lock" : prev.highest }));
  }

  const score = state.scores.termes_conditions;
  const fb = state.lastFb.termes_conditions;
  const validated = (score !== null && score >= threshold) || state.forced.termes_conditions;

  return (
    <div>
      <StepHeader
        current={6}
        total={6}
        title="Termes & Conditions · contrat écrit"
        sub="Sans T&C écrits = pas de contrat opposable = garantie verbale = abus garantis. Le contrat protège AUSSI le vendeur."
        hint="⚠ Anti-cheat J : pas de boilerplate « lorem ipsum / [entreprise] / modifier ce texte »."
      />

      <Card className="mb-4">
        <InputBlock>
          <InputLabel>T&C écrits (300+ chars) *</InputLabel>
          <TextArea
            rows={10}
            value={d.tnc_text}
            onChange={(e) => set({ tnc_text: e.target.value })}
            placeholder={`Ex :\n\nConditions d'activation : Le client doit avoir suivi 100% du programme (modules + calls + livrables) AVANT toute demande de remboursement.\n\nFenêtre de demande : entre J60 et J90 après l'inscription.\n\nPreuves : capture Stripe ou relevé bancaire prouvant l'absence de commission encaissée.\n\nDélai de remboursement : sous 14 jours ouvrés après acceptation du dossier.\n\nJuridiction : Tribunal de Commerce de Paris. Droit applicable : droit français.\n\nNon-applicable : remboursement refusé si conditions d'activation non remplies, ou si demande hors fenêtre temporelle.`}
          />
          <InputHelper>Inclus : conditions d'activation + délai de demande + durée de remboursement + juridiction + non-applicable.</InputHelper>
        </InputBlock>
      </Card>

      <Card className="mb-5">
        <InputBlock>
          <InputLabel>Statut vendeur juridique *</InputLabel>
          <TextInput
            value={d.vendeur_statut}
            onChange={(e) => set({ vendeur_statut: e.target.value })}
            placeholder="Ex : SASU ETHICARENA · SIRET 123 456 789 00012 · 75 rue de la Paix, 75002 Paris"
          />
          <InputHelper>Forme juridique + nom + SIRET + adresse. Sans ça, tes T&C ne sont pas opposables.</InputHelper>
        </InputBlock>
      </Card>

      <StepFooter
        feedback={fb}
        score={score}
        attempts={state.attempts.termes_conditions}
        forced={state.forced.termes_conditions}
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
