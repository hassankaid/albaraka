// Ces trois pages sont envoyées à toute la liste d'une conférence, une fois,
// à heure fixe. Une erreur ne se rattrape pas : le mail est parti.
//
// Deux pièges, les mêmes que sur les autres vidéos du module :
//   - une vidéo sans hash ne démarre pas (le compte les publie « masquées » ) ;
//   - une page absente des règles d'hôte de vercel.json est servie en
//     « introuvable » sur event., le domaine d'où le mail l'ouvre.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { vimeoEmbedUrl } from "../variants";
import { VIDEOS, cheminVideo, estOuverte } from "./content";

interface Rewrite {
  source: string;
  destination: string;
  has?: Array<{ type: string; value: string }>;
}

const config = JSON.parse(readFileSync(resolve(process.cwd(), "vercel.json"), "utf-8")) as {
  rewrites: Rewrite[];
};

const pourHote = (r: Rewrite) => r.has?.find((h) => h.type === "host")?.value ?? "";

describe("les trois vidéos de nurturing", () => {
  it("sont les trois fournies par Hassan le 23/09/2026, dans l'ordre", () => {
    expect(VIDEOS.map((v) => v.video.vimeoId)).toEqual([
      "1228532746",
      "1228543782",
      "1228540094",
    ]);
    expect(VIDEOS.map((v) => v.numero)).toEqual([1, 2, 3]);
  });

  it("portent toutes leur hash — sans lui le lecteur refuse de démarrer", () => {
    for (const v of VIDEOS) {
      expect(v.video.vimeoHash, `la vidéo ${v.numero} n'a pas de hash`).toBeTruthy();
      expect(v.video.vimeoHash).toMatch(/^[a-f0-9]{8,}$/);
    }
  });

  it("transportent le hash jusque dans l'URL du lecteur", () => {
    for (const v of VIDEOS) {
      const url = new URL(vimeoEmbedUrl(v.video));
      expect(url.pathname).toBe(`/video/${v.video.vimeoId}`);
      expect(url.searchParams.get("h")).toBe(v.video.vimeoHash);
    }
  });

  it("ne montrent jamais deux fois la même vidéo", () => {
    const ids = VIDEOS.map((v) => v.video.vimeoId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("portent un onglet et une accroche lisibles", () => {
    for (const v of VIDEOS) {
      expect(v.onglet.trim().length).toBeGreaterThan(3);
      expect(v.accroche.trim().length).toBeGreaterThan(10);
    }
  });
});

describe("routage des pages de nurturing", () => {
  const chemins = VIDEOS.map((v) => cheminVideo(v.numero));

  it("donne /video-1, /video-2 et /video-3", () => {
    expect(chemins).toEqual(["/video-1", "/video-2", "/video-3"]);
  });

  it("les sert bien depuis le domaine des tunnels", () => {
    const regles = config.rewrites.filter(
      (r) => pourHote(r) === "event.albarakaecosysteme.com" && r.destination === "/index.html",
    );
    expect(regles.length).toBeGreaterThan(0);
    for (const chemin of chemins) {
      expect(
        regles.some((r) => new RegExp(`^${r.source}$`).test(chemin)),
        `${chemin} ne serait pas servi sur event. — le mail ouvrirait une page introuvable`,
      ).toBe(true);
    }
  });

  it("déclare aussi les trois routes dans l'application", () => {
    const app = readFileSync(resolve(process.cwd(), "src/App.tsx"), "utf-8");
    for (const chemin of chemins) {
      expect(app, `la route ${chemin} manque dans App.tsx`).toContain(`path="${chemin}"`);
    }
  });
});

describe("ce qui est ouvert selon la partie où l'on est", () => {
  // La règle demandée par Hassan le 23/09/2026 : on voit ce qu'on a déjà
  // reçu, jamais ce qui n'est pas encore parti.
  it("sur la partie 1, seule la première est ouverte", () => {
    expect([1, 2, 3].map((n) => estOuverte(n, 1))).toEqual([true, false, false]);
  });

  it("sur la partie 2, la troisième reste fermée", () => {
    expect([1, 2, 3].map((n) => estOuverte(n, 2))).toEqual([true, true, false]);
  });

  it("sur la partie 3, tout est ouvert", () => {
    expect([1, 2, 3].map((n) => estOuverte(n, 3))).toEqual([true, true, true]);
  });
});

describe("vignettes des trois parties", () => {
  it("sont renseignées et servies par le CDN Vimeo", () => {
    for (const v of VIDEOS) {
      expect(v.miniature, `la vidéo ${v.numero} n'a pas de vignette`).toBeTruthy();
      expect(v.miniature).toMatch(/^https:\/\/i\.vimeocdn\.com\/video\//);
    }
  });

  it("sont trois images distinctes", () => {
    const urls = VIDEOS.map((v) => v.miniature);
    expect(new Set(urls).size).toBe(urls.length);
  });
});
