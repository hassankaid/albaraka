/**
 * Export PDF du M4 (Value Ladder) — téléchargement DIRECT d'un PDF vectoriel
 * via @react-pdf/renderer (même techno que les factures), sans boîte d'impression.
 */
import { pdf } from "@react-pdf/renderer";
import { createElement } from "react";
import M4PdfDocument from "../components/M4PdfDocument";
import type { M4State } from "./types";

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

export async function exportM4PDF(state: M4State): Promise<void> {
  const filename = `M4 — Value Ladder — ${state.signed_name || "Liberty"}.pdf`;
  const blob = await pdf(createElement(M4PdfDocument, { state }) as any).toBlob();
  triggerDownload(blob, filename);
}
