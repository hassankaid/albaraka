import { useState } from "react";
import { toast } from "sonner";
import { TextInput, TextArea, InputBlock, InputLabel, Card } from "../../m1-niche/components/ui";
import { StepHeader } from "../components/StepHeader";
import { StepFooter } from "../components/StepFooter";
import { evaluateStep } from "../lib/aiEvaluator";
import { getHint } from "../lib/hints";
import { pickAvatarName, pickMarket, type M2State } from "../lib/types";

interface Step3Props {
  state: M2State;
  setState: (next: (prev: M2State) => M2State) => void;
  onBack: () => void;
  onNext: () => void;
}

export function Step3Proofs({ state, setState, onBack, onNext }: Step3Props) {
  const [evaluating, setEvaluating] = useState(false);
  const avatar = pickAvatarName(state);
  const proofs = state.data.step3.proofs;

  const set = (idx: number, key: "type" | "who" | "why", val: string) => {
    setState((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as M2State;
      next.data.step3.proofs[idx][key] = val;
      return next;
    });
  };

  const filled = proofs.filter((p) => p.who.trim().length >= 5).length;

  async function handleEvaluate() {
    setEvaluating(true);
    try {
      const fb = await evaluateStep("step3", state);
      setState((prev) => ({
        ...prev,
        scores: { ...prev.scores, step3: fb.score },
        attempts: { ...prev.attempts, step3: prev.attempts.step3 + 1 },
        lastFb: { ...prev.lastFb, step3: fb },
      }));
    } catch (e: any) {
      toast.error("Erreur d'évaluation : " + (e?.message || "inconnue"));
    } finally {
      setEvaluating(false);
    }
  }
  function handleForce() {
    setState((prev) => ({ ...prev, forced: { ...prev.forced, step3: true } }));
    onNext();
  }

  return (
    <div>
      <StepHeader
        current={3}
        total={8}
        title="Preuves sociales — le mur des jumeaux"
        sub={`${avatar} ne veut pas voir des success stories génériques. Il veut voir des JUMEAUX : mêmes âge, mêmes contraintes, même point de départ. Liste 3 preuves sociales qui résonnent à 100% avec son monde.`}
        hint={getHint("step3", pickMarket(state))}
      />

      {proofs.map((p, i) => (
        <Card key={i} className="mb-3">
          <div className="mb-3 flex items-center gap-2">
            <div
              className="flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold"
              style={{
                background: p.who.trim() ? "#C9A84C" : "rgba(201,168,76,0.12)",
                color: p.who.trim() ? "#080808" : "#C9A84C",
              }}
            >
              {i + 1}
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#C9A84C]">
              Preuve {i + 1}
            </span>
          </div>

          <InputBlock>
            <InputLabel>Type de preuve</InputLabel>
            <TextInput
              value={p.type}
              onChange={(e) => set(i, "type", e.target.value)}
              placeholder="Vidéo témoignage 90 sec / Capture Stripe / Étude de cas écrite / Avant-après photo…"
            />
          </InputBlock>

          <InputBlock>
            <InputLabel>Qui exactement (jumeau de {avatar})</InputLabel>
            <TextArea
              rows={2}
              value={p.who}
              onChange={(e) => set(i, "who", e.target.value)}
              placeholder={`Ex : Yacine, 33 ans, magasinier banlieue lyonnaise, marié 2 enfants, passé de 0 à 4 200€/mois en 5 mois`}
            />
          </InputBlock>

          <InputBlock>
            <InputLabel>Pourquoi ça parle à {avatar}</InputLabel>
            <TextArea
              rows={2}
              value={p.why}
              onChange={(e) => set(i, "why", e.target.value)}
              placeholder={`Même profil socio, même contraintes religieuses, même point de départ. ${avatar} pense « si lui l'a fait, je peux le faire ».`}
            />
          </InputBlock>
        </Card>
      ))}

      <StepFooter
        feedback={state.lastFb.step3}
        attempts={state.attempts.step3}
        forced={state.forced.step3}
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
