import { useState } from "react";
import { toast } from "sonner";
import { TextArea, InputBlock, InputLabel, InputHelper, Card } from "../../m1-niche/components/ui";
import { StepHeader } from "../components/StepHeader";
import { StepFooter } from "../components/StepFooter";
import { evaluateStep } from "../lib/aiEvaluator";
import { pickAvatarName, type M2State, type VocabState } from "../lib/types";

interface Step7Props {
  state: M2State;
  setState: (next: (prev: M2State) => M2State) => void;
  onBack: () => void;
  onNext: () => void;
}

type VocabKey = keyof VocabState;
const VOCAB_FIELDS: Array<{ key: VocabKey; emoji: string; label: string; placeholder: string; hint: string }> = [
  {
    key: "douleur_mots",
    emoji: "⚡",
    label: "Mots-douleur",
    placeholder: "j'en peux plus · résignation · scroll Instagram puis dégoût · j'ai honte …",
    hint: "Les mots que ton avatar EMPLOIE pour décrire sa douleur. Sépare avec · ou tirets.",
  },
  {
    key: "desir_mots",
    emoji: "✨",
    label: "Mots-désir",
    placeholder: "respirer enfin · sans dévier du halal · alhamdulillah · donner sans calculer …",
    hint: "Les mots qui peignent le futur désirable. Sensoriels, pas conceptuels.",
  },
  {
    key: "positifs",
    emoji: "✅",
    label: "Mots positifs (à utiliser systématiquement)",
    placeholder: "halal · baraka · transmission · dignité · sunnah · communauté …",
    hint: "Les mots qui activent les valeurs profondes. À recycler dans 80% du copy.",
  },
  {
    key: "negatifs",
    emoji: "❌",
    label: "Mots négatifs (à BANNIR)",
    placeholder: "riba · easy money · get rich quick · gourou · MLM · freedom (trop bobo) …",
    hint: "Tout ce qui repousse ton avatar ou trahit son monde. À ne JAMAIS utiliser.",
  },
  {
    key: "formulations",
    emoji: "💬",
    label: "Formulations entendues",
    placeholder: "« j'ai pas le temps mais surtout j'ai pas la méthode » / « si seulement quelqu'un m'avait dit ça il y a 5 ans » …",
    hint: "Phrases entières que ton avatar pourrait dire mot pour mot. Sépare avec /.",
  },
];

export function Step7Vocab({ state, setState, onBack, onNext }: Step7Props) {
  const [evaluating, setEvaluating] = useState(false);
  const avatar = pickAvatarName(state);
  const vocab = state.data.step7.vocab;

  const setList = (key: VocabKey, rawValue: string) => {
    // Parse les listes en split par · / | ou newline
    const items = rawValue
      .split(/[·•|\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    setState((prev) => ({
      ...prev,
      data: {
        ...prev.data,
        step7: { ...prev.data.step7, vocab: { ...prev.data.step7.vocab, [key]: items } },
      },
    }));
  };

  const filled = VOCAB_FIELDS.filter((f) => vocab[f.key].length >= 3).length;

  async function handleEvaluate() {
    setEvaluating(true);
    try {
      const fb = await evaluateStep("step7", state);
      setState((prev) => ({
        ...prev,
        scores: { ...prev.scores, step7: fb.score },
        attempts: { ...prev.attempts, step7: prev.attempts.step7 + 1 },
        lastFb: { ...prev.lastFb, step7: fb },
      }));
    } catch (e: any) {
      toast.error("Erreur d'évaluation : " + (e?.message || "inconnue"));
    } finally {
      setEvaluating(false);
    }
  }
  function handleForce() {
    setState((prev) => ({ ...prev, forced: { ...prev.forced, step7: true } }));
    onNext();
  }

  return (
    <div>
      <StepHeader
        current={7}
        total={8}
        title="Vocabulaire à utiliser dans le copy"
        sub={`Les bons mots = la différence entre un copy qui résonne et un copy qui glisse. Liste les expressions de ${avatar}, ses mots-déclencheurs, et ce qui le repousse instantanément.`}
      />

      {VOCAB_FIELDS.map((f) => (
        <Card key={f.key} className="mb-3">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#C9A84C]">
            <span>{f.emoji}</span>
            {f.label}
          </div>
          <InputBlock>
            <InputLabel>Liste (sépare avec · ou /)</InputLabel>
            <TextArea
              rows={2}
              value={vocab[f.key].join(" · ")}
              onChange={(e) => setList(f.key, e.target.value)}
              placeholder={f.placeholder}
            />
            <InputHelper>{f.hint}</InputHelper>
            <p className="mt-1 text-[10px] text-white/40">
              {vocab[f.key].length} entrées {vocab[f.key].length < 3 && "· min. 3 requis"}
            </p>
          </InputBlock>
        </Card>
      ))}

      <StepFooter
        feedback={state.lastFb.step7}
        attempts={state.attempts.step7}
        forced={state.forced.step7}
        evaluating={evaluating}
        canEvaluate={filled >= 3}
        onEvaluate={handleEvaluate}
        onBack={onBack}
        onNext={onNext}
        onForce={handleForce}
      />
    </div>
  );
}
