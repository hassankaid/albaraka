import { ArrowLeft } from "lucide-react";
import { StepEyebrow, StepTitle, StepSub, Btn, Actions } from "../../m1-niche/components/ui";
import { M12_DEMO_CASES } from "../lib/demo-cases";

interface Props { onBack: () => void; onSelect: (id: string) => void; }

export function DemoSelectorScreen({ onBack, onSelect }: Props) {
  return (
    <div>
      <StepEyebrow>Démos · 10 cas calibrés</StepEyebrow>
      <StepTitle>Choisis une démo</StepTitle>
      <StepSub>Charge un cas pré-rempli du casting (5 techniques × 3 tiers). Naming et positionnement déjà validés. Aucune écriture sur ton profil — la démo sert à comprendre la mécanique, pas à être copiée.</StepSub>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {M12_DEMO_CASES.map((c) => (
          <button key={c.id} type="button" onClick={() => onSelect(c.id)} className="rounded-xl p-4 text-left transition-all hover:-translate-y-0.5" style={{ background: "#14130E", border: "0.5px solid rgba(201,168,76,0.18)" }}>
            <div className="font-serif text-[15px] font-semibold text-[#C9A84C]">{c.name}</div>
            <div className="mt-1 text-[11.5px] leading-[1.45] text-white/45">{c.tag}</div>
          </button>
        ))}
      </div>

      <Actions align="center"><Btn variant="ghost" onClick={onBack}><ArrowLeft className="h-3.5 w-3.5" /> Retour</Btn></Actions>
    </div>
  );
}
