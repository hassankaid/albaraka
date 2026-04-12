import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { addDays } from "date-fns";
import { getPlanWeekStart, ymd } from "@/lib/closing/dates";
import { TOTAL_WEEKS } from "@/lib/closing/phases";

export interface ClosingPlan {
  id: string;
  user_id: string;
  pass_type: "al_baraka" | "liberty";
  started_at: string;
  targets: { rp_d: number; rp_c: number };
  status: "active" | "paused" | "completed";
  created_at: string;
  updated_at: string;
}

export interface ClosingDailyLog {
  id: string;
  plan_id: string;
  entry_date: string;
  rp_d: number;
  rp_c: number;
  emotions: string[];
  feeling: string | null;
  learning: string | null;
  updated_at: string;
}

export interface PlanSale {
  id: string;
  sold_at: string;
  amount_ht: number;
  product: string | null;
  closed_by: string | null;
  contact_id: string | null;
}

export interface ClaimableSale extends PlanSale {
  call_id: string | null;
}

export type DailyLogPatch = Partial<Pick<ClosingDailyLog, "rp_d" | "rp_c" | "emotions" | "feeling" | "learning">>;

export function useClosingPlan(userId?: string | null) {
  const { user } = useAuth();
  const effectiveUserId = userId ?? user?.id ?? null;
  const qc = useQueryClient();

  const planQuery = useQuery({
    queryKey: ["closing-plan", effectiveUserId],
    enabled: !!effectiveUserId,
    queryFn: async (): Promise<ClosingPlan | null> => {
      const { data, error } = await supabase
        .from("closing_plans")
        .select("*")
        .eq("user_id", effectiveUserId!)
        .in("status", ["active", "paused"])
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as ClosingPlan | null;
    },
  });

  const planId = planQuery.data?.id ?? null;
  const startedAt = planQuery.data?.started_at ?? null;

  const logsQuery = useQuery({
    queryKey: ["closing-daily-logs", planId],
    enabled: !!planId,
    queryFn: async (): Promise<ClosingDailyLog[]> => {
      const { data, error } = await supabase
        .from("closing_daily_logs")
        .select("*")
        .eq("plan_id", planId!)
        .order("entry_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ClosingDailyLog[];
    },
  });

  const planEnd = useMemo(() => {
    if (!startedAt) return null;
    return ymd(addDays(getPlanWeekStart(startedAt, TOTAL_WEEKS), 6));
  }, [startedAt]);

  const salesQuery = useQuery({
    queryKey: ["closing-plan-sales", effectiveUserId, startedAt, planEnd],
    enabled: !!effectiveUserId && !!startedAt && !!planEnd,
    queryFn: async (): Promise<PlanSale[]> => {
      const { data, error } = await supabase
        .from("sales")
        .select("id, sold_at, amount_ht, product, closed_by, contact_id")
        .eq("closed_by", effectiveUserId!)
        .gte("sold_at", startedAt!)
        .lte("sold_at", `${planEnd!}T23:59:59+01:00`)
        .order("sold_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PlanSale[];
    },
  });

  const claimableQuery = useQuery({
    queryKey: ["closing-plan-claimable", effectiveUserId, startedAt, planEnd],
    enabled: !!effectiveUserId && !!startedAt && !!planEnd,
    queryFn: async (): Promise<ClaimableSale[]> => {
      const { data: myCalls, error: callsErr } = await supabase
        .from("calls")
        .select("contact_id")
        .eq("assigned_to", effectiveUserId!)
        .gte("scheduled_at", startedAt!)
        .not("contact_id", "is", null);
      if (callsErr) throw callsErr;
      const contactIds = Array.from(
        new Set(
          ((myCalls ?? []) as Array<{ contact_id: string | null }>)
            .map((c) => c.contact_id)
            .filter((v): v is string => !!v),
        ),
      );
      if (contactIds.length === 0) return [];

      const { data, error } = await supabase
        .from("sales")
        .select("id, sold_at, amount_ht, product, closed_by, contact_id, call_id")
        .is("closed_by", null)
        .in("contact_id", contactIds)
        .gte("sold_at", startedAt!)
        .lte("sold_at", `${planEnd!}T23:59:59+01:00`)
        .order("sold_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ClaimableSale[];
    },
  });

  const upsertLog = useMutation({
    mutationFn: async (input: { entryDate: string; patch: DailyLogPatch }) => {
      if (!planId) throw new Error("Aucun plan actif");
      const { entryDate, patch } = input;
      const { data, error } = await supabase
        .from("closing_daily_logs")
        .upsert(
          {
            plan_id: planId,
            entry_date: entryDate,
            rp_d: patch.rp_d ?? 0,
            rp_c: patch.rp_c ?? 0,
            emotions: patch.emotions ?? [],
            feeling: patch.feeling ?? null,
            learning: patch.learning ?? null,
          },
          { onConflict: "plan_id,entry_date" },
        )
        .select()
        .single();
      if (error) throw error;
      return data as ClosingDailyLog;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["closing-daily-logs", planId] });
    },
  });

  const claimSale = useMutation({
    mutationFn: async (saleId: string) => {
      if (!effectiveUserId) throw new Error("Non authentifié");
      const { data, error } = await supabase
        .from("sales")
        .update({ closed_by: effectiveUserId })
        .eq("id", saleId)
        .is("closed_by", null)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["closing-plan-sales"] });
      qc.invalidateQueries({ queryKey: ["closing-plan-claimable"] });
    },
  });

  return {
    plan: planQuery.data ?? null,
    logs: logsQuery.data ?? [],
    sales: salesQuery.data ?? [],
    claimableSales: claimableQuery.data ?? [],
    isLoading: planQuery.isLoading || logsQuery.isLoading,
    isError: planQuery.isError || logsQuery.isError,
    upsertLog,
    claimSale,
  };
}
