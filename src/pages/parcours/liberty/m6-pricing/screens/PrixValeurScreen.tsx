import { useState, useMemo } from "react";
import { toast } from "sonner";
import { TextInput, TextArea, InputBlock, InputLabel, InputHelper, Card } from "../../m1-niche/components/ui";
import { StepHeader } from "../components/StepHeader";
import { StepFooter } from "../components/StepFooter";
import { evaluatePrixValeur } from "../lib/aiEvaluator";
import { type M6State, validationThreshold, computeROI } from "../lib/types";

interface Props {
  state: M6State;
  setState: (n: (p: M6State) => M6State) => void;
  onBack: () => void;
  onNext: () => void;
}

export function PrixValeurScreen({ state, setState, onBack, onNext }: Props) {
  const [evaluating, setEvaluating] = useState(false);
  const d = state.data.prix_valeur;
  const threshold = validationThreshold(state);

  const set = (patch: Partial<typeof d>) =>
    setState((prev) => ({ ...prev, data: { ...prev.data, prix_valeur: { ...prev.data.prix_valeur, ...patch } } }));

  const roi = useMemo(() => computeROI(d.resultat_client_12m, d.prix_ht), [d.resultat_client_12m, d.prix_ht]);
  const roiColor = roi >= 5 ? "#7FB069" : roi >= 3 ? "#FFB450" : roi >= 2 ? "#E8C770" : "#E86B6B";
  const roiLabel = roi >= 5 ? "Premium" : roi >= 3 ? "Acceptable" : roi >= 2 ? "Limite" : "Sous-valorisé";

  const canEvaluate =
    parseFloat(d.resultat_client_12m.replace(/[^\d.,]/g, "")) > 0 &&
    parseFloat(d.prix_ht.replace(/[^\d.,]/g, "")) > 0 &&
    d.justification_chiffrage.trim().length >= 80;

  async function handleEvaluate() {
    setEvaluating(true);
    try {
      const fb = await evaluatePrixValeur(state);
      setState((prev) => ({
        ...prev,
        data: { ...prev.data, prix_valeur: { ...prev.data.prix_valeur, roi_calcule: roi } },
        scores: { ...prev.scores, prix_valeur: fb.score },
        attempts: { ...prev.attempts, prix_valeur: prev.attempts.prix_valeur + 1 },
        lastFb: { ...prev.lastFb, prix_valeur: fb },
        highest: fb.score >= validationThreshold(prev) && prev.highest === "prix_valeur" ? "prix_marche" : prev.highest,
      }));
    } catch (e: any) { toast.error("Erreur évaluation : " + (e?.message ?? "inconnue")); }
    finally { setEvaluating(false); }
  }

  function handleForce() {
    setState((prev) => ({ ...prev, forced: { ...prev.forced, prix_valeur: true }, highest: prev.highest === "prix_valeur" ? "prix_marche" : prev.highest }));
  }

  const score = state.scores.prix_valeur;
  const fb = state.lastFb.prix_valeur;
  const validated = (score !== null && score >= threshold) || state.forced.prix_valeur;

  return (
    <div>
      <StepHeader
        current={2}
        total={7}
        title="Prix PAR la valeur · ROI ≥ 5"
        sub="Le ROI doit être objectivement supérieur à 5x. Si ton client paie 2 997€ pour récupérer 15 000€+ sur 12 mois, ton prix est imbattable."
        hint="Sweet spot : ROI 5x+ = premium défendable. ROI 3-5x = acceptable. ROI < 3x = sous-valorisé ou prix arbitraire."
      />

      <Card className="mb-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <InputBlock>
            <InputLabel>Résultat client à 12 mois (€) *</InputLabel>
            <TextInput
              value={d.resultat_client_12m}
              onChange={(e) => set({ resultat_client_12m: e.target.value })}
              placeholder="Ex : 15000"
            />
            <InputHelper>Valeur que ton client récupère/économise sur 12 mois.</InputHelper>
          </InputBlock>
          <InputBlock>
            <InputLabel>Prix HT actuel (€) *</InputLabel>
            <TextInput
              value={d.prix_ht}
              onChange={(e) => set({ prix_ht: e.target.value })}
              placeholder="Ex : 2997"
            />
            <InputHelper>Pré-rempli depuis M4/M3 si présent.</InputHelper>
          </InputBlock>
        </div>

        {/* ROI live */}
        {roi > 0 && (
          <div
            className="mt-4 rounded-xl p-4 text-center"
            style={{ background: "#0B0A07", border: `1px solid ${roiColor}` }}
          >
            <div className="text-[10px] uppercase tracking-[0.12em] text-white/40">ROI calculé</div>
            <div className="text-[32px] font-bold leading-tight" style={{ color: roiColor }}>
              {roi.toFixed(1)}x
            </div>
            <div className="text-[12px] font-semibold" style={{ color: roiColor }}>{roiLabel}</div>
          </div>
        )}
      </Card>

      <Card className="mb-5">
        <InputBlock>
          <InputLabel>Comment tu chiffres ce résultat ? (mécanique, 80+ chars avec chiffres) *</InputLabel>
          <TextArea
            rows={5}
            value={d.justification_chiffrage}
            onChange={(e) => set({ justification_chiffrage: e.target.value })}
            placeholder="Ex : Karim signe 5 affiliés sur 12 mois × 300€ commission moyenne × 10 mois récurrents = 15 000€. Conservateur (mes 11 témoignages montrent 5-8 affiliés signés en 12 mois)."
          />
          <InputHelper>Sans mécanique de calcul, le résultat 12m est une promesse vide. Détaille : combien × combien × combien.</InputHelper>
        </InputBlock>
      </Card>

      <StepFooter
        feedback={fb}
        score={score}
        attempts={state.attempts.prix_valeur}
        forced={state.forced.prix_valeur}
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
