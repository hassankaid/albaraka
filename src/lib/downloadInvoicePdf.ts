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

function createOffscreenElement(htmlContent: string): HTMLDivElement {
  const container = document.createElement("div");
  container.innerHTML = htmlContent;

  const bodyContent = container.querySelector("body");
  const content = bodyContent ? bodyContent.innerHTML : htmlContent;

  const element = document.createElement("div");
  element.innerHTML = content;
  element.style.padding = "40px";
  element.style.fontFamily = "Helvetica, Arial, sans-serif";
  element.style.fontSize = "14px";
  element.style.color = "#1a1a2e";
  // Keep element in DOM for html2canvas but invisible & non-disruptive
  element.style.position = "fixed";
  element.style.left = "-9999px";
  element.style.top = "0";
  element.style.width = "210mm";
  element.style.zIndex = "-1";
  element.style.opacity = "0";
  element.style.pointerEvents = "none";

  const styleTag = container.querySelector("style");
  if (styleTag) {
    const style = document.createElement("style");
    style.textContent = styleTag.textContent;
    element.prepend(style);
  }

  return element;
}

function getPdfOptions(invoiceNumber: string) {
  return {
    margin: 10,
    filename: `${invoiceNumber}.pdf`,
    image: { type: "jpeg" as const, quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, letterRendering: true, scrollX: 0, scrollY: 0 },
    jsPDF: { unit: "mm" as const, format: "a4" as const, orientation: "portrait" as const },
  };
}

export async function downloadInvoicePdf(invoiceNumber: string, htmlContent: string) {
  const element = createOffscreenElement(htmlContent);
  document.body.appendChild(element);

  try {
    await html2pdf().set(getPdfOptions(invoiceNumber)).from(element).save();
  } finally {
    document.body.removeChild(element);
  }
}

export async function generateInvoicePdfBlob(invoiceNumber: string, htmlContent: string): Promise<Blob> {
  const element = createOffscreenElement(htmlContent);
  document.body.appendChild(element);

  try {
    const worker = html2pdf().set(getPdfOptions(invoiceNumber)).from(element).toPdf();
    const pdf = await worker.get("pdf");
    return pdf.output("blob") as Blob;
  } finally {
    document.body.removeChild(element);
  }
}
