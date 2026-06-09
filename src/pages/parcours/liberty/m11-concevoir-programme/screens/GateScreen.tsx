import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { StepEyebrow, StepTitle, StepSub, Card, Btn, Actions } from "../../m1-niche/components/ui";
import { GATE_ITEMS, type M11State, type GateKey } from "../lib/types";
import { computeGateScore, canEnterPointsStep, missingFieldsLabel } from "../lib/validations";

interface Props { state: M11State; setState: (n: (p: M11State) => M11State) => void; onBack: () => void; onNext: () => void; }

export function GateScreen({ state, setState, onBack, onNext }: Props) {
  const g = state.data.gate;
  const score = computeGateScore(state.data);
  const statut = score >= 8 ? "feu_vert" : score >= 6 ? "orange" : "rouge";
  const ready = canEnterPointsStep(state.data);

  function toggle(id: GateKey) {
    setState((prev) => ({ ...prev, data: { ...prev.data, gate: { ...prev.data.gate, [id]: !prev.data.gate[id] } } }));
  }
  function toggleOverride() {
    setState((prev) => ({ ...prev, data: { ...prev.data, gate: { ...prev.data.gate, override_warning: !prev.data.gate.override_warning } } }));
  }

  return (
    <div>
      <StepEyebrow>Étape 1 / 6 · Gate de transition</StepEyebrow>
      <StepTitle>Gate de transition</StepTitle>
      <StepSub>
        Avant de concevoir ton programme DIY, tu valides les 8 prérequis qui prouvent que ta proof of concept est solide. Ce n'est
        pas un check administratif — c'est ce qui garantit que ton programme est basé sur des patterns clients réels et pas sur ton intuition.
      </StepSub>

      <Card className="mb-5">
        <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-[#C9A84C]">Pourquoi cette gate existe</div>
        <p className="mb-2 text-[13px] leading-[1.6] text-white/75">Construire un programme DIY, c'est <strong className="text-white">graver</strong> ta méthode dans des vidéos asynchrones que des centaines voire des milliers d'élèves vont consommer sans toi. Si ce que tu graves n'est pas validé par des résultats clients réels, tu graves du vent. Et tu devras tout refaire.</p>
        <p className="text-[13px] leading-[1.6] text-white/75">La règle non-négociable : <strong className="text-white">10 happy clients livrés en accompagnement humain</strong> avant la première vidéo DIY. Le DIY est la <strong className="text-[#C9A84C]">scale explosion</strong> de tes patterns validés. Pas un raccourci pour les découvrir.</p>
      </Card>

      <div className="mb-5 space-y-2">
        {GATE_ITEMS.map((it) => {
          const checked = !!g[it.id];
          return (
            <button key={it.id} type="button" onClick={() => toggle(it.id)} className="flex w-full items-start gap-3 rounded-[10px] px-4 py-3 text-left transition-all"
              style={{ background: checked ? "#2A2310" : "#14130E", border: checked ? "1px solid #C9A84C" : "1px solid rgba(201,168,76,0.18)" }}>
              <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px]" style={{ background: checked ? "#C9A84C" : "transparent", border: checked ? "1.5px solid #C9A84C" : "1.5px solid rgba(201,168,76,0.4)" }}>
                {checked && <Check className="h-3 w-3" strokeWidth={3} style={{ color: "#080808" }} />}
              </span>
              <span className="flex-1">
                <span className="block text-[13.5px] font-semibold text-white">{it.title}</span>
                <span className="mt-0.5 block text-[12px] leading-[1.5] text-white/55">{it.desc} <span className="text-white/30">· ref {it.dep_module}</span></span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Statut */}
      <Card className="mb-5" accent={statut === "feu_vert" ? undefined : "warning"}>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-[28px] font-bold leading-none" style={{ color: statut === "feu_vert" ? "#4cc987" : statut === "orange" ? "#FFB450" : "#E86B6B" }}>{score} / 8</div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.08em] text-white/40">prérequis validés</div>
          </div>
          <p className="flex-1 text-[13px] leading-[1.55] text-white/75">
            {statut === "feu_vert" && <><strong className="text-[#4cc987]">Feu vert.</strong> Tes 8 prérequis sont validés. Tu peux concevoir ton programme DIY sereinement — ta proof of concept est solide.</>}
            {statut === "orange" && <><strong className="text-[#FFB450]">Tu n'as pas encore tous les prérequis ({score}/8).</strong> Ce que tu construis devra fonctionner sans toi. Recommandation : reviens finir les modules manquants. Mais si tu sais ce que tu fais, coche l'override ci-dessous pour avancer.</>}
            {statut === "rouge" && <><strong className="text-[#E86B6B]">Tu n'as que {score}/8 prérequis — blocage.</strong> En dessous de 6/8, l'outil te bloque par protection. La méthode : 10 happy clients d'abord, conception du DIY ensuite. Reviens finir les modules manquants.</>}
          </p>
        </div>
        {statut === "orange" && (
          <button type="button" onClick={toggleOverride} className="mt-4 flex w-full items-start gap-3 rounded-[10px] px-4 py-3 text-left transition-all" style={{ background: g.override_warning ? "#2A2310" : "#14130E", border: g.override_warning ? "1px solid #FFB450" : "1px solid rgba(255,180,80,0.3)" }}>
            <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px]" style={{ background: g.override_warning ? "#FFB450" : "transparent", border: "1.5px solid #FFB450" }}>
              {g.override_warning && <Check className="h-3 w-3" strokeWidth={3} style={{ color: "#080808" }} />}
            </span>
            <span className="flex-1 text-[12.5px] leading-[1.5] text-white/80">Je continue malgré tout — j'assume la dette des prérequis manquants en parallèle.</span>
          </button>
        )}
      </Card>

      {!ready && (
        <div className="mb-4 rounded-xl px-4 py-2.5 text-[12.5px] leading-[1.5]" style={{ background: "rgba(201,138,76,0.06)", borderLeft: "2px solid #c98a4c", color: "#e8c9a0" }}>
          Pour avancer, il te manque <strong>{missingFieldsLabel("gate_transition", state.data)}</strong>.
        </div>
      )}

      <Actions>
        <Btn variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Welcome</Btn>
        <Btn variant="cta" disabled={!ready} onClick={onNext}>Définir Point A et Point B <ArrowRight className="h-4 w-4" /></Btn>
      </Actions>
    </div>
  );
}
