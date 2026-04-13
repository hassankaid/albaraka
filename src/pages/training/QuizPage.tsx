import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuizWithQuestions, useCreateQuizAttempt } from "@/hooks/useQuizzes";
import { autoCompleteParcoursFormationChapter } from "@/lib/parcoursAutoComplete";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Loader2, CheckCircle2, XCircle, RotateCcw, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type AnswerRecord = { question_id: string; selected: number; correct: boolean };

export default function QuizPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: quiz, isLoading } = useQuizWithQuestions(id ?? null);
  const createAttempt = useCreateQuizAttempt();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [finished, setFinished] = useState(false);

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!quiz || !quiz.questions?.length) {
    return (
      <div className="text-center py-24 space-y-4">
        <p className="text-lg text-muted-foreground">Quiz introuvable ou vide.</p>
        <Button onClick={() => navigate(-1)}><ArrowLeft className="mr-2 h-4 w-4" />Retour</Button>
      </div>
    );
  }

  const questions = quiz.questions;
  const currentQuestion = questions[currentIdx];
  const errorsCount = answers.filter((a) => !a.correct).length;
  const maxErrors = quiz.max_errors;
  const progress = ((currentIdx + (finished ? 1 : 0)) / questions.length) * 100;

  const handleSelect = (optionIdx: number) => {
    if (showExplanation) return;
    setSelectedOption(optionIdx);
  };

  const handleValidate = () => {
    if (selectedOption === null) return;
    const correct = selectedOption === currentQuestion.correct_index;
    setAnswers([...answers, { question_id: currentQuestion.id, selected: selectedOption, correct }]);
    setShowExplanation(true);
  };

  const handleNext = async () => {
    setShowExplanation(false);
    setSelectedOption(null);

    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      // Quiz done — save attempt
      const finalAnswers = answers;
      const finalErrors = finalAnswers.filter((a) => !a.correct).length;
      const validated = finalErrors <= maxErrors;

      try {
        await createAttempt.mutateAsync({
          quiz_id: quiz.id,
          errors_count: finalErrors,
          total_questions: questions.length,
          answers: finalAnswers,
          validated,
        });

        // Si quiz de validation finale validé → débloquer le chapitre parcours correspondant
        if (validated && (quiz as any).formation_id && user?.id) {
          try {
            const res = await autoCompleteParcoursFormationChapter(
              user.id,
              (quiz as any).formation_id
            );
            if (res.completed > 0) {
              queryClient.invalidateQueries({ queryKey: ["parcours-progress"] });
              toast.success("Étape du parcours débloquée 🎉");
            }
          } catch {
            // silencieux : l'utilisateur a validé son quiz, c'est le principal
          }
        }
      } catch (err: any) {
        toast.error("Erreur : " + (err.message || "sauvegarde impossible"));
      }
      setFinished(true);
    }
  };

  const handleRestart = () => {
    setCurrentIdx(0);
    setAnswers([]);
    setSelectedOption(null);
    setShowExplanation(false);
    setFinished(false);
  };

  // ─── Finished screen ───
  if (finished) {
    const finalErrors = answers.filter((a) => !a.correct).length;
    const validated = finalErrors <= maxErrors;

    return (
      <div className="max-w-2xl mx-auto py-12 space-y-6">
        <Card className={cn(validated ? "border-emerald-500/50 bg-emerald-500/5" : "border-amber-500/50 bg-amber-500/5")}>
          <CardContent className="p-8 text-center space-y-4">
            <div className="text-6xl">{validated ? "🏆" : "🔄"}</div>
            <div>
              <h2 className="text-2xl font-bold font-heading">
                {validated ? "Quiz validé !" : "À refaire"}
              </h2>
              <p className="text-muted-foreground mt-2">
                {finalErrors} erreur{finalErrors !== 1 ? "s" : ""} sur {questions.length} question{questions.length !== 1 ? "s" : ""}
              </p>
              {validated ? (
                <p className="text-emerald-600 dark:text-emerald-400 mt-3 text-sm">
                  ✅ Maximum {maxErrors} erreurs autorisées. Bien joué !
                </p>
              ) : (
                <p className="text-amber-600 dark:text-amber-400 mt-3 text-sm">
                  Maximum {maxErrors} erreurs autorisées. Retente pour valider.
                </p>
              )}
            </div>
            <div className="flex gap-3 justify-center pt-4">
              <Button variant="outline" onClick={() => navigate(-1)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour
              </Button>
              <Button onClick={handleRestart}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Recommencer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Quiz en cours ───
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Quitter
        </Button>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">
            Question {currentIdx + 1}/{questions.length}
          </span>
          <Badge variant={errorsCount > maxErrors ? "destructive" : "outline"} className="gap-1">
            <XCircle className="h-3 w-3" />
            {errorsCount}/{maxErrors} erreurs max
          </Badge>
        </div>
      </div>

      <Progress value={progress} className="h-2" />

      <div>
        <h1 className="text-xl font-bold font-heading">{quiz.titre}</h1>
        {quiz.description && <p className="text-sm text-muted-foreground mt-1">{quiz.description}</p>}
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          {currentQuestion.contexte && (
            <Badge variant="secondary" className="text-xs">
              {currentQuestion.contexte}
            </Badge>
          )}
          <h2 className="text-lg font-semibold leading-relaxed">{currentQuestion.question}</h2>

          <div className="space-y-2">
            {currentQuestion.options.map((opt, idx) => {
              const isSelected = selectedOption === idx;
              const isCorrect = idx === currentQuestion.correct_index;
              const showCorrectness = showExplanation;

              return (
                <button
                  key={idx}
                  onClick={() => handleSelect(idx)}
                  disabled={showExplanation}
                  className={cn(
                    "w-full text-left p-4 rounded-lg border-2 transition-all",
                    !showCorrectness && isSelected && "border-primary bg-primary/5",
                    !showCorrectness && !isSelected && "border-border hover:border-primary/50 hover:bg-muted/50",
                    showCorrectness && isCorrect && "border-emerald-500 bg-emerald-500/10",
                    showCorrectness && isSelected && !isCorrect && "border-red-500 bg-red-500/10",
                    showCorrectness && !isSelected && !isCorrect && "border-border opacity-50",
                    !showCorrectness && "cursor-pointer"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className="font-mono text-sm font-semibold shrink-0 w-6">
                      {String.fromCharCode(65 + idx)}.
                    </span>
                    <span className="flex-1 text-sm">{opt}</span>
                    {showCorrectness && isCorrect && <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />}
                    {showCorrectness && isSelected && !isCorrect && <XCircle className="h-5 w-5 text-red-600 shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>

          {showExplanation && currentQuestion.explication && (
            <Card className="bg-blue-500/5 border-blue-500/30">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">
                  💡 Explication
                </p>
                <p className="text-sm leading-relaxed">{currentQuestion.explication}</p>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end pt-2">
            {!showExplanation ? (
              <Button onClick={handleValidate} disabled={selectedOption === null}>
                Valider
              </Button>
            ) : (
              <Button onClick={handleNext} disabled={createAttempt.isPending}>
                {createAttempt.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {currentIdx < questions.length - 1 ? "Question suivante" : "Voir les résultats"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
