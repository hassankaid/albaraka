import html2pdf from "html2pdf.js";
import { supabase } from "@/integrations/supabase/client";

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

/** Normalises any stored path to its .html variant (the only format the edge function uploads). */
function toHtmlPath(storedPath: string): string {
  return storedPath.endsWith(".pdf")
    ? storedPath.replace(/\.pdf$/, ".html")
    : storedPath;
}

/**
 * Calls the edge function to regenerate an invoice's HTML in Storage.
 * Returns when the fresh file is uploaded and apporteur_invoices.pdf_url is updated.
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

/** Shared html2pdf options for consistent output. */
const html2pdfOptions = {
  margin: 0,
  image: { type: "jpeg" as const, quality: 0.98 },
  html2canvas: { scale: 2 },
  jsPDF: { unit: "mm" as const, format: "a4" as const, orientation: "portrait" as const },
};

/**
 * Downloads a fresh HTML from Storage, converts it to a real PDF client-side,
 * and triggers a browser download.
 *
 * Every click triggers a fresh server-side regeneration before download.
 */
export async function downloadInvoicePdf(
  invoiceNumber: string,
  storedPath: string,
  invoiceId?: string
): Promise<void> {
  if (!invoiceId) {
    throw new Error("invoiceId requis pour régénérer la facture");
  }

  await invokeRegeneration(invoiceId);

  const htmlString = await downloadHtml(storedPath);
  const pdfBlob = await htmlToPdfBlob(htmlString, invoiceNumber);

  triggerBrowserDownload(pdfBlob, `${invoiceNumber}.pdf`);
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
  if (!invoiceId) {
    throw new Error(`invoiceId requis pour régénérer ${invoiceNumber}`);
  }

  await invokeRegeneration(invoiceId);

  const htmlString = await downloadHtml(storedPath);
  return htmlToPdfBlob(htmlString, invoiceNumber);
}

/* ------------------------------------------------------------------ */
/*  Internal helpers                                                   */
/* ------------------------------------------------------------------ */

async function downloadHtml(storedPath: string): Promise<string> {
  const htmlPath = toHtmlPath(storedPath);

  const { data, error } = await supabase.storage
    .from("invoices")
    .download(htmlPath);

  if (error || !data) {
    throw new Error("Impossible de télécharger la facture après régénération");
  }

  return await data.text();
}

async function htmlToPdfBlob(htmlString: string, filename: string): Promise<Blob> {
  const container = document.createElement("div");
  container.innerHTML = htmlString;
  container.style.width = "210mm";

  return await html2pdf()
    .set({ ...html2pdfOptions, filename: `${filename}.pdf` })
    .from(container)
    .outputPdf("blob");
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
