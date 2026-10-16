import { createElement } from "react";
import { nomFichier, type DefinitionOutil, type DocumentOutil } from "@/lib/liberty/outils/modele";
import { genererDocx, type Entete } from "@/lib/liberty/outils/docx";

export function declencher(blob: Blob, nom: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Génère et télécharge le document d'un outil, en PDF ou en Word. */
export async function telechargerDocument(format: "pdf" | "docx", def: DefinitionOutil, d: DocumentOutil, eleve: string) {
  const entete: Entete = { def, eleve, date: new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) };
  const nom = nomFichier(def, eleve);
  if (format === "docx") {
    declencher(await genererDocx(d, entete), `${nom}.docx`);
    return;
  }
  // Chargés à la demande : le moteur PDF est lourd.
  const [{ pdf }, { DocumentPdf }] = await Promise.all([import("@react-pdf/renderer"), import("./DocumentPdf")]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blob = await pdf(createElement(DocumentPdf, { document: d, entete }) as any).toBlob();
  declencher(blob, `${nom}.pdf`);
}
