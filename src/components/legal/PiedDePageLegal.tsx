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
// le bas des pages légales, constaté le 25/09/2026.
//
// ⚠️ IL EST POSITIONNÉ (`relative`, z-index 1). Les tunnels posent leur décor
// en `position: fixed` : un élément positionné se peint au-dessus des
// éléments statiques, donc le pied de page disparaissait derrière, tout en
// existant dans la page.
//
// ⚠️ IL PORTE LA SIGNATURE « AL BARAKA ». Les pages de tunnel avaient chacune
// leur mini-pied de page avec le même logo et le même copyright : on se
// retrouvait avec deux pieds de page empilés, séparés par un vide.
//
// ⚠️ LES LIENS S'OUVRENT TOUJOURS DANS UN NOUVEL ONGLET. Le cahier des
// charges ne l'impose que sur le checkout et les formulaires, mais la raison
// qu'il donne — « que le visiteur ne perde pas sa saisie » — vaut tout autant
// sur une page de vente : lire les CGV ne doit pas coûter la visite. Décision
// de Hassan le 25/09/2026.
//
// Autonome à dessein : ni thème, ni contexte, ni routeur. Il doit pouvoir être
// posé aussi bien dans l'application connectée que dans les tunnels, qui sont
// deux applications séparées.
// ─────────────────────────────────────────────────────────────────────────

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
  filetFin: "rgba(143,136,123,0.13)",
  texte: "#8F887B",
  texteFort: "#A9A295",
  texteFaible: "#79736A",
  lien: "#B5AE9F",
  or: "#C9A84C",
} as const;

/**
 * Le point médian qui sépare les éléments d'une même ligne.
 *
 * Espaces insécables explicites : JSX rogne les espaces en bord d'élément, et
 * le point venait se coller au mot précédent.
 */
const Sep = () => <span className="alb-pdp-sep">{"\u00A0·\u00A0"}</span>;

export default function PiedDePageLegal() {
  return (
    <footer
      className="alb-pdp"
      style={{
        background: C.fond,
        borderTop: `1px solid ${C.filet}`,
        position: "relative",
        zIndex: 1,
      }}
    >
      <style>{`
        .alb-pdp {
          margin: 0;
          /* 40 px au-dessus, en marge INTÉRIEURE : une marge extérieure
             laisserait voir le fond du body. */
          padding: 40px 24px 26px;
          font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          /* 12 px : le plancher du cahier des charges. En dessous, le texte
             est réputé illisible, donc non opposable. */
          font-size: 12px;
          line-height: 1.55;
          color: ${C.texte};
        }
        .alb-pdp-inner { max-width: 1120px; margin: 0 auto; }

        .alb-pdp-haut {
          display: flex; align-items: baseline; justify-content: space-between;
          gap: 16px 28px; flex-wrap: wrap;
          padding-bottom: 12px; margin-bottom: 12px;
          border-bottom: 1px solid ${C.filetFin};
        }
        .alb-pdp-marque {
          font-family: "Cormorant Garamond", Georgia, serif;
          letter-spacing: 0.28em; color: ${C.or}; font-size: 0.86rem;
          white-space: nowrap;
        }
        .alb-pdp-liens { display: flex; flex-wrap: wrap; align-items: baseline; }

        .alb-pdp p { margin: 0 0 4px; }
        .alb-pdp p:last-child { margin-bottom: 0; }

        .alb-pdp a, .alb-pdp button.alb-lien {
          color: ${C.lien}; text-decoration: none;
          background: none; border: 0; padding: 0; font: inherit; cursor: pointer;
          /* 24 px de haut : la zone doit rester cliquable au pouce. */
          display: inline-block; line-height: 24px;
        }
        .alb-pdp a:hover, .alb-pdp button.alb-lien:hover {
          color: ${C.or}; text-decoration: underline;
        }
        .alb-pdp-sep { color: ${C.texteFaible}; }

        @media (max-width: 767px) {
          .alb-pdp { padding: 30px 24px 22px; text-align: center; }
          .alb-pdp-haut { flex-direction: column; align-items: center; gap: 8px; }
          .alb-pdp-liens { justify-content: center; }
        }
      `}</style>

      <div className="alb-pdp-inner">
        {/* Signature et liens sur une seule ligne : deux fois moins haut
            qu'une signature centrée sur sa propre ligne. */}
        <div className="alb-pdp-haut">
          <div className="alb-pdp-marque">AL&nbsp;BARAKA</div>
          <nav className="alb-pdp-liens" aria-label="Informations légales">
            {LIENS_LEGAUX.map((l, i) => (
              <span key={l.chemin}>
                {i > 0 && <Sep />}
                {/* Nouvel onglet partout : lire les CGV ne doit jamais coûter
                    la page de vente en cours. */}
                <a href={l.chemin} target="_blank" rel="noopener noreferrer">
                  {l.libelle}
                </a>
              </span>
            ))}
            <Sep />
            <button
              type="button"
              className="alb-lien"
              onClick={() => window.dispatchEvent(new CustomEvent("alb:cookies:ouvrir"))}
            >
              Gérer les cookies
            </button>
          </nav>
        </div>

        {/* Bloc 1 — l'identité, sur une ligne au lieu de quatre */}
        <p style={{ color: C.texteFort }}>
          {SOCIETE.raisonSociale}
          <Sep />Licence n° {SOCIETE.licence}
          <Sep />
          <a href={`mailto:${SOCIETE.contact}`}>{SOCIETE.contact}</a>
        </p>
        <p>{SOCIETE.adresse}</p>

        {/* Bloc 2 — non-affiliation */}
        <p style={{ marginTop: 10 }}>{MENTION_META_GOOGLE}</p>

        {/* Ce qu'on ne promet pas */}
        <p style={{ marginTop: 10 }}>{RESULTATS_NON_GARANTIS}</p>

        {/* Bloc 3 — droits réservés */}
        <p style={{ marginTop: 10, color: C.texteFaible }}>{DROITS_RESERVES}</p>
      </div>
    </footer>
  );
}
