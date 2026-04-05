import { pdf } from "@react-pdf/renderer";
import { createElement } from "react";
import { supabase } from "@/integrations/supabase/client";
import InvoicePdfDocument, {
  type InvoicePdfData,
  type InvoicePdfLine,
} from "@/components/invoices/InvoicePdfDocument";

/**
 * Fetches the HTML version of an invoice for preview purposes.
 * The preview intentionally does NOT trigger a regeneration — it reads the HTML
 * from Storage for a fast visual check.
 */
export async function fetchInvoiceHtml(storedPath: string): Promise<string> {
  const htmlPath = toHtmlPath(storedPath);

  const { data, error } = await supabase.storage
    .from("invoices")
    .createSignedUrl(htmlPath, 3600);

  if (error || !data?.signedUrl) {
    throw new Error("Impossible de récupérer l'aperçu de la facture");
  }

  const response = await fetch(data.signedUrl);
  if (!response.ok) {
    throw new Error("Impossible de charger l'aperçu");
  }
  return await response.text();
}

/** Normalises any stored path to its .html variant. */
function toHtmlPath(storedPath: string): string {
  return storedPath.endsWith(".pdf")
    ? storedPath.replace(/\.pdf$/, ".html")
    : storedPath;
}

/**
 * Calls the edge function to regenerate an invoice's HTML in Storage.
 */
async function invokeRegeneration(invoiceId: string): Promise<void> {
  const { data: invoice, error: invErr } = await supabase
    .from("apporteur_invoices")
    .select("apporteur_id, period_month, period_year")
    .eq("id", invoiceId)
    .maybeSingle();

  if (invErr || !invoice) {
    throw new Error("Facture introuvable");
  }

  const { data, error } = await supabase.functions.invoke(
    "generate-apporteur-invoice",
    {
      body: {
        apporteur_id: invoice.apporteur_id,
        month: invoice.period_month,
        year: invoice.period_year,
        regenerate: true,
      },
    }
  );

  if (error || (data as any)?.error) {
    throw new Error(
      (data as any)?.error ?? error?.message ?? "Régénération échouée"
    );
  }
}

/**
 * Public helper for callers that want to explicitly regenerate without downloading.
 */
export async function regenerateInvoicePdf(invoiceId: string): Promise<void> {
  await invokeRegeneration(invoiceId);
}

/**
 * Fetches all data needed to build the PDF from the database.
 */
async function fetchInvoiceData(invoiceId: string): Promise<InvoicePdfData> {
  const { data: invoice, error: invErr } = await supabase
    .from("apporteur_invoices")
    .select("id, invoice_number, period_month, period_year, total_amount, apporteur_id")
    .eq("id", invoiceId)
    .single();

  if (invErr || !invoice) {
    throw new Error("Facture introuvable");
  }

  const [{ data: lines }, { data: profile }] = await Promise.all([
    supabase
      .from("invoice_lines")
      .select("client_name, payment_amount, payment_date, commission_percentage, commission_amount, sale_id, payment_id, payments!invoice_lines_payment_id_fkey(payment_number, total_payments)")
      .eq("invoice_id", invoiceId)
      .order("created_at", { ascending: true }),
    supabase
      .from("profiles")
      .select("full_name, email, phone, address, postal_code, city, country, siret, bank_details")
      .eq("id", invoice.apporteur_id)
      .single(),
  ]);

  return {
    invoiceNumber: invoice.invoice_number,
    month: invoice.period_month,
    year: invoice.period_year,
    totalAmount: Number(invoice.total_amount),
    apporteur: {
      full_name: profile?.full_name,
      email: profile?.email,
      phone: profile?.phone,
      address: profile?.address,
      postal_code: profile?.postal_code,
      city: profile?.city,
      country: profile?.country,
      siret: profile?.siret,
    },
    bankDetails: profile?.bank_details as InvoicePdfData["bankDetails"],
    lines: (lines || []).map((l: any) => ({
      client_name: l.client_name,
      payment_amount: l.payment_amount,
      payment_date: l.payment_date,
      commission_percentage: l.commission_percentage,
      commission_amount: l.commission_amount,
      sale_id: l.sale_id,
      payment_number: l.payments?.payment_number ?? null,
      total_payments: l.payments?.total_payments ?? null,
    })),
  };
}

/**
 * Builds a real PDF blob from invoice data using @react-pdf/renderer.
 */
async function buildPdfBlob(data: InvoicePdfData): Promise<Blob> {
  const doc = createElement(InvoicePdfDocument, { data });
  return await pdf(doc).toBlob();
}

/**
 * Downloads a fresh PDF for an invoice.
 *
 * Every click triggers a fresh server-side regeneration (to keep Storage HTML in sync)
 * then builds a real vector PDF client-side from the database data.
 */
export async function downloadInvoicePdf(
  invoiceNumber: string,
  _storedPath: string,
  invoiceId?: string,
  options?: { skipRegeneration?: boolean }
): Promise<void> {
  if (!invoiceId) {
    throw new Error("invoiceId requis pour régénérer la facture");
  }

  // Regenerate HTML in Storage (keeps preview in sync) — CEO only
  if (!options?.skipRegeneration) {
    await invokeRegeneration(invoiceId);
  }

  // Build real PDF from database data
  const data = await fetchInvoiceData(invoiceId);
  const blob = await buildPdfBlob(data);

  triggerBrowserDownload(blob, `${invoiceNumber}.pdf`);
}

/**
 * Returns a fresh PDF as a Blob — used by the bulk download zipper.
 */
export async function generateInvoicePdfBlob(
  invoiceNumber: string,
  _storedPath: string,
  invoiceId?: string,
  options?: { skipRegeneration?: boolean }
): Promise<Blob> {
  if (!invoiceId) {
    throw new Error(`invoiceId requis pour régénérer ${invoiceNumber}`);
  }

  if (!options?.skipRegeneration) {
    await invokeRegeneration(invoiceId);
  }

  const data = await fetchInvoiceData(invoiceId);
  return buildPdfBlob(data);
}

function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
