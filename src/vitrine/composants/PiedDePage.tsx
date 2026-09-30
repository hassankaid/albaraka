// ─────────────────────────────────────────────────────────────────────────
// Pied de page du site vitrine (cahier §4.6).
//
// Logo complet et rappel « Prendre rendez-vous », puis, sous un filet, le
// bloc légal « exactement comme défini dans le cahier des charges légal » :
// identité, mention Facebook / Google, droits réservés, et les 4 liens en bas
// à droite. Les textes viennent de `PiedDePageLegal` — une seule source, pour
// que le site vitrine et les tunnels ne puissent pas diverger.
//
// On ajoute la mention « résultats non garantis » arrêtée par Hassan le
// 25/09/2026 pour toutes les pages publiques : la page affiche des chiffres
// (340+) et des témoignages, c'est précisément ce qu'elle couvre.
//
// Ce site n'utilise PAS `PiedDePageLegal` lui-même : sa maquette a sa propre
// disposition (logo, rappel), et monter les deux empilerait deux pieds de page.
// ─────────────────────────────────────────────────────────────────────────
import { useHref } from "react-router-dom";
import {
  DROITS_RESERVES,
  LIENS_LEGAUX,
  MENTION_META_GOOGLE,
  RESULTATS_NON_GARANTIS,
  SOCIETE,
} from "@/components/legal/PiedDePageLegal";
import { PIED_DE_PAGE, REFERENCEMENT } from "../contenu";
import { useAncre } from "../liens";
import logoComplet from "../assets/logo-complet.webp";

function LienLegal({ chemin, libelle }: { chemin: string; libelle: string }) {
  const href = useHref(chemin);
  // Nouvel onglet, comme partout ailleurs : lire les CGV ne doit pas coûter
  // la visite — ni la saisie du formulaire en cours.
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {libelle}
    </a>
  );
}

export default function PiedDePage() {
  const ancre = useAncre();
  return (
    <footer id="footer" className="v-pied">
      <div className="v-conteneur v-pied-contenu">
        <div className="v-pied-haut">
          <img src={logoComplet} alt={REFERENCEMENT.altLogo} width={162} height={150} loading="lazy" decoding="async" />
          <a href={ancre("rendez-vous")} className="v-pied-rappel">
            {PIED_DE_PAGE.rappel}
          </a>
        </div>
        <div className="v-pied-legal">
          <div className="v-pied-blocs">
            <p>
              {SOCIETE.raisonSociale} – Licence n° {SOCIETE.licence}
              <br />
              {SOCIETE.adresse}
              <br />
              Contact : <a href={`mailto:${SOCIETE.contact}`} style={{ color: "inherit" }}>{SOCIETE.contact}</a>
            </p>
            <p>{MENTION_META_GOOGLE}</p>
            <p>{RESULTATS_NON_GARANTIS}</p>
            <p>{DROITS_RESERVES}</p>
          </div>
          <nav aria-label="Informations légales" className="v-pied-liens">
            {LIENS_LEGAUX.map((l) => (
              <LienLegal key={l.chemin} chemin={l.chemin} libelle={l.libelle} />
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
