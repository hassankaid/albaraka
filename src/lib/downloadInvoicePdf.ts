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

export async function downloadInvoicePdf(invoiceNumber: string, htmlContent: string) {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.left = "-10000px";
  iframe.style.top = "0";
  iframe.style.width = "210mm";
  iframe.style.height = "297mm";
  iframe.style.border = "0";
  iframe.setAttribute("aria-hidden", "true");

  document.body.appendChild(iframe);

  try {
    const iframeDoc = iframe.contentDocument;

    if (!iframeDoc) {
      throw new Error("Impossible de préparer la facture pour le téléchargement");
    }

    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();

    await new Promise<void>((resolve) => {
      const onLoad = () => {
        iframe.removeEventListener("load", onLoad);
        resolve();
      };

      iframe.addEventListener("load", onLoad);

      // Fallback if load is already complete quickly
      setTimeout(() => {
        iframe.removeEventListener("load", onLoad);
        resolve();
      }, 300);
    });

    const printableElement = iframe.contentDocument?.documentElement;

    if (!printableElement) {
      throw new Error("Impossible de lire le contenu de la facture");
    }

    const options = {
      margin: 10,
      filename: `${invoiceNumber}.pdf`,
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: true,
        windowWidth: printableElement.scrollWidth,
        windowHeight: printableElement.scrollHeight,
      },
      jsPDF: { unit: "mm" as const, format: "a4" as const, orientation: "portrait" as const },
    };

    await html2pdf().set(options).from(printableElement).save();
  } finally {
    document.body.removeChild(iframe);
  }
}

