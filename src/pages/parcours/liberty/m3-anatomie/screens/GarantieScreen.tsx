import { useState } from "react";
import { toast } from "sonner";
import { TextArea, InputBlock, InputLabel, InputHelper, Card, Option } from "../../m1-niche/components/ui";
import { StepHeader } from "../components/StepHeader";
import { StepFooter } from "../components/StepFooter";
import { evaluateGarantie } from "../lib/aiEvaluator";
import { type M3State, type GarantieType, VALIDATION_THRESHOLD } from "../lib/types";

interface Props { state: M3State; setState: (n: (p: M3State) => M3State) => void; onBack: () => void; onNext: () => void; }

const TYPES: Array<{ value: GarantieType; emoji: string; label: string; desc: string }> = [
  { value: "remboursement", emoji: "💸", label: "Remboursement conditionné", desc: "Tu rembourses si l'élève suit le programme et ne voit pas le résultat. La condition d'effort filtre les profils sérieux." },
  { value: "continuite", emoji: "🔄", label: "Continuité gratuite", desc: "Si pas de résultat dans X jours, tu accompagnes gratuitement jusqu'au résultat. Plus rassurant que le remboursement pour les marchés transfo." },
  { value: "performance", emoji: "🎯", label: "Garantie résultats / performance", desc: "Paiement aux résultats ou remboursement total si pas de résultat. Réservé aux acteurs avec track record solide. Très puissant en B2B." },
];

export function GarantieScreen({ state, setState, onBack, onNext }: Props) {
  const [evaluating, setEvaluating] = useState(false);
  const g = state.garantie;

  const setType = (t: GarantieType) => setState((prev) => ({ ...prev, garantie: { ...prev.garantie, type: t } }));
  const setFormul = (v: string) => setState((prev) => ({ ...prev, garantie: { ...prev.garantie, formulation: v } }));

  async function handleEvaluate() {
    setEvaluating(true);
    try {
      const fb = await evaluateGarantie(state);
      setState((prev) => ({
        ...prev,
        garantie: {
          ...prev.garantie,
          score: fb.score,
          attempts: prev.garantie.attempts + 1,
          feedback: fb,
          validated: fb.score >= VALIDATION_THRESHOLD,
          history: [...prev.garantie.history, { ts: new Date().toISOString(), score: fb.score, snapshot: { type: prev.garantie.type, formulation: prev.garantie.formulation } }],
        },
      }));
    } catch (e: any) { toast.error("Erreur évaluation : " + (e?.message ?? "inconnue")); }
    finally { setEvaluating(false); }
  }
  function handleForce() {
    setState((prev) => ({ ...prev, garantie: { ...prev.garantie, forced: true, validated: true } }));
    onNext();
  }

  return (
    <div>
      <StepHeader
        current={5}
        total={7}
        title="Garantie qui inverse le risque"
        sub={`Une garantie réelle, avec conditions claires et délai. Pas magique, pas "satisfait ou remboursé" générique. Elle doit RASSURER ton avatar sur le pire scénario.`}
      />

      <Card className="mb-4">
        <InputLabel>Type de garantie</InputLabel>
        <div className="mt-2 flex flex-col gap-2">
          {TYPES.map((t) => (
            <Option key={t.value} selected={g.type === t.value} onClick={() => setType(t.value)}>
              <span className="flex items-start gap-3">
                <span className="text-xl">{t.emoji}</span>
                <span className="flex flex-col">
                  <span className="font-semibold">{t.label}</span>
                  <span className="text-[11px] leading-snug text-white/40">{t.desc}</span>
                </span>
              </span>
            </Option>
          ))}
        </div>
      </Card>

      <InputBlock>
        <InputLabel>Formulation précise avec conditions + délai</InputLabel>
        <TextArea
          rows={4}
          value={g.formulation}
          onChange={(e) => setFormul(e.target.value)}
          placeholder={`Ex : Si après avoir suivi les 8 modules ET soumis tes 3 portfolio, tu n'as pas signé ta première commande wedding cake à 400€+ dans les 90 jours du programme, je continue à t'accompagner gratuitement pendant 60 jours supplémentaires.`}
        />
        <InputHelper>
          Conditions claires + délai chiffré + ce que tu fais en cas d'échec. Pas de "satisfait ou remboursé" générique.
        </InputHelper>
      </InputBlock>

      <StepFooter
        feedback={g.feedback}
        score={g.score}
        attempts={g.attempts}
        forced={g.forced}
        validated={g.validated}
        evaluating={evaluating}
        canEvaluate={!!g.type && g.formulation.length >= 50}
        onEvaluate={handleEvaluate}
        onBack={onBack}
        onNext={onNext}
        onForce={handleForce}
      />
    </div>
  );
}
