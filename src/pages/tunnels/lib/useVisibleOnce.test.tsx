/**
 * Report du chargement des lecteurs.
 *
 * Mesuré en production le 24/08/2026 : malgré `loading="lazy"`, les 11
 * lecteurs de /temoignages se chargeaient AVANT tout défilement — 4,2 Mo sur
 * mobile, 2,8 Mo sur la landing publicitaire. D'où un report explicite.
 *
 * jsdom n'implémente pas IntersectionObserver : ces tests en posent un faux,
 * ce qui permet de vérifier les deux états. Sans ce faux, le composant monte
 * tout de suite — c'est le repli voulu, et il est vérifié ici aussi.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import TestimonialTile from "../components/TestimonialTile";
import type { Testimonial } from "./testimonials";

const video: Testimonial = {
  kind: "vimeo",
  id: "1220657728",
  hash: "748144b688",
  ratio: "9 / 16",
  title: "Un témoignage",
};

/** Faux observateur : on garde la main pour déclencher l'entrée à l'écran. */
function poseFauxObservateur() {
  const rappels: Array<() => void> = [];
  let margeUtilisee = "";
  class Faux {
    constructor(cb: IntersectionObserverCallback, opts?: IntersectionObserverInit) {
      margeUtilisee = String(opts?.rootMargin ?? "");
      rappels.push(() => cb([{ isIntersecting: true } as IntersectionObserverEntry], this as never));
    }
    observe() {}
    disconnect() {}
    unobserve() {}
    takeRecords() { return []; }
    root = null; rootMargin = ""; thresholds = [];
  }
  (window as unknown as { IntersectionObserver: unknown }).IntersectionObserver = Faux;
  return { approche: () => rappels.forEach((r) => r()), marge: () => margeUtilisee };
}

afterEach(() => {
  cleanup();
  delete (window as unknown as { IntersectionObserver?: unknown }).IntersectionObserver;
  vi.restoreAllMocks();
});

describe("report du chargement des lecteurs", () => {
  it("ne monte aucun lecteur tant que la tuile est loin de l'écran", () => {
    poseFauxObservateur();
    const { container } = render(<TestimonialTile item={video} />);

    expect(container.querySelector("iframe")).toBeNull();
    // Le cadre est déjà là, aux bonnes proportions : rien ne bougera au montage.
    const cadre = container.querySelector<HTMLElement>("figure > div")!;
    expect(cadre.style.aspectRatio).toBe("9 / 16");
    // La légende, elle, est visible tout de suite : c'est le texte qui vend.
    expect(container.textContent).toContain("Un témoignage");
  });

  it("monte le lecteur dès que la tuile approche", async () => {
    const obs = poseFauxObservateur();
    const { container, findByTitle } = render(<TestimonialTile item={video} />);
    expect(container.querySelector("iframe")).toBeNull();

    obs.approche();

    const iframe = await findByTitle("Un témoignage");
    expect(iframe.getAttribute("src")).toContain("player.vimeo.com/video/1220657728");
  });

  it("déclenche BIEN avant l'entrée à l'écran, pour que le visiteur ne voie rien", () => {
    const obs = poseFauxObservateur();
    render(<TestimonialTile item={video} />);

    const marge = Number(obs.marge().replace("px", ""));
    expect(marge).toBeGreaterThanOrEqual(400);
  });

  it("monte tout de suite quand le navigateur n'a pas d'observateur", () => {
    // Repli : mieux vaut charger que ne jamais afficher.
    const { container } = render(<TestimonialTile item={video} />);
    expect(container.querySelector("iframe")).not.toBeNull();
  });
});
