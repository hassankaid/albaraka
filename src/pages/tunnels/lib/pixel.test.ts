// @vitest-environment-options { "url": "https://event.albarakaecosysteme.com/webinaire" }

/**
 * Garde-fou anti-doublon du « Lead » Meta.
 *
 * Le client veut l'évènement sur la Thank You Page. Or ces pages sont
 * accessibles par URL directe : sans garde-fou, un rechargement, un retour
 * arrière ou un lien partagé compterait chacun une conversion — nous en avons
 * nous-mêmes chargé une dizaine pendant la recette du 24/08/2026.
 *
 * D'où un marqueur à usage unique. C'est de la logique silencieuse : si
 * quelqu'un déplace l'appel un jour, les conversions se remettraient à se
 * dupliquer sans que rien ne le signale. D'où ces tests.
 *
 * L'URL du document est forcée ci-dessus sur le domaine de production : le
 * module ne déclenche RIEN ailleurs, et sans cela tout serait un no-op qui
 * passerait les tests sans rien prouver.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

type Appel = unknown[];

/** Pose un faux `fbq` AVANT l'import du module, qui sinon injecte le script. */
function poseFauxPixel(): Appel[] {
  const appels: Appel[] = [];
  const fbq = (...args: unknown[]) => { appels.push(args); };
  (window as unknown as { fbq: unknown }).fbq = fbq;
  (window as unknown as { _fbq: unknown })._fbq = fbq;
  return appels;
}

/**
 * Les évènements envoyés, dans l'ordre.
 *
 * Depuis le 23/09/2026 le module utilise `trackSingle`, qui vise UN pixel
 * nommé, et non `track`, qui diffuse à tous ceux déjà initialisés. Deux
 * pixels coexistent désormais : la forme diffusante enverrait les conversions
 * Liberty au pixel des conférences, et réciproquement.
 */
const evenements = (appels: Appel[]) =>
  appels.filter((a) => a[0] === "trackSingle" || a[0] === "trackSingleCustom").map((a) => a[2]);

/** Le pixel visé par chaque évènement. */
const pixelsVises = (appels: Appel[]) =>
  appels.filter((a) => a[0] === "trackSingle" || a[0] === "trackSingleCustom").map((a) => a[1]);

beforeEach(() => {
  vi.resetModules();
  sessionStorage.clear();
  delete (window as unknown as { fbq?: unknown }).fbq;
  delete (window as unknown as { _fbq?: unknown })._fbq;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("le domaine de production est bien reconnu", () => {
  it("déclenche réellement — sinon les tests suivants ne prouveraient rien", async () => {
    const appels = poseFauxPixel();
    const { trackTypLead } = await import("./pixel");
    await trackTypLead();

    expect(evenements(appels)).toContain("PageView");
  });
});

describe("« Lead » sur la page de remerciement", () => {
  it("ne part PAS si le visiteur n'a pas rempli le formulaire", async () => {
    const appels = poseFauxPixel();
    const { trackTypLead } = await import("./pixel");

    await trackTypLead();

    expect(evenements(appels)).toEqual(["PageView"]);
  });

  it("part une fois quand le formulaire vient d'être validé", async () => {
    const appels = poseFauxPixel();
    const { markLeadPending, trackTypLead } = await import("./pixel");

    markLeadPending();
    await trackTypLead();

    expect(evenements(appels)).toEqual(["PageView", "Lead"]);
  });

  it("ne se répète pas si la page est rechargée — c'est tout l'objet du garde-fou", async () => {
    const appels = poseFauxPixel();
    const { markLeadPending, trackTypLead } = await import("./pixel");

    markLeadPending();
    await trackTypLead();   // arrivée normale
    await trackTypLead();   // rechargement
    await trackTypLead();   // retour arrière

    expect(evenements(appels).filter((e) => e === "Lead")).toHaveLength(1);
  });

  it("consomme le marqueur, pour qu'une visite ultérieure ne compte rien", async () => {
    poseFauxPixel();
    const { markLeadPending, trackTypLead } = await import("./pixel");

    markLeadPending();
    expect(sessionStorage.getItem("alb_tunnel_lead_pending")).toBe("1");
    await trackTypLead();
    expect(sessionStorage.getItem("alb_tunnel_lead_pending")).toBeNull();
  });

  it("n'invente jamais un Lead quand le stockage est indisponible", async () => {
    // Mode privé strict : `sessionStorage` lève. On perd le Lead, on n'en
    // fabrique pas — l'inverse fausserait les conversions à la hausse.
    const appels = poseFauxPixel();
    const { markLeadPending, trackTypLead } = await import("./pixel");
    markLeadPending();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("refusé"); });

    await trackTypLead();

    expect(evenements(appels)).toEqual(["PageView"]);
  });
});

describe("Advanced Matching", () => {
  it("est transmis avec le Lead — il ne l'était jamais avant le 24/08/2026", async () => {
    // Le bug : l'Advanced Matching n'était posé qu'à l'initialisation, sous
    // condition `if (!initialized)` — or la landing avait déjà initialisé le
    // pixel. Il est désormais posé par un `init` explicite avant l'évènement.
    const appels = poseFauxPixel();
    const { markLeadPending, trackTypLead } = await import("./pixel");
    sessionStorage.setItem(
      "alb_tunnel_prefill",
      JSON.stringify({ firstName: "Hassan", email: "test@example.com", phone: "+33612345678" }),
    );

    markLeadPending();
    await trackTypLead();

    const inits = appels.filter((a) => a[0] === "init");
    const avecDonnees = inits.find((a) => a[2] && typeof a[2] === "object");
    expect(avecDonnees, "aucun init ne porte de données de correspondance").toBeTruthy();

    const am = avecDonnees![2] as Record<string, string>;
    expect(Object.keys(am).sort()).toEqual(["em", "fn", "ph"]);
    // Hachées, jamais en clair : c'est la condition de Meta.
    for (const v of Object.values(am)) expect(v).toMatch(/^[a-f0-9]{64}$/);
    expect(Object.values(am).join(" ")).not.toContain("test@example.com");
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Le contrat avec le media buyer, page par page.
//
// Ces quatre correspondances sont ce qu'il a demandé le 23/09/2026. Elles
// sont invisibles : si quelqu'un déplace un appel en refactorisant une page,
// rien ne casse, rien ne s'affiche — les chiffres se mettent simplement à
// mentir, et on s'en aperçoit des semaines plus tard en lisant le
// gestionnaire de publicités. D'où ces tests.
// ─────────────────────────────────────────────────────────────────────────
describe("quel évènement part de quelle page", () => {
  it("la landing envoie PageView puis ViewContent", async () => {
    const appels = poseFauxPixel();
    const { trackLandingView } = await import("./pixel");
    trackLandingView();
    expect(evenements(appels)).toEqual(["PageView", "ViewContent"]);
  });

  it("la page de remerciement envoie PageView, et Lead si le formulaire vient d'être validé", async () => {
    const appels = poseFauxPixel();
    const { markLeadPending, trackTypLead } = await import("./pixel");
    markLeadPending();
    await trackTypLead();
    expect(evenements(appels)).toEqual(["PageView", "Lead"]);
  });

  it("la confirmation de rendez-vous envoie PageView puis Schedule", async () => {
    const appels = poseFauxPixel();
    const { trackCalendlyBooked } = await import("./pixel");
    trackCalendlyBooked();
    expect(evenements(appels)).toEqual(["PageView", "Schedule"]);
  });
});

describe("deux pixels, un par cible publicitaire", () => {
  // Le tunnel Liberty vise une autre audience que les conférences : le media
  // buyer le pilote depuis un pixel distinct. Les confondre reviendrait à
  // optimiser deux campagnes sur un seul jeu de conversions.
  it("range le tunnel Liberty sur son pixel", async () => {
    const { pixelCourant } = await import("./pixel");
    for (const chemin of ["/liberty", "/liberty/merci", "/liberty/confirmation"]) {
      expect(pixelCourant(chemin), chemin).toBe("997717802550998");
    }
  });

  it("laisse tous les autres tunnels sur le pixel des conférences", async () => {
    const { pixelCourant } = await import("./pixel");
    for (const chemin of ["/webinaire", "/vsl", "/vsl/merci", "/temoignages", "/al-baraka-200", "/appel-conference"]) {
      expect(pixelCourant(chemin), chemin).toBe("1499213912013386");
    }
  });

  it("ne confond pas un chemin qui commence par les mêmes lettres", async () => {
    const { pixelCourant } = await import("./pixel");
    expect(pixelCourant("/liberty-autre-chose")).toBe("1499213912013386");
  });

  it("vise nommément son pixel à chaque évènement, sans diffuser à l'autre", async () => {
    const appels = poseFauxPixel();
    const { trackLandingView } = await import("./pixel");
    trackLandingView();
    // L'URL du document est event.…/webinaire (cf. en-tête du fichier).
    expect(new Set(pixelsVises(appels))).toEqual(new Set(["1499213912013386"]));
    expect(appels.some((a) => a[0] === "track"), "un `track` diffusant subsiste").toBe(false);
  });
});
