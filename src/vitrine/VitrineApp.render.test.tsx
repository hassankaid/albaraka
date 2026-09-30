/**
 * Le site vitrine, affiché pour de vrai.
 *
 *  • les six blocs du cahier sont là, dans l'ordre, avec leurs ancres ;
 *  • la prise de rendez-vous passe par l'agenda Calendly du site (depuis le
 *    29/09/2026), avec les UTM de l'arrivée ; plus aucun formulaire ;
 *  • les constantes Supabase recopiées restent celles du client.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, cleanup, screen, fireEvent } from "@testing-library/react";
import VitrineApp from "./VitrineApp";
import { SUPABASE_CLE_PUBLIQUE, SUPABASE_URL } from "./api";
import { cartesVisibles, nombrePositions } from "./composants/Carrousel";

beforeEach(() => {
  window.history.pushState({}, "", "/site-vitrine/");
  // jsdom n'a ni ResizeObserver ni scrollTo.
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  Element.prototype.scrollIntoView = vi.fn();
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** Le réseau simulé : le site ne fait qu'une lecture, celle des témoignages. */
function reseau(opts: { temoignages?: unknown[] } = {}) {
  const espion = vi.spyOn(globalThis, "fetch").mockImplementation(async (entree) => {
    const url = String(entree);
    if (url.includes("/rest/v1/temoignages_vitrine")) return new Response(JSON.stringify(opts.temoignages ?? []), { status: 200 });
    return new Response("{}", { status: 200 });
  });
  return { espion };
}

describe("site vitrine", () => {
  it("affiche les six blocs dans l'ordre du cahier, avec leurs ancres", () => {
    reseau();
    const { container } = render(<VitrineApp />);
    const ids = [...container.querySelectorAll("section[id], footer[id]")].map((e) => e.id);
    expect(ids).toEqual(["top", "histoire", "mission", "retours", "rendez-vous", "footer"]);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Bâtissez une activité qui vous ressemble.");
  });

  it("montre dix cartes de témoignage, non lisibles tant qu'aucune vidéo n'est fournie", async () => {
    reseau();
    render(<VitrineApp />);
    const cartes = await screen.findAllByRole("button", { name: /Témoignage \d\d bientôt disponible/ });
    expect(cartes).toHaveLength(10);
    for (const c of cartes) expect((c as HTMLButtonElement).disabled).toBe(true);
    // Aucun lecteur Vimeo chargé avant un clic.
    expect(document.querySelector('iframe[src*="vimeo"]')).toBeNull();
  });

  it("le pied de page porte le bloc légal et les trois liens, sans bandeau cookies", () => {
    reseau();
    render(<VitrineApp />);
    const pied = document.getElementById("footer")!;
    expect(pied.textContent).toContain("ETHICARENA L.L.C-FZ – Licence n° 2422583.01");
    expect(pied.textContent).toContain("Meta Platforms, Inc.");
    expect(pied.textContent).toContain("© 2026 - www.albarakaecosysteme.com / Tous droits réservés");
    for (const l of ["Mentions légales", "Politique de confidentialité", "Conditions générales de vente"])
      expect(screen.getAllByText(l).length).toBeGreaterThan(0);
    // Bandeau et lien « Gérer les cookies » retirés le 30/09/2026 (décision de Hassan).
    expect(screen.queryByText("Gérer les cookies")).toBeNull();
    expect(screen.queryByText("Accepter")).toBeNull();
    // Les liens légaux ouvrent un nouvel onglet, sous le préfixe de l'aperçu.
    const mentions = screen.getByRole("link", { name: "Mentions légales" });
    expect(mentions.getAttribute("href")).toBe("/site-vitrine/mentions-legales");
    expect(mentions.getAttribute("target")).toBe("_blank");
  });

  it("propose l'agenda Calendly du site, et plus aucun formulaire", () => {
    const { espion } = reseau();
    render(<VitrineApp />);
    const agenda = screen.getByTitle("Choisir un créneau de rendez-vous") as HTMLIFrameElement;
    expect(agenda.src.startsWith("https://calendly.com/d/dz73-r3j-q2v/site-web-al-baraka?")).toBe(true);
    expect(agenda.getAttribute("loading")).toBe("lazy");
    expect(screen.queryByRole("button", { name: "Demander un rendez-vous" })).toBeNull();
    // Plus aucun envoi vers tunnel-lead-submit : c'est le webhook Calendly qui crée le lead.
    expect(espion.mock.calls.some(([u]) => String(u).includes("tunnel-lead-submit"))).toBe(false);
  });

  it("transmet à Calendly les UTM de l'arrivée", () => {
    window.history.pushState({}, "", "/site-vitrine/?utm_source=instagram&utm_medium=bio");
    reseau();
    render(<VitrineApp />);
    const src = new URL((screen.getByTitle("Choisir un créneau de rendez-vous") as HTMLIFrameElement).src);
    expect(src.searchParams.get("utm_source")).toBe("instagram");
    expect(src.searchParams.get("utm_medium")).toBe("bio");
    expect(src.searchParams.get("embed_type")).toBe("Inline");
  });
});

describe("témoignages publiés depuis la plateforme", () => {
  it("remplacent les cartes de réserve, et le lecteur Vimeo n'arrive qu'au clic", async () => {
    reseau({
      temoignages: [
        { vimeo_id: "123456789", hash: "abcdef1234", miniature: null, prenom: "Miradie", activite: "Setter" },
      ],
    });
    render(<VitrineApp />);
    const carte = await screen.findByRole("button", { name: "Lire le témoignage de Miradie, Setter" });
    expect(screen.queryByText("[Prénom]")).toBeNull();
    expect(document.querySelector('iframe[src*="vimeo"]')).toBeNull();
    fireEvent.click(carte);
    const lecteur = document.querySelector('iframe[src*="vimeo"]') as HTMLIFrameElement;
    expect(lecteur.src).toContain("https://player.vimeo.com/video/123456789?h=abcdef1234&dnt=1");
  });

  it("ne montrent jamais « [Prénom] » pendant le chargement", () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise(() => {}));
    render(<VitrineApp />);
    expect(screen.queryByText("[Prénom]")).toBeNull();
    expect(screen.getAllByRole("button", { name: "Témoignage en cours de chargement" })).toHaveLength(10);
  });
});

describe("carrousel", () => {
  it("4 cartes à 1200 px et 7 positions pour 10 vidéos, comme la maquette", () => {
    expect(cartesVisibles(1200)).toBe(4);
    expect(nombrePositions(10, 4)).toBe(7);
  });
  it("2 cartes sur tablette, jamais zéro", () => {
    expect(cartesVisibles(720)).toBe(2);
    expect(cartesVisibles(100)).toBe(1);
    expect(nombrePositions(10, 12)).toBe(1);
  });
});

describe("constantes Supabase recopiées", () => {
  it("restent identiques à celles du client de la plateforme", async () => {
    const client = await import("@/integrations/supabase/client");
    expect(SUPABASE_URL).toBe(client.SUPABASE_URL);
    expect(SUPABASE_CLE_PUBLIQUE).toBe(client.SUPABASE_PUBLISHABLE_KEY);
  });
});
