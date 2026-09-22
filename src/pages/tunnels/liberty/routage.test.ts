// Le chemin `/liberty` existe DEUX FOIS, sur deux domaines différents :
//   - event.albarakaecosysteme.com/liberty  → le tunnel de vente
//   - plateforme.albarakaecosysteme.com/liberty → la page de PAIEMENT Liberty
//
// Les règles de vercel.json renvoient vers `introuvable.html` les chemins de
// tunnel demandés sur les domaines de l'application. Y ajouter `liberty` par
// symétrie avec les autres tunnels remplacerait la page de paiement par une
// page d'erreur — en silence, et sans que rien ne casse au build.
//
// Ce test verrouille la dissymétrie.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

interface Rewrite {
  source: string;
  destination: string;
  has?: Array<{ type: string; value: string }>;
}

const config = JSON.parse(readFileSync(resolve(process.cwd(), "vercel.json"), "utf-8")) as {
  rewrites: Rewrite[];
};

const pourHote = (r: Rewrite) => r.has?.find((h) => h.type === "host")?.value ?? "";

describe("routage du chemin /liberty", () => {
  it("est servi comme tunnel sur le domaine des tunnels", () => {
    const regles = config.rewrites.filter(
      (r) => pourHote(r) === "event.albarakaecosysteme.com" && r.destination === "/index.html",
    );
    expect(regles.length).toBeGreaterThan(0);
    expect(regles.some((r) => r.source.includes("liberty"))).toBe(true);
  });

  it("n'est JAMAIS renvoyé vers introuvable.html sur les domaines de l'app", () => {
    for (const r of config.rewrites) {
      if (r.destination !== "/introuvable.html") continue;
      if (!pourHote(r).includes("plateforme")) continue;
      expect(
        r.source.includes("liberty"),
        `la règle « ${r.source} » masquerait la page de paiement Liberty`,
      ).toBe(false);
    }
  });

  it("garde les autres tunnels hors des domaines de l'app", () => {
    const regles = config.rewrites.filter(
      (r) => r.destination === "/introuvable.html" && pourHote(r).includes("plateforme"),
    );
    expect(regles.length).toBeGreaterThan(0);
    for (const cle of ["webinaire", "vsl", "al-baraka-200"]) {
      expect(regles.some((r) => r.source.includes(cle))).toBe(true);
    }
  });
});
