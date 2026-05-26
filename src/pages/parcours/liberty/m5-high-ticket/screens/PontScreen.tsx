import { useState } from "react";
import { toast } from "sonner";
import { TextArea, InputBlock, InputLabel, InputHelper, Card, TextInput } from "../../m1-niche/components/ui";
import { StepHeader } from "../components/StepHeader";
import { StepFooter } from "../components/StepFooter";
import { evaluatePont } from "../lib/aiEvaluator";
import { type M5State, pickAvatarName, validationThreshold } from "../lib/types";

interface Props {
  state: M5State;
  setState: (n: (p: M5State) => M5State) => void;
  onBack: () => void;
  onNext: () => void;
}

export function PontScreen({ state, setState, onBack, onNext }: Props) {
  const [evaluating, setEvaluating] = useState(false);
  const pont = state.data.pont;
  const avatar = pickAvatarName(state);
  const threshold = validationThreshold(state);

  // Pré-remplir depuis M2.dominant_pain si disponible
  const m2Pain = state.m2_data?.data?.dominant_pain ?? state.m2_data?.data?.step8?.hook_principal ?? "";
  const m3HeadlinePromesse = state.m3_data?.headline_promesse ?? state.m3_data?.promesse ?? "";
  const m3Mecanisme = state.m3_data?.hero_mecanisme_nom ?? state.m3_data?.mecanisme?.nom ?? "";

  const setPont = (patch: Partial<typeof pont>) =>
    setState((prev) => ({ ...prev, data: { ...prev.data, pont: { ...prev.data.pont, ...patch } } }));
  const setPointA = (patch: Partial<typeof pont.pointA>) =>
    setState((prev) => ({ ...prev, data: { ...prev.data, pont: { ...prev.data.pont, pointA: { ...prev.data.pont.pointA, ...patch } } } }));
  const setPointB = (patch: Partial<typeof pont.pointB>) =>
    setState((prev) => ({ ...prev, data: { ...prev.data, pont: { ...prev.data.pont, pointB: { ...prev.data.pont.pointB, ...patch } } } }));

  const canEvaluate =
    pont.pointA.formulated.trim().length >= 40 &&
    pont.pointB.formulated.trim().length >= 30 &&
    pont.pointB.measurable_outcome.trim().length >= 10 &&
    pont.bridge_summary.trim().length >= 40;

  async function handleEvaluate() {
    setEvaluating(true);
    try {
      const fb = await evaluatePont(state);
      setState((prev) => ({
        ...prev,
        scores: { ...prev.scores, pont: fb.score },
        attempts: { ...prev.attempts, pont: prev.attempts.pont + 1 },
        lastFb: { ...prev.lastFb, pont: { verdict: fb.verdict, strengths: fb.strengths, weaknesses: fb.weaknesses, suggestions: fb.suggestions, ai_mode: fb.ai_mode } },
        highest: fb.score >= validationThreshold(prev) && prev.highest === "pont" ? "conditions" : prev.highest,
      }));
    } catch (e: any) {
      toast.error("Erreur évaluation : " + (e?.message ?? "inconnue"));
    } finally { setEvaluating(false); }
  }

  function handleForce() {
    setState((prev) => ({
      ...prev,
      forced: { ...prev.forced, pont: true },
      highest: prev.highest === "pont" ? "conditions" : prev.highest,
    }));
  }

  const score = state.scores.pont;
  const fb = state.lastFb.pont;
  const validated = (score !== null && score >= threshold) || state.forced.pont;

  return (
    <div>
      <StepHeader
        current={1}
        total={5}
        title="Le pont (Point A → Point B)"
        sub={`Une offre, c'est de la valeur apportée au marché en échange d'argent. Ce n'est pas tes vidéos. C'est la promesse de transformation que tu fais à ${avatar}, et le système que tu mets en place pour la tenir. Le pont, c'est toi.`}
      />

      {/* Hints M2/M3 */}
      {(m2Pain || m3HeadlinePromesse) && (
        <div
          className="mb-4 rounded-xl p-3 text-[12.5px] leading-[1.5]"
          style={{ background: "rgba(201,168,76,0.05)", border: "0.5px dashed rgba(201,168,76,0.4)" }}
        >
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#C9A84C]">
            📋 Imports M2/M3 (à recopier si tu veux)
          </div>
          {m2Pain && <p className="text-white/70"><strong className="text-white">Douleur dominante M2 :</strong> {m2Pain}</p>}
          {m3HeadlinePromesse && <p className="mt-1 text-white/70"><strong className="text-white">Promesse M3 :</strong> « {m3HeadlinePromesse} »</p>}
          {m3Mecanisme && <p className="mt-1 text-white/70"><strong className="text-white">Mécanisme M3 :</strong> {m3Mecanisme}</p>}
        </div>
      )}

      {/* Point A */}
      <Card className="mb-4">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#C9A84C]">
          Point A — où en est {avatar} aujourd'hui
        </div>
        <InputBlock>
          <InputLabel>Situation client AUJOURD'HUI (3 dimensions distinctes) *</InputLabel>
          <TextArea
            rows={5}
            value={pont.pointA.formulated}
            onChange={(e) => setPointA({ formulated: e.target.value })}
            placeholder={`Ex : ${avatar} a 34 ans, cadre depuis 8 ans, ressent le "dimanche soir glacé" chaque semaine. Marié, 2 enfants 5 & 7 ans — sa femme veut rentrer au pays mais lui n'arrive pas à épargner. Le déclencheur : son ami d'enfance vient d'acheter cash sans riba — lui galère encore.`}
          />
          <InputHelper>
            Au moins 3 concepts : (1) situation matérielle chiffrée · (2) contexte (familial/pro/financier) · (3) déclencheur émotionnel précis.
          </InputHelper>
        </InputBlock>
      </Card>

      {/* Point B */}
      <Card className="mb-4">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#C9A84C]">
          Point B — où il sera dans {pont.pointB.timeframe_days} jours
        </div>
        <InputBlock>
          <InputLabel>Formulation du point B *</InputLabel>
          <TextArea
            rows={3}
            value={pont.pointB.formulated}
            onChange={(e) => setPointB({ formulated: e.target.value })}
            placeholder={`Ex : ${avatar} passe de salarié coincé à 2 200€/mois à affilié halal qui ramène 1 000€ de commission validée en 60 jours.`}
          />
        </InputBlock>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr]">
          <InputBlock>
            <InputLabel>Résultat mesurable (avec chiffre) *</InputLabel>
            <TextInput
              value={pont.pointB.measurable_outcome}
              onChange={(e) => setPointB({ measurable_outcome: e.target.value })}
              placeholder="Ex : 1 000€ de commission validée + 3 affiliés actifs"
            />
            <InputHelper>Un chiffre + une unité (€, kg, témoignages, calls/jour). Évite les promesses grossières (« à vie », « guérir »).</InputHelper>
          </InputBlock>
          <InputBlock>
            <InputLabel>Délai (jours)</InputLabel>
            <TextInput
              type="number"
              value={String(pont.pointB.timeframe_days)}
              onChange={(e) => setPointB({ timeframe_days: Math.max(1, Math.min(365, parseInt(e.target.value, 10) || 90)) })}
            />
          </InputBlock>
        </div>
      </Card>

      {/* Bridge summary */}
      <Card className="mb-5">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#C9A84C]">
          Le pont — comment tu passes A → B
        </div>
        <InputBlock>
          <InputLabel>Résumé du pont (le système que tu mets en place) *</InputLabel>
          <TextArea
            rows={4}
            value={pont.bridge_summary}
            onChange={(e) => setPont({ bridge_summary: e.target.value })}
            placeholder="Ex : Un système d'affiliation 100% halal — 30 produits sélectionnés + scripts DM éprouvés + coaching humain hebdo + communauté de pairs Telegram. Tu apportes le cadre, ils apportent l'exécution."
          />
          <InputHelper>
            Décris CONCRÈTEMENT le système — pas du méta-discours (« il faut décrire le pont »). Évite les name-drop (« comme Iman Gadzhi »).
          </InputHelper>
        </InputBlock>
      </Card>

      <StepFooter
        feedback={fb}
        score={score}
        attempts={state.attempts.pont}
        forced={state.forced.pont}
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
