import html2pdf from "html2pdf.js";
import { supabase } from "@/integrations/supabase/client";

export async function downloadInvoicePdf(pdfUrl: string, invoiceNumber: string) {
  // 1. Get signed URL
  const { data, error } = await supabase.storage
    .from("invoices")
    .createSignedUrl(pdfUrl, 3600);

  if (error || !data?.signedUrl) {
    throw new Error("Impossible de récupérer la facture");
  }

  // 2. Fetch HTML content
  const response = await fetch(data.signedUrl);
  const htmlContent = await response.text();

  // 3. Create temporary container
  const container = document.createElement("div");
  container.innerHTML = htmlContent;
  container.style.position = "absolute";
  container.style.left = "-9999px";
  document.body.appendChild(container);

  // 4. Convert to PDF
  const options = {
    margin: 10,
    filename: `${invoiceNumber}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
  };

  await html2pdf().set(options).from(container).save();

  // 5. Cleanup
  document.body.removeChild(container);
}
