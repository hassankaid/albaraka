// ─────────────────────────────────────────────────────────────────────────
// La mention d'information sous chaque formulaire.
//
// Cahier des charges Ethicarena §5. Le texte est repris mot pour mot : il
// énonce qui traite les données, pourquoi, et comment s'y opposer. C'est
// l'information préalable exigée par l'article 13 du RGPD — sans elle, la
// collecte elle-même est irrégulière, quel que soit le reste.
//
// Le lien vers la politique s'ouvre dans un nouvel onglet : aller la lire ne
// doit pas faire perdre la saisie en cours.
//
// Autonome, sans dépendance : les tunnels et la plateforme n'ont ni thème ni
// système de couleurs communs.
// ─────────────────────────────────────────────────────────────────────────

export const TEXTE_MENTION_AVANT_LIEN =
  "Les informations recueillies sont traitées par ETHICARENA L.L.C-FZ pour répondre " +
  "à votre demande et, avec votre accord, vous envoyer des informations sur nos offres. " +
  "Vous pouvez à tout moment exercer vos droits ou vous désinscrire en écrivant à " +
  "contact@ethicarena.com. En savoir plus : ";

export const LIBELLE_LIEN_POLITIQUE = "Politique de confidentialité";
export const CHEMIN_POLITIQUE = "/politique-de-confidentialite";

/**
 * La case de consentement à la prospection.
 *
 * Non pré-cochée, et l'envoi du formulaire ne doit PAS y être conditionné :
 * c'est la différence entre un consentement et une extorsion de
 * consentement. Elle n'apparaît que là où des e-mails commerciaux suivent.
 */
export const TEXTE_CONSENTEMENT_MARKETING =
  "J'accepte de recevoir par email des informations et des offres d'AL BARAKA. " +
  "Je peux me désinscrire à tout moment.";

export interface MentionFormulaireProps {
  /** Couleur du texte. Passée par l'appelant : pas de thème commun. */
  couleur?: string;
  /** Couleur du lien. */
  couleurLien?: string;
  taille?: number;
  style?: React.CSSProperties;
}

export function MentionFormulaire({
  couleur = "rgba(245,241,230,0.45)",
  couleurLien = "rgba(245,241,230,0.72)",
  taille = 11,
  style,
}: MentionFormulaireProps) {
  return (
    <p
      style={{
        margin: "14px 0 0",
        fontSize: taille,
        lineHeight: 1.5,
        color: couleur,
        ...style,
      }}
    >
      {TEXTE_MENTION_AVANT_LIEN}
      <a
        href={CHEMIN_POLITIQUE}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: couleurLien, textDecoration: "underline" }}
      >
        {LIBELLE_LIEN_POLITIQUE}
      </a>
      .
    </p>
  );
}

export interface CaseMarketingProps {
  coche: boolean;
  onChange: (coche: boolean) => void;
  couleur?: string;
  couleurAccent?: string;
  taille?: number;
}

export function CaseMarketing({
  coche,
  onChange,
  couleur = "rgba(245,241,230,0.62)",
  couleurAccent = "#C9A04E",
  taille = 11.5,
}: CaseMarketingProps) {
  return (
    <label
      style={{
        display: "flex",
        gap: 9,
        alignItems: "flex-start",
        margin: "12px 0 0",
        fontSize: taille,
        lineHeight: 1.45,
        color: couleur,
        cursor: "pointer",
      }}
    >
      <input
        type="checkbox"
        checked={coche}
        onChange={(e) => onChange(e.target.checked)}
        style={{ marginTop: 2, flexShrink: 0, width: 15, height: 15, accentColor: couleurAccent }}
      />
      <span>{TEXTE_CONSENTEMENT_MARKETING}</span>
    </label>
  );
}
