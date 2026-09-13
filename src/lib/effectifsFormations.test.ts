import { describe, it, expect } from "vitest";
import { compterEleves } from "./effectifsFormations";

describe("compterEleves", () => {
  const lignes = [
    { formation_id: "setting", user_id: "a" },
    { formation_id: "closing", user_id: "a" },
    { formation_id: "setting", user_id: "b" },
    { formation_id: "setting", user_id: "ceo" },
  ];

  it("compte les élèves par formation", () => {
    expect(compterEleves(lignes, "ceo").parFormation).toEqual({ setting: 2, closing: 1 });
  });

  it("compte chaque personne une seule fois dans le total", () => {
    expect(compterEleves(lignes, "ceo").total).toBe(2);
  });

  it("ne compte pas le CEO qui consulte", () => {
    expect(compterEleves(lignes, null).total).toBe(3);
    expect(compterEleves(lignes, "ceo").total).toBe(2);
  });

  it("ne compte pas deux fois une inscription en double", () => {
    expect(compterEleves([...lignes, { formation_id: "setting", user_id: "b" }], "ceo").parFormation.setting).toBe(2);
  });
});
