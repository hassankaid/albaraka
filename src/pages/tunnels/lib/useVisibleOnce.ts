// Signale qu'un élément approche de l'écran, une seule fois.
//
// Sert à ne monter un lecteur vidéo qu'au moment utile. L'attribut natif
// `loading="lazy"` sur une iframe ne suffit PAS : mesuré en production le
// 24/08/2026, les 11 lecteurs de /temoignages se chargeaient tous avant le
// moindre défilement, y compris celui situé 6 244 px plus bas — soit 4,2 Mo
// sur mobile avant que le visiteur n'ait rien fait.
//
// La marge par défaut déclenche le chargement BIEN avant l'entrée à l'écran :
// le lecteur est prêt quand le visiteur arrive dessus, il ne voit aucune
// différence avec aujourd'hui. On ne remplace pas la vidéo par une vignette
// à cliquer — elle reste une vidéo, simplement chargée au bon moment.
import { useEffect, useRef, useState } from "react";

export function useVisibleOnce<T extends HTMLElement>(rootMargin = "800px") {
  const ref = useRef<T | null>(null);
  // Sans IntersectionObserver (jsdom, très vieux navigateur), on ne masque
  // rien : mieux vaut charger tout de suite que ne jamais rien afficher.
  const [visible, setVisible] = useState(
    () => typeof window === "undefined" || typeof window.IntersectionObserver === "undefined",
  );

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [visible, rootMargin]);

  return { ref, visible };
}
