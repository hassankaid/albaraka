import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, User, Users, TrendingUp, Calendar, Star, FileText } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";

interface SessionWithDetails {
  id: string;
  session_number: number;
  session_date: string;
  status: string;
  global_score: number | null;
  sub_mode: string | null;
  coach_type: { id: string; label: string; theme_color: string };
  student: { id: string; email: string; full_name: string | null };
  coach: { id: string; email: string; full_name: string | null };
}

export default function MonCoaching() {
  const { profile } = useAuth();
  const [selectedSession, setSelectedSession] = useState<SessionWithDetails | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const { data: mySessions, isLoading: mySessionsLoading } = useQuery({
    queryKey: ["my-coaching-sessions", profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coaching_sessions")
        .select(`
          *,
          coach_type:coach_types(id, label, theme_color),
          student:profiles!coaching_sessions_student_user_id_fkey(id, email),
          coach:profiles!coaching_sessions_coach_user_id_fkey(id, email)
        `)
        .eq("student_user_id", profile!.id)
        .eq("status", "completed")
        .order("session_date", { ascending: false });
      if (error) throw error;
      return data as unknown as SessionWithDetails[];
    },
    enabled: !!profile?.id,
  });

  const { data: teamSessions, isLoading: teamSessionsLoading } = useQuery({
    queryKey: ["team-coaching-sessions", profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coaching_sessions")
        .select(`
          *,
          coach_type:coach_types(id, label, theme_color),
          student:profiles!coaching_sessions_student_user_id_fkey(id, email),
          coach:profiles!coaching_sessions_coach_user_id_fkey(id, email)
        `)
        .neq("student_user_id", profile!.id)
        .eq("status", "completed")
        .order("session_date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as unknown as SessionWithDetails[];
    },
    enabled: !!profile?.id,
  });

  const { data: sessionScores, isLoading: scoresLoading } = useQuery({
    queryKey: ["session-scores-detail", selectedSession?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coaching_scores")
        .select(`*, step:coach_steps(id, label, title)`)
        .eq("session_id", selectedSession!.id)
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedSession?.id,
  });

  const myStats = {
    totalSessions: mySessions?.length || 0,
    averageScore: (() => {
      const scored = mySessions?.filter((s) => s.global_score != null) || [];
      if (scored.length === 0) return "—";
      return (scored.reduce((a, s) => a + (s.global_score || 0), 0) / scored.length).toFixed(1);
    })(),
    lastSession: mySessions?.[0]
      ? format(new Date(mySessions[0].session_date), "d MMM yyyy", { locale: fr })
      : "—",
  };

  const openSessionDetails = (session: SessionWithDetails) => {
    setSelectedSession(session);
    setShowDetails(true);
  };

  const SessionCard = ({
    session,
    showStudent = false,
  }: {
    session: SessionWithDetails;
    showStudent?: boolean;
  }) => (
    <div
      onClick={() => openSessionDetails(session)}
      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
    >
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: session.coach_type?.theme_color }} />
        <div>
          <p className="font-medium text-sm">
            {session.coach_type?.label}
            {session.sub_mode && ` — ${session.sub_mode}`}
          </p>
          <p className="text-xs text-muted-foreground">
            {showStudent ? (
              <>Élève : {session.student?.email}</>
            ) : (
              <>Coach : {session.coach?.email}</>
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-xs text-muted-foreground">
            {format(new Date(session.session_date), "d MMMM yyyy", { locale: fr })}
          </p>
          <p className="text-xs text-muted-foreground">Session #{session.session_number}</p>
        </div>
        {session.global_score != null && (
          <div className="flex items-center gap-1 text-sm font-semibold">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            {session.global_score.toFixed(1)}/5
          </div>
        )}
      </div>
    </div>
  );

  if (mySessionsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Mon Coaching</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Sessions reçues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{myStats.totalSessions}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Score moyen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{myStats.averageScore}/5</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Star className="h-4 w-4" /> Dernière session
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{myStats.lastSession}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="mine">
        <TabsList>
          <TabsTrigger value="mine" className="flex items-center gap-2">
            <User className="h-4 w-4" /> Mes sessions
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-2">
            <Users className="h-4 w-4" /> Sessions équipe
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mine">
          <Card>
            <CardHeader>
              <CardTitle>Mes sessions de coaching</CardTitle>
            </CardHeader>
            <CardContent>
              {mySessions && mySessions.length > 0 ? (
                <div className="space-y-3">
                  {mySessions.map((s) => (
                    <SessionCard key={s.id} session={s} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>Vous n'avez pas encore reçu de session de coaching.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team">
          <Card>
            <CardHeader>
              <CardTitle>Sessions de l'équipe</CardTitle>
              <CardDescription>
                Consultez les sessions des autres membres pour apprendre de leurs expériences.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {teamSessionsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : teamSessions && teamSessions.length > 0 ? (
                <div className="space-y-3">
                  {teamSessions.map((s) => (
                    <SessionCard key={s.id} session={s} showStudent />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>Aucune session d'équipe disponible pour le moment.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detail modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: selectedSession?.coach_type?.theme_color }}
              />
              {selectedSession?.coach_type?.label}
              {selectedSession?.sub_mode && ` — ${selectedSession.sub_mode}`}
            </DialogTitle>
          </DialogHeader>

          {selectedSession && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Élève : </span>
                  <span className="font-medium">{selectedSession.student?.email}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Coach : </span>
                  <span className="font-medium">{selectedSession.coach?.email}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Date : </span>
                  <span className="font-medium">
                    {format(new Date(selectedSession.session_date), "d MMMM yyyy", { locale: fr })}
                  </span>
                </p>
                <p className="flex items-center gap-1">
                  <span className="text-muted-foreground">Score global : </span>
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">
                    {selectedSession.global_score?.toFixed(1) || "—"}/5
                  </span>
                </p>
              </div>

              <Separator />

              {scoresLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : sessionScores && sessionScores.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Détail par étape
                  </h3>
                  {sessionScores.map((score) => (
                    <Card key={score.id}>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm">
                          {(score as any).step?.label} — {(score as any).step?.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 py-2">
                        {score.criteria_scores &&
                          (score.criteria_scores as number[]).length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-muted-foreground">Scores :</span>
                              {(score.criteria_scores as number[]).map((s, i) => (
                                <Badge key={i} variant="secondary">
                                  {s}/5
                                </Badge>
                              ))}
                            </div>
                          )}

                        {score.debrief_responses &&
                          (score.debrief_responses as string[]).length > 0 && (
                            <div>
                              <span className="text-xs text-muted-foreground">Observations :</span>
                              <ul className="mt-1 space-y-1">
                                {(score.debrief_responses as string[]).map((opt, i) => (
                                  <li key={i} className="text-sm flex gap-2">
                                    <span className="text-muted-foreground">•</span>
                                    <span>{opt}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                        {score.notes && (
                          <div>
                            <span className="text-xs text-muted-foreground">Notes :</span>
                            <p className="text-sm mt-1 bg-muted/50 p-2 rounded">{score.notes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucun détail disponible pour cette session.
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
