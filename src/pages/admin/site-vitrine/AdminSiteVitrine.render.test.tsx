/**
 * L'écran d'administration des témoignages du site vitrine.
 *
 * Il n'est visible qu'avec une session CEO : sans ce test, son premier
 * affichage réel serait aussi son premier essai. On vérifie qu'il se ferme aux
 * autres rôles, qu'il liste dans l'ordre, et qu'un lien Vimeo collé devient
 * bien un identifiant + un hash en base.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, cleanup, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const etat = vi.hoisted(() => ({
  role: "ceo",
  lignes: [] as Record<string, unknown>[],
  insertions: [] as Record<string, unknown>[],
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ profile: { role: etat.role } }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/integrations/supabase/client", () => {
  const constructeur = () => {
    const b: Record<string, unknown> = {};
    b.select = () => b;
    b.order = () => b;
    b.eq = () => Promise.resolve({ error: null });
    b.update = () => b;
    b.delete = () => b;
    b.insert = (v: Record<string, unknown>) => {
      etat.insertions.push(v);
      return Promise.resolve({ error: null });
    };
    b.then = (ok: (r: unknown) => unknown) => ok({ data: etat.lignes, error: null });
    return b;
  };
  return { supabase: { from: () => constructeur() } };
});

import AdminSiteVitrine from "./AdminSiteVitrine";

function afficher() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AdminSiteVitrine />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  etat.role = "ceo";
  etat.lignes = [];
  etat.insertions = [];
  // L'oEmbed de Vimeo : on simule une miniature trouvée.
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ thumbnail_url: "https://i.vimeocdn.com/video/1_640.jpg" }), { status: 200 }),
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("administration du site vitrine", () => {
  it("est fermée à tout autre rôle que le CEO", () => {
    etat.role = "collaborateur";
    afficher();
    expect(screen.getByText("Accès réservé au CEO.")).toBeTruthy();
  });

  it("liste les témoignages dans l'ordre et signale un nombre différent des 10 annoncés", async () => {
    etat.lignes = [
      { id: "a", vimeo_id: "111111111", hash: "aaaaaa1111", miniature: null, prenom: "Miradie", activite: "Setter", ordre: 1, visible: true },
      { id: "b", vimeo_id: "222222222", hash: null, miniature: null, prenom: "Hedi", activite: "Closer", ordre: 2, visible: true },
    ];
    afficher();
    await screen.findByDisplayValue("Miradie");
    const prenoms = screen.getAllByLabelText("Prénom");
    // Le premier « Prénom » est le champ d'ajout ; puis les lignes, dans l'ordre.
    expect(prenoms.slice(1).map((e) => (e as HTMLInputElement).value)).toEqual(["Miradie", "Hedi"]);
    expect(screen.getByText("2 visibles sur 10 annoncés")).toBeTruthy();
    expect(screen.getByText(/la phrase est inexacte/)).toBeTruthy();
    expect(screen.getByText("sans hash")).toBeTruthy();
  });

  it("transforme un lien Vimeo collé en identifiant, hash et miniature", async () => {
    afficher();
    fireEvent.change(screen.getByLabelText("Lien Vimeo"), { target: { value: "https://vimeo.com/987654321/0123abcdef" } });
    fireEvent.change(screen.getAllByLabelText("Prénom")[0], { target: { value: "Saba" } });
    fireEvent.change(screen.getByLabelText("Activité"), { target: { value: "Setter" } });
    fireEvent.click(screen.getByRole("button", { name: /Ajouter/ }));
    await waitFor(() => expect(etat.insertions).toHaveLength(1));
    expect(etat.insertions[0]).toMatchObject({
      vimeo_id: "987654321",
      hash: "0123abcdef",
      miniature: "https://i.vimeocdn.com/video/1_640.jpg",
      prenom: "Saba",
      activite: "Setter",
      ordre: 1,
    });
  });

  it("refuse un lien qui n'est pas un lien Vimeo, sans rien écrire", async () => {
    afficher();
    fireEvent.change(screen.getByLabelText("Lien Vimeo"), { target: { value: "https://youtube.com/watch?v=1" } });
    fireEvent.change(screen.getAllByLabelText("Prénom")[0], { target: { value: "Saba" } });
    fireEvent.change(screen.getByLabelText("Activité"), { target: { value: "Setter" } });
    fireEvent.click(screen.getByRole("button", { name: /Ajouter/ }));
    await new Promise((r) => setTimeout(r, 50));
    expect(etat.insertions).toHaveLength(0);
  });
});
