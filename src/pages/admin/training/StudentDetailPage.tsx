import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  useStudentDetail,
  useAvailableFormationsForUser,
  useGrantEnrollment,
  useRevokeEnrollment,
} from "@/hooks/useStudentTracking";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Loader2,
  Trash2,
  Plus,
  Trophy,
  CheckCircle2,
  RotateCcw,
  ChevronDown,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AdminCertificateActions } from "@/components/training/admin/AdminCertificateActions";

export default function StudentDetailPage() {
  const { profile } = useAuth();
  const { userId } = useParams();
  const navigate = useNavigate();
  const { data: detail, isLoading } = useStudentDetail(userId ?? null);

  const currentFormationIds = detail?.formations.map((f) => f.id) ?? [];
  const { data: availableFormations } = useAvailableFormationsForUser(
    userId ?? null,
    currentFormationIds
  );

  const grantMutation = useGrantEnrollment();
  const revokeMutation = useRevokeEnrollment();

  const [grantOpen, setGrantOpen] = useState(false);
  const [selectedFormation, setSelectedFormation] = useState<string>("");
  const [grantNotes, setGrantNotes] = useState("");
  const [revokeTarget, setRevokeTarget] = useState<{ id: string; titre: string } | null>(null);
  const [openQuizzes, setOpenQuizzes] = useState<Record<string, boolean>>({});

  if (profile?.role !== "ceo") {
    return <Navigate to="/training" replace />;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="text-center py-24 space-y-4">
        <p className="text-lg text-muted-foreground">Élève introuvable.</p>
        <Button onClick={() => navigate("/admin/training/students")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
      </div>
    );
  }

  const totalChaptersDone = detail.formations.reduce((s, f) => s + f.chapters_done, 0);
  const totalChapters = detail.formations.reduce((s, f) => s + f.chapters_total, 0);
  const validatedQuizCount = detail.quizzes.filter((q) => q.latest?.validated).length;

  const handleGrant = async () => {
    if (!selectedFormation || !userId) return;
    try {
      await grantMutation.mutateAsync({
        user_id: userId,
        formation_id: selectedFormation,
        notes: grantNotes.trim() || undefined,
      });
      toast.success("Accès accordé.");
      setGrantOpen(false);
      setSelectedFormation("");
      setGrantNotes("");
    } catch (err: any) {
      toast.error("Erreur : " + (err?.message || "inconnue"));
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget || !userId) return;
    try {
      await revokeMutation.mutateAsync({
        enrollment_id: revokeTarget.id,
        user_id: userId,
      });
      toast.success("Accès retiré.");
      setRevokeTarget(null);
    } catch (err: any) {
      toast.error("Erreur : " + (err?.message || "inconnue"));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/admin/training/students")}
          className="gap-2 -ml-2 mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à la liste
        </Button>
        <h1 className="text-2xl font-bold font-heading">
          {detail.profile.full_name || detail.profile.email}
        </h1>
        <p className="text-sm text-muted-foreground">
          {detail.profile.email} • Rôle : {detail.profile.role}
          {detail.profile.created_at && (
            <>
              {" "}
              • Inscrit le {format(new Date(detail.profile.created_at), "dd/MM/yyyy")}
            </>
          )}
          {detail.last_activity_at && (
            <>
              {" "}
              • Dernière activité :{" "}
              {formatDistanceToNow(new Date(detail.last_activity_at), {
                addSuffix: true,
                locale: fr,
              })}
            </>
          )}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Formations
            </p>
            <p className="text-2xl font-bold">{detail.formations.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Chapitres complétés
            </p>
            <p className="text-2xl font-bold">
              {totalChaptersDone}
              <span className="text-sm font-normal text-muted-foreground">
                {" "}
                / {totalChapters}
              </span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Quiz validés
            </p>
            <p className="text-2xl font-bold">
              {validatedQuizCount}
              <span className="text-sm font-normal text-muted-foreground">
                {" "}
                / {detail.quizzes.length}
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Formations enrôlées */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg font-heading">Accès aux formations</h2>
            <Button size="sm" onClick={() => setGrantOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Donner accès
            </Button>
          </div>

          {detail.formations.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Aucune formation enrôlée.
            </p>
          ) : (
            <div className="space-y-3">
              {detail.formations.map((f) => (
                <div
                  key={f.id}
                  className="rounded-lg border border-border bg-card p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground flex items-center gap-2">
                        {f.progress_pct >= 100 && <Trophy className="h-4 w-4 text-amber-500" />}
                        {f.titre}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Accordé le {format(new Date(f.enrollment.granted_at), "dd/MM/yyyy")}
                        {f.enrollment.source && ` • Source : ${f.enrollment.source}`}
                      </p>
                      {f.enrollment.notes && (
                        <p className="text-xs italic text-muted-foreground mt-1">
                          « {f.enrollment.notes} »
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive shrink-0 h-8 w-8"
                      onClick={() => setRevokeTarget({ id: f.enrollment_id, titre: f.titre })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-1">
                    <Progress
                      value={f.progress_pct}
                      className={cn("h-2", f.progress_pct >= 100 && "[&>div]:bg-emerald-500")}
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {f.chapters_done}/{f.chapters_total} chapitres
                      </span>
                      <span className="font-medium">{f.progress_pct}%</span>
                    </div>
                  </div>
                  {userId && (
                    <div className="pt-2 border-t border-border/60">
                      <AdminCertificateActions
                        userId={userId}
                        formationId={f.id}
                        isComplete={f.progress_pct >= 100}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quiz Historique */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <h2 className="font-bold text-lg font-heading">Quiz — Historique</h2>

          {detail.quizzes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Aucun quiz tenté.
            </p>
          ) : (
            <div className="space-y-3">
              {detail.quizzes.map((q) => {
                const isOpen = openQuizzes[q.quiz_id] ?? false;
                const validated = q.latest?.validated ?? false;
                return (
                  <div key={q.quiz_id} className="rounded-lg border border-border bg-card overflow-hidden">
                    <div className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground flex items-center gap-2">
                            {validated ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <RotateCcw className="h-4 w-4 text-amber-500" />
                            )}
                            {q.titre}
                          </p>
                          {q.latest && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Dernier essai : {q.latest.errors_count} erreur
                              {q.latest.errors_count !== 1 ? "s" : ""} sur {q.latest.total_questions} •{" "}
                              {formatDistanceToNow(new Date(q.latest.completed_at), {
                                addSuffix: true,
                                locale: fr,
                              })}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant={validated ? "default" : "secondary"}
                          className={cn(
                            "text-xs",
                            validated && "bg-emerald-600 hover:bg-emerald-600"
                          )}
                        >
                          {validated ? "✅ Validé" : "🔄 À refaire"}
                        </Badge>
                      </div>

                      {q.total_attempts > 1 && (
                        <Collapsible
                          open={isOpen}
                          onOpenChange={(o) =>
                            setOpenQuizzes((prev) => ({ ...prev, [q.quiz_id]: o }))
                          }
                        >
                          <CollapsibleTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs gap-1 -ml-2 h-7"
                            >
                              <ChevronDown
                                className={cn(
                                  "h-3 w-3 transition-transform",
                                  isOpen && "rotate-180"
                                )}
                              />
                              {q.total_attempts} tentatives au total
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="mt-2 space-y-1.5">
                              {q.attempts.map((a, idx) => {
                                const isLatest = idx === 0;
                                return (
                                  <div
                                    key={a.id}
                                    className={cn(
                                      "flex items-center justify-between gap-2 text-xs px-3 py-2 rounded-md",
                                      a.validated
                                        ? "bg-emerald-500/5 border border-emerald-500/20"
                                        : "bg-amber-500/5 border border-amber-500/20"
                                    )}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-muted-foreground">
                                        #{q.total_attempts - idx}
                                      </span>
                                      <span>
                                        {a.errors_count} erreur{a.errors_count !== 1 ? "s" : ""} /{" "}
                                        {a.total_questions}
                                      </span>
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          "text-[10px] px-1.5 py-0",
                                          a.validated
                                            ? "border-emerald-500/40 text-emerald-600"
                                            : "border-amber-500/40 text-amber-600"
                                        )}
                                      >
                                        {a.validated ? "validé" : "à refaire"}
                                      </Badge>
                                      {isLatest && (
                                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                          dernier
                                        </Badge>
                                      )}
                                    </div>
                                    <span className="text-muted-foreground">
                                      {formatDistanceToNow(new Date(a.completed_at), {
                                        addSuffix: true,
                                        locale: fr,
                                      })}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grant access dialog */}
      <Dialog open={grantOpen} onOpenChange={setGrantOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">Donner accès à une formation</DialogTitle>
            <DialogDescription>
              L'élève pourra accéder immédiatement à la formation choisie.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Formation</Label>
              <Select value={selectedFormation} onValueChange={setSelectedFormation}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une formation..." />
                </SelectTrigger>
                <SelectContent>
                  {(availableFormations || []).length === 0 ? (
                    <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                      Toutes les formations publiées sont déjà accordées.
                    </div>
                  ) : (
                    (availableFormations || []).map((f: any) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.titre}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optionnel)</Label>
              <Textarea
                value={grantNotes}
                onChange={(e) => setGrantNotes(e.target.value)}
                placeholder="Raison de l'attribution, contexte..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setGrantOpen(false)}
              disabled={grantMutation.isPending}
            >
              Annuler
            </Button>
            <Button
              onClick={handleGrant}
              disabled={!selectedFormation || grantMutation.isPending}
            >
              {grantMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Accorder l'accès
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke confirm */}
      <AlertDialog
        open={!!revokeTarget}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer l'accès à cette formation ?</AlertDialogTitle>
            <AlertDialogDescription>
              L'élève perdra l'accès à « {revokeTarget?.titre} ». Sa progression est conservée
              et l'accès peut être réaccordé à tout moment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revokeMutation.isPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              disabled={revokeMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {revokeMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Retirer l'accès
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
