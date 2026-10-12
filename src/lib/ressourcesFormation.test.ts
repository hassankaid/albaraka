import { describe, expect, it } from "vitest";
import {
  cheminStockage,
  typeDuFichier,
  estFichierStocke,
  libelleFormat,
  nomDeStockage,
  nomDeTelechargement,
  tailleLisible,
  titreDepuisNom,
  verifierRessource,
} from "./ressourcesFormation";

describe("ressources de formation en fichiers", () => {
  it("accepte les documents courants jusqu'à 50 Mo, refuse le reste", () => {
    expect(verifierRessource({ name: "Script.PDF", size: 1000 })).toBeNull();
    expect(verifierRessource({ name: "tableau.xlsx", size: 1000 })).toBeNull();
    expect(verifierRessource({ name: "pack.zip", size: 50 * 1024 * 1024 })).toBeNull();
    expect(verifierRessource({ name: "pack.zip", size: 50 * 1024 * 1024 + 1 })).toMatch(/50 Mo/);
    expect(verifierRessource({ name: "virus.exe", size: 10 })).toMatch(/format non accepté/);
    expect(verifierRessource({ name: "vide.pdf", size: 0 })).toMatch(/vide/);
  });

  it("reconnaît un fichier déposé sur la plateforme et retrouve son chemin", () => {
    expect(estFichierStocke("stockage:abc/script.pdf")).toBe(true);
    expect(estFichierStocke("https://exemple.com/script.pdf")).toBe(false);
    expect(estFichierStocke("")).toBe(false);
    expect(cheminStockage("stockage:abc/script.pdf")).toBe("abc/script.pdf");
  });

  it("propose un titre lisible et un nom de stockage sans accents", () => {
    expect(titreDepuisNom("script_appel-v2.pdf")).toBe("Script appel v2");
    expect(nomDeStockage("Fiche d'objections — été.PDF")).toBe("Fiche-d-objections-ete.pdf");
    expect(nomDeStockage("....pdf")).toBe("ressource.pdf");
  });

  it("télécharge sous le titre de la ressource, avec la bonne extension", () => {
    expect(nomDeTelechargement("Script d'appel", "abc/123-script.docx")).toBe("Script d'appel.docx");
    expect(nomDeTelechargement("Plan: v2", "abc/plan.pdf")).toBe("Plan v2.pdf");
    expect(nomDeTelechargement("deja.pdf", "abc/plan.pdf")).toBe("deja.pdf");
  });

  it("affiche le format et la taille en français", () => {
    expect(libelleFormat("abc/fiche.docx")).toBe("Word");
    expect(libelleFormat("abc/inconnu.xyz")).toBe("Fichier");
    expect(tailleLisible(300 * 1024)).toBe("300 Ko");
    expect(tailleLisible(2.5 * 1024 * 1024)).toBe("2,5 Mo");
  });
});

describe("formats modifiables par l'élève", () => {
  it("accepte Word, Excel, LibreOffice et les fichiers Mac, avec leur type déduit de l'extension", () => {
    for (const nom of ["fiche.docx", "plan.xlsx", "notes.odt", "budget.ods", "cours.pages", "suivi.numbers", "slides.key", "texte.rtf"]) {
      expect(verifierRessource({ name: nom, size: 1000 })).toBeNull();
    }
    expect(typeDuFichier("Fiche.DOCX")).toBe("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    expect(typeDuFichier("cours.pages")).toBe("application/vnd.apple.pages");
    expect(libelleFormat("abc/cours.pages")).toBe("Pages");
  });
});
