/**
 * La section « Renvois » de l'éditeur de chapitre.
 *
 * Réservée au CEO, donc jamais vue par un test manuel sans session : on
 * vérifie qu'elle range chaque renvoi à son emplacement (tout le chapitre ou
 * sous telle vidéo), qu'elle signale les cibles hors formation et en brouillon,
 * et qu'elle montre les chapitres qui renvoient ICI — le garde-fou avant de
 * supprimer un chapitre.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const etat = vi.hoisted(() => ({
  renvois: [] as Record<string, unknown>[],
  entrants: [] as Record<string, unknown>[],
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/integrations/supabase/client", () => {
  const liste = (data: unknown) => {
    const b: Record<string, unknown> = {};
    b.select = () => b;
    b.order = () => b;
    b.eq = () => b;
    b.then = (ok: (r: unknown) => unknown) => ok({ data, error: null });
    return b;
  };
  return {
    supabase: {
      rpc: () => Promise.resolve({ data: etat.renvois, error: null }),
      from: (table: string) => liste(table === "chapitre_renvois" ? etat.entrants : []),
    },
  };
});

import RenvoisSection from "./RenvoisSection";

const renvoi = (champs: Record<string, unknown>) => ({
  id: "r",
  video_id: null,
  message: null,
  ordre: 1,
  cible_chapitre_id: "c",
  cible_video_id: null,
  cible_chapitre_titre: "Chapitre cible",
  cible_video_titre: null,
  cible_module_titre: "M",
  cible_formation_slug: "setting",
  cible_formation_titre: "Setting",
  meme_formation: true,
  accessible: true,
  cible_publiee: true,
  ...champs,
});

function afficher() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <RenvoisSection
          chapitreId="chap-source"
          videos={[
            { id: "v1", titre: "Introduction", ordre: 1 },
            { id: "v2", titre: "Le prix", ordre: 2 },
          ]}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  etat.renvois = [];
  etat.entrants = [];
});

describe("section Renvois de l'éditeur", () => {
  it("range chaque renvoi à son emplacement", async () => {
    etat.renvois = [
      renvoi({ id: "a", cible_chapitre_titre: "Rappel des bases" }),
      renvoi({ id: "b", video_id: "v2", cible_chapitre_titre: "Objection prix", message: "Pour approfondir" }),
    ];
    afficher();
    expect(await screen.findByText("Tout le chapitre (après « À retenir »)")).toBeTruthy();
    expect(screen.getByText("Sous la vidéo 02 · Le prix")).toBeTruthy();
    expect(screen.queryByText(/Sous la vidéo 01/)).toBeNull();
    expect(screen.getByDisplayValue("Pour approfondir")).toBeTruthy();
  });

  it("signale une cible dans une autre formation, et une cible en brouillon", async () => {
    etat.renvois = [renvoi({ meme_formation: false, cible_formation_titre: "Closing", cible_publiee: false })];
    afficher();
    expect(await screen.findByText("Closing › Chapitre cible")).toBeTruthy();
    expect(screen.queryByText(/Closing › Closing/)).toBeNull();
    expect(screen.getByText("Autre formation")).toBeTruthy();
    expect(screen.getByText(/Cible en brouillon/)).toBeTruthy();
  });

  it("montre les chapitres qui renvoient ici, avec un lien vers leur éditeur", async () => {
    etat.entrants = [
      {
        id: "e1",
        chapitre_id: "chap-autre",
        source: { titre: "Découverte", formation_modules: { formations: { slug: "closing", titre: "Closing" } } },
      },
    ];
    afficher();
    const lien = await screen.findByRole("link", { name: "Closing › Découverte" });
    expect(lien.getAttribute("href")).toBe("/admin/training/closing/chapitre/chap-autre");
    expect(screen.getByText("Supprimer ce chapitre supprimerait aussi ces renvois.")).toBeTruthy();
  });
});
