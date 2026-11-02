// ─────────────────────────────────────────────────────────────────────────
// Les mentions obligatoires du récapitulatif de commande.
//
// Cahier des charges Ethicarena §4.1. Trois d'entre elles manquaient sur les
// quatre pages de paiement, et ce ne sont pas des formalités :
//
//   « TVA non applicable »   — le client doit savoir que le prix affiché est
//                              le prix final, et pourquoi il n'y a pas de TVA.
//   « sans frais ni intérêts » — un paiement fractionné sans cette mention
//                              ressemble à un crédit, qui obéit à d'autres
//                              règles.
//   le moyen de paiement     — carte bancaire, via Stripe.
//
// Et pour le paiement en plusieurs fois, ce qui se passe pour l'accès : complet
// dès la première échéance, suspendu en cas d'impayé (CGV version 2 du
// 02/11/2026, articles 7.4 et 8). Jusqu'au 02/11, cette ligne annonçait un
// déblocage « au fur et à mesure du règlement des échéances », qui n'existe plus.
//
// Composant de présentation pur, sans dépendance : les quatre checkouts
// n'utilisent pas Tailwind mais des couleurs passées en propriété.
// ─────────────────────────────────────────────────────────────────────────

export interface MentionsPaiementProps {
  /** Nombre d'échéances. 1 = comptant. */
  mensualites: number;
  /** Vrai pour un abonnement avec durée d'engagement. */
  engagement?: boolean;
  couleurs: { texte: string; texteFaible: string };
}

export function MentionsPaiement({ mensualites, engagement = false, couleurs }: MentionsPaiementProps) {
  const fractionne = mensualites > 1;

  return (
    <ul
      style={{
        listStyle: "none",
        margin: "14px 0 0",
        padding: 0,
        display: "flex",
        flexDirection: "column",
        gap: 5,
        fontSize: 12,
        lineHeight: 1.5,
        color: couleurs.texteFaible,
      }}
    >
      <li>TVA non applicable.</li>
      {fractionne && (
        <>
          <li>Paiement en {mensualites} fois, sans frais ni intérêts.</li>
          <li>
            Accès complet à la plateforme dès la première échéance, suspendu en cas
            d'échéance impayée.
          </li>
        </>
      )}
      {engagement && (
        <li>
          Abonnement avec engagement : les {mensualites} mensualités sont dues
          jusqu'au terme de la durée d'engagement.
        </li>
      )}
      <li>Paiement par carte bancaire, via notre prestataire sécurisé Stripe.</li>
    </ul>
  );
}
