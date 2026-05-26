import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { TextInput, TextArea, InputBlock, InputLabel, InputHelper, Card } from "../../m1-niche/components/ui";
import { StepHeader } from "../components/StepHeader";
import { StepFooter } from "../components/StepFooter";
import { evaluateBonus } from "../lib/aiEvaluator";
import { type M3State, VALIDATION_THRESHOLD } from "../lib/types";

interface Props { state: M3State; setState: (n: (p: M3State) => M3State) => void; onBack: () => void; onNext: () => void; }

export function BonusScreen({ state, setState, onBack, onNext }: Props) {
  const [evaluating, setEvaluating] = useState(false);
  const b = state.bonus;

  const setItem = (i: number, key: "nom" | "valeur" | "raison", val: string) => setState((prev) => {
    const items = [...prev.bonus.items];
    items[i] = { ...items[i], [key]: val };
    return { ...prev, bonus: { ...prev.bonus, items } };
  });
  const addItem = () => setState((prev) => ({
    ...prev,
    bonus: { ...prev.bonus, items: [...prev.bonus.items, { nom: "", valeur: "", raison: "" }] },
  }));
  const removeItem = (i: number) => setState((prev) => ({
    ...prev,
    bonus: { ...prev.bonus, items: prev.bonus.items.filter((_, idx) => idx !== i) },
  }));

  async function handleEvaluate() {
    setEvaluating(true);
    try {
      const fb = await evaluateBonus(state);
      setState((prev) => ({
        ...prev,
        bonus: {
          ...prev.bonus,
          score: fb.score,
          attempts: prev.bonus.attempts + 1,
          feedback: fb,
          validated: fb.score >= VALIDATION_THRESHOLD,
          history: [...prev.bonus.history, { ts: new Date().toISOString(), score: fb.score, snapshot: { items: prev.bonus.items } }],
        },
      }));
    } catch (e: any) { toast.error("Erreur évaluation : " + (e?.message ?? "inconnue")); }
    finally { setEvaluating(false); }
  }
  function handleForce() {
    setState((prev) => ({ ...prev, bonus: { ...prev.bonus, forced: true, validated: true } }));
    onNext();
  }

  const filled = b.items.filter((it) => it.nom.trim().length > 3 && it.raison.trim().length > 10).length;

  return (
    <div>
      <StepHeader
        current={4}
        total={7}
        title="Bonus stratégiques (2-3 minimum)"
        sub={`Chaque bonus lève UNE objection clé OU accélère UN résultat clé. Pas des bonus PDF gadget — des actifs qui justifient un prix premium.`}
      />

      {b.items.map((item, i) => (
        <Card key={i} className="mb-3">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#C9A84C]">
              <span
                className="flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold"
                style={{
                  background: item.nom.trim() ? "#C9A84C" : "rgba(201,168,76,0.12)",
                  color: item.nom.trim() ? "#080808" : "#C9A84C",
                }}
              >
                {i + 1}
              </span>
              Bonus {i + 1}
            </div>
            {b.items.length > 2 && (
              <button
                type="button"
                onClick={() => removeItem(i)}
                className="text-[11px] text-white/30 hover:text-red-400 inline-flex items-center gap-1"
              >
                <Trash2 className="h-3 w-3" />
                Supprimer
              </button>
            )}
          </div>

          <InputBlock>
            <InputLabel>Nom du bonus (concret)</InputLabel>
            <TextInput
              value={item.nom}
              onChange={(e) => setItem(i, "nom", e.target.value)}
              placeholder="Ex : Pack Photos Pro · 30 fonds + scripts d'éclairage smartphone"
            />
          </InputBlock>

          <InputBlock>
            <InputLabel>Valeur perçue (€)</InputLabel>
            <TextInput
              value={item.valeur}
              onChange={(e) => setItem(i, "valeur", e.target.value)}
              placeholder="Ex : 297€"
            />
          </InputBlock>

          <InputBlock>
            <InputLabel>Raison stratégique — quelle objection ce bonus lève ?</InputLabel>
            <TextArea
              rows={2}
              value={item.raison}
              onChange={(e) => setItem(i, "raison", e.target.value)}
              placeholder="Ex : Permet de produire des photos qui justifient un prix premium dès la semaine 2, avant même d'avoir terminé son nouveau portfolio."
            />
            <InputHelper>Si on retire ce bonus, qu'est-ce qui craque dans le parcours ?</InputHelper>
          </InputBlock>
        </Card>
      ))}

      <button
        type="button"
        onClick={addItem}
        className="mb-4 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[11px] font-semibold transition-colors"
        style={{
          background: "rgba(201,168,76,0.06)",
          border: "0.5px dashed rgba(201,168,76,0.4)",
          color: "#C9A84C",
        }}
      >
        <Plus className="h-3 w-3" />
        Ajouter un bonus
      </button>

      <StepFooter
        feedback={b.feedback}
        score={b.score}
        attempts={b.attempts}
        forced={b.forced}
        validated={b.validated}
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
