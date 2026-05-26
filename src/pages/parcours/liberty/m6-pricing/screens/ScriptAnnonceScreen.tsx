import { ArrowLeft, ArrowRight } from "lucide-react";
import { Btn, Actions } from "../../m1-niche/components/ui";
import { StepHeader } from "../components/StepHeader";
import type { M6State } from "../lib/types";

interface Props { state: M6State; setState: (n: (p: M6State) => M6State) => void; onBack: () => void; onNext: () => void; }

export function ScriptAnnonceScreen({ onBack, onNext }: Props) {
  return (
    <div>
      <StepHeader current={7} total={7} title="Script d'annonce (Sprint 4)" sub="Composer ton pitch d'annonce de prix · valeur + ROI + paiements + B/A/O en 1 script unique." />
      <Actions>
        <Btn variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4" />Retour</Btn>
        <Btn variant="primary" onClick={onNext}>Lock & PDF<ArrowRight className="h-4 w-4" /></Btn>
      </Actions>
    </div>
  );
}
