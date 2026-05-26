import { useState } from "react";
import { toast } from "sonner";
import { TextInput, TextArea, InputBlock, InputLabel, InputHelper, Card } from "../../m1-niche/components/ui";
import { StepHeader } from "../components/StepHeader";
import { StepFooter } from "../components/StepFooter";
import { evaluateBao } from "../lib/aiEvaluator";
import { type M6State, validationThreshold } from "../lib/types";

interface Props {
  state: M6State;
  setState: (n: (p: M6State) => M6State) => void;
  onBack: () => void;
  onNext: () => void;
}

const TIERS = [
  { key: "bronze" as const, label: "🥉 Bronze", desc: "Entrée — la version plus accessible (LT/MT)" },
  { key: "argent" as const, label: "🥈 Argent", desc: "Cœur — ton offre HT principale (= prix HT M3/M4)" },
  { key: "or" as const,     label: "🥇 Or",     desc: "Premium — la version dense (1to1, durée +, bonus exclusifs)" },
];

export function BaoScreen({ state, setState, onBack, onNext }: Props) {
  const [evaluating, setEvaluating] = useState(false);
  const d = state.data.bao;
  const threshold = validationThreshold(state);
  const prixHT = state.data.prix_valeur.prix_ht;

  const setTier = (key: keyof typeof d, patch: Partial<typeof d.bronze>) =>
    setState((prev) => ({
      ...prev,
      data: { ...prev.data, bao: { ...prev.data.bao, [key]: { ...prev.data.bao[key], ...patch } } },
    }));

  const canEvaluate = TIERS.every((t) => parseFloat((d[t.key].prix || "").replace(/[^\d.,]/g, "")) > 0 && d[t.key].contenu_court.trim().length > 0);

  async function handleEvaluate() {
    setEvaluating(true);
    try {
      const fb = await evaluateBao(state);
      setState((prev) => ({
        ...prev,
        scores: { ...prev.scores, bao: fb.score },
        attempts: { ...prev.attempts, bao: prev.attempts.bao + 1 },
        lastFb: { ...prev.lastFb, bao: fb },
        highest: fb.score >= validationThreshold(prev) && prev.highest === "bao" ? "script_annonce" : prev.highest,
      }));
    } catch (e: any) { toast.error("Erreur évaluation : " + (e?.message ?? "inconnue")); }
    finally { setEvaluating(false); }
  }

  function handleForce() {
    setState((prev) => ({ ...prev, forced: { ...prev.forced, bao: true }, highest: prev.highest === "bao" ? "script_annonce" : prev.highest }));
  }

  const score = state.scores.bao;
  const fb = state.lastFb.bao;
  const validated = (score !== null && score >= threshold) || state.forced.bao;

  return (
    <div>
      <StepHeader
        current={6}
        total={7}
        title="Bronze / Argent / Or — stratégie 3 options"
        sub="Slide 80 — face à 3 options, le client choisit naturellement celle du milieu (l'Argent). Place ton prix HT M3/M4 sur l'Argent. Bronze = entrée, Or = premium."
        hint={prixHT ? `Ton prix HT M3/M4 = ${prixHT}€. L'Argent doit être ≈ ce prix (±30%).` : "Saisis d'abord ton prix HT à l'étape 2."}
      />

      <div className="mb-5 space-y-3">
        {TIERS.map((t) => {
          const tier = d[t.key];
          return (
            <Card key={t.key}>
              <div className="mb-3 flex items-center justify-between">
                <div className="text-[14px] font-semibold text-white">{t.label}</div>
                <div className="text-[11px] text-white/50">{t.desc}</div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_3fr]">
                <InputBlock>
                  <InputLabel>Prix (€) *</InputLabel>
                  <TextInput
                    value={tier.prix}
                    onChange={(e) => setTier(t.key, { prix: e.target.value })}
                    placeholder={t.key === "bronze" ? "997" : t.key === "argent" ? prixHT || "2997" : "5997"}
                  />
                </InputBlock>
                <InputBlock>
                  <InputLabel>Contenu court (1-2 lignes) *</InputLabel>
                  <TextArea
                    rows={2}
                    value={tier.contenu_court}
                    onChange={(e) => setTier(t.key, { contenu_court: e.target.value })}
                    placeholder={
                      t.key === "bronze" ? "Modules vidéo + communauté Telegram + suivi async"
                      : t.key === "argent" ? "Bronze + 12 calls de groupe live + audit personnel mensuel"
                      : "Argent + 6 calls 1to1 + audit hebdo dédié + accès direct setters/closers"
                    }
                  />
                </InputBlock>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Récap visuel */}
      <Card className="mb-5">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#C9A84C]">Récap visuel</div>
        <div className="grid grid-cols-3 gap-2 text-center text-[12px]">
          {TIERS.map((t) => (
            <div key={t.key} className="rounded-lg p-3" style={{ background: "#0B0A07", border: t.key === "argent" ? "1px solid #C9A84C" : "0.5px solid rgba(255,255,255,0.1)" }}>
              <div className="text-[16px]">{t.label}</div>
              <div className="text-[20px] font-bold text-[#C9A84C]">{d[t.key].prix || "—"}€</div>
              {t.key === "argent" && <div className="mt-1 text-[10px] uppercase tracking-[0.06em] text-[#C9A84C]">Recommandé</div>}
            </div>
          ))}
        </div>
      </Card>

      <StepFooter
        feedback={fb}
        score={score}
        attempts={state.attempts.bao}
        forced={state.forced.bao}
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
