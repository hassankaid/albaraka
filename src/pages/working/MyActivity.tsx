import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Loader2, Video, MessageCircle, Mail, CalendarCheck, ShoppingCart, Sparkles, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { startOfWeek, format, subWeeks } from "date-fns";
import { fr } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const KPI_CONFIG = [
  { key: "videos_published", label: "Vidéos publiées", icon: Video, color: "hsl(var(--primary))" },
  { key: "messages_sent", label: "Messages envoyés", icon: MessageCircle, color: "hsl(262 80% 55%)" },
  { key: "replies_received", label: "Réponses reçues", icon: Mail, color: "hsl(150 60% 45%)" },
  { key: "appointments", label: "RDV obtenus", icon: CalendarCheck, color: "hsl(35 90% 55%)" },
  { key: "sales_made", label: "Ventes réalisées", icon: ShoppingCart, color: "hsl(350 70% 55%)" },
] as const;

const OBJ_MAP: Record<string, string> = {
  videos_published: "videos",
  messages_sent: "messages",
  replies_received: "replies",
  appointments: "appointments",
  sales_made: "sales",
};

function getMonday(date: Date) {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export default function MyActivity() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const currentMonday = getMonday(new Date());
  const weekLabel = `Semaine du ${format(currentMonday, "d MMMM", { locale: fr })}`;

  const [form, setForm] = useState({
    videos_published: 0,
    messages_sent: 0,
    replies_received: 0,
    appointments: 0,
    sales_made: 0,
  });

  // Fetch objectives
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

  // Fetch current week KPI
  const { data: currentKpi, isLoading } = useQuery({
    queryKey: ["activity-kpis", "current", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_kpis")
        .select("*")
        .eq("user_id", user!.id)
        .eq("week_start", format(currentMonday, "yyyy-MM-dd"))
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch history (last 8 weeks)
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

  // Pre-fill form when currentKpi loads
  useMemo(() => {
    if (currentKpi) {
      setForm({
        videos_published: currentKpi.videos_published,
        messages_sent: currentKpi.messages_sent,
        replies_received: currentKpi.replies_received,
        appointments: currentKpi.appointments,
        sales_made: currentKpi.sales_made,
      });
    }
  }, [currentKpi]);

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      const weekStart = format(currentMonday, "yyyy-MM-dd");
      const payload = { user_id: user!.id, week_start: weekStart, ...form };

      if (currentKpi) {
        const { error } = await supabase.from("activity_kpis").update(form).eq("id", currentKpi.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("activity_kpis").insert(payload);
        if (error) throw error;
      }

      // Call AI coach
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

  // Build chart data
  const chartData = useMemo(() => {
    if (!history || history.length < 2) return [];
    return history.map((h: any) => ({
      week: format(new Date(h.week_start), "d MMM", { locale: fr }),
      Vidéos: h.videos_published,
      Messages: Math.round(h.messages_sent / 10), // scale down for chart
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

  const displayValues = currentKpi ? {
    videos_published: currentKpi.videos_published,
    messages_sent: currentKpi.messages_sent,
    replies_received: currentKpi.replies_received,
    appointments: currentKpi.appointments,
    sales_made: currentKpi.sales_made,
  } : form;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Mon Activité</h2>
        <p className="text-muted-foreground">{weekLabel}</p>
      </div>

      {/* Objectifs hebdo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Objectifs hebdomadaires
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {KPI_CONFIG.map(({ key, label, icon: Icon, color }) => {
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

      {/* Saisie hebdo */}
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
        </CardContent>
      </Card>

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
