import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Flame, ArrowLeft, ArrowRight, Sparkles, RefreshCw, Trash2, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { useUserPass } from "@/hooks/useUserPass";
import { BARAKA_QUESTIONS, LIBERTY_QUESTIONS, type Question } from "./lib/questions";
import { generatePlanning, type Answers, type WeekPlan } from "./lib/generatePlanning";
import { QuestionCard } from "./components/QuestionEditors";
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
        ["coaching_select", "task_select", "custom_tasks", "blocked_slots"].includes(currentQ.type)
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
                Modifie tes réponses pour régénérer un planning adapté.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-3">
              <Button
                onClick={handleRestart}
                variant="outline"
                className="w-full justify-start gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refaire le questionnaire
              </Button>
              <Button
                onClick={handleRegenerateFromAnswers}
                disabled={saveMutation.isPending}
                className="w-full justify-start gap-2"
              >
                <CheckCheck className="h-4 w-4" />
                Régénérer depuis mes réponses actuelles
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
