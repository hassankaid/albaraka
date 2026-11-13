// ─────────────────────────────────────────────────────────────────────────
// Aperçu du contrat pré-rempli, affiché sur la page de paiement juste au-dessus
// des cases à cocher (contrats v3, 13/11/2026).
//
// Le paiement vaut signature (décision de Sidali du 12/11) : le client doit
// donc VOIR le contrat avant de cocher « J'ai lu et j'accepte le contrat et
// les CGV » et de cliquer sur « Commander avec obligation de paiement ». Le
// texte vient de supabase/functions/_shared/contrat_v3.ts, le même que celui
// du PDF envoyé après le paiement : seuls le numéro et les heures s'y ajoutent.
// ─────────────────────────────────────────────────────────────────────────
import { useMemo, useState } from "react";
import {
  aujourdhuiParis,
  construireContratV3,
  echeancesDe,
  type OffreV3,
} from "../../../supabase/functions/_shared/contrat_v3";

export interface ApercuContratTheme {
  gold: string;
  goldBright: string;
  cream: string;
  creamMuted: string;
}

export interface ApercuContratProps {
  offre: OffreV3;
  module?: string | null;
  client: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    address: string;
    postal_code: string;
    city: string;
    country: string;
  };
  /** Prix total dû après réduction, en euros. */
  prixTotal: number;
  /** Prix catalogue, pour afficher la réduction. */
  prixCatalogue?: number | null;
  codePromo?: string | null;
  nbEcheances: number;
  /** Échéancier imposé (liens de paiement : la 1re absorbe les centimes). */
  echeances?: { montant: number; premiere: number } | null;
  /** Montant réparti en échéances quand un acompte a déjà été versé (sinon le prix total). */
  montantAEcheancer?: number | null;
  /** AAAA-MM-JJ ; par défaut aujourd'hui (paiement immédiat). */
  datePremierPaiement?: string | null;
  theme: ApercuContratTheme;
}

/** « FR » → « France » (le formulaire garde le code du pays). */
function nomPays(code: string): string {
  if (!/^[A-Za-z]{2}$/.test(code || "")) return code || "";
  try {
    return new Intl.DisplayNames(["fr"], { type: "region" }).of(code.toUpperCase()) || code;
  } catch {
    return code;
  }
}

/** « 4 rue X, 57070 Metz, France » — n'affiche que ce qui est saisi. */
function adresse(c: ApercuContratProps["client"]): string {
  const ville = [c.postal_code, c.city].filter((x) => x && x.trim()).join(" ");
  return [c.address, ville, nomPays(c.country)].filter((x) => x && x.trim()).join(", ");
}

export function ApercuContratV3(props: ApercuContratProps) {
  const { theme } = props;
  const [grand, setGrand] = useState(false);

  const contrat = useMemo(() => {
    const nom = `${props.client.first_name} ${props.client.last_name}`.trim();
    const aEcheancer = props.montantAEcheancer ?? props.prixTotal;
    const { base, derniere } = echeancesDe(aEcheancer, props.nbEcheances);
    const reduction = props.prixCatalogue != null ? Math.max(0, props.prixCatalogue - props.prixTotal) : 0;
    return construireContratV3({
      offre: props.offre,
      module: props.module,
      numero: null,
      client: { nom, adresse: adresse(props.client), email: props.client.email, telephone: props.client.phone },
      prixTotal: props.prixTotal,
      tarif: props.codePromo ? `code ${props.codePromo}` : null,
      reduction,
      nbEcheances: props.nbEcheances,
      montantEcheance: props.nbEcheances > 1 ? (props.echeances?.montant ?? base) : aEcheancer,
      montantDerniere: props.nbEcheances > 1 && !props.echeances ? derniere : null,
      montantPremiere: props.nbEcheances > 1 && props.echeances ? props.echeances.premiere : null,
      datePremierPaiement: props.datePremierPaiement || aujourdhuiParis(),
    });
  }, [props.offre, props.module, props.client, props.prixTotal, props.prixCatalogue, props.codePromo, props.nbEcheances, props.montantAEcheancer, props.echeances, props.datePremierPaiement]);

  return (
    <section data-testid="apercu-contrat" style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
        <h3 style={{ margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: 15, color: theme.goldBright, letterSpacing: 0.5, fontWeight: 500 }}>
          Ton contrat
        </h3>
        <button
          type="button"
          onClick={() => setGrand((g) => !g)}
          style={{ background: "none", border: "none", color: theme.gold, fontSize: 12, cursor: "pointer", textDecoration: "underline", padding: 0 }}
        >
          {grand ? "Réduire" : "Afficher en entier"}
        </button>
      </div>
      <div
        style={{
          maxHeight: grand ? "none" : 220,
          overflowY: grand ? "visible" : "auto",
          border: `1px solid ${theme.gold}55`,
          borderRadius: 10,
          padding: "12px 14px",
          background: "rgba(255,255,255,0.03)",
          color: theme.creamMuted,
          fontSize: 11.5,
          lineHeight: 1.55,
        }}
      >
        <p style={{ margin: "0 0 2px", color: theme.cream, fontWeight: 600, fontSize: 12 }}>{contrat.titre}</p>
        <p style={{ margin: "0 0 10px", fontSize: 11 }}>{contrat.numeroLigne}</p>
        {contrat.articles.map((a) => (
          <div key={a.titre} style={{ marginBottom: 10 }}>
            <p style={{ margin: "0 0 4px", color: theme.cream, fontWeight: 600 }}>{a.titre}</p>
            {a.blocs.map((b, i) =>
              b.type === "li" ? (
                <p key={i} style={{ margin: "0 0 3px", paddingLeft: 12 }}>
                  • {b.texte}
                </p>
              ) : (
                <p key={i} style={{ margin: "0 0 5px" }}>
                  {b.etiquette && <strong style={{ color: theme.cream, fontWeight: 600 }}>{b.etiquette} </strong>}
                  {b.texte}
                </p>
              ),
            )}
          </div>
        ))}
        <p style={{ margin: "0 0 4px", color: theme.cream, fontWeight: 600 }}>Confirmation et acceptation</p>
        {contrat.confirmation.lignes.map((l) => (
          <p key={l} style={{ margin: "0 0 5px" }}>
            {l}
          </p>
        ))}
      </div>
    </section>
  );
}
