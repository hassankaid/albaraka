/**
 * L'entrée « Liens de paiement » est masquée tant que Setting n'est pas
 * terminée.
 *
 * Demandé par Hassan le 28/09/2026, après avoir constaté que 294 porteurs de
 * pass voyaient l'entrée pour tomber sur un écran verrouillé.
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

    it(`${nom} la conditionne au déblocage payment_links`, () => {
      // La ligne de l'entrée doit porter featureRequired, sinon elle
      // s'affiche pour tous les porteurs de pass.
      const ligne = src.split("\n").find((l) => l.includes('"/working/lien-de-paiement"'));
      expect(ligne, "entrée introuvable").toBeDefined();
      expect(ligne).toContain('featureRequired: "payment_links"');
    });

    it(`${nom} applique réellement featureRequired dans son filtre`, () => {
      // Déclarer la propriété ne sert à rien si le filtre l'ignore — c'est le
      // cas de passRequired dans le bloc « working » d'ApporteurLayout.
      expect(src).toMatch(/item\.featureRequired[^\n]*aDebloque\(item\.featureRequired\)/);
    });
  }
});
