// @vitest-environment-options { "url": "https://event.albarakabyethicarena.com/webinaire" }

/**
 * Second domaine des tunnels, `event.albarakabyethicarena.com` (04/10/2026) :
 * il porte les pubs Meta, bloquées sur `event.albarakaecosysteme.com`.
 *
 * Il doit se comporter EXACTEMENT comme le premier. Un oubli ne casserait rien
 * à l'écran — la page s'affiche — mais Meta, TikTok et Snap ne recevraient
 * plus aucune conversion des pubs : la panne la plus coûteuse, et la plus
 * silencieuse.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isTunnelHost, isAppHost, isVitrineHost, TUNNEL_HOSTS } from "@/lib/hosts";

const NOUVEAU = "event.albarakabyethicarena.com";

const evenements = () => (window.dataLayer ?? []).map((e) => e.event).filter((e) => String(e).startsWith("alb_"));
const allerSur = (chemin: string) => window.history.pushState({}, "", chemin);
let meta: unknown[][] = [];
const evenementsMeta = () => meta.filter((a) => String(a[0]).startsWith("trackSingle")).map((a) => a[2]);

beforeEach(() => {
  vi.resetModules();
  sessionStorage.clear();
  localStorage.clear();
  delete window.dataLayer;
  document.getElementById("alb-gtm")?.remove();
  meta = [];
  (window as unknown as { fbq: unknown }).fbq = (...args: unknown[]) => { meta.push(args); };
  allerSur("/webinaire");
});

describe("le nouveau domaine est un domaine de tunnels, et seulement ça", () => {
  it("sert les tunnels, jamais l'application ni le site vitrine", () => {
    expect(TUNNEL_HOSTS).toContain(NOUVEAU);
    expect(isTunnelHost(NOUVEAU)).toBe(true);
    expect(isAppHost(NOUVEAU)).toBe(false);
    expect(isVitrineHost(NOUVEAU)).toBe(false);
  });

  it("le domaine racine et les imitations ne sont pas des domaines de tunnels", () => {
    for (const h of ["albarakabyethicarena.com", "www.albarakabyethicarena.com", "event.albarakabyethicarena.com.attaquant.fr", "event.alabarakabyethicarena.com"]) {
      expect(isTunnelHost(h), h).toBe(false);
    }
  });

  it("vercel.json lui sert les mêmes pages, et l'introuvable pour tout le reste", () => {
    const config = JSON.parse(readFileSync(resolve(process.cwd(), "vercel.json"), "utf-8")) as {
      rewrites: Array<{ source: string; destination: string; has?: Array<{ type: string; value: string }> }>;
    };
    const regles = config.rewrites.filter((r) => {
      const motif = r.has?.find((c) => c.type === "host")?.value;
      return motif && new RegExp(motif).test(NOUVEAU) && new RegExp(motif).test("event.albarakaecosysteme.com");
    });
    expect(regles.map((r) => r.destination)).toEqual(["/app.html", "/app.html", "/introuvable.html"]);
    expect(regles[0].source).toContain("webinaire");
    expect(regles[0].source).toContain("vsl");
    for (const r of regles) {
      const motif = r.has!.find((c) => c.type === "host")!.value;
      for (const h of ["albarakabyethicarena.com", "plateforme.albarakaecosysteme.com", "event.albarakabyethicarena.com.attaquant.fr"]) {
        expect(new RegExp(motif).test(h), h).toBe(false);
      }
    }
  });
});

describe("le suivi pub fonctionne sur le nouveau domaine", () => {
  it("GTM s'y charge et reçoit les conversions, le pixel du code s'y tait", async () => {
    const gtm = await import("./gtm");
    gtm.reglageGtm.enPause = false;
    const { trackLandingView, markLeadPending, trackTypLead } = await import("./pixel");
    gtm.suivrePageGtm("/webinaire");
    trackLandingView();
    allerSur("/webinaire/merci");
    markLeadPending();
    await trackTypLead();
    // Son propre conteneur (nouveau BM, 07/10/2026), jamais celui de l'ancien domaine.
    const scripts = [...document.querySelectorAll("script")].map((s) => s.src).filter((u) => u.includes("googletagmanager"));
    expect(scripts).toEqual(["https://www.googletagmanager.com/gtm.js?id=GTM-M8CSVXHK"]);
    expect(evenements()).toEqual(["alb_page_view", "alb_view_content", "alb_lead"]);
    expect(meta).toEqual([]);
  });

  it("si GTM est en pause, le pixel Meta du code y reprend la main", async () => {
    const gtm = await import("./gtm");
    gtm.reglageGtm.enPause = true;
    allerSur("/webinaire/merci");
    const { markLeadPending, trackTypLead } = await import("./pixel");
    markLeadPending();
    await trackTypLead();
    expect(evenementsMeta()).toEqual(["PageView", "Lead"]);
  });
});

describe("nouveau BM Meta (07/10/2026)", () => {
  it("chaque domaine charge son conteneur", async () => {
    const { conteneurPour } = await import("./gtm");
    expect(conteneurPour("event.albarakabyethicarena.com")).toBe("GTM-M8CSVXHK");
    expect(conteneurPour("EVENT.albarakabyethicarena.com:443")).toBe("GTM-M8CSVXHK");
    expect(conteneurPour("event.albarakaecosysteme.com")).toBe("GTM-K3VGV2PX");
    expect(conteneurPour("event.alabarakabyethicarena.com")).toBe("GTM-K3VGV2PX");
    // Liberty a son conteneur sur les deux domaines (09/10/2026).
    expect(conteneurPour("event.albarakabyethicarena.com", "/liberty")).toBe("GTM-T3JXSPVB");
    expect(conteneurPour("event.albarakaecosysteme.com", "/liberty/merci")).toBe("GTM-T3JXSPVB");
    expect(conteneurPour("event.albarakaecosysteme.com", "/liberty-autre")).toBe("GTM-K3VGV2PX");
  });

  it("le pixel de secours suit le domaine, sur le tunnel conférence seulement", async () => {
    const { pixelCourant } = await import("./pixel");
    const nouveau = "event.albarakabyethicarena.com";
    expect(pixelCourant("/webinaire/merci", nouveau)).toBe("963833956185104");
    expect(pixelCourant("/vsl/quiz", nouveau)).toBe("963833956185104");
    expect(pixelCourant("/webinaire", "event.albarakaecosysteme.com")).toBe("1499213912013386");
    // Liberty et Al Baraka 200 gardent leurs pixels, quel que soit le domaine.
    expect(pixelCourant("/liberty/merci", nouveau)).toBe("997717802550998");
    expect(pixelCourant("/al-baraka-200", nouveau)).toBe("1499213912013386");
  });
});
