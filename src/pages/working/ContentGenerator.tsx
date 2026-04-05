import {
  ContentWizardProvider,
  useContentWizard,
} from "./content-wizard/ContentWizardContext";
import { WizardStepper } from "./content-wizard/components/WizardStepper";
import { Step1Idea } from "./content-wizard/steps/Step1Idea";
import { Step2Script } from "./content-wizard/steps/Step2Script";
import { Step3Montage } from "./content-wizard/steps/Step3Montage";
import { Step4Description } from "./content-wizard/steps/Step4Description";
import { Step5Publication } from "./content-wizard/steps/Step5Publication";

function WizardContent() {
  const { state } = useContentWizard();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🎬 Générateur de Contenu</h1>
        <p className="text-muted-foreground">
          De l'idée à la publication en 5 étapes guidées
        </p>
      </div>

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
