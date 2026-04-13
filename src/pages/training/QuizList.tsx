import { useNavigate } from "react-router-dom";
import { useTrainingQuizzes, useLatestQuizAttempt } from "@/hooks/useQuizzes";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Trophy, PlayCircle, RotateCcw, ListChecks, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

function QuizCard({ quiz }: { quiz: any }) {
  const navigate = useNavigate();
  const { data: lastAttempt } = useLatestQuizAttempt(quiz.id);

  const validated = lastAttempt?.validated;
  const hasAttempted = !!lastAttempt;

  return (
    <Card className={cn(
      "cursor-pointer transition-colors hover:border-primary/50",
      validated && "border-emerald-500/50 bg-emerald-500/5"
    )} onClick={() => navigate(`/training/quiz/${quiz.id}`)}>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">{quiz.titre}</h3>
            {quiz.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{quiz.description}</p>
            )}
          </div>
          {validated && <span className="text-2xl">🏆</span>}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {typeof (quiz as any).question_count === "number" && (quiz as any).question_count > 0 && (
            <Badge variant="secondary" className="text-xs gap-1">
              <ListChecks className="h-3 w-3" />
              {(quiz as any).question_count} questions
            </Badge>
          )}
          <Badge variant="outline" className="text-xs gap-1">
            <AlertCircle className="h-3 w-3" />
            Max {quiz.max_errors} erreur{quiz.max_errors !== 1 ? "s" : ""}
          </Badge>
          {hasAttempted && (
            <Badge variant={validated ? "default" : "secondary"} className={cn("text-xs", validated && "bg-emerald-600 hover:bg-emerald-700")}>
              {validated ? "✅ Validé" : `${lastAttempt.errors_count} erreurs`}
            </Badge>
          )}
        </div>
        <Button
          variant={validated ? "outline" : "default"}
          size="sm"
          className="w-full gap-2"
        >
          {validated ? <><RotateCcw className="h-4 w-4" />Refaire</> : hasAttempted ? <><RotateCcw className="h-4 w-4" />Recommencer</> : <><PlayCircle className="h-4 w-4" />Commencer</>}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function QuizList() {
  const { data: quizzes, isLoading } = useTrainingQuizzes();

  const publishedQuizzes = quizzes || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading">🎯 Quiz d'entraînement</h1>
        <p className="text-muted-foreground">
          Teste tes connaissances à ton rythme. Les quiz de validation des formations
          se trouvent directement dans chaque formation.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !publishedQuizzes.length ? (
        <Card>
          <CardContent className="py-24 text-center">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">Aucun quiz disponible pour le moment.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {publishedQuizzes.map((quiz) => (
            <QuizCard key={quiz.id} quiz={quiz} />
          ))}
        </div>
      )}
    </div>
  );
}
