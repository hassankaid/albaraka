import { ArrowLeft, ArrowRight } from "lucide-react";
import { TextArea, InputBlock, InputLabel, InputHelper, Card, Option, Btn, Actions } from "../../m1-niche/components/ui";
import { StepHeader } from "../components/StepHeader";
import { type M3State, type VehiculeFormat } from "../lib/types";

interface Props { state: M3State; setState: (n: (p: M3State) => M3State) => void; onBack: () => void; onNext: () => void; }

const FORMATS: Array<{ value: VehiculeFormat; emoji: string; label: string; desc: string; sweet: string }> = [
  { value: "programme_video", emoji: "🎬", label: "Programme vidéo (DIY)", desc: "Modules vidéo en ligne, à son rythme, accès à vie.", sweet: "Sweet-spot prix : 97-497€" },
  { value: "cohorte_groupe", emoji: "👥", label: "Cohorte / Programme groupe", desc: "Promotion fermée, lives hebdo, communauté Discord/Telegram.", sweet: "Sweet-spot prix : 997-2997€" },
  { value: "coaching_groupe_1to1", emoji: "🎯", label: "Coaching groupe + 1to1", desc: "Cohorte + sessions individuelles mensuelles, suivi personnalisé.", sweet: "Sweet-spot prix : 1997-4997€" },
  { value: "consulting_done_with_you", emoji: "🤝", label: "Consulting / Done-With-You", desc: "Accompagnement intensif, livrables co-construits, calls hebdo.", sweet: "Sweet-spot prix : 4997-9997€" },
  { value: "hybride_custom", emoji: "🛠️", label: "Hybride / Custom", desc: "Combo : programme vidéo + cohorte + bonus 1to1. À justifier.", sweet: "Sweet-spot prix : à calibrer" },
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
        <InputLabel>Choisis le format principal</InputLabel>
        <div className="mt-2 flex flex-col gap-2">
          {FORMATS.map((f) => (
            <Option key={f.value} selected={v.format === f.value} onClick={() => setFormat(f.value)}>
              <span className="flex items-start gap-3">
                <span className="text-xl">{f.emoji}</span>
                <span className="flex flex-1 flex-col">
                  <span className="font-semibold">{f.label}</span>
                  <span className="text-[11px] leading-snug text-white/40">{f.desc}</span>
                  <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#C9A84C]">
                    {f.sweet}
                  </span>
                </span>
              </span>
            </Option>
          ))}
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
