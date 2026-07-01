/**
 * Export PDF du M7 (Garantie) — téléchargement DIRECT d'un PDF vectoriel
 * via @react-pdf/renderer (même techno que les factures / le M1), sans boîte
 * d'impression. Reproduit l'audit IA 6 étapes + les données saisies + l'engagement.
 */
import { pdf } from "@react-pdf/renderer";
import { createElement } from "react";
import M7PdfDocument from "../components/M7PdfDocument";
import type { M7State } from "./types";

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

export async function exportM7PDF(state: M7State): Promise<void> {
  const filename = `M7 — Garantie — ${state.signed_by || "Liberty"}.pdf`;
  const blob = await pdf(createElement(M7PdfDocument, { state }) as any).toBlob();
  triggerDownload(blob, filename);
}
