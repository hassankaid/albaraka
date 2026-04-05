import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches the HTML version of an invoice for preview purposes.
 * The path stored in apporteur_invoices.pdf_url may be either a .pdf (new) or a .html (legacy).
 * This helper tries to find the .html sibling if the stored path is a .pdf.
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
 * Downloads the canonical PDF for an invoice.
 *
 * Strategy:
 *   1. If the stored path ends with .pdf, download it directly from Storage.
 *   2. If the stored path ends with .html (legacy invoices), try the .pdf sibling first.
 *   3. If no .pdf sibling exists yet, trigger a server-side regeneration via the
 *      generate-apporteur-invoice edge function in "regenerate" mode, then download.
 */
export async function downloadInvoicePdf(
  invoiceNumber: string,
  storedPath: string,
  invoiceId?: string
): Promise<void> {
  const pdfPath = storedPath.endsWith(".pdf")
    ? storedPath
    : storedPath.replace(/\.html$/, ".pdf");

  let blob: Blob | null = null;
  try {
    const { data, error } = await supabase.storage
      .from("invoices")
      .download(pdfPath);
    if (!error && data) {
      blob = data;
    }
  } catch {
    // fall through to regeneration
  }

  if (!blob && invoiceId) {
    const { data: invoice } = await supabase
      .from("apporteur_invoices")
      .select("apporteur_id, period_month, period_year")
      .eq("id", invoiceId)
      .maybeSingle();

    if (invoice) {
      const { data: regenResult, error: regenError } =
        await supabase.functions.invoke("generate-apporteur-invoice", {
          body: {
            apporteur_id: invoice.apporteur_id,
            month: invoice.period_month,
            year: invoice.period_year,
            regenerate: true,
          },
        });

      if (regenError || (regenResult as any)?.error) {
        throw new Error(
          (regenResult as any)?.error ??
            regenError?.message ??
            "Impossible de régénérer la facture"
        );
      }

      const { data, error } = await supabase.storage
        .from("invoices")
        .download(pdfPath);
      if (error || !data) {
        throw new Error("Impossible de télécharger le PDF après régénération");
      }
      blob = data;
    }
  }

  if (!blob) {
    throw new Error("Impossible de télécharger la facture");
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
 * Returns the PDF as a Blob — used by the bulk download zipper.
 * Same fallback logic as downloadInvoicePdf.
 */
export async function generateInvoicePdfBlob(
  invoiceNumber: string,
  storedPath: string,
  invoiceId?: string
): Promise<Blob> {
  const pdfPath = storedPath.endsWith(".pdf")
    ? storedPath
    : storedPath.replace(/\.html$/, ".pdf");

  try {
    const { data, error } = await supabase.storage
      .from("invoices")
      .download(pdfPath);
    if (!error && data) {
      return data;
    }
  } catch {
    // fall through
  }

  if (invoiceId) {
    const { data: invoice } = await supabase
      .from("apporteur_invoices")
      .select("apporteur_id, period_month, period_year")
      .eq("id", invoiceId)
      .maybeSingle();

    if (invoice) {
      await supabase.functions.invoke("generate-apporteur-invoice", {
        body: {
          apporteur_id: invoice.apporteur_id,
          month: invoice.period_month,
          year: invoice.period_year,
          regenerate: true,
        },
      });

      const { data, error } = await supabase.storage
        .from("invoices")
        .download(pdfPath);
      if (error || !data) {
        throw new Error("Impossible de récupérer le PDF après régénération");
      }
      return data;
    }
  }

  throw new Error(`Aucun PDF disponible pour la facture ${invoiceNumber}`);
}
