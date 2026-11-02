/**
 * Décision 1A de Sidali (02/11/2026), alignée sur les CGV du 02/11 : Mon Activité
 * (et l'Agent IA Setting qu'elle couvre) et Mon Organisation s'ouvrent dès
 * l'achat, sans attendre la fin d'une partie du parcours. Les autres
 * fonctionnalités restent débloquées une par une.
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

function monter(debloquees: string[], avecPass: boolean) {
  vi.doMock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
  vi.doMock("@/hooks/useUserPass", () => ({
    useUserPass: () => ({ hasAnyPass: avecPass, isLoading: false }),
  }));
  vi.doMock("@/integrations/supabase/client", () => ({
    supabase: {
      from: () => ({
        select: () => ({
          eq: () => Promise.resolve({ data: debloquees.map((feature) => ({ feature })), error: null }),
        }),
      }),
    },
  }));
  return import("./useFeatureUnlock");
}

afterEach(() => { vi.resetModules(); vi.restoreAllMocks(); });

describe("useFeatureUnlocks", () => {
  it("ouvre Mon Activité et Mon Organisation à tout pass actif, sans déblocage", async () => {
    const { useFeatureUnlocks } = await monter([], true);
    const { result } = renderHook(() => useFeatureUnlocks(), { wrapper: enveloppe() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.has("working_activity")).toBe(true);
    expect(result.current.has("quiz_organisation")).toBe(true);
    expect(result.current.has("payment_links")).toBe(false);
    expect(result.current.has("quiz_lead_magnet")).toBe(false);
  });

  it("sans pass, seuls les déblocages comptent", async () => {
    const { useFeatureUnlocks } = await monter(["quiz_organisation"], false);
    const { result } = renderHook(() => useFeatureUnlocks(), { wrapper: enveloppe() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.has("working_activity")).toBe(false);
    expect(result.current.has("quiz_organisation")).toBe(true);
  });
});
