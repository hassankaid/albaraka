import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pencil, ArrowLeft, Repeat } from "lucide-react";
import { toast } from "sonner";
import { Questionnaire } from "./components/Questionnaire";
import { GeneratingOverlay } from "./components/GeneratingOverlay";
import ModeSelector from "./components/ModeSelector";
import Step1Profiles from "./components/Step1Profiles";
import Step2Prompt from "./components/Step2Prompt";
import Step3Weeks from "./components/Step3Weeks";
import {
  usePersonalBrand,
  useBrandWeeks,
  useSaveBrand,
  useGenerateProfiles,
  useConfirmStep,
  useGenerateWeek,
  useConfirmWeekPublished,
} from "./hooks/usePersonalBrand";
import { useBrandMode } from "./hooks/useBrandMode";
import {
  type BrandAnswers,
  type BrandMode,
  isQuestionnaireComplete,
  totalQuestions,
  countAnsweredQuestions,
} from "./lib/sections";
import { buildFullPrompt } from "./lib/buildPrompts";

type View = "loading" | "select-mode" | "questionnaire" | "studio";

export default function PersonalBrandPage() {
  const brandQuery = usePersonalBrand();
  const { mode: resolvedMode, isLoading: modeLoading, setMode, canSwitch } = useBrandMode();
  const saveMutation = useSaveBrand();
  const generateProfilesMutation = useGenerateProfiles();
  const confirmStep1 = useConfirmStep(1);
  const confirmStep2 = useConfirmStep(2);
  const generateWeekMutation = useGenerateWeek();
  const confirmWeekMutation = useConfirmWeekPublished();

  const [answers, setAnswers] = useState<BrandAnswers>({});
  const [currentSection, setCurrentSection] = useState(0);
  const [forceQuestionnaire, setForceQuestionnaire] = useState(false);

  const weeksQuery = useBrandWeeks();

  // Init des réponses depuis la BDD
  useEffect(() => {
    if (brandQuery.isLoading) return;
    const row = brandQuery.data;
    if (row?.answers) setAnswers(row.answers as BrandAnswers);
  }, [brandQuery.isLoading, brandQuery.data]);

  // Détermine la vue actuelle
  const view = useMemo<View>(() => {
    if (modeLoading || brandQuery.isLoading) return "loading";
    if (resolvedMode === "needs-selection") return "select-mode";
    if (forceQuestionnaire) return "questionnaire";
    // Si questionnaire incomplet → questionnaire (sauf si on revient d'un edit)
    if (resolvedMode && !isQuestionnaireComplete(answers, resolvedMode as BrandMode)) {
      // Sauf si l'utilisateur a déjà des profils générés → studio en mode dégradé
      // avec bandeau de relance (cas migration des 57 anciens utilisateurs)
      if (brandQuery.data?.generated_profiles && (brandQuery.data.generated_profiles as any[]).length > 0) {
        return "studio";
      }
      return "questionnaire";
    }
    return "studio";
  }, [modeLoading, brandQuery.isLoading, resolvedMode, answers, brandQuery.data, forceQuestionnaire]);

  const handleSelectMode = (m: BrandMode) => setMode(m);

  const handleAnswerChange = (id: string, value: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const handleFinishQuestionnaire = async () => {
    if (!resolvedMode || resolvedMode === "needs-selection") return;
    try {
      await saveMutation.mutateAsync({ answers, mode: resolvedMode as BrandMode });
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur de sauvegarde");
      return;
    }
    // Si pas encore de profils générés → on lance la génération
    const existingProfiles = brandQuery.data?.generated_profiles;
    if (!existingProfiles || (existingProfiles as any[]).length === 0) {
      try {
        await generateProfilesMutation.mutateAsync({
          answers,
          mode: resolvedMode as BrandMode,
        });
        toast.success("Tes 10 profils Instagram sont prêts ✦");
      } catch {
        toast.error("Génération IA échouée. Tu peux réessayer depuis l'étape 1.");
      }
    } else {
      toast.success("Tes réponses ont été mises à jour ✦");
    }
    setForceQuestionnaire(false);
  };

  const handleRegenerateProfiles = async () => {
    if (!resolvedMode || resolvedMode === "needs-selection") return;
    try {
      await generateProfilesMutation.mutateAsync({
        answers,
        mode: resolvedMode as BrandMode,
      });
      toast.success("10 nouveaux profils générés ✦");
    } catch {
      toast.error("Génération échouée, réessaie.");
    }
  };

  const handleConfirmStep1 = async () => {
    try {
      await confirmStep1.mutateAsync();
      toast.success("Étape 1 validée — étape 2 débloquée ✦");
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur");
    }
  };

  const handleConfirmStep2 = async () => {
    try {
      await confirmStep2.mutateAsync();
      toast.success("Étape 2 validée — étape 3 débloquée ✦");
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur");
    }
  };

  const handleGenerateWeek = async (params: {
    weekNum: 1 | 2 | 3 | 4;
    basePrompt: string;
  }) => {
    if (!resolvedMode || resolvedMode === "needs-selection") return;
    try {
      await generateWeekMutation.mutateAsync({
        weekNum: params.weekNum,
        mode: resolvedMode as BrandMode,
        basePrompt: params.basePrompt,
        topicsHistory: (brandQuery.data?.topics_history as string[]) ?? [],
      });
      toast.success(`Semaine ${params.weekNum} générée ✦`);
    } catch (e: any) {
      toast.error(e?.message ?? "Génération échouée");
    }
  };

  const handleConfirmPublished = async (weekRowId: string) => {
    try {
      await confirmWeekMutation.mutateAsync(weekRowId);
      toast.success("Publication confirmée ✦");
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur");
    }
  };

  // ─── RENDERING ───────────────────────────────────────────────────────
  if (view === "loading") {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-4">
        <Skeleton className="h-10 w-1/2 mx-auto" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (view === "select-mode") {
    return <ModeSelector onSelect={handleSelectMode} canSwitchLater={canSwitch} />;
  }

  // À ce stade, resolvedMode est forcément "pass" ou "liberty"
  const mode = resolvedMode as BrandMode;
  const row = brandQuery.data;

  if (view === "questionnaire") {
    const hasExistingProfiles =
      !!(row?.generated_profiles && (row.generated_profiles as any[]).length > 0);
    return (
      <div className="max-w-2xl mx-auto p-4 md:p-6">
        <Questionnaire
          mode={mode}
          answers={answers}
          onChange={handleAnswerChange}
          currentSection={currentSection}
          setCurrentSection={setCurrentSection}
          onFinish={handleFinishQuestionnaire}
          onBackToRecap={hasExistingProfiles ? () => setForceQuestionnaire(false) : undefined}
          finishing={saveMutation.isPending || generateProfilesMutation.isPending}
        />
        {generateProfilesMutation.isPending && <GeneratingOverlay />}
      </div>
    );
  }

  // view === "studio"
  const profiles = (row?.generated_profiles as any[]) ?? [];
  const step1Confirmed = !!row?.step1_confirmed_at;
  const step2Confirmed = !!row?.step2_confirmed_at;
  const promptText = useMemo(() => buildFullPrompt(answers, mode), [answers, mode]);
  const weeks = weeksQuery.data ?? [];

  // Détection migration : questionnaire incomplet alors qu'il y a déjà des profils générés
  const isMigrating =
    profiles.length > 0 &&
    !isQuestionnaireComplete(answers, mode);
  const answered = countAnsweredQuestions(answers, mode);
  const total = totalQuestions(mode);

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-1">
        <p className="text-xs tracking-[0.3em] uppercase text-primary">
          Personal Brand · {mode === "liberty" ? "Liberty" : "Pass AL BARAKA"}
        </p>
        <h1 className="font-heading text-3xl text-foreground">Ton Studio</h1>
        <p className="text-sm text-muted-foreground">
          Profils Instagram · Prompt personnalisé · Stratégie 4 semaines
        </p>
      </div>

      {/* Bandeau migration : invite à compléter les nouvelles sections */}
      {isMigrating && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/[0.05] p-4 flex items-start gap-3">
          <div className="h-9 w-9 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
            <Pencil className="h-4 w-4 text-amber-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              On a enrichi ton studio. Complète les sections manquantes pour
              débloquer la génération hebdomadaire.
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {answered}/{total} questions remplies — environ {Math.max(2, total - answered)} min
              pour finir.
            </p>
          </div>
          <Button size="sm" onClick={() => setForceQuestionnaire(true)} className="shrink-0">
            Compléter
          </Button>
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setCurrentSection(0);
            setForceQuestionnaire(true);
          }}
          className="gap-2"
        >
          <Pencil className="h-3.5 w-3.5" /> Modifier mes réponses
        </Button>
        {canSwitch && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMode(mode === "pass" ? "liberty" : "pass")}
            className="gap-2 text-xs"
          >
            <Repeat className="h-3.5 w-3.5" /> Basculer en mode {mode === "pass" ? "Liberty" : "Pass"}
          </Button>
        )}
      </div>

      {/* Étapes */}
      <Step1Profiles
        profiles={profiles}
        confirmedAt={row?.step1_confirmed_at ?? null}
        onRegenerate={handleRegenerateProfiles}
        onConfirm={handleConfirmStep1}
        regenerating={generateProfilesMutation.isPending}
        confirming={confirmStep1.isPending}
      />

      <Step2Prompt
        promptText={promptText}
        unlocked={step1Confirmed}
        confirmedAt={row?.step2_confirmed_at ?? null}
        onConfirm={handleConfirmStep2}
        confirming={confirmStep2.isPending}
      />

      <Step3Weeks
        unlocked={step1Confirmed && step2Confirmed}
        mode={mode}
        weeks={weeks}
        topicsHistory={(row?.topics_history as string[]) ?? []}
        basePromptDefault={promptText}
        onGenerate={handleGenerateWeek}
        onConfirmPublished={handleConfirmPublished}
        generating={generateWeekMutation.isPending}
      />

      {generateProfilesMutation.isPending && <GeneratingOverlay />}
    </div>
  );
}
