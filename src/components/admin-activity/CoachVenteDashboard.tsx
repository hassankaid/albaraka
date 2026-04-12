import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCurrentPlanWeek } from "@/lib/closing/dates";
import { getPhaseForWeek, TOTAL_WEEKS } from "@/lib/closing/phases";
import { EMOTIONS_BY_ID } from "@/lib/closing/emotions";
import { WeekCard } from "@/components/activity-vente/WeekCard";
import { cn } from "@/lib/utils";

interface StudentRow {
  plan_id: string;
  user_id: string;
  full_name: string;
  pass_type: string;
  started_at: string;
  status: string;
  logs_count: number;
  rp_d_total: number;
  rp_c_total: number;
  sales_total: number;
  top_emotion: string | null;
}

function useStudentsRollup() {
  return useQuery({
    queryKey: ["admin-closing-plans-rollup"],
    queryFn: async (): Promise<StudentRow[]> => {
      const { data: plans, error } = await supabase
        .from("closing_plans")
        .select("id, user_id, pass_type, started_at, status")
        .order("started_at", { ascending: false });
      if (error) throw error;

      const planIds = (plans ?? []).map((p) => p.id);
      const userIds = Array.from(new Set((plans ?? []).map((p) => p.user_id)));

      type ProfileRow = { id: string; full_name: string };
      type LogRow = { plan_id: string; rp_d: number; rp_c: number; emotions: string[] };
      type SaleRow = { closed_by: string | null };

      const [profilesRes, logsRes, salesRes] = await Promise.all([
        userIds.length
          ? supabase.from("profiles").select("id, full_name").in("id", userIds)
          : Promise.resolve({ data: [] as ProfileRow[] }),
        planIds.length
          ? supabase.from("closing_daily_logs").select("plan_id, rp_d, rp_c, emotions").in("plan_id", planIds)
          : Promise.resolve({ data: [] as LogRow[] }),
        userIds.length
          ? supabase.from("sales").select("closed_by").in("closed_by", userIds)
          : Promise.resolve({ data: [] as SaleRow[] }),
      ]);

      const nameById = new Map<string, string>();
      for (const p of (profilesRes.data ?? []) as ProfileRow[]) nameById.set(p.id, p.full_name);

      const logsByPlan = new Map<string, { rp_d: number; rp_c: number; count: number; emotions: string[] }>();
      for (const l of (logsRes.data ?? []) as LogRow[]) {
        const cur = logsByPlan.get(l.plan_id) ?? { rp_d: 0, rp_c: 0, count: 0, emotions: [] };
        cur.rp_d += l.rp_d ?? 0;
        cur.rp_c += l.rp_c ?? 0;
        cur.count += 1;
        cur.emotions.push(...(l.emotions ?? []));
        logsByPlan.set(l.plan_id, cur);
      }

      const salesByUser = new Map<string, number>();
      for (const s of (salesRes.data ?? []) as SaleRow[]) {
        if (s.closed_by) salesByUser.set(s.closed_by, (salesByUser.get(s.closed_by) ?? 0) + 1);
      }

      return (plans ?? []).map((p): StudentRow => {
        const agg = logsByPlan.get(p.id);
        let topEmotion: string | null = null;
        if (agg && agg.emotions.length > 0) {
          const counts: Record<string, number> = {};
          for (const e of agg.emotions) counts[e] = (counts[e] ?? 0) + 1;
          topEmotion = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
        }
        return {
          plan_id: p.id,
          user_id: p.user_id,
          full_name: nameById.get(p.user_id) ?? "—",
          pass_type: p.pass_type,
          started_at: p.started_at,
          status: p.status,
          logs_count: agg?.count ?? 0,
          rp_d_total: agg?.rp_d ?? 0,
          rp_c_total: agg?.rp_c ?? 0,
          sales_total: salesByUser.get(p.user_id) ?? 0,
          top_emotion: topEmotion,
        };
      });
    },
  });
}

function getFillColor(current: number, expected: number) {
  if (expected === 0) return "bg-muted";
  const ratio = current / expected;
  if (ratio >= 0.8) return "bg-green-500/20 text-green-700 dark:text-green-400";
  if (ratio >= 0.4) return "bg-amber-500/20 text-amber-700 dark:text-amber-400";
  return "bg-red-500/15 text-red-700 dark:text-red-400";
}

type PlanStatus = "active" | "paused" | "completed";

async function setPlanStatus(planId: string, status: PlanStatus) {
  const { error } = await supabase.from("closing_plans").update({ status }).eq("id", planId);
  if (error) throw error;
}

export function CoachVenteDashboard() {
  const { data, isLoading, refetch } = useStudentsRollup();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const selected = useMemo(
    () => data?.find((r) => r.user_id === selectedUserId) ?? null,
    [data, selectedUserId],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Aucun plan closing actif. Les plans se créent automatiquement à l'activation d'un Pass.
        </CardContent>
      </Card>
    );
  }

  if (selected) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setSelectedUserId(null)}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Retour à la liste
          </button>
          <div className="flex items-center gap-2">
            <Select
              value={selected.status}
              onValueChange={async (v) => {
                await setPlanStatus(selected.plan_id, v as PlanStatus);
                refetch();
              }}
            >
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Actif</SelectItem>
                <SelectItem value="paused">En pause</SelectItem>
                <SelectItem value="completed">Terminé</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Card>
          <CardContent className="p-4">
            <h3 className="font-serif text-lg">{selected.full_name}</h3>
            <p className="text-xs text-muted-foreground">
              Pass {selected.pass_type} · démarré le{" "}
              {format(new Date(selected.started_at), "d MMM yyyy", { locale: fr })}
            </p>
          </CardContent>
        </Card>
        <StudentPlanReadonly userId={selected.user_id} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="hidden sm:grid grid-cols-[1fr_80px_80px_80px_60px_60px_80px] gap-2 px-3 py-2 text-[11px] uppercase text-muted-foreground">
        <div>Élève</div>
        <div className="text-center">Semaine</div>
        <div className="text-center">Jours</div>
        <div className="text-center">RP D</div>
        <div className="text-center">RP C</div>
        <div className="text-center">Ventes</div>
        <div className="text-center">Statut</div>
      </div>
      {data.map((s) => {
        const currentWeek = getCurrentPlanWeek(s.started_at);
        const expectedLogs = Math.min(currentWeek * 7, TOTAL_WEEKS * 7);
        const phase = getPhaseForWeek(currentWeek);
        const topEm = s.top_emotion ? EMOTIONS_BY_ID.get(s.top_emotion) : null;
        return (
          <Card
            key={s.plan_id}
            className="cursor-pointer hover:border-[#C9A84C]/50 transition"
            onClick={() => setSelectedUserId(s.user_id)}
          >
            <CardContent className="p-3 sm:grid sm:grid-cols-[1fr_80px_80px_80px_60px_60px_80px] sm:gap-2 sm:items-center flex flex-wrap gap-2 items-center">
              <div className="flex items-center gap-2 min-w-0">
                <div className="min-w-0">
                  <div className="text-sm text-foreground truncate flex items-center gap-2">
                    {s.full_name}
                    {topEm && <span title={topEm.label}>{topEm.emoji}</span>}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {phase.name} · {s.pass_type}
                  </div>
                </div>
              </div>
              <div className="text-center text-sm">
                <span className="font-serif font-bold">{currentWeek}</span>
                <span className="text-muted-foreground">/12</span>
              </div>
              <div
                className={cn(
                  "text-center text-xs rounded px-1 py-0.5",
                  getFillColor(s.logs_count, expectedLogs),
                )}
              >
                {s.logs_count}/{expectedLogs}
              </div>
              <div className="text-center text-sm">{s.rp_d_total}</div>
              <div className="text-center text-sm">{s.rp_c_total}</div>
              <div className="text-center text-sm">{s.sales_total}</div>
              <div className="text-center">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px]",
                    s.status === "active" && "border-green-500/40 text-green-700 dark:text-green-400",
                    s.status === "paused" && "border-amber-500/40 text-amber-700 dark:text-amber-400",
                    s.status === "completed" && "border-muted text-muted-foreground",
                  )}
                >
                  {s.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function StudentPlanReadonly({ userId }: { userId: string }) {
  const { plan, logs, sales, isLoading } = useCoachStudentPlan(userId);
  const currentWeek = plan ? getCurrentPlanWeek(plan.started_at) : 1;
  const noop = async () => {};

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!plan) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">Aucun plan trouvé.</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2.5">
      {Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1).map((w) => (
        <WeekCard
          key={w}
          startedAt={plan.started_at}
          weekNumber={w}
          logs={logs}
          allLogs={logs}
          sales={sales}
          defaultOpen={w === currentWeek}
          readonly
          onSaveDay={noop}
          isSaving={false}
        />
      ))}
    </div>
  );
}

function useCoachStudentPlan(userId: string) {
  const planQ = useQuery({
    queryKey: ["coach-student-plan", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("closing_plans")
        .select("*")
        .eq("user_id", userId)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const planId = planQ.data?.id ?? null;

  const logsQ = useQuery({
    queryKey: ["coach-student-logs", planId],
    enabled: !!planId,
    queryFn: async () => {
      const { data } = await supabase
        .from("closing_daily_logs")
        .select("*")
        .eq("plan_id", planId!);
      return data ?? [];
    },
  });

  const salesQ = useQuery({
    queryKey: ["coach-student-sales", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("sales")
        .select("id, sold_at, amount_ht, product, closed_by, contact_id")
        .eq("closed_by", userId);
      return data ?? [];
    },
  });

  return {
    plan: planQ.data,
    logs: logsQ.data ?? [],
    sales: salesQ.data ?? [],
    isLoading: planQ.isLoading || logsQ.isLoading,
  };
}
