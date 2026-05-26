import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { TextInput, InputBlock, InputLabel, InputHelper, Card } from "../../m1-niche/components/ui";
import { StepHeader } from "../components/StepHeader";
import { StepFooter } from "../components/StepFooter";
import { diagnosticPrix } from "../lib/aiEvaluator";
import { type M3State, VALIDATION_THRESHOLD } from "../lib/types";

interface Props { state: M3State; setState: (n: (p: M3State) => M3State) => void; onBack: () => void; onNext: () => void; }

const LEVIER_LABELS: Record<string, { emoji: string; label: string; desc: string }> = {
  resultat:    { emoji: "🎯", label: "Résultat",    desc: "Magnitude du résultat promis × intensité du désir" },
  probabilite: { emoji: "🎲", label: "Probabilité", desc: "Crédibilité que ton offre produira le résultat" },
  delai:       { emoji: "⚡", label: "Délai",       desc: "Vitesse à laquelle le résultat est atteint" },
  effort:      { emoji: "🪶", label: "Effort",      desc: "Facilité du parcours (inverse : moins d'effort = mieux)" },
};

export function PrixScreen({ state, setState, onBack, onNext }: Props) {
  const [evaluating, setEvaluating] = useState(false);
  const p = state.prix;

  const setMontant = (val: string) => setState((prev) => ({ ...prev, prix: { ...prev.prix, montant: val } }));

  async function handleDiagnostic() {
    setEvaluating(true);
    try {
      const d = await diagnosticPrix(state);
      setState((prev) => ({
        ...prev,
        prix: {
          ...prev.prix,
          score: d.score,
          attempts: prev.prix.attempts + 1,
          leviers: d.leviers,
          levier_faible: d.levier_faible,
          alignements: d.alignements,
          feedback: {
            verdict: d.verdict,
            weak: d.weak,
            action_concrete: d.action_concrete,
            propositions: d.propositions,
          },
          validated: d.score >= VALIDATION_THRESHOLD,
          history: [...prev.prix.history, { ts: new Date().toISOString(), score: d.score, snapshot: { montant: prev.prix.montant } }],
        },
      }));
    } catch (e: any) { toast.error("Erreur diagnostic : " + (e?.message ?? "inconnue")); }
    finally { setEvaluating(false); }
  }
  function handleForce() {
    setState((prev) => ({ ...prev, prix: { ...prev.prix, forced: true, validated: true } }));
    onNext();
  }

  return (
    <div>
      <StepHeader
        current={7}
        total={7}
        title="Prix + diagnostic Hormozi"
        sub={`La VALEUR PERÇUE = (Résultat × Probabilité) / (Délai × Effort). L'IA calcule tes 4 leviers à partir de l'offre complète (étapes 1→6) et identifie ton levier le plus faible.`}
      />

      <Card className="mb-4">
        <InputBlock>
          <InputLabel>Prix de ton offre (€)</InputLabel>
          <TextInput
            type="number"
            value={p.montant}
            onChange={(e) => setMontant(e.target.value)}
            placeholder="Ex : 1497"
          />
          <InputHelper>
            Le sweet-spot dépend de ton véhicule. Cohorte ≈ 997-2997€ · Coaching 1to1 ≈ 1997-4997€.
          </InputHelper>
        </InputBlock>
      </Card>

      {/* 4 leviers Hormozi affichés après diagnostic */}
      {p.feedback && p.leviers.resultat.score > 0 && (
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(Object.keys(LEVIER_LABELS) as Array<keyof typeof LEVIER_LABELS>).map((key) => {
            const meta = LEVIER_LABELS[key];
            const levier = p.leviers[key as keyof typeof p.leviers];
            const isWeak = p.levier_faible === key;
            const intent = levier.score >= 80 ? "good" : levier.score >= 60 ? "ok" : "bad";
            const color = intent === "good" ? "#50C878" : intent === "ok" ? "#FFB450" : "#E86B6B";
            return (
              <div
                key={key}
                className="rounded-xl p-3.5"
                style={{
                  background: isWeak ? "rgba(232,107,107,0.06)" : "#14130E",
                  border: `0.5px solid ${isWeak ? "rgba(232,107,107,0.4)" : "rgba(201,168,76,0.18)"}`,
                }}
              >
                <div className="mb-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#C9A84C]">
                    <span>{meta.emoji}</span>
                    {meta.label}
                    {isWeak && (
                      <span className="ml-1 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold" style={{ background: "rgba(232,107,107,0.15)", color: "#E86B6B" }}>
                        <AlertTriangle className="h-2.5 w-2.5" />
                        FAIBLE
                      </span>
                    )}
                  </div>
                  <span className="text-lg font-bold" style={{ color }}>
                    {levier.score}
                  </span>
                </div>
                <p className="text-[11px] leading-[1.5] text-white/40">{meta.desc}</p>
                {levier.justification && (
                  <p className="mt-1.5 text-[11.5px] leading-[1.55] text-white/70">{levier.justification}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Alignements après diagnostic */}
      {p.feedback && (
        <div className="mb-4">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#C9A84C]">
            Alignements
          </div>
          <div className="flex flex-wrap gap-2">
            {(["format", "cible", "ancrage"] as const).map((k) => (
              <span
                key={k}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                style={{
                  background: p.alignements[k] ? "rgba(80,200,120,0.1)" : "rgba(232,107,107,0.08)",
                  color: p.alignements[k] ? "#50C878" : "#E86B6B",
                }}
              >
                {p.alignements[k] ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                {k === "format" ? "Format ↔ Prix" : k === "cible" ? "Solvabilité cible" : "Ancrage marché"}
              </span>
            ))}
          </div>
        </div>
      )}

      <StepFooter
        feedback={p.feedback}
        score={p.score}
        attempts={p.attempts}
        forced={p.forced}
        validated={p.validated}
        evaluating={evaluating}
        canEvaluate={p.montant.length > 0 && Number(p.montant) > 0}
        onEvaluate={handleDiagnostic}
        onBack={onBack}
        onNext={onNext}
        onForce={handleForce}
        evaluateLabel={p.feedback ? "Re-diagnostiquer" : "Lancer le diagnostic Hormozi"}
        nextLabel="Verrouiller l'offre"
      />
    </div>
  );
}
