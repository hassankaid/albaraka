import { ArrowLeft } from "lucide-react";
import { Btn, Actions } from "../../m1-niche/components/ui";
import { StepHeader } from "../components/StepHeader";
import type { M7State } from "../lib/types";

interface Props {
  state: M7State;
  setState: (n: (p: M7State) => M7State) => void;
  userId: string | null;
  onBack: () => void;
  flushNow: () => Promise<void>;
}

export function LockScreen({ onBack }: Props) {
  return (
    <div>
      <StepHeader current={6} total={6} title="Lock & Export (Sprint 5)" sub="Signature + push handoff_to_m8 (48 clés) vers M8 PREUVE SOCIALE + PDF audit trail." />
      <Actions>
        <Btn variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4" />Retour</Btn>
      </Actions>
    </div>
  );
}
