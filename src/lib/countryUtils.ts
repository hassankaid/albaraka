// Utilitaire de normalisation des noms de pays vers le nom canonique français
// (Title case avec accents). Gère :
//   - Les codes ISO 3166-1 alpha-2 (ex: "FR" → "France")
//   - Les noms en majuscules (ex: "FRANCE" → "France")
//   - Les noms déjà bien formatés (ex: "France" → "France")
//   - Les valeurs non reconnues (retournées telles quelles)
//
// Source unique de vérité utilisée :
//   - Au pré-remplissage de l'onboarding (safety net pour anciens profils)
//   - Au webhook Stripe (normalisation à l'écriture)
// Le serveur webhook utilise une copie de cette fonction (Deno) car il
// ne peut pas importer du code TS de l'app principale.

import { COUNTRIES, normalizeForSearch } from "./countries";

/**
 * Normalise une chaîne pays (code ISO ou nom partiel) vers le nom canonique
 * français de la liste COUNTRIES. Retourne la chaîne originale si non reconnue.
 */
export function resolveCountryName(input: string | null | undefined): string {
  if (!input) return "";
  const trimmed = input.trim();
  if (!trimmed) return "";

  // 1. Code ISO 2 lettres
  if (trimmed.length === 2) {
    const upper = trimmed.toUpperCase();
    const byCode = COUNTRIES.find((c) => c.code === upper);
    if (byCode) return byCode.name;
  }

  // 2. Match exact (déjà canonique)
  const exact = COUNTRIES.find((c) => c.name === trimmed);
  if (exact) return exact.name;

  // 3. Match insensible à la casse + accents (ex: "FRANCE" → "France", "EGYPTE" → "Égypte")
  const search = normalizeForSearch(trimmed);
  const fuzzy = COUNTRIES.find((c) => normalizeForSearch(c.name) === search);
  if (fuzzy) return fuzzy.name;

  // 4. Pas reconnu → retour tel quel (cas "Autre", saisies libres, etc.)
  return trimmed;
}
