/**
 * Export mémo M14 (Architecturer ton Middle-Ticket) — téléchargement DIRECT d'un
 * PDF vectoriel via @react-pdf/renderer (même techno que les factures), sans boîte
 * d'impression. Remplace l'ancien HTML + window.open + window.print.
 */
import { pdf } from "@react-pdf/renderer";
import { createElement } from "react";
import M14PdfDocument from "../components/M14PdfDocument";
import { type M14State } from "./types";

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

export async function exportM14PDF(state: M14State): Promise<void> {
  const eleveNom = (state.signed_by || "").trim() || "Liberty";
  const filename = `M14 — Mémo Middle-Ticket — ${eleveNom}.pdf`;
  const blob = await pdf(createElement(M14PdfDocument, { state }) as any).toBlob();
  triggerDownload(blob, filename);
}
