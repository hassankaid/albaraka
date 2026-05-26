/**
 * Smoke test ApporteurLayout — vérifie que le composant render sans throw
 * pour un profil apporteur.
 *
 * Régression catchée : commit `38e3fea` (Gate Personal Brand 26/05/2026) a
 * ajouté l'appel à `useCanAccessPersonalBrand()` dans ApporteurLayout sans
 * importer le hook → ReferenceError au runtime → page entièrement noire
 * pour tous les apporteurs pendant 2 jours. Le build TypeScript ne catche
 * pas ce genre d'erreur (strictNullChecks désactivé + Vite n'audite pas la
 * résolution des identifiants). Seul un mount React catche le bug.
 */

import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render } from "@testing-library/react";

// ── Mocks des hooks (minimal : on n'a pas besoin du vrai cycle pour ce test) ──
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    profile: {
      id: "test-apporteur",
      full_name: "Test Apporteur",
      role: "apporteur",
      is_also_apporteur: false,
      avatar_url: null,
    },
    signOut: vi.fn(),
  }),
}));

vi.mock("@/hooks/useUserPass", () => ({
  useUserPass: () => ({ hasAnyPass: false, hasLiberty: false, passLevel: null }),
}));

vi.mock("@/hooks/useCanAccessPersonalBrand", () => ({
  useCanAccessPersonalBrand: () => ({ canAccess: false, isLoading: false, needsMarketingCompletion: false }),
}));

vi.mock("@/components/ThemeProvider", () => ({
  useTheme: () => ({ theme: "dark", toggleTheme: vi.fn() }),
}));

vi.mock("@/lib/studio-access", () => ({
  isStudioAllowed: () => false,
}));

vi.mock("@/components/notifications/NotificationsBell", () => ({
  NotificationsBell: () => null,
}));

vi.mock("@/components/DiscordButton", () => ({
  DiscordButton: () => null,
}));

vi.mock("./SpaceSwitcher", () => ({
  default: () => null,
}));

describe("ApporteurLayout — render smoke test", () => {
  it("renders without throwing for an apporteur profile (regression: gate Personal Brand 26/05/2026)", async () => {
    // Import dynamic pour que les vi.mock soient appliqués avant l'éval du module
    const { default: ApporteurLayout } = await import("./ApporteurLayout");

    // Si un hook est utilisé sans être importé (ex. useCanAccessPersonalBrand
    // avant le fix), le render throw avec « ReferenceError: useXXX is not
    // defined » et React produit une page noire en prod. On veut catcher ça.
    expect(() =>
      render(
        <MemoryRouter initialEntries={["/training"]}>
          <ApporteurLayout />
        </MemoryRouter>
      )
    ).not.toThrow();
  });
});
