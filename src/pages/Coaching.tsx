import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Users, TrendingUp, Calendar, GraduationCap, ClipboardList } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import NewSessionDialog from "@/components/coaching/NewSessionDialog";

export default function Coaching() {
  const { profile } = useAuth();

  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ["coaching-sessions", profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coaching_sessions")
        .select(`
          *,
          coach_types(id, name, label, theme_color),
          student:profiles!coaching_sessions_student_user_id_fkey(id, full_name)
        `)
        .eq("coach_user_id", profile!.id)
        .order("session_date", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  const [showNewSession, setShowNewSession] = useState(false);
  const canCoach = profile?.is_coach || profile?.role === "ceo";

  if (sessionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canCoach) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Espace Coaching</h1>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <GraduationCap className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-foreground">
              Vous n'êtes pas encore désigné comme coach.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Contactez votre administrateur pour obtenir l'accès.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completedSessions = sessions?.filter((s) => s.status === "completed") || [];
  const totalSessions = sessions?.length || 0;
  const avgScore =
    completedSessions.length > 0
      ? (
          completedSessions.reduce((sum, s) => sum + (s.global_score ?? 0), 0) /
          completedSessions.filter((s) => s.global_score != null).length
        ).toFixed(1)
      : "—";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Espace Coaching</h1>
        <Button className="gradient-primary gap-2" onClick={() => setShowNewSession(true)}>
          <Plus className="h-4 w-4" />
          Nouvelle session
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sessions totales</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{totalSessions}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sessions terminées</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{completedSessions.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Score moyen</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{avgScore}/5</p>
          </CardContent>
        </Card>
      </div>

      {/* Sessions list */}
      <Card>
        <CardHeader>
          <CardTitle>Mes sessions de coaching</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions && sessions.length > 0 ? (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border border-border hover:bg-secondary/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                      style={{ backgroundColor: session.coach_types?.theme_color || "hsl(var(--primary))" }}
                    >
                      {(session.student as any)?.full_name
                        ?.split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2) || "?"}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {(session.student as any)?.full_name || "Élève inconnu"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {(session.coach_types as any)?.label}
                        {session.sub_mode && ` — ${session.sub_mode}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <div className="text-right">
                      <p className="text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {format(new Date(session.session_date), "d MMMM yyyy", { locale: fr })}
                      </p>
                      <p className="text-xs text-muted-foreground">Session #{session.session_number}</p>
                    </div>
                    <Badge variant={session.status === "completed" ? "default" : "secondary"}>
                      {session.status === "completed" ? "Terminée" : "Brouillon"}
                    </Badge>
                    {session.global_score != null && (
                      <span className="font-semibold text-foreground">{Number(session.global_score).toFixed(1)}/5</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <GraduationCap className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-4">Aucune session de coaching pour le moment.</p>
              <Button className="gradient-primary gap-2" onClick={() => setShowNewSession(true)}>
                <Plus className="h-4 w-4" />
                Créer ma première session
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      <NewSessionDialog open={showNewSession} onOpenChange={setShowNewSession} />
    </div>
  );
}
