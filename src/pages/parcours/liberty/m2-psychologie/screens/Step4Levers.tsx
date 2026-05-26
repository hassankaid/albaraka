import { useState } from "react";
import { toast } from "sonner";
import { TextArea, InputBlock, InputLabel, InputHelper, Card } from "../../m1-niche/components/ui";
import { StepHeader } from "../components/StepHeader";
import { StepFooter } from "../components/StepFooter";
import { evaluateStep } from "../lib/aiEvaluator";
import { pickAvatarName, type M2State } from "../lib/types";

interface Step4Props {
  state: M2State;
  setState: (next: (prev: M2State) => M2State) => void;
  onBack: () => void;
  onNext: () => void;
}

type LeverKey = "rarete" | "reciprocite" | "engagement";
const LEVERS: { key: LeverKey; emoji: string; label: string; sub: string }[] = [
  { key: "rarete", emoji: "⏳", label: "Rareté", sub: "Cohorte limitée, fenêtre temporelle, capacité réelle. Pas un marketing trick." },
  { key: "reciprocite", emoji: "🎁", label: "Réciprocité", sub: "Donne de la valeur AVANT que l'avatar sorte sa carte. Audit, guide, masterclass…" },
  { key: "engagement", emoji: "🪜", label: "Engagement progressif", sub: "Échelle de prix qui prouve la qualité à chaque palier. Gratuit → bas → moyen → high-ticket." },
];

export function Step4Levers({ state, setState, onBack, onNext }: Step4Props) {
  const [evaluating, setEvaluating] = useState(false);
  const avatar = pickAvatarName(state);

  const set = (lever: LeverKey, key: "angle" | "justif", val: string) => {
    setState((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as M2State;
      next.data.step4[lever][key] = val;
      return next;
    });
  };

  const filled = LEVERS.filter(
    (l) =>
      state.data.step4[l.key].angle.length >= 10 &&
      state.data.step4[l.key].justif.length >= 10,
  ).length;

  async function handleEvaluate() {
    setEvaluating(true);
    try {
      const fb = await evaluateStep("step4", state);
      setState((prev) => ({
        ...prev,
        scores: { ...prev.scores, step4: fb.score },
        attempts: { ...prev.attempts, step4: prev.attempts.step4 + 1 },
        lastFb: { ...prev.lastFb, step4: fb },
      }));
    } catch (e: any) {
      toast.error("Erreur d'évaluation : " + (e?.message || "inconnue"));
    } finally {
      setEvaluating(false);
    }
  }
  function handleForce() {
    setState((prev) => ({ ...prev, forced: { ...prev.forced, step4: true } }));
    onNext();
  }

  return (
    <div>
      <StepHeader
        current={4}
        total={8}
        title="Leviers de persuasion éthiques"
        sub={`Trois leviers psychologiques à activer pour faire passer ${avatar} à l'action — sans trick, sans pression artificielle. Chaque levier doit être CONCRET et JUSTIFIÉ par la réalité de ton offre.`}
      />

      {LEVERS.map((l) => {
        const v = state.data.step4[l.key];
        return (
          <Card key={l.key} className="mb-3">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#C9A84C]">
              <span className="text-base">{l.emoji}</span>
              {l.label}
            </div>
            <p className="mb-3 text-[12px] text-white/50">{l.sub}</p>

            <InputBlock>
              <InputLabel>Angle concret</InputLabel>
              <TextArea
                rows={2}
                value={v.angle}
                onChange={(e) => set(l.key, "angle", e.target.value)}
                placeholder={
                  l.key === "rarete"
                    ? "Cohorte fermée à 12 places, 1 par trimestre. Capacité réelle de coaching hebdo."
                    : l.key === "reciprocite"
                      ? "Audit gratuit 30 min (sans pitch) + Guide PDF des 5 erreurs qui coûtent 3 mois"
                      : "Guide gratuit → Mini-formation 27€ → Masterclass 97€ → Cohorte 1997€"
                }
              />
            </InputBlock>

            <InputBlock>
              <InputLabel>Justification (pourquoi c'est crédible)</InputLabel>
              <TextArea
                rows={2}
                value={v.justif}
                onChange={(e) => set(l.key, "justif", e.target.value)}
                placeholder={`Pourquoi ce levier marche pour ${avatar} précisément, et pourquoi ce n'est pas un trick mais une réalité.`}
              />
              <InputHelper>
                Si la justif ressemble à du marketing creux, ré-écris-la. {avatar} sent l'astuce à
                3 km.
              </InputHelper>
            </InputBlock>
          </Card>
        );
      })}

      <StepFooter
        feedback={state.lastFb.step4}
        attempts={state.attempts.step4}
        forced={state.forced.step4}
        evaluating={evaluating}
        canEvaluate={filled >= 2}
        onEvaluate={handleEvaluate}
        onBack={onBack}
        onNext={onNext}
        onForce={handleForce}
      />
    </div>
  );
}
