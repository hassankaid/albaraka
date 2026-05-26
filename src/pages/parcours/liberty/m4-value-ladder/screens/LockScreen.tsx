import { ArrowLeft } from "lucide-react";
import { Btn, Actions } from "../../m1-niche/components/ui";
import { StepHeader } from "../components/StepHeader";
import type { M4State } from "../lib/types";

interface Props {
  state: M4State;
  setState: (n: (p: M4State) => M4State) => void;
  userId: string | null;
  onBack: () => void;
  flushNow: () => Promise<void>;
}

export function LockScreen({ onBack }: Props) {
  return (
    <div>
      <StepHeader current={4} total={4} title="Lock & Export (à implémenter Sprint 4)" sub="Signature + push handoff vers M5 + PDF audit trail." />
      <Actions>
        <Btn variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4" />Retour</Btn>
      </Actions>
    </div>
  );
}
