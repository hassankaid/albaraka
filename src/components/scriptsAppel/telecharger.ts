import { createElement } from "react";
import logoUrl from "@/assets/scripts-appel/logo-al-baraka-or.png";
import { nomFichier, type DefinitionScript, type Reponses } from "@/lib/scriptsAppel";
import { genererDocx } from "@/lib/scriptsAppel/docx";

function declencher(blob: Blob, nom: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Génère et télécharge le script en PDF ou en Word. */
export async function telechargerScript(format: "pdf" | "docx", def: DefinitionScript, reponses: Reponses, projet: string) {
  const nom = nomFichier(def, projet);
  if (format === "docx") {
    const logo = await (await fetch(logoUrl)).arrayBuffer();
    declencher(await genererDocx(def, reponses, projet, logo), `${nom}.docx`);
    return;
  }
  // Chargés à la demande : le moteur PDF est lourd.
  const [{ pdf }, { ScriptAppelPdf }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("./ScriptAppelPdf"),
  ]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blob = await pdf(createElement(ScriptAppelPdf, { def, reponses, projet }) as any).toBlob();
  declencher(blob, `${nom}.pdf`);
}
