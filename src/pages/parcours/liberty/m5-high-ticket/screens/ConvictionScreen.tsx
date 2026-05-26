import { useState } from "react";
import { toast } from "sonner";
import { CheckSquare, Square } from "lucide-react";
import { TextArea, InputBlock, InputLabel, InputHelper, Card } from "../../m1-niche/components/ui";
import { StepHeader } from "../components/StepHeader";
import { StepFooter } from "../components/StepFooter";
import { evaluateConviction } from "../lib/aiEvaluator";
import { type M5State, type ConvictionChecklist, validationThreshold, pickAvatarName, pickPriceText } from "../lib/types";

interface Props {
  state: M5State;
  setState: (n: (p: M5State) => M5State) => void;
  onBack: () => void;
  onNext: () => void;
}

export function ConvictionScreen({ state, setState, onBack, onNext }: Props) {
  const [evaluating, setEvaluating] = useState(false);
  const conv = state.data.conviction;
  const threshold = validationThreshold(state);
  const avatar = pickAvatarName(state);
  const price = pickPriceText(state);

  const setConv = (patch: Partial<typeof conv>) =>
    setState((prev) => ({ ...prev, data: { ...prev.data, conviction: { ...prev.data.conviction, ...patch } } }));
  const toggleCheck = (key: keyof ConvictionChecklist) =>
    setState((prev) => ({
      ...prev,
      data: { ...prev.data, conviction: { ...prev.data.conviction, checklist: { ...prev.data.conviction.checklist, [key]: !prev.data.conviction.checklist[key] } } },
    }));

  const checks: Array<{ key: keyof ConvictionChecklist; label: React.ReactNode }> = [
    { key: "sur_delivre", label: <>Mon offre <strong>sur-délivre</strong> sur la promesse — j'apporte plus que ce que j'annonce.</> },
    { key: "ten_clients", label: <>J'ai (ou je vise sereinement) <strong>au moins 10 clients heureux</strong> qui ont obtenu le résultat promis.</> },
    { key: "believe_price", label: <>Je crois <strong>profondément</strong> que mon offre vaut <strong>{price}</strong> — je l'achèterais si j'étais à la place de {avatar}.</> },
    { key: "recommend_to_brother", label: <>Je <strong>recommanderais</strong> mon offre à mon propre frère / ma propre sœur sans hésiter.</> },
    { key: "prepared_objections", label: <>Je sais répondre aux <strong>7 objections principales</strong> sans hésitation.</> },
  ];

  const allChecked = checks.every((c) => conv.checklist[c.key]);
  const someUnchecked = checks.some((c) => !conv.checklist[c.key]);

  const canEvaluate = (conv.next_action || "").trim().length >= 30 && (
    allChecked || (conv.missing.trim().length >= 30)
  );

  async function handleEvaluate() {
    setEvaluating(true);
    try {
      const fb = await evaluateConviction(state);
      setState((prev) => ({
        ...prev,
        scores: { ...prev.scores, conviction: fb.score },
        attempts: { ...prev.attempts, conviction: prev.attempts.conviction + 1 },
        lastFb: { ...prev.lastFb, conviction: { verdict: fb.verdict, strengths: fb.strengths, weaknesses: fb.weaknesses, suggestions: fb.suggestions, ai_mode: fb.ai_mode } },
        highest: fb.score >= validationThreshold(prev) && prev.highest === "conviction" ? "lock" : prev.highest,
      }));
    } catch (e: any) {
      toast.error("Erreur évaluation : " + (e?.message ?? "inconnue"));
    } finally { setEvaluating(false); }
  }

  function handleForce() {
    setState((prev) => ({
      ...prev,
      forced: { ...prev.forced, conviction: true },
      highest: prev.highest === "conviction" ? "lock" : prev.highest,
    }));
  }

  const score = state.scores.conviction;
  const fb = state.lastFb.conviction;
  const validated = (score !== null && score >= threshold) || state.forced.conviction;

  return (
    <div>
      <StepHeader
        current={5}
        total={5}
        title="Conviction intérieure"
        sub="Si TOI tu ne crois pas à 100% à ton offre, ton prospect le sentira. La conviction ne se script pas — elle se gagne par la sur-délivrance et l'audit interne."
      />

      <Card className="mb-5">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#C9A84C]">
          5 checks internes
        </div>
        <div className="space-y-2">
          {checks.map((c) => {
            const isChecked = conv.checklist[c.key];
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => toggleCheck(c.key)}
                className="flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors hover:bg-white/[0.02]"
                style={{ border: `0.5px solid ${isChecked ? "rgba(127,176,105,0.4)" : "rgba(201,168,76,0.18)"}` }}
              >
                {isChecked ? <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-[#7FB069]" /> : <Square className="mt-0.5 h-4 w-4 shrink-0 text-white/30" />}
                <span className="text-[13px] leading-[1.5] text-white/85">{c.label}</span>
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="mb-5">
        <InputBlock>
          <InputLabel>
            Ce qui me manque {someUnchecked && <span className="text-[11px] text-[#FFB450]">— important si certains checks ne sont pas cochés</span>}
          </InputLabel>
          <TextArea
            rows={3}
            value={conv.missing}
            onChange={(e) => setConv({ missing: e.target.value })}
            placeholder={someUnchecked
              ? "Ex : Il me manque 3 témoignages vidéo pour vraiment me sentir prêt à vendre à 2 997€. Aujourd'hui j'ai 7 clients heureux mais aucun n'a accepté de filmer."
              : "(optionnel si tous les checks sont cochés)"
            }
          />
          <InputHelper>Honnêteté brutale. Pas de « je suis confiant » sans contenu — l'IA le détecte comme déni.</InputHelper>
        </InputBlock>
        <InputBlock>
          <InputLabel>Prochaine action (datée, ≤ 7 jours) *</InputLabel>
          <TextArea
            rows={2}
            value={conv.next_action}
            onChange={(e) => setConv({ next_action: e.target.value })}
            placeholder="Ex : Cette semaine, contacter 5 clients clos et leur proposer 50€ + remise pour témoignage vidéo de 3 min. Signal : 2 témoignages enregistrés d'ici dimanche."
          />
          <InputHelper>Une action concrète + une métrique de succès + un délai. Sinon l'IA refuse.</InputHelper>
        </InputBlock>
      </Card>

      <StepFooter
        feedback={fb}
        score={score}
        attempts={state.attempts.conviction}
        forced={state.forced.conviction}
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
