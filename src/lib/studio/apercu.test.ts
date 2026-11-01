import { describe, expect, it } from "vitest";
import { dessinerSousTitreFinal, principaleClaire, principaleLisible } from "./apercu";
import type { Reglages } from "./reglages";

// Toile factice : relève la couleur et la police de chaque texte écrit.
function toile() {
  const ecrits: { texte: string; couleur: string; police: string; y: number }[] = [];
  const ctx: any = {
    fillStyle: "", font: "", save() {}, restore() {}, strokeText() {},
    measureText: () => ({ width: 100 }),
    fillText(texte: string, _x: number, y: number) { ecrits.push({ texte, couleur: this.fillStyle, police: this.font, y }); },
  };
  return { ctx, ecrits };
}
const reglages = (actif: boolean) => ({
  sous_titres: { texte: "#FFFFFF", contour: "#000000", ombre: "#000000" },
  design: { actif, palette: "bleu_electrique", principale: "#C9A45C", fond: "#0F0F0F", texte: "#FFFFFF" },
}) as unknown as Reglages;
const dernier = (e: { texte: string }[], t: string) => [...e].reverse().find((x) => x.texte === t) as any;

describe("sous-titre de l'aperçu, comme dans la vidéo finale", () => {
  it("version gratuite : place et taille du moteur classique, mot clé dans la couleur principale", () => {
    const { ctx, ecrits } = toile();
    dessinerSousTitreFinal(ctx, "voici tes", "mots", reglages(true), "gratuit");
    expect(dernier(ecrits, "mots").couleur).toBe(principaleClaire("#3B82F6"));
    expect(dernier(ecrits, "VOICI TES").couleur).toBe("#FFFFFF");
    expect(dernier(ecrits, "mots").police).toContain("205px");
  });
  it("abonné : mise en page Hyperframes", () => {
    const { ctx, ecrits } = toile();
    dessinerSousTitreFinal(ctx, "voici tes", "mots", reglages(true), "complet");
    expect(dernier(ecrits, "mots").couleur).toBe(principaleClaire("#3B82F6"));
    expect(dernier(ecrits, "mots").police).toContain("172px");
  });
  it("sans motion design : le mot clé garde la couleur du texte", () => {
    const { ctx, ecrits } = toile();
    dessinerSousTitreFinal(ctx, "voici tes", "mots", reglages(false), "gratuit");
    expect(dernier(ecrits, "mots").couleur).toBe("#FFFFFF");
  });
});

describe("lisibilité du motion design", () => {
  it("assombrit une couleur principale claire posée sur un encadré clair (Rose poudré)", () => {
    expect(principaleLisible("#F4A6B8", "#FFFFFF")).toBe("rgb(134,91,101)");
  });
  it("garde la couleur principale sur un encadré sombre", () => {
    expect(principaleLisible("#C9A45C", "#0F0F0F")).toBe("#C9A45C");
  });
});

describe("aperçu du motion design Hyperframes", () => {
  it("éclaircit la couleur principale pour le mot clé, comme le moteur", () => {
    expect(principaleClaire("#C9A45C")).toBe("rgb(225,205,165)");
    expect(principaleClaire("#FFFFFF")).toBe("#FFFFFF");
  });
});
