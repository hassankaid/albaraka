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
// Les couleurs et les tailles viennent du cahier des charges (§2.3) et ne sont
// pas décoratives : en dessous de 12 px le texte est réputé illisible, donc
// non opposable. Le contraste est tenu à 4,5:1 au minimum.
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
  filet: "rgba(143,136,123,0.22)",
  texte: "#8F887B",
  lien: "#B5AE9F",
  survol: "#C9A84C",
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
  const cibleLien = nouvelOnglet
    ? { target: "_blank", rel: "noopener noreferrer" as const }
    : {};

  const styleLien: React.CSSProperties = {
    color: C.lien,
    textDecoration: "none",
    // 24 px de haut minimum : la zone doit rester cliquable au pouce.
    display: "inline-block",
    lineHeight: "24px",
  };

  return (
    <footer
      style={{
        flex: "0 0 auto",
        background: C.fond,
        borderTop: `1px solid ${C.filet}`,
        marginTop: 40,
        padding: "28px 24px 32px",
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: 12.5,
        lineHeight: 1.6,
        color: C.texte,
      }}
    >
      <style>{`
        .alb-pdp a:hover { color: ${C.survol} !important; text-decoration: underline; }
        .alb-pdp-grille {
          max-width: 1120px; margin: 0 auto;
          display: flex; gap: 24px; align-items: flex-end; justify-content: space-between;
        }
        .alb-pdp-liens { text-align: right; white-space: normal; }
        @media (max-width: 1023px) {
          .alb-pdp-grille { flex-direction: column; align-items: stretch; gap: 16px; }
          .alb-pdp-liens { text-align: right; }
        }
        @media (max-width: 767px) {
          .alb-pdp-grille { text-align: center; }
          .alb-pdp-liens { text-align: center; }
        }
      `}</style>

      <div className="alb-pdp">
        {/* Les résultats ne sont pas des promesses. En tête, pas noyé. */}
        <p
          style={{
            maxWidth: 1120,
            margin: "0 auto 20px",
            paddingBottom: 18,
            borderBottom: `1px solid ${C.filet}`,
            color: C.texte,
          }}
        >
          {RESULTATS_NON_GARANTIS}
        </p>

        <div className="alb-pdp-grille">
          <div style={{ minWidth: 0 }}>
            {/* Bloc 1 — identité */}
            <p style={{ margin: 0 }}>
              {SOCIETE.raisonSociale} – Licence n° {SOCIETE.licence}
            </p>
            <p style={{ margin: 0 }}>{SOCIETE.adresse}</p>
            <p style={{ margin: "0 0 12px" }}>
              Contact :{" "}
              <a href={`mailto:${SOCIETE.contact}`} style={styleLien}>
                {SOCIETE.contact}
              </a>
            </p>

            {/* Bloc 2 — Meta / Google */}
            <p style={{ margin: "0 0 12px", maxWidth: 640 }}>{MENTION_META_GOOGLE}</p>

            {/* Bloc 3 — droits réservés */}
            <p style={{ margin: 0 }}>{DROITS_RESERVES}</p>
          </div>

          {/* Bloc 4 — les liens, en bas à droite */}
          <div className="alb-pdp-liens" style={{ flex: "0 0 auto" }}>
            {LIENS_LEGAUX.map((l, i) => (
              <span key={l.chemin}>
                {i > 0 && <span style={{ color: C.texte, margin: "0 6px" }}>·</span>}
                <a href={l.chemin} style={styleLien} {...cibleLien}>
                  {l.libelle}
                </a>
              </span>
            ))}
            <span style={{ color: C.texte, margin: "0 6px" }}>·</span>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("alb:cookies:ouvrir"))}
              style={{
                ...styleLien,
                background: "none",
                border: "none",
                padding: 0,
                font: "inherit",
                cursor: "pointer",
              }}
            >
              Gérer les cookies
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
