/**
 * Le site vitrine, affiché pour de vrai.
 *
 *  • les six blocs du cahier sont là, dans l'ordre, avec leurs ancres ;
 *  • le formulaire ne part pas incomplet, et ne dit rien avant qu'on ait fini
 *    de remplir un champ ;
 *  • une demande valide part vers `tunnel-lead-submit` avec la source
 *    `site_vitrine`, un téléphone international, et SANS consentement
 *    marketing — la case autorise à recontacter, pas à prospecter ;
 *  • le champ piège arrête les robots sans rien envoyer ;
 *  • les constantes Supabase recopiées restent celles du client.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, cleanup, screen, fireEvent, waitFor } from "@testing-library/react";
import VitrineApp from "./VitrineApp";
import { SUPABASE_CLE_PUBLIQUE, SUPABASE_URL } from "./api";
import { cartesVisibles, nombrePositions } from "./composants/Carrousel";

beforeEach(() => {
  window.history.pushState({}, "", "/site-vitrine/");
  // jsdom n'a ni ResizeObserver ni scrollTo.
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  Element.prototype.scrollIntoView = vi.fn();
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/**
 * Le réseau simulé. Le site fait deux sortes d'appels : la lecture des
 * témoignages (REST) et l'envoi de la demande (edge function). On répond à
 * chacun séparément, et on ne compte que les envois.
 */
function reseau(opts: { envoi?: () => Response; temoignages?: unknown[] } = {}) {
  const espion = vi.spyOn(globalThis, "fetch").mockImplementation(async (entree) => {
    const url = String(entree);
    if (url.includes("/rest/v1/temoignages_vitrine")) return new Response(JSON.stringify(opts.temoignages ?? []), { status: 200 });
    return opts.envoi ? opts.envoi() : new Response("{}", { status: 200 });
  });
  const envois = () => espion.mock.calls.filter(([u]) => String(u).includes("/functions/v1/tunnel-lead-submit"));
  return { espion, envois };
}

async function remplir() {
  // Le formulaire est chargé à part : on attend qu'il soit là.
  await screen.findByLabelText("Prénom");
  fireEvent.change(screen.getByLabelText("Prénom"), { target: { value: "Yasmine" } });
  fireEvent.change(screen.getByLabelText("Nom"), { target: { value: "Benali" } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "yasmine@example.com" } });
  fireEvent.change(screen.getByLabelText("Téléphone (WhatsApp)"), { target: { value: "06 12 34 56 78" } });
  fireEvent.change(screen.getByLabelText("Où en êtes-vous aujourd’hui ?"), {
    target: { value: "J’ai déjà une activité et je veux la développer" },
  });
  fireEvent.click(screen.getByRole("checkbox", { name: /J’accepte qu’AL BARAKA/ }));
}

describe("site vitrine", () => {
  it("affiche les six blocs dans l'ordre du cahier, avec leurs ancres", () => {
    reseau();
    const { container } = render(<VitrineApp />);
    const ids = [...container.querySelectorAll("section[id], footer[id]")].map((e) => e.id);
    expect(ids).toEqual(["top", "histoire", "mission", "retours", "rendez-vous", "footer"]);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Bâtissez une activité qui vous ressemble.");
  });

  it("montre dix cartes de témoignage, non lisibles tant qu'aucune vidéo n'est fournie", async () => {
    reseau();
    render(<VitrineApp />);
    const cartes = await screen.findAllByRole("button", { name: /Témoignage \d\d bientôt disponible/ });
    expect(cartes).toHaveLength(10);
    for (const c of cartes) expect((c as HTMLButtonElement).disabled).toBe(true);
    // Aucun lecteur Vimeo chargé avant un clic.
    expect(document.querySelector("iframe")).toBeNull();
  });

  it("le pied de page porte le bloc légal et les quatre liens", () => {
    reseau();
    render(<VitrineApp />);
    const pied = document.getElementById("footer")!;
    expect(pied.textContent).toContain("ETHICARENA L.L.C-FZ – Licence n° 2422583.01");
    expect(pied.textContent).toContain("Meta Platforms, Inc.");
    expect(pied.textContent).toContain("© 2026 - www.albarakaecosysteme.com / Tous droits réservés");
    for (const l of ["Mentions légales", "Politique de confidentialité", "Conditions générales de vente", "Gérer les cookies"])
      expect(screen.getAllByText(l).length).toBeGreaterThan(0);
    // Les liens légaux ouvrent un nouvel onglet, sous le préfixe de l'aperçu.
    const mentions = screen.getByRole("link", { name: "Mentions légales" });
    expect(mentions.getAttribute("href")).toBe("/site-vitrine/mentions-legales");
    expect(mentions.getAttribute("target")).toBe("_blank");
  });

  it("n'envoie rien tant que le formulaire est incomplet, et désigne les champs", async () => {
    const { envois } = reseau();
    render(<VitrineApp />);
    await screen.findByLabelText("Prénom");
    // Rien d'affiché avant d'avoir quitté un champ.
    expect(screen.queryByText("Merci d’indiquer un email valide")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Demander un rendez-vous" }));
    expect(await screen.findByText("Merci d’indiquer un email valide")).toBeTruthy();
    expect(screen.getByText("Merci de cocher cette case pour être recontacté")).toBeTruthy();
    expect(envois()).toHaveLength(0);
    // Le premier champ fautif reçoit le focus.
    expect(document.activeElement?.id).toBe("rdv-prenom");
  });

  it("envoie une demande valide comme un lead « site_vitrine », sans consentement marketing", async () => {
    const { envois } = reseau({ envoi: () => new Response('{"ok":true}', { status: 200 }) });
    render(<VitrineApp />);
    await remplir();
    fireEvent.click(screen.getByRole("button", { name: "Demander un rendez-vous" }));

    await waitFor(() => expect(envois()).toHaveLength(1));
    const [url, init] = envois()[0] as [string, RequestInit];
    expect(url).toBe(`${SUPABASE_URL}/functions/v1/tunnel-lead-submit`);
    const corps = JSON.parse(String(init.body));
    expect(corps).toMatchObject({
      first_name: "Yasmine",
      last_name: "Benali",
      email: "yasmine@example.com",
      phone: "+33612345678",
      situation: "J’ai déjà une activité et je veux la développer",
      source: "site_vitrine",
      consentement_contact: true,
      consentement_marketing: false,
    });
    // Puis la page de confirmation.
    expect(await screen.findByText("Demande reçue")).toBeTruthy();
    expect(window.location.pathname).toBe("/site-vitrine/merci");
  });

  it("garde la saisie et prévient si l'envoi échoue", async () => {
    reseau({ envoi: () => new Response("boom", { status: 500 }) });
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<VitrineApp />);
    await remplir();
    fireEvent.click(screen.getByRole("button", { name: "Demander un rendez-vous" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect((screen.getByLabelText("Prénom") as HTMLInputElement).value).toBe("Yasmine");
    expect((screen.getByRole("button", { name: "Demander un rendez-vous" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("le champ piège arrête un robot sans rien envoyer", async () => {
    const { envois } = reseau();
    const { container } = render(<VitrineApp />);
    await remplir();
    fireEvent.change(container.querySelector('input[name="site_web"]')!, { target: { value: "http://spam.example" } });
    fireEvent.click(screen.getByRole("button", { name: "Demander un rendez-vous" }));
    expect(await screen.findByText("Demande reçue")).toBeTruthy();
    expect(envois()).toHaveLength(0);
  });

  it("garde les UTM de l'arrivée pour les envoyer avec la demande", async () => {
    window.history.pushState({}, "", "/site-vitrine/?utm_source=instagram&utm_medium=bio");
    const { envois } = reseau();
    render(<VitrineApp />);
    await remplir();
    fireEvent.click(screen.getByRole("button", { name: "Demander un rendez-vous" }));
    await waitFor(() => expect(envois()).toHaveLength(1));
    const corps = JSON.parse(String((envois()[0] as [string, RequestInit])[1].body));
    expect(corps.utm_source).toBe("instagram");
    expect(corps.utm_medium).toBe("bio");
  });
});

describe("témoignages publiés depuis la plateforme", () => {
  it("remplacent les cartes de réserve, et le lecteur Vimeo n'arrive qu'au clic", async () => {
    reseau({
      temoignages: [
        { vimeo_id: "123456789", hash: "abcdef1234", miniature: null, prenom: "Miradie", activite: "Setter" },
      ],
    });
    render(<VitrineApp />);
    const carte = await screen.findByRole("button", { name: "Lire le témoignage de Miradie, Setter" });
    expect(screen.queryByText("[Prénom]")).toBeNull();
    expect(document.querySelector("iframe")).toBeNull();
    fireEvent.click(carte);
    const lecteur = document.querySelector("iframe")!;
    expect(lecteur.src).toContain("https://player.vimeo.com/video/123456789?h=abcdef1234&dnt=1");
  });

  it("ne montrent jamais « [Prénom] » pendant le chargement", () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise(() => {}));
    render(<VitrineApp />);
    expect(screen.queryByText("[Prénom]")).toBeNull();
    expect(screen.getAllByRole("button", { name: "Témoignage en cours de chargement" })).toHaveLength(10);
  });
});

describe("carrousel", () => {
  it("4 cartes à 1200 px et 7 positions pour 10 vidéos, comme la maquette", () => {
    expect(cartesVisibles(1200)).toBe(4);
    expect(nombrePositions(10, 4)).toBe(7);
  });
  it("2 cartes sur tablette, jamais zéro", () => {
    expect(cartesVisibles(720)).toBe(2);
    expect(cartesVisibles(100)).toBe(1);
    expect(nombrePositions(10, 12)).toBe(1);
  });
});

describe("constantes Supabase recopiées", () => {
  it("restent identiques à celles du client de la plateforme", async () => {
    const client = await import("@/integrations/supabase/client");
    expect(SUPABASE_URL).toBe(client.SUPABASE_URL);
    expect(SUPABASE_CLE_PUBLIQUE).toBe(client.SUPABASE_PUBLISHABLE_KEY);
  });
});
