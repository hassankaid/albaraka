import { useEffect, useState } from "react";

/** Valeur de recherche différée : la requête part quand l'élève arrête de taper. */
export function useRechercheDifferee(valeur: string, delai = 300) {
  const [differee, setDifferee] = useState(valeur);
  useEffect(() => {
    const t = setTimeout(() => setDifferee(valeur), delai);
    return () => clearTimeout(t);
  }, [valeur, delai]);
  return differee;
}
