/**
 * L'agenda Calendly du site vitrine (composants/AgendaCalendly.tsx) et le
 * webhook qui transforme la réservation en lead « Site vitrine ».
 *
 * Les deux doivent désigner le MÊME agenda : si l'un change sans l'autre, les
 * réservations du site remontent sous un libellé brut, sans lead.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { LIEN_AGENDA, estReservation, hauteurCalendly, urlAgenda } from "./composants/AgendaCalendly";

const WEBHOOK = readFileSync(resolve(process.cwd(), "supabase/functions/webhook-calendly/index.ts"), "utf-8");

describe("agenda Calendly du site", () => {
  it("le webhook reconnaît l'agenda du site et crée le lead « site_vitrine »", () => {
    expect(LIEN_AGENDA).toContain("dz73-r3j-q2v");
    expect(WEBHOOK).toMatch(/'655fa72e-bde0-4a12-a6bf-b10cf1d5fe68':\s*SITE_VITRINE/);
    expect(WEBHOOK).toContain("const SITE_VITRINE = 'site_vitrine'");
    expect(WEBHOOK).toMatch(/source:\s*SITE_VITRINE/);
  });

  it("ne transmet que les UTM présents, jamais le référent", () => {
    const u = new URL(
      urlAgenda(
        { utm_source: "tiktok", utm_medium: null, utm_campaign: "rentree", utm_content: null, utm_term: null, referrer: "https://ailleurs.example/" },
        "www.albarakaecosysteme.com",
      ),
    );
    expect(u.searchParams.get("utm_source")).toBe("tiktok");
    expect(u.searchParams.get("utm_campaign")).toBe("rentree");
    expect(u.searchParams.has("utm_medium")).toBe(false);
    expect(u.toString()).not.toContain("ailleurs");
    expect(u.searchParams.get("embed_domain")).toBe("www.albarakaecosysteme.com");
  });

  it("n'accepte de Calendly qu'une hauteur plausible", () => {
    expect(hauteurCalendly({ event: "calendly.page_height", payload: { height: "812px" } })).toBe(812);
    expect(hauteurCalendly({ event: "calendly.event_scheduled", payload: {} })).toBeNull();
    expect(hauteurCalendly({ event: "calendly.page_height", payload: { height: "99999" } })).toBeNull();
    expect(hauteurCalendly(null)).toBeNull();
  });

  it("reconnaît la réservation, qui mène à la page de confirmation", () => {
    expect(estReservation({ event: "calendly.event_scheduled", payload: {} })).toBe(true);
    expect(estReservation({ event: "calendly.page_height", payload: { height: "600" } })).toBe(false);
    expect(estReservation("calendly.event_scheduled")).toBe(false);
  });
});
