// useClientInvoice — wrappers pour invoke la edge function generate-client-invoice.
//
// Le PDF est entièrement généré côté serveur (Deno + pdf-lib). Le front
// se contente d'invoquer la function et d'afficher le résultat.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ClientInvoice {
  id: string;
  invoice_number: string;
  payment_id: string;
  sale_id: string | null;
  contact_id: string | null;
  client_name: string;
  client_email: string | null;
  amount: number;
  payment_number: number | null;
  total_payments: number | null;
  product: string | null;
  paid_at: string;
  html_path: string | null; // path du PDF dans Storage (nom historique)
  email_sent_at: string | null;
  email_sent_to: string | null;
  created_at: string;
}

/** Lit la facture existante pour un payment (null si pas encore générée). */
export function useClientInvoiceForPayment(paymentId: string | null) {
  return useQuery({
    queryKey: ["client-invoice", paymentId],
    enabled: !!paymentId,
    queryFn: async (): Promise<ClientInvoice | null> => {
      const { data, error } = await (supabase as any)
        .from("client_invoices")
        .select("*")
        .eq("payment_id", paymentId)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });
}

/** Lien signé Storage 30 jours pour preview PDF dans le navigateur. */
export async function getInvoiceSignedUrl(pdfPath: string): Promise<string> {
  const { data, error } = await (supabase as any).storage
    .from("invoices")
    .createSignedUrl(pdfPath, 60 * 60 * 24 * 30);
  if (error || !data?.signedUrl) throw new Error("Impossible de récupérer le lien");
  return data.signedUrl;
}

/** Mutation : génère le PDF (sans envoi email). */
export function useGeneratePdfOnly() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { payment_id: string; regenerate?: boolean }) => {
      const { data, error } = await (supabase.functions as any).invoke(
        "generate-client-invoice",
        {
          body: {
            payment_id: input.payment_id,
            send_email: false,
            regenerate: input.regenerate,
          },
        },
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["client-invoice", variables.payment_id] });
    },
  });
}

/** Mutation : génère + envoie email avec PJ PDF (override email pour test). */
export function useSendClientInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { payment_id: string; email_to_override?: string }) => {
      const { data, error } = await (supabase.functions as any).invoke(
        "generate-client-invoice",
        {
          body: {
            payment_id: input.payment_id,
            send_email: true,
            email_to_override: input.email_to_override,
          },
        },
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["client-invoice", variables.payment_id] });
    },
  });
}
