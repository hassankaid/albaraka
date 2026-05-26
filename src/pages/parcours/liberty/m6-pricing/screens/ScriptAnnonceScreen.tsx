import { useState } from "react";
import { toast } from "sonner";
import { TextArea, InputBlock, InputLabel, InputHelper, Card } from "../../m1-niche/components/ui";
import { StepHeader } from "../components/StepHeader";
import { StepFooter } from "../components/StepFooter";
import { evaluateScriptAnnonce } from "../lib/aiEvaluator";
import { type M6State, validationThreshold } from "../lib/types";

interface Props {
  state: M6State;
  setState: (n: (p: M6State) => M6State) => void;
  onBack: () => void;
  onNext: () => void;
}

export function ScriptAnnonceScreen({ state, setState, onBack, onNext }: Props) {
  const [evaluating, setEvaluating] = useState(false);
  const d = state.data.script_annonce;
  const threshold = validationThreshold(state);
  const vp = state.data.valeur_prix;
  const pv = state.data.prix_valeur;
  const pa = state.data.paiements;

  const set = (val: string) =>
    setState((prev) => ({ ...prev, data: { ...prev.data, script_annonce: { ...prev.data.script_annonce, script_text: val } } }));

  const canEvaluate = d.script_text.trim().length >= 150;

  async function handleEvaluate() {
    setEvaluating(true);
    try {
      const fb = await evaluateScriptAnnonce(state);
      setState((prev) => ({
        ...prev,
        scores: { ...prev.scores, script_annonce: fb.score },
        attempts: { ...prev.attempts, script_annonce: prev.attempts.script_annonce + 1 },
        lastFb: { ...prev.lastFb, script_annonce: fb },
        highest: fb.score >= validationThreshold(prev) && prev.highest === "script_annonce" ? "lock" : prev.highest,
      }));
    } catch (e: any) { toast.error("Erreur évaluation : " + (e?.message ?? "inconnue")); }
    finally { setEvaluating(false); }
  }

  function handleForce() {
    setState((prev) => ({ ...prev, forced: { ...prev.forced, script_annonce: true }, highest: prev.highest === "script_annonce" ? "lock" : prev.highest }));
  }

  const score = state.scores.script_annonce;
  const fb = state.lastFb.script_annonce;
  const validated = (score !== null && score >= threshold) || state.forced.script_annonce;

  return (
    <div>
      <StepHeader
        current={7}
        total={7}
        title="Script d'annonce de prix"
        sub="Compose UN pitch enchaîné qui déploie ton arsenal psycho. Tu énonces le prix, tu te tais. PAS d'auto-excuse (« je sais que ça peut paraître cher »)."
        hint="Vise 200+ caractères. Intègre tes 6 munitions : Bugatti, signal, ancrage, contraste, non-excuse, pitch fractionnement."
      />

      {/* Rappel munitions */}
      <Card className="mb-4">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#C9A84C]">
          📋 Tes 6 munitions (à intégrer)
        </div>
        <div className="space-y-2 text-[12px] leading-[1.5] text-white/70">
          {vp.ma_bugatti && <p><strong className="text-white">Bugatti :</strong> {vp.ma_bugatti.slice(0, 100)}…</p>}
          {vp.signal_phrase && <p><strong className="text-white">Signal :</strong> {vp.signal_phrase}</p>}
          {vp.ancrage_phrase && <p><strong className="text-white">Ancrage :</strong> {vp.ancrage_phrase}</p>}
          {vp.contraste_phrase && <p><strong className="text-white">Contraste :</strong> {vp.contraste_phrase}</p>}
          {vp.non_excuse_phrase && <p><strong className="text-white">Non-excuse :</strong> {vp.non_excuse_phrase}</p>}
          {pa.pitch_fractionnement && <p><strong className="text-white">Fractionnement :</strong> {pa.pitch_fractionnement}</p>}
          {pv.prix_ht && <p><strong className="text-white">Prix HT à énoncer :</strong> {pv.prix_ht}€</p>}
        </div>
      </Card>

      <Card className="mb-5">
        <InputBlock>
          <InputLabel>Script d'annonce composé (200+ chars) *</InputLabel>
          <TextArea
            rows={8}
            value={d.script_text}
            onChange={(e) => set(e.target.value)}
            placeholder={`Ex : Mon programme AFFILIÉ AL BARAKA, c'est 90 jours d'accompagnement individuel + setters/closers + 30 produits halal pré-validés. Valeur totale 9 800€. Aujourd'hui : 2 997€, ou 3 fois 999€ sans frais. Mon prix dit que je sélectionne mes élèves — pas l'inverse. Si c'est cher pour toi, pas grave, ce n'est pas pour toi maintenant.`}
          />
          <InputHelper>
            ✗ Auto-excuse interdite : « je sais que ça peut paraître cher », « malheureusement », « désolé pour le prix »…
          </InputHelper>
        </InputBlock>
      </Card>

      <StepFooter
        feedback={fb}
        score={score}
        attempts={state.attempts.script_annonce}
        forced={state.forced.script_annonce}
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
