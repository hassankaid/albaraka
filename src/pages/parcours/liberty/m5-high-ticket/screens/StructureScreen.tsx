import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { TextArea, InputBlock, InputLabel, InputHelper, Card, TextInput } from "../../m1-niche/components/ui";
import { StepHeader } from "../components/StepHeader";
import { StepFooter } from "../components/StepFooter";
import { evaluateStructure } from "../lib/aiEvaluator";
import { type M5State, type StructurePhase, validationThreshold, pickMecanismeText } from "../lib/types";

interface Props {
  state: M5State;
  setState: (n: (p: M5State) => M5State) => void;
  onBack: () => void;
  onNext: () => void;
}

export function StructureScreen({ state, setState, onBack, onNext }: Props) {
  const [evaluating, setEvaluating] = useState(false);
  const struct = state.data.structure;
  const threshold = validationThreshold(state);
  const mecanisme = pickMecanismeText(state);

  const setStruct = (patch: Partial<typeof struct>) =>
    setState((prev) => ({ ...prev, data: { ...prev.data, structure: { ...prev.data.structure, ...patch } } }));
  const setPhase = (idx: number, patch: Partial<StructurePhase>) =>
    setState((prev) => ({
      ...prev,
      data: {
        ...prev.data,
        structure: {
          ...prev.data.structure,
          phases: prev.data.structure.phases.map((p, i) => (i === idx ? { ...p, ...patch } : p)),
        },
      },
    }));
  const addPhase = () =>
    setState((prev) => ({
      ...prev,
      data: {
        ...prev.data,
        structure: {
          ...prev.data.structure,
          phases: [...prev.data.structure.phases, { num: prev.data.structure.phases.length + 1, name: "", weeks: "", livrables: "" }],
        },
      },
    }));
  const removePhase = (idx: number) =>
    setState((prev) => ({
      ...prev,
      data: {
        ...prev.data,
        structure: {
          ...prev.data.structure,
          phases: prev.data.structure.phases.filter((_, i) => i !== idx).map((p, i) => ({ ...p, num: i + 1 })),
        },
      },
    }));

  const filled = struct.phases.filter((p) => p.name.trim() && p.livrables.trim());
  const canEvaluate = filled.length >= 3 && struct.mecanisme_anchor.trim().length >= 10;

  async function handleEvaluate() {
    setEvaluating(true);
    try {
      const fb = await evaluateStructure(state);
      setState((prev) => ({
        ...prev,
        scores: { ...prev.scores, structure: fb.score },
        attempts: { ...prev.attempts, structure: prev.attempts.structure + 1 },
        lastFb: { ...prev.lastFb, structure: { verdict: fb.verdict, strengths: fb.strengths, weaknesses: fb.weaknesses, suggestions: fb.suggestions, ai_mode: fb.ai_mode } },
        highest: fb.score >= validationThreshold(prev) && prev.highest === "structure" ? "conviction" : prev.highest,
      }));
    } catch (e: any) {
      toast.error("Erreur évaluation : " + (e?.message ?? "inconnue"));
    } finally { setEvaluating(false); }
  }

  function handleForce() {
    setState((prev) => ({
      ...prev,
      forced: { ...prev.forced, structure: true },
      highest: prev.highest === "structure" ? "conviction" : prev.highest,
    }));
  }

  const score = state.scores.structure;
  const fb = state.lastFb.structure;
  const validated = (score !== null && score >= threshold) || state.forced.structure;

  return (
    <div>
      <StepHeader
        current={4}
        total={5}
        title="Structure 12 semaines · promesse 90 jours"
        sub={`Mappe ${mecanisme} sur 3 phases. Pas un dogme — c'est ce que les offres validées montrent : 12 semaines avec une promesse à 90 jours, livrables concrets par phase.`}
      />

      <Card className="mb-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <InputBlock>
            <InputLabel>Durée totale (semaines)</InputLabel>
            <TextInput
              type="number"
              value={String(struct.total_weeks)}
              onChange={(e) => setStruct({ total_weeks: Math.max(1, Math.min(52, parseInt(e.target.value, 10) || 12)) })}
            />
            <InputHelper>Sweet-spot 8-16 semaines.</InputHelper>
          </InputBlock>
          <InputBlock>
            <InputLabel>Promesse à X jours</InputLabel>
            <TextInput
              type="number"
              value={String(struct.promise_days)}
              onChange={(e) => setStruct({ promise_days: Math.max(7, Math.min(365, parseInt(e.target.value, 10) || 90)) })}
            />
            <InputHelper>Sweet-spot 60-100 jours.</InputHelper>
          </InputBlock>
        </div>
        <InputBlock>
          <InputLabel>Ancrage mécanisme (référence M3) *</InputLabel>
          <TextInput
            value={struct.mecanisme_anchor}
            onChange={(e) => setStruct({ mecanisme_anchor: e.target.value })}
            placeholder={`Ex : ${mecanisme} décliné en 3 cycles progressifs`}
          />
          <InputHelper>Précise comment les phases sont l'incarnation pratique de ton mécanisme M3.</InputHelper>
        </InputBlock>
      </Card>

      {/* Phases */}
      <div className="mb-5 space-y-3">
        {struct.phases.map((phase, i) => (
          <Card key={i}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_3fr_auto]">
              <InputBlock>
                <InputLabel>Phase {phase.num}</InputLabel>
                <TextInput
                  value={phase.weeks}
                  onChange={(e) => setPhase(i, { weeks: e.target.value })}
                  placeholder="1-3"
                />
              </InputBlock>
              <InputBlock>
                <InputLabel>Nom de la phase</InputLabel>
                <TextInput
                  value={phase.name}
                  onChange={(e) => setPhase(i, { name: e.target.value })}
                  placeholder="Ex : Fondation halal & cartographie"
                />
              </InputBlock>
              <InputBlock>
                <InputLabel>Livrables concrets</InputLabel>
                <TextArea
                  rows={2}
                  value={phase.livrables}
                  onChange={(e) => setPhase(i, { livrables: e.target.value })}
                  placeholder="Ex : Liste de 5 produits validés + tunnel opérationnel + portfolio v0"
                />
              </InputBlock>
              <div className="flex items-start sm:items-end">
                <button
                  type="button"
                  onClick={() => removePhase(i)}
                  className="mt-1 inline-flex items-center justify-center rounded-md p-2 text-white/40 hover:text-[#E86B6B]"
                  title="Supprimer cette phase"
                  disabled={struct.phases.length <= 2}
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
        onClick={addPhase}
        className="mb-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium"
        style={{ background: "rgba(201,168,76,0.06)", border: "0.5px dashed rgba(201,168,76,0.4)", color: "#C9A84C" }}
      >
        <Plus className="h-3 w-3" />
        Ajouter une phase ({struct.phases.length} actuellement)
      </button>

      <StepFooter
        feedback={fb}
        score={score}
        attempts={state.attempts.structure}
        forced={state.forced.structure}
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
