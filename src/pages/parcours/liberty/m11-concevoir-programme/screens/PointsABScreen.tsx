import { ArrowLeft, ArrowRight } from "lucide-react";
import { StepEyebrow, StepTitle, StepSub, Card, InputBlock, InputLabel, InputHelper, TextArea, Option, Btn, Actions } from "../../m1-niche/components/ui";
import { TIERS, type M11State, type Tier } from "../lib/types";
import { canEnterObstaclesBrutStep, missingFieldsLabel } from "../lib/validations";

interface Props { state: M11State; setState: (n: (p: M11State) => M11State) => void; onBack: () => void; onNext: () => void; }

export function PointsABScreen({ state, setState, onBack, onNext }: Props) {
  const d = state.data;
  const m5 = state.m5_data;
  const prefilledA = !!d.point_a && m5 && m5.ht_point_a && d.point_a === m5.ht_point_a;
  const prefilledB = !!d.point_b && m5 && m5.ht_point_b && d.point_b === m5.ht_point_b;
  const ready = canEnterObstaclesBrutStep(d);

  const patch = (p: Partial<typeof d>) => setState((prev) => ({ ...prev, data: { ...prev.data, ...p } }));

  function next() {
    setState((prev) => {
      const data = { ...prev.data };
      if (!data.obstacles_brut || data.obstacles_brut.length === 0) data.obstacles_brut = ["", "", "", "", ""];
      return { ...prev, data };
    });
    onNext();
  }

  return (
    <div>
      <StepEyebrow>Étape 2 / 6 · Point A → Point B</StepEyebrow>
      <StepTitle>Point A → Point B · où tu emmènes ton client</StepTitle>
      <StepSub>
        Tu écris d'où part ton client (Point A) et où tu l'emmènes (Point B). C'est la <strong className="text-white/80">colonne
        vertébrale</strong> de tout le programme : sans Point B mesurable, tu ne peux ni promettre, ni évaluer, ni transformer.
      </StepSub>

      <Card className="mb-4">
        <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-[#C9A84C]">Le Point B doit être une capacité concrète et mesurable</div>
        <p className="mb-2 text-[13px] leading-[1.6] text-white/75">« Devenir plus confiant », « gagner en sérénité » ne sont <strong className="text-white">pas</strong> des Points B. Un Point B utilisable est <strong className="text-white">chiffré</strong>, <strong className="text-white">contextualisé</strong> et <strong className="text-white">vérifiable</strong>.</p>
        <p className="text-[12.5px] leading-[1.55] text-white/55">Ex. « Avoir signé son premier contrat closer à 8% sur des tickets ≥ 3 000 € à J+90 ». « Moins d'1 épisode de cris par semaine sur 30 jours consécutifs ».</p>
      </Card>

      <InputBlock>
        <InputLabel>Point B · où tu emmènes ton client</InputLabel>
        <TextArea value={d.point_b} onChange={(e) => patch({ point_b: e.target.value })} rows={3} placeholder="Ex. Avoir signé son premier contrat closer à 8% min sur tickets ≥ 3 000 € avec 3 calls/jour bookés à J+90" />
        <InputHelper>Chiffré + contextualisé + vérifiable{prefilledB ? " · prérempli depuis M5" : ""}</InputHelper>
      </InputBlock>

      <InputBlock>
        <InputLabel>Point A · d'où part ton client</InputLabel>
        <TextArea value={d.point_a} onChange={(e) => patch({ point_a: e.target.value })} rows={3} placeholder="Ex. Vouloir un revenu remote 4-8k€/mois sans diplôme et sans savoir par où commencer" />
        <InputHelper>La réalité douloureuse du quotidien actuel{prefilledA ? " · prérempli depuis M5" : ""}</InputHelper>
      </InputBlock>

      <InputBlock>
        <InputLabel>Tier d'exigence pédagogique</InputLabel>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {(Object.keys(TIERS) as Tier[]).map((k) => (
            <Option key={k} selected={d.tier_bloom_target === k} onClick={() => patch({ tier_bloom_target: k })}>
              <span className="flex flex-col">
                <span>{TIERS[k].label}</span>
                <span className="text-[11px] text-white/40">{TIERS[k].meta}</span>
              </span>
            </Option>
          ))}
        </div>
        <InputHelper>Module le niveau Bloom recommandé pour tes modules · prérempli depuis ton prix M6 si dispo.</InputHelper>
      </InputBlock>

      {!ready && (
        <div className="mb-4 rounded-xl px-4 py-2.5 text-[12.5px] leading-[1.5]" style={{ background: "rgba(201,138,76,0.06)", borderLeft: "2px solid #c98a4c", color: "#e8c9a0" }}>
          Pour passer aux obstacles, il te manque <strong>{missingFieldsLabel("points_ab", d)}</strong>.
        </div>
      )}

      <Actions>
        <Btn variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Gate transition</Btn>
        <Btn variant="cta" disabled={!ready} onClick={next}>Lister les obstacles <ArrowRight className="h-4 w-4" /></Btn>
      </Actions>
    </div>
  );
}
