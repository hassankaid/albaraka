import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, startOfMonth, endOfMonth, format, addDays, subDays, isAfter, isSameDay } from "date-fns";

// ─── Types ──────────────────────────────────────────────────────────────────
export type DailyKpi = {
  id?: string;
  user_id?: string;
  entry_date: string;
  videos_published: number;
  messages_sent: number;
  replies_received: number;
  appointments: number;
  sales_made: number;
  ai_feedback?: string | null;
  updated_at?: string;
};

export type Objectives = {
  videos: number;
  messages: number;
  replies: number;
  appointments: number;
  sales: number;
};

export type WeekStripDay = {
  date: Date;
  dateStr: string;
  entry: DailyKpi | null;
  filled: boolean;
  isFuture: boolean;
  isToday: boolean;
};

export const KPI_KEYS = [
  "videos_published",
  "messages_sent",
  "replies_received",
  "appointments",
  "sales_made",
] as const;

export type KpiKey = (typeof KPI_KEYS)[number];

const OBJ_MAP: Record<KpiKey, keyof Objectives> = {
  videos_published: "videos",
  messages_sent: "messages",
  replies_received: "replies",
  appointments: "appointments",
  sales_made: "sales",
};

const SCORE_KEYS: KpiKey[] = ["videos_published", "messages_sent", "appointments"];

// ─── Score commun (3 KPIs : vidéos, messages, RDV) ──────────────────────────
export function computeScore(
  totals: Pick<DailyKpi, KpiKey>,
  targets: Objectives
): number {
  const ratios = SCORE_KEYS.map((key) => {
    const target = targets[OBJ_MAP[key]] || 1;
    return (totals[key] || 0) / target;
  });
  const avg = (ratios.reduce((a, b) => a + b, 0) / ratios.length) * 100;
  const attained = ratios.filter((r) => r >= 1).length;
  const bonus = 1 + 0.1 * attained;
  return parseFloat((avg * bonus).toFixed(1));
}

// ─── Helpers de dates (semaine ISO, lundi → dimanche) ───────────────────────
export function getMondayOf(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function ymd(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function listWeekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

// ─── Hook principal : toutes les données dont MyActivity a besoin ───────────
export function useActivityData(userId: string | undefined) {
  const queryClient = useQueryClient();
  const today = new Date();
  const todayStr = ymd(today);
  const yesterdayStr = ymd(subDays(today, 1));
  const monday = getMondayOf(today);
  const sundayStr = ymd(addDays(monday, 6));
  const mondayStr = ymd(monday);

  // ─── Objectifs (cibles hebdo + quotidiennes) ──────────────────────────────
  const { data: objectivesData } = useQuery({
    queryKey: ["activity-objectives"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_objectives")
        .select("kpi_key, weekly_target, daily_target");
      if (error) throw error;
      return data;
    },
  });

  const objectives = useMemo<Objectives>(() => {
    const w: Objectives = { videos: 7, messages: 500, replies: 10, appointments: 10, sales: 3 };
    objectivesData?.forEach((o: any) => {
      const k = o.kpi_key as keyof Objectives;
      if (k in w) w[k] = o.weekly_target;
    });
    return w;
  }, [objectivesData]);

  const objectivesDaily = useMemo<Objectives>(() => {
    const d: Objectives = { videos: 1, messages: 72, replies: 2, appointments: 2, sales: 1 };
    objectivesData?.forEach((o: any) => {
      const k = o.kpi_key as keyof Objectives;
      if (k in d && typeof o.daily_target === "number") d[k] = o.daily_target;
    });
    return d;
  }, [objectivesData]);

  // ─── Saisies de la semaine en cours pour l'utilisateur ────────────────────
  const { data: weekDays = [], isLoading: weekLoading } = useQuery({
    queryKey: ["activity-daily", "week", userId, mondayStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_daily_kpis")
        .select("*")
        .eq("user_id", userId)
        .gte("entry_date", mondayStr)
        .lte("entry_date", sundayStr)
        .order("entry_date", { ascending: true });
      if (error) throw error;
      return (data || []) as DailyKpi[];
    },
    enabled: !!userId,
  });

  const todayEntry = weekDays.find((d) => d.entry_date === todayStr) || null;
  const yesterdayEntry = weekDays.find((d) => d.entry_date === yesterdayStr) || null;

  // ─── Historique 30 jours pour le chart quotidien et le calcul mensuel ─────
  const monthStart = ymd(startOfMonth(today));
  const monthEnd = ymd(endOfMonth(today));

  const { data: monthDays = [] } = useQuery({
    queryKey: ["activity-daily", "month", userId, monthStart, monthEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_daily_kpis")
        .select("*")
        .eq("user_id", userId)
        .gte("entry_date", monthStart)
        .lte("entry_date", monthEnd)
        .order("entry_date", { ascending: true });
      if (error) throw error;
      return (data || []) as DailyKpi[];
    },
    enabled: !!userId,
  });

  // ─── Historique hebdomadaire (vue) pour le chart 8 semaines ───────────────
  const { data: weeklyHistory = [] } = useQuery({
    queryKey: ["activity-weekly-totals", userId],
    queryFn: async () => {
      const eightWeeksAgo = ymd(subDays(monday, 8 * 7));
      const { data, error } = await supabase
        .from("activity_weekly_totals")
        .select("*")
        .eq("user_id", userId)
        .gte("week_start", eightWeeksAgo)
        .order("week_start", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  // ─── Récap hebdo en attente (bannière du lundi) ───────────────────────────
  const { data: pendingRecap } = useQuery({
    queryKey: ["activity-recap", "pending", userId],
    queryFn: async () => {
      const lastMonday = ymd(subDays(monday, 7));
      const { data, error } = await supabase
        .from("activity_weekly_recaps")
        .select("*")
        .eq("user_id", userId)
        .eq("week_start", lastMonday)
        .is("dismissed_at", null)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // ─── Mutation : sauvegarde d'une journée + appel coach IA ─────────────────
  const saveDayMutation = useMutation({
    mutationFn: async (params: {
      entryDate: string;
      values: Pick<DailyKpi, KpiKey>;
    }) => {
      if (!userId) throw new Error("Not authenticated");

      const existing = weekDays.find((d) => d.entry_date === params.entryDate);

      let savedRow: DailyKpi;
      if (existing?.id) {
        const { data, error } = await supabase
          .from("activity_daily_kpis")
          .update(params.values)
          .eq("id", existing.id)
          .select()
          .single();
        if (error) throw error;
        savedRow = data as DailyKpi;
      } else {
        const { data, error } = await supabase
          .from("activity_daily_kpis")
          .insert({ user_id: userId, entry_date: params.entryDate, ...params.values })
          .select()
          .single();
        if (error) throw error;
        savedRow = data as DailyKpi;
      }

      // Coach IA — uniquement pour la saisie du jour (pas pour les backfills)
      if (params.entryDate === todayStr) {
        try {
          const last7Map = new Map<string, DailyKpi>();
          weekDays.forEach((d) => last7Map.set(d.entry_date, d));
          last7Map.set(savedRow.entry_date, savedRow);
          const last7: (DailyKpi | null)[] = Array.from({ length: 7 }, (_, i) => {
            const d = ymd(subDays(today, 6 - i));
            return last7Map.get(d) || null;
          });

          const { data: aiData } = await supabase.functions.invoke("activity-ai-coach-daily", {
            body: {
              today: savedRow,
              yesterday: yesterdayEntry,
              last7,
              objectives_daily: objectivesDaily,
            },
          });

          if (aiData?.feedback) {
            await supabase
              .from("activity_daily_kpis")
              .update({ ai_feedback: aiData.feedback })
              .eq("id", savedRow.id);
          }
        } catch {
          // Non bloquant
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity-daily"] });
      queryClient.invalidateQueries({ queryKey: ["activity-leaderboard"] });
    },
  });

  // ─── Action : dismiss le récap hebdo ──────────────────────────────────────
  const dismissRecap = async () => {
    if (!pendingRecap?.id) return;
    await supabase
      .from("activity_weekly_recaps")
      .update({ dismissed_at: new Date().toISOString() })
      .eq("id", pendingRecap.id);
    queryClient.invalidateQueries({ queryKey: ["activity-recap"] });
  };

  // ─── Construction du week strip (7 jours Mon → Dim) ───────────────────────
  const weekStrip = useMemo(() => {
    return listWeekDays(monday).map((day) => {
      const dStr = ymd(day);
      const entry = weekDays.find((d) => d.entry_date === dStr);
      const isFuture = isAfter(day, today) && !isSameDay(day, today);
      const isToday = isSameDay(day, today);
      return {
        date: day,
        dateStr: dStr,
        entry: entry || null,
        filled: !!entry,
        isFuture,
        isToday,
      };
    });
  }, [weekDays, monday, today]);

  return {
    today,
    todayStr,
    monday,
    objectives,
    objectivesDaily,
    todayEntry,
    yesterdayEntry,
    weekDays,
    weekStrip,
    monthDays,
    weeklyHistory,
    pendingRecap,
    saveDayMutation,
    dismissRecap,
    isLoading: weekLoading,
  };
}

// ─── Hook leaderboards multi-périodes ───────────────────────────────────────
export function useActivityLeaderboards(objectives: Objectives, objectivesDaily: Objectives) {
  const today = new Date();
  const todayStr = ymd(today);
  const monday = getMondayOf(today);
  const mondayStr = ymd(monday);
  const sundayStr = ymd(addDays(monday, 6));
  const monthStart = ymd(startOfMonth(today));
  const monthEnd = ymd(endOfMonth(today));

  // Daily : entrées du jour pour tous les users
  const { data: dayRows = [] } = useQuery({
    queryKey: ["activity-leaderboard", "day", todayStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_daily_kpis")
        .select("*, profiles:user_id(full_name, avatar_url)")
        .eq("entry_date", todayStr);
      if (error) throw error;
      return data || [];
    },
  });

  // Weekly : tous les daily de la semaine courante (agrégation en JS)
  const { data: weekRows = [] } = useQuery({
    queryKey: ["activity-leaderboard", "week", mondayStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_daily_kpis")
        .select("*, profiles:user_id(full_name, avatar_url)")
        .gte("entry_date", mondayStr)
        .lte("entry_date", sundayStr);
      if (error) throw error;
      return data || [];
    },
  });

  // Monthly : tous les daily du mois pour tous les users
  const { data: monthRows = [] } = useQuery({
    queryKey: ["activity-leaderboard", "month", monthStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_daily_kpis")
        .select("*, profiles:user_id(full_name, avatar_url)")
        .gte("entry_date", monthStart)
        .lte("entry_date", monthEnd);
      if (error) throw error;
      return data || [];
    },
  });

  // All-time : toutes les saisies daily (agrégation par semaine en JS)
  const { data: allTimeRows = [] } = useQuery({
    queryKey: ["activity-leaderboard", "all-time"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_daily_kpis")
        .select("*, profiles:user_id(full_name, avatar_url)");
      if (error) throw error;
      return data || [];
    },
  });

  // ─── Daily ranked (score basé sur cibles quotidiennes) ──────────────────
  const dailyRanked = useMemo(() => {
    return dayRows
      .map((r: any) => ({
        user_id: r.user_id,
        name: r.profiles?.full_name || "Inconnu",
        videos_published: r.videos_published,
        messages_sent: r.messages_sent,
        replies_received: r.replies_received,
        appointments: r.appointments,
        sales_made: r.sales_made,
        score: computeScore(r, objectivesDaily),
      }))
      .sort((a, b) => b.score - a.score);
  }, [dayRows, objectivesDaily]);

  // ─── Weekly ranked (agrégation par user, score sur cibles hebdo) ────────
  const weeklyRanked = useMemo(() => {
    const byUser = new Map<string, any>();
    weekRows.forEach((r: any) => {
      const existing = byUser.get(r.user_id);
      if (!existing) {
        byUser.set(r.user_id, {
          user_id: r.user_id,
          name: r.profiles?.full_name || "Inconnu",
          videos_published: r.videos_published,
          messages_sent: r.messages_sent,
          replies_received: r.replies_received,
          appointments: r.appointments,
          sales_made: r.sales_made,
          days_filled: 1,
        });
      } else {
        existing.videos_published += r.videos_published;
        existing.messages_sent += r.messages_sent;
        existing.replies_received += r.replies_received;
        existing.appointments += r.appointments;
        existing.sales_made += r.sales_made;
        existing.days_filled += 1;
      }
    });
    return Array.from(byUser.values())
      .map((u) => ({ ...u, score: computeScore(u, objectives) }))
      .sort((a, b) => b.score - a.score);
  }, [weekRows, objectives]);

  // ─── Monthly ranked : agrégat des daily du mois, score sur cibles mensuelles ─
  const monthlyRanked = useMemo(() => {
    const byUser = new Map<string, any>();
    monthRows.forEach((r: any) => {
      const existing = byUser.get(r.user_id);
      if (!existing) {
        byUser.set(r.user_id, {
          user_id: r.user_id,
          name: r.profiles?.full_name || "Inconnu",
          videos_published: r.videos_published,
          messages_sent: r.messages_sent,
          replies_received: r.replies_received,
          appointments: r.appointments,
          sales_made: r.sales_made,
          days_filled: 1,
        });
      } else {
        existing.videos_published += r.videos_published;
        existing.messages_sent += r.messages_sent;
        existing.replies_received += r.replies_received;
        existing.appointments += r.appointments;
        existing.sales_made += r.sales_made;
        existing.days_filled += 1;
      }
    });

    // Cible mensuelle ≈ cible hebdo × 4.33 (semaines moyennes par mois)
    const monthlyTargets: Objectives = {
      videos: Math.round(objectives.videos * 4.33),
      messages: Math.round(objectives.messages * 4.33),
      replies: Math.round(objectives.replies * 4.33),
      appointments: Math.round(objectives.appointments * 4.33),
      sales: Math.round(objectives.sales * 4.33),
    };

    return Array.from(byUser.values())
      .map((u) => ({ ...u, score: computeScore(u, monthlyTargets) }))
      .sort((a, b) => b.score - a.score);
  }, [monthRows, objectives]);

  // ─── All-time ranked : agrégation daily → semaines → moyenne des scores ──
  const allTimeRanked = useMemo(() => {
    // 1. Group daily rows by (user_id, week_start)
    const weekKey = (date: string) => {
      const d = new Date(date + "T00:00:00Z");
      const day = d.getUTCDay();
      const offset = (day + 6) % 7;
      d.setUTCDate(d.getUTCDate() - offset);
      return d.toISOString().slice(0, 10);
    };

    const byUserWeek = new Map<string, any>();
    const userNames = new Map<string, string>();
    const userTotals = new Map<string, any>();

    allTimeRows.forEach((r: any) => {
      const wk = weekKey(r.entry_date);
      const key = `${r.user_id}|${wk}`;
      if (!userNames.has(r.user_id)) {
        userNames.set(r.user_id, r.profiles?.full_name || "Inconnu");
      }
      const existing = byUserWeek.get(key);
      if (!existing) {
        byUserWeek.set(key, {
          user_id: r.user_id,
          week_start: wk,
          videos_published: r.videos_published,
          messages_sent: r.messages_sent,
          replies_received: r.replies_received,
          appointments: r.appointments,
          sales_made: r.sales_made,
        });
      } else {
        existing.videos_published += r.videos_published;
        existing.messages_sent += r.messages_sent;
        existing.replies_received += r.replies_received;
        existing.appointments += r.appointments;
        existing.sales_made += r.sales_made;
      }

      const tot = userTotals.get(r.user_id) || {
        videos_published: 0,
        messages_sent: 0,
        replies_received: 0,
        appointments: 0,
        sales_made: 0,
      };
      tot.videos_published += r.videos_published;
      tot.messages_sent += r.messages_sent;
      tot.replies_received += r.replies_received;
      tot.appointments += r.appointments;
      tot.sales_made += r.sales_made;
      userTotals.set(r.user_id, tot);
    });

    // 2. Compute average weekly score per user
    const weeksByUser = new Map<string, any[]>();
    Array.from(byUserWeek.values()).forEach((w) => {
      const arr = weeksByUser.get(w.user_id) || [];
      arr.push(w);
      weeksByUser.set(w.user_id, arr);
    });

    return Array.from(weeksByUser.entries())
      .map(([user_id, weeks]) => {
        const total = weeks.reduce(
          (sum: number, w: any) => sum + computeScore(w, objectives),
          0
        );
        const avg = parseFloat((total / weeks.length).toFixed(1));
        const totals = userTotals.get(user_id) || {};
        return {
          user_id,
          name: userNames.get(user_id) || "Inconnu",
          videos_published: totals.videos_published || 0,
          messages_sent: totals.messages_sent || 0,
          replies_received: totals.replies_received || 0,
          appointments: totals.appointments || 0,
          sales_made: totals.sales_made || 0,
          score: avg,
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [allTimeRows, objectives]);

  return { dailyRanked, weeklyRanked, monthlyRanked, allTimeRanked };
}
