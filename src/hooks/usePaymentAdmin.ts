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

/**
 * Déclenche MANUELLEMENT le prélèvement de la prochaine mensualité pending
 * d'une vente (CEO uniquement). Charge la carte enregistrée via PaymentIntent
 * off-session puis décale toutes les mensualités suivantes de -1 mois, en
 * recréant la Stripe Subscription avec le nouveau cycle.
 *
 * Retour OK : { ok: true, payment_intent_id, amount_charged, reschedule[],
 *               old_subscription_id, new_subscription_id, stripe_mode }
 *
 * Retour KO (200 + ok:false) si pas de carte enregistrée :
 *   { ok: false, error_code: "no_payment_method", checkout_url }
 * Retour KO (402) si la carte est refusée :
 *   { ok: false, error_code: "payment_failed", stripe_decline_code, ... }
 */
export function useTriggerInstallment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { payment_id: string }) => {
      const { data, error } = await (supabase as any).functions.invoke(
        "trigger-installment-now",
        { body: { payment_id: input.payment_id } },
      );
      if (error) throw error;
      return data as {
        ok: boolean;
        error_code?: string;
        message?: string;
        payment_intent_id?: string;
        amount_charged?: number;
        reschedule?: { id: string; old_due_date: string; new_due_date: string; amount: number }[];
        old_subscription_id?: string | null;
        new_subscription_id?: string | null;
        new_sub_warning?: string | null;
        stripe_mode?: "live" | "test";
        checkout_url?: string;
        stripe_error_code?: string;
        stripe_decline_code?: string;
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments-list"] });
      qc.invalidateQueries({ queryKey: ["schedule"] });
      qc.invalidateQueries({ queryKey: ["commissions"] });
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["financial"] });
    },
  });
}

/**
 * Filet de sécurité quand `trigger-installment-now` a laissé une vente sans
 * Stripe Subscription active (ancienne sub canceled, nouvelle pas créée).
 * Crée une nouvelle Stripe Sub pour les pending restantes en repartant de la
 * première due_date future, et update les rows BDD avec le nouveau sub_id.
 *
 * Retour OK : { ok: true, new_subscription_id, attached_payments[], ... }
 * Retour KO si la sub existante est encore active (409 existing_sub_still_active).
 * Passer `force: true` pour forcer la création malgré une sub active.
 */
export function useRepairSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { sale_id: string; force?: boolean }) => {
      const { data, error } = await (supabase as any).functions.invoke(
        "repair-sale-subscription",
        { body: { sale_id: input.sale_id, force: !!input.force } },
      );
      if (error) throw error;
      return data as {
        ok: boolean;
        error_code?: string;
        message?: string;
        new_subscription_id?: string;
        old_subscription_id?: string | null;
        attached_payments?: { id: string; payment_number: number; due_date: string; amount: number }[];
        stripe_mode?: "live" | "test";
        anchor_date?: string;
        cancel_after?: string;
        existing_sub_id?: string;
        existing_sub_status?: string;
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments-list"] });
      qc.invalidateQueries({ queryKey: ["schedule"] });
      qc.invalidateQueries({ queryKey: ["sales"] });
    },
  });
}

/**
 * Supprime une vente complète (CEO uniquement).
 * Cascade auto sur payments + commissions via FK.
 * Bloqué côté DB si invoice_lines existent ou si la vente a des ventes filles.
 */
export function useDeleteSaleAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sale_id: string) => {
      const { error } = await (supabase.rpc as any)("delete_sale_admin", { p_sale_id: sale_id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["payments-list"] });
      qc.invalidateQueries({ queryKey: ["schedule"] });
      qc.invalidateQueries({ queryKey: ["commissions"] });
      qc.invalidateQueries({ queryKey: ["financial"] });
    },
  });
}
