import { ArrowLeft } from "lucide-react";
import { Btn, Actions } from "../../m1-niche/components/ui";
import { StepHeader } from "../components/StepHeader";
import type { M6State } from "../lib/types";

interface Props {
  state: M6State;
  setState: (n: (p: M6State) => M6State) => void;
  userId: string | null;
  onBack: () => void;
  flushNow: () => Promise<void>;
}

export function LockScreen({ onBack }: Props) {
  return (
    <div>
      <StepHeader current={7} total={7} title="Lock & Export (Sprint 5)" sub="Engagement no_price_drop avec 3 leviers valeur · handoff_to_m7 vers GARANTIE · PDF audit trail." />
      <Actions>
        <Btn variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4" />Retour</Btn>
      </Actions>
    </div>
  );
}
