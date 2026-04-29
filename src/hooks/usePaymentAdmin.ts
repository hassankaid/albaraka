// Wrappers React Query pour les 4 RPC d'admin payments (CEO uniquement).
// Toutes les RPC sont SECURITY DEFINER côté Postgres avec check role='ceo'.
//
// - useUpdatePaymentAdmin : modifie due_date / amount / notes (cascade commissions)
// - useDeletePaymentAdmin : supprime une mensualité (interdit si paid)
// - useAddPaymentAdmin    : ajoute une nouvelle mensualité à une vente
// - useRecalculatePayments : redistribue le restant en N mensualités
//
// Toutes invalident "payments-list" et "schedule-:saleId" pour rafraîchir
// la table principale et la modale ouverte.

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useUpdatePaymentAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      payment_id: string;
      due_date?: string | null;
      amount?: number | null;
      notes?: string | null;
    }) => {
      const { data, error } = await (supabase.rpc as any)("update_payment_admin", {
        p_payment_id: input.payment_id,
        p_due_date: input.due_date ?? null,
        p_amount: input.amount ?? null,
        p_notes: input.notes ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments-list"] });
      qc.invalidateQueries({ queryKey: ["schedule"] });
      qc.invalidateQueries({ queryKey: ["commissions"] });
    },
  });
}

export function useDeletePaymentAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payment_id: string) => {
      const { error } = await (supabase.rpc as any)("delete_payment_admin", {
        p_payment_id: payment_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments-list"] });
      qc.invalidateQueries({ queryKey: ["schedule"] });
      qc.invalidateQueries({ queryKey: ["commissions"] });
    },
  });
}

export function useAddPaymentAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      sale_id: string;
      due_date: string;
      amount: number;
    }) => {
      const { data, error } = await (supabase.rpc as any)("add_payment_admin", {
        p_sale_id: input.sale_id,
        p_due_date: input.due_date,
        p_amount: input.amount,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments-list"] });
      qc.invalidateQueries({ queryKey: ["schedule"] });
      qc.invalidateQueries({ queryKey: ["commissions"] });
    },
  });
}

export function useRecalculatePayments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { sale_id: string; new_count: number }) => {
      const { error } = await (supabase.rpc as any)("recalculate_remaining_payments", {
        p_sale_id: input.sale_id,
        p_new_remaining_count: input.new_count,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments-list"] });
      qc.invalidateQueries({ queryKey: ["schedule"] });
      qc.invalidateQueries({ queryKey: ["commissions"] });
    },
  });
}
