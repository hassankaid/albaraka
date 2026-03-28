import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, ChevronLeft, ChevronRight, Save, CheckCircle, Star, FileText, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

/**
 * Per-step local state kept in memory until save.
 * criteria_scores: number[] — positional, same order as criteria query
 * debrief_selections: string[] — flat list of selected option labels
 */
interface StepLocal {
  criteria_scores: number[];
  debrief_selections: string[];
  notes: string;
}

export default function CoachingSession() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [locals, setLocals] = useState<Record<string, StepLocal>>({});

  // ── Session ──
  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ["coaching-session", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coaching_sessions")
        .select(`
          *,
          coach_types(*),
          student:profiles!coaching_sessions_student_user_id_fkey(id, full_name),
          coach:profiles!coaching_sessions_coach_user_id_fkey(id, full_name)
        `)
        .eq("id", sessionId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!sessionId,
  });

  // ── Steps: use snapshot if available, else live ──
  const snapshot = session?.structure_snapshot as any;
  const hasSnapshot = !!snapshot?.steps;

  const { data: liveSteps } = useQuery({
    queryKey: ["coach-steps-live", session?.coach_type_id],
    queryFn: async () => {
      const { data: stepsData, error: stepsError } = await supabase
        .from("coach_steps")
        .select("*")
        .eq("coach_type_id", session!.coach_type_id)
        .eq("is_active", true)
        .order("display_order");
      if (stepsError) throw stepsError;

      // Fetch criteria, scripts, debriefs for each step
      const enriched = await Promise.all(
        (stepsData || []).map(async (step) => {
          const [criteriaRes, scriptsRes, debriefsRes] = await Promise.all([
            supabase.from("coach_criteria").select("*").eq("step_id", step.id).eq("is_active", true).order("display_order"),
            (() => {
              let q = supabase.from("coach_script_refs").select("*").eq("step_id", step.id);
              if (session?.sub_mode) {
                q = q.or(`sub_mode.eq.${session.sub_mode},sub_mode.is.null`);
              } else {
                q = q.is("sub_mode", null);
              }
              return q.order("display_order");
            })(),
            supabase.from("coach_debrief_options").select("*").eq("step_id", step.id).order("display_order"),
          ]);
          return {
            ...step,
            criteria: criteriaRes.data || [],
            scripts: scriptsRes.data || [],
            debriefs: debriefsRes.data || [],
          };
        })
      );
      return enriched;
    },
    enabled: !!session?.coach_type_id && !hasSnapshot,
  });

  const steps = hasSnapshot ? snapshot.steps : liveSteps;
  const currentStep = steps?.[currentStepIndex];
  const criteria = currentStep?.criteria || [];
  const scripts = currentStep?.scripts || [];
  const debriefs = currentStep?.debriefs || [];

  // ── Existing scores (to hydrate state & decide insert vs update) ──
  const { data: existingScores } = useQuery({
    queryKey: ["coaching-scores", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coaching_scores")
        .select("*")
        .eq("session_id", sessionId!);
      if (error) throw error;
      return data;
    },
    enabled: !!sessionId,
  });

  // Hydrate local state from DB once
  useEffect(() => {
    if (!existingScores || existingScores.length === 0) return;
    setLocals((prev) => {
      const next = { ...prev };
      existingScores.forEach((row) => {
        if (!next[row.step_id]) {
          next[row.step_id] = {
            criteria_scores: (row.criteria_scores as number[]) || [],
            debrief_selections: (row.debrief_responses as string[]) || [],
            notes: row.notes || "",
          };
        }
      });
      return next;
    });
  }, [existingScores]);

  // ── Helpers to read / write local state ──
  const getLocal = useCallback(
    (stepId: string): StepLocal =>
      locals[stepId] || { criteria_scores: [], debrief_selections: [], notes: "" },
    [locals],
  );

  const patchLocal = (stepId: string, patch: Partial<StepLocal>) => {
    setLocals((prev) => ({
      ...prev,
      [stepId]: { ...getLocal(stepId), ...patch },
    }));
  };

  // ── Criteria score helpers ──
  const getCriteriaScore = (criteriaIndex: number): number => {
    if (!currentStep) return 0;
    return getLocal(currentStep.id).criteria_scores[criteriaIndex] || 0;
  };

  const setCriteriaScore = (criteriaIndex: number, score: number) => {
    if (!currentStep) return;
    const local = getLocal(currentStep.id);
    const arr = [...local.criteria_scores];
    // Pad with zeros if needed
    while (arr.length <= criteriaIndex) arr.push(0);
    arr[criteriaIndex] = score;
    patchLocal(currentStep.id, { criteria_scores: arr });
  };

  // ── Debrief helpers ──
  const isOptionSelected = (option: string): boolean => {
    if (!currentStep) return false;
    return getLocal(currentStep.id).debrief_selections.includes(option);
  };

  const toggleOption = (option: string, checked: boolean) => {
    if (!currentStep) return;
    const local = getLocal(currentStep.id);
    const next = checked
      ? [...local.debrief_selections, option]
      : local.debrief_selections.filter((o) => o !== option);
    patchLocal(currentStep.id, { debrief_selections: next });
  };

  // ── Step completeness ──
  const isStepComplete = (stepId: string): boolean => {
    const local = locals[stepId];
    return !!local && local.criteria_scores.some((s) => s > 0);
  };

  // ── Save mutation ──
  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const [stepId, local] of Object.entries(locals)) {
        const existing = existingScores?.find((s) => s.step_id === stepId);
        const payload = {
          criteria_scores: local.criteria_scores,
          debrief_responses: local.debrief_selections,
          notes: local.notes,
        };

        if (existing) {
          const { error } = await supabase
            .from("coaching_scores")
            .update(payload)
            .eq("id", existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("coaching_scores").insert({
            session_id: sessionId!,
            step_id: stepId,
            ...payload,
          });
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaching-scores", sessionId] });
      toast({ title: "Sauvegardé", description: "Les scores ont été enregistrés." });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de sauvegarder.", variant: "destructive" });
    },
  });

  // ── Complete session ──
  const completeMutation = useMutation({
    mutationFn: async () => {
      // Save first
      await saveMutation.mutateAsync();

      // Mark completed — the DB trigger recalculates global_score automatically
      const { error } = await supabase
        .from("coaching_sessions")
        .update({ status: "completed" })
        .eq("id", sessionId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaching-sessions"] });
      toast({ title: "Session terminée", description: "La session a été enregistrée avec succès." });
      navigate("/coaching");
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de terminer la session.", variant: "destructive" });
    },
  });

  // ── Loading / error states ──
  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Session introuvable.</p>
        <Button className="mt-4" onClick={() => navigate("/coaching")}>Retour</Button>
      </div>
    );
  }

  const themeColor = (session.coach_types as any)?.theme_color || "hsl(var(--primary))";
  const studentName = (session.student as any)?.full_name || "Élève inconnu";

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/coaching")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: themeColor }} />
              {(session.coach_types as any)?.label}
            </h1>
            <p className="text-sm text-muted-foreground">
              {studentName} • Session #{session.session_number} •{" "}
              {format(new Date(session.session_date), "d MMMM yyyy", { locale: fr })}
              {session.sub_mode && ` • ${session.sub_mode}`}
            </p>
          </div>
        </div>
        <Badge variant={session.status === "completed" ? "default" : "secondary"}>
          {session.status === "completed" ? "Terminée" : "Brouillon"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* ── Steps sidebar ── */}
        <Card className="lg:col-span-1 h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Étapes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {steps?.map((step, index) => (
              <button
                key={step.id}
                onClick={() => setCurrentStepIndex(index)}
                className={cn(
                  "w-full text-left p-3 rounded-lg border transition-colors",
                  currentStepIndex === index
                    ? "border-primary bg-primary/10"
                    : "border-transparent hover:bg-muted",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-foreground">{step.label}</span>
                  {isStepComplete(step.id) && <CheckCircle className="h-4 w-4 text-green-500" />}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{step.title}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* ── Main content ── */}
        <div className="lg:col-span-3 space-y-5">
          {currentStep && (
            <>
              {/* Step header */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{currentStep.label} — {currentStep.title}</CardTitle>
                  {currentStep.objective && (
                    <CardDescription>{currentStep.objective}</CardDescription>
                  )}
                </CardHeader>
              </Card>

              {/* Script */}
              {scripts && scripts.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Script de référence
                      {scripts.some((s) => s.sub_mode) && (
                        <Badge variant="outline" className="ml-auto text-xs font-normal">
                          {session.sub_mode}
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1.5">
                      {scripts.flatMap((script) =>
                        script.script_lines?.map((line: string, i: number) => (
                          <li key={`${script.id}-${i}`} className="text-sm flex gap-2">
                            <span className="text-muted-foreground shrink-0">•</span>
                            <span className="text-foreground">{line}</span>
                          </li>
                        )),
                      )}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Tips */}
              {currentStep.tips && currentStep.tips.length > 0 && (
                <Card className="border-amber-500/30 bg-amber-500/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">💡 Tips pour le coach</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1.5">
                      {currentStep.tips.map((tip: string, i: number) => (
                        <li key={i} className="text-sm flex gap-2">
                          <span className="text-muted-foreground shrink-0">•</span>
                          <span className="text-foreground">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Criteria scoring */}
              {criteria && criteria.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Star className="h-4 w-4" />
                      Évaluation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {criteria.map((criterion, cIdx) => {
                      const score = getCriteriaScore(cIdx);
                      return (
                        <div key={criterion.id} className="space-y-2">
                          <Label className="text-sm">{criterion.criteria_text}</Label>
                          <div className="flex items-center gap-1.5">
                            {[1, 2, 3, 4, 5].map((val) => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => setCriteriaScore(cIdx, val)}
                                className={cn(
                                  "p-1.5 rounded-md border transition-all",
                                  score >= val
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border hover:border-primary/50 text-muted-foreground",
                                )}
                              >
                                <Star className={cn("h-5 w-5", score >= val && "fill-current")} />
                              </button>
                            ))}
                            <span className="ml-3 text-sm text-muted-foreground">
                              {score > 0 ? `${score}/5` : "Non noté"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              {/* Debrief */}
              {debriefs && debriefs.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Débrief</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {debriefs.map((debrief) => (
                      <div key={debrief.id} className="space-y-2.5">
                        <Label className="text-sm font-medium">{debrief.debrief_label}</Label>
                        <div className="space-y-2">
                          {(debrief.options as string[])?.map((option) => (
                            <div key={option} className="flex items-start gap-2">
                              <Checkbox
                                id={`${debrief.id}-${option}`}
                                checked={isOptionSelected(option)}
                                onCheckedChange={(checked) => toggleOption(option, !!checked)}
                                className="mt-0.5"
                              />
                              <label
                                htmlFor={`${debrief.id}-${option}`}
                                className="text-sm cursor-pointer leading-snug text-foreground"
                              >
                                {option}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Notes pour cette étape…"
                    value={currentStep ? getLocal(currentStep.id).notes : ""}
                    onChange={(e) => currentStep && patchLocal(currentStep.id, { notes: e.target.value })}
                    rows={4}
                  />
                </CardContent>
              </Card>

              {/* Navigation */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStepIndex((i) => Math.max(0, i - 1))}
                  disabled={currentStepIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Précédente
                </Button>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending}
                  >
                    {saveMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Sauvegarder
                  </Button>

                  {currentStepIndex === (steps?.length || 1) - 1 && (
                    <Button
                      className="gradient-primary"
                      onClick={() => completeMutation.mutate()}
                      disabled={completeMutation.isPending}
                    >
                      {completeMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      Terminer la session
                    </Button>
                  )}
                </div>

                <Button
                  variant="outline"
                  onClick={() => setCurrentStepIndex((i) => Math.min((steps?.length || 1) - 1, i + 1))}
                  disabled={currentStepIndex === (steps?.length || 1) - 1}
                >
                  Suivante
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
