/**
 * Rendu de la page /temoignages.
 *
 * La page a deux visages — tuiles d'attente tant que `content.ts` est vide,
 * vrais témoignages une fois rempli. Sans ces tests, le second ne serait
 * exercé pour la première fois qu'en production.
 *
 * Ce qui est vérifié ici et que TypeScript ne voit pas : la bascule, le mur
 * unique (captures et vidéos mélangées, sans section par support), l'URL
 * d'embed Vimeo réellement construite, les proportions de chaque cadre, et
 * le bouton Calendly dans ses deux états.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import type { Testimonial } from "./content";

// Chaque cas remonte le module et monte la page : ~2 s à froid, et davantage
// quand la machine est chargée. Le délai par défaut (5 s) rendait ce fichier
// instable — vu échouer une fois sur quatre pendant un build concurrent.
vi.setConfig({ testTimeout: 20_000 });

afterEach(() => {
  cleanup();
  vi.resetModules();
});

/** Monte la page avec un contenu et un lien Calendly choisis. */
async function renderPage(opts: { items?: Testimonial[]; calendlyUrl?: string | null }) {
  vi.resetModules();

  vi.doMock("./content", async () => {
    const actual = await vi.importActual<typeof import("./content")>("./content");
    return { ...actual, TEMOIGNAGES: opts.items ?? [] };
  });

  vi.doMock("../theme", async () => {
    const actual = await vi.importActual<typeof import("../theme")>("../theme");
    return {
      ...actual,
      CONFERENCE: { ...actual.CONFERENCE, temoignagesCalendlyUrl: opts.calendlyUrl ?? null },
    };
  });

  // Le décor animé n'apporte rien ici et alourdirait chaque montage.
  vi.doMock("../components/TunnelBackground", () => ({ default: () => null }));

  const { default: Temoignages } = await import("./Temoignages");
  return render(<Temoignages />);
}

const capture: Testimonial = { kind: "capture", src: "/temoignages/avis-01.jpg", title: "L'élève dépasse le maître" };
const videoVimeo: Testimonial = { kind: "vimeo", id: "1012345678", hash: "a1b2c3d4e5", ratio: "9 / 16", title: "Six semaines pour changer de métier", author: "Yasmine" };

describe("page Témoignages — en attente de contenu", () => {
  it("affiche des tuiles d'attente et le dit au visiteur", async () => {
    const { container } = await renderPage({});

    expect(screen.getByText("Témoignage n°1")).toBeTruthy();
    expect(screen.getByText("Témoignage n°6")).toBeTruthy();
    expect(screen.queryByText("Témoignage n°7")).toBeNull();
    expect(screen.getByText(/Emplacements en attente/)).toBeTruthy();
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("iframe")).toBeNull();
  });
});

describe("page Témoignages — le mur", () => {
  it("mélange captures et vidéos dans un seul mur, sans section par support", async () => {
    const { container } = await renderPage({ items: [videoVimeo, capture] });

    const murs = container.querySelectorAll(".albt-mur");
    expect(murs).toHaveLength(1);
    expect(murs[0].querySelectorAll("figure")).toHaveLength(2);

    // La preuve ne se trie plus par support : ces intitulés ont disparu.
    expect(screen.queryByText(/Avis écrits/i)).toBeNull();
    expect(screen.queryByText(/Face caméra/i)).toBeNull();
    expect(screen.queryByText(/Emplacements en attente/)).toBeNull();
  });

  it("répartit les tuiles en colonnes, sans en perdre aucune", async () => {
    const { container } = await renderPage({ items: [capture, videoVimeo] });

    const colonnes = container.querySelectorAll(".albt-mur > .albt-col");
    expect(colonnes.length).toBeGreaterThan(0);
    expect(container.querySelectorAll(".albt-col figure")).toHaveLength(2);
    // Chaque tuile appartient à une colonne, aucune n'est restée à la racine.
    expect(container.querySelectorAll(".albt-mur > figure")).toHaveLength(0);
  });
});

describe("page Témoignages — captures", () => {
  it("n'impose aucune hauteur à l'image — une capture rognée serait illisible", async () => {
    const { container } = await renderPage({ items: [capture] });

    const img = container.querySelector<HTMLImageElement>("img")!;
    expect(img.getAttribute("src")).toBe("/temoignages/avis-01.jpg");
    expect(img.style.height).toBe("auto");
    expect(img.style.width).toBe("100%");
    // Un `objectFit: cover` recadrerait le texte de l'avis.
    expect(img.style.objectFit).toBe("");
  });

  it("reprend la légende comme description, et la préfère explicite si fournie", async () => {
    const { container } = await renderPage({
      items: [capture, { ...capture, src: "/temoignages/avis-02.jpg", alt: "Message de Karim, 12 mars" }],
    });

    const imgs = container.querySelectorAll<HTMLImageElement>("img");
    expect(imgs[0].getAttribute("alt")).toBe("L'élève dépasse le maître");
    expect(imgs[1].getAttribute("alt")).toBe("Message de Karim, 12 mars");
    expect(screen.getAllByText("L'élève dépasse le maître").length).toBeGreaterThan(0);
  });
});

describe("page Témoignages — vidéos", () => {
  it("construit l'URL d'embed Vimeo avec le hash des vidéos masquées", async () => {
    const { container } = await renderPage({ items: [videoVimeo] });

    const iframe = container.querySelector("iframe")!;
    const url = new URL(iframe.getAttribute("src")!);
    expect(url.origin + url.pathname).toBe("https://player.vimeo.com/video/1012345678");
    expect(url.searchParams.get("h")).toBe("a1b2c3d4e5");
    expect(url.searchParams.get("dnt")).toBe("1");
    expect(iframe.getAttribute("title")).toBe("Six semaines pour changer de métier");
  });

  it("diffère le chargement des lecteurs — la page en aligne une douzaine", async () => {
    const { container } = await renderPage({ items: [videoVimeo] });

    expect(container.querySelector("iframe")!.getAttribute("loading")).toBe("lazy");
  });

  it("omet le paramètre de hash quand la vidéo est publique", async () => {
    const { container } = await renderPage({
      items: [{ kind: "vimeo", id: "76979871", title: "Publique" }],
    });

    const url = new URL(container.querySelector("iframe")!.getAttribute("src")!);
    expect(url.searchParams.has("h")).toBe(false);
  });

  it("lit un fichier hébergé avec son image d'attente, sans le précharger", async () => {
    const { container } = await renderPage({
      items: [
        {
          kind: "file",
          src: "https://cdn.test/amine.mp4",
          poster: "https://cdn.test/amine.jpg",
          title: "Ce que j'aurais aimé savoir",
          author: "Amine",
        },
      ],
    });

    const video = container.querySelector<HTMLVideoElement>("video")!;
    expect(video.getAttribute("src")).toBe("https://cdn.test/amine.mp4");
    expect(video.getAttribute("poster")).toBe("https://cdn.test/amine.jpg");
    expect(video.getAttribute("controls")).not.toBeNull();
    expect(video.getAttribute("preload")).toBe("metadata");
  });

  it("respecte les proportions réelles de chaque vidéo", async () => {
    const { container } = await renderPage({
      items: [
        { kind: "file", src: "https://cdn.test/a.mp4", title: "Verticale", ratio: "9 / 16" },
        { kind: "file", src: "https://cdn.test/b.mp4", title: "Ancien appel", ratio: "4 / 3" },
        { kind: "file", src: "https://cdn.test/c.mp4", title: "Par défaut" },
      ],
    });

    const frames = [...container.querySelectorAll<HTMLVideoElement>("video")].map(
      (v) => (v.parentElement as HTMLElement).style.aspectRatio,
    );
    expect(frames).toEqual(["9 / 16", "4 / 3", "16 / 9"]);
  });

  it("affiche le prénom seulement s'il est renseigné", async () => {
    const { container } = await renderPage({
      items: [videoVimeo, { kind: "vimeo", id: "999", title: "Sans prénom" }],
    });

    expect(screen.getByText("Yasmine")).toBeTruthy();
    const captions = container.querySelectorAll("figcaption");
    expect(captions[1].textContent).toBe("Sans prénom");
  });
});

describe("page Témoignages — bouton de rendez-vous", () => {
  it("montre le panneau d'attente tant qu'aucun agenda n'existe", async () => {
    const { container } = await renderPage({ calendlyUrl: null });

    // `getByRole` plutôt que le texte : le panneau répète « ouvre très
    // bientôt » dans son titre ET dans son message.
    const panel = screen.getByRole("status");
    expect(panel.textContent).toContain("La prise de rendez-vous ouvre très bientôt");
    expect(container.querySelector("a.albt-cta")).toBeNull();
  });

  it("affiche le bouton dès que l'agenda est recollé dans la config", async () => {
    const { container } = await renderPage({
      calendlyUrl: "https://calendly.com/d/xxxx-yyyy-zzz/temoignages",
    });

    const cta = container.querySelector<HTMLAnchorElement>("a.albt-cta")!;
    expect(cta.getAttribute("href")).toBe("https://calendly.com/d/xxxx-yyyy-zzz/temoignages");
    expect(cta.textContent).toContain("Prendre rendez-vous");
  });
});
