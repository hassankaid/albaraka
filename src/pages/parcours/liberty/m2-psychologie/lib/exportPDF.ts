/**
 * Export PDF du brief stratégique M2 (Psychologie de l'acheteur) — téléchargement
 * DIRECT d'un PDF vectoriel via @react-pdf/renderer (même techno que les factures),
 * sans boîte d'impression. Calqué sur exportM1PDF.
 */
import { pdf } from "@react-pdf/renderer";
import { createElement } from "react";
import M2PdfDocument from "../components/M2PdfDocument";
import type { M2State } from "./types";

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

export async function exportM2PDF(state: M2State): Promise<void> {
  const filename = `M2 — Brief stratégique — ${state.signed?.name || "Liberty"}.pdf`;
  const blob = await pdf(createElement(M2PdfDocument, { state }) as any).toBlob();
  triggerDownload(blob, filename);
}
