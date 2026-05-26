import { ArrowLeft, ArrowRight } from "lucide-react";
import { Btn, Actions } from "../../m1-niche/components/ui";
import { StepHeader } from "../components/StepHeader";
import type { M6State } from "../lib/types";

interface Props { state: M6State; setState: (n: (p: M6State) => M6State) => void; onBack: () => void; onNext: () => void; }

export function BaoScreen({ onBack, onNext }: Props) {
  return (
    <div>
      <StepHeader current={6} total={7} title="Bronze / Argent / Or (Sprint 4)" sub="Stratégie 3 options · 3 prix + contenu court par tier." />
      <Actions>
        <Btn variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4" />Retour</Btn>
        <Btn variant="primary" onClick={onNext}>Suivant<ArrowRight className="h-4 w-4" /></Btn>
      </Actions>
    </div>
  );
}
