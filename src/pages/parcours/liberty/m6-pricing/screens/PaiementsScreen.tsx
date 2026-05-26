import { useState } from "react";
import { toast } from "sonner";
import { TextArea, InputBlock, InputLabel, InputHelper, Card } from "../../m1-niche/components/ui";
import { StepHeader } from "../components/StepHeader";
import { StepFooter } from "../components/StepFooter";
import { evaluatePaiements } from "../lib/aiEvaluator";
import { type M6State, validationThreshold } from "../lib/types";
import { CheckSquare, Square } from "lucide-react";

interface Props {
  state: M6State;
  setState: (n: (p: M6State) => M6State) => void;
  onBack: () => void;
  onNext: () => void;
}

const OPTIONS = [
  { key: "1x" as const, label: "1× comptant", desc: "Paiement complet — toujours actif (ancrage prix)" },
  { key: "3x" as const, label: "3× sans frais", desc: "Trimestriel — bon compromis trésorerie/conversion" },
  { key: "6x" as const, label: "6× sans frais", desc: "Semestriel — facilité importante" },
  { key: "12x" as const, label: "12× sans frais", desc: "Annuel — engagement long, conversion max" },
];

export function PaiementsScreen({ state, setState, onBack, onNext }: Props) {
  const [evaluating, setEvaluating] = useState(false);
  const d = state.data.paiements;
  const threshold = validationThreshold(state);

  const toggleOpt = (k: keyof typeof d.options) =>
    setState((prev) => ({
      ...prev,
      data: { ...prev.data, paiements: { ...prev.data.paiements, options: { ...prev.data.paiements.options, [k]: !prev.data.paiements.options[k] } } },
    }));
  const toggleHalal = () =>
    setState((prev) => ({ ...prev, data: { ...prev.data, paiements: { ...prev.data.paiements, note_halal_acknowledged: !prev.data.paiements.note_halal_acknowledged } } }));
  const setPitch = (val: string) =>
    setState((prev) => ({ ...prev, data: { ...prev.data, paiements: { ...prev.data.paiements, pitch_fractionnement: val } } }));

  const selected = (Object.keys(d.options) as Array<keyof typeof d.options>).filter((k) => d.options[k]);
  const canEvaluate = d.options["1x"] && d.note_halal_acknowledged && selected.length >= 2 && d.pitch_fractionnement.trim().length >= 40;

  async function handleEvaluate() {
    setEvaluating(true);
    try {
      const fb = await evaluatePaiements(state);
      setState((prev) => ({
        ...prev,
        scores: { ...prev.scores, paiements: fb.score },
        attempts: { ...prev.attempts, paiements: prev.attempts.paiements + 1 },
        lastFb: { ...prev.lastFb, paiements: fb },
        highest: fb.score >= validationThreshold(prev) && prev.highest === "paiements" ? "bao" : prev.highest,
      }));
    } catch (e: any) { toast.error("Erreur évaluation : " + (e?.message ?? "inconnue")); }
    finally { setEvaluating(false); }
  }

  function handleForce() {
    setState((prev) => ({ ...prev, forced: { ...prev.forced, paiements: true }, highest: prev.highest === "paiements" ? "bao" : prev.highest }));
  }

  const score = state.scores.paiements;
  const fb = state.lastFb.paiements;
  const validated = (score !== null && score >= threshold) || state.forced.paiements;

  return (
    <div>
      <StepHeader
        current={5}
        total={7}
        title="Paiements halal · facilités sans riba"
        sub="Slide 69 — les facilités de paiement boostent la conversion de +20-50%. Slide 81 levier 5 : le fractionnement est un ARGUMENT de pitch, pas juste une option de checkout."
        hint="Aucune majoration sur les paiements échelonnés. Le prix total reste identique en 1x, 3x, 6x, 12x. Pas de riba structurelle."
      />

      {/* Options paiement */}
      <Card className="mb-4">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#C9A84C]">
          Options de paiement (1× obligatoire)
        </div>
        <div className="space-y-2">
          {OPTIONS.map((o) => {
            const checked = d.options[o.key];
            const locked = o.key === "1x"; // 1x toujours actif
            return (
              <button
                key={o.key}
                type="button"
                onClick={() => !locked && toggleOpt(o.key)}
                disabled={locked}
                className="flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors hover:bg-white/[0.02]"
                style={{
                  border: `0.5px solid ${checked ? "rgba(127,176,105,0.4)" : "rgba(201,168,76,0.18)"}`,
                  cursor: locked ? "default" : "pointer",
                  opacity: locked && !checked ? 0.5 : 1,
                }}
              >
                {checked ? <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-[#7FB069]" /> : <Square className="mt-0.5 h-4 w-4 shrink-0 text-white/30" />}
                <span className="flex flex-1 flex-col">
                  <span className="text-[13px] font-semibold text-white">
                    {o.label}{locked && <span className="ml-2 text-[10px] font-normal text-white/40">(toujours actif)</span>}
                  </span>
                  <span className="text-[11.5px] text-white/55">{o.desc}</span>
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Halal acknowledged */}
      <Card className="mb-4">
        <button
          type="button"
          onClick={toggleHalal}
          className="flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors hover:bg-white/[0.02]"
          style={{ border: `0.5px solid ${d.note_halal_acknowledged ? "rgba(127,176,105,0.4)" : "rgba(232,107,107,0.4)"}` }}
        >
          {d.note_halal_acknowledged ? <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-[#7FB069]" /> : <Square className="mt-0.5 h-4 w-4 shrink-0 text-[#E86B6B]" />}
          <span className="text-[13px] leading-[1.5] text-white/85">
            <strong>Je confirme :</strong> 0% d'intérêt / majoration sur les paiements échelonnés. Le prix total reste identique
            quel que soit le mode de paiement. <em className="text-white/50">(Pas de riba structurelle.)</em>
          </span>
        </button>
      </Card>

      {/* Pitch fractionnement */}
      <Card className="mb-5">
        <InputBlock>
          <InputLabel>Pitch fractionnement (40+ chars) *</InputLabel>
          <TextArea
            rows={3}
            value={d.pitch_fractionnement}
            onChange={(e) => setPitch(e.target.value)}
            placeholder="Ex : Tu peux régler en 3 fois sans frais, soit 999€/mois sur 3 mois, et démarrer le programme dès aujourd'hui — paye au rythme de tes premiers résultats."
          />
          <InputHelper>Slide 81 levier 5 : présente le fractionnement EN PROACTIF, pas en cas de doute. Mensualité concrète + bénéfice immédiat.</InputHelper>
        </InputBlock>
      </Card>

      <StepFooter
        feedback={fb}
        score={score}
        attempts={state.attempts.paiements}
        forced={state.forced.paiements}
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
