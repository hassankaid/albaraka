/**
 * Aiguillage du site vitrine dans `vercel.json`.
 *
 * Le domaine principal doit servir `vitrine.html` — et SEULEMENT lui : une
 * règle trop large enverrait la plateforme ou les tunnels vers le site de
 * marque, une règle trop étroite laisserait le domaine principal ouvrir la
 * plateforme. Et l'ordre compte : Vercel prend la première règle qui
 * correspond, donc la règle du site doit précéder le « tout vers index.html ».
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

interface Condition {
  type: string;
  value: string;
}
interface Rewrite {
  source: string;
  destination: string;
  has?: Condition[];
  missing?: Condition[];
}

const racine = process.cwd();
const config = JSON.parse(readFileSync(resolve(racine, "vercel.json"), "utf-8")) as { rewrites: Rewrite[] };
const regles = config.rewrites;

const hote = (conds?: Condition[]) => conds?.find((c) => c.type === "host")?.value;
const correspond = (motif: string, h: string) => new RegExp(`^(?:${motif})$`).test(h);

describe("routage du site vitrine", () => {
  const regleDomaine = regles.find((r) => r.destination === "/vitrine.html" && hote(r.has));

  it("le domaine principal et www servent vitrine.html, et aucun autre domaine", () => {
    expect(regleDomaine).toBeDefined();
    expect(regleDomaine!.source).toBe("/(.*)");
    const motif = hote(regleDomaine!.has)!;
    for (const h of ["albarakaecosysteme.com", "www.albarakaecosysteme.com"]) expect(correspond(motif, h)).toBe(true);
    for (const h of [
      "plateforme.albarakaecosysteme.com",
      "view.albarakaecosysteme.com",
      "event.albarakaecosysteme.com",
      "albarakaecosysteme.com.attaquant.fr",
    ])
      expect(correspond(motif, h), h).toBe(false);
  });

  it("la règle du site précède le « tout vers index.html »", () => {
    const iSite = regles.indexOf(regleDomaine!);
    const iTout = regles.findIndex((r) => r.source === "/(.*)" && !r.has && r.destination === "/index.html");
    expect(iTout).toBeGreaterThan(iSite);
  });

  it("l'aperçu /site-vitrine n'existe pas sur les domaines de production de la plateforme", () => {
    const apercu = regles.filter((r) => r.source.startsWith("/site-vitrine"));
    expect(apercu).toHaveLength(2);
    for (const r of apercu) {
      expect(r.destination).toBe("/vitrine.html");
      const exclus = hote(r.missing)!;
      for (const h of ["plateforme.albarakaecosysteme.com", "view.albarakaecosysteme.com", "event.albarakaecosysteme.com"])
        expect(correspond(exclus, h), h).toBe(true);
      expect(correspond(exclus, "albaraka-git-main-kaidconsulting.vercel.app")).toBe(false);
    }
  });

  it("vitrine.html est bien une porte d'entrée du build", () => {
    const vite = readFileSync(resolve(racine, "vite.config.ts"), "utf-8");
    expect(vite).toMatch(/vitrine:\s*path\.resolve\(__dirname,\s*"vitrine\.html"\)/);
    const html = readFileSync(resolve(racine, "vitrine.html"), "utf-8");
    expect(html).toContain('src="/src/vitrine/main.tsx"');
  });

  it("vitrine.html porte le référencement du cahier (§8.2)", () => {
    const html = readFileSync(resolve(racine, "vitrine.html"), "utf-8");
    expect(html).toContain('<html lang="fr">');
    expect(html).toContain("<title>AL BARAKA Écosystème – Formation et accompagnement entrepreneurial</title>");
    expect(html).toContain(
      'content="Construisez, lancez et développez votre activité digitale avec un accompagnement éthique et exigeant. Plus de 340 membres accompagnés."',
    );
    expect(html).toContain('property="og:image"');
    // Aucune police ni aucun traceur chargé depuis un tiers.
    expect(html).not.toMatch(/fonts\.googleapis|googletagmanager|connect\.facebook|fbq\(/);
  });
});
