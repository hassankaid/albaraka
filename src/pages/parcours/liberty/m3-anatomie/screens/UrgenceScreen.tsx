import { useState } from "react";
import { toast } from "sonner";
import { TextArea, InputBlock, InputLabel, InputHelper, Card, Option } from "../../m1-niche/components/ui";
import { StepHeader } from "../components/StepHeader";
import { StepFooter } from "../components/StepFooter";
import { evaluateUrgence } from "../lib/aiEvaluator";
import { type M3State, type UrgenceType, VALIDATION_THRESHOLD } from "../lib/types";

interface Props { state: M3State; setState: (n: (p: M3State) => M3State) => void; onBack: () => void; onNext: () => void; }

const TYPES: Array<{ value: UrgenceType; emoji: string; label: string; desc: string }> = [
  { value: "cohorte_limitee", emoji: "👥", label: "Cohorte limitée", desc: "X places parce que capacité d'accompagnement réelle. Prochaine cohorte dans X mois." },
  { value: "bonus_expirant", emoji: "🎁", label: "Bonus expirant", desc: "Bonus dispo uniquement pour les X premiers ou jusqu'à date X." },
  { value: "prix_qui_monte", emoji: "📈", label: "Prix qui monte", desc: "Le prix augmente par paliers (X€ → Y€ → Z€). Documenté." },
  { value: "fenetre_temporelle", emoji: "🪟", label: "Fenêtre temporelle", desc: "Offre dispo jusqu'à date X (pré-rentrée, pré-Ramadan, etc.)." },
];

export function UrgenceScreen({ state, setState, onBack, onNext }: Props) {
  const [evaluating, setEvaluating] = useState(false);
  const u = state.urgence;

  const setType = (t: UrgenceType) => setState((prev) => ({ ...prev, urgence: { ...prev.urgence, type: t } }));
  const setJustif = (v: string) => setState((prev) => ({ ...prev, urgence: { ...prev.urgence, justification: v } }));

  async function handleEvaluate() {
    setEvaluating(true);
    try {
      const fb = await evaluateUrgence(state);
      setState((prev) => ({
        ...prev,
        urgence: {
          ...prev.urgence,
          score: fb.score,
          attempts: prev.urgence.attempts + 1,
          feedback: fb,
          validated: fb.score >= VALIDATION_THRESHOLD,
          history: [...prev.urgence.history, { ts: new Date().toISOString(), score: fb.score, snapshot: { type: prev.urgence.type, justification: prev.urgence.justification } }],
        },
      }));
    } catch (e: any) { toast.error("Erreur évaluation : " + (e?.message ?? "inconnue")); }
    finally { setEvaluating(false); }
  }
  function handleForce() {
    setState((prev) => ({ ...prev, urgence: { ...prev.urgence, forced: true, validated: true } }));
    onNext();
  }

  return (
    <div>
      <StepHeader
        current={6}
        total={7}
        title="Urgence éthique"
        sub={`Une urgence JUSTIFIÉE par une vraie contrainte — capacité, fenêtre, planning. Pas de countdown fake. Ton avatar doit comprendre POURQUOI c'est limité.`}
      />

      <Card className="mb-4">
        <InputLabel>Type d'urgence</InputLabel>
        <div className="mt-2 flex flex-col gap-2">
          {TYPES.map((t) => (
            <Option key={t.value} selected={u.type === t.value} onClick={() => setType(t.value)}>
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
        <InputLabel>Justification — pourquoi cette contrainte est RÉELLE</InputLabel>
        <TextArea
          rows={4}
          value={u.justification}
          onChange={(e) => setJustif(e.target.value)}
          placeholder={`Ex : 12 places dans la cohorte de septembre, parce que je ne peux pas accompagner sérieusement plus de 12 cake designers en même temps (1to1 + revues de portfolio chronophages). Prochaine cohorte en janvier.`}
        />
        <InputHelper>
          Chiffres + raison opérationnelle. Si tu peux pas justifier honnêtement, c'est un trick — fais autre chose.
        </InputHelper>
      </InputBlock>

      <StepFooter
        feedback={u.feedback}
        score={u.score}
        attempts={u.attempts}
        forced={u.forced}
        validated={u.validated}
        evaluating={evaluating}
        canEvaluate={!!u.type && u.justification.length >= 50}
        onEvaluate={handleEvaluate}
        onBack={onBack}
        onNext={onNext}
        onForce={handleForce}
      />
    </div>
  );
}
