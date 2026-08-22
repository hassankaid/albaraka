/**
 * Rendu de la page /temoignages.
 *
 * La page a deux visages — emplacements d'attente tant que `content.ts` est
 * vide, vrais témoignages une fois rempli — et personne ne verra le second
 * avant que Sidali n'ait livré ses fichiers. Sans ces tests, la bascule ne
 * serait exercée pour la première fois qu'en production, le jour de la mise
 * en ligne des témoignages.
 *
 * Ce qui est vérifié ici et que TypeScript ne peut pas voir : la bascule
 * elle-même, l'URL d'embed Vimeo réellement construite, et le cadre vertical
 * des vidéos filmées au téléphone.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import type { ScreenshotTestimonial, VideoTestimonial } from "./content";

afterEach(() => {
  cleanup();
  vi.resetModules();
});

/** Monte la page avec un contenu et un lien Calendly choisis. */
async function renderPage(opts: {
  screenshots?: ScreenshotTestimonial[];
  videos?: VideoTestimonial[];
  calendlyUrl?: string | null;
}) {
  vi.resetModules();

  vi.doMock("./content", async () => {
    const actual = await vi.importActual<typeof import("./content")>("./content");
    return { ...actual, SCREENSHOTS: opts.screenshots ?? [], VIDEOS: opts.videos ?? [] };
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

describe("page Témoignages — en attente de contenu", () => {
  it("affiche les emplacements d'attente et le prévient au visiteur", async () => {
    const { container } = await renderPage({});

    expect(screen.getByText("Capture n°1")).toBeTruthy();
    expect(screen.getByText("Capture n°6")).toBeTruthy();
    expect(screen.queryByText("Capture n°7")).toBeNull();
    expect(screen.getByText("Témoignage vidéo n°3")).toBeTruthy();
    expect(screen.getByText(/Emplacements en attente/)).toBeTruthy();
    expect(container.querySelector("img")).toBeNull();
  });
});

describe("page Témoignages — avis écrits", () => {
  const shots: ScreenshotTestimonial[] = [
    { src: "https://cdn.test/avis-01.jpg", alt: "Karim : premier client en trois semaines" },
    { src: "https://cdn.test/avis-02.jpg", alt: "Naïma : « J'ai enfin structuré mon offre »" },
  ];

  it("remplace les emplacements par les vraies captures", async () => {
    const { container } = await renderPage({ screenshots: shots });

    const imgs = container.querySelectorAll<HTMLImageElement>(".albt-mosaic img");
    expect(imgs).toHaveLength(2);
    expect(imgs[0].getAttribute("src")).toBe("https://cdn.test/avis-01.jpg");
    expect(imgs[1].getAttribute("alt")).toContain("Naïma");
    expect(screen.queryByText("Capture n°1")).toBeNull();
  });

  it("n'impose aucune hauteur à l'image — une capture rognée serait illisible", async () => {
    const { container } = await renderPage({ screenshots: shots });

    const img = container.querySelector<HTMLImageElement>(".albt-mosaic img")!;
    expect(img.style.height).toBe("auto");
    expect(img.style.width).toBe("100%");
    // Un `objectFit: cover` recadrerait le texte de l'avis.
    expect(img.style.objectFit).toBe("");
  });

  it("laisse les vidéos en attente si seules les captures sont livrées", async () => {
    await renderPage({ screenshots: shots });

    expect(screen.getByText("Témoignage vidéo n°1")).toBeTruthy();
    expect(screen.getByText(/Emplacements en attente/)).toBeTruthy();
  });
});

describe("page Témoignages — vidéos", () => {
  it("construit l'URL d'embed Vimeo avec le hash des vidéos non listées", async () => {
    const { container } = await renderPage({
      videos: [
        { kind: "vimeo", id: "1012345678", hash: "a1b2c3d4e5", title: "Six semaines", author: "Yasmine" },
      ],
    });

    const iframe = container.querySelector("iframe")!;
    const url = new URL(iframe.getAttribute("src")!);
    expect(url.origin + url.pathname).toBe("https://player.vimeo.com/video/1012345678");
    expect(url.searchParams.get("h")).toBe("a1b2c3d4e5");
    expect(url.searchParams.get("dnt")).toBe("1");
    expect(iframe.getAttribute("title")).toBe("Six semaines");
  });

  it("omet le paramètre de hash quand la vidéo est publique", async () => {
    const { container } = await renderPage({
      videos: [{ kind: "vimeo", id: "76979871", title: "Publique" }],
    });

    const url = new URL(container.querySelector("iframe")!.getAttribute("src")!);
    expect(url.searchParams.has("h")).toBe(false);
  });

  it("lit un fichier hébergé avec son image d'attente, sans le précharger", async () => {
    const { container } = await renderPage({
      videos: [
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
    // Plusieurs vidéos sur la page : tout précharger coûterait cher en mobile.
    expect(video.getAttribute("preload")).toBe("metadata");
  });

  it("cadre en vertical une vidéo filmée au téléphone", async () => {
    const { container } = await renderPage({
      videos: [
        { kind: "file", src: "https://cdn.test/a.mp4", title: "Verticale", orientation: "portrait" },
        { kind: "file", src: "https://cdn.test/b.mp4", title: "Par défaut" },
      ],
    });

    const frames = [...container.querySelectorAll<HTMLVideoElement>("video")].map(
      (v) => (v.parentElement as HTMLElement).style.aspectRatio,
    );
    expect(frames[0]).toBe("9 / 16");
    expect(frames[1]).toBe("16 / 9");
  });

  it("affiche le titre, et l'auteur seulement s'il est renseigné", async () => {
    const { container } = await renderPage({
      videos: [
        { kind: "file", src: "https://cdn.test/a.mp4", title: "Avec auteur", author: "Yasmine" },
        { kind: "file", src: "https://cdn.test/b.mp4", title: "Sans auteur" },
      ],
    });

    expect(screen.getByText("Avec auteur")).toBeTruthy();
    expect(screen.getByText("Yasmine")).toBeTruthy();
    const captions = container.querySelectorAll("figcaption");
    expect(captions[1].textContent).toBe("Sans auteur");
  });

  it("retire le bandeau d'attente une fois les deux sections livrées", async () => {
    await renderPage({
      screenshots: [{ src: "https://cdn.test/a.jpg", alt: "Un avis" }],
      videos: [{ kind: "vimeo", id: "1", title: "Une vidéo" }],
    });

    expect(screen.queryByText(/Emplacements en attente/)).toBeNull();
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
