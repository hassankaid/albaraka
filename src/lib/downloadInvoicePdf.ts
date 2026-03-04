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
  const printWindow = window.open("", "_blank", "noopener,noreferrer");

  if (!printWindow) {
    throw new Error("La fenêtre d'impression a été bloquée. Autorisez les pop-ups.");
  }

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.document.title = invoiceNumber;

  await new Promise<void>((resolve) => {
    let printed = false;

    const triggerPrint = () => {
      if (printed || printWindow.closed) return;
      printed = true;
      printWindow.focus();
      printWindow.print();
      resolve();
    };

    printWindow.addEventListener("load", triggerPrint, { once: true });
    setTimeout(triggerPrint, 700);
  });
}
