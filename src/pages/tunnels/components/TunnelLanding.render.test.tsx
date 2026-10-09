/**
 * Version Google Ads de la landing (09/10/2026).
 *
 * Les pubs Google ont été refusées : le media buyer a fourni un copy sans
 * promesse de revenus, servi UNIQUEMENT aux liens `?src=google_ads`. Ce qui
 * doit tenir :
 *  • la landing de tous les autres liens (Snap, Meta, organique…) ne change pas ;
 *  • `?src=google_ads` (ou `gads`) affiche le nouveau copy, sur /webinaire comme /vsl ;
 *  • le gclid seul ne bascule PAS : le vérificateur Google, qui n'en a pas,
 *    doit voir exactement la même page que les visiteurs ;
 *  • aucune promesse de revenus ne subsiste dans la version Google ;
 *  • le ViewContent part comme avant.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const trackLandingView = vi.fn();
vi.mock("../lib/pixel", () => ({ trackLandingView: () => trackLandingView() }));
vi.mock("../lib/abtest", () => ({ exposerLanding: vi.fn(async () => undefined) }));
vi.mock("./TunnelBackground", () => ({ default: () => null }));
vi.mock("./OptInModal", () => ({ default: () => null }));
vi.mock("./TestimonialTile", () => ({ default: () => <div data-testid="temoignage" /> }));
vi.mock("./FeaturedTestimonial", () => ({ default: () => <div data-testid="compilation" /> }));

import TunnelLanding from "./TunnelLanding";
import { WA_TUNNEL, VSL_TUNNEL } from "../config";
import { estLienGoogleAds } from "../lib/source";

function monter(url: string, tunnel = WA_TUNNEL) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <TunnelLanding tunnel={tunnel} />
    </MemoryRouter>,
  );
}

const texte = () => document.body.textContent ?? "";

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  trackLandingView.mockClear();
});
afterEach(cleanup);

describe("landing standard (tous les liens sauf Google Ads)", () => {
  it.each(["/webinaire", "/webinaire?src=snap_ads", "/webinaire?src=ads", "/vsl?src=tiktok_ads"])("%s garde le copy actuel", (url) => {
    monter(url);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Remplace ton salaire en moins de 6 mois grâce à l'Écosystème Al Baraka");
    expect(texte()).toContain("Pour les musulmans de 20 à 30 ans qui veulent vivre librement sans sacrifier leur foi");
    expect(texte()).toContain("La 1ère plateforme de business en ligne construite par des musulmans, pour des musulmans.");
    expect(texte()).toContain("En moins de 90 jours, certains ont généré leurs premiers revenus en ligne. Sans expérience. Sans réseau. Juste les bonnes compétences dans le bon environnement. Cette conférence te montre lequel.");
    expect(texte()).toContain("Pourquoi ta génération a un avantage que personne ne t'a dit");
    expect(texte()).toContain("Ils l'ont fait avant toi");
    expect(screen.getAllByRole("button", { name: /Je m'inscris à la conférence/ })).toHaveLength(3);
    expect(texte()).not.toContain("conférence gratuite");
  });

  it("le gclid seul ne bascule pas (le vérificateur Google n'en a pas)", () => {
    monter("/webinaire?gclid=abc123");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/^Remplace ton salaire/);
  });
});

describe("landing Google Ads (?src=google_ads)", () => {
  it.each([
    ["/webinaire?src=google_ads", WA_TUNNEL],
    ["/vsl?src=google_ads", VSL_TUNNEL],
    ["/webinaire?src=gads&gclid=abc", WA_TUNNEL],
    ["/webinaire?v=3&src=GOOGLE_ADS", WA_TUNNEL],
  ] as const)("%s affiche le copy du media buyer, mot pour mot", (url, tunnel) => {
    monter(url, tunnel);
    expect(texte()).toContain("Pour celles et ceux qui veulent construire une activité en ligne alignée avec leurs valeurs");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Découvre comment construire une activité en ligne halal, qui te ressemble");
    expect(texte()).toContain("Une plateforme de business en ligne construite par des musulmans, pour des musulmans.");
    expect(texte()).toContain("Une conférence gratuite pour comprendre les compétences recherchées en ligne et comment les apprendre dans un cadre qui respecte tes valeurs.");
    for (const titre of [
      "Pourquoi les compétences comptent plus que le diplôme",
      "La compétence qui sert de point de départ",
      "Comment avancer sans trahir ce que tu es",
    ]) expect(screen.getByRole("heading", { name: titre })).toBeTruthy();
    expect(texte()).toContain("Chaque parcours est différent : les résultats dépendent de l'implication de chacun, de sa situation de départ et du contexte.");
    expect(texte()).toContain("Ils racontent leur parcours");
    expect(screen.getAllByRole("button", { name: /Je m'inscris à la conférence gratuite/ })).toHaveLength(3);
  });

  it("garde la même structure : logo, compilation et mur de témoignages", () => {
    monter("/webinaire?src=google_ads");
    expect(texte()).toMatch(/AL\u00a0BARAKA/); // logo (espace insécable)
    expect(screen.getByTestId("compilation")).toBeTruthy();
    expect(screen.getAllByTestId("temoignage").length).toBeGreaterThan(0);
  });

  it("ne contient plus aucune promesse de revenus", () => {
    monter("/webinaire?src=google_ads");
    const t = texte().toLowerCase();
    for (const promesse of ["salaire", "revenus", "90 jours", "6 mois", "liberté financière", "1ère plateforme"]) {
      expect(t, promesse).not.toContain(promesse);
    }
  });

  it("envoie le ViewContent comme la landing standard", () => {
    monter("/webinaire?src=google_ads");
    expect(trackLandingView).toHaveBeenCalledTimes(1);
  });
});

describe("estLienGoogleAds", () => {
  it("ne regarde que src", () => {
    expect(estLienGoogleAds("?src=google_ads")).toBe(true);
    expect(estLienGoogleAds("?src=gads")).toBe(true);
    expect(estLienGoogleAds("?src=%20Google_Ads%20")).toBe(true);
    expect(estLienGoogleAds("?gclid=x")).toBe(false);
    expect(estLienGoogleAds("?src=ads&utm_source=google")).toBe(false);
    expect(estLienGoogleAds("?src=snap_ads")).toBe(false);
    expect(estLienGoogleAds("")).toBe(false);
  });
});
