// @vitest-environment-options { "url": "https://event.albarakaecosysteme.com/webinaire" }

/**
 * Google Tag Manager, tunnel Al Baraka classique uniquement.
 *
 * Deux choses silencieuses à verrouiller :
 *  • le PÉRIMÈTRE — GTM ne doit jamais se charger sur Liberty ni sur
 *    Al Baraka 200, qui ont leurs propres audiences : le media buyer y
 *    optimiserait TikTok et Snap sur des conversions d'un autre tunnel ;
 *  • les GARDE-FOUS — un Lead ou un rendez-vous ne part vers GTM que dans les
 *    cas où il part vers Meta : jamais au rechargement d'une page.
 *
 * L'URL est forcée sur le domaine des tunnels : ailleurs, tout est sans effet.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { vi } from "vitest";
import { GTM_EN_PAUSE } from "./gtm";

const evenements = () => (window.dataLayer ?? []).map((e) => e.event).filter((e) => String(e).startsWith("alb_"));
const allerSur = (chemin: string) => window.history.pushState({}, "", chemin);

beforeEach(() => {
  vi.resetModules();
  sessionStorage.clear();
  localStorage.clear();
  delete window.dataLayer;
  document.getElementById("alb-gtm")?.remove();
  delete (window as unknown as { fbq?: unknown }).fbq;
  // Faux pixel Meta : sans lui, pixel.ts injecterait le script de Facebook.
  (window as unknown as { fbq: unknown }).fbq = () => {};
  allerSur("/webinaire");
});

describe("périmètre", () => {
  it("couvre le tunnel conférence : WhatsApp, VSL, prise d'appel, témoignages, vidéos", async () => {
    const { estPageGtm } = await import("./gtm");
    for (const p of [
      "/webinaire", "/webinaire/merci", "/vsl", "/vsl/merci", "/vsl/confirmation",
      "/appel-conference", "/appel-conference/confirmation", "/temoignages",
      "/video-1", "/video-2", "/video-3",
    ]) expect(estPageGtm(p), p).toBe(true);
  });

  it("exclut Liberty, Al Baraka 200, les pages légales et tout le reste", async () => {
    const { estPageGtm } = await import("./gtm");
    for (const p of [
      "/liberty", "/liberty/merci", "/liberty/confirmation",
      "/al-baraka-200", "/al-baraka-200/confirmation",
      "/politique-de-confidentialite", "/mentions-legales", "/", "/login",
      "/vslx", "/webinaires", "/video-4",
    ]) expect(estPageGtm(p), p).toBe(false);
  });

  it("ne charge pas le conteneur sur Liberty ni sur Al Baraka 200", async () => {
    const { suivrePageGtm } = await import("./gtm");
    for (const p of ["/liberty", "/al-baraka-200"]) {
      allerSur(p);
      suivrePageGtm(p);
    }
    expect(document.getElementById("alb-gtm")).toBeNull();
    expect(window.dataLayer).toBeUndefined();
  });
});

// Ces deux blocs décrivent GTM actif : ils reprennent dès que la pause est levée.
describe.skipIf(GTM_EN_PAUSE)("chargement et évènements", () => {
  it("charge le bon conteneur, une seule fois, et signale chaque page", async () => {
    const { suivrePageGtm, GTM_ID } = await import("./gtm");
    suivrePageGtm("/webinaire");
    suivrePageGtm("/webinaire/merci");
    const scripts = [...document.querySelectorAll("script")].filter((s) => s.src.includes("googletagmanager"));
    expect(scripts).toHaveLength(1);
    expect(GTM_ID).toBe("GTM-K3VGV2PX");
    expect(scripts[0].src).toBe("https://www.googletagmanager.com/gtm.js?id=GTM-K3VGV2PX");
    expect(evenements()).toEqual(["alb_page_view", "alb_page_view"]);
    expect(window.dataLayer!.at(-1)).toMatchObject({ tunnel: "whatsapp", page_path: "/webinaire/merci" });
  });

  it("ne pousse aucune donnée personnelle", async () => {
    sessionStorage.setItem("alb_tunnel_lead_pending", "1");
    allerSur("/webinaire/merci");
    const { trackTypLead } = await import("./pixel");
    await trackTypLead();
    for (const e of window.dataLayer ?? []) {
      expect(Object.keys(e).filter((k) => !["event", "tunnel", "page_path", "gtm.start"].includes(k))).toEqual([]);
    }
  });
});

describe.skipIf(GTM_EN_PAUSE)("mêmes garde-fous que le pixel Meta", () => {
  it("le Lead part une fois, puis plus au rechargement", async () => {
    allerSur("/vsl/merci");
    const { markLeadPending, trackTypLead } = await import("./pixel");
    markLeadPending();
    await trackTypLead();
    await trackTypLead(); // rechargement de la page de remerciement
    expect(evenements().filter((e) => e === "alb_lead")).toHaveLength(1);
  });

  it("aucun Lead pour qui ouvre la page de remerciement sans s'être inscrit", async () => {
    allerSur("/webinaire/merci");
    const { trackTypLead } = await import("./pixel");
    await trackTypLead();
    expect(evenements()).not.toContain("alb_lead");
  });

  it("le rendez-vous est compté une fois par réservation, et pas sans réservation", async () => {
    allerSur("/vsl/confirmation");
    const { trackCalendlyBooked } = await import("./pixel");
    trackCalendlyBooked(null);
    trackCalendlyBooked("2026-10-05T10:00|client@example.com");
    trackCalendlyBooked("2026-10-05T10:00|client@example.com");
    expect(evenements().filter((e) => e === "alb_schedule")).toHaveLength(1);
  });

  it("la landing et le clic WhatsApp sont signalés", async () => {
    const { trackLandingView, trackWhatsappJoin } = await import("./pixel");
    trackLandingView();
    allerSur("/webinaire/merci");
    trackWhatsappJoin();
    expect(evenements()).toEqual(["alb_view_content", "alb_whatsapp_join"]);
  });

  it("un Lead du tunnel Liberty ne part jamais vers GTM", async () => {
    allerSur("/liberty/merci");
    const { markLeadPending, trackTypLead } = await import("./pixel");
    markLeadPending();
    await trackTypLead();
    expect(window.dataLayer).toBeUndefined();
  });
});

describe.runIf(GTM_EN_PAUSE)("en pause", () => {
  it("ne charge rien et ne pousse rien, même sur une page du périmètre", async () => {
    const { suivrePageGtm } = await import("./gtm");
    const { trackLandingView } = await import("./pixel");
    suivrePageGtm("/webinaire");
    trackLandingView();
    expect(document.getElementById("alb-gtm")).toBeNull();
    expect(window.dataLayer).toBeUndefined();
  });
});
