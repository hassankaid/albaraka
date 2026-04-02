import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, User, Users, TrendingUp, Calendar, Star } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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
  const navigate = useNavigate();

  const canSeeTeam = profile?.role === 'ceo' || profile?.is_coach === true;

  const { data: mySessions, isLoading: mySessionsLoading } = useQuery({
    queryKey: ["my-coaching-sessions", profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coaching_sessions")
        .select(`
          *,
          coach_type:coach_types(id, label, theme_color),
          student:profiles!coaching_sessions_student_user_id_fkey(id, email, full_name),
          coach:profiles!coaching_sessions_coach_user_id_fkey(id, email, full_name)
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
      let query = supabase
        .from("coaching_sessions")
        .select(`
          *,
          coach_type:coach_types(id, label, theme_color),
          student:profiles!coaching_sessions_student_user_id_fkey(id, email, full_name),
          coach:profiles!coaching_sessions_coach_user_id_fkey(id, email, full_name)
        `)
        .eq("status", "completed")
        .order("session_date", { ascending: false })
        .limit(50);

      if (profile?.role === 'ceo') {
        query = query.neq("student_user_id", profile!.id);
      } else {
        // Coach: voir les sessions qu'il a menées
        query = query.eq("coach_user_id", profile!.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as SessionWithDetails[];
    },
    enabled: !!profile?.id && canSeeTeam,
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

  const SessionCard = ({
    session,
    showStudent = false,
  }: {
    session: SessionWithDetails;
    showStudent?: boolean;
  }) => (
    <div
      onClick={() => navigate(`/mon-coaching/session/${session.id}`)}
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
              <>Élève : {session.student?.full_name || session.student?.email}</>
            ) : (
              <>Coach : {session.coach?.full_name || session.coach?.email}</>
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

      {/* Sessions */}
      {canSeeTeam ? (
        <Tabs defaultValue="mine">
          <TabsList>
            <TabsTrigger value="mine" className="flex items-center gap-2">
              <User className="h-4 w-4" /> Mes sessions
            </TabsTrigger>
            <TabsTrigger value="team" className="flex items-center gap-2">
              <Users className="h-4 w-4" /> Sessions coachées
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
                <CardTitle>{profile?.role === 'ceo' ? "Sessions de l'équipe" : "Sessions que j'ai coachées"}</CardTitle>
                <CardDescription>
                  {profile?.role === 'ceo'
                    ? "Consultez l'ensemble des sessions de coaching."
                    : "Retrouvez les sessions que vous avez menées en tant que coach."}
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
                    <p>Aucune session disponible pour le moment.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
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
      )}
    </div>
  );
}
