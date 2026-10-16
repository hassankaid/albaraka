import { describe, expect, it } from "vitest";
import { remplirListeDocx, remplirXml, retirerIndicationsDocx, retirerParagrapheEtTableau } from "./modeles";
import { echeances, remplirContratXml, texteDepartGarantie } from "./outil3FicheOffre";

const run = (t: string, couleur = "B8963E") => `<w:r><w:rPr><w:color w:val="${couleur}"/></w:rPr><w:t xml:space="preserve">${t}</w:t></w:r>`;
const para = (...runs: string[]) => `<w:p><w:pPr/>${runs.join("")}</w:p>`;

describe("remplissage des modèles", () => {
  it("remplace les champs remplis, garde les autres, et passe le doré en noir", () => {
    const xml = para(run("«NOM DE L&apos;OFFRE»"), run(" pour ", "1F1F1F"), run("«NOM ET PRÉNOM DU CLIENT»"));
    const r = remplirXml(xml, { espace: "w", valeurs: { "NOM DE L'OFFRE": "T12S & Co" }, couleur: { doree: "B8963E", texte: "1F1F1F" } });
    expect(r).toContain(">T12S &amp; Co<");
    expect(r).toContain("«NOM ET PRÉNOM DU CLIENT»");
    expect(r.match(/B8963E/g)?.length).toBe(1); // seul le champ client reste doré
  });
  it("remplit aussi les PowerPoint", () => {
    const xml = `<a:r><a:rPr><a:solidFill><a:srgbClr val="E3B23C"/></a:solidFill></a:rPr><a:t>«RÉSULTAT CHIFFRÉ»</a:t></a:r>`;
    expect(remplirXml(xml, { espace: "a", valeurs: { "RÉSULTAT CHIFFRÉ": "7 kg" } })).toContain("<a:t>7 kg</a:t>");
  });
  it("allonge ou raccourcit une liste du modèle", () => {
    const cles = [1, 2, 3].map((i) => `PHASE ${i} : NOM ET CONTENU`);
    const xml = "<w:body>" + cles.map((c) => para(run(`«${c}»`))).join("") + para(run("Il comprend :", "000000")) + "</w:body>";
    const quatre = remplirListeDocx(xml, cles, ["A", "B", "C", "D"]);
    expect(quatre.match(/<w:p>/g)?.length).toBe(5);
    expect(quatre).toContain(">D<");
    const deux = remplirListeDocx(xml, cles, ["A", "B"]);
    expect(deux.match(/<w:p>/g)?.length).toBe(3);
    expect(deux).not.toContain("PHASE 3");
    expect(remplirListeDocx(xml, cles, [])).toBe(xml);
  });
  it("retire les indications après un champ rempli, pas après un champ vide", () => {
    const xml = para(run("Micro-entreprise", "1F1F1F"), run(" (ex. micro-entreprise, SAS, LLC)", "777777"))
      + para(run("«NUMÉRO»"), run(" (si existant)", "777777"))
      + para(run("français", "1F1F1F"), run(" (par défaut : droit français). En cas de désaccord.", "000000"));
    const r = retirerIndicationsDocx(xml);
    expect(r).not.toContain("SAS, LLC");
    expect(r).toContain("(si existant)");
    expect(r).toContain(">. En cas de désaccord.<");
  });
  it("retire un paragraphe et le tableau qui le suit", () => {
    const xml = para(run("Avant")) + para(run("L&apos;outil propose un texte de départ")) + "<w:tbl><w:tr/></w:tbl>" + para(run("Après"));
    const r = retirerParagrapheEtTableau(xml, "L'outil propose un texte de départ");
    expect(r).not.toContain("<w:tbl>");
    expect(r).toContain("Avant");
    expect(r).toContain("Après");
  });
});

describe("outil 3 — fiche offre", () => {
  it("calcule les échéances des facilités cochées", () => {
    expect(echeances({ "offre.prix": "3200", "offre.facilites": ["Paiement en une fois", "Paiement en 3 fois"] }))
      .toEqual(["En une fois : 3 200 €", "En 3 fois : 3 × 1 066,67 €"]);
    expect(echeances({ "offre.facilites": ["Paiement en 3 fois"] })).toEqual([]);
  });
  it("propose le texte de départ de la garantie selon le type", () => {
    expect(texteDepartGarantie({ "garantie.type": "Continuité", "garantie.resultat": "7 kg de muscle", "garantie.delai": "90 jours" }))
      .toBe("Si vous n'atteignez pas 7 kg de muscle en 90 jours, je continue de vous accompagner gratuitement jusqu'à ce qu'il soit atteint.");
    expect(texteDepartGarantie({ "garantie.type": "Remboursement" })).toContain("[montant ou part remboursée]");
    expect(texteDepartGarantie({})).toBe("");
  });
  it("remplit le contrat sans doubler le point final", () => {
    const xml = para(run("«PROMESSE SPÉCIFIQUE»"), run(".", "000000"));
    expect(remplirContratXml(xml, { "promesse.specifiqueTexte": "J'aide les mamans à perdre 8 kg en 90 jours." })).toContain(">J&apos;aide les mamans à perdre 8 kg en 90 jours<");
  });
});
