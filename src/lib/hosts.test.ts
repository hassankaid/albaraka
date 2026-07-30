import { describe, it, expect } from "vitest";
import { isTunnelHost, isAppHost, TUNNEL_HOST, APP_HOSTS } from "./hosts";

// Ces règles doublent celles de `vercel.json`. Si elles divergent, un domaine
// pourrait servir des pages qu'il ne devrait pas → on les verrouille par test.
describe("segmentation par sous-domaine", () => {
  it("event = domaine des tunnels, et lui seul", () => {
    expect(isTunnelHost(TUNNEL_HOST)).toBe(true);
    expect(isAppHost(TUNNEL_HOST)).toBe(false);
  });

  it("les domaines de l'application ne sont jamais le domaine des tunnels", () => {
    for (const host of APP_HOSTS) {
      expect(isAppHost(host)).toBe(true);
      expect(isTunnelHost(host)).toBe(false);
    }
  });

  it("couvre les 4 domaines de l'app réellement servis en prod", () => {
    expect([...APP_HOSTS].sort()).toEqual(
      [
        "albarakaecosysteme.com",
        "plateforme.albarakaecosysteme.com",
        "view.albarakaecosysteme.com",
        "www.albarakaecosysteme.com",
      ].sort()
    );
  });

  it("ignore la casse et le port", () => {
    expect(isTunnelHost("EVENT.AlBarakaEcosysteme.com")).toBe(true);
    expect(isTunnelHost("event.albarakaecosysteme.com:443")).toBe(true);
    expect(isAppHost("PLATEFORME.albarakaecosysteme.com")).toBe(true);
  });

  it("ne se laisse pas berner par un domaine qui contient le nom", () => {
    expect(isTunnelHost("event.albarakaecosysteme.com.attaquant.fr")).toBe(false);
    expect(isTunnelHost("faux-event.albarakaecosysteme.com")).toBe(false);
    expect(isAppHost("albarakaecosysteme.com.attaquant.fr")).toBe(false);
  });

  it("local et preview Vercel : ni l'un ni l'autre → tout reste testable", () => {
    for (const host of ["localhost:8080", "127.0.0.1:8080", "albaraka-git-feat-x.vercel.app"]) {
      expect(isTunnelHost(host)).toBe(false);
      expect(isAppHost(host)).toBe(false);
    }
  });

  it("un hôte vide ou absent ne débloque rien", () => {
    expect(isTunnelHost("")).toBe(false);
    expect(isAppHost("")).toBe(false);
    expect(isTunnelHost(null)).toBe(false);
    expect(isAppHost(undefined)).toBe(false);
  });
});
