// Menu flottant en pilule (cahier §4.0). Fixe au défilement, avec un fond
// plus opaque dès qu'on a quitté le haut de page (recommandation du cahier).
import { useEffect, useState } from "react";
import { MENU, REFERENCEMENT } from "../contenu";
import { useAncre } from "../liens";
import embleme from "../assets/embleme.webp";

export default function Menu() {
  const ancre = useAncre();
  const [defile, setDefile] = useState(false);

  useEffect(() => {
    const suivre = () => setDefile(window.scrollY > 40);
    suivre();
    window.addEventListener("scroll", suivre, { passive: true });
    return () => window.removeEventListener("scroll", suivre);
  }, []);

  return (
    <header className={`v-menu${defile ? " v-menu--defile" : ""}`}>
      <a href={ancre("top")} className="v-marque" aria-label={`${REFERENCEMENT.altLogo} – accueil`}>
        <img src={embleme} alt="" width={46} height={41} />
        <span className="v-marque-textes">
          <span className="v-marque-nom">AL BARAKA</span>
          <span className="v-marque-signature">{MENU.signature}</span>
        </span>
      </a>
      <nav aria-label="Navigation principale" className="v-menu-liens">
        {MENU.liens.map((l) => (
          <a key={l.ancre} href={ancre(l.ancre)}>
            {l.libelle}
          </a>
        ))}
      </nav>
      <a href={ancre("rendez-vous")} className="v-bouton v-bouton-or v-menu-bouton v-menu-bouton-ordinateur">
        {MENU.bouton}
      </a>
      <a href={ancre("rendez-vous")} className="v-bouton v-bouton-or v-menu-bouton-mobile">
        {MENU.boutonMobile}
      </a>
    </header>
  );
}
