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
  localStorage.clear();
  // Aucun consentement posé : depuis le 30/09/2026 le pixel n'en dépend plus
  // (décision de Hassan). Les tests tournent donc dans le cas d'un visiteur
  // qui n'a répondu à rien — le cas de tout le monde, le bandeau étant retiré.
  delete (window as unknown as { fbq?: unknown }).fbq;
  delete (window as unknown as { _fbq?: unknown })._fbq;
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
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

  it("n'invente pas de Lead quand le stockage est indisponible", async () => {
    // Mode privé strict : le stockage lève à la lecture. On ne peut pas
    // savoir si le visiteur vient de s'inscrire : la vue de page part, le
    // Lead non. On perd une conversion, on n'en fabrique pas.
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
    trackCalendlyBooked("2026-10-01T09:00:00Z|client@example.com");
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

describe("garde-fou anti-doublon du « Schedule »", () => {
  // Même oubli que sur le « Lead », corrigé le 23/09/2026. Ces pages
  // s'ouvrent par URL directe : sans garde-fou, un rechargement ou un lien
  // partagé comptait une réservation de plus. Nous en avons nous-mêmes
  // déclenché deux en recette sans jamais prendre de rendez-vous. C'est
  // l'évènement sur lequel les campagnes optimisent.
  const RESA = "2026-10-01T09:00:00Z|client@example.com";

  // On ne vide que les marqueurs de réservation : vider tout le stockage
  // emporterait le consentement posé plus haut, et plus rien ne partirait.
  beforeEach(() => {
    Object.keys(localStorage)
      .filter((k) => k.startsWith("alb_rdv_"))
      .forEach((k) => localStorage.removeItem(k));
  });

  it("ne compte RIEN si l'adresse ne porte aucune réservation", async () => {
    const appels = poseFauxPixel();
    const { trackCalendlyBooked } = await import("./pixel");
    trackCalendlyBooked("");
    expect(evenements(appels)).toEqual(["PageView"]);
  });

  it("compte une fois la réservation qui vient d'être prise", async () => {
    const appels = poseFauxPixel();
    const { trackCalendlyBooked } = await import("./pixel");
    trackCalendlyBooked(RESA);
    expect(evenements(appels)).toEqual(["PageView", "Schedule"]);
  });

  it("ne la recompte pas si la page est rechargée ou le lien rouvert", async () => {
    const appels = poseFauxPixel();
    const { trackCalendlyBooked } = await import("./pixel");
    trackCalendlyBooked(RESA);  // arrivée depuis Calendly
    trackCalendlyBooked(RESA);  // rechargement
    trackCalendlyBooked(RESA);  // lien partagé, rouvert
    expect(evenements(appels).filter((e) => e === "Schedule")).toHaveLength(1);
    // Le PageView, lui, part bien à chaque fois : c'est une vraie vue.
    expect(evenements(appels).filter((e) => e === "PageView")).toHaveLength(3);
  });

  it("compte bien DEUX réservations différentes", async () => {
    const appels = poseFauxPixel();
    const { trackCalendlyBooked } = await import("./pixel");
    trackCalendlyBooked(RESA);
    trackCalendlyBooked("2026-11-02T14:00:00Z|autre@example.com");
    expect(evenements(appels).filter((e) => e === "Schedule")).toHaveLength(2);
  });

  it("n'écrit jamais l'e-mail en clair dans le navigateur", async () => {
    poseFauxPixel();
    const { trackCalendlyBooked } = await import("./pixel");
    trackCalendlyBooked(RESA);
    const tout = Object.keys(localStorage).join(" ") + " " + Object.values(localStorage).join(" ");
    expect(tout).not.toContain("client@example.com");
  });

  it("compte quand même la réservation si le stockage est refusé", async () => {
    // Sans stockage, impossible de savoir si elle a déjà été comptée. Le
    // garde-fou choisit de compter : perdre une conversion réelle serait pire
    // qu'un doublon sur un cas de bord.
    const appels = poseFauxPixel();
    const { trackCalendlyBooked } = await import("./pixel");
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("refusé"); });
    trackCalendlyBooked(RESA);
    expect(evenements(appels)).toEqual(["PageView", "Schedule"]);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Le pixel ne dépend plus du bandeau cookies.
//
// Du 25/09 au 30/09/2026, rien ne partait sans clic sur « Accepter » : Meta
// ne voyait ni ceux qui refusaient, ni ceux qui ignoraient le bandeau, et les
// campagnes optimisaient sur une fraction des conversions. Hassan a tranché
// le 30/09/2026 : le suivi passe avant la conformité. Si quelqu'un rebranche
// la condition sans le vouloir, ces tests le diront.
// ─────────────────────────────────────────────────────────────────────────
describe("le pixel se charge sans condition de consentement", () => {
  it("envoie la vue de page à un visiteur qui n'a répondu à rien", async () => {
    const appels = poseFauxPixel();
    const { trackLandingView } = await import("./pixel");
    trackLandingView();
    expect(evenements(appels)).toEqual(["PageView", "ViewContent"]);
  });

  it("envoie aussi quand un ancien refus traîne dans le navigateur", async () => {
    // Les visiteurs venus entre le 25 et le 30/09 ont pu cliquer « Refuser ».
    // Ce choix stocké ne doit plus rien bloquer.
    localStorage.setItem(
      "alb_consentement_cookies",
      JSON.stringify({ mesure: false, publicite: false, date: Date.now(), version: 1 }),
    );
    const appels = poseFauxPixel();
    const { trackLandingView } = await import("./pixel");
    trackLandingView();
    expect(evenements(appels)).toEqual(["PageView", "ViewContent"]);
  });

  it("charge le script de Meta dès la première page", async () => {
    delete (window as unknown as { fbq?: unknown }).fbq;
    // jsdom n'a aucune balise <script> : le snippet de Meta s'insère devant la première.
    document.head.appendChild(document.createElement("script"));
    const { trackLandingView } = await import("./pixel");
    trackLandingView();
    expect([...document.scripts].some((sc) => sc.src.includes("connect.facebook.net"))).toBe(true);
    expect((window as unknown as { fbq?: unknown }).fbq).toBeDefined();
  });

  it("le Lead part dès la page de remerciement, sans attendre un clic", async () => {
    const appels = poseFauxPixel();
    const { markLeadPending, trackTypLead } = await import("./pixel");
    markLeadPending();
    await trackTypLead();
    expect(evenements(appels)).toEqual(["PageView", "Lead"]);
  });
});
