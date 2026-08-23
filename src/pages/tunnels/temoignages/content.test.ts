/**
 * Intégrité du contenu RÉELLEMENT publié.
 *
 * Les tests de rendu montent la page avec du contenu simulé : ils vérifient la
 * mécanique, pas ce qui part en ligne. Ce fichier-ci lit les vraies listes.
 *
 * Il garde deux fautes qui ne se voient qu'en production, et tard :
 *  - un hash Vimeo oublié → le lecteur refuse de démarrer, parce que les
 *    vidéos du compte sont réglées « masquée de Vimeo » ;
 *  - une capture référencée mais absente de `public/` → cadre vide sur la page.
 */

import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { SCREENSHOTS, VIDEOS } from "./content";
import { LANDING_TESTIMONIALS } from "../components/TunnelLanding";

describe("captures publiées", () => {
  it("pointent toutes vers un fichier réellement présent dans public/", () => {
    for (const shot of SCREENSHOTS) {
      expect(shot.src.startsWith("/")).toBe(true);
      const onDisk = resolve(__dirname, "../../../../public", shot.src.slice(1));
      expect(existsSync(onDisk), `${shot.src} est introuvable dans public/`).toBe(true);
    }
  });

  it("portent une description utile — elle remplace l'image si elle ne charge pas", () => {
    for (const shot of SCREENSHOTS) {
      expect(shot.alt.trim().length).toBeGreaterThan(10);
      expect(shot.alt.toLowerCase()).not.toMatch(/^capture/);
    }
  });
});

describe("vidéos publiées", () => {
  const all = [...VIDEOS, ...LANDING_TESTIMONIALS];

  it("ont toutes leur hash Vimeo — sans lui le lecteur refuse de démarrer", () => {
    for (const v of all) {
      if (v.kind !== "vimeo") continue;
      expect(v.hash, `la vidéo ${v.id} (« ${v.title} ») n'a pas de hash`).toBeTruthy();
      expect(v.hash).toMatch(/^[a-f0-9]{8,}$/);
    }
  });

  it("déclarent des proportions exploitables", () => {
    for (const v of all) {
      expect(v.ratio, `« ${v.title} » n'a pas de ratio`).toBeTruthy();
      expect(v.ratio).toMatch(/^\d+(\.\d+)? \/ \d+(\.\d+)?$/);
    }
  });

  it("écrivent les montants à la française — insécable avant l'euro", () => {
    // Deux raisons : la règle typographique, et surtout qu'un montant ne se
    // coupe pas en fin de ligne (« 6.656 » d'un côté, « € » de l'autre).
    // Ce test vérifie aussi que la séquence ` ` du fichier source est
    // bien interprétée : une insécable écrite en clair se perd au premier
    // copier-coller, et rien ne le signalerait autrement.
    for (const v of all) {
      for (const m of v.title.matchAll(/(.)€/g)) {
        expect(m[1], `« ${v.title} » : caractère ${JSON.stringify(m[1])} avant l'euro`).toBe(" ");
      }
    }
  });

  it("portent une légende", () => {
    for (const v of all) expect(v.title.trim().length).toBeGreaterThan(5);
  });

  it("n'apparaissent qu'une fois par page", () => {
    for (const list of [VIDEOS, LANDING_TESTIMONIALS]) {
      const ids = list.map((v) => (v.kind === "vimeo" ? v.id : v.src));
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe("landing et page témoignages", () => {
  it("réutilisent les mêmes vidéos, avec les mêmes proportions", () => {
    // Les six vidéos de la landing sont, fichier pour fichier, six de celles
    // de la page témoignages — seule la légende diffère. Si l'une des deux
    // listes dérive, c'est que quelqu'un a remplacé une vidéo d'un seul côté.
    const parRatio = new Map(
      VIDEOS.filter((v) => v.kind === "vimeo").map((v) => [(v as { id: string }).id, v.ratio]),
    );
    for (const v of LANDING_TESTIMONIALS) {
      if (v.kind !== "vimeo") continue;
      expect(parRatio.has(v.id), `la vidéo ${v.id} de la landing est absente de la page témoignages`).toBe(true);
      expect(v.ratio).toBe(parRatio.get(v.id));
    }
  });
});
