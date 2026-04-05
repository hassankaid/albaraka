import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ContentWizardProvider,
  useContentWizard,
} from "./content-wizard/ContentWizardContext";
import { WizardStepper } from "./content-wizard/components/WizardStepper";
import { WizardHeader } from "./content-wizard/components/WizardHeader";
import { Step1Idea } from "./content-wizard/steps/Step1Idea";
import { Step2Script } from "./content-wizard/steps/Step2Script";
import { Step3Montage } from "./content-wizard/steps/Step3Montage";
import { Step4Description } from "./content-wizard/steps/Step4Description";
import { Step5Publication } from "./content-wizard/steps/Step5Publication";
import { useContentPiece } from "@/hooks/useContentPiece";
import { Loader2 } from "lucide-react";

function WizardContent() {
  const { state, loadFromContentPiece } = useContentWizard();
  const [searchParams] = useSearchParams();
  const contentId = searchParams.get("id");
  const { data: existingContent, isLoading } = useContentPiece(contentId);

  useEffect(() => {
    if (existingContent && state.contentPieceId !== existingContent.id) {
      loadFromContentPiece(existingContent);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingContent]);

  if (isLoading && contentId) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <WizardHeader />
      <WizardStepper />

      {state.currentStep === 1 && <Step1Idea />}
      {state.currentStep === 2 && <Step2Script />}
      {state.currentStep === 3 && <Step3Montage />}
      {state.currentStep === 4 && <Step4Description />}
      {state.currentStep === 5 && <Step5Publication />}
    </div>
  );
}

export default function ContentGenerator() {
  return (
    <ContentWizardProvider>
      <WizardContent />
    </ContentWizardProvider>
  );
}
