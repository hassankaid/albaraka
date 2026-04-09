import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import type { DailyKpi } from "@/hooks/useActivityData";
import { ymd } from "@/hooks/useActivityData";

interface ActivityChartProps {
  monthDays: DailyKpi[];
  weeklyHistory: any[];
}

export function ActivityChart({ monthDays, weeklyHistory }: ActivityChartProps) {
  const [mode, setMode] = useState<"day" | "week">("day");

  // 7 derniers jours, complétés avec des zéros pour les jours sans saisie
  const dailyData = useMemo(() => {
    const today = new Date();
    const days: { date: string; entry?: DailyKpi }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = subDays(today, i);
      const ds = ymd(d);
      const entry = monthDays.find((md) => md.entry_date === ds);
      days.push({ date: ds, entry });
    }
    return days.map(({ date, entry }) => ({
      label: format(new Date(date), "EEE d", { locale: fr }),
      Vidéos: entry?.videos_published ?? 0,
      Messages: Math.round((entry?.messages_sent ?? 0) / 10),
      Réponses: entry?.replies_received ?? 0,
      RDV: entry?.appointments ?? 0,
      Ventes: entry?.sales_made ?? 0,
    }));
  }, [monthDays]);

  const weeklyData = useMemo(() => {
    return (weeklyHistory || []).map((h: any) => ({
      label: format(new Date(h.week_start), "d MMM", { locale: fr }),
      Vidéos: h.videos_published,
      Messages: Math.round(h.messages_sent / 10),
      Réponses: h.replies_received,
      RDV: h.appointments,
      Ventes: h.sales_made,
    }));
  }, [weeklyHistory]);

  const data = mode === "day" ? dailyData : weeklyData;
  const hasData = data.some((d) => d.Vidéos + d.Messages + d.Réponses + d.RDV + d.Ventes > 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">Évolution</CardTitle>
        <Tabs value={mode} onValueChange={(v) => setMode(v as "day" | "week")}>
          <TabsList className="h-8">
            <TabsTrigger value="day" className="text-xs px-3 h-7">7 derniers jours</TabsTrigger>
            <TabsTrigger value="week" className="text-xs px-3 h-7">8 dernières semaines</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" className="text-xs" />
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
          </>
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Pas encore assez de données pour afficher un graphique.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
