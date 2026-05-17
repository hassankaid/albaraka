import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CouponDiscountType = "percent" | "fixed_eur";

export interface Coupon {
  id: string;
  code: string;
  discount_type: CouponDiscountType;
  discount_percent: number | null;
  discount_amount_eur: number | null;
  applies_to_offer_ids: string[] | null;
  applies_to_categories: string[] | null;
  active: boolean;
  expires_at: string | null;
  max_redemptions: number | null;
  times_redeemed: number;
  stripe_coupon_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useCoupons() {
  return useQuery({
    queryKey: ["coupons"],
    queryFn: async (): Promise<Coupon[]> => {
      const { data, error } = await (supabase as any)
        .from("coupons")
        .select("*")
        .order("active", { ascending: false })
        .order("code", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Coupon[];
    },
  });
}

export function useCreateCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      code: string;
      discount_type: CouponDiscountType;
      discount_percent?: number | null;
      discount_amount_eur?: number | null;
      applies_to_offer_ids?: string[] | null;
      applies_to_categories?: string[] | null;
      active?: boolean;
      expires_at?: string | null;
      max_redemptions?: number | null;
    }) => {
      const payload = {
        ...input,
        code: input.code.trim().toUpperCase(),
        // Cohérence : si percent, vider amount_eur (et inversement)
        discount_percent: input.discount_type === "percent" ? input.discount_percent : null,
        discount_amount_eur: input.discount_type === "fixed_eur" ? input.discount_amount_eur : null,
        active: input.active ?? true,
      };
      const { data, error } = await (supabase as any).from("coupons").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coupons"] }),
  });
}

export function useUpdateCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string } & Partial<Omit<Coupon, "id" | "created_at" | "updated_at" | "times_redeemed">>) => {
      const { id, ...patch } = params;
      const { error } = await (supabase as any).from("coupons").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coupons"] }),
  });
}

export function useDeleteCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("coupons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coupons"] }),
  });
}
