/**
 * Export PDF du M6 (Pricing) — téléchargement DIRECT d'un PDF vectoriel
 * via @react-pdf/renderer (même techno que les factures), sans boîte d'impression.
 */
import { pdf } from "@react-pdf/renderer";
import { createElement } from "react";
import M6PdfDocument from "../components/M6PdfDocument";
import type { M6State } from "./types";

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

export async function exportM6PDF(state: M6State): Promise<void> {
  const filename = `M6 — Pricing — ${state.signed_by || "Liberty"}.pdf`;
  const blob = await pdf(createElement(M6PdfDocument, { state }) as any).toBlob();
  triggerDownload(blob, filename);
}
