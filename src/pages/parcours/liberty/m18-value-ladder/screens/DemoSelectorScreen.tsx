import { Card, StepH2, Lead } from "../components/parts";
import { DEMOS } from "../lib/demo-cases";

interface Props { onBack: () => void; onSelect: (id: string) => void; }

export function DemoSelectorScreen({ onBack, onSelect }: Props) {
  return (
    <Card>
      <StepH2 marker="◇">Les cas démos</StepH2>
      <Lead>Charge un cas pré-rempli du casting pour voir l’échelle complète — les 5 niveaux, les transitions d’ascension et le calcul de LTV. Aucune donnée n’est écrite sur ton profil. Sors de la démo pour revenir à ta vraie échelle.</Lead>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {DEMOS.map((d) => (
          <button key={d.id} type="button" onClick={() => onSelect(d.id)} className="rounded-xl p-4 text-left transition-all hover:border-[#C9A84C]" style={{ background: "#181818", border: "1px solid #2a2a2a" }}>
            <div className="text-[14px] font-semibold text-white">{d.name}</div>
            <div className="mt-1 text-[12px] text-[#C9A84C]">{d.tag}</div>
          </button>
        ))}
      </div>

      <div className="mt-5">
        <button type="button" onClick={onBack} className="rounded-full px-4 py-2 text-[13px] font-medium" style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.4)", color: "#C9A84C" }}>← Retour</button>
      </div>
    </Card>
  );
}
