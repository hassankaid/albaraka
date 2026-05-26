import { ArrowLeft, ArrowRight } from "lucide-react";
import { Btn, Actions } from "../../m1-niche/components/ui";
import { StepHeader } from "../components/StepHeader";
import type { M7State } from "../lib/types";

interface Props { state: M7State; setState: (n: (p: M7State) => M7State) => void; onBack: () => void; onNext: () => void; }

export function TermesConditionsScreen({ onBack, onNext }: Props) {
  return (
    <div>
      <StepHeader current={6} total={6} title="Termes & Conditions (Sprint 4)" sub="T&C écrits + statut vendeur (SIRET / micro / SASU)." />
      <Actions>
        <Btn variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4" />Retour</Btn>
        <Btn variant="primary" onClick={onNext}>Lock & PDF<ArrowRight className="h-4 w-4" /></Btn>
      </Actions>
    </div>
  );
}
