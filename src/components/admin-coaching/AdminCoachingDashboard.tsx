import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Calendar, TrendingUp, Users, AlertTriangle, Star, Medal, Trophy } from "lucide-react";
import { format, subDays, startOfMonth, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";

export default function AdminCoachingDashboard() {
  const { data: monthStats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-coaching-month-stats"],
    queryFn: async () => {
      const startOfCurrentMonth = startOfMonth(new Date()).toISOString().split("T")[0];

      const { data: sessions, error } = await supabase
        .from("coaching_sessions")
        .select("id, global_score, status")
        .gte("session_date", startOfCurrentMonth);

      if (error) throw error;

      const completed = sessions?.filter((s) => s.status === "completed") || [];
      const avgScore =
        completed.length > 0
          ? completed.reduce((acc, s) => acc + (s.global_score || 0), 0) / completed.length
          : 0;

      return {
        totalSessions: sessions?.length || 0,
        completedSessions: completed.length,
        averageScore: avgScore.toFixed(1),
      };
    },
  });

  const { data: activeCoaches } = useQuery({
    queryKey: ["admin-coaching-active-coaches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("is_coach", true)
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  const { data: recentActivity, isLoading: activityLoading } = useQuery({
    queryKey: ["admin-coaching-recent-activity"],
    queryFn: async () => {
      const sevenDaysAgo = subDays(new Date(), 7).toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("coaching_sessions")
        .select(`
          id, session_date, global_score, status,
          coach_type:coach_types(label, theme_color),
          student:profiles!coaching_sessions_student_user_id_fkey(full_name, email),
          coach:profiles!coaching_sessions_coach_user_id_fkey(full_name, email)
        `)
        .gte("session_date", sevenDaysAgo)
        .eq("status", "completed")
        .order("session_date", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });

  const { data: alerts } = useQuery({
    queryKey: ["admin-coaching-alerts"],
    queryFn: async () => {
      const alertsList: { type: string; message: string }[] = [];
      const twoWeeksAgo = subDays(new Date(), 14).toISOString().split("T")[0];

      const { data: coaches } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("is_coach", true)
        .eq("is_active", true);

      if (coaches) {
        for (const coach of coaches) {
          const { data: recentSessions } = await supabase
            .from("coaching_sessions")
            .select("id")
            .eq("coach_user_id", coach.id)
            .gte("session_date", twoWeeksAgo)
            .limit(1);

          if (!recentSessions || recentSessions.length === 0) {
            alertsList.push({
              type: "warning",
              message: `${coach.full_name || coach.email} n'a pas coaché depuis 2 semaines`,
            });
          }
        }
      }

      return alertsList.slice(0, 5);
    },
  });

  // Top apporteurs leaderboard
  const currentMonday = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const { data: leaderboard } = useQuery({
    queryKey: ["admin-coaching-leaderboard", currentMonday],
    queryFn: async () => {
      // Get objectives
      const { data: objData } = await supabase.from("activity_objectives").select("*");
      const objMap: Record<string, number> = {};
      objData?.forEach((o: any) => { objMap[o.kpi_key] = o.weekly_target; });

      // Get this week's KPIs
      const { data: kpis } = await supabase
        .from("activity_kpis")
        .select("*, user:profiles!activity_kpis_user_id_fkey(full_name, email, avatar_url)")
        .eq("week_start", currentMonday);

      if (!kpis || kpis.length === 0) return [];

      return kpis.map((k: any) => {
        const ratios = [
          (objMap.videos || 7) > 0 ? k.videos_published / (objMap.videos || 7) : 0,
          (objMap.messages || 500) > 0 ? k.messages_sent / (objMap.messages || 500) : 0,
          (objMap.replies || 10) > 0 ? k.replies_received / (objMap.replies || 10) : 0,
          (objMap.appointments || 10) > 0 ? k.appointments / (objMap.appointments || 10) : 0,
          (objMap.sales || 3) > 0 ? k.sales_made / (objMap.sales || 3) : 0,
        ];
        const avgPct = (ratios.reduce((a, b) => a + b, 0) / 5) * 100;
        const kpisReached = ratios.filter(r => r >= 1).length;
        const bonus = 1 + 0.1 * kpisReached;
        const score = avgPct * bonus;

        return {
          name: k.user?.full_name || k.user?.email || "—",
          avatar: k.user?.avatar_url,
          avgPct: Math.round(avgPct),
          kpisReached,
          score: Math.round(score * 10) / 10,
        };
      }).sort((a: any, b: any) => b.score - a.score).slice(0, 5);
    },
  });

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sessions ce mois
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{monthStats?.totalSessions || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {monthStats?.completedSessions || 0} terminées
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Score moyen
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{monthStats?.averageScore || "—"}/5</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Coachs actifs
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{activeCoaches?.length || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Alertes
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{alerts?.length || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activité récente</CardTitle>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : recentActivity && recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((session) => (
                  <div key={session.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: session.coach_type?.theme_color }}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {session.coach?.full_name || session.coach?.email} →{" "}
                          {session.student?.full_name || session.student?.email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {session.coach_type?.label}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                        <span>{session.global_score?.toFixed(1)}/5</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(session.session_date), "d MMM", { locale: fr })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Aucune activité récente</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alertes</CardTitle>
          </CardHeader>
          <CardContent>
            {alerts && alerts.length > 0 ? (
              <div className="space-y-3">
                {alerts.map((alert, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10">
                    <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <p className="text-sm">{alert.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Aucune alerte</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
