/**
 * M16 — export du produit en document Word éditable (.doc HTML, ouvrable dans Word/Docs/LibreOffice)
 * + copie presse-papiers. Le doc reprend la charte (accent + polices) de state.data.appearance.
 */
import { type M16State } from "./types";

function esc(s: string | null | undefined): string {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function hexClean(h: string): string { return String(h || "").replace("#", "").toUpperCase(); }

function docColors(state: M16State) {
  const a = state.data.appearance;
  const albaraka = a.mode === "albaraka";
  return {
    accent: "#" + (albaraka ? "A8842D" : hexClean(a.primary) || "A8842D"),
    ink: "#1A1A1A",
    subInk: "#555555",
    headFont: albaraka ? "Crimson Pro" : a.headFont || "Calibri",
    bodyFont: albaraka ? "Inter" : a.bodyFont || "Calibri",
  };
}

export function buildDocHtml(state: M16State): string {
  const d = state.data;
  const col = docColors(state);
  let body = "";
  body += `<h1 style="font-family:'${esc(col.headFont)}',serif;color:${col.accent};font-size:22pt;font-weight:bold;margin:0 0 6pt">${esc(d.titre || "Mon produit")}</h1>`;
  if (d.promesse_lt) body += `<p style="font-family:'${esc(col.bodyFont)}',sans-serif;color:${col.subInk};font-size:12pt;font-style:italic;margin:0 0 12pt">${esc(d.promesse_lt)}</p>`;
  (d.sections || []).forEach((sec) => {
    body += `<h2 style="font-family:'${esc(col.headFont)}',serif;color:${col.accent};font-size:14pt;font-weight:bold;margin:12pt 0 4pt">${esc(sec.heading)}</h2>`;
    String(sec.body || "").split("\n").forEach((line) => {
      body += `<p style="font-family:'${esc(col.bodyFont)}',sans-serif;color:${col.ink};font-size:11pt;margin:0 0 2pt">${line.trim() === "" ? "&nbsp;" : esc(line)}</p>`;
    });
  });
  return `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${esc(d.titre || "Mon produit")}</title></head><body style="background:#FFFFFF;color:${col.ink}">${body}</body></html>`;
}

function fileSafe(titre: string): string {
  return (titre || "M16_produit").replace(/[^a-z0-9]+/gi, "-").slice(0, 40);
}

export function downloadDoc(state: M16State, toast: (m: string) => void): void {
  try {
    const html = buildDocHtml(state);
    const blob = new Blob(["﻿", html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const aEl = document.createElement("a");
    aEl.href = url;
    aEl.download = "M16_" + fileSafe(state.data.titre) + ".doc";
    document.body.appendChild(aEl);
    aEl.click();
    document.body.removeChild(aEl);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    toast("DOCX exporté — éditable dans Word / Google Docs / LibreOffice.");
  } catch (e) {
    console.warn("downloadDoc", (e as Error).message);
    toast("Export impossible ici, réessaie dans Liberty.");
  }
}

export function copySection(state: M16State, idx: number, toast: (m: string) => void): void {
  const sec = state.data.sections[idx];
  if (!sec) return;
  const txt = sec.heading + "\n\n" + sec.body;
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(() => toast("Copié — colle-le où tu veux."));
  else toast("Copie manuelle : sélectionne le texte.");
}

export function copyAll(state: M16State, toast: (m: string) => void): void {
  const d = state.data;
  const all = (d.titre || "") + "\n\n" + (d.promesse_lt || "") + "\n\n" + (d.sections || []).map((s) => s.heading + "\n\n" + s.body).join("\n\n");
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(all).then(() => toast("Tout le contenu copié."));
  else toast("Copie manuelle : sélectionne le texte.");
}
