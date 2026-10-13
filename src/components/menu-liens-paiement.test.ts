/**
 * L'entrée « Liens de paiement » est réservée aux porteurs d'un pass.
 *
 * Historique : le 28/09/2026, Hassan l'avait masquée tant que Setting n'était
 * pas terminée ; le 13/10/2026, Sidali l'a ouverte à tous les élèves avec un
 * pass (« les élèves n'ont pas les liens de paiement »).
 *
 * Deux barres latérales coexistent — DashboardLayout et ApporteurLayout — et
 * l'oubli de la seconde est précisément le bug qu'on vient de corriger : les
 * élèves concernés sont presque tous des apporteurs, donc une entrée ajoutée
 * uniquement dans DashboardLayout n'est vue par personne.
 *
 * Ce test lit les sources plutôt que de monter les composants : ce qu'on veut
 * verrouiller, c'est la DÉCLARATION, pas le rendu — le rendu est déjà couvert
 * par ApporteurLayout.render.test.tsx.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const LAYOUTS = [
  "src/components/DashboardLayout.tsx",
  "src/components/ApporteurLayout.tsx",
];

describe("les deux barres latérales", () => {
  for (const chemin of LAYOUTS) {
    const nom = chemin.split("/").pop()!;
    const src = readFileSync(chemin, "utf-8");

    it(`${nom} déclare l'entrée Liens de paiement`, () => {
      expect(src).toContain('path: "/working/lien-de-paiement"');
    });

    it(`${nom} la réserve aux porteurs d'un pass, sans condition Setting`, () => {
      const ligne = src.split("\n").find((l) => l.includes('"/working/lien-de-paiement"'));
      expect(ligne, "entrée introuvable").toBeDefined();
      expect(ligne).toMatch(/passRequired: true|passOrStaff: true/);
      expect(ligne).not.toContain("featureRequired");
    });

    it(`${nom} applique réellement la condition de pass dans son filtre`, () => {
      // Déclarer la propriété ne sert à rien si le filtre l'ignore (c'était le
      // cas de passRequired dans le bloc « working » d'ApporteurLayout).
      expect(src).toMatch(/item\.passRequired && !hasAnyPass|item\.passOrStaff\) return hasAnyPass/);
    });
  }
});
