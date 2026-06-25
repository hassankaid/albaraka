/**
 * Export PDF du M1 (Sous-Niche 2.0) — téléchargement DIRECT d'un PDF vectoriel
 * via @react-pdf/renderer (même techno que les factures), sans boîte d'impression.
 */
import { pdf } from "@react-pdf/renderer";
import { createElement } from "react";
import M1PdfDocument from "../components/M1PdfDocument";
import type { M1State } from "./types";

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

export async function exportM1PDF(state: M1State): Promise<void> {
  const filename = `M1 — Sous-Niche 2.0 — ${state.engagement?.nom_complet || "Liberty"}.pdf`;
  let blob: Blob;
  try {
    blob = await pdf(createElement(M1PdfDocument, { state, includePhoto: true }) as any).toBlob();
  } catch {
    // Repli : la photo d'avatar peut être bloquée (CORS) → on régénère sans elle.
    blob = await pdf(createElement(M1PdfDocument, { state, includePhoto: false }) as any).toBlob();
  }
  triggerDownload(blob, filename);
}
