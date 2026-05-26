import { useState, useMemo } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Sparkles, Zap, AlertTriangle, Loader2 } from "lucide-react";
import { Btn, Actions, Card, InputBlock, InputLabel, InputHelper, TextInput, TextArea } from "../../m1-niche/components/ui";
import { StepHeader } from "../components/StepHeader";
import { scoreEntryWithAI } from "../lib/aiEvaluator";
import {
  type M4State, type EntryStrategy,
  ENTRY_STRATEGIES, TIER_LABELS,
  VALIDATION_THRESHOLD, FORCE_AVAILABLE_AFTER, suggestEntryStrategy,
} from "../lib/types";

interface Props {
  state: M4State;
  setState: (n: (p: M4State) => M4State) => void;
  onBack: () => void;
  onNext: () => void;
}

export function NiveauEntreeScreen({ state, setState, onBack, onNext }: Props) {
  const [evaluating, setEvaluating] = useState(false);
  const entry = state.entry;
  const m3 = state.m3_data;
  const m3Complete = !!(m3 && m3.complete);
  const suggested = useMemo(() => suggestEntryStrategy(state), [state]);
  const sel = entry.strategy ?? suggested;

  const selectStrategy = (k: EntryStrategy) => {
    setState((prev) => ({
      ...prev,
      entry: {
        ...prev.entry,
        strategy: k,
        // Reset complet de l'évaluation au changement de stratégie (cf. Sidali)
        score: null,
        feedback: "",
        forced: false,
        ai_mode: null,
        attempts: 0,
      },
    }));
  };

  const setRationale = (v: string) =>
    setState((prev) => ({ ...prev, entry: { ...prev.entry, rationale: v } }));
  const setHtTarget = (v: string) =>
    setState((prev) => ({ ...prev, entry: { ...prev.entry, ht_monthly_target: v } }));
  const setLtBreakeven = (v: string) =>
    setState((prev) => ({ ...prev, entry: { ...prev.entry, lt_breakeven_check: v } }));

  const canEvaluate = !!entry.strategy && entry.rationale.trim().length >= 40 && entry.ht_monthly_target.trim().length >= 8;

  async function handleEvaluate() {
    if (!canEvaluate) return;
    setEvaluating(true);
    try {
      const res = await scoreEntryWithAI({ ...state, entry: { ...entry, strategy: sel } });
      setState((prev) => ({
        ...prev,
        entry: {
          ...prev.entry,
          strategy: sel,
          score: res.score,
          feedback: res.feedback,
          ai_mode: res.mode,
          attempts: prev.entry.attempts + 1,
        },
      }));
    } catch (e: any) {
      toast.error("Erreur évaluation : " + (e?.message ?? "inconnue"));
    } finally {
      setEvaluating(false);
    }
  }

  function handleForce() {
    setState((prev) => ({ ...prev, entry: { ...prev.entry, strategy: sel, forced: true } }));
  }

  const isValidated =
    (entry.score !== null && entry.score >= VALIDATION_THRESHOLD) || entry.forced;
  const canForce = entry.attempts >= FORCE_AVAILABLE_AFTER && (entry.score == null || entry.score < VALIDATION_THRESHOLD);
  const canNext = !!entry.strategy && isValidated;

  return (
    <div>
      <StepHeader
        current={2}
        total={4}
        title="Par où tu commercialises d'abord ?"
        sub={
          m3Complete
            ? "Ton HT existe (M3 signé). Qu'est-ce que tu lui ajoutes maintenant ? 4 stratégies possibles, listées du plus prudent au plus mature."
            : "⚠ Ton M3 n'est pas signé — tu peux explorer mais ton HT n'est pas validé. Idéalement, retourne signer M3 avant de verrouiller M4."
        }
      />

      {/* Cartes stratégies */}
      <Card className="mb-5">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#C9A84C]">
          4 stratégies possibles
        </div>
        <div className="flex flex-col gap-3">
          {(Object.keys(ENTRY_STRATEGIES) as EntryStrategy[]).map((k) => {
            const def = ENTRY_STRATEGIES[k];
            const isSelected = sel === k;
            const isSuggested = k === suggested;
            const activeMarches = def.active_tiers.map((t) => TIER_LABELS[t].split(" /")[0]).join(" + ");
            return (
              <button
                key={k}
                type="button"
                onClick={() => selectStrategy(k)}
                className="group relative w-full rounded-xl p-4 text-left transition-all"
                style={{
                  background: isSelected ? "rgba(201,168,76,0.10)" : "#14130E",
                  border: `0.5px solid ${isSelected ? "rgba(201,168,76,0.7)" : "rgba(201,168,76,0.18)"}`,
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2 text-[14px] font-semibold text-white">
                      {def.label}
                      {isSuggested && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.06em]"
                          style={{
                            background: "rgba(127,176,105,0.14)",
                            color: "#7FB069",
                            border: "0.5px solid rgba(127,176,105,0.4)",
                          }}
                        >
                          <Sparkles className="h-2.5 w-2.5" />
                          Suggestion IA
                        </span>
                      )}
                    </div>
                    <div className="mb-2 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[#C9A84C]">
                      Marches actives : {activeMarches}
                    </div>
                    <p className="mb-1.5 text-[12.5px] leading-[1.5] text-white/85">
                      <strong>{def.desc}</strong>
                    </p>
                    <p className="text-[12px] italic leading-[1.5] text-white/50">{def.when}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Micro-check économique */}
      <Card className="mb-5">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#C9A84C]">
          ⚙ Micro-check économique
        </div>
        <p className="mb-3 text-[13px] leading-[1.55] text-white/55">
          Le HT finance la value ladder. Vérifions que les chiffres tiennent debout pour ta situation.
        </p>
        <InputBlock>
          <InputLabel>Combien de ventes HT par mois tu vises (réaliste, pas rêvé) ? *</InputLabel>
          <TextInput
            value={entry.ht_monthly_target}
            onChange={(e) => setHtTarget(e.target.value)}
            placeholder="Ex : 4 ventes HT/mois à 3 000€ = 12k€/mois bruts"
          />
          <InputHelper>
            Cette cible doit couvrir : ton salaire + ton coût delivery + (si HT+LT/MT) la perte ou breakeven de la marche basse.
          </InputHelper>
        </InputBlock>
        {sel !== "ht_only" && (
          <InputBlock>
            <InputLabel>Si ton LT/MT est en perte ou breakeven, combien de ventes HT pour le financer ?</InputLabel>
            <TextArea
              rows={3}
              value={entry.lt_breakeven_check}
              onChange={(e) => setLtBreakeven(e.target.value)}
              placeholder="Ex : LT à 47€ avec CAC 80€ = perte 33€/vente. 100 LT/mois = -3 300€. 1 vente HT à 3 000€ couvre 90 LT. Donc 2 HT/mois POUR couvrir le LT + 2 HT/mois pour mon revenu."
            />
            <InputHelper intent="warning">
              Si tu ne sais pas calculer ça, c'est probablement que tu n'es pas prêt pour cette stratégie. Reviens sur HT seul d'abord.
            </InputHelper>
          </InputBlock>
        )}
      </Card>

      {/* Justification */}
      <Card className="mb-5">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#C9A84C]">
          Justification
        </div>
        <InputBlock>
          <InputLabel>Pourquoi ce choix pour toi, maintenant ? *</InputLabel>
          <TextArea
            rows={6}
            value={entry.rationale}
            onChange={(e) => setRationale(e.target.value)}
            placeholder="2-4 phrases concrètes. Mentionne ton contexte : combien de clients HT signés à ce jour, ton volume de leads actuel, ta bande passante de delivery hebdo, ta trésorerie pour faire de l'ads. Et surtout : ton indicateur de bascule (le chiffre concret qui te dira quand passer à l'étape suivante)."
          />
          <InputHelper>
            L'évaluation va vérifier que ton choix est cohérent avec ton M3 et pas une intuition.
          </InputHelper>
        </InputBlock>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Btn variant="primary" disabled={!canEvaluate || evaluating} onClick={handleEvaluate}>
            {evaluating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            {evaluating ? "Évaluation en cours…" : "Faire évaluer"}
          </Btn>
          {canForce && (
            <button
              type="button"
              onClick={handleForce}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-semibold"
              style={{
                background: "rgba(255,180,80,0.08)",
                border: "0.5px solid rgba(255,180,80,0.4)",
                color: "#FFB450",
              }}
            >
              <AlertTriangle className="h-3 w-3" />
              Forcer la validation (après {entry.attempts} essais)
            </button>
          )}
        </div>

        {/* Bloc évaluation */}
        {entry.score !== null && (
          <div
            className="mt-5 rounded-xl p-4"
            style={{
              background: "rgba(11,10,7,0.6)",
              border: `0.5px solid ${entry.score >= VALIDATION_THRESHOLD ? "rgba(127,176,105,0.45)" : entry.score >= 60 ? "rgba(255,180,80,0.45)" : "rgba(232,107,107,0.45)"}`,
            }}
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/50">
                ⚡ Évaluation · Tentative {entry.attempts}
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] uppercase tracking-[0.06em]"
                  style={{
                    background: entry.ai_mode === "cloud" ? "rgba(127,176,105,0.14)" : "rgba(255,180,80,0.14)",
                    color: entry.ai_mode === "cloud" ? "#7FB069" : "#FFB450",
                  }}
                >
                  {entry.ai_mode === "cloud" ? "IA Claude" : "⚙ Évaluation locale"}
                </span>
                {entry.forced && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] uppercase tracking-[0.06em]"
                    style={{ background: "rgba(255,180,80,0.18)", color: "#FFB450" }}
                  >
                    ⚠ Forcé
                  </span>
                )}
              </div>
              <div
                className="text-[28px] font-bold leading-none"
                style={{
                  color: entry.score >= VALIDATION_THRESHOLD ? "#7FB069" : entry.score >= 60 ? "#FFB450" : "#E86B6B",
                }}
              >
                {entry.score}
                <span className="ml-1 text-[14px] text-white/40">/100</span>
              </div>
            </div>
            <p className="text-[13px] leading-[1.55] text-white/80">{entry.feedback}</p>
          </div>
        )}
      </Card>

      <Actions>
        <Btn variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Vue d'ensemble
        </Btn>
        <Btn variant="primary" disabled={!canNext} onClick={onNext}>
          Passerelles
          <ArrowRight className="h-4 w-4" />
        </Btn>
      </Actions>
    </div>
  );
}
