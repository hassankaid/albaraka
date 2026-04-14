/**
 * Utilitaires de recherche sur numéros de téléphone, insensibles au format.
 * Permet à une saisie "9105" / "07 68 92 91 05" / "+33 768 92 91 05" de
 * matcher un numéro stocké sous n'importe quelle forme ("+33768929105",
 * "0768929105", etc.).
 */

export function digitsOnly(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/\D+/g, "");
}

/**
 * `stored` matche la `query` si :
 * - soit la query brute (minuscules) est incluse dans la stored brute (fallback texte)
 * - soit la query contient des chiffres et ceux-ci apparaissent en sous-chaîne
 *   dans les chiffres du numéro stocké.
 *
 * Permet aussi de matcher "0768..." contre "+33768..." : si la query commence
 * par "0" et que le stored commence par "33", on compare la query sans son 0
 * initial.
 */
export function phoneMatches(stored: string | null | undefined, query: string): boolean {
  if (!stored) return false;
  const qDigits = digitsOnly(query);
  if (!qDigits) return false;
  const sDigits = digitsOnly(stored);
  if (!sDigits) return false;
  if (sDigits.includes(qDigits)) return true;
  // "0XXXXXXXXX" <-> "33XXXXXXXXX"
  if (qDigits.startsWith("0") && sDigits.includes(qDigits.slice(1))) return true;
  if (qDigits.startsWith("33") && sDigits.includes("0" + qDigits.slice(2))) return true;
  return false;
}

/**
 * Helper combiné : la query matche si elle est trouvée soit dans un champ
 * texte classique, soit dans n'importe lequel des numéros fournis (format-
 * agnostique).
 */
export function anyPhoneMatches(
  phones: Array<string | null | undefined>,
  query: string
): boolean {
  return phones.some((p) => phoneMatches(p, query));
}
