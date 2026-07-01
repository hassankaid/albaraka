/**
 * Export « Carte d'écosystème » M18 — téléchargement DIRECT d'un PDF vectoriel
 * via @react-pdf/renderer (même techno que les factures & le M1), sans boîte
 * d'impression. Remplace l'ancien HTML + window.open/window.print.
 */
import { pdf } from "@react-pdf/renderer";
import { createElement } from "react";
import { type M18State } from "./types";
import { getProgrammeNom } from "./validations";
import M18PdfDocument from "../components/M18PdfDocument";

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

export async function exportEcosystemePDF(state: M18State): Promise<void> {
  const programmeNom = getProgrammeNom(state) || "Mon écosystème";
  const eleve = (state.signed_by || "").trim() || "Liberty";
  const filename = `M18 — Carte d'écosystème — ${programmeNom} — ${eleve}.pdf`;
  const blob = await pdf(createElement(M18PdfDocument, { state }) as any).toBlob();
  triggerDownload(blob, filename);
}
