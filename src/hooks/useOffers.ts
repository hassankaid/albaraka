import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Catalogue des offres officielles (AL BARAKA, Liberty, formations à la
 * carte). Source des prix et fourchettes de mensualités pour le checkout.
 */
export type OfferCategory = "al_baraka" | "liberty" | "a_la_carte";

export interface Offer {
  id: string;
  slug: string;
  category: OfferCategory;
  label: string;
  default_price_ht: number;
  min_installments_count: number;
  max_installments_count: number;
  formation_id: string | null;
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
}

export function useOffers() {
  return useQuery({
    queryKey: ["offers"],
    queryFn: async (): Promise<Offer[]> => {
      const { data, error } = await (supabase as any)
        .from("offers")
        .select("*")
        .order("category", { ascending: true })
        .order("label", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Offer[];
    },
  });
}

export function useOfferBySlug(slug: string | null) {
  return useQuery({
    queryKey: ["offer", slug],
    enabled: !!slug,
    queryFn: async (): Promise<Offer | null> => {
      if (!slug) return null;
      const { data, error } = await (supabase as any)
        .from("offers")
        .select("*")
        .eq("slug", slug)
        .eq("status", "active")
        .maybeSingle();
      if (error) throw error;
      return (data as Offer) ?? null;
    },
  });
}

export function useUpdateOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id: string;
      default_price_ht?: number;
      min_installments_count?: number;
      max_installments_count?: number;
      status?: "active" | "archived";
      label?: string;
    }) => {
      const { id, ...patch } = params;
      const { error } = await (supabase as any).from("offers").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["offers"] });
      qc.invalidateQueries({ queryKey: ["offer"] });
    },
  });
}
