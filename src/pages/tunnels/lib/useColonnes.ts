// Nombre de colonnes d'un mur de témoignages, suivi en direct.
//
// La répartition des tuiles est calculée en JS (cf. `repartirEnColonnes`), il
// faut donc connaître le nombre de colonnes au moment du rendu : une règle CSS
// ne suffirait pas. Partagé par la page témoignages et la landing, qui n'ont
// pas les mêmes seuils.
import { useEffect, useState } from "react";

export function useColonnes(seuils: { deux: number; une: number }): number {
  const [n, setN] = useState(3);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const deux = window.matchMedia(`(max-width: ${seuils.deux}px)`);
    const une = window.matchMedia(`(max-width: ${seuils.une}px)`);
    const maj = () => setN(une.matches ? 1 : deux.matches ? 2 : 3);
    maj();
    deux.addEventListener("change", maj);
    une.addEventListener("change", maj);
    return () => {
      deux.removeEventListener("change", maj);
      une.removeEventListener("change", maj);
    };
  }, [seuils.deux, seuils.une]);
  return n;
}
