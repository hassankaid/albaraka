import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches the HTML version of an invoice for preview purposes.
 * The preview intentionally does NOT trigger a regeneration — it reads the HTML sibling
 * from Storage for a fast visual check. Use downloadInvoicePdf() when the user needs
 * a guaranteed-fresh PDF on disk.
 */
export async function fetchInvoiceHtml(storedPath: string): Promise<string> {
  const htmlPath = storedPath.endsWith(".pdf")
    ? storedPath.replace(/\.pdf$/, ".html")
    : storedPath;

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

/**
 * Calls the edge function to regenerate an invoice's HTML + PDF in Storage.
 * Returns when the fresh files are uploaded and apporteur_invoices.pdf_url is updated.
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
 * Public helper kept for backward compatibility with any caller that wants
 * to explicitly regenerate without downloading.
 */
export async function regenerateInvoicePdf(invoiceId: string): Promise<void> {
  await invokeRegeneration(invoiceId);
}

/**
 * Downloads the canonical PDF for an invoice.
 *
 * Every click triggers a fresh server-side regeneration before download. This guarantees:
 *   - The PDF always reflects the latest data in the database.
 *   - The PDF always reflects the latest version of the edge function (template, layout, fixes).
 *   - No stale cached PDFs are ever served.
 *
 * The trade-off is a 2–6 second latency per download depending on the number of lines.
 * This is intentional and acceptable for invoice use cases where freshness matters more
 * than instant downloads.
 */
export async function downloadInvoicePdf(
  invoiceNumber: string,
  storedPath: string,
  invoiceId?: string
): Promise<void> {
  const pdfPath = storedPath.endsWith(".pdf")
    ? storedPath
    : storedPath.replace(/\.html$/, ".pdf");

  if (!invoiceId) {
    throw new Error("invoiceId requis pour régénérer la facture");
  }

  // Always regenerate first — this is the whole point of this function.
  await invokeRegeneration(invoiceId);

  // Then fetch the freshly uploaded PDF from Storage.
  const { data: blob, error } = await supabase.storage
    .from("invoices")
    .download(pdfPath);

  if (error || !blob) {
    throw new Error("Impossible de télécharger le PDF après régénération");
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${invoiceNumber}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Returns a fresh PDF as a Blob — used by the bulk download zipper.
 * Same always-regenerate behavior as downloadInvoicePdf.
 */
export async function generateInvoicePdfBlob(
  invoiceNumber: string,
  storedPath: string,
  invoiceId?: string
): Promise<Blob> {
  const pdfPath = storedPath.endsWith(".pdf")
    ? storedPath
    : storedPath.replace(/\.html$/, ".pdf");

  if (!invoiceId) {
    throw new Error(`invoiceId requis pour régénérer ${invoiceNumber}`);
  }

  await invokeRegeneration(invoiceId);

  const { data, error } = await supabase.storage
    .from("invoices")
    .download(pdfPath);

  if (error || !data) {
    throw new Error(`Impossible de récupérer le PDF pour ${invoiceNumber}`);
  }

  return data;
}
