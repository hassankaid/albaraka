// ─────────────────────────────────────────────────────────────────────────
// Les cases d'engagement à cocher AVANT le paiement.
//
// Les DEUX PREMIÈRES sont exigées par le cahier des charges légal (§4.2) :
// acceptation des CGV, et demande d'accès immédiat valant renonciation au
// droit de rétractation. Elles conditionnent la validité de cette
// renonciation — sans elles, un client qui conteste obtient le remboursement.
// Les cinq suivantes sont celles demandées par Sidali le 19/05/2026.
// Composant contrôlé : reçoit `agreements` + `onChange`. Tant qu'au moins une
// case n'est pas cochée, le bouton « Payer » est désactivé côté parent.
//
// Sidali 19/05/2026 — CONSIGNES_IMPLEMENTATION.
// Refactor : remplace l'ancienne case unique « Je confirme mon inscription »
// + liste à puces non-cliquable. Les 5 nouvelles cases sont individuellement
// cliquables avec horodatage du consentement.
//
// Style inline pour rester homogène avec Checkout / LibertyCheckout / PaymentLink
// qui n'utilisent pas Tailwind (couleurs gold/cream maison via `theme` prop).
// ─────────────────────────────────────────────────────────────────────────

import { toggleAgreement, type AgreementItem } from "@/lib/checkout-agreements";

/**
 * Rend le texte d'une case, en insérant le lien à la place de `{lien}`.
 *
 * Le cahier des charges veut « Conditions générales de vente » cliquable dans
 * la case elle-même, ouvert dans un nouvel onglet : le client ne doit pas
 * perdre sa saisie pour aller les lire. Le clic sur le lien ne doit pas non
 * plus cocher la case — d'où le `stopPropagation`.
 */
function texteAvecLien(item: AgreementItem) {
  if (!item.lien) return item.text;
  const [avant, apres] = item.text.split("{lien}");
  return (
    <>
      {avant}
      <a
        href={item.lien.href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        style={{ color: "inherit", textDecoration: "underline" }}
      >
        {item.lien.texte}
      </a>
      {apres}
    </>
  );
}

export interface ChecklistTheme {
  gold: string;
  goldBright: string;
  cream: string;
  creamMuted: string;
}

interface Props {
  agreements: AgreementItem[];
  onChange: (next: AgreementItem[]) => void;
  theme: ChecklistTheme;
  /** Label optionnel affiché en haut du bloc (« Avant de continuer », etc.) */
  title?: string;
}

export function EngagementChecklist({ agreements, onChange, theme, title }: Props) {
  const handleToggle = (id: AgreementItem["id"]) => {
    onChange(toggleAgreement(agreements, id));
  };

  return (
    <section>
      {title && (
        <h3
          style={{
            margin: "0 0 12px",
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 15,
            color: theme.goldBright,
            letterSpacing: 0.5,
            fontWeight: 500,
          }}
        >
          {title}
        </h3>
      )}

      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {agreements.map((item) => (
          <li key={item.id}>
            <label
              style={{
                display: "flex",
                gap: 12,
                fontSize: 12.5,
                cursor: "pointer",
                alignItems: "flex-start",
                color: item.checked ? theme.cream : theme.creamMuted,
                lineHeight: 1.55,
                fontWeight: item.checked ? 500 : 400,
                transition: "color 0.15s",
              }}
            >
              <input
                type="checkbox"
                className="alb-checkbox"
                checked={item.checked}
                onChange={() => handleToggle(item.id)}
                style={{
                  marginTop: 2,
                  flexShrink: 0,
                  width: 16,
                  height: 16,
                  accentColor: theme.gold,
                }}
              />
              <span>{texteAvecLien(item)}</span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}
