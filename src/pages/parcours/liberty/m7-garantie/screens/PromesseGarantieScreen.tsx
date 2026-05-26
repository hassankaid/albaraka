import { useState } from "react";
import { toast } from "sonner";
import { TextInput, TextArea, InputBlock, InputLabel, InputHelper, Card } from "../../m1-niche/components/ui";
import { StepHeader } from "../components/StepHeader";
import { StepFooter } from "../components/StepFooter";
import { evaluatePromesseGarantie } from "../lib/aiEvaluator";
import { type M7State, validationThreshold, pickPointB } from "../lib/types";

interface Props {
  state: M7State;
  setState: (n: (p: M7State) => M7State) => void;
  onBack: () => void;
  onNext: () => void;
}

export function PromesseGarantieScreen({ state, setState, onBack, onNext }: Props) {
  const [evaluating, setEvaluating] = useState(false);
  const d = state.data.promesse_garantie;
  const threshold = validationThreshold(state);
  const pointB = pickPointB(state);

  const set = (patch: Partial<typeof d>) =>
    setState((prev) => ({ ...prev, data: { ...prev.data, promesse_garantie: { ...prev.data.promesse_garantie, ...patch } } }));

  const applyPointB = () => {
    if (pointB) {
      set({ resultat: pointB.measurable || pointB.text, duree_valeur: pointB.days });
    }
  };

  const canEvaluate = d.resultat.trim().length >= 50 && d.duree_valeur > 0 && d.critere_objectif.trim().length >= 30;

  async function handleEvaluate() {
    setEvaluating(true);
    try {
      const fb = await evaluatePromesseGarantie(state);
      setState((prev) => ({
        ...prev,
        scores: { ...prev.scores, promesse_garantie: fb.score },
        attempts: { ...prev.attempts, promesse_garantie: prev.attempts.promesse_garantie + 1 },
        lastFb: { ...prev.lastFb, promesse_garantie: fb },
        highest: fb.score >= validationThreshold(prev) && prev.highest === "promesse_garantie" ? "conditions_client" : prev.highest,
      }));
    } catch (e: any) { toast.error("Erreur évaluation : " + (e?.message ?? "inconnue")); }
    finally { setEvaluating(false); }
  }
  function handleForce() {
    setState((prev) => ({ ...prev, forced: { ...prev.forced, promesse_garantie: true }, highest: prev.highest === "promesse_garantie" ? "conditions_client" : prev.highest }));
  }

  const score = state.scores.promesse_garantie;
  const fb = state.lastFb.promesse_garantie;
  const validated = (score !== null && score >= threshold) || state.forced.promesse_garantie;

  return (
    <div>
      <StepHeader
        current={2}
        total={6}
        title="Promesse mesurable de la garantie"
        sub="Tu garantis QUOI exactement ? Pas « la satisfaction » mais un résultat chiffré + un délai + un critère objectif vérifiable."
        hint="Sans chiffres précis, la garantie est décorative. Le prospect veut une promesse qu'il peut tenir contre toi si tu ne livres pas."
      />

      {pointB && (
        <div
          className="mb-4 rounded-xl p-3 text-[12.5px] leading-[1.5]"
          style={{ background: "rgba(201,168,76,0.05)", border: "0.5px dashed rgba(201,168,76,0.4)" }}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#C9A84C]">📋 Point B importé du M5</span>
            <button
              type="button"
              onClick={applyPointB}
              className="rounded-full bg-[#C9A84C]/15 px-2.5 py-1 text-[10px] font-semibold text-[#C9A84C] hover:bg-[#C9A84C]/25"
            >
              Appliquer ↓
            </button>
          </div>
          <p className="text-white/70"><strong className="text-white">Résultat mesurable M5 :</strong> {pointB.measurable || pointB.text}</p>
          <p className="text-white/50">Délai M5 : {pointB.days} jours</p>
        </div>
      )}

      <Card className="mb-4">
        <InputBlock>
          <InputLabel>Résultat garanti (50+ chars, chiffré) *</InputLabel>
          <TextArea
            rows={4}
            value={d.resultat}
            onChange={(e) => set({ resultat: e.target.value })}
            placeholder="Ex : Générer une première commission affiliation halal de 300€+ validée et encaissée sur les 60 premiers jours du programme."
          />
          <InputHelper>Pas « réussir » ou « être satisfait » — un résultat chiffré et vérifiable.</InputHelper>
        </InputBlock>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_2fr]">
          <InputBlock>
            <InputLabel>Durée *</InputLabel>
            <div className="flex gap-2">
              <TextInput
                type="number"
                value={String(d.duree_valeur)}
                onChange={(e) => set({ duree_valeur: parseInt(e.target.value, 10) || 0 })}
              />
              <select
                value={d.duree_unite}
                onChange={(e) => set({ duree_unite: e.target.value as "jours" | "semaines" | "mois" })}
                className="rounded-md border-0 bg-[#0B0A07] px-3 py-2 text-[13px] text-white"
                style={{ border: "0.5px solid rgba(201,168,76,0.3)" }}
              >
                <option value="jours">jours</option>
                <option value="semaines">semaines</option>
                <option value="mois">mois</option>
              </select>
            </div>
          </InputBlock>
          <InputBlock>
            <InputLabel>Critère objectif (vérifiable) *</InputLabel>
            <TextInput
              value={d.critere_objectif}
              onChange={(e) => set({ critere_objectif: e.target.value })}
              placeholder="Ex : Capture Stripe + relevé bancaire confirmant la 1ère commission encaissée"
            />
            <InputHelper>Comment on vérifie sans ambiguïté que le résultat est atteint.</InputHelper>
          </InputBlock>
        </div>
      </Card>

      <StepFooter
        feedback={fb}
        score={score}
        attempts={state.attempts.promesse_garantie}
        forced={state.forced.promesse_garantie}
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
