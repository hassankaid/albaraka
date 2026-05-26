import { ArrowLeft, ArrowRight } from "lucide-react";
import { Btn, Actions } from "../../m1-niche/components/ui";
import { StepHeader } from "../components/StepHeader";
import type { M5State } from "../lib/types";

interface Props { state: M5State; setState: (n: (p: M5State) => M5State) => void; onBack: () => void; onNext: () => void; }

export function StructureScreen({ onBack, onNext }: Props) {
  return (
    <div>
      <StepHeader current={4} total={5} title="Structure 12 semaines · 90 jours (à implémenter Sprint 5)" sub="Mapper ton mécanisme M3 sur 3 phases de 4 semaines + livrables concrets par phase." />
      <Actions>
        <Btn variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4" />Retour</Btn>
        <Btn variant="primary" onClick={onNext}>Suivant<ArrowRight className="h-4 w-4" /></Btn>
      </Actions>
    </div>
  );
}
