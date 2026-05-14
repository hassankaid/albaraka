// usePaymentLinks — gestion des liens de paiement sur mesure (espace admin/CEO).
//
// Un "lien de paiement sur mesure" = une commande définie de zéro par le CEO
// (produit / montant / échéancier libres), matérialisée par un token
// ALB-PL-XXXXXXXX et une URL /pay/<token>. Au paiement réussi, le webhook
// crée la vente + le plan de paiement et bascule le lien en 'paid'.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PaymentLink {
  id: string;
  token: string;
  product_label: string;
  total_amount: number;
  installments_count: number;
  deposit_amount: number | null;
  deferred_start_date: string | null;
  prefilled_contact_id: string | null;
  prefilled_full_name: string | null;
  prefilled_email: string | null;
  prefilled_phone: string | null;
  status: "active" | "paid" | "cancelled";
  sale_id: string | null;
  created_by: string | null;
  created_at: string;
  paid_at: string | null;
  cancelled_at: string | null;
  notes: string | null;
}

/** Liste tous les liens de paiement, plus récents d'abord. */
export function usePaymentLinks() {
  return useQuery({
    queryKey: ["payment-links"],
    queryFn: async (): Promise<PaymentLink[]> => {
      const { data, error } = await supabase
        .from("payment_links" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PaymentLink[];
    },
  });
}

export interface CreatePaymentLinkInput {
  productLabel: string;
  totalAmount: number;
  installmentsCount: number;
  /** Acompte initial optionnel (1er versement différent des mensualités). */
  depositAmount?: number | null;
  /** Date du 1er prélèvement si démarrage différé (format YYYY-MM-DD). */
  deferredStartDate?: string | null;
  /** Destinataire pré-rempli (optionnel — sinon lien générique). */
  prefilledFullName?: string | null;
  prefilledEmail?: string | null;
  prefilledPhone?: string | null;
  notes?: string | null;
}

/** Crée un lien via la RPC create_payment_link (CEO uniquement, côté SQL). */
export function useCreatePaymentLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePaymentLinkInput) => {
      const { data, error } = await supabase.rpc("create_payment_link" as any, {
        p_product_label: input.productLabel,
        p_total_amount: input.totalAmount,
        p_installments_count: input.installmentsCount,
        p_deposit_amount: input.depositAmount ?? null,
        p_deferred_start_date: input.deferredStartDate ?? null,
        p_prefilled_full_name: input.prefilledFullName ?? null,
        p_prefilled_email: input.prefilledEmail ?? null,
        p_prefilled_phone: input.prefilledPhone ?? null,
        p_notes: input.notes ?? null,
      });
      if (error) throw error;
      return data as { id: string; token: string };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payment-links"] }),
  });
}

/** Annule un lien (status → 'cancelled'). N'affecte pas une vente déjà créée. */
export function useCancelPaymentLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("payment_links" as any)
        .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payment-links"] }),
  });
}
