/**
 * Export PDF du M5 (Audit High-Ticket) — téléchargement DIRECT d'un PDF vectoriel
 * via @react-pdf/renderer (même techno que les factures et le M1), sans boîte
 * d'impression.
 */
import { pdf } from "@react-pdf/renderer";
import { createElement } from "react";
import M5PdfDocument from "../components/M5PdfDocument";
import type { M5State } from "./types";

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportM5PDF(state: M5State): Promise<void> {
  const filename = `M5 — High-Ticket — ${state.signed_by || "Liberty"}.pdf`;
  const blob = await pdf(createElement(M5PdfDocument, { state }) as any).toBlob();
  triggerDownload(blob, filename);
}
