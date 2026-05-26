import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { TextArea, InputBlock, InputLabel, InputHelper, Card } from "../../m1-niche/components/ui";
import { StepHeader } from "../components/StepHeader";
import { StepFooter } from "../components/StepFooter";
import { evaluateEatComplexity } from "../lib/aiEvaluator";
import { type M5State, type EatComplexityRow, validationThreshold } from "../lib/types";

interface Props {
  state: M5State;
  setState: (n: (p: M5State) => M5State) => void;
  onBack: () => void;
  onNext: () => void;
}

export function EatComplexityScreen({ state, setState, onBack, onNext }: Props) {
  const [evaluating, setEvaluating] = useState(false);
  const rows = state.data.eatcomplex.rows;
  const threshold = validationThreshold(state);

  const setRow = (idx: number, patch: Partial<EatComplexityRow>) =>
    setState((prev) => ({
      ...prev,
      data: {
        ...prev.data,
        eatcomplex: {
          rows: prev.data.eatcomplex.rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
        },
      },
    }));
  const addRow = () =>
    setState((prev) => ({
      ...prev,
      data: { ...prev.data, eatcomplex: { rows: [...prev.data.eatcomplex.rows, { client_step: "", what_you_eat: "", what_remains: "" }] } },
    }));
  const removeRow = (idx: number) =>
    setState((prev) => ({
      ...prev,
      data: { ...prev.data, eatcomplex: { rows: prev.data.eatcomplex.rows.filter((_, i) => i !== idx) } },
    }));

  const filled = rows.filter((r) => r.client_step.trim() && r.what_you_eat.trim());
  const canEvaluate = filled.length >= 4;

  async function handleEvaluate() {
    setEvaluating(true);
    try {
      const fb = await evaluateEatComplexity(state);
      setState((prev) => ({
        ...prev,
        scores: { ...prev.scores, eatcomplex: fb.score },
        attempts: { ...prev.attempts, eatcomplex: prev.attempts.eatcomplex + 1 },
        lastFb: { ...prev.lastFb, eatcomplex: { verdict: fb.verdict, strengths: fb.strengths, weaknesses: fb.weaknesses, suggestions: fb.suggestions, ai_mode: fb.ai_mode } },
        highest: fb.score >= validationThreshold(prev) && prev.highest === "eatcomplex" ? "structure" : prev.highest,
      }));
    } catch (e: any) {
      toast.error("Erreur évaluation : " + (e?.message ?? "inconnue"));
    } finally { setEvaluating(false); }
  }

  function handleForce() {
    setState((prev) => ({
      ...prev,
      forced: { ...prev.forced, eatcomplex: true },
      highest: prev.highest === "eatcomplex" ? "structure" : prev.highest,
    }));
  }

  const score = state.scores.eatcomplex;
  const fb = state.lastFb.eatcomplex;
  const validated = (score !== null && score >= threshold) || state.forced.eatcomplex;

  return (
    <div>
      <StepHeader
        current={3}
        total={5}
        title="Eat the Complexity — tu manges, ton client digère"
        sub="Plus tu absorbes de complexité (templates, audits, scripts, briefs), plus ton client peut digérer le simple. Si la colonne « ce qui reste au client » est plus longue que « ce que tu manges » sur 3 lignes ou plus, c'est l'anti-pattern."
        hint="Anti-pattern Eat Complexity inversé : si TOI tu fournis juste un « accompagnement » et que le client doit tout produire (audit, scripts, funnels), tu vends en fait du coaching, pas un HT."
      />

      <Card className="mb-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_3fr_3fr_auto]">
          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#C9A84C]">Étape client</div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#7FB069]">Ce que TOI tu manges</div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#FFB450]">Ce qui reste au client</div>
          <div />
        </div>
      </Card>

      <div className="mb-5 space-y-3">
        {rows.map((row, i) => (
          <Card key={i}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_3fr_3fr_auto]">
              <InputBlock>
                <InputLabel>Étape {i + 1}</InputLabel>
                <TextArea
                  rows={3}
                  value={row.client_step}
                  onChange={(e) => setRow(i, { client_step: e.target.value })}
                  placeholder="Ex : Sélectionner ses 5 produits halal à promouvoir"
                />
              </InputBlock>
              <InputBlock>
                <InputLabel>Ce que tu manges (digère pour lui)</InputLabel>
                <TextArea
                  rows={3}
                  value={row.what_you_eat}
                  onChange={(e) => setRow(i, { what_you_eat: e.target.value })}
                  placeholder="Ex : Catalogue annoté de 30 produits halal validés par notre comité + score conversion historique + filtres par niche"
                />
              </InputBlock>
              <InputBlock>
                <InputLabel>Ce qui reste au client</InputLabel>
                <TextArea
                  rows={3}
                  value={row.what_remains}
                  onChange={(e) => setRow(i, { what_remains: e.target.value })}
                  placeholder="Ex : Choisir 5 produits dans le catalogue selon son audience (15 min)"
                />
              </InputBlock>
              <div className="flex items-start sm:items-end">
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  className="mt-1 inline-flex items-center justify-center rounded-md p-2 text-white/40 hover:text-[#E86B6B]"
                  title="Supprimer cette ligne"
                  disabled={rows.length <= 3}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <button
        type="button"
        onClick={addRow}
        className="mb-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium"
        style={{ background: "rgba(201,168,76,0.06)", border: "0.5px dashed rgba(201,168,76,0.4)", color: "#C9A84C" }}
      >
        <Plus className="h-3 w-3" />
        Ajouter une ligne ({rows.length} actuellement)
      </button>

      <InputHelper>
        Minimum 4 lignes remplies pour faire évaluer. L'IA détecte l'inversion (client plus chargé que toi) + le filler.
      </InputHelper>

      <div className="mt-4">
        <StepFooter
          feedback={fb}
          score={score}
          attempts={state.attempts.eatcomplex}
          forced={state.forced.eatcomplex}
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
    </div>
  );
}
