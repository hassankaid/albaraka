import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { pdf } from "@react-pdf/renderer";
import { DocumentPdf } from "./DocumentPdf";
import { OUTILS_LIBERTY, type DefinitionOutil, type Profil } from "@/lib/liberty/outils";

async function nombreDePages(def: DefinitionOutil, p: Profil) {
  const entete = { def, eleve: "Yasmine Benali", date: "16 octobre 2026" };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const flux = await pdf(createElement(DocumentPdf, { document: def.document(p), entete }) as any).toBuffer();
  const morceaux: Buffer[] = [];
  for await (const c of flux as AsyncIterable<Buffer>) morceaux.push(c);
  return Number(Buffer.concat(morceaux).toString("latin1").match(/\/Count (\d+)/)?.[1]);
}

const outils = Object.values(OUTILS_LIBERTY) as DefinitionOutil[];

describe("PDF des outils Liberty", () => {
  it("se génère pour chaque outil, même vide", async () => {
    for (const def of outils) expect(await nombreDePages(def, {})).toBeGreaterThan(0);
  }, 60000);

  it("respecte les sauts de page : un script par page dans l'outil 7", async () => {
    const def = outils.find((o) => o.numero === 7)!;
    const p: Profil = { "scripts.liste": Array.from({ length: 10 }, () => ({ cta: "Écrivez-moi MUSCLE" })) };
    expect(await nombreDePages(def, p)).toBe(11);
  }, 60000);
});
