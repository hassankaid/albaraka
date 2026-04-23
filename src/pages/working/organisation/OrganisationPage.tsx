import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Flame, ArrowLeft, ArrowRight, Sparkles, RefreshCw, Trash2, CheckCheck, CalendarCog } from "lucide-react";
import { toast } from "sonner";
import { useUserPass } from "@/hooks/useUserPass";
import { BARAKA_QUESTIONS, LIBERTY_QUESTIONS, type Question } from "./lib/questions";
import { generatePlanning, type Answers, type DayOverrides, type WeekPlan } from "./lib/generatePlanning";
import { QuestionCard } from "./components/QuestionEditors";
import { DayOverridesEditor } from "./components/DayOverridesEditor";
import { WeeklyAgenda } from "./components/WeeklyAgenda";
import {
  useCoachingSlots,
  useOrganisationProfile,
  useLatestOrganisationPlan,
  useSaveOrganisation,
} from "./hooks/useOrganisationPlan";

type Step = "loading" | "commitment" | "questionnaire" | "planning";

export default function OrganisationPage() {
  const { passLevel } = useUserPass();
  const pack: "al_baraka" | "liberty" = passLevel === "liberty" ? "liberty" : "al_baraka";
  const questions = pack === "liberty" ? LIBERTY_QUESTIONS : BARAKA_QUESTIONS;

  const profileQuery = useOrganisationProfile();
  const planQuery = useLatestOrganisationPlan();
  const coachingsQuery = useCoachingSlots();
  const saveMutation = useSaveOrganisation();

  const [step, setStep] = useState<Step>("loading");
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [plan, setPlan] = useState<WeekPlan | null>(null);
  const [version, setVersion] = useState(1);
  const [showRefinement, setShowRefinement] = useState(false);
  const [showDayEditor, setShowDayEditor] = useState(false);
  /** Buffer local des overrides pendant l'édition, pour ne pas
   *  écraser les réponses tant que l'élève n'a pas validé. */
  const [draftOverrides, setDraftOverrides] = useState<DayOverrides | undefined>(undefined);

  // Initialisation à partir du state BDD
  useEffect(() => {
    if (profileQuery.isLoading || planQuery.isLoading) return;
    if (planQuery.data && profileQuery.data?.committed_at) {
      setAnswers((profileQuery.data.answers as Answers) ?? {});
      setPlan(planQuery.data.plan as WeekPlan);
      setVersion(planQuery.data.version ?? 1);
      setStep("planning");
    } else if (profileQuery.data) {
      setAnswers((profileQuery.data.answers as Answers) ?? {});
      setStep("commitment");
    } else {
      setStep("commitment");
    }
  }, [profileQuery.isLoading, planQuery.isLoading, profileQuery.data, planQuery.data]);

  const visibleQuestions = useMemo(
    () => questions.filter((q) => !q.condition || q.condition(answers)),
    [questions, answers]
  );
  const currentQ: Question | undefined = visibleQuestions[qIndex];

  const handleAnswer = (val: any) => {
    if (!currentQ) return;
    setAnswers((prev) => ({ ...prev, [currentQ.id]: val }));
  };

  const handleGenerate = async () => {
    try {
      const coachings = coachingsQuery.data ?? [];
      const newPlan = generatePlanning(answers, pack, coachings);
      const selectedIds = (answers.coachings ?? []) as string[];
      await saveMutation.mutateAsync({
        answers,
        plan: newPlan,
        selectedRecurrenceIds: selectedIds,
        commit: true,
      });
      setPlan(newPlan);
      setVersion((v) => v + 1);
      setStep("planning");
      toast.success("Planning généré 🌙");
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur de génération");
    }
  };

  const handleRegenerateFromAnswers = async () => {
    try {
      const coachings = coachingsQuery.data ?? [];
      const newPlan = generatePlanning(answers, pack, coachings);
      const selectedIds = (answers.coachings ?? []) as string[];
      await saveMutation.mutateAsync({
        answers,
        plan: newPlan,
        selectedRecurrenceIds: selectedIds,
      });
      setPlan(newPlan);
      setVersion((v) => v + 1);
      setShowRefinement(false);
      toast.success("Planning régénéré");
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur");
    }
  };

  const handleRestart = () => {
    setStep("questionnaire");
    setQIndex(0);
    setShowRefinement(false);
  };

  const handleOpenDayEditor = () => {
    setDraftOverrides(answers.day_overrides);
    setShowRefinement(false);
    setShowDayEditor(true);
  };

  const handleApplyDayEditor = async () => {
    try {
      const newAnswers: Answers = { ...answers, day_overrides: draftOverrides };
      const coachings = coachingsQuery.data ?? [];
      const newPlan = generatePlanning(newAnswers, pack, coachings);
      const selectedIds = (newAnswers.coachings ?? []) as string[];
      await saveMutation.mutateAsync({
        answers: newAnswers,
        plan: newPlan,
        selectedRecurrenceIds: selectedIds,
      });
      setAnswers(newAnswers);
      setPlan(newPlan);
      setVersion((v) => v + 1);
      setShowDayEditor(false);
      const count = Object.keys(draftOverrides || {}).length;
      toast.success(
        count > 0
          ? `Planning mis à jour · ${count} ${count > 1 ? "jours personnalisés" : "jour personnalisé"}`
          : "Planning mis à jour"
      );
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur");
    }
  };

  // ─────────── LOADING ───────────
  if (step === "loading" || coachingsQuery.isLoading) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  // ─────────── COMMITMENT ───────────
  if (step === "commitment") {
    return <CommitmentScreen onCommit={() => { setStep("questionnaire"); setQIndex(0); }} pack={pack} />;
  }

  // ─────────── QUESTIONNAIRE ───────────
  if (step === "questionnaire") {
    const isLast = qIndex >= visibleQuestions.length - 1;
    const canNext = currentQ
      ? answers[currentQ.id] !== undefined && answers[currentQ.id] !== "" ||
        ["coaching_select", "task_select", "custom_tasks", "blocked_slots", "day_overrides"].includes(currentQ.type)
      : false;

    return (
      <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-baseline justify-between">
          <Badge variant="outline" className="tracking-widest">
            {pack === "liberty" ? "Pack Liberty" : "Pass Al-Baraka"}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Question {qIndex + 1} / {visibleQuestions.length}
          </span>
        </div>
        <Progress value={((qIndex + 1) / visibleQuestions.length) * 100} className="h-1.5" />

        <Card>
          <CardContent className="p-6">
            {currentQ && (
              <QuestionCard
                question={currentQ}
                value={answers[currentQ.id]}
                onChange={handleAnswer}
                coachings={coachingsQuery.data ?? []}
                answers={answers}
              />
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between items-center">
          <Button
            variant="ghost"
            onClick={() => setQIndex(Math.max(0, qIndex - 1))}
            disabled={qIndex === 0}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Précédent
          </Button>
          {!isLast ? (
            <Button
              onClick={() => setQIndex(qIndex + 1)}
              disabled={!canNext}
              className="gap-2"
            >
              Suivant
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleGenerate}
              disabled={!canNext || saveMutation.isPending}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {saveMutation.isPending ? "Génération..." : "Générer mon planning"}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ─────────── PLANNING ───────────
  if (step === "planning" && plan) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <WeeklyAgenda
          plan={plan}
          version={version}
          onOpenRefinement={() => setShowRefinement(true)}
        />

        <Sheet open={showRefinement} onOpenChange={setShowRefinement}>
          <SheetContent className="overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Ajuster ton planning</SheetTitle>
              <SheetDescription>
                Modifie tes réponses ou tes horaires pour régénérer un planning adapté.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-3">
              {/* Action prioritaire — nouveau raccourci vers les exceptions par jour */}
              <Button
                onClick={handleOpenDayEditor}
                className="w-full justify-start gap-2"
              >
                <CalendarCog className="h-4 w-4" />
                Personnaliser mes horaires par jour
              </Button>
              <div className="text-[11px] text-muted-foreground px-1 -mt-1">
                Parfait pour ajouter une exception (shift, sport, jour férié…) sans refaire tout le questionnaire.
              </div>

              <div className="border-t border-border/60 my-4" />

              <Button
                onClick={handleRegenerateFromAnswers}
                disabled={saveMutation.isPending}
                variant="outline"
                className="w-full justify-start gap-2"
              >
                <CheckCheck className="h-4 w-4" />
                Régénérer depuis mes réponses actuelles
              </Button>
              <Button
                onClick={handleRestart}
                variant="ghost"
                className="w-full justify-start gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refaire le questionnaire entier
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Éditeur dédié aux horaires par jour */}
        <Sheet open={showDayEditor} onOpenChange={setShowDayEditor}>
          <SheetContent
            side="right"
            className="overflow-y-auto sm:max-w-lg w-full"
          >
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <CalendarCog className="h-5 w-5 text-primary" />
                Horaires par jour
              </SheetTitle>
              <SheetDescription>
                Ajoute des exceptions aux horaires que tu as renseignés dans le questionnaire.
                Les jours non modifiés garderont tes horaires habituels.
              </SheetDescription>
            </SheetHeader>

            <div className="mt-5">
              <DayOverridesEditor
                value={draftOverrides}
                onChange={setDraftOverrides}
                answers={answers}
                mode={
                  answers.profile === "Étudiant(e)"
                    ? "study"
                    : answers.profile === "Salarié(e)" ||
                      (answers.has_job && answers.has_job !== "Non")
                    ? "work"
                    : "none"
                }
              />
            </div>

            {/* Actions collées en bas avec sécurité */}
            <div className="sticky bottom-0 left-0 right-0 -mx-6 px-6 pt-4 pb-4 mt-6 bg-background border-t flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDayEditor(false)}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                onClick={handleApplyDayEditor}
                disabled={saveMutation.isPending}
                className="flex-1 gap-2"
              >
                <Sparkles className="h-4 w-4" />
                {saveMutation.isPending ? "…" : "Enregistrer et régénérer"}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  return null;
}

function CommitmentScreen({
  onCommit, pack,
}: { onCommit: () => void; pack: "al_baraka" | "liberty" }) {
  return (
    <div className="max-w-2xl mx-auto py-16 px-4">
      <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-card">
        <CardContent className="p-10 text-center space-y-6">
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-amber-500/15">
              <Flame className="h-10 w-10 text-amber-500" />
            </div>
          </div>
          <h1 className="font-heading text-3xl text-foreground">Avant de commencer...</h1>
          <p className="text-muted-foreground">
            Ton planning ne fonctionne que si{" "}
            <span className="text-foreground font-semibold">tu t'y tiens.</span>
          </p>
          <div className="text-left space-y-2.5 py-4">
            {[
              "Passer à l'action chaque jour, même sans motivation",
              "Être rigoureux dans chaque tâche",
              "Respecter les créneaux définis",
              "La régularité prime sur l'intensité d'un jour",
            ].map((t) => (
              <div key={t} className="flex gap-3">
                <span className="text-primary">✦</span>
                <span className="text-sm text-muted-foreground">{t}</span>
              </div>
            ))}
          </div>
          <p className="text-sm">
            <span className="text-foreground font-semibold">
              C'est toi qui fais la différence.
            </span>
          </p>
          <Button size="lg" onClick={onCommit} className="gap-2">
            ✊ Je m'y engage
          </Button>
          <p className="text-[11px] text-muted-foreground">
            {pack === "liberty" ? "Pack Liberty" : "Pass Al-Baraka"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
