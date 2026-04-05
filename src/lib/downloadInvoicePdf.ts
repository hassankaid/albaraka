import html2pdf from "html2pdf.js";
import { supabase } from "@/integrations/supabase/client";

export async function fetchInvoiceHtml(pdfUrl: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("invoices")
    .createSignedUrl(pdfUrl, 3600);

  if (error || !data?.signedUrl) {
    throw new Error("Impossible de récupérer la facture");
  }

  const response = await fetch(data.signedUrl);
  return await response.text();
}

/**
 * Creates an offscreen iframe that renders the full invoice HTML document
 * (including <head>, <style>, <link>, <body>) and resolves once it has loaded.
 *
 * This is the same rendering mechanism used by InvoicePreviewModal's <iframe srcDoc={...}>,
 * which guarantees the downloaded PDF matches the preview pixel for pixel.
 *
 * The previous implementation extracted only the <body> content into a hidden <div>
 * with opacity:0 and left:-9999px, which caused two problems:
 *   1. Multiple <style> blocks and external styles were lost, breaking layout.
 *   2. html2canvas captured an invisible element with no computed dimensions,
 *      producing a blank PDF.
 */
async function createOffscreenIframe(htmlContent: string): Promise<HTMLIFrameElement> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");

    // Position offscreen but keep it visually renderable (NO opacity:0, NO display:none).
    // html2canvas needs a real rendered layout with computed styles to capture correctly.
    iframe.style.position = "fixed";
    iframe.style.top = "0";
    iframe.style.left = "-10000px";
    iframe.style.width = "210mm"; // A4 width
    iframe.style.height = "297mm"; // A4 height (minimum — content can grow)
    iframe.style.border = "0";
    iframe.setAttribute("aria-hidden", "true");
    iframe.setAttribute("tabindex", "-1");

    iframe.onload = () => {
      // Give the iframe a tick to finalize layout & font loading
      setTimeout(() => resolve(iframe), 100);
    };
    iframe.onerror = () => reject(new Error("Failed to load invoice iframe"));

    // Use srcdoc (same as the working preview modal)
    iframe.srcdoc = htmlContent;
    document.body.appendChild(iframe);
  });
}

function getPdfOptions(invoiceNumber: string) {
  return {
    margin: 10,
    filename: `${invoiceNumber}.pdf`,
    image: { type: "jpeg" as const, quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      letterRendering: true,
      scrollX: 0,
      scrollY: 0,
      windowWidth: 794, // 210mm at 96dpi
    },
    jsPDF: { unit: "mm" as const, format: "a4" as const, orientation: "portrait" as const },
  };
}

/**
 * Extracts the rendered body element from the offscreen iframe and feeds it to html2pdf.
 * The iframe is removed from the DOM in a finally block to prevent leaks even on error.
 */
async function renderIframeToPdf(
  iframe: HTMLIFrameElement,
  invoiceNumber: string
): Promise<{ save: () => Promise<void>; toBlob: () => Promise<Blob> }> {
  const doc = iframe.contentDocument;
  if (!doc || !doc.body) {
    throw new Error("Iframe document not available");
  }

  // Wait for any async resources (fonts, images) to settle
  if (doc.fonts && doc.fonts.ready) {
    try {
      await doc.fonts.ready;
    } catch {
      // fonts.ready may reject in some environments — non-fatal
    }
  }

  const element = doc.body;

  return {
    save: async () => {
      await html2pdf().set(getPdfOptions(invoiceNumber)).from(element).save();
    },
    toBlob: async () => {
      const worker = html2pdf().set(getPdfOptions(invoiceNumber)).from(element).toPdf();
      const pdf = await worker.get("pdf");
      return pdf.output("blob") as Blob;
    },
  };
}

export async function downloadInvoicePdf(invoiceNumber: string, htmlContent: string) {
  const iframe = await createOffscreenIframe(htmlContent);
  try {
    const renderer = await renderIframeToPdf(iframe, invoiceNumber);
    await renderer.save();
  } finally {
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  }
}

export async function generateInvoicePdfBlob(
  invoiceNumber: string,
  htmlContent: string
): Promise<Blob> {
  const iframe = await createOffscreenIframe(htmlContent);
  try {
    const renderer = await renderIframeToPdf(iframe, invoiceNumber);
    return await renderer.toBlob();
  } finally {
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  }
}
