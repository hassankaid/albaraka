import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserPass } from "@/hooks/useUserPass";
import type { BrandMode } from "../lib/sections";

const LOCALSTORAGE_KEY = "personal-brand-mode-override";

/**
 * Détermine le mode (pass / liberty) de l'utilisateur pour Personal Brand.
 *
 * Règles d'accès :
 *   - Espace AL BARAKA (mode "pass") : ouvert aux membres AL BARAKA, aux
 *     membres Liberty (qui peuvent aussi le dérouler), aux collaborateurs
 *     et au CEO.
 *   - Espace Liberty (mode "liberty") : réservé aux détenteurs d'un pass
 *     Liberty + au CEO. Les collaborateurs n'y ont PAS accès.
 *   - Chaque mode a sa propre ligne en BDD (PK = user_id, mode) → deux
 *     espaces totalement indépendants pour qui a accès aux deux.
 *   - Un membre Liberty pur arrive directement sur son espace Liberty et
 *     peut basculer sur AL BARAKA. Le CEO et les détenteurs des 2 pass
 *     passent par l'écran de sélection.
 *   - Le mode courant est mémorisé dans le localStorage et n'est honoré
 *     que s'il fait partie des modes accessibles.
 *
 * Retourne `null` pendant le chargement, `"needs-selection"` si l'utilisateur
 * a accès aux deux modes sans en avoir encore choisi un.
 */
export type ResolvedBrandMode = BrandMode | "needs-selection" | null;

export function useBrandMode(): {
  mode: ResolvedBrandMode;
  isLoading: boolean;
  setMode: (m: BrandMode) => void;
  canSwitch: boolean;
} {
  const { profile, isLoading: authLoading } = useAuth();
  const { hasAlBaraka, hasLiberty, isLoading: passLoading } = useUserPass();

  const isCeo = profile?.role === "ceo";
  const isCollab = profile?.role === "collaborateur";

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

  if (passLoading || authLoading) {
    return { mode: null, isLoading: true, setMode, canSwitch: false };
  }

  // Modes accessibles selon le profil :
  //   - "pass"    : membre AL BARAKA, membre Liberty, collaborateur, CEO
  //   - "liberty" : UNIQUEMENT détenteur d'un pass Liberty + CEO
  //                 (les collaborateurs en sont exclus)
  const canAccessPass = isCeo || isCollab || hasAlBaraka || hasLiberty;
  const canAccessLiberty = isCeo || hasLiberty;

  const accessible: BrandMode[] = [];
  if (canAccessPass) accessible.push("pass");
  if (canAccessLiberty) accessible.push("liberty");

  // Mode courant : override localStorage s'il est accessible, sinon résolution
  // selon le profil.
  let resolved: ResolvedBrandMode;
  if (override && accessible.includes(override)) {
    resolved = override;
  } else if (accessible.length === 1) {
    resolved = accessible[0]; // un seul mode accessible → on y va directement
  } else if (accessible.length >= 2) {
    // Membre Liberty pur → défaut sur son espace Liberty.
    // CEO / détenteur des 2 pass → écran de sélection.
    if (hasLiberty && !hasAlBaraka && !isCeo && !isCollab) {
      resolved = "liberty";
    } else {
      resolved = "needs-selection";
    }
  } else {
    // Aucun mode accessible — ne devrait pas arriver (PassGuard bloque en amont).
    resolved = "needs-selection";
  }

  // Peut basculer entre les deux espaces uniquement si les deux lui sont
  // accessibles : vrai pour les membres Liberty et le CEO, faux pour les
  // membres AL BARAKA et les collaborateurs.
  const canSwitch = canAccessPass && canAccessLiberty;

  return {
    mode: resolved,
    isLoading: false,
    setMode,
    canSwitch,
  };
}
