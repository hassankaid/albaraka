// useClientInvoice — flow complet de génération + envoi de factures clients.
//
// Workflow PDF :
//   1. RPC create_client_invoice(payment_id) : crée la row DB avec numéro
//      séquentiel (idempotent — retourne l'existante si déjà créée).
//   2. Front génère le Blob PDF via @react-pdf/renderer.
//   3. Front upload le PDF dans Storage `invoices/clients/{contact_id}/{number}.pdf`.
//   4. RPC set_client_invoice_pdf_path(invoice_id, path) : update html_path.
//   5. (optionnel) Edge function send-client-invoice : fetch le PDF, l'attache
//      en PJ Resend, met à jour email_sent_at.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  generateClientInvoicePdfBlob,
  type ClientInvoicePdfData,
} from "@/components/invoices/ClientInvoicePdfDocument";

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
  html_path: string | null; // path PDF dans Storage (nom de colonne historique)
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

/** Récupère un lien signé Storage 30 jours (PDF rendu nativement par le browser). */
export async function getInvoiceSignedUrl(pdfPath: string): Promise<string> {
  const { data, error } = await (supabase as any).storage
    .from("invoices")
    .createSignedUrl(pdfPath, 60 * 60 * 24 * 30);
  if (error || !data?.signedUrl) throw new Error("Impossible de récupérer le lien");
  return data.signedUrl;
}

/**
 * Génère le PDF côté front + upload Storage + update DB.
 * Idempotent : si déjà existant, ne re-upload pas (retourne le path existant).
 */
async function generateAndUploadPdf(input: {
  payment_id: string;
  forceRegenerate?: boolean;
}): Promise<{ invoice: ClientInvoice; pdfPath: string }> {
  // 1. Crée (ou récupère) la row DB via RPC
  const { data: invRows, error: rpcErr } = await (supabase.rpc as any)(
    "create_client_invoice",
    { p_payment_id: input.payment_id },
  );
  if (rpcErr) throw rpcErr;
  if (!invRows || invRows.length === 0) throw new Error("Failed to create invoice row");
  const invoiceRow = invRows[0];

  // 2. Si PDF déjà uploadé et pas force regenerate → on réutilise
  const { data: full } = await (supabase as any)
    .from("client_invoices")
    .select("*")
    .eq("id", invoiceRow.id)
    .single();
  const existing: ClientInvoice = full;

  if (existing.html_path && !input.forceRegenerate) {
    return { invoice: existing, pdfPath: existing.html_path };
  }

  // 3. Génère le PDF côté front
  const pdfData: ClientInvoicePdfData = {
    invoiceNumber: invoiceRow.invoice_number,
    paidAt: invoiceRow.paid_at,
    amount: Number(invoiceRow.amount),
    paymentNumber: invoiceRow.payment_number,
    totalPayments: invoiceRow.total_payments,
    product: invoiceRow.product || "PASS AL BARAKA",
    client: {
      name: invoiceRow.client_name,
      email: invoiceRow.client_email,
      address: invoiceRow.client_address,
      postal_code: invoiceRow.client_postal_code,
      city: invoiceRow.client_city,
      country: invoiceRow.client_country,
    },
  };
  const pdfBlob = await generateClientInvoicePdfBlob(pdfData);

  // 4. Upload Storage
  const pdfPath = `clients/${invoiceRow.contact_id}/${invoiceRow.invoice_number}.pdf`;
  const { error: uploadErr } = await (supabase as any).storage
    .from("invoices")
    .upload(pdfPath, pdfBlob, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (uploadErr) throw uploadErr;

  // 5. Update DB row avec le path
  const { error: setErr } = await (supabase.rpc as any)("set_client_invoice_pdf_path", {
    p_invoice_id: invoiceRow.id,
    p_pdf_path: pdfPath,
  });
  if (setErr) throw setErr;

  return { invoice: { ...existing, html_path: pdfPath }, pdfPath };
}

/** Mutation : génère le PDF (sans envoi). */
export function useGeneratePdfOnly() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { payment_id: string; forceRegenerate?: boolean }) => {
      return await generateAndUploadPdf(input);
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["client-invoice", variables.payment_id] });
    },
  });
}

/** Mutation : génère (si nécessaire) + envoie l'email avec PJ PDF via edge function. */
export function useSendClientInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      payment_id: string;
      email_to_override?: string;
    }) => {
      // 1. S'assurer que le PDF existe
      await generateAndUploadPdf({ payment_id: input.payment_id });

      // 2. Appeler l'edge function pour envoi avec PJ
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
