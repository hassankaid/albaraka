import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Loader2,
  ArrowLeft,
  Star,
  Calendar,
  User,
  FileText,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  Flame,
  AlertTriangle,
  CheckCircle,
  Circle,
  Download,
} from "lucide-react";
import { downloadSessionPdf } from "@/components/coaching/SessionPdfExport";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

export default function SessionDetail() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [showEvolution, setShowEvolution] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPdf = async () => {
    if (!session || !scores || !steps) return;
    setIsExporting(true);
    try {
      await downloadSessionPdf(session, scores, steps, strengths, weaknesses);
    } catch (error) {
      console.error("Erreur export PDF:", error);
    } finally {
      setIsExporting(false);
    }
  };

  // ── Current session ──
  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ["session-detail", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coaching_sessions")
        .select(
          `*, coach_type:coach_types(id, label, theme_color),
           student:profiles!coaching_sessions_student_user_id_fkey(id, email, full_name),
           coach:profiles!coaching_sessions_coach_user_id_fkey(id, email, full_name)`
        )
        .eq("id", sessionId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!sessionId,
  });

  // ── Scores for this session ──
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

  // ── Full history (same student + coach_type, completed) ──
  const { data: sessionHistory } = useQuery({
    queryKey: [
      "session-history-full",
      session?.student_user_id,
      session?.coach_type_id,
    ],
    queryFn: async () => {
      const { data: sessions, error } = await supabase
        .from("coaching_sessions")
        .select("id, session_number, session_date, global_score, structure_snapshot")
        .eq("student_user_id", session!.student_user_id)
        .eq("coach_type_id", session!.coach_type_id)
        .eq("status", "completed")
        .order("session_date", { ascending: true })
        .limit(20);
      if (error) throw error;

      // Fetch scores for each session
      const withScores = await Promise.all(
        (sessions || []).map(async (s) => {
          const { data: sScores } = await supabase
            .from("coaching_scores")
            .select("*")
            .eq("session_id", s.id);
          return { ...s, scores: sScores || [] };
        })
      );
      return withScores;
    },
    enabled: !!session?.student_user_id && !!session?.coach_type_id,
  });

  // ── Steps: snapshot or live fallback ──
  const snapshot = session?.structure_snapshot as any;
  const hasSnapshot = !!snapshot?.steps;

  const { data: liveSteps } = useQuery({
    queryKey: ["session-live-steps", session?.coach_type_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coach_steps")
        .select(
          `id, step_id, step_number, label, title, objective, tips, display_order,
           criteria:coach_criteria(id, criteria_text, display_order),
           scripts:coach_script_refs(id, sub_mode, script_lines, display_order),
           debriefs:coach_debrief_options(id, debrief_label, options, display_order)`
        )
        .eq("coach_type_id", session!.coach_type_id)
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data;
    },
    enabled: !!session?.coach_type_id && !hasSnapshot,
  });

  const steps: any[] = hasSnapshot ? snapshot.steps : liveSteps || [];

  // ── Helpers ──

  const getStepAverage = (criteriaScores: number[] | undefined) => {
    if (!criteriaScores || criteriaScores.length === 0) return null;
    const valid = criteriaScores.filter((v) => v > 0);
    if (valid.length === 0) return null;
    return valid.reduce((a, b) => a + b, 0) / valid.length;
  };

  const getStepEvolution = (stepId: string) => {
    if (!sessionHistory || sessionHistory.length === 0) return [];
    return sessionHistory
      .map((s) => {
        const sc = s.scores?.find((x: any) => x.step_id === stepId);
        const avg = getStepAverage(sc?.criteria_scores as number[] | undefined);
        return {
          sessionNumber: s.session_number,
          date: s.session_date,
          score: avg,
          isCurrent: s.id === sessionId,
        };
      })
      .filter((e) => e.score !== null);
  };

  const getStepTrend = (stepId: string) => {
    const evo = getStepEvolution(stepId);
    if (evo.length < 2) return null;
    const diff = (evo[evo.length - 1].score ?? 0) - (evo[0].score ?? 0);
    return {
      diff,
      direction: diff > 0.2 ? "up" : diff < -0.2 ? "down" : ("stable" as const),
    };
  };

  // Global trend vs previous session
  const getGlobalTrend = () => {
    if (!sessionHistory || sessionHistory.length < 2) return null;
    const idx = sessionHistory.findIndex((s) => s.id === sessionId);
    if (idx <= 0) return null;
    const curr = sessionHistory[idx]?.global_score ?? 0;
    const prev = sessionHistory[idx - 1]?.global_score ?? 0;
    const diff = curr - prev;
    if (diff > 0.2) return { direction: "up" as const, diff: diff.toFixed(1) };
    if (diff < -0.2)
      return { direction: "down" as const, diff: Math.abs(diff).toFixed(1) };
    return { direction: "stable" as const, diff: "0" };
  };

  // Strengths / weaknesses
  const getStrengthsAndWeaknesses = () => {
    const scored = steps
      .map((step: any) => {
        const sc = scores?.find((s) => s.step_id === step.id);
        const avg = getStepAverage(sc?.criteria_scores as number[] | undefined);
        const trend = getStepTrend(step.id);
        return { id: step.id, label: step.label, title: step.title, score: avg, trend };
      })
      .filter((s) => s.score !== null);

    const strengths = scored
      .filter((s) => (s.score ?? 0) >= 4)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 3);

    const weaknesses = scored
      .filter((s) => (s.score ?? 0) < 4)
      .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))
      .slice(0, 3);

    return { strengths, weaknesses };
  };

  // Chart data
  const chartData =
    sessionHistory?.map((s) => ({
      name: `S${s.session_number}`,
      score: s.global_score,
      date: format(new Date(s.session_date), "dd/MM", { locale: fr }),
      isCurrent: s.id === sessionId,
    })) || [];

  const globalTrend = getGlobalTrend();
  const { strengths, weaknesses } = getStrengthsAndWeaknesses();

  // Stars renderer
  const renderStars = (score: number | null, max = 5) => (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            score !== null && i < Math.round(score)
              ? "fill-yellow-500 text-yellow-500"
              : "fill-muted text-muted"
          }`}
        />
      ))}
    </div>
  );

  // Step badge
  const renderStepBadge = (score: number | null, trend: ReturnType<typeof getStepTrend>) => {
    if (score === null) return null;
    if (trend && trend.diff > 0.5)
      return (
        <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs gap-1">
          <Flame className="h-3 w-3" /> Top
        </Badge>
      );
    if (score >= 4)
      return (
        <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
          ✓ Maîtrisé
        </Badge>
      );
    if ((trend && trend.diff < -0.3) || score < 3)
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs gap-1">
          <AlertTriangle className="h-3 w-3" /> Focus
        </Badge>
      );
    return null;
  };

  // ── Loading / not found ──
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

  const evaluatedCount = steps.filter((s: any) => scores?.find((sc) => sc.step_id === s.id)).length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* ── Header ── */}
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
        <Button variant="outline" onClick={handleExportPdf} disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Exporter PDF
        </Button>
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Score global */}
        <Card>
          <CardContent className="py-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Score global</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-4xl font-bold">
                  {session.global_score?.toFixed(1) || "—"}
                </span>
                <span className="text-2xl text-muted-foreground">/5</span>
              </div>
              {session.global_score && (
                <div className="mt-2 flex justify-center">
                  {renderStars(Math.round(session.global_score))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tendance */}
        <Card>
          <CardContent className="py-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Évolution</p>
              {globalTrend ? (
                <div className="flex items-center justify-center gap-2 text-3xl font-bold">
                  {globalTrend.direction === "up" && (
                    <>
                      <TrendingUp className="h-7 w-7 text-green-500" />
                      <span className="text-green-600">+{globalTrend.diff}</span>
                    </>
                  )}
                  {globalTrend.direction === "down" && (
                    <>
                      <TrendingDown className="h-7 w-7 text-red-500" />
                      <span className="text-red-600">-{globalTrend.diff}</span>
                    </>
                  )}
                  {globalTrend.direction === "stable" && (
                    <>
                      <Minus className="h-7 w-7 text-muted-foreground" />
                      <span className="text-muted-foreground">Stable</span>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-3xl font-bold text-muted-foreground">—</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">vs session précédente</p>
            </div>
          </CardContent>
        </Card>

        {/* Étapes évaluées */}
        <Card>
          <CardContent className="py-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Étapes évaluées</p>
              <div className="flex items-center justify-center gap-1">
                <span className="text-4xl font-bold">{evaluatedCount}</span>
                <span className="text-2xl text-muted-foreground">/ {steps.length}</span>
              </div>
              <div className="flex justify-center gap-1 mt-2">
                {steps.map((step: any) => (
                  <div
                    key={step.id}
                    className={`w-2.5 h-2.5 rounded-full ${
                      scores?.find((sc) => sc.step_id === step.id)
                        ? "bg-green-500"
                        : "bg-muted"
                    }`}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Progression chart ── */}
      {chartData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Progression globale</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} fontSize={12} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload?.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-popover border rounded-lg p-2 shadow text-sm">
                            <p className="font-medium">{d.name}</p>
                            <p className="text-muted-foreground">{d.date}</p>
                            <p className="font-semibold">{d.score?.toFixed(1)}/5</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine y={4} stroke="hsl(var(--primary))" strokeDasharray="6 3" opacity={0.4} />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      return (
                        <circle
                          key={`dot-${payload.name}`}
                          cx={cx}
                          cy={cy}
                          r={payload.isCurrent ? 6 : 4}
                          fill={payload.isCurrent ? "hsl(var(--primary))" : "white"}
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                        />
                      );
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              La ligne pointillée indique le seuil de maîtrise (4/5)
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Forces / Faiblesses ── */}
      {(strengths.length > 0 || weaknesses.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                Points forts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {strengths.length > 0 ? (
                <div className="space-y-2">
                  {strengths.map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950/20 rounded-lg">
                      <span className="text-sm font-medium">{s.title}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {s.score?.toFixed(1)}/5
                        </Badge>
                        {s.trend && s.trend.diff > 0 && (
                          <span className="text-xs text-green-600">↑ +{s.trend.diff.toFixed(1)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Aucun point fort identifié (score ≥ 4)
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
                À améliorer
              </CardTitle>
            </CardHeader>
            <CardContent>
              {weaknesses.length > 0 ? (
                <div className="space-y-2">
                  {weaknesses.map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-2 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                      <span className="text-sm font-medium">{s.title}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {s.score?.toFixed(1)}/5
                        </Badge>
                        {s.trend && s.trend.diff < 0 && (
                          <span className="text-xs text-red-600">↓ {s.trend.diff.toFixed(1)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Excellent ! Tous les scores sont ≥ 4
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Évolution par étape ── */}
      {sessionHistory && sessionHistory.length > 1 && (
        <Card>
          <Collapsible open={showEvolution} onOpenChange={setShowEvolution}>
            <CardHeader className="pb-3">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                  <CardTitle className="text-base flex items-center gap-2">
                    📊 Évolution par étape
                  </CardTitle>
                  <ChevronDown
                    className={`h-5 w-5 transition-transform ${showEvolution ? "rotate-180" : ""}`}
                  />
                </Button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="space-y-3">
                {steps.map((step: any) => {
                  const evo = getStepEvolution(step.id);
                  const trend = getStepTrend(step.id);
                  const currentScore = evo.find((e) => e.isCurrent)?.score ?? null;

                  if (evo.length === 0) return null;

                  return (
                    <div key={step.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <Badge variant="outline" className="font-mono mr-2">
                            {step.label}
                          </Badge>
                          <span className="text-sm font-medium">{step.title}</span>
                        </div>
                        {renderStepBadge(currentScore, trend)}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {evo.map((e, i) => (
                          <span key={i} className="flex items-center gap-1">
                            {i > 0 && <span className="text-muted-foreground">→</span>}
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded ${
                                e.isCurrent
                                  ? "bg-primary text-primary-foreground font-semibold"
                                  : "bg-muted"
                              }`}
                            >
                              S{e.sessionNumber}: {e.score?.toFixed(1)}
                            </span>
                          </span>
                        ))}
                        {trend && (
                          <span
                            className={`text-xs font-medium ml-auto ${
                              trend.direction === "up"
                                ? "text-green-600"
                                : trend.direction === "down"
                                ? "text-red-600"
                                : "text-muted-foreground"
                            }`}
                          >
                            {trend.direction === "up" && `↑ +${trend.diff.toFixed(1)}`}
                            {trend.direction === "down" && `↓ ${trend.diff.toFixed(1)}`}
                            {trend.direction === "stable" && "── stable"}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {/* ── Détail par étape ── */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Détail par étape
        </h2>

        {steps.map((step: any, index: number) => {
          const score = scores?.find((s) => s.step_id === step.id);
          const hasScore = !!score;
          const criteriaScores = (score?.criteria_scores as number[]) || [];
          const debriefResponses = (score?.debrief_responses as string[]) || [];
          const criteria = step.criteria || [];
          const avg = getStepAverage(criteriaScores);
          const trend = getStepTrend(step.id);

          return (
            <Card key={step.id} className={!hasScore ? "opacity-50" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {hasScore ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <Badge variant="outline" className="font-mono">
                      {String(index + 1).padStart(2, "0")}
                    </Badge>
                    {step.label} — {step.title}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {avg !== null && (
                      <>
                        {renderStars(avg)}
                        <span className="font-semibold">{avg.toFixed(1)}/5</span>
                        {renderStepBadge(avg, trend)}
                      </>
                    )}
                    {!hasScore && (
                      <span className="text-xs text-muted-foreground">Non évalué</span>
                    )}
                  </div>
                </div>
              </CardHeader>

              {hasScore && score ? (
                <CardContent className="space-y-4">
                  {/* Critères */}
                  {criteriaScores.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Critères</p>
                      <div className="space-y-2">
                        {criteriaScores.map((val: number, i: number) => (
                          <div
                            key={i}
                            className="flex items-start justify-between gap-4 p-3 bg-muted/30 rounded-lg"
                          >
                            <p className="text-sm flex-1">
                              {criteria[i]?.criteria_text || `Critère ${i + 1}`}
                            </p>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {renderStars(val)}
                              <span className="text-sm font-medium">{val}/5</span>
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
                      {step.debriefs && step.debriefs.length > 0 ? (
                        <div className="space-y-3">
                          {step.debriefs.map((debrief: any) => {
                            const matchedOptions = debriefResponses.filter((opt: string) =>
                              debrief.options?.includes(opt)
                            );
                            if (matchedOptions.length === 0) return null;
                            return (
                              <div key={debrief.id} className="p-3 bg-muted/30 rounded-lg">
                                <p className="text-xs font-medium text-muted-foreground mb-1.5">
                                  {debrief.debrief_label}
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {matchedOptions.map((opt: string, j: number) => (
                                    <Badge key={j} variant="secondary" className="text-xs">
                                      {opt}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {debriefResponses.map((opt: string, i: number) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {opt}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Notes */}
                  {score.notes && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Notes du coach</p>
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <p className="text-sm whitespace-pre-wrap">{score.notes}</p>
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

        {steps.length === 0 && (
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
