import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Questionnaire } from "./components/Questionnaire";
import { BrandRecap } from "./components/BrandRecap";
import { usePersonalBrand, useSaveBrand } from "./hooks/usePersonalBrand";
import type { BrandAnswers } from "./lib/sections";
import { toast } from "sonner";

type Step = "loading" | "questionnaire" | "recap";

export default function PersonalBrandPage() {
  const brandQuery = usePersonalBrand();
  const saveMutation = useSaveBrand();

  const [step, setStep] = useState<Step>("loading");
  const [answers, setAnswers] = useState<BrandAnswers>({});
  const [currentSection, setCurrentSection] = useState(0);

  // Init depuis BDD
  useEffect(() => {
    if (brandQuery.isLoading) return;
    const row = brandQuery.data;
    if (row?.generated_profiles && (row.generated_profiles as any[]).length > 0) {
      setAnswers((row.answers as BrandAnswers) ?? {});
      setStep("recap");
    } else if (row) {
      setAnswers((row.answers as BrandAnswers) ?? {});
      setStep("questionnaire");
    } else {
      setStep("questionnaire");
    }
  }, [brandQuery.isLoading, brandQuery.data]);

  const handleChange = (id: string, value: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const handleFinish = async () => {
    try {
      await saveMutation.mutateAsync(answers);
      toast.success("Ta fiche Personal Brand est prête ✦");
      setStep("recap");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur de sauvegarde");
    }
  };

  const handleEditSection = (index: number) => {
    setCurrentSection(index);
    setStep("questionnaire");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRestart = () => {
    setAnswers({});
    setCurrentSection(0);
    setStep("questionnaire");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (step === "loading") {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-4">
        <Skeleton className="h-10 w-1/2 mx-auto" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (step === "recap") {
    return (
      <BrandRecap
        answers={answers}
        profiles={(brandQuery.data?.generated_profiles as any) ?? []}
        onEditSection={handleEditSection}
        onRestart={handleRestart}
      />
    );
  }

  return (
    <Questionnaire
      answers={answers}
      onChange={handleChange}
      currentSection={currentSection}
      setCurrentSection={setCurrentSection}
      onFinish={handleFinish}
      finishing={saveMutation.isPending}
    />
  );
}
