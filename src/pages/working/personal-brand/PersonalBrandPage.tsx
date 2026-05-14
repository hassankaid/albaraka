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
  useStartNewCycle,
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
  const { mode: resolvedMode, isLoading: modeLoading, setMode, canSwitch } = useBrandMode();

  // Mode "sûr" pour les hooks/calculs : tant que le mode n'est pas résolu
  // (chargement ou écran de sélection) on retombe sur "pass" — ces valeurs
  // ne sont pas utilisées tant que la vue n'est pas "questionnaire"/"studio".
  const safeMode: BrandMode =
    resolvedMode === "pass" || resolvedMode === "liberty" ? resolvedMode : "pass";
  // La query user_personal_brand ne se déclenche que sur un vrai mode résolu.
  const brandModeForQuery: BrandMode | null =
    resolvedMode === "pass" || resolvedMode === "liberty" ? resolvedMode : null;

  const brandQuery = usePersonalBrand(brandModeForQuery);
  const saveMutation = useSaveBrand();
  const generateProfilesMutation = useGenerateProfiles();
  const confirmStep1 = useConfirmStep(1, safeMode);
  const confirmStep2 = useConfirmStep(2, safeMode);
  const generateWeekMutation = useGenerateWeek();
  const confirmWeekMutation = useConfirmWeekPublished();
  const startNewCycleMutation = useStartNewCycle(safeMode);

  const [answers, setAnswers] = useState<BrandAnswers>({});
  const [currentSection, setCurrentSection] = useState(0);
  const [forceQuestionnaire, setForceQuestionnaire] = useState(false);

  // Récupère les semaines du cycle en cours uniquement
  const currentCycleId = brandQuery.data?.current_cycle_id ?? null;
  const weeksQuery = useBrandWeeks(currentCycleId);

  // Init des réponses depuis la BDD. Chaque mode a sa propre ligne : au
  // changement de mode on réinitialise (réponses vides si le mode n'a pas
  // encore d'espace créé).
  useEffect(() => {
    if (brandQuery.isLoading) return;
    setAnswers((brandQuery.data?.answers as BrandAnswers) ?? {});
  }, [brandQuery.isLoading, brandQuery.data]);

  // Au changement de mode (bascule Pass ⇄ Liberty), on repart d'une UI propre.
  useEffect(() => {
    setForceQuestionnaire(false);
    setCurrentSection(0);
  }, [resolvedMode]);

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

  // promptText : le brief complet dérivé des réponses (recalculé à la volée).
  const promptText = useMemo(
    () => buildFullPrompt(answers, safeMode),
    [answers, safeMode],
  );

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
        currentCycleId: brandQuery.data?.current_cycle_id ?? null,
        currentCycleStartedAt: brandQuery.data?.current_cycle_started_at ?? null,
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
      <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-4">
        {/* Barre d'espace : permet de basculer Pass ⇄ Liberty depuis le
            questionnaire. Sans ça, choisir un mode encore vide laissait
            l'utilisateur bloqué dans le questionnaire, sans porte de sortie. */}
        {canSwitch && (
          <div className="flex items-center justify-between flex-wrap gap-2 rounded-lg border border-border bg-card/50 px-3 py-2">
            <span className="text-xs text-muted-foreground">
              Espace :{" "}
              <span className="font-medium text-foreground">
                {mode === "liberty" ? "Liberty" : "Pass AL BARAKA"}
              </span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMode(mode === "pass" ? "liberty" : "pass")}
              className="gap-2 text-xs"
            >
              <Repeat className="h-3.5 w-3.5" />
              Basculer en mode {mode === "pass" ? "Liberty" : "AL BARAKA"}
            </Button>
          </div>
        )}
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
  const weeks = weeksQuery.data ?? [];

  // ── Confirmations par cycle de 4 semaines glissant ──────────────────
  // Au lieu d'un mois calendaire strict, on raisonne en CYCLES. Un cycle
  // démarre quand l'élève (re-)confirme étapes 1+2 puis génère sa S1
  // (= current_cycle_id et current_cycle_started_at créés à ce moment).
  // Il se termine quand la S4 est publiée.
  //
  // Une étape est "validée pour le cycle en cours" si la confirmation a
  // eu lieu APRÈS le début du cycle (current_cycle_started_at). Sinon :
  // - Pas de cycle en cours du tout → première fois OU cycle précédent
  //   terminé → checkboxes affichées normalement
  // - Cycle en cours + confirmation antérieure au cycle → checkbox affichée
  //   en mode "re-confirme pour ce nouveau cycle"
  const cycleStartedAt = row?.current_cycle_started_at ?? null;
  const isAfterCycleStart = (ts: string | null | undefined): boolean => {
    if (!ts) return false;
    if (!cycleStartedAt) return !!ts; // pas de cycle = on prend la dernière confirmation
    return new Date(ts).getTime() >= new Date(cycleStartedAt).getTime();
  };
  const step1Confirmed = isAfterCycleStart(row?.step1_confirmed_at);
  const step2Confirmed = isAfterCycleStart(row?.step2_confirmed_at);

  // "Nouveau cycle à démarrer" : le précédent cycle est terminé (4 semaines
  // toutes publiées) → on doit re-confirmer 1+2 pour démarrer le suivant.
  const allFourPublished =
    weeks.length === 4 && weeks.every((w) => !!w.published_at);
  const cycleCompleted = !!cycleStartedAt && allFourPublished;

  // Est-ce qu'on doit afficher le bandeau "Nouveau cycle, re-confirme" ?
  // Oui si : le cycle est terminé, ou bien step1/step2 sont en attente
  // de re-confirmation pour ce cycle alors que l'élève en a déjà confirmé
  // un par le passé.
  const isNewCycleForStep1 = !step1Confirmed && !!row?.step1_confirmed_at;
  const isNewCycleForStep2 = !step2Confirmed && !!row?.step2_confirmed_at;

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

      {/* Bandeau cycle terminé : invite à démarrer un nouveau cycle de 4 semaines */}
      {!isMigrating && cycleCompleted && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/[0.05] p-4 flex items-start gap-3">
          <div className="h-9 w-9 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
            <Repeat className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              🎉 Cycle de 4 semaines terminé — bravo !
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Démarre ton prochain cycle quand tu es prêt(e). Tu devras
              re-confirmer rapidement ton profil et ton prompt avant la
              nouvelle Semaine 1.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => startNewCycleMutation.mutate()}
            disabled={startNewCycleMutation.isPending}
            className="shrink-0 gap-2"
          >
            {startNewCycleMutation.isPending && (
              <span className="h-3 w-3 animate-spin border-2 border-current border-t-transparent rounded-full" />
            )}
            Démarrer un nouveau cycle
          </Button>
        </div>
      )}

      {/* Bandeau nouveau cycle : invite à re-confirmer étapes 1 et 2 */}
      {!isMigrating && !cycleCompleted && (isNewCycleForStep1 || isNewCycleForStep2) && (
        <div className="rounded-lg border border-primary/30 bg-primary/[0.05] p-4 flex items-start gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <Repeat className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              Nouveau cycle — re-confirme rapidement avant de générer ta
              Semaine 1.
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Profil Instagram toujours configuré ? Prompt toujours d'actualité ?
              Coche pour ce cycle (30 secondes).
            </p>
          </div>
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
            <Repeat className="h-3.5 w-3.5" /> Basculer en mode {mode === "pass" ? "Liberty" : "AL BARAKA"}
          </Button>
        )}
      </div>

      {/* Étapes */}
      <Step1Profiles
        profiles={profiles}
        confirmedForCurrentCycle={step1Confirmed}
        isNewCycle={isNewCycleForStep1}
        onRegenerate={handleRegenerateProfiles}
        onConfirm={handleConfirmStep1}
        regenerating={generateProfilesMutation.isPending}
        confirming={confirmStep1.isPending}
      />

      <Step2Prompt
        promptText={promptText}
        unlocked={step1Confirmed}
        confirmedForCurrentCycle={step2Confirmed}
        isNewCycle={isNewCycleForStep2}
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
