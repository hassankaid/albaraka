import React, { useState, useEffect, useRef } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  useQuizzes,
  useQuizWithQuestions,
  useCreateQuiz,
  useUpdateQuiz,
  useDeleteQuiz,
  useCreateQuestion,
  useUpdateQuestion,
  useDeleteQuestion,
} from "@/hooks/useQuizzes";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, X, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Auto-resize Textarea ───

function AutoTextarea({ value, onChange, placeholder, className }: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0";
    el.style.height = el.scrollHeight + "px";
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onInput={() => { const el = ref.current; if (el) { el.style.height = "0"; el.style.height = el.scrollHeight + "px"; } }}
      placeholder={placeholder}
      rows={1}
      className={cn(
        "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none overflow-hidden min-h-[38px]",
        className
      )}
    />
  );
}

// ─── Quiz Dialog ───

function QuizDialog({ open, onOpenChange, initial }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: any;
}) {
  const create = useCreateQuiz();
  const update = useUpdateQuiz();

  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [maxErrors, setMaxErrors] = useState(3);

  useEffect(() => {
    if (!open) return;
    setTitre(initial?.titre ?? "");
    setDescription(initial?.description ?? "");
    setMaxErrors(initial?.max_errors ?? 3);
  }, [open, initial]);

  const saving = create.isPending || update.isPending;

  const handleSave = async () => {
    if (!titre.trim()) {
      toast.error("Le titre est requis.");
      return;
    }
    try {
      if (initial) {
        await update.mutateAsync({ id: initial.id, titre: titre.trim(), description: description.trim(), max_errors: maxErrors });
        toast.success("Quiz mis à jour.");
      } else {
        await create.mutateAsync({ titre: titre.trim(), description: description.trim(), max_errors: maxErrors });
        toast.success("Quiz créé.");
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Erreur.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading">
            {initial ? "Modifier le quiz" : "Nouveau quiz"}
          </DialogTitle>
          <DialogDescription>
            Un quiz contient une série de questions. L'élève valide le quiz s'il fait au maximum {maxErrors} erreur{maxErrors !== 1 ? "s" : ""}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Titre</Label>
            <Input value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Quiz Setting DM" />
          </div>
          <div className="space-y-1.5">
            <Label>Description (optionnel)</Label>
            <AutoTextarea value={description} onChange={setDescription} placeholder="Objectif et contenu du quiz..." />
          </div>
          <div className="space-y-1.5">
            <Label>Max erreurs pour valider</Label>
            <Input type="number" min="0" max="100" value={maxErrors} onChange={(e) => setMaxErrors(parseInt(e.target.value) || 0)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {initial ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Question Dialog ───

function QuestionDialog({ open, onOpenChange, quizId, initial }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  quizId: string;
  initial?: any;
}) {
  const create = useCreateQuestion();
  const update = useUpdateQuestion();

  const [question, setQuestion] = useState("");
  const [contexte, setContexte] = useState("");
  const [options, setOptions] = useState<string[]>(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [explication, setExplication] = useState("");

  useEffect(() => {
    if (!open) return;
    setQuestion(initial?.question ?? "");
    setContexte(initial?.contexte ?? "");
    setOptions(initial?.options ?? ["", "", "", ""]);
    setCorrectIndex(initial?.correct_index ?? 0);
    setExplication(initial?.explication ?? "");
  }, [open, initial]);

  const saving = create.isPending || update.isPending;

  const handleSave = async () => {
    if (!question.trim()) {
      toast.error("La question est requise.");
      return;
    }
    const filledOptions = options.filter((o) => o.trim());
    if (filledOptions.length < 2) {
      toast.error("Au moins 2 options requises.");
      return;
    }
    if (correctIndex >= filledOptions.length) {
      toast.error("L'option correcte doit exister.");
      return;
    }
    try {
      if (initial) {
        await update.mutateAsync({
          id: initial.id,
          quiz_id: quizId,
          question: question.trim(),
          contexte: contexte.trim(),
          options: filledOptions,
          correct_index: correctIndex,
          explication: explication.trim(),
        });
        toast.success("Question mise à jour.");
      } else {
        await create.mutateAsync({
          quiz_id: quizId,
          question: question.trim(),
          contexte: contexte.trim(),
          options: filledOptions,
          correct_index: correctIndex,
          explication: explication.trim(),
        });
        toast.success("Question créée.");
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Erreur.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="font-heading">
            {initial ? "Modifier la question" : "Nouvelle question"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Contexte (optionnel)</Label>
              <Input value={contexte} onChange={(e) => setContexte(e.target.value)} placeholder="Phase : Relance" />
            </div>
            <div className="space-y-1.5">
              <Label>Question</Label>
              <AutoTextarea value={question} onChange={setQuestion} placeholder="Quelle est la question ?" />
            </div>
            <div className="space-y-2">
              <Label>Options (coche la bonne réponse)</Label>
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCorrectIndex(idx)}
                    className={cn(
                      "shrink-0 h-9 w-9 rounded-md border-2 flex items-center justify-center transition-colors",
                      correctIndex === idx
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-600"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    {correctIndex === idx ? <CheckCircle2 className="h-4 w-4" /> : <span className="text-xs font-mono">{String.fromCharCode(65 + idx)}</span>}
                  </button>
                  <AutoTextarea
                    value={opt}
                    onChange={(v) => setOptions(options.map((o, i) => i === idx ? v : o))}
                    placeholder={`Option ${String.fromCharCode(65 + idx)}...`}
                    className="flex-1"
                  />
                  {options.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-destructive h-9 w-9"
                      onClick={() => {
                        setOptions(options.filter((_, i) => i !== idx));
                        if (correctIndex >= idx && correctIndex > 0) setCorrectIndex(correctIndex - 1);
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
              {options.length < 6 && (
                <Button type="button" variant="outline" size="sm" onClick={() => setOptions([...options, ""])} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Ajouter une option
                </Button>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Explication (affichée après validation)</Label>
              <AutoTextarea value={explication} onChange={setExplication} placeholder="Pourquoi cette réponse est correcte..." />
            </div>
          </div>
        </div>
        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {initial ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───

export default function AdminQuizList() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { data: quizzes, isLoading } = useQuizzes();

  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [editQuiz, setEditQuiz] = useState<any>(null);
  const [deleteQuizTarget, setDeleteQuizTarget] = useState<any>(null);
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [editQuestion, setEditQuestion] = useState<any>(null);
  const [deleteQuestionTarget, setDeleteQuestionTarget] = useState<any>(null);

  const { data: quizDetail } = useQuizWithQuestions(selectedQuizId);
  const deleteQuiz = useDeleteQuiz();
  const deleteQuestion = useDeleteQuestion();

  if (profile?.role !== "ceo") {
    return <Navigate to="/training" replace />;
  }

  const handleDeleteQuiz = async () => {
    if (!deleteQuizTarget) return;
    try {
      await deleteQuiz.mutateAsync(deleteQuizTarget.id);
      toast.success("Quiz supprimé.");
      if (selectedQuizId === deleteQuizTarget.id) setSelectedQuizId(null);
    } catch {
      toast.error("Erreur lors de la suppression.");
    }
    setDeleteQuizTarget(null);
  };

  const handleDeleteQuestion = async () => {
    if (!deleteQuestionTarget || !selectedQuizId) return;
    try {
      await deleteQuestion.mutateAsync({ id: deleteQuestionTarget.id, quiz_id: selectedQuizId });
      toast.success("Question supprimée.");
    } catch {
      toast.error("Erreur lors de la suppression.");
    }
    setDeleteQuestionTarget(null);
  };

  if (isLoading) {
    return <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading">Gestion des Quiz</h1>
          <p className="text-muted-foreground">Crée et gère les quiz de validation des formations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/training/quiz")} className="gap-2">
            Voir côté élève
          </Button>
          <Button onClick={() => { setEditQuiz(null); setQuizDialogOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" />
            Nouveau quiz
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Liste quizzes */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Quiz ({quizzes?.length || 0})
          </p>
          {quizzes?.length ? (
            quizzes.map((q) => (
              <Card
                key={q.id}
                className={cn(
                  "cursor-pointer transition-colors group",
                  selectedQuizId === q.id ? "border-primary bg-primary/5" : "hover:border-primary/30"
                )}
                onClick={() => setSelectedQuizId(q.id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{q.titre}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant="outline" className="text-[10px]">Max {q.max_errors} err</Badge>
                        <Badge variant="secondary" className="text-[10px]">{q.status}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); setEditQuiz(q); setQuizDialogOpen(true); }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); setDeleteQuizTarget(q); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Aucun quiz. Crée-en un pour commencer.
              </CardContent>
            </Card>
          )}
        </div>

        {/* Détail quiz */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedQuizId || !quizDetail ? (
            <Card>
              <CardContent className="py-24 text-center text-muted-foreground">
                Sélectionne un quiz pour gérer ses questions
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="flex-1">
                    <h2 className="font-bold text-lg font-heading">{quizDetail.titre}</h2>
                    {quizDetail.description && <p className="text-sm text-muted-foreground">{quizDetail.description}</p>}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">{quizDetail.questions?.length || 0} questions</Badge>
                      <Badge variant="outline">Max {quizDetail.max_errors} erreurs</Badge>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => { setEditQuestion(null); setQuestionDialogOpen(true); }} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Question
                  </Button>
                </CardContent>
              </Card>

              {quizDetail.questions?.length ? (
                <div className="space-y-2">
                  {quizDetail.questions.map((q, idx) => (
                    <Card key={q.id} className="group">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0 space-y-2">
                            {q.contexte && <Badge variant="secondary" className="text-xs">{q.contexte}</Badge>}
                            <p className="text-sm font-medium">{q.question}</p>
                            <div className="space-y-1">
                              {q.options.map((opt, i) => (
                                <div key={i} className={cn(
                                  "text-xs pl-3 py-1 rounded",
                                  i === q.correct_index ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"
                                )}>
                                  {i === q.correct_index && "✓ "}
                                  <span className="font-mono">{String.fromCharCode(65 + i)}.</span> {opt}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => { setEditQuestion(q); setQuestionDialogOpen(true); }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteQuestionTarget(q)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground mb-4">Aucune question dans ce quiz.</p>
                    <Button onClick={() => { setEditQuestion(null); setQuestionDialogOpen(true); }} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Ajouter la première question
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <QuizDialog open={quizDialogOpen} onOpenChange={setQuizDialogOpen} initial={editQuiz} />
      {selectedQuizId && (
        <QuestionDialog
          open={questionDialogOpen}
          onOpenChange={setQuestionDialogOpen}
          quizId={selectedQuizId}
          initial={editQuestion}
        />
      )}

      <AlertDialog open={!!deleteQuizTarget} onOpenChange={(open) => !open && setDeleteQuizTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce quiz ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le quiz « {deleteQuizTarget?.titre} » et toutes ses questions seront définitivement supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteQuiz} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteQuestionTarget} onOpenChange={(open) => !open && setDeleteQuestionTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette question ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteQuestion} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
