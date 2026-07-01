/**
 * Export PDF du M3 (Anatomie d'une offre) — téléchargement DIRECT d'un PDF
 * vectoriel via @react-pdf/renderer (même techno que les factures), sans boîte
 * d'impression.
 */
import { pdf } from "@react-pdf/renderer";
import { createElement } from "react";
import M3PdfDocument from "../components/M3PdfDocument";
import type { M3State } from "./types";

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

export async function exportM3PDF(state: M3State): Promise<void> {
  const filename = `M3 — Anatomie d'offre — ${state.engagement?.nom_complet || "Liberty"}.pdf`;
  const blob = await pdf(createElement(M3PdfDocument, { state }) as any).toBlob();
  triggerDownload(blob, filename);
}
