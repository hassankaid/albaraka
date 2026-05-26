import { ArrowLeft, ArrowRight } from "lucide-react";
import { TextArea, InputBlock, InputLabel, InputHelper, Card, Option, Btn, Actions } from "../../m1-niche/components/ui";
import { StepHeader } from "../components/StepHeader";
import { type M3State, type VehiculeFormat, type MarketType } from "../lib/types";

interface Props { state: M3State; setState: (n: (p: M3State) => M3State) => void; onBack: () => void; onNext: () => void; }

const FORMATS: Array<{ value: VehiculeFormat; emoji: string; label: string; desc: string; fitMarket: MarketType[] }> = [
  { value: "programme_video", emoji: "🎬", label: "Programme vidéo + communauté",
    desc: "Modules vidéo en libre accès, Discord/Telegram, templates. Le plus scalable. Recommandé pour < 500€.",
    fitMarket: ["b2c_info"] },
  { value: "cohorte_groupe", emoji: "👥", label: "Cohorte + lives groupe",
    desc: "Programme + 1-2 lives par mois + revue async. Sweet spot 500-2000€ B2C info & transfo.",
    fitMarket: ["b2c_info", "b2c_transfo"] },
  { value: "coaching_groupe_1to1", emoji: "🎯", label: "Programme + groupe + 1to1",
    desc: "Programme + groupe hebdo + sessions individuelles. Le plus adapté pour la transformation. 1500-3500€.",
    fitMarket: ["b2c_transfo"] },
  { value: "consulting_done_with_you", emoji: "🤝", label: "Consulting / done-with-you",
    desc: "Audit + plan + sessions stratégiques + Slack. Réservé B2B et high-ticket. 2500-12000€.",
    fitMarket: ["b2b"] },
  { value: "mastermind", emoji: "👑", label: "Mastermind (cohorte fermée)",
    desc: "Petit groupe sélectionné, sessions hebdo, accès direct. 5000-15000€. Réservé profils avancés.",
    fitMarket: ["b2b", "b2c_transfo"] },
  { value: "hybride_custom", emoji: "🛠️", label: "Format hybride (custom)",
    desc: "Ton format propre, mix de plusieurs ci-dessus. Justifie bien dans la zone ci-dessous.",
    fitMarket: ["b2c_info", "b2c_transfo", "b2b"] },
];

export function VehiculeScreen({ state, setState, onBack, onNext }: Props) {
  const v = state.vehicule;
  const setFormat = (f: VehiculeFormat) => setState((prev) => ({ ...prev, vehicule: { ...prev.vehicule, format: f, validated: !!f && !!prev.vehicule.justification } }));
  const setJustif = (val: string) => setState((prev) => ({ ...prev, vehicule: { ...prev.vehicule, justification: val, validated: !!prev.vehicule.format && val.trim().length >= 30 } }));

  const canNext = !!v.format && v.justification.trim().length >= 30;

  return (
    <div>
      <StepHeader
        current={3}
        total={7}
        title="Véhicule de livraison"
        sub={`Le format de ton offre détermine la valeur perçue ET ton sweet-spot prix. Pas d'IA scoring ici — juste un choix éclairé + justification pour bien aligner avec ta promesse.`}
      />

      <Card className="mb-4">
        <InputLabel>Choisis ton format de livraison</InputLabel>
        <div className="mt-2 flex flex-col gap-2">
          {FORMATS.map((f) => {
            const recommend = !!state.market_type && f.fitMarket.includes(state.market_type);
            return (
              <Option key={f.value} selected={v.format === f.value} onClick={() => setFormat(f.value)}>
                <span className="flex items-start gap-3">
                  <span className="text-xl">{f.emoji}</span>
                  <span className="flex flex-1 flex-col">
                    <span className="font-semibold">
                      {f.label}
                      {recommend && (
                        <span className="ml-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#7FB069]">
                          · RECOMMANDÉ
                        </span>
                      )}
                    </span>
                    <span className="text-[11px] leading-snug text-white/40">{f.desc}</span>
                  </span>
                </span>
              </Option>
            );
          })}
        </div>
      </Card>

      <InputBlock>
        <InputLabel>Justification du format choisi</InputLabel>
        <TextArea
          rows={3}
          value={v.justification}
          onChange={(e) => setJustif(e.target.value)}
          placeholder="Pourquoi ce format pour ta cible précise. Ex : Cohorte fermée 12 places, 1 live/sem (jeudi 21h post-enfants), Discord pour partage quotidien, 2 sessions 1to1/mois. 12 semaines."
        />
        <InputHelper>
          Décris concrètement : capacité, fréquence des lives, canal de communauté, durée.
        </InputHelper>
      </InputBlock>

      <Actions>
        <Btn variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Étape précédente
        </Btn>
        <Btn variant="primary" disabled={!canNext} onClick={onNext}>
          Étape suivante
          <ArrowRight className="h-4 w-4" />
        </Btn>
      </Actions>
    </div>
  );
}
