import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { lignes, type Champ, type Profil } from "./modele";
import { retirerSlidesPptx } from "./modeles";
import { outil8ScriptSetting } from "./outil8ScriptSetting";
import { outil9ScriptsClosing, scriptClosing } from "./outil9ScriptsClosing";
import { calculsWebinaire, remplirSlideWebinaire, slidesARetirer, valeursWebinaire } from "./outil10Webinaire";
import { outil11MidLow, titrePageDeVente } from "./outil11MidLow";
import { CHAMPS_WEBINAIRE } from "./webinaireChamps";

const eleve: Profil = {
  "avatar.objection": "Je n'ai pas le temps",
  "promesse.cible": "les mamans salariées",
  "promesse.resultat": "perdre 8 kg",
  "promesse.delaiNombre": "90",
  "promesse.delaiUnite": "jours",
  "methode.nom": "T12S",
  "methode.etapes": [{ nom: "Le déclic", micro: "Comprendre pourquoi" }, { nom: "Les repas", micro: "Un plan simple" }],
  "offre.prix": "3000",
  "offre.facilites": ["Paiement en une fois", "Paiement en 3 fois"],
  "offre.appelsFrequence": "1 appel par semaine",
  "offre.appelsDuree": "45 minutes",
  "garantie.texte": "Si vous n'atteignez pas le résultat, nous continuons gratuitement.",
  "liens.videoAvantAppel": "https://exemple.fr/video",
};

/** Le champ d'un outil, par sa clé. */
function champ(ecrans: { champs: Champ[] }[], cle: string): Champ {
  const c = ecrans.flatMap((e) => e.champs).find((x) => x.cle === cle);
  if (!c) throw new Error(cle);
  return c;
}

describe("outil 8 — script de setting", () => {
  it("part de l'objection de l'avatar, de la promesse et de la vidéo avant l'appel", () => {
    const objections = champ(outil8ScriptSetting.ecrans, "setting.objections").prerempli!(eleve) as { objection: string }[];
    expect(objections[0].objection).toBe("Je n'ai pas le temps");
    expect(champ(outil8ScriptSetting.ecrans, "setting.transition").prerempli!(eleve)).toContain("perdre 8 kg en 90 jours");
    expect(champ(outil8ScriptSetting.ecrans, "setting.confirmation").prerempli!(eleve)).toContain("https://exemple.fr/video");
  });
  it("ne donne jamais de prix", () => {
    const tout = JSON.stringify(outil8ScriptSetting.document({ ...eleve, "setting.prix": "Ça dépend" }));
    expect(tout).not.toContain("3000");
    expect(tout).not.toContain("3 000");
  });
});

describe("outil 9 — closing", () => {
  it("propose 3 piliers : la méthode, puis l'accompagnement", () => {
    const piliers = champ(outil9ScriptsClosing.ecrans, "closing.piliers").prerempli!(eleve) as Record<string, string>[];
    expect(piliers.map((l) => l.nom)).toEqual(["Le déclic", "Les repas", "L'accompagnement personnalisé"]);
    expect(piliers[2].concret).toBe("1 appel par semaine de 45 minutes");
  });
  it("annonce le prix et les facilités, et cite la garantie du contrat", () => {
    const prix = champ(outil9ScriptsClosing.ecrans, "closing.prix").prerempli!(eleve) as string;
    expect(prix).toBe("L'investissement pour mon accompagnement, c'est 3 000 €. Vous pouvez aussi le régler en 3 fois (3 × 1 000 €).");
    expect(JSON.stringify(scriptClosing(eleve))).toContain("nous continuons gratuitement");
  });
  it("met l'objection de l'avatar en premier", () => {
    const o = champ(outil9ScriptsClosing.ecrans, "closing.objections").prerempli!(eleve) as { objection: string }[];
    expect(o[0].objection).toBe("Je n'ai pas le temps");
    expect(o).toHaveLength(6);
  });
});

describe("outil 10 — webinaire", () => {
  const cle = (nom: string) => CHAMPS_WEBINAIRE.find((c) => c[0] === nom)![1];

  it("connaît les 132 éléments du modèle, chacun une seule fois", () => {
    expect(CHAMPS_WEBINAIRE).toHaveLength(132);
    expect(new Set(CHAMPS_WEBINAIRE.map((c) => c[1])).size).toBe(132);
  });
  it("calcule la valeur totale, le prix final et l'économie (formule de Sidali)", () => {
    const p: Profil = {
      ...eleve,
      [cle("VALEUR ÉTAPE 1 €")]: "500", [cle("VALEUR ÉTAPE 2 €")]: "700",
      [cle("PRIX")]: "1500", [cle("RÉDUCTION %")]: "20", [cle("VALEUR BONUS")]: "200",
    };
    expect(calculsWebinaire(p)).toEqual({ total: 1200, prixFinal: 1200, economie: 500 });
    const v = valeursWebinaire(p, "Yasmine Benali");
    expect(v["VALEUR TOTALE €"]).toBe("1 200 €");
    expect(v["ÉCONOMIE €"]).toBe("500 €");
    expect(v["RÉDUCTION %"]).toBe("20 %");
    expect(v["VOTRE PRÉNOM NOM"]).toBe("Yasmine Benali");
    expect(v["CONTENU PASS L4"]).toBe(eleve["garantie.texte"]);
    // un montant écrit à la main remplace le calcul
    expect(valeursWebinaire({ ...p, [cle("ÉCONOMIE €")]: "600 €" }, "")["ÉCONOMIE €"]).toBe("600 €");
  });
  it("reprend la méthode, le prix et le bonus même si leur écran n'a pas été ouvert", () => {
    const v = valeursWebinaire({ ...eleve, "offre.bonus": [{ nom: "Menus express" }] }, "");
    expect(v["NOM ÉTAPE 2"]).toBe("Les repas");
    expect(v["DESCRIPTION ÉTAPE 1"]).toBe("Comprendre pourquoi");
    expect(v["PRIX"]).toBe("3 000 €");
    expect(v["NOM BONUS"]).toBe("Menus express");
    expect(v["NOM DE VOTRE MÉTHODE"]).toBe("la méthode T12S");
    expect(v["N"]).toBe("2");
  });
  it("compte les étapes et retire les slides des étapes 7 à 9 vides", () => {
    const p: Profil = { [cle("NOM ÉTAPE 1")]: "A", [cle("NOM ÉTAPE 2")]: "B", [cle("NOM ÉTAPE 7")]: "G" };
    expect(valeursWebinaire(p, "")["N"]).toBe("3");
    expect(slidesARetirer(p)).toEqual([71, 72]);
  });
  it("retire les exemples gris et passe les champs remplis à la couleur du texte voisin", () => {
    const run = (t: string, c: string) => `<a:r><a:rPr><a:solidFill><a:srgbClr val="${c}"/></a:solidFill></a:rPr><a:t xml:space="preserve">${t}</a:t></a:r>`;
    const xml = `<p:sp><p:txBody><a:p>${run("Un ", "D9D9D9")}${run("«TYPE PROGRAMME»", "FFD700")}${run(" Ex: ‹programme›", "999999")}</a:p><a:p>${run("«TAGLINE»", "FFD700")}${run(" Ex: ‹L'arabe›", "999999")}</a:p></p:txBody></p:sp>`;
    const out = remplirSlideWebinaire(xml, { "TYPE PROGRAMME": "accompagnement" });
    expect(out).not.toContain("Ex:");
    expect(out).toContain(">accompagnement<");
    // le champ rempli prend la couleur de « Un », son voisin : il n'est plus doré
    expect(out).toContain('<a:srgbClr val="D9D9D9"/></a:solidFill></a:rPr><a:t xml:space="preserve">accompagnement');
    expect(out).toContain("«TAGLINE»"); // un champ vide reste tel quel, doré
  });
  it("retire une slide d'un PowerPoint (présentation, liens, types, notes)", async () => {
    const zip = new JSZip();
    zip.file("[Content_Types].xml", '<Types><Override PartName="/ppt/slides/slide1.xml" ContentType="s"/><Override PartName="/ppt/slides/slide2.xml" ContentType="s"/><Override PartName="/ppt/notesSlides/notesSlide2.xml" ContentType="n"/></Types>');
    zip.file("ppt/presentation.xml", '<p:presentation><p:sldIdLst><p:sldId id="256" r:id="rId2"/><p:sldId id="257" r:id="rId3"/></p:sldIdLst></p:presentation>');
    zip.file("ppt/_rels/presentation.xml.rels", '<Relationships><Relationship Id="rId2" Type="t" Target="slides/slide1.xml"/><Relationship Id="rId3" Type="t" Target="slides/slide2.xml"/></Relationships>');
    zip.file("ppt/slides/slide1.xml", "<s/>");
    zip.file("ppt/slides/slide2.xml", "<s/>");
    zip.file("ppt/slides/_rels/slide2.xml.rels", '<Relationships><Relationship Id="rId2" Type="n" Target="../notesSlides/notesSlide2.xml"/></Relationships>');
    zip.file("ppt/notesSlides/notesSlide2.xml", "<n/>");
    zip.file("docProps/app.xml", "<Properties><Slides>2</Slides></Properties>");
    await retirerSlidesPptx(zip, [2]);
    expect(zip.file("ppt/slides/slide2.xml")).toBeNull();
    expect(zip.file("ppt/notesSlides/notesSlide2.xml")).toBeNull();
    expect(await zip.file("ppt/presentation.xml")!.async("string")).not.toContain("rId3");
    expect(await zip.file("ppt/_rels/presentation.xml.rels")!.async("string")).not.toContain("slide2.xml");
    const types = await zip.file("[Content_Types].xml")!.async("string");
    expect(types).not.toContain("slide2.xml");
    expect(types).not.toContain("notesSlide2.xml");
    expect(types).toContain("slide1.xml");
    expect(await zip.file("docProps/app.xml")!.async("string")).toContain("<Slides>1</Slides>");
  });
});

describe("outil 11 — mid et low-ticket", () => {
  it("assemble le titre de la page de vente selon la formule", () => {
    expect(titrePageDeVente(eleve)).toBe("Perdre 8 kg pour les mamans salariées en 90 jours, même si je n'ai pas le temps.");
    expect(titrePageDeVente({})).toBe("[Résultat] pour [cible] en [délai], même si [objection].");
  });
  it("propose les modules du programme et n'affiche la garantie que si elle s'applique", () => {
    const modules = champ(outil11MidLow.ecrans, "mid.modules");
    expect(modules.type === "cases" && typeof modules.options === "function" && modules.options(eleve)).toEqual(["Le déclic", "Les repas"]);
    expect(JSON.stringify(outil11MidLow.document(eleve))).not.toContain("continuons gratuitement");
    expect(JSON.stringify(outil11MidLow.document({ ...eleve, "page.garantieApplicable": ["oui"] }))).toContain("continuons gratuitement");
    expect(lignes(eleve, "methode.etapes")).toHaveLength(2);
  });
});

describe("outil 4 — l'appel de l'avatar", () => {
  it("s'accorde avec une cible au pluriel et reprend ses mots", async () => {
    const { siVousEtes } = await import("./outil4VslTunnel");
    expect(siVousEtes("les mamans salariées")).toBe("Si vous faites partie des mamans salariées");
    expect(siVousEtes("une maman salariée")).toBe("Si vous êtes une maman salariée");
  });
});
