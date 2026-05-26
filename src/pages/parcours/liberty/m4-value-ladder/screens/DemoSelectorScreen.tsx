import { ArrowLeft } from "lucide-react";
import { Btn, Actions } from "../../m1-niche/components/ui";

interface Props {
  onBack: () => void;
  onSelect: (key: string) => void;
}

export function DemoSelectorScreen({ onBack }: Props) {
  return (
    <div>
      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#C9A84C]">Mode démo</span>
      <h2 className="mb-2 text-[22px] font-semibold leading-tight tracking-tight text-white">
        Démos M4 — à implémenter Sprint 4
      </h2>
      <p className="mb-6 max-w-[580px] text-[13px] leading-[1.6] text-white/60">
        10 cas synchronisés M1/M2/M3, dont 2 anti-patterns (Younes + Lina), prêts pour explorer sans toucher à ton vrai parcours.
      </p>
      <Actions align="center">
        <Btn variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour
        </Btn>
      </Actions>
    </div>
  );
}
