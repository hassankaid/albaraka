/**
 * Le hook des coachings ne décide plus rien — il lit public.coachings_de.
 *
 * Deux comportements méritent d'être verrouillés :
 *
 *  • pendant le chargement, tout est considéré VERROUILLÉ. Passer de fermé à
 *    ouvert est acceptable ; l'inverse donne à l'élève l'impression qu'on lui
 *    retire un accès, et c'est le genre de détail qui génère un message au
 *    support ;
 *  • un créneau inconnu de la base n'est PAS verrouillé — sinon l'ajout d'un
 *    coaching le rendrait inaccessible à tout le monde jusqu'à ce que
 *    quelqu'un s'en aperçoive.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

function enveloppe() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

function monter(lignes: any[] | null, differer = false) {
  vi.doMock("@/hooks/useAuth", () => ({ useAuth: () => ({ profile: { id: "u1" } }) }));
  vi.doMock("@/integrations/supabase/client", () => ({
    supabase: {
      rpc: () =>
        differer
          ? new Promise(() => {}) // ne se résout jamais : on observe l'état de chargement
          : Promise.resolve({ data: lignes, error: null }),
    },
  }));
  return import("./useCoachingUnlocks");
}

afterEach(() => { vi.resetModules(); vi.restoreAllMocks(); });

describe("useCoachingUnlocks", () => {
  it("considère tout verrouillé tant que la réponse n'est pas arrivée", async () => {
    const { useCoachingUnlocks } = await monter(null, true);
    const { result } = renderHook(() => useCoachingUnlocks(), { wrapper: enveloppe() });
    expect(result.current.isLocked("closing")).toBe(true);
  });

  it("suit ce que la base renvoie", async () => {
    const { useCoachingUnlocks } = await monter([
      { slot_id: "closing", titre: "Closing", deverrouille: true, origine: "manuel", formation_requise: null, motif_manuel: "ouvert par Sidali" },
      { slot_id: "setting-message", titre: "Q/R", deverrouille: false, origine: "formation", formation_requise: "f1", motif_manuel: null },
    ]);
    const { result } = renderHook(() => useCoachingUnlocks(), { wrapper: enveloppe() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isLocked("closing")).toBe(false);
    expect(result.current.isLocked("setting-message")).toBe(true);
  });

  it("expose l'origine de la décision", async () => {
    const { useCoachingUnlocks } = await monter([
      { slot_id: "closing", titre: "Closing", deverrouille: true, origine: "manuel", formation_requise: null, motif_manuel: null },
    ]);
    const { result } = renderHook(() => useCoachingUnlocks(), { wrapper: enveloppe() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.getOrigine("closing")).toBe("manuel");
  });

  it("n'invente pas de verrou pour un créneau absent de la réponse", async () => {
    const { useCoachingUnlocks } = await monter([]);
    const { result } = renderHook(() => useCoachingUnlocks(), { wrapper: enveloppe() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isLocked("creneau-tout-neuf")).toBe(false);
  });
});
