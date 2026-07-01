/**
 * Export PDF du M12 (Naming & Positionnement) — téléchargement DIRECT d'un PDF
 * vectoriel via @react-pdf/renderer (même techno que les factures), sans boîte
 * d'impression navigateur.
 */
import { pdf } from "@react-pdf/renderer";
import { createElement } from "react";
import M12PdfDocument from "../components/M12PdfDocument";
import type { M12State } from "./types";

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

export async function exportM12PDF(state: M12State): Promise<void> {
  const f = state.data?.final || ({} as any);
  const filename = `M12 — Naming — ${f.nom || state.signed_by || "Liberty"}.pdf`;
  const blob = await pdf(createElement(M12PdfDocument, { state }) as any).toBlob();
  triggerDownload(blob, filename);
}
