import { describe, expect, it } from "vitest";
import { principaleClaire, principaleLisible } from "./apercu";

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
