/**
 * Export PDF du M8 (Preuve sociale) — téléchargement DIRECT d'un PDF vectoriel
 * via @react-pdf/renderer (même techno que les factures), sans boîte d'impression.
 */
import { pdf } from "@react-pdf/renderer";
import { createElement } from "react";
import M8PdfDocument from "../components/M8PdfDocument";
import type { M8State } from "./types";

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

export async function exportM8PDF(state: M8State): Promise<void> {
  const filename = `M8 — Preuve sociale — ${state.signed_by || "Liberty"}.pdf`;
  const blob = await pdf(createElement(M8PdfDocument, { state }) as any).toBlob();
  triggerDownload(blob, filename);
}
