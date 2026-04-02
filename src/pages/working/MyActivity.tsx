import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Video, MessageCircle, Mail, CalendarCheck, ShoppingCart, Sparkles, TrendingUp, Trophy, Medal, HelpCircle, ChevronLeft, ChevronRight, Target, Zap, Award } from "lucide-react";
import { toast } from "sonner";
import { startOfWeek, format, subWeeks, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const KPI_CONFIG = [
  { key: "videos_published", label: "Vidéos publiées", icon: Video, color: "hsl(var(--primary))" },
  { key: "messages_sent", label: "Messages envoyés", icon: MessageCircle, color: "hsl(262 80% 55%)" },
  { key: "replies_received", label: "Réponses reçues", icon: Mail, color: "hsl(150 60% 45%)" },
  { key: "appointments", label: "RDV obtenus", icon: CalendarCheck, color: "hsl(35 90% 55%)" },
  { key: "sales_made", label: "Ventes réalisées", icon: ShoppingCart, color: "hsl(350 70% 55%)" },
] as const;

const OBJECTIVE_KEYS = ["videos_published", "messages_sent", "appointments"] as const;

const OBJ_MAP: Record<string, string> = {
  videos_published: "videos",
  messages_sent: "messages",
  appointments: "appointments",
};

function getMonday(date: Date) {
  return startOfWeek(date, { weekStartsOn: 1 });
}

function formatWeekLabel(monday: Date) {
  const sunday = addDays(monday, 6);
  const monLabel = format(monday, "d MMMM", { locale: fr });
  const sunLabel = format(sunday, "d MMMM yyyy", { locale: fr });
  return `Semaine du ${monLabel} au ${sunLabel}`;
}

function computeScore(kpis: any, objectives: Record<string, number>) {
  const ratios = OBJECTIVE_KEYS.map((key) => {
    const target = objectives[OBJ_MAP[key]] || 1;
    return (kpis[key] || 0) / target;
  });
  const avg = ratios.reduce((a, b) => a + b, 0) / ratios.length * 100;
  const attained = ratios.filter((r) => r >= 1).length;
  const bonus = 1 + 0.1 * attained;
  return parseFloat((avg * bonus).toFixed(1));
}

const medalIcons = [
  <Trophy key="gold" className="h-5 w-5 text-amber-500" />,
  <Medal key="silver" className="h-5 w-5 text-gray-400" />,
  <Medal key="bronze" className="h-5 w-5 text-orange-600" />,
];

// ─── Shared Leaderboard Component ───
function Leaderboard({ ranked, highlightUserId }: { ranked: any[]; highlightUserId?: string }) {
  if (ranked.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune saisie cette semaine.</p>;
  }

  return (
    <div className="space-y-3">
      {ranked.map((r: any, i: number) => {
        const isMe = highlightUserId && r.user_id === highlightUserId;
        return (
          <div
            key={r.id || r.user_id}
            className={`flex items-center gap-3 p-3 rounded-lg ${isMe ? "bg-primary/10 ring-1 ring-primary/30" : "bg-secondary/50"}`}
          >
            <div className="w-8 text-center">
              {i < 3 ? medalIcons[i] : <span className="text-sm font-medium text-muted-foreground">{i + 1}</span>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">
                {isMe ? `${r.name} (moi)` : r.name}
              </p>
              <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                <span>📹 {r.videos_published}</span>
                <span>💬 {r.messages_sent}</span>
                <span>📩 {r.replies_received}</span>
                <span>📅 {r.appointments}</span>
                <span>🛒 {r.sales_made}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-foreground">{typeof r.score === 'number' ? r.score.toFixed(1) : r.score}</span>
              <p className="text-xs text-muted-foreground">pts</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Score Explanation Card ───
function ScoreExplanation() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
          Comment est calculé mon score ?
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10">
                <Target className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm font-semibold text-foreground">Base</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Moyenne de tes % d'atteinte sur les 3 objectifs : vidéos, messages et RDV.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-amber-500/10">
                <Zap className="h-4 w-4 text-amber-500" />
              </div>
              <p className="text-sm font-semibold text-foreground">Dépassement</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Pas de plafond à 100 % — dépasser un objectif rapporte plus de points.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-emerald-500/10">
                <Award className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="text-sm font-semibold text-foreground">Bonus régularité</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              +10 % par objectif atteint ou dépassé (max +30 %).
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Leaderboard with Tabs ───
function LeaderboardWithTabs({ weeklyRanked, allTimeRanked, highlightUserId }: {
  weeklyRanked: any[];
  allTimeRanked: any[];
  highlightUserId?: string;
}) {
  return (
    <Card>
      <Tabs defaultValue="week">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            Classement
          </CardTitle>
          <TabsList className="h-8">
            <TabsTrigger value="week" className="text-xs px-3 h-7">Semaine</TabsTrigger>
            <TabsTrigger value="alltime" className="text-xs px-3 h-7">All Time</TabsTrigger>
          </TabsList>
        </CardHeader>
        <CardContent>
          <TabsContent value="week" className="mt-0">
            <Leaderboard ranked={weeklyRanked} highlightUserId={highlightUserId} />
          </TabsContent>
          <TabsContent value="alltime" className="mt-0">
            <Leaderboard ranked={allTimeRanked} highlightUserId={highlightUserId} />
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}

// ─── All-time leaderboard hook ───
function useAllTimeRanked(objectives: Record<string, number> | undefined) {
  const { data: allKpisAllTime } = useQuery({
    queryKey: ["activity-kpis", "all-time"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_kpis")
        .select("*, profiles:user_id(full_name, avatar_url)");
      if (error) throw error;
      return data;
    },
  });

  return useMemo(() => {
    if (!allKpisAllTime || !objectives) return [];
    const byUser: Record<string, { name: string; weeks: any[] }> = {};
    allKpisAllTime.forEach((k: any) => {
      const uid = k.user_id;
      if (!byUser[uid]) {
        byUser[uid] = { name: k.profiles?.full_name || "Inconnu", weeks: [] };
      }
      byUser[uid].weeks.push(k);
    });

    return Object.entries(byUser)
      .map(([user_id, { name, weeks }]) => {
        const totalScore = weeks.reduce((sum, w) => sum + computeScore(w, objectives), 0);
        const avgScore = Math.round(totalScore / weeks.length);
        const totals = weeks.reduce(
          (acc, w) => ({
            videos_published: acc.videos_published + w.videos_published,
            messages_sent: acc.messages_sent + w.messages_sent,
            replies_received: acc.replies_received + w.replies_received,
            appointments: acc.appointments + w.appointments,
            sales_made: acc.sales_made + w.sales_made,
          }),
          { videos_published: 0, messages_sent: 0, replies_received: 0, appointments: 0, sales_made: 0 }
        );
        return { user_id, name, score: avgScore, ...totals };
      })
      .sort((a, b) => b.score - a.score);
  }, [allKpisAllTime, objectives]);
}

// ─── CEO Admin View ───
function CeoLeaderboard() {
  const currentMonday = getMonday(new Date());
  const weekLabel = formatWeekLabel(currentMonday);

  const { data: objectives } = useQuery({
    queryKey: ["activity-objectives"],
    queryFn: async () => {
      const { data, error } = await supabase.from("activity_objectives").select("*");
      if (error) throw error;
      const map: Record<string, number> = {};
      data?.forEach((o: any) => { map[o.kpi_key] = o.weekly_target; });
      return map;
    },
  });

  const { data: allKpis, isLoading } = useQuery({
    queryKey: ["activity-kpis", "all", format(currentMonday, "yyyy-MM-dd")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_kpis")
        .select("*, profiles:user_id(full_name, avatar_url)")
        .eq("week_start", format(currentMonday, "yyyy-MM-dd"));
      if (error) throw error;
      return data;
    },
  });

  const weeklyRanked = useMemo(() => {
    if (!allKpis || !objectives) return [];
    return allKpis
      .map((k: any) => ({
        ...k,
        name: k.profiles?.full_name || "Inconnu",
        score: computeScore(k, objectives),
      }))
      .sort((a: any, b: any) => b.score - a.score);
  }, [allKpis, objectives]);

  const allTimeRanked = useAllTimeRanked(objectives);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Classement Activité</h2>
        <p className="text-muted-foreground">{weekLabel}</p>
      </div>

      <LeaderboardWithTabs weeklyRanked={weeklyRanked} allTimeRanked={allTimeRanked} />
      <ScoreExplanation />
    </div>
  );
}

// ─── Apporteur/Collaborateur View ───
export default function MyActivity() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const currentMonday = getMonday(new Date());
  const isCeo = profile?.role === "ceo";

  const [selectedMonday, setSelectedMonday] = useState(currentMonday);
  const weekLabel = formatWeekLabel(selectedMonday);
  const isCurrentWeek = format(selectedMonday, "yyyy-MM-dd") === format(currentMonday, "yyyy-MM-dd");

  const [form, setForm] = useState({
    videos_published: 0,
    messages_sent: 0,
    replies_received: 0,
    appointments: 0,
    sales_made: 0,
  });

  const { data: objectives } = useQuery({
    queryKey: ["activity-objectives"],
    queryFn: async () => {
      const { data, error } = await supabase.from("activity_objectives").select("*");
      if (error) throw error;
      const map: Record<string, number> = {};
      data?.forEach((o: any) => { map[o.kpi_key] = o.weekly_target; });
      return map;
    },
  });

  const { data: currentKpi, isLoading } = useQuery({
    queryKey: ["activity-kpis", "current", user?.id, format(selectedMonday, "yyyy-MM-dd")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_kpis")
        .select("*")
        .eq("user_id", user!.id)
        .eq("week_start", format(selectedMonday, "yyyy-MM-dd"))
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: history } = useQuery({
    queryKey: ["activity-kpis", "history", user?.id],
    queryFn: async () => {
      const eightWeeksAgo = format(subWeeks(currentMonday, 8), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("activity_kpis")
        .select("*")
        .eq("user_id", user!.id)
        .gte("week_start", eightWeeksAgo)
        .order("week_start", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Leaderboard data
  const { data: allKpis } = useQuery({
    queryKey: ["activity-kpis", "all", format(currentMonday, "yyyy-MM-dd")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_kpis")
        .select("*, profiles:user_id(full_name, avatar_url)")
        .eq("week_start", format(currentMonday, "yyyy-MM-dd"));
      if (error) throw error;
      return data;
    },
    enabled: !isCeo,
  });

  const weeklyRanked = useMemo(() => {
    if (!allKpis || !objectives) return [];
    return allKpis
      .map((k: any) => ({
        ...k,
        name: k.profiles?.full_name || "Inconnu",
        score: computeScore(k, objectives),
      }))
      .sort((a: any, b: any) => b.score - a.score);
  }, [allKpis, objectives]);

  const allTimeRanked = useAllTimeRanked(objectives);

  useMemo(() => {
    if (currentKpi) {
      setForm({
        videos_published: currentKpi.videos_published,
        messages_sent: currentKpi.messages_sent,
        replies_received: currentKpi.replies_received,
        appointments: currentKpi.appointments,
        sales_made: currentKpi.sales_made,
      });
    } else {
      setForm({ videos_published: 0, messages_sent: 0, replies_received: 0, appointments: 0, sales_made: 0 });
    }
  }, [currentKpi]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const weekStart = format(selectedMonday, "yyyy-MM-dd");
      const payload = { user_id: user!.id, week_start: weekStart, ...form };

      if (currentKpi) {
        const { error } = await supabase.from("activity_kpis").update(form).eq("id", currentKpi.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("activity_kpis").insert(payload);
        if (error) throw error;
      }

      try {
        const historyForAI = (history || []).slice(-4).map((h: any) => ({
          week: h.week_start,
          videos: h.videos_published,
          messages: h.messages_sent,
          replies: h.replies_received,
          appointments: h.appointments,
          sales: h.sales_made,
        }));

        const { data: aiData } = await supabase.functions.invoke("activity-ai-coach", {
          body: { kpis: form, objectives, history: historyForAI },
        });

        if (aiData?.feedback) {
          await supabase
            .from("activity_kpis")
            .update({ ai_feedback: aiData.feedback })
            .eq("user_id", user!.id)
            .eq("week_start", weekStart);
        }
      } catch {
        // AI feedback is non-blocking
      }
    },
    onSuccess: () => {
      toast.success("Semaine validée !");
      queryClient.invalidateQueries({ queryKey: ["activity-kpis"] });
    },
    onError: () => toast.error("Erreur lors de la sauvegarde"),
  });

  const getObjective = (kpiKey: string) => objectives?.[OBJ_MAP[kpiKey]] || 0;
  const getPercentage = (value: number, target: number) => target > 0 ? Math.round((value / target) * 100) : 0;

  const chartData = useMemo(() => {
    if (!history || history.length < 2) return [];
    return history.map((h: any) => ({
      week: format(new Date(h.week_start), "d MMM", { locale: fr }),
      Vidéos: h.videos_published,
      Messages: Math.round(h.messages_sent / 10),
      Réponses: h.replies_received,
      RDV: h.appointments,
      Ventes: h.sales_made,
    }));
  }, [history]);

  const latestFeedback = currentKpi?.ai_feedback || null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isCeo) {
    return <CeoLeaderboard />;
  }

  const displayValues = currentKpi ? {
    videos_published: currentKpi.videos_published,
    messages_sent: currentKpi.messages_sent,
    replies_received: currentKpi.replies_received,
    appointments: currentKpi.appointments,
    sales_made: currentKpi.sales_made,
  } : form;

  const objectiveKpis = KPI_CONFIG.filter((k) => (OBJECTIVE_KEYS as readonly string[]).includes(k.key));

  return (
    <div className="space-y-6">
      {/* Header with week navigation */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Mon Activité</h2>
          <p className="text-muted-foreground">{weekLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSelectedMonday(subWeeks(selectedMonday, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSelectedMonday(addDays(selectedMonday, 7))}
            disabled={isCurrentWeek}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Objectifs hebdo — only 3 KPIs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Objectifs hebdomadaires
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {objectiveKpis.map(({ key, label, icon: Icon, color }) => {
            const value = displayValues[key];
            const target = getObjective(key);
            const pct = getPercentage(value, target);
            const capped = Math.min(pct, 100);

            return (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" style={{ color }} />
                    <span className="font-medium">{label}</span>
                  </div>
                  <span className={`font-semibold ${pct >= 100 ? "text-emerald-500" : "text-foreground"}`}>
                    {value}/{target} ({pct}%)
                    {pct > 100 && <span className="ml-1 text-xs bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded-full">×{(pct / 100).toFixed(1)}</span>}
                  </span>
                </div>
                <Progress value={capped} className="h-2" />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Coach IA */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Coach IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          {latestFeedback ? (
            <p className="text-sm whitespace-pre-line">{latestFeedback}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Bienvenue ! Remplis ta première semaine pour démarrer ton suivi et recevoir des conseils personnalisés. 🚀
            </p>
          )}
        </CardContent>
      </Card>

      {/* Saisie hebdo — all 5 KPIs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Saisie hebdomadaire</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {KPI_CONFIG.map(({ key, label, icon: Icon }) => (
              <div key={key} className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  {label}
                </label>
                <Input
                  type="number"
                  min={0}
                  value={form[key]}
                  onChange={(e) => setForm((prev) => ({ ...prev, [key]: parseInt(e.target.value) || 0 }))}
                />
              </div>
            ))}
          </div>
          <Button
            className="mt-4 w-full sm:w-auto"
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending}
          >
            {submitMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {currentKpi ? "Mettre à jour" : "Valider ma semaine"}
          </Button>
          {currentKpi?.updated_at && (
            <p className="text-xs text-muted-foreground mt-2">
              Dernière saisie : {format(new Date(currentKpi.updated_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Classement */}
      <LeaderboardWithTabs weeklyRanked={weeklyRanked} allTimeRanked={allTimeRanked} highlightUserId={user?.id} />

      {/* Note explicative du score */}
      <ScoreExplanation />

      {/* Graphique d'évolution */}
      {chartData.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Évolution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="week" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Vidéos" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="Messages" fill="hsl(262 80% 55%)" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="Réponses" fill="hsl(150 60% 45%)" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="RDV" fill="hsl(35 90% 55%)" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="Ventes" fill="hsl(350 70% 55%)" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted-foreground mt-2">* Messages divisés par 10 pour lisibilité</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
