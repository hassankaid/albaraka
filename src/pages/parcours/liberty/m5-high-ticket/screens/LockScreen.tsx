import { ArrowLeft } from "lucide-react";
import { Btn, Actions } from "../../m1-niche/components/ui";
import { StepHeader } from "../components/StepHeader";
import type { M5State } from "../lib/types";

interface Props {
  state: M5State;
  setState: (n: (p: M5State) => M5State) => void;
  userId: string | null;
  onBack: () => void;
  flushNow: () => Promise<void>;
}

export function LockScreen({ onBack }: Props) {
  return (
    <div>
      <StepHeader current={5} total={5} title="Lock & Export (à implémenter Sprint 7)" sub="Engagement signé + push handoff_to_m6 vers liberty_user_profile + PDF audit trail multi-pages." />
      <Actions>
        <Btn variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4" />Retour</Btn>
      </Actions>
    </div>
  );
}
