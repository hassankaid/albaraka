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
  const container = document.createElement("div");
  container.innerHTML = htmlContent;

  // Extract body + styles
  const bodyContent = container.querySelector("body");
  const content = bodyContent ? bodyContent.innerHTML : htmlContent;

  const element = document.createElement("div");
  element.innerHTML = content;
  element.style.padding = "40px";
  element.style.fontFamily = "Helvetica, Arial, sans-serif";
  element.style.fontSize = "14px";
  element.style.color = "#1a1a2e";

  const styleTag = container.querySelector("style");
  if (styleTag) {
    const style = document.createElement("style");
    style.textContent = styleTag.textContent;
    element.prepend(style);
  }

  document.body.appendChild(element);

  const options = {
    margin: 10,
    filename: `${invoiceNumber}.pdf`,
    image: { type: "jpeg" as const, quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, letterRendering: true },
    jsPDF: { unit: "mm" as const, format: "a4" as const, orientation: "portrait" as const },
  };

  try {
    await html2pdf().set(options).from(element).save();
  } finally {
    document.body.removeChild(element);
  }
}

export async function generateInvoicePdfBlob(invoiceNumber: string, htmlContent: string): Promise<Blob> {
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

  const styleTag = container.querySelector("style");
  if (styleTag) {
    const style = document.createElement("style");
    style.textContent = styleTag.textContent;
    element.prepend(style);
  }

  document.body.appendChild(element);

  const options = {
    margin: 10,
    filename: `${invoiceNumber}.pdf`,
    image: { type: "jpeg" as const, quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, letterRendering: true },
    jsPDF: { unit: "mm" as const, format: "a4" as const, orientation: "portrait" as const },
  };

  try {
    return await html2pdf().set(options).from(element).outputPdf("blob");
  } finally {
    document.body.removeChild(element);
  }
}
