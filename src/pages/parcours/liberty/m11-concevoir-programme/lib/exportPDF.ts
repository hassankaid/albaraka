/**
 * Export PDF du M11 (Concevoir un programme) — téléchargement DIRECT d'un PDF
 * vectoriel via @react-pdf/renderer (même techno que les factures et le M1),
 * sans boîte d'impression navigateur.
 */
import { pdf } from "@react-pdf/renderer";
import { createElement } from "react";
import M11PdfDocument from "../components/M11PdfDocument";
import type { M11State } from "./types";

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

export async function exportM11PDF(state: M11State): Promise<void> {
  const filename = `M11 — Programme — ${state.signed_by || "Liberty"}.pdf`;
  const blob = await pdf(createElement(M11PdfDocument, { state }) as any).toBlob();
  triggerDownload(blob, filename);
}
