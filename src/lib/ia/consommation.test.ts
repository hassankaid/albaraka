import { describe, expect, it } from "vitest";
import { bornes, CATALOGUE, joursDe, recenser, usd, versCSV } from "./consommation";

describe("recenser", () => {
  it("garde tout le catalogue, même sans usage, et ajoute les clés inconnues", () => {
    const r = recenser([
      { fonctionnalite: "agent_setting", appels: 3, cout: 0.05, utilisateurs: 1, dernier: null, erreurs: 0 },
      { fonctionnalite: "nouvelle_ia", appels: 1, cout: 0.2, utilisateurs: 1, dernier: null, erreurs: 0 },
    ]);
    expect(r).toHaveLength(CATALOGUE.length + 1);
    expect(r[0].fonctionnalite).toBe("nouvelle_ia");
    expect(r[0].fiche.nom).toBe("nouvelle_ia");
    expect(r[1].fiche.nom).toBe("Agent IA Setting");
    expect(r.find((l) => l.fonctionnalite === "lecture_rib")?.appels).toBe(0);
  });
});

describe("bornes", () => {
  const maintenant = new Date(2026, 9, 19, 22, 0);
  it("mois dernier : du 1er septembre au 1er octobre", () => {
    const { debut, fin } = bornes("mois_dernier", maintenant);
    expect([debut.getMonth(), debut.getDate(), fin.getMonth(), fin.getDate()]).toEqual([8, 1, 9, 1]);
  });
  it("7 jours : aujourd'hui compris", () => {
    const { debut, fin } = bornes("7j", maintenant);
    expect(joursDe(debut, fin)).toHaveLength(7);
    expect(joursDe(debut, fin).at(-1)).toBe("2026-10-19");
  });
});

describe("formats", () => {
  it("les petits coûts gardent 3 décimales", () => {
    expect(usd(0.0068)).toBe("0,007 $");
    expect(usd(18.4962)).toBe("18,50 $");
    expect(usd(0)).toBe("0 $");
    expect(usd(0.000186)).toBe("< 0,001 $");
    expect(usd(null)).toBe("—");
  });
  it("CSV au format Excel français", () => {
    expect(versCSV([["Nom", "Coût"], ['A "B"; C', 1.5]])).toBe('﻿Nom;Coût\n"A ""B""; C";1.5');
  });
});
