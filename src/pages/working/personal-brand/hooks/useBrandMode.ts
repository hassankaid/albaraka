import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserPass } from "@/hooks/useUserPass";
import { usePersonalBrand } from "./usePersonalBrand";
import type { BrandMode } from "../lib/sections";

const LOCALSTORAGE_KEY = "personal-brand-mode-override";

/**
 * Détermine le mode (pass / liberty) de l'utilisateur pour Personal Brand.
 *
 * Règles :
 *   - Mode déjà stocké en BDD (user_personal_brand.mode) → on l'utilise
 *   - Sinon, déduit du pass : liberty si user_passes.pass_type='liberty',
 *     al_baraka → pass.
 *   - CEO et collaborateurs avec les 2 passes ou sans pass → choix manuel
 *     (LOCALSTORAGE_KEY) avec page de sélection.
 *   - Retourne `null` tant que la BDD/passes chargent (loading).
 *   - Retourne `"needs-selection"` si l'utilisateur n'a pas de mode défini
 *     et peut choisir (CEO/collab avec les 2 passes).
 */
export type ResolvedBrandMode = BrandMode | "needs-selection" | null;

export function useBrandMode(): {
  mode: ResolvedBrandMode;
  isLoading: boolean;
  setMode: (m: BrandMode) => void;
  canSwitch: boolean;
} {
  const { profile } = useAuth();
  const { hasAlBaraka, hasLiberty, isLoading: passLoading } = useUserPass();
  const brandQuery = usePersonalBrand();

  const isCeoOrCollab = profile?.role === "ceo" || profile?.role === "collaborateur";

  const [override, setOverride] = useState<BrandMode | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = window.localStorage.getItem(LOCALSTORAGE_KEY);
    return stored === "pass" || stored === "liberty" ? (stored as BrandMode) : null;
  });

  // Synchronise localStorage si l'override change (autre onglet)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      const stored = window.localStorage.getItem(LOCALSTORAGE_KEY);
      setOverride(stored === "pass" || stored === "liberty" ? (stored as BrandMode) : null);
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const setMode = (m: BrandMode) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LOCALSTORAGE_KEY, m);
    }
    setOverride(m);
  };

  if (passLoading || brandQuery.isLoading) {
    return { mode: null, isLoading: true, setMode, canSwitch: false };
  }

  // 1) Si la BDD a déjà un mode persisté, on l'utilise.
  // (Sauf si CEO/collab a explicitement basculé via override.)
  const storedMode = (brandQuery.data?.mode as BrandMode | null) ?? null;

  // 2) Sinon, on déduit selon le pass.
  let resolved: BrandMode | null = override ?? storedMode;

  if (!resolved) {
    if (hasLiberty && !hasAlBaraka) resolved = "liberty";
    else if (hasAlBaraka && !hasLiberty) resolved = "pass";
    else if (hasLiberty && hasAlBaraka) resolved = null; // 2 passes → choix
    else if (isCeoOrCollab) resolved = null; // CEO sans pass → choix
    // sans pass + non CEO : PassGuard bloque, on n'arrive pas ici
  }

  // CEO/collab peut toujours switcher de mode (utile pour tester les 2 vues)
  const canSwitch = isCeoOrCollab || (hasLiberty && hasAlBaraka);

  return {
    mode: resolved ?? "needs-selection",
    isLoading: false,
    setMode,
    canSwitch,
  };
}
