import { useState } from "react";
import { toast } from "sonner";
import { TextArea, InputBlock, InputLabel, InputHelper, Card } from "../../m1-niche/components/ui";
import { StepHeader } from "../components/StepHeader";
import { StepFooter } from "../components/StepFooter";
import { evaluateStep } from "../lib/aiEvaluator";
import { pickAvatarName, type M2State } from "../lib/types";

interface Step8Props {
  state: M2State;
  setState: (next: (prev: M2State) => M2State) => void;
  onBack: () => void;
  onNext: () => void;
}

const FIELDS: Array<{
  key: keyof M2State["data"]["step8"];
  emoji: string;
  label: string;
  hint: string;
  placeholder: string;
}> = [
  {
    key: "positionnement",
    emoji: "🎯",
    label: "Positionnement",
    hint: "Le seul X qui combine Y et Z pour la cible W. Différentiation claire vs concurrents.",
    placeholder: "Le seul accompagnement d'affiliation halal qui combine rigueur fiqh + reproductibilité technique pour les salariés musulmans.",
  },
  {
    key: "hook_principal",
    emoji: "🪝",
    label: "Hook principal",
    hint: "1 phrase courte, en TU, qui ouvre une boucle dans la tête de l'avatar.",
    placeholder: "« Le dimanche soir, tu calcules combien il te reste pour finir le mois ? »",
  },
  {
    key: "levier_secondaire",
    emoji: "🪜",
    label: "Levier émotionnel secondaire",
    hint: "Le 2e angle émotionnel à frapper (transmission, dignité, héritage, peur de la perte…).",
    placeholder: "Insister sur la dimension transmission + dignité familiale (« tes enfants te verront comme l'oncle Adel qui a osé »).",
  },
  {
    key: "biais_killer",
    emoji: "⚡",
    label: "Biais-killer (le biais à activer en priorité)",
    hint: "Le biais cognitif le plus rentable à activer pour faire passer à l'action.",
    placeholder: "Aversion à la perte. Mon offre DOIT cadrer en perte : « chaque mois sans démarrer = X€ perdus + X opportunités ratées ».",
  },
  {
    key: "phase_strategy",
    emoji: "🗺️",
    label: "Stratégie pour la phase identifiée en étape 6",
    hint: "Concrétise la phase choisie en 2-3 leviers actionnables.",
    placeholder: "Karim est en Considération. Donc : (1) Témoignages d'élèves jumeaux. (2) Lead magnet pédagogique. (3) Audit gratuit 30 min sans pitch.",
  },
  {
    key: "directives_copywriting",
    emoji: "📝",
    label: "Directives de copywriting",
    hint: "Mots à utiliser systématiquement / à BANNIR. C'est la charte éditoriale qui pilotera le M3.",
    placeholder: "À UTILISER : baraka, dignité, transmission, halal, méthode, akhira, alhamdulillah. À BANNIR : riba, easy money, MLM, get rich quick, gourou.",
  },
];

export function Step8Brief({ state, setState, onBack, onNext }: Step8Props) {
  const [evaluating, setEvaluating] = useState(false);
  const avatar = pickAvatarName(state);
  const s8 = state.data.step8;

  const set = (key: keyof M2State["data"]["step8"], val: string) => {
    setState((prev) => ({
      ...prev,
      data: { ...prev.data, step8: { ...prev.data.step8, [key]: val } },
    }));
  };

  const filled = FIELDS.filter((f) => (s8[f.key] ?? "").length > 15).length;

  async function handleEvaluate() {
    setEvaluating(true);
    try {
      const fb = await evaluateStep("step8", state);
      setState((prev) => ({
        ...prev,
        scores: { ...prev.scores, step8: fb.score },
        attempts: { ...prev.attempts, step8: prev.attempts.step8 + 1 },
        lastFb: { ...prev.lastFb, step8: fb },
      }));
    } catch (e: any) {
      toast.error("Erreur d'évaluation : " + (e?.message || "inconnue"));
    } finally {
      setEvaluating(false);
    }
  }
  function handleForce() {
    setState((prev) => ({ ...prev, forced: { ...prev.forced, step8: true } }));
    onNext();
  }

  return (
    <div>
      <StepHeader
        current={8}
        total={8}
        title="Brief stratégique final"
        sub={`Synthèse des 7 étapes précédentes en 6 champs. C'est ce que ${avatar} verra à travers ton copy : positionnement, hook, levier, biais, phase strategy, directives. Le M3 va consommer ce brief pour produire tout le copywriting.`}
      />

      {FIELDS.map((f) => (
        <Card key={f.key} className="mb-3">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#C9A84C]">
            <span>{f.emoji}</span>
            {f.label}
          </div>
          <InputBlock>
            <TextArea
              rows={3}
              value={s8[f.key] ?? ""}
              onChange={(e) => set(f.key, e.target.value)}
              placeholder={f.placeholder}
            />
            <InputHelper>{f.hint}</InputHelper>
          </InputBlock>
        </Card>
      ))}

      <StepFooter
        feedback={state.lastFb.step8}
        attempts={state.attempts.step8}
        forced={state.forced.step8}
        evaluating={evaluating}
        canEvaluate={filled >= 4}
        onEvaluate={handleEvaluate}
        onBack={onBack}
        onNext={onNext}
        onForce={handleForce}
        nextLabel="Verrouiller le brief"
      />
    </div>
  );
}
