import { supabase } from "@/integrations/supabase/client";

export async function downloadInvoicePdf(pdfUrl: string, _invoiceNumber: string) {
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

  // 3. Open print window
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    throw new Error("La fenêtre d'impression a été bloquée. Autorisez les pop-ups.");
  }
  printWindow.document.write(htmlContent);
  printWindow.document.close();

  // 4. Print on load + fallback
  printWindow.onload = () => {
    printWindow.print();
  };
  setTimeout(() => {
    printWindow.print();
  }, 500);
}
