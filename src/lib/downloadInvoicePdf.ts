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

  // Hide element completely off-screen to avoid visual flash
  element.style.position = "fixed";
  element.style.left = "-10000px";
  element.style.top = "-10000px";
  element.style.width = "210mm";
  element.style.zIndex = "-9999";
  element.style.opacity = "0";
  element.style.pointerEvents = "none";
  element.style.overflow = "hidden";
  element.style.padding = "40px";
  element.style.fontFamily = "Helvetica, Arial, sans-serif";
  element.style.fontSize = "14px";
  element.style.color = "#1a1a2e";

  const styleTag = container.querySelector("style");
  if (styleTag) {
    // Scope styles to avoid leaking into main page
    const scopedStyle = document.createElement("style");
    const scopeId = "invoice-render-" + Date.now();
    element.id = scopeId;
    // Prefix all rules with the scoped ID
    let css = styleTag.textContent || "";
    css = css.replace(/(^|\})\s*([^@{}]+?)\s*\{/g, (match, before, selector) => {
      // Don't scope @-rules or already-scoped selectors
      if (selector.startsWith("@") || selector.includes("#" + scopeId)) return match;
      const scopedSelectors = selector.split(",").map((s: string) => {
        s = s.trim();
        if (s === "body" || s === "html" || s === "html, body" || s === "*") {
          return `#${scopeId}`;
        }
        return `#${scopeId} ${s}`;
      }).join(", ");
      return `${before} ${scopedSelectors} {`;
    });
    scopedStyle.textContent = css;
    element.prepend(scopedStyle);
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
