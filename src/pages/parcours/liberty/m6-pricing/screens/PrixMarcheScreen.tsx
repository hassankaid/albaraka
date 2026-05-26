import { useState, useMemo } from "react";
import { toast } from "sonner";
import { TextInput, TextArea, InputBlock, InputLabel, InputHelper, Card } from "../../m1-niche/components/ui";
import { StepHeader } from "../components/StepHeader";
import { StepFooter } from "../components/StepFooter";
import { evaluatePrixMarche } from "../lib/aiEvaluator";
import { type M6State, type ConcurrentEntry, validationThreshold, computeMarketAvg } from "../lib/types";

interface Props {
  state: M6State;
  setState: (n: (p: M6State) => M6State) => void;
  onBack: () => void;
  onNext: () => void;
}

export function PrixMarcheScreen({ state, setState, onBack, onNext }: Props) {
  const [evaluating, setEvaluating] = useState(false);
  const d = state.data.prix_marche;
  const threshold = validationThreshold(state);

  const moyen = useMemo(() => computeMarketAvg(d.concurrents), [d.concurrents]);

  const setConc = (idx: number, patch: Partial<ConcurrentEntry>) =>
    setState((prev) => ({
      ...prev,
      data: {
        ...prev.data,
        prix_marche: {
          ...prev.data.prix_marche,
          concurrents: prev.data.prix_marche.concurrents.map((c, i) => (i === idx ? { ...c, ...patch } : c)),
        },
      },
    }));
  const setPos = (val: string) =>
    setState((prev) => ({ ...prev, data: { ...prev.data, prix_marche: { ...prev.data.prix_marche, positionnement: val } } }));

  const valides = d.concurrents.filter((c) => c.nom.trim() && parseFloat(c.prix.replace(/[^\d.,]/g, "")) > 0);
  const urlRegex = /[a-z0-9-]+\.[a-z]{2,}/i;
  const avecUrl = valides.filter((c) => urlRegex.test(c.url));
  const canEvaluate = avecUrl.length >= 3 && d.positionnement.trim().length >= 30;

  async function handleEvaluate() {
    setEvaluating(true);
    try {
      const fb = await evaluatePrixMarche(state);
      setState((prev) => ({
        ...prev,
        data: { ...prev.data, prix_marche: { ...prev.data.prix_marche, prix_marche_moyen: moyen } },
        scores: { ...prev.scores, prix_marche: fb.score },
        attempts: { ...prev.attempts, prix_marche: prev.attempts.prix_marche + 1 },
        lastFb: { ...prev.lastFb, prix_marche: fb },
        highest: fb.score >= validationThreshold(prev) && prev.highest === "prix_marche" ? "prix_confiance" : prev.highest,
      }));
    } catch (e: any) { toast.error("Erreur évaluation : " + (e?.message ?? "inconnue")); }
    finally { setEvaluating(false); }
  }

  function handleForce() {
    setState((prev) => ({ ...prev, forced: { ...prev.forced, prix_marche: true }, highest: prev.highest === "prix_marche" ? "prix_confiance" : prev.highest }));
  }

  const score = state.scores.prix_marche;
  const fb = state.lastFb.prix_marche;
  const validated = (score !== null && score >= threshold) || state.forced.prix_marche;

  return (
    <div>
      <StepHeader
        current={3}
        total={7}
        title="Prix PAR le marché · 3 concurrents directs"
        sub="Slide 78 — analyse 3 concurrents directs (mêmes promesse/audience/segment). JAMAIS le moins cher : ce serait casser ton positionnement premium."
        hint="URL obligatoire pour chaque concurrent (page de vente, tarification publique, capture archivée)."
      />

      <div className="mb-4 space-y-3">
        {d.concurrents.map((c, i) => (
          <Card key={i}>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#C9A84C]">
              Concurrent {i + 1}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr_2fr]">
              <InputBlock>
                <InputLabel>Nom *</InputLabel>
                <TextInput value={c.nom} onChange={(e) => setConc(i, { nom: e.target.value })} placeholder="Ex : Closer Academy" />
              </InputBlock>
              <InputBlock>
                <InputLabel>Prix (€) *</InputLabel>
                <TextInput value={c.prix} onChange={(e) => setConc(i, { prix: e.target.value })} placeholder="2500" />
              </InputBlock>
              <InputBlock>
                <InputLabel>URL *</InputLabel>
                <TextInput value={c.url} onChange={(e) => setConc(i, { url: e.target.value })} placeholder="https://exemple.com/programme" />
              </InputBlock>
            </div>
          </Card>
        ))}
      </div>

      {/* Moyenne live */}
      {moyen > 0 && (
        <div
          className="mb-4 rounded-xl p-3 text-center text-[13px]"
          style={{ background: "#0B0A07", border: "0.5px solid rgba(201,168,76,0.4)" }}
        >
          <span className="text-white/50">Moyenne marché : </span>
          <strong className="text-[#C9A84C]">{moyen.toLocaleString("fr-FR")} €</strong>
          <span className="ml-2 text-white/40">· {valides.length} concurrent(s) valides, {avecUrl.length} avec URL</span>
        </div>
      )}

      <Card className="mb-5">
        <InputBlock>
          <InputLabel>Ton positionnement vs marché (30+ chars) *</InputLabel>
          <TextArea
            rows={3}
            value={d.positionnement}
            onChange={(e) => setPos(e.target.value)}
            placeholder="Ex : Premium top 30% — supérieur à 2 concurrents sur 3, mais avec coach individuel inclus et garantie 90j (vs simple plateforme vidéo). Pas le moins cher = le mieux placé."
          />
          <InputHelper>JAMAIS « moins cher / low cost / prix bas » — c'est l'anti-pattern slide 78.</InputHelper>
        </InputBlock>
      </Card>

      <StepFooter
        feedback={fb}
        score={score}
        attempts={state.attempts.prix_marche}
        forced={state.forced.prix_marche}
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
