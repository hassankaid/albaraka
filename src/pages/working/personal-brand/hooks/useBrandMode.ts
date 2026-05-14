import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserPass } from "@/hooks/useUserPass";
import type { BrandMode } from "../lib/sections";

const LOCALSTORAGE_KEY = "personal-brand-mode-override";

/**
 * Détermine le mode (pass / liberty) de l'utilisateur pour Personal Brand.
 *
 * Règles d'accès :
 *   - Membre AL BARAKA seul → uniquement le mode "pass". Pas de bascule.
 *   - Membre Liberty → les DEUX modes : son personal brand Liberty ET celui
 *     AL BARAKA. Chaque mode a sa propre ligne en BDD (PK = user_id, mode),
 *     donc deux espaces totalement indépendants. Défaut : "liberty".
 *   - CEO / collaborateur → les deux modes aussi (pour tester), avec écran
 *     de sélection au premier passage.
 *   - Le mode courant est mémorisé dans le localStorage (`LOCALSTORAGE_KEY`)
 *     et n'est validé que s'il fait partie des modes accessibles.
 *
 * Retourne `null` pendant le chargement des passes, `"needs-selection"` si
 * l'utilisateur peut choisir mais n'a encore rien choisi.
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

  if (passLoading) {
    return { mode: null, isLoading: true, setMode, canSwitch: false };
  }

  // Modes accessibles selon le profil :
  //   - "liberty" : membre Liberty ou staff
  //   - "pass"    : membre AL BARAKA, OU membre Liberty (qui peut aussi
  //                 dérouler le personal brand AL BARAKA), OU staff
  const canAccessLiberty = isCeoOrCollab || hasLiberty;
  const canAccessPass = isCeoOrCollab || hasAlBaraka || hasLiberty;

  // Mode courant : on part de l'override localStorage, qu'on invalide s'il
  // pointe vers un mode non autorisé. Sinon on déduit du profil.
  let resolved: BrandMode | null = override;
  if (resolved === "liberty" && !canAccessLiberty) resolved = null;
  if (resolved === "pass" && !canAccessPass) resolved = null;

  if (!resolved) {
    if (isCeoOrCollab) resolved = null;                  // staff → écran de choix
    else if (hasLiberty && hasAlBaraka) resolved = null; // 2 passes → écran de choix
    else if (hasLiberty) resolved = "liberty";           // membre Liberty → défaut Liberty
    else if (hasAlBaraka) resolved = "pass";             // membre AL BARAKA → pass
    // sans pass + non staff : PassGuard bloque en amont, on n'arrive pas ici
  }

  // Peut basculer entre les deux espaces uniquement si les deux lui sont
  // accessibles (vrai pour Liberty et staff, faux pour AL BARAKA seul).
  const canSwitch = canAccessPass && canAccessLiberty;

  return {
    mode: resolved ?? "needs-selection",
    isLoading: false,
    setMode,
    canSwitch,
  };
}
