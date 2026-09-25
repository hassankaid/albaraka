// ─────────────────────────────────────────────────────────────────────────
// Le pied de page légal — sur CHAQUE page, sans exception.
//
// Cahier des charges Ethicarena §2 : « composant unique et réutilisable,
// identique sur toutes les pages. Il ne doit jamais être supprimé, masqué ou
// tronqué, y compris sur les pages de vente épurées et sur le checkout. »
//
// C'est lui que Meta regarde quand une publicité est refusée : l'identité de
// l'annonceur, la non-affiliation à Facebook, et un accès à la politique de
// confidentialité sans avoir à se connecter.
//
// ⚠️ LA SOCIÉTÉ EST ETHICARENA L.L.C-FZ, pas AL BARAKA. AL BARAKA est une
// marque. Écrire « AL BARAKA » en raison sociale est le point 2 de la recette,
// et c'est une erreur juridique, pas une approximation.
//
// ⚠️ IL PEINT SON PROPRE FOND, ET N'A AUCUNE MARGE EXTÉRIEURE. Il est monté à
// la racine, donc en dehors de la page affichée : une marge laisserait voir le
// fond du `body`, qui est CRÈME en thème clair. Un trait blanc barrait ainsi
// le bas des pages légales, constaté le 25/09/2026. L'espace demandé par le
// cahier des charges (40 px au-dessus) est donc une marge INTÉRIEURE.
//
// ⚠️ IL EST POSITIONNÉ (`relative`, z-index 1). Les tunnels posent leur décor
// en `position: fixed` : un élément positionné se peint au-dessus des
// éléments statiques, donc le pied de page disparaissait derrière, tout en
// existant dans la page. Constaté le 25/09/2026 sur /liberty.
//
// ⚠️ IL PORTE LA SIGNATURE « AL BARAKA ». Les pages de tunnel avaient chacune
// leur mini-pied de page avec le même logo et le même copyright : on se
// retrouvait avec deux pieds de page empilés, séparés par un vide. Ils ont été
// retirés au profit de celui-ci.
//
// Autonome à dessein : ni thème, ni contexte, ni routeur. Il doit pouvoir être
// posé aussi bien dans l'application connectée que dans les tunnels, qui sont
// deux applications séparées.
// ─────────────────────────────────────────────────────────────────────────

/** Ce que le cahier des charges appelle le bloc 1 : l'identité de la société. */
const SOCIETE = {
  raisonSociale: "ETHICARENA L.L.C-FZ",
  licence: "2422583.01",
  adresse: "Meydan Grandstand, 6th floor, Meydan Road, Nad Al Sheba, Dubaï, Émirats arabes unis",
  contact: "contact@ethicarena.com",
} as const;

/** Bloc 2, repris mot pour mot. Les dénominations sont celles d'aujourd'hui. */
export const MENTION_META_GOOGLE =
  "Ce site ne fait pas partie du site web Facebook ou de Meta Platforms, Inc., " +
  "ni de Google LLC. En outre, ce site n'est pas endossé par Facebook en aucune " +
  "façon, ni par Google LLC. Facebook est une marque déposée de Meta Platforms, Inc.";

/** Bloc 3. */
export const DROITS_RESERVES = "© 2026 - www.albarakaecosysteme.com / Tous droits réservés";

/**
 * Les résultats présentés ne sont pas des promesses.
 *
 * Demandé par Hassan le 25/09/2026, en plus du cahier des charges. Placé ici
 * plutôt que sur chaque page de vente : il apparaît alors partout, y compris
 * sur les pages qui n'existent pas encore, sans que personne ait à y penser.
 *
 * La formulation dit ce qu'on ne promet pas ET de quoi le résultat dépend.
 * C'est ce second point qui vaut quelque chose : se contenter de se dédouaner
 * convainc moins un régulateur, et moins encore un client mécontent.
 */
export const RESULTATS_NON_GARANTIS =
  "Les parcours et résultats présentés sur cette page sont ceux de personnes réelles " +
  "et leur sont propres. Ils ne constituent ni une garantie, ni une promesse, ni une " +
  "projection de revenus. Ce que vous obtiendrez dépend de votre travail, de vos " +
  "compétences et de votre marché.";

export const LIENS_LEGAUX = [
  { libelle: "Mentions légales", chemin: "/mentions-legales" },
  { libelle: "Politique de confidentialité", chemin: "/politique-de-confidentialite" },
  { libelle: "Conditions générales de vente", chemin: "/conditions-generales-de-vente" },
] as const;

const C = {
  fond: "#080808",
  filet: "rgba(201,168,76,0.16)",
  filetFin: "rgba(143,136,123,0.14)",
  texte: "#8F887B",
  lien: "#B5AE9F",
  or: "#C9A84C",
} as const;

export interface PiedDePageLegalProps {
  /**
   * Sur le checkout et les formulaires, les liens s'ouvrent dans un nouvel
   * onglet (cahier des charges §2.4) : le visiteur ne doit pas perdre sa
   * saisie ni son panier en allant lire les CGV.
   */
  nouvelOnglet?: boolean;
}

export default function PiedDePageLegal({ nouvelOnglet = false }: PiedDePageLegalProps) {
  const cible = nouvelOnglet ? { target: "_blank", rel: "noopener noreferrer" as const } : {};

  return (
    <footer
      className="alb-pdp"
      style={{
        background: C.fond,
        borderTop: `1px solid ${C.filet}`,
        // Les tunnels posent leur décor en `position: fixed` sur tout l'écran.
        // Un élément positionné se peint AU-DESSUS des éléments statiques :
        // sans ce `relative`, le pied de page existait dans la page mais
        // disparaissait derrière le fond. C'est la raison pour laquelle les
        // anciens pieds de page des tunnels portaient déjà un z-index.
        position: "relative",
        zIndex: 1,
      }}
    >
      <style>{`
        .alb-pdp {
          /* Aucune marge extérieure : elle laisserait voir le fond du body. */
          margin: 0;
          padding: 40px 24px 36px;
          font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 12.5px;
          line-height: 1.65;
          color: ${C.texte};
        }
        .alb-pdp-inner { max-width: 1120px; margin: 0 auto; }

        /* Signature : reprend celle des tunnels, qui avaient leur propre pied
           de page avant qu'on les fusionne. */
        .alb-pdp-marque {
          font-family: "Cormorant Garamond", Georgia, serif;
          letter-spacing: 0.3em; color: ${C.or}; font-size: 0.95rem;
          text-align: center; margin: 0 0 22px;
        }

        .alb-pdp-cols {
          display: grid; grid-template-columns: minmax(0,1fr) auto;
          gap: 28px 40px; align-items: start;
        }
        .alb-pdp-liens {
          display: flex; flex-wrap: wrap; gap: 0 6px;
          justify-content: flex-end; align-items: center;
        }
        .alb-pdp a, .alb-pdp button.alb-lien {
          color: ${C.lien}; text-decoration: none;
          display: inline-block; line-height: 24px;
          background: none; border: 0; padding: 0; font: inherit; cursor: pointer;
        }
        .alb-pdp a:hover, .alb-pdp button.alb-lien:hover {
          color: ${C.or}; text-decoration: underline;
        }
        .alb-pdp-sep { color: ${C.texte}; opacity: .6; }

        .alb-pdp-bas {
          margin-top: 26px; padding-top: 18px;
          border-top: 1px solid ${C.filetFin};
        }
        .alb-pdp-bas p { margin: 0; }
        .alb-pdp-avert { margin: 0 0 10px !important; max-width: 900px; }

        @media (max-width: 1023px) {
          .alb-pdp-cols { grid-template-columns: 1fr; gap: 20px; }
          .alb-pdp-liens { justify-content: flex-end; }
        }
        @media (max-width: 767px) {
          .alb-pdp { padding: 32px 24px 28px; text-align: center; }
          .alb-pdp-liens { justify-content: center; }
          .alb-pdp-avert { margin-left: auto; margin-right: auto; }
        }
      `}</style>

      <div className="alb-pdp-inner">
        <div className="alb-pdp-marque">AL&nbsp;BARAKA</div>

        <div className="alb-pdp-cols">
          {/* Blocs 1 et 2 — identité, puis non-affiliation */}
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, color: "#A9A295" }}>
              {SOCIETE.raisonSociale} · Licence n° {SOCIETE.licence}
            </p>
            <p style={{ margin: 0 }}>{SOCIETE.adresse}</p>
            <p style={{ margin: 0 }}>
              <a href={`mailto:${SOCIETE.contact}`}>{SOCIETE.contact}</a>
            </p>
            <p style={{ margin: "14px 0 0", maxWidth: 620 }}>{MENTION_META_GOOGLE}</p>
          </div>

          {/* Bloc 4 — les liens, en haut à droite de la colonne */}
          <nav className="alb-pdp-liens" aria-label="Informations légales">
            {LIENS_LEGAUX.map((l, i) => (
              <span key={l.chemin}>
                {i > 0 && <span className="alb-pdp-sep">·</span>}{" "}
                <a href={l.chemin} {...cible}>
                  {l.libelle}
                </a>{" "}
              </span>
            ))}
            <span className="alb-pdp-sep">·</span>{" "}
            <button
              type="button"
              className="alb-lien"
              onClick={() => window.dispatchEvent(new CustomEvent("alb:cookies:ouvrir"))}
            >
              Gérer les cookies
            </button>
          </nav>
        </div>

        {/* Le bas : ce qu'on ne promet pas, puis le copyright */}
        <div className="alb-pdp-bas">
          <p className="alb-pdp-avert">{RESULTATS_NON_GARANTIS}</p>
          <p style={{ color: "#79736A" }}>{DROITS_RESERVES}</p>
        </div>
      </div>
    </footer>
  );
}
