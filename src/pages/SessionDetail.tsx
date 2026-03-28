import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Star, Calendar, User, FileText } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function SessionDetail() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ["session-detail", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coaching_sessions")
        .select(`
          *,
          coach_type:coach_types(id, label, theme_color),
          student:profiles!coaching_sessions_student_user_id_fkey(id, email, full_name),
          coach:profiles!coaching_sessions_coach_user_id_fkey(id, email, full_name)
        `)
        .eq("id", sessionId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!sessionId,
  });

  const { data: scores, isLoading: scoresLoading } = useQuery({
    queryKey: ["session-scores", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coaching_scores")
        .select("*")
        .eq("session_id", sessionId!)
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!sessionId,
  });

  // Snapshot steps or fallback to live data
  const snapshot = session?.structure_snapshot as any;
  const hasSnapshot = !!snapshot?.steps;

  // Fallback: fetch live steps when no snapshot exists
  const { data: liveSteps } = useQuery({
    queryKey: ["session-live-steps", session?.coach_type_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coach_steps")
        .select(`
          id, step_id, step_number, label, title, objective, tips, display_order,
          criteria:coach_criteria(id, criteria_text, display_order),
          scripts:coach_script_refs(id, sub_mode, script_lines, display_order),
          debriefs:coach_debrief_options(id, debrief_label, options, display_order)
        `)
        .eq("coach_type_id", session!.coach_type_id)
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data;
    },
    enabled: !!session?.coach_type_id && !hasSnapshot,
  });

  const steps: any[] = hasSnapshot ? snapshot.steps : (liveSteps || []);

  // Map scores to steps
  const stepsWithScores = steps.map((step: any) => {
    const score = scores?.find((s) => s.step_id === step.id);
    return { ...step, score };
  });

  // criteria_scores is a flat number[] (positional, matching step.criteria order)
  const getStepAverage = (step: any) => {
    const cs = step.score?.criteria_scores as number[] | undefined;
    if (!cs || cs.length === 0) return null;
    const valid = cs.filter((v) => v > 0);
    if (valid.length === 0) return null;
    return valid.reduce((a, b) => a + b, 0) / valid.length;
  };

  const renderStars = (score: number, max = 5) => (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < score ? "fill-yellow-500 text-yellow-500" : "fill-muted text-muted"
          }`}
        />
      ))}
    </div>
  );

  if (sessionLoading || scoresLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Session introuvable</p>
        <Button variant="outline" onClick={() => navigate("/mon-coaching")} className="mt-4">
          Retour
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/mon-coaching")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: session.coach_type?.theme_color }}
            />
            <h1 className="text-2xl font-bold">
              Session #{session.session_number} — {session.coach_type?.label}
            </h1>
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {format(new Date(session.session_date), "d MMMM yyyy", { locale: fr })}
            </span>
            <span className="flex items-center gap-1">
              <User className="h-4 w-4" />
              Coach : {session.coach?.full_name || session.coach?.email}
            </span>
            {session.sub_mode && <Badge variant="secondary">{session.sub_mode}</Badge>}
          </div>
        </div>
      </div>

      {/* Score global */}
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Score global</p>
              <div className="flex items-center gap-2">
                <span className="text-4xl font-bold">
                  {session.global_score?.toFixed(1) || "—"}
                </span>
                <span className="text-2xl text-muted-foreground">/5</span>
              </div>
              {session.global_score && (
                <div className="mt-2">{renderStars(Math.round(session.global_score))}</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Détail par étape */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Détail par étape
        </h2>

        {stepsWithScores.map((step: any, index: number) => {
          const avg = getStepAverage(step);
          const hasScore = !!step.score;
          const criteriaScores = (step.score?.criteria_scores as number[]) || [];
          const criteria = step.criteria || [];
          const debriefResponses = (step.score?.debrief_responses as string[]) || [];

          return (
            <Card key={step.id} className={!hasScore ? "opacity-50" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Badge variant="outline" className="font-mono">
                      {String(index + 1).padStart(2, "0")}
                    </Badge>
                    {step.label} — {step.title}
                  </CardTitle>
                  {avg !== null && (
                    <div className="flex items-center gap-2">
                      {renderStars(Math.round(avg))}
                      <span className="font-semibold">{avg.toFixed(1)}/5</span>
                    </div>
                  )}
                </div>
              </CardHeader>

              {hasScore && step.score ? (
                <CardContent className="space-y-4">
                  {/* Critères — positional scores matching criteria array */}
                  {criteriaScores.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Critères</p>
                      <div className="space-y-2">
                        {criteriaScores.map((score: number, i: number) => (
                          <div
                            key={i}
                            className="flex items-start justify-between gap-4 p-3 bg-muted/30 rounded-lg"
                          >
                            <p className="text-sm flex-1">
                              {criteria[i]?.criteria_text || `Critère ${i + 1}`}
                            </p>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {renderStars(score)}
                              <span className="text-sm font-medium">{score}/5</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Débriefs */}
                  {debriefResponses.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Observations</p>
                      <div className="flex flex-wrap gap-1">
                        {debriefResponses.map((opt: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {opt}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {step.score.notes && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Notes du coach</p>
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <p className="text-sm whitespace-pre-wrap">{step.score.notes}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              ) : (
                <CardContent>
                  <p className="text-sm text-muted-foreground italic">
                    Cette étape n'a pas été évaluée
                  </p>
                </CardContent>
              )}
            </Card>
          );
        })}

        {stepsWithScores.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-muted-foreground">
                Aucune donnée disponible pour cette session
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
