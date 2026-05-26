import { useState } from "react";
import { toast } from "sonner";
import { TextInput, TextArea, InputBlock, InputLabel, InputHelper, Card } from "../../m1-niche/components/ui";
import { StepHeader } from "../components/StepHeader";
import { StepFooter } from "../components/StepFooter";
import { evaluatePrixConfiance } from "../lib/aiEvaluator";
import { type M6State, validationThreshold } from "../lib/types";

interface Props {
  state: M6State;
  setState: (n: (p: M6State) => M6State) => void;
  onBack: () => void;
  onNext: () => void;
}

export function PrixConfianceScreen({ state, setState, onBack, onNext }: Props) {
  const [evaluating, setEvaluating] = useState(false);
  const d = state.data.prix_confiance;
  const threshold = validationThreshold(state);

  const set = (patch: Partial<typeof d>) =>
    setState((prev) => ({ ...prev, data: { ...prev.data, prix_confiance: { ...prev.data.prix_confiance, ...patch } } }));
  const setPlan = (patch: Partial<typeof d.plan_augmentation>) =>
    setState((prev) => ({ ...prev, data: { ...prev.data, prix_confiance: { ...prev.data.prix_confiance, plan_augmentation: { ...prev.data.prix_confiance.plan_augmentation, ...patch } } } }));

  const confColor = d.confiance_sur_deliver >= 80 ? "#7FB069" : d.confiance_sur_deliver >= 70 ? "#FFB450" : d.confiance_sur_deliver >= 50 ? "#E8C770" : "#E86B6B";
  const needsTempPrice = d.confiance_sur_deliver < 70;

  const canEvaluate =
    d.doutes_principaux.trim().length >= 60 &&
    d.action_renforcement.trim().length >= 30 &&
    d.plan_augmentation.prochain_palier_prix > 0 &&
    d.plan_augmentation.declencheur_clients_satisfaits >= 1 &&
    d.plan_augmentation.date_cible.trim().length > 0 &&
    (!needsTempPrice || d.prix_temporaire.trim().length > 0);

  async function handleEvaluate() {
    setEvaluating(true);
    try {
      const fb = await evaluatePrixConfiance(state);
      setState((prev) => ({
        ...prev,
        scores: { ...prev.scores, prix_confiance: fb.score },
        attempts: { ...prev.attempts, prix_confiance: prev.attempts.prix_confiance + 1 },
        lastFb: { ...prev.lastFb, prix_confiance: fb },
        highest: fb.score >= validationThreshold(prev) && prev.highest === "prix_confiance" ? "paiements" : prev.highest,
      }));
    } catch (e: any) { toast.error("Erreur évaluation : " + (e?.message ?? "inconnue")); }
    finally { setEvaluating(false); }
  }

  function handleForce() {
    setState((prev) => ({ ...prev, forced: { ...prev.forced, prix_confiance: true }, highest: prev.highest === "prix_confiance" ? "paiements" : prev.highest }));
  }

  const score = state.scores.prix_confiance;
  const fb = state.lastFb.prix_confiance;
  const validated = (score !== null && score >= threshold) || state.forced.prix_confiance;

  return (
    <div>
      <StepHeader
        current={4}
        total={7}
        title="Prix PAR la confiance interne · plan d'augmentation"
        sub="Slide 79 — ton prix bouge avec ta capacité à sur-délivrer. +10-20% par tranche de 5 clients satisfaits documentés."
      />

      {/* Introspection */}
      <Card className="mb-4">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#C9A84C]">
          Introspection forcée (avant le curseur)
        </div>
        <InputBlock>
          <InputLabel>Tes 2 doutes principaux sur ta capacité à sur-délivrer (60+ chars) *</InputLabel>
          <TextArea
            rows={3}
            value={d.doutes_principaux}
            onChange={(e) => set({ doutes_principaux: e.target.value })}
            placeholder="Ex : (1) Je ne suis pas sûr de tenir le suivi 1to1 hebdomadaire si j'ai 10 clients en parallèle. (2) Mon mécanisme M3 n'a été validé que sur 11 clients — peut-être qu'au 30e ça craque."
          />
        </InputBlock>
        <InputBlock>
          <InputLabel>UNE action concrète cette semaine (30+ chars, avec verbe) *</InputLabel>
          <TextArea
            rows={2}
            value={d.action_renforcement}
            onChange={(e) => set({ action_renforcement: e.target.value })}
            placeholder="Ex : Cette semaine, appeler les 3 derniers clients clos pour recueillir leurs retours bruts + identifier ce qui a manqué dans mon delivery."
          />
        </InputBlock>
      </Card>

      {/* Slider confiance */}
      <Card className="mb-4">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#C9A84C]">
          Curseur de confiance sur-délivrer
        </div>
        <div className="mb-1 flex items-center justify-between text-[11px] text-white/50">
          <span>0 = aucune confiance · 100 = certitude</span>
          <span className="text-[24px] font-bold leading-none" style={{ color: confColor }}>
            {d.confiance_sur_deliver}<span className="text-[12px] text-white/40">/100</span>
          </span>
        </div>
        <input
          type="range" min={0} max={100} step={5}
          value={d.confiance_sur_deliver}
          onChange={(e) => set({ confiance_sur_deliver: parseInt(e.target.value, 10) })}
          className="w-full accent-[#C9A84C]"
        />
        {needsTempPrice && (
          <InputBlock>
            <InputLabel>Prix temporaire (confiance &lt; 70 → entrée plus basse) *</InputLabel>
            <TextInput value={d.prix_temporaire} onChange={(e) => set({ prix_temporaire: e.target.value })} placeholder="Ex : 1 497€ jusqu'à 5 clients clos" />
            <InputHelper>Démarre plus bas pour bâtir les preuves, puis augmente.</InputHelper>
          </InputBlock>
        )}
      </Card>

      {/* Plan d'augmentation */}
      <Card className="mb-5">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#C9A84C]">
          Plan d'augmentation (slide 79 : +10-20% par tranche de 5 clients)
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <InputBlock>
            <InputLabel>Prochain palier prix (€)</InputLabel>
            <TextInput
              type="number"
              value={String(d.plan_augmentation.prochain_palier_prix || "")}
              onChange={(e) => setPlan({ prochain_palier_prix: parseInt(e.target.value, 10) || 0 })}
              placeholder="3997"
            />
          </InputBlock>
          <InputBlock>
            <InputLabel>Déclencheur (clients satisfaits)</InputLabel>
            <TextInput
              type="number"
              value={String(d.plan_augmentation.declencheur_clients_satisfaits || "")}
              onChange={(e) => setPlan({ declencheur_clients_satisfaits: parseInt(e.target.value, 10) || 0 })}
              placeholder="5"
            />
          </InputBlock>
          <InputBlock>
            <InputLabel>Date cible</InputLabel>
            <TextInput
              type="date"
              value={d.plan_augmentation.date_cible}
              onChange={(e) => setPlan({ date_cible: e.target.value })}
            />
          </InputBlock>
        </div>
      </Card>

      <StepFooter
        feedback={fb}
        score={score}
        attempts={state.attempts.prix_confiance}
        forced={state.forced.prix_confiance}
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
