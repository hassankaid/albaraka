import { useState } from "react";
import { ArrowLeft, ArrowRight, RotateCcw, Compass, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  StepEyebrow, StepTitle, StepSub, InputBlock, InputLabel, InputHelper,
  TextArea, Btn, LoadingScreen, Actions,
} from "../components/ui";
import { aiStressTest } from "../lib/prompts";
import type { M1State, StressVerdictData } from "../lib/types";

interface StressTestScreenProps {
  state: M1State;
  setState: (next: (prev: M1State) => M1State) => void;
  onBack: () => void;
  onNextCristallisation: () => void;
  onSwitchToA: () => void;
}

export function StressTestScreen({
  state, setState, onBack, onNextCristallisation, onSwitchToA,
}: StressTestScreenProps) {
  const [loading, setLoading] = useState(false);
  const [verdictData, setVerdictData] = useState<StressVerdictData | null>(null);

  const set = (key: "lives_from_skill" | "three_people" | "revenue_proof") => (val: string) =>
    setState((prev) => ({ ...prev, stress_test: { ...prev.stress_test, [key]: val } }));

  const q1 = state.stress_test.lives_from_skill;
  const q2 = state.stress_test.three_people;
  const q3 = state.stress_test.revenue_proof;
  const canCheck = q1.length >= 30 && q2.length >= 80 && q3.length >= 30;

  async function runTest() {
    setLoading(true);
    try {
      const data = await aiStressTest(state);
      setVerdictData(data);
      setState((prev) => ({
        ...prev,
        stress_test: { ...prev.stress_test, verdict: data.verdict },
      }));
    } catch (e: any) {
      console.error("[M1 stress]", e);
      toast.error("Erreur du stress-test. Réessaie.");
    } finally {
      setLoading(false);
    }
  }

  function resetVerdict() {
    setVerdictData(null);
    setState((prev) => ({ ...prev, stress_test: { ...prev.stress_test, verdict: null } }));
  }

  if (loading) {
    return (
      <LoadingScreen
        message="L'IA analyse tes réponses sans complaisance…"
        hint="~5-15 secondes"
      />
    );
  }

  const verdict = state.stress_test.verdict;

  return (
    <div>
      <StepEyebrow>Stress-test</StepEyebrow>
      <StepTitle>Trois questions avant qu'on aille plus loin</StepTitle>
      <StepSub>
        Ton idée : <strong className="text-[#C9A84C]">{state.capture.idee || "—"}</strong>.<br />
        OK. Maintenant on vérifie si tu vends de la matière ou un fantasme.{" "}
        <strong className="text-[#C9A84C]">Réponds vrai.</strong>
      </StepSub>

      <InputBlock>
        <InputLabel>1️⃣ Tu vis toi-même de cette compétence ?</InputLabel>
        <TextArea
          rows={3}
          value={q1}
          disabled={!!verdict}
          onChange={(e) => set("lives_from_skill")(e.target.value)}
          placeholder="Ex : Oui, depuis 4 ans. Je suis passée de 0 à 4500€/mois en 24 mois en cake design wedding cakes. Je facture 600€ minimum par pièce."
        />
        <InputHelper>
          Si ta réponse est "non mais je vais m'y mettre" → tu vends pas un fantasme à 5000€.
          Reviens à la branche A.
        </InputHelper>
      </InputBlock>

      <InputBlock>
        <InputLabel>
          2️⃣ Donne 3 personnes précises (prénom, profil, situation) qui te paieraient 1500€+ pour
          apprendre à le faire
        </InputLabel>
        <TextArea
          rows={5}
          value={q2}
          disabled={!!verdict}
          onChange={(e) => set("three_people")(e.target.value)}
          placeholder={"Ex :\n1. Sophie, 34 ans, prof de maths qui fait des gâteaux le week-end depuis 3 ans, en a marre de l'EN, gagne 2200€/mois\n2. Marie, 29 ans, congé parental, fait des gâteaux pour ses amis depuis 5 ans, son mari gagne bien sa vie\n3. ..."}
        />
        <InputHelper>
          Pas "des passionnées" — des PERSONNES. Avec prénom, âge, situation pro, indice de revenu.
        </InputHelper>
      </InputBlock>

      <InputBlock>
        <InputLabel>3️⃣ Ta preuve concrète de résultat sur cette compétence</InputLabel>
        <TextArea
          rows={3}
          value={q3}
          disabled={!!verdict}
          onChange={(e) => set("revenue_proof")(e.target.value)}
          placeholder="Ex : 12 wedding cakes vendus en 2025 entre 600€ et 1200€. CA 2025 sur cette activité = 18 400€. Photos + factures dispo."
        />
        <InputHelper>Chiffres précis. Si "intuition", reviens à la branche A.</InputHelper>
      </InputBlock>

      {!verdict && (
        <Actions>
          <Btn variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Btn>
          <Btn variant="primary" disabled={!canCheck} onClick={runTest}>
            Vérifier ma matière
            <ArrowRight className="h-4 w-4" />
          </Btn>
        </Actions>
      )}

      {verdict && verdictData && (
        <>
          <div
            className="mt-6 rounded-2xl p-5"
            style={{
              background:
                verdict === "solide"
                  ? "rgba(80,200,120,0.08)"
                  : "rgba(232,107,107,0.08)",
              border:
                verdict === "solide"
                  ? "1px solid rgba(80,200,120,0.4)"
                  : "1px solid rgba(232,107,107,0.4)",
            }}
          >
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em]">
              {verdict === "solide" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <XCircle className="h-4 w-4 text-red-400" />
              )}
              <span className={verdict === "solide" ? "text-emerald-400" : "text-red-400"}>
                Verdict : {verdict === "solide" ? "✓ Solide" : "✗ Fragile"}
              </span>
            </div>
            <h3 className="mb-2 text-[18px] font-semibold leading-tight text-white">
              {verdictData.titre}
            </h3>
            <p className="text-[13px] leading-[1.6] text-white/70">{verdictData.diagnostic}</p>
            <p className="mt-3 text-[13px] font-medium leading-[1.6] text-[#C9A84C]">
              → {verdictData.next_action}
            </p>
          </div>

          <Actions>
            <Btn variant="ghost" onClick={resetVerdict}>
              <RotateCcw className="h-3.5 w-3.5" />
              Modifier mes réponses
            </Btn>
            {verdict === "solide" ? (
              <Btn variant="primary" onClick={onNextCristallisation}>
                Cristalliser ma niche
                <ArrowRight className="h-4 w-4" />
              </Btn>
            ) : (
              <Btn variant="primary" onClick={onSwitchToA}>
                <Compass className="h-4 w-4" />
                Passer à la branche A
              </Btn>
            )}
          </Actions>
        </>
      )}
    </div>
  );
}
