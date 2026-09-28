// Étape 2 du funnel : la confirmation de la demande (cahier §7).
//
// Même charte que l'accueil, menu et pied de page identiques, contenu court et
// centré. Textes « proposés, à valider par Sidali », repris tels quels.
//
// Pas d'agenda Calendly ici (option du cahier) : le process des tunnels, retenu
// par Hassan le 28/09/2026, veut que ce soit le setter qui rappelle.
// Pas d'événement « Lead » non plus : aucun pixel sur ce site, faute de
// publicité qui y mène.
import { useEffect } from "react";
import { MERCI, REFERENCEMENT } from "../contenu";
import Or from "../composants/Or";
import { useAncre } from "../liens";

export default function Merci() {
  const ancre = useAncre();

  useEffect(() => {
    document.title = `Demande reçue – ${REFERENCEMENT.titre}`;
    return () => {
      document.title = REFERENCEMENT.titre;
    };
  }, []);

  return (
    <main id="contenu" className="v-merci">
      <div
        className="v-decor"
        aria-hidden="true"
        style={{ background: "radial-gradient(60% 55% at 50% 0%, rgba(216,184,94,0.14), rgba(216,184,94,0))" }}
      />
      <div className="v-merci-contenu">
        <span className="v-etiquette">
          <span className="v-etiquette-point" />
          {MERCI.etiquette}
        </span>
        <h1 className="v-h2">
          <Or texte={MERCI.titre} />
        </h1>
        <p className="v-merci-texte">{MERCI.texte}</p>
        <ol className="v-carte v-etapes" aria-label="Prochaines étapes">
          {MERCI.etapes.map((e, i) => (
            <li key={e} className="v-etape">
              <span className="v-etape-numero" aria-hidden="true">
                {i + 1}
              </span>
              {e}
            </li>
          ))}
        </ol>
        <a href={ancre("retours")} className="v-bouton v-bouton-contour">
          {MERCI.bouton}
        </a>
      </div>
    </main>
  );
}
