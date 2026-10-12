// Prévient quand une nouvelle version de la plateforme est en ligne.
//
// La plateforme est une seule page : un onglet ouvert la veille garde l'ancien
// code tant qu'on ne le recharge pas. Le 12/10/2026, Sidali ne pouvait pas
// déposer de fichier Word, parce que son onglet datait d'avant la mise en ligne
// des ressources en fichiers. Chaque build publie /version.json (vite.config.ts) ;
// on le relit régulièrement et au retour sur l'onglet, et on propose de recharger.
import { useEffect, useRef } from "react";
import { toast } from "sonner";

const BUILD = import.meta.env.VITE_BUILD_ID as string | undefined;
const INTERVALLE_MS = 5 * 60 * 1000;

export function NouvelleVersion() {
  const prevenu = useRef(false);

  useEffect(() => {
    if (!BUILD) return; // en développement : pas de version publiée
    let actif = true;

    async function verifier() {
      if (prevenu.current || document.visibilityState !== "visible") return;
      try {
        const r = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
        if (!r.ok) return;
        const { build } = (await r.json()) as { build?: string };
        if (actif && build && build !== BUILD && !prevenu.current) {
          prevenu.current = true;
          toast("Une nouvelle version de la plateforme est en ligne", {
            description: "Recharge la page pour en profiter.",
            duration: Infinity,
            action: { label: "Recharger", onClick: () => window.location.reload() },
          });
        }
      } catch {
        // hors ligne ou fichier absent : on réessaiera plus tard
      }
    }

    const minuteur = window.setInterval(verifier, INTERVALLE_MS);
    document.addEventListener("visibilitychange", verifier);
    return () => {
      actif = false;
      window.clearInterval(minuteur);
      document.removeEventListener("visibilitychange", verifier);
    };
  }, []);

  return null;
}
