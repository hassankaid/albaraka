// useClientInvoice — wrappers React Query pour la edge function generate-client-invoice.
//
// 3 modes d'usage :
//   1. fetchInvoiceForPayment(paymentId)        : lit la facture existante en DB
//   2. generatePreview(paymentId, testEmail)    : génère l'HTML + envoie à testEmail (CEO)
//   3. sendToClient(paymentId)                  : envoie au vrai client + marque email_sent_at

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
  html_path: string | null;
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

/** Récupère un lien signé Storage 30 jours pour visualiser l'HTML de la facture. */
export async function getInvoiceSignedUrl(htmlPath: string): Promise<string> {
  const { data, error } = await (supabase as any).storage
    .from("invoices")
    .createSignedUrl(htmlPath, 60 * 60 * 24 * 30);
  if (error || !data?.signedUrl) throw new Error("Impossible de récupérer le lien");
  return data.signedUrl;
}

interface InvokeArgs {
  payment_id: string;
  send_email?: boolean;
  email_to_override?: string;
  regenerate?: boolean;
}

/** Mutation principale : invoque la edge function. */
export function useGenerateClientInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: InvokeArgs) => {
      const { data, error } = await (supabase.functions as any).invoke("generate-client-invoice", {
        body: input,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["client-invoice", variables.payment_id] });
      qc.invalidateQueries({ queryKey: ["payments-list"] });
      qc.invalidateQueries({ queryKey: ["schedule"] });
    },
  });
}
