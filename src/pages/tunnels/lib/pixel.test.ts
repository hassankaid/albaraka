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
  // Depuis le 25/09/2026, RIEN ne part sans consentement publicitaire. Les
  // tests qui vérifient les évènements doivent donc l'accorder : sinon ils
  // passeraient sur un module muet, et ne prouveraient plus rien.
  localStorage.setItem(
    "alb_consentement_cookies",
    JSON.stringify({ mesure: true, publicite: true, date: Date.now(), version: 1 }),
  );
  delete (window as unknown as { fbq?: unknown }).fbq;
  delete (window as unknown as { _fbq?: unknown })._fbq;
});

afterEach(() => {
  vi.restoreAllMocks();
  // Chaque `vi.resetModules()` crée une instance du module, qui s'abonne au
  // changement de consentement. Les anciennes restent branchées sur `window`
  // avec leur propre file d'attente. Sans ce nettoyage, un test qui accorde
  // le consentement fait rejouer les intentions différées des tests
  // précédents — on l'a constaté : six évènements au lieu de deux.
  // Un refus vide toutes les files, y compris celles des anciennes instances.
  localStorage.clear();
  window.dispatchEvent(new CustomEvent("alb:cookies:change"));
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

  it("n'envoie rien du tout quand le stockage est indisponible", async () => {
    // Mode privé strict : le stockage lève à la lecture. On ne peut donc
    // savoir ni si le visiteur vient de s'inscrire, ni s'il a consenti.
    // Dans les deux cas la réponse sûre est la même : ne rien envoyer. On
    // perd la mesure, on ne fabrique ni conversion ni traceur non consenti.
    const appels = poseFauxPixel();
    const { markLeadPending, trackTypLead } = await import("./pixel");
    markLeadPending();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("refusé"); });

    await trackTypLead();

    expect(evenements(appels)).toEqual([]);
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

  it("n'envoie rien si le stockage est refusé — le consentement devient illisible", async () => {
    // Le garde-fou anti-doublon choisissait de compter plutôt que de perdre
    // une conversion rare. Depuis le consentement, ce cas ne se présente plus :
    // si le stockage lève, on ne peut pas non plus savoir si le visiteur a
    // accepté. Ne rien envoyer est alors la seule réponse défendable.
    const appels = poseFauxPixel();
    const { trackCalendlyBooked } = await import("./pixel");
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("refusé"); });
    trackCalendlyBooked(RESA);
    expect(evenements(appels)).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Le consentement commande tout.
//
// La politique de confidentialité publiée dit que les traceurs publicitaires
// ne sont déposés qu'APRÈS accord. Ce n'est pas une intention : c'est un
// texte qui nous engage. Si ce verrou saute un jour, la page continuera de
// s'afficher normalement — seule la conformité tombera, en silence.
// ─────────────────────────────────────────────────────────────────────────
describe("aucun traceur avant le consentement", () => {
  beforeEach(() => localStorage.clear());

  it("n'envoie rien tant que le visiteur n'a pas répondu", async () => {
    const appels = poseFauxPixel();
    const { trackLandingView } = await import("./pixel");
    trackLandingView();
    expect(evenements(appels)).toEqual([]);
  });

  it("n'envoie rien si le visiteur a refusé", async () => {
    const appels = poseFauxPixel();
    const { enregistrerConsentement } = await import("@/lib/consentement");
    const { trackLandingView } = await import("./pixel");
    enregistrerConsentement({ mesure: false, publicite: false });
    trackLandingView();
    expect(evenements(appels)).toEqual([]);
  });

  it("ne charge même pas le script de Meta sans accord", async () => {
    // « Ne rien envoyer » ne suffirait pas : charger fbevents.js dépose déjà
    // des identifiants. Le script ne doit pas être injecté du tout.
    delete (window as unknown as { fbq?: unknown }).fbq;
    const avant = document.scripts.length;
    const { trackLandingView } = await import("./pixel");
    trackLandingView();
    const ajoutes = [...document.scripts].slice(avant).map((s) => s.src);
    expect(ajoutes.filter((s) => s.includes("facebook"))).toEqual([]);
    expect((window as unknown as { fbq?: unknown }).fbq).toBeUndefined();
  });

  it("rattrape la vue de page quand le visiteur accepte ensuite", async () => {
    // Une landing déclenche son évènement au montage, avant que le visiteur
    // n'ait cliqué. Sans rattrapage, cette vue serait perdue et on mesurerait
    // moins que la réalité.
    const appels = poseFauxPixel();
    const { enregistrerConsentement } = await import("@/lib/consentement");
    const { trackLandingView } = await import("./pixel");

    trackLandingView();                                  // avant le clic
    expect(evenements(appels)).toEqual([]);

    enregistrerConsentement({ mesure: true, publicite: true }); // le visiteur accepte
    expect(evenements(appels)).toEqual(["PageView", "ViewContent"]);
  });

  it("n'invente pas de conversion si le visiteur refuse après coup", async () => {
    const appels = poseFauxPixel();
    const { enregistrerConsentement } = await import("@/lib/consentement");
    const { trackLandingView } = await import("./pixel");
    trackLandingView();
    enregistrerConsentement({ mesure: true, publicite: false });
    expect(evenements(appels)).toEqual([]);
  });

  it("garde le marqueur d'inscription tant que le Lead n'est pas parti", async () => {
    // Le marqueur est à usage unique. S'il était consommé avant le
    // consentement, le Lead serait perdu pour de bon.
    const appels = poseFauxPixel();
    const { enregistrerConsentement } = await import("@/lib/consentement");
    const { markLeadPending, trackTypLead } = await import("./pixel");

    markLeadPending();
    await trackTypLead();                                // sans consentement
    expect(sessionStorage.getItem("alb_tunnel_lead_pending")).toBe("1");

    enregistrerConsentement({ mesure: true, publicite: true });
    await new Promise((r) => setTimeout(r, 20));
    expect(evenements(appels)).toContain("Lead");
  });
});
