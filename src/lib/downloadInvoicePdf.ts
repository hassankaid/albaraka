import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches the HTML version of an invoice for preview purposes.
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
 * Forces the edge function to regenerate the PDF for a given invoice.
 * Used by the "Regenerate" admin button and by downloadInvoicePdf(forceRegenerate=true).
 */
export async function regenerateInvoicePdf(invoiceId: string): Promise<void> {
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
 * Downloads the canonical PDF for an invoice.
 *
 * - If forceRegenerate is true, calls the edge function first to overwrite the stored PDF,
 *   then downloads the fresh result.
 * - Otherwise, tries to download the stored .pdf directly.
 * - If no .pdf exists (legacy), falls back to regeneration automatically.
 */
export async function downloadInvoicePdf(
  invoiceNumber: string,
  storedPath: string,
  invoiceId?: string,
  forceRegenerate = false
): Promise<void> {
  const pdfPath = storedPath.endsWith(".pdf")
    ? storedPath
    : storedPath.replace(/\.html$/, ".pdf");

  if (forceRegenerate && invoiceId) {
    await regenerateInvoicePdf(invoiceId);
  }

  let blob: Blob | null = null;

  if (!forceRegenerate) {
    try {
      const { data, error } = await supabase.storage
        .from("invoices")
        .download(pdfPath);
      if (!error && data) {
        blob = data;
      }
    } catch {
      // fall through
    }
  }

  if (!blob && invoiceId) {
    if (!forceRegenerate) {
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
      }
    }

    const { data, error } = await supabase.storage
      .from("invoices")
      .download(pdfPath);
    if (error || !data) {
      throw new Error("Impossible de télécharger le PDF après régénération");
    }
    blob = data;
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
 */
export async function generateInvoicePdfBlob(
  invoiceNumber: string,
  storedPath: string,
  invoiceId?: string,
  forceRegenerate = false
): Promise<Blob> {
  const pdfPath = storedPath.endsWith(".pdf")
    ? storedPath
    : storedPath.replace(/\.html$/, ".pdf");

  if (forceRegenerate && invoiceId) {
    await regenerateInvoicePdf(invoiceId);
  }

  if (!forceRegenerate) {
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
  }

  if (invoiceId) {
    if (!forceRegenerate) {
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
      }
    }

    const { data, error } = await supabase.storage
      .from("invoices")
      .download(pdfPath);
    if (error || !data) {
      throw new Error("Impossible de récupérer le PDF après régénération");
    }
    return data;
  }

  throw new Error(`Aucun PDF disponible pour la facture ${invoiceNumber}`);
}
