import { useContentWizard } from "../ContentWizardContext";
import { STEPS } from "../constants";
import { cn } from "@/lib/utils";
import { Check, AlertTriangle } from "lucide-react";
import { WizardStep } from "../types";

export function WizardStepper() {
  const { state, goToStep } = useContentWizard();

  const isStepCompleted = (stepId: number): boolean => {
    switch (stepId) {
      case 1:
        return state.selectedIdea !== null;
      case 2:
        return state.script !== null;
      case 3:
        return Object.values(state.montageChecklist).every(Boolean);
      case 4:
        return state.description !== null;
      case 5:
        return Object.values(state.publicationChecklist).some(Boolean);
      default:
        return false;
    }
  };

  const needsRegeneration = (stepId: number): boolean => {
    return state.stepsToRegenerate.includes(stepId);
  };

  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between relative">
        {STEPS.map((step, index) => {
          const isActive = state.currentStep === step.id;
          const isCompleted = isStepCompleted(step.id);
          const needsRegen = needsRegeneration(step.id);

          return (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              <button
                onClick={() => goToStep(step.id as WizardStep)}
                className="flex flex-col items-center gap-2 relative z-10 hover:scale-105 transition-transform"
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all border-2",
                    isActive
                      ? "border-primary bg-primary text-primary-foreground shadow-md"
                      : isCompleted && !needsRegen
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : needsRegen
                          ? "border-amber-500 bg-amber-500/10 text-amber-600"
                          : "border-muted bg-muted/50 text-muted-foreground"
                  )}
                >
                  {isCompleted && !needsRegen ? (
                    <Check className="h-5 w-5" />
                  ) : needsRegen ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : (
                    <span>{step.emoji}</span>
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium whitespace-nowrap",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </button>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 mx-2 mt-[-1.25rem]",
                    isStepCompleted(step.id) ? "bg-primary/50" : "bg-muted"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
