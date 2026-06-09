import { ArrowLeft } from "lucide-react";
import { Btn } from "../../m1-niche/components/ui";
import { M14_DEMO_CASES } from "../lib/demo-cases";

interface Props { onBack: () => void; onSelect: (id: string) => void; }

export function DemoSelectorScreen({ onBack, onSelect }: Props) {
  return (
    <div>
      <div className="mb-2 flex items-baseline gap-2">
        <span className="font-serif text-[20px] font-semibold italic text-[#C9A84C]">00</span>
        <h2 className="text-[22px] font-semibold leading-tight tracking-tight text-white">Démos</h2>
      </div>
      <p className="mb-6 text-[13px] leading-[1.65] text-white/60">
        Charge une démo pour voir l'outil avec un cas pré-rempli du casting. Le format est choisi, le HT est dégraissé, le prix est fixé, le calendrier est rempli. Aucune donnée n'est écrite sur ton profil.
      </p>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {M14_DEMO_CASES.map((d) => (
          <button key={d.id} type="button" onClick={() => onSelect(d.id)} className="rounded-xl p-4 text-left transition-all hover:border-[#C9A84C]" style={{ background: "#14130E", border: "1px solid rgba(201,168,76,0.18)" }}>
            <div className="text-[14px] font-semibold text-white">{d.name}</div>
            <div className="mt-1 text-[11.5px] font-medium text-[#C9A84C]">{d.tag}</div>
          </button>
        ))}
      </div>

      <div className="mt-6">
        <Btn variant="ghost" onClick={onBack}><ArrowLeft className="h-3.5 w-3.5" /> Retour</Btn>
      </div>
    </div>
  );
}
