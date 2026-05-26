import { useState } from "react";
import { toast } from "sonner";
import { TextArea, InputBlock, InputLabel, InputHelper, Card } from "../../m1-niche/components/ui";
import { StepHeader } from "../components/StepHeader";
import { StepFooter } from "../components/StepFooter";
import { evaluateValeurPrix } from "../lib/aiEvaluator";
import { type M6State, validationThreshold, pickAvatarName } from "../lib/types";

interface Props {
  state: M6State;
  setState: (n: (p: M6State) => M6State) => void;
  onBack: () => void;
  onNext: () => void;
}

export function ValeurPrixScreen({ state, setState, onBack, onNext }: Props) {
  const [evaluating, setEvaluating] = useState(false);
  const d = state.data.valeur_prix;
  const threshold = validationThreshold(state);
  const avatar = pickAvatarName(state);

  const set = (patch: Partial<typeof d>) =>
    setState((prev) => ({ ...prev, data: { ...prev.data, valeur_prix: { ...prev.data.valeur_prix, ...patch } } }));

  const canEvaluate =
    d.ma_bugatti.trim().length >= 60 &&
    d.signal_phrase.trim().length >= 30 &&
    d.ancrage_phrase.trim().length >= 30 &&
    d.contraste_phrase.trim().length >= 30 &&
    d.non_excuse_phrase.trim().length >= 30;

  async function handleEvaluate() {
    setEvaluating(true);
    try {
      const fb = await evaluateValeurPrix(state);
      setState((prev) => ({
        ...prev,
        scores: { ...prev.scores, valeur_prix: fb.score },
        attempts: { ...prev.attempts, valeur_prix: prev.attempts.valeur_prix + 1 },
        lastFb: { ...prev.lastFb, valeur_prix: fb },
        highest: fb.score >= validationThreshold(prev) && prev.highest === "valeur_prix" ? "prix_valeur" : prev.highest,
      }));
    } catch (e: any) { toast.error("Erreur évaluation : " + (e?.message ?? "inconnue")); }
    finally { setEvaluating(false); }
  }

  function handleForce() {
    setState((prev) => ({ ...prev, forced: { ...prev.forced, valeur_prix: true }, highest: prev.highest === "valeur_prix" ? "prix_valeur" : prev.highest }));
  }

  const score = state.scores.valeur_prix;
  const fb = state.lastFb.valeur_prix;
  const validated = (score !== null && score >= threshold) || state.forced.valeur_prix;

  return (
    <div>
      <StepHeader
        current={1}
        total={7}
        title="Valeur PAR le prix · psychologie premium"
        sub={`Slide 81 — 5 leviers psychologiques. Tu les énumères pour ${avatar} pour qu'ils deviennent actifs en pratique, pas décoratifs.`}
        hint="Ma Bugatti : décris ton offre comme un objet de valeur disproportionnée (5-10× ce que tu factures)."
      />

      <Card className="mb-4">
        <InputBlock>
          <InputLabel>Ma Bugatti (80+ caractères) *</InputLabel>
          <TextArea
            rows={4}
            value={d.ma_bugatti}
            onChange={(e) => set({ ma_bugatti: e.target.value })}
            placeholder="Ex : Mon programme AFFILIÉ AL BARAKA, c'est 90 jours d'accompagnement individuel + setters/closers AL BARAKA + 30 produits halal pré-validés + communauté Telegram active. Valeur réelle ≈ 10 000€ — je le vends 2 997€ pour bâtir mes 50 premiers cas."
          />
          <InputHelper>Pourquoi ta promesse vaut 5-10× ce que tu fais payer. C'est ta description premium.</InputHelper>
        </InputBlock>
      </Card>

      <Card className="mb-4">
        <InputBlock>
          <InputLabel>Phrase de signal (30+ chars) — « Mon prix dit que… » *</InputLabel>
          <TextArea
            rows={2}
            value={d.signal_phrase}
            onChange={(e) => set({ signal_phrase: e.target.value })}
            placeholder="Ex : Mon prix dit que je sélectionne mes élèves — pas l'inverse."
          />
          <InputHelper>Le prix signale ta sélection. Slide 81 levier 1.</InputHelper>
        </InputBlock>
      </Card>

      <Card className="mb-4">
        <InputBlock>
          <InputLabel>Phrase d'ancrage (30+ chars) — la valeur totale AVANT le prix *</InputLabel>
          <TextArea
            rows={2}
            value={d.ancrage_phrase}
            onChange={(e) => set({ ancrage_phrase: e.target.value })}
            placeholder="Ex : Programme 90 jours + setters/closers + communauté + garantie = 9 800€ de valeur. Aujourd'hui : 2 997€."
          />
          <InputHelper>Énonce la valeur totale chiffrée AVANT le prix. Effet de contraste.</InputHelper>
        </InputBlock>
      </Card>

      <Card className="mb-4">
        <InputBlock>
          <InputLabel>Phrase de contraste (30+ chars) — coût de l'inaction *</InputLabel>
          <TextArea
            rows={2}
            value={d.contraste_phrase}
            onChange={(e) => set({ contraste_phrase: e.target.value })}
            placeholder="Ex : Combien tu perds chaque mois où tu restes salarié sans épargne halal ? 800€ × 12 = 9 600€ par an. Mon programme coûte 2 997€."
          />
          <InputHelper>Compare au coût de l'inaction.</InputHelper>
        </InputBlock>
      </Card>

      <Card className="mb-5">
        <InputBlock>
          <InputLabel>Phrase de non-excuse (30+ chars) — refuser de baisser le prix *</InputLabel>
          <TextArea
            rows={2}
            value={d.non_excuse_phrase}
            onChange={(e) => set({ non_excuse_phrase: e.target.value })}
            placeholder="Ex : Si c'est cher pour toi, c'est que ce n'est pas pour toi maintenant. Pas grave."
          />
          <InputHelper>Slide 81 levier 4 : ne jamais s'excuser de son prix.</InputHelper>
        </InputBlock>
      </Card>

      <StepFooter
        feedback={fb}
        score={score}
        attempts={state.attempts.valeur_prix}
        forced={state.forced.valeur_prix}
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
