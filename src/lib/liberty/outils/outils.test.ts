import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { A_COMPLETER, champRempli, liste, nomFichier, outilLiberty, OUTILS_LIBERTY, texte, type Profil } from "./index";
import { corpsDocx, genererDocx, RAPPEL_VALIDATION } from "./docx";
import { outil1NicheAvatar } from "./outil1NicheAvatar";

const entete = { def: outil1NicheAvatar, eleve: "Yasmine Benali", date: "16 octobre 2026" };

describe("profil partagé", () => {
  it("lit les textes, les listes et ignore les types inattendus", () => {
    const p: Profil = { a: "  bonjour ", l: ["x", " ", "y"], b: [{ niche: "Poids" }] };
    expect(texte(p, "a")).toBe("bonjour");
    expect(texte(p, "l")).toBe("");
    expect(liste(p, "l")).toEqual(["x", "y"]);
    expect(liste(p, "absent")).toEqual([]);
  });
  it("sait si un champ est rempli, sans rien imposer", () => {
    const [ecranPistes] = outil1NicheAvatar.ecrans;
    const niches = ecranPistes.champs[0];
    expect(champRempli({}, niches)).toBe(false);
    expect(champRempli({ "pistes.niches": [{}, { niche: "Poids" }] }, niches)).toBe(true);
  });
});

describe("registre des outils", () => {
  it("connaît l'outil 1 et ignore les autres codes", () => {
    expect(outilLiberty("liberty_niche_avatar")?.numero).toBe(1);
    expect(outilLiberty("liberty_webinaire")).toBeNull();
    expect(outilLiberty(null)).toBeNull();
    // chaque clé de champ est unique dans un outil
    for (const def of Object.values(OUTILS_LIBERTY)) {
      const cles = def.ecrans.flatMap((e) => e.champs.map((c) => c.cle));
      expect(new Set(cles).size).toBe(cles.length);
    }
  });
});

describe("outil 1 — document", () => {
  it("met la sous-niche et l'avatar en tête, et « à compléter » quand c'est vide", () => {
    const d = outil1NicheAvatar.document({ "sousNiche.phrase": "Mamans salariées qui veulent perdre du poids" });
    expect(d.titre).toBe("Fiche sous-niche & avatar");
    expect(d.sections[0].titre).toBe("En une phrase");
    const xml = corpsDocx(d, entete);
    expect(xml).toContain("Mamans salariées qui veulent perdre du poids");
    expect(xml).toContain(A_COMPLETER);
    expect(xml).toContain("PARCOURS LIBERTY · ÉTAPE 2");
    expect(xml).toContain("Yasmine Benali");
    expect(xml).toContain(RAPPEL_VALIDATION);
  });
  it("n'imprime que les niches remplies dans le tableau des pistes", () => {
    const d = outil1NicheAvatar.document({ "pistes.niches": [{ niche: "Poids", peurs: "Rester ainsi" }, {}, {}] });
    const tableau = d.sections[1].blocs[0];
    expect(tableau.t === "tableau" && tableau.lignes).toEqual([["Poids", "", "Rester ainsi", ""]]);
  });
  it("échappe le XML et garde les retours à la ligne", () => {
    const d = outil1NicheAvatar.document({ "avatar.situation": "Lyon & Paris <2 enfants>\nInfirmière" });
    const xml = corpsDocx(d, entete);
    expect(xml).toContain("Lyon &amp; Paris &lt;2 enfants&gt;");
    expect(xml).toContain("<w:br/>");
  });
  it("produit un vrai fichier Word", async () => {
    const blob = await genererDocx(outil1NicheAvatar.document({}), entete);
    const zip = await JSZip.loadAsync(blob);
    expect(Object.keys(zip.files)).toEqual(expect.arrayContaining(["word/document.xml", "word/styles.xml", "[Content_Types].xml"]));
    expect(await zip.file("word/styles.xml")!.async("string")).toContain("Calibri");
  });
  it("nomme le fichier sans accents ni espaces", () => {
    expect(nomFichier(outil1NicheAvatar, "Éléonore D'Arc")).toBe("Liberty_Etape2_Niche_avatar_Eleonore_D_Arc");
  });
});

describe("saisie", () => {
  it("garde les espaces tapés (le document, lui, les retire)", async () => {
    const { brut } = await import("./modele");
    expect(brut({ a: "Mamans " }, "a")).toBe("Mamans ");
    expect(texte({ a: "Mamans " }, "a")).toBe("Mamans");
    expect(brut({ a: ["x"] }, "a")).toBe("");
  });
});

describe("outil 2 — promesse & méthode", () => {
  it("assemble la promesse en direct, avec des repères pour ce qui manque", async () => {
    const { promesseAssemblee, promesseSpecifique, delaiEnJours } = await import("./partage");
    const p: Profil = { "sousNiche.phrase": "Hommes minces de plus de 25 ans.", "promesse.resultat": "prendre 7 kg de muscle", "promesse.delaiNombre": "12", "promesse.delaiUnite": "semaines" };
    expect(promesseAssemblee(p)).toBe("J'aide hommes minces de plus de 25 ans à prendre 7 kg de muscle en 12 semaines grâce à la méthode [nom de votre méthode].");
    expect(delaiEnJours(p)).toBe(84);
    expect(promesseSpecifique({ ...p, "promesse.specifiqueTexte": "Ma version." })).toBe("Ma version.");
    expect(promesseSpecifique({})).toBe("");
  });
  it("alerte sous 90 jours, sans bloquer", async () => {
    const { outil2PromesseMethode } = await import("./outil2PromesseMethode");
    const regle = outil2PromesseMethode.ecrans[0].champs.find((c) => c.cle === "info.regle90");
    expect(regle?.type === "info" && regle.rendu({ "promesse.delaiNombre": "30", "promesse.delaiUnite": "jours" })?.ton).toBe("alerte");
    expect(regle?.type === "info" && regle.rendu({ "promesse.delaiNombre": "3", "promesse.delaiUnite": "mois" })).toBeNull();
  });
  it("propose les solutions de l'écran 2 dans la méthode, et les range dans le document", async () => {
    const { outil2PromesseMethode } = await import("./outil2PromesseMethode");
    const { options } = await import("./modele");
    const p: Profil = {
      "solutions.liste": [{ probleme: "Pas de programme", solution: "Programme adapté" }, { probleme: "Ne cuisine pas", solution: "Recettes en 10 min" }],
      "methode.etapes": [{ nom: "Phase 1", solutions: "Programme adapté ; Recettes en 10 min" }],
    };
    const etapes = outil2PromesseMethode.ecrans[2].champs[0];
    const col = etapes.type === "blocs" ? etapes.colonnes.find((c) => c.cle === "solutions") : undefined;
    expect(col && col.type === "multi" ? options(col.options, p) : []).toEqual(["Programme adapté", "Recettes en 10 min"]);
    const d = outil2PromesseMethode.document(p);
    expect(d.sections[1].titre).toBe("Problèmes → solutions (2)");
    expect(JSON.stringify(d.sections[2])).toContain("Recettes en 10 min");
  });
});

describe("outil 6 — calendrier", () => {
  const idees = (n: string) => Array.from({ length: 10 }, (_, i) => `${n} ${i + 1}`);
  const base: Profil = { "contenu.tofu": idees("T"), "contenu.mofu": idees("M"), "contenu.bofu": idees("B"), "contenu.debut": "2026-10-19" };
  it("7 vidéos par semaine : 30 publications, la semaine type, chaque idée une seule fois", async () => {
    const { genererCalendrier } = await import("./outil6Calendrier");
    const cal = genererCalendrier({ ...base, "contenu.rythme": "7", "histoires.h1.premiere": "Le jour où j'ai failli tout arrêter…" });
    expect(cal).toHaveLength(30);
    // le 19/10/2026 est un lundi : TOFU, puis MOFU, puis l'histoire
    expect(cal.slice(0, 3).map((l) => l.niveau)).toEqual(["TOFU", "MOFU", "MOFU"]);
    expect(cal[2].sujet).toBe("Le jour où j'ai failli tout arrêter…");
    expect(cal[4]).toMatchObject({ niveau: "BOFU", pilier: "Preuve et offre", sujet: "B 1" });
    const sujets = cal.map((l) => l.sujet).filter((s) => /^[TMB] \d+$/.test(s ?? ""));
    expect(new Set(sujets).size).toBe(sujets.length);
  });
  it("3 vidéos par semaine : on saute des jours en gardant lundi, mercredi, vendredi", async () => {
    const { genererCalendrier } = await import("./outil6Calendrier");
    const cal = genererCalendrier({ ...base, "contenu.rythme": "3" });
    expect(cal.length).toBeGreaterThanOrEqual(12);
    expect(cal.length).toBeLessThanOrEqual(14);
    expect(new Set(cal.map((l) => new Date(`${l.date}T12:00:00`).getDay()))).toEqual(new Set([1, 3, 5]));
  });
  it("approche les piliers visés", async () => {
    const { genererCalendrier, repartitionPiliers } = await import("./outil6Calendrier");
    const r = repartitionPiliers(genererCalendrier({ ...base, "contenu.rythme": "7" }));
    expect(r["Éducatif"] + r["Histoires et inspiration"] + r["Preuve et offre"] + r["Coulisses"] + r["Communauté"]).toBeGreaterThanOrEqual(98);
    expect(r["Preuve et offre"]).toBeGreaterThanOrEqual(15);
  });
});

describe("outil 7 — accroches et scripts", () => {
  it("propose les sujets du calendrier avec leur niveau, et le modèle du type choisi", async () => {
    const { sujetsCalendrier, outil7AccrochesScripts, TYPES_ACCROCHE } = await import("./outil7AccrochesScripts");
    expect(sujetsCalendrier({ "contenu.tofu": ["3 erreurs"], "contenu.bofu": ["Karim +8 kg"] })).toEqual(["TOFU · 3 erreurs", "BOFU · Karim +8 kg"]);
    const champ = outil7AccrochesScripts.ecrans[0].champs[0];
    const texteCol = champ.type === "blocs" ? champ.colonnes.find((c) => c.cle === "texte") : undefined;
    expect(texteCol?.modele?.({ type: "Rupture" })).toBe(TYPES_ACCROCHE["Rupture"]);
    const d = outil7AccrochesScripts.document({
      "accroches.liste": [{ type: "Rupture", texte: "Tout le monde vous dit de manger moins." }, { texte: "Sans type" }],
      "scripts.liste": [{ accroche: "A", accrochesTest: "x ; y" }],
    });
    expect(d.sections[0].titre).toBe("Vos accroches (2)");
    expect(JSON.stringify(d.sections[1])).toContain('"x","y"');
  });
});

describe("les 7 outils", () => {
  it("génèrent leur document en Word, vides comme remplis", async () => {
    for (const def of Object.values(OUTILS_LIBERTY)) {
      for (const p of [{}, { "avatar.prenom": "Sarah", "promesse.resultat": "perdre 8 kg", "offre.prix": "1500" }] as Profil[]) {
        const xml = corpsDocx(def.document(p), { def, eleve: "Élève", date: "16 octobre 2026" });
        expect(xml).toContain(RAPPEL_VALIDATION);
      }
      expect(def.ecrans.length).toBeGreaterThan(0);
    }
    expect(Object.keys(OUTILS_LIBERTY)).toHaveLength(7);
  });
});
