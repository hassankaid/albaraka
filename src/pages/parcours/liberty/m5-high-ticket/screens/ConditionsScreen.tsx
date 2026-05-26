import { useState } from "react";
import { toast } from "sonner";
import { TextArea, InputBlock, InputLabel, InputHelper, Card, TextInput } from "../../m1-niche/components/ui";
import { StepHeader } from "../components/StepHeader";
import { StepFooter } from "../components/StepFooter";
import { evaluateConditions } from "../lib/aiEvaluator";
import {
  type M5State, type ConditionAxisKey, type ConditionAxis,
  CONDITION_AXES, validationThreshold,
} from "../lib/types";

interface Props {
  state: M5State;
  setState: (n: (p: M5State) => M5State) => void;
  onBack: () => void;
  onNext: () => void;
}

export function ConditionsScreen({ state, setState, onBack, onNext }: Props) {
  const [evaluating, setEvaluating] = useState(false);
  const conds = state.data.conditions;
  const threshold = validationThreshold(state);
  const weakestM3 = state.m3_data?.weakest_lever ?? state.m3_data?.prix?.levier_faible ?? null;

  const setAxis = (key: ConditionAxisKey, patch: Partial<ConditionAxis>) =>
    setState((prev) => ({
      ...prev,
      data: {
        ...prev.data,
        conditions: {
          ...prev.data.conditions,
          [key]: { ...prev.data.conditions[key], ...patch },
        },
      },
    }));
  const setConds = (patch: Partial<typeof conds>) =>
    setState((prev) => ({ ...prev, data: { ...prev.data, conditions: { ...prev.data.conditions, ...patch } } }));

  const canEvaluate = (["simple", "rapide", "systematique", "aspirante"] as ConditionAxisKey[])
    .every((k) => (conds[k].justification || "").trim().length >= 30) &&
    (conds.action_plan || "").trim().length >= 30;

  async function handleEvaluate() {
    setEvaluating(true);
    try {
      const fb = await evaluateConditions(state);
      setState((prev) => ({
        ...prev,
        data: { ...prev.data, conditions: { ...prev.data.conditions, weakest_axis: fb.weakest_axis ?? prev.data.conditions.weakest_axis } },
        scores: { ...prev.scores, conditions: fb.score },
        attempts: { ...prev.attempts, conditions: prev.attempts.conditions + 1 },
        lastFb: { ...prev.lastFb, conditions: { verdict: fb.verdict, strengths: fb.strengths, weaknesses: fb.weaknesses, suggestions: fb.suggestions, weakest_axis: fb.weakest_axis, ai_mode: fb.ai_mode } },
        highest: fb.score >= validationThreshold(prev) && prev.highest === "conditions" ? "eatcomplex" : prev.highest,
      }));
    } catch (e: any) {
      toast.error("Erreur évaluation : " + (e?.message ?? "inconnue"));
    } finally { setEvaluating(false); }
  }

  function handleForce() {
    setState((prev) => ({
      ...prev,
      forced: { ...prev.forced, conditions: true },
      highest: prev.highest === "conditions" ? "eatcomplex" : prev.highest,
    }));
  }

  const score = state.scores.conditions;
  const fb = state.lastFb.conditions;
  const validated = (score !== null && score >= threshold) || state.forced.conditions;

  return (
    <div>
      <StepHeader
        current={2}
        total={5}
        title="Les 4 conditions Hormozi"
        sub="Simple / Rapide / Systématique / Aspirante. Tu notes ton HT (0-10) sur chaque axe et tu JUSTIFIES chaque note avec des faits concrets. L'IA refuse l'uniformité 9-10 sans variance."
        hint={weakestM3 ? `Levier faible identifié en M3 : « ${weakestM3} ». L'audit M5 doit confirmer ou contredire avec preuves.` : undefined}
      />

      {/* 4 axes */}
      <div className="mb-5 space-y-4">
        {CONDITION_AXES.map((axisCfg) => {
          const axis = conds[axisCfg.key];
          const isWeakest = conds.weakest_axis === axisCfg.key;
          return (
            <Card key={axisCfg.key}>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{axisCfg.emoji}</span>
                  <div>
                    <div className="text-[14px] font-semibold text-white">{axisCfg.label}</div>
                    <div className="text-[11px] italic text-white/40">{axisCfg.principle}</div>
                  </div>
                </div>
                {isWeakest && (
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]"
                    style={{ background: "rgba(232,107,107,0.14)", color: "#E86B6B" }}
                  >
                    ⚠ Faible
                  </span>
                )}
              </div>

              {/* Slider 0-10 */}
              <div className="mb-3">
                <div className="mb-1 flex items-center justify-between text-[11px] text-white/50">
                  <span>Note (0 = catastrophique · 10 = exemplaire)</span>
                  <span className="text-[18px] font-bold text-[#C9A84C]">{axis.score}/10</span>
                </div>
                <input
                  type="range" min={0} max={10} step={1}
                  value={axis.score}
                  onChange={(e) => setAxis(axisCfg.key, { score: parseInt(e.target.value, 10) })}
                  className="w-full accent-[#C9A84C]"
                />
              </div>

              <InputBlock>
                <InputLabel>Justification (faits concrets) *</InputLabel>
                <TextArea
                  rows={3}
                  value={axis.justification}
                  onChange={(e) => setAxis(axisCfg.key, { justification: e.target.value })}
                  placeholder={
                    axisCfg.key === "simple" ? "Ex : DWY : on fournit produits, scripts, funnels. Client n'a qu'à exécuter 7h/sem. Pas de DFY, mais 80% du chemin pré-mâché." :
                    axisCfg.key === "rapide" ? "Ex : Promesse 60j pour la 1ère commission. Rapide pour revenu complémentaire halal — la concurrence promet 6 mois." :
                    axisCfg.key === "systematique" ? "Ex : 11 témoignages clients existent. Méthode appliquée à un avatar précis. Manque cas dans sous-segments." :
                    "Ex : Quitter Orange, faire la omra cash, aider sa mère 200€/mois — vrai changement de vie pour la cible."
                  }
                />
              </InputBlock>
              <InputBlock>
                <InputLabel>{axisCfg.contextLabel}</InputLabel>
                {axisCfg.contextField === "timeframe_days" ? (
                  <TextInput
                    type="number"
                    value={String((axis as any)[axisCfg.contextField] ?? 90)}
                    onChange={(e) => setAxis(axisCfg.key, { [axisCfg.contextField]: parseInt(e.target.value, 10) || 0 } as Partial<ConditionAxis>)}
                  />
                ) : (
                  <TextInput
                    value={String((axis as any)[axisCfg.contextField] ?? "")}
                    onChange={(e) => setAxis(axisCfg.key, { [axisCfg.contextField]: e.target.value } as Partial<ConditionAxis>)}
                    placeholder={
                      axisCfg.contextField === "delivery_mode" ? "DIY · DWY · DFY" :
                      axisCfg.contextField === "proof_type" ? "11 témoignages vidéo + captures Stripe" :
                      "Changement de vie majeur · omra cash"
                    }
                  />
                )}
              </InputBlock>
            </Card>
          );
        })}
      </div>

      {/* Action plan */}
      <Card className="mb-5">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#C9A84C]">
          ⚙ Plan d'action sur l'axe le plus faible
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_2fr]">
          <InputBlock>
            <InputLabel>Axe le plus faible</InputLabel>
            <select
              value={conds.weakest_axis}
              onChange={(e) => setConds({ weakest_axis: e.target.value })}
              className="w-full rounded-md border-0 bg-[#0B0A07] px-3 py-2 text-[13px] text-white"
              style={{ border: "0.5px solid rgba(201,168,76,0.3)" }}
            >
              <option value="">— choisir —</option>
              {CONDITION_AXES.map((a) => (
                <option key={a.key} value={a.key}>{a.label}</option>
              ))}
            </select>
          </InputBlock>
          <InputBlock>
            <InputLabel>Plan d'action concret (action + délai + signal) *</InputLabel>
            <TextArea
              rows={3}
              value={conds.action_plan}
              onChange={(e) => setConds({ action_plan: e.target.value })}
              placeholder="Ex : Récolter 3 nouveaux témoignages vidéo + captures Stripe dans les 30 jours auprès des 5 derniers clients clos. Signal : 3 nouvelles preuves sociales publiables sur la sales page."
            />
            <InputHelper>Pas de plan = pas de validation. L'IA refuse les « je vais améliorer » sans engagement chiffré.</InputHelper>
          </InputBlock>
        </div>
      </Card>

      <StepFooter
        feedback={fb}
        score={score}
        attempts={state.attempts.conditions}
        forced={state.forced.conditions}
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
