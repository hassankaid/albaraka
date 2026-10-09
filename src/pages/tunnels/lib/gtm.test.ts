// @vitest-environment-options { "url": "https://event.albarakaecosysteme.com/webinaire" }

/**
 * Google Tag Manager, tunnel Al Baraka classique uniquement.
 *
 * Deux choses silencieuses à verrouiller :
 *  • le PÉRIMÈTRE — le conteneur Al Baraka ne doit jamais se charger sur
 *    Liberty ni sur Al Baraka 200, qui ont leurs propres audiences : le media
 *    buyer y optimiserait TikTok et Snap sur des conversions d'un autre
 *    tunnel. Depuis le 09/10/2026, Liberty charge SON conteneur (Snap
 *    Liberty), et Meta Liberty reste dans le code ;
 *  • les GARDE-FOUS — un Lead ou un rendez-vous ne part vers GTM que dans les
 *    cas où il part vers Meta : jamais au rechargement d'une page.
 *
 * L'URL est forcée sur le domaine des tunnels : ailleurs, tout est sans effet.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

const evenements = () => (window.dataLayer ?? []).map((e) => e.event).filter((e) => String(e).startsWith("alb_"));
const allerSur = (chemin: string) => window.history.pushState({}, "", chemin);

/** Les appels au pixel Meta, pour vérifier qu'il se tait quand GTM a la main. */
let meta: unknown[][] = [];
const evenementsMeta = () => meta.filter((a) => String(a[0]).startsWith("trackSingle")).map((a) => a[2]);

/** Charge le module avec la pause levée — l'état visé après la bascule. */
async function gtmActif() {
  const gtm = await import("./gtm");
  gtm.reglageGtm.enPause = false;
  return gtm;
}

beforeEach(() => {
  vi.resetModules();
  sessionStorage.clear();
  localStorage.clear();
  delete window.dataLayer;
  document.getElementById("alb-gtm")?.remove();
  // Faux pixel Meta : sans lui, pixel.ts injecterait le script de Facebook.
  meta = [];
  (window as unknown as { fbq: unknown }).fbq = (...args: unknown[]) => { meta.push(args); };
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

  it("ne charge aucun conteneur sur Al Baraka 200, même GTM actif", async () => {
    const { suivrePageGtm } = await gtmActif();
    allerSur("/al-baraka-200");
    suivrePageGtm("/al-baraka-200");
    expect(document.getElementById("alb-gtm")).toBeNull();
    expect(window.dataLayer).toBeUndefined();
  });

  it("charge sur Liberty le conteneur Liberty, jamais celui d'Al Baraka", async () => {
    const { suivrePageGtm, GTM_ID_LIBERTY } = await gtmActif();
    allerSur("/liberty");
    suivrePageGtm("/liberty");
    const scripts = [...document.querySelectorAll("script")].map((sc) => sc.src).filter((u) => u.includes("googletagmanager"));
    expect(GTM_ID_LIBERTY).toBe("GTM-T3JXSPVB");
    expect(scripts).toEqual(["https://www.googletagmanager.com/gtm.js?id=GTM-T3JXSPVB"]);
    expect(window.dataLayer!.at(-1)).toMatchObject({ event: "alb_page_view", tunnel: "liberty", page_path: "/liberty" });
  });

  it("ne mélange jamais deux tunnels dans un même conteneur (passage sans rechargement)", async () => {
    const { suivrePageGtm } = await gtmActif();
    suivrePageGtm("/webinaire");
    allerSur("/liberty");
    suivrePageGtm("/liberty");
    const scripts = [...document.querySelectorAll("script")].filter((sc) => sc.src.includes("googletagmanager"));
    expect(scripts).toHaveLength(1);
    expect(evenements()).toEqual(["alb_page_view"]);
    expect(window.dataLayer!.some((e) => e.tunnel === "liberty")).toBe(false);
  });
});

describe("en pause (le filet de secours : remettre `enPause: true`)", () => {
  it("est ACTIF en production depuis le 30/09/2026", async () => {
    const { reglageGtm } = await import("./gtm");
    expect(reglageGtm.enPause).toBe(false);
  });

  it("en pause, GTM ne charge rien, et le pixel Meta du code reprend tout", async () => {
    const { suivrePageGtm, reglageGtm } = await import("./gtm");
    reglageGtm.enPause = true;
    const { trackLandingView, markLeadPending, trackTypLead } = await import("./pixel");
    suivrePageGtm("/webinaire");
    trackLandingView();
    allerSur("/webinaire/merci");
    markLeadPending();
    await trackTypLead();
    expect(document.getElementById("alb-gtm")).toBeNull();
    expect(window.dataLayer).toBeUndefined();
    expect(evenementsMeta()).toEqual(["PageView", "ViewContent", "PageView", "Lead"]);
  });
});

describe("GTM actif : chargement et évènements", () => {
  it("charge le bon conteneur, une seule fois, et signale chaque page", async () => {
    const { suivrePageGtm, GTM_ID } = await gtmActif();
    suivrePageGtm("/webinaire");
    suivrePageGtm("/webinaire/merci");
    const scripts = [...document.querySelectorAll("script")].filter((sc) => sc.src.includes("googletagmanager"));
    expect(scripts).toHaveLength(1);
    expect(GTM_ID).toBe("GTM-K3VGV2PX");
    expect(scripts[0].src).toBe("https://www.googletagmanager.com/gtm.js?id=GTM-K3VGV2PX");
    expect(evenements()).toEqual(["alb_page_view", "alb_page_view"]);
    expect(window.dataLayer!.at(-1)).toMatchObject({ tunnel: "whatsapp", page_path: "/webinaire/merci" });
  });

  it("ne pousse aucune donnée personnelle", async () => {
    await gtmActif();
    sessionStorage.setItem("alb_tunnel_lead_pending", "1");
    allerSur("/webinaire/merci");
    const { trackTypLead } = await import("./pixel");
    await trackTypLead();
    for (const e of window.dataLayer ?? []) {
      expect(Object.keys(e).filter((k) => !["event", "tunnel", "page_path", "gtm.start"].includes(k))).toEqual([]);
    }
  });
});

describe("GTM actif : le pixel Meta du code se tait sur le tunnel conférence", () => {
  it("n'envoie plus rien à Meta depuis le code — sinon tout serait compté deux fois", async () => {
    await gtmActif();
    const { trackLandingView, markLeadPending, trackTypLead, trackWhatsappJoin, trackCalendlyBooked } = await import("./pixel");
    trackLandingView();
    allerSur("/webinaire/merci");
    markLeadPending();
    await trackTypLead();
    trackWhatsappJoin();
    allerSur("/vsl/confirmation");
    trackCalendlyBooked("2026-10-05T10:00|client@example.com");
    expect(meta).toEqual([]);
    expect(evenements()).toEqual(["alb_view_content", "alb_lead", "alb_whatsapp_join", "alb_schedule"]);
  });

  it("Liberty garde son pixel Meta dans le code ET prévient son conteneur", async () => {
    await gtmActif();
    allerSur("/liberty/merci");
    const { markLeadPending, trackTypLead } = await import("./pixel");
    markLeadPending();
    await trackTypLead();
    expect(evenementsMeta()).toEqual(["PageView", "Lead"]);
    expect(meta.every((a) => a[0] !== "trackSingle" || a[1] === "997717802550998")).toBe(true);
    expect(evenements()).toEqual(["alb_lead"]);
    expect(window.dataLayer!.find((e) => e.event === "alb_lead")).toMatchObject({ tunnel: "liberty" });
  });
});

describe("Liberty (09/10/2026) : les trois évènements du media buyer", () => {
  it("ViewContent, Lead et rendez-vous partent vers le conteneur Liberty, avec les mêmes garde-fous", async () => {
    await gtmActif();
    const { trackLandingView, markLeadPending, trackTypLead, trackCalendlyBooked } = await import("./pixel");
    allerSur("/liberty");
    trackLandingView();
    allerSur("/liberty/merci");
    await trackTypLead(); // ouverte sans inscription : pas de Lead
    markLeadPending();
    await trackTypLead();
    await trackTypLead(); // rechargement : pas de second Lead
    allerSur("/liberty/confirmation");
    trackCalendlyBooked(null); // sans réservation : rien
    trackCalendlyBooked("2026-10-10T10:00|client@example.com");
    trackCalendlyBooked("2026-10-10T10:00|client@example.com"); // rechargement
    expect(evenements()).toEqual(["alb_view_content", "alb_lead", "alb_schedule"]);
    expect(evenementsMeta()).toEqual(["PageView", "ViewContent", "PageView", "PageView", "Lead", "PageView", "PageView", "PageView", "Schedule", "PageView"]);
    const scripts = [...document.querySelectorAll("script")].map((sc) => sc.src).filter((u) => u.includes("googletagmanager"));
    expect(scripts).toEqual(["https://www.googletagmanager.com/gtm.js?id=GTM-T3JXSPVB"]);
  });

  it("une panne du script Meta n'empêche pas le conteneur Liberty de compter Lead et rendez-vous", async () => {
    await gtmActif();
    // Sans fbq et sans balise <script> dans la page, l'injection du script Meta lève.
    delete (window as unknown as { fbq?: unknown }).fbq;
    const { markLeadPending, trackTypLead, trackCalendlyBooked } = await import("./pixel");
    allerSur("/liberty/merci");
    markLeadPending();
    await trackTypLead();
    allerSur("/liberty/confirmation");
    trackCalendlyBooked("2026-10-10T10:00|client@example.com");
    expect(evenements()).toEqual(["alb_lead", "alb_schedule"]);
  });
});

describe("GTM actif : mêmes garde-fous qu'avec le pixel", () => {
  it("le Lead part une fois, puis plus au rechargement — y compris sur le tunnel VSL", async () => {
    await gtmActif();
    allerSur("/vsl/merci");
    const { markLeadPending, trackTypLead } = await import("./pixel");
    markLeadPending();
    await trackTypLead();
    await trackTypLead(); // rechargement de la page de remerciement
    expect(evenements().filter((e) => e === "alb_lead")).toHaveLength(1);
    expect(window.dataLayer!.find((e) => e.event === "alb_lead")).toMatchObject({ tunnel: "vsl" });
  });

  it("aucun Lead pour qui ouvre la page de remerciement sans s'être inscrit", async () => {
    await gtmActif();
    allerSur("/webinaire/merci");
    const { trackTypLead } = await import("./pixel");
    await trackTypLead();
    expect(evenements()).not.toContain("alb_lead");
  });

  it("le rendez-vous est compté une fois par réservation, et pas sans réservation", async () => {
    await gtmActif();
    allerSur("/vsl/confirmation");
    const { trackCalendlyBooked } = await import("./pixel");
    trackCalendlyBooked(null);
    trackCalendlyBooked("2026-10-05T10:00|client@example.com");
    trackCalendlyBooked("2026-10-05T10:00|client@example.com");
    expect(evenements().filter((e) => e === "alb_schedule")).toHaveLength(1);
  });
});

describe("la confirmation de /appel-conference compte le rendez-vous", () => {
  it("identifie la réservation comme la confirmation du tunnel VSL (garde-fou actif)", async () => {
    // Avant le 30/09/2026 elle appelait trackCalendlyBooked() sans réservation :
    // aucun rendez-vous de cette page n'a jamais été compté.
    const { readFileSync } = await import("node:fs");
    const code = readFileSync(`${process.cwd()}/src/pages/tunnels/appel/AppelConfirmation.tsx`, "utf-8");
    expect(code).not.toMatch(/trackCalendlyBooked\(\s*\)/);
    expect(code).toMatch(/event_start_time[\s\S]*invitee_email/);
  });
});
