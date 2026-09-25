// ─────────────────────────────────────────────────────────────────────────
// Le bandeau de consentement aux cookies.
//
// Cahier des charges §6. Trois exigences qui ne se négocient pas, parce que
// c'est précisément là-dessus que la CNIL sanctionne :
//
//   1. « Refuser » aussi visible qu'« Accepter ». Même taille, même style,
//      même niveau. Un refus caché derrière un lien gris vaut absence de
//      consentement, donc traceurs illicites.
//   2. Aucun traceur non essentiel avant le clic. Le pixel Meta ne se charge
//      pas — pas seulement « n'envoie rien ».
//   3. Refuser n'empêche pas d'accéder au site.
//
// Autonome à dessein : ni thème, ni contexte, ni routeur. Il est monté dans
// les deux applications, qui n'ont rien en commun.
// ─────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import {
  lireConsentement,
  enregistrerConsentement,
  EVENEMENT_OUVRIR,
} from "@/lib/consentement";

const C = {
  fond: "#0C0B0A",
  bord: "rgba(201,168,76,0.28)",
  texte: "#C9C3B6",
  titre: "#F5F1E6",
  or: "#C9A84C",
  orClair: "#E4C57A",
  sombre: "#1A1815",
} as const;

/** Les deux boutons principaux ont EXACTEMENT le même style. C'est la règle. */
const bouton = (principal: boolean): React.CSSProperties => ({
  flex: "1 1 0",
  minWidth: 120,
  padding: "11px 18px",
  borderRadius: 8,
  border: principal ? "1px solid transparent" : `1px solid ${C.bord}`,
  background: principal ? `linear-gradient(180deg, ${C.orClair}, ${C.or})` : C.sombre,
  color: principal ? "#1A1407" : C.titre,
  fontFamily: "inherit",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  lineHeight: "22px",
});

export default function BandeauCookies() {
  const [visible, setVisible] = useState(false);
  const [detail, setDetail] = useState(false);
  const [mesure, setMesure] = useState(false);
  const [publicite, setPublicite] = useState(false);

  useEffect(() => {
    // Première visite, ou choix vieux de plus de six mois : on redemande.
    if (!lireConsentement()) setVisible(true);

    const rouvrir = () => {
      const c = lireConsentement();
      setMesure(c?.mesure ?? false);
      setPublicite(c?.publicite ?? false);
      setDetail(true);
      setVisible(true);
    };
    window.addEventListener(EVENEMENT_OUVRIR, rouvrir);
    return () => window.removeEventListener(EVENEMENT_OUVRIR, rouvrir);
  }, []);

  if (!visible) return null;

  const repondre = (choix: { mesure: boolean; publicite: boolean }) => {
    enregistrerConsentement(choix);
    setVisible(false);
    setDetail(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Gestion des cookies"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 2147483000,
        background: C.fond,
        borderTop: `1px solid ${C.bord}`,
        boxShadow: "0 -18px 48px rgba(0,0,0,0.55)",
        padding: "18px 20px calc(18px + env(safe-area-inset-bottom, 0px))",
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: C.texte,
        fontSize: 13.5,
        lineHeight: 1.6,
      }}
    >
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <p style={{ margin: "0 0 4px", color: C.titre, fontSize: 15, fontWeight: 600 }}>
          Cookies
        </p>
        <p style={{ margin: "0 0 14px", maxWidth: 780 }}>
          Nous utilisons des cookies pour faire fonctionner le site, mesurer son audience et
          évaluer nos publicités. Les deux derniers n'ont lieu qu'avec votre accord.{" "}
          <a
            href="/politique-de-confidentialite"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: C.or, textDecoration: "underline" }}
          >
            En savoir plus
          </a>
        </p>

        {detail && (
          <div
            style={{
              margin: "0 0 14px",
              padding: "12px 14px",
              border: `1px solid ${C.bord}`,
              borderRadius: 10,
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <p style={{ margin: "0 0 10px", color: C.titre }}>
              Cookies strictement nécessaires{" "}
              <span style={{ color: C.texte, fontWeight: 400 }}>
                — toujours actifs. Connexion, sécurité, mémorisation de vos choix.
              </span>
            </p>
            <label style={{ display: "flex", gap: 10, alignItems: "flex-start", margin: "0 0 10px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={mesure}
                onChange={(e) => setMesure(e.target.checked)}
                style={{ marginTop: 4, accentColor: C.or, width: 16, height: 16 }}
              />
              <span>
                <span style={{ color: C.titre }}>Mesure d'audience</span> — comprendre comment le
                site est utilisé pour l'améliorer.
              </span>
            </label>
            <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={publicite}
                onChange={(e) => setPublicite(e.target.checked)}
                style={{ marginTop: 4, accentColor: C.or, width: 16, height: 16 }}
              />
              <span>
                <span style={{ color: C.titre }}>Publicité</span> — mesurer l'efficacité de nos
                publicités sur les réseaux sociaux.
              </span>
            </label>
          </div>
        )}

        {/* Les trois choix, au même niveau et de même taille. */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {detail ? (
            <>
              <button type="button" style={bouton(true)} onClick={() => repondre({ mesure, publicite })}>
                Enregistrer mes choix
              </button>
              <button type="button" style={bouton(false)} onClick={() => repondre({ mesure: false, publicite: false })}>
                Tout refuser
              </button>
              <button type="button" style={bouton(false)} onClick={() => repondre({ mesure: true, publicite: true })}>
                Tout accepter
              </button>
            </>
          ) : (
            <>
              <button type="button" style={bouton(true)} onClick={() => repondre({ mesure: true, publicite: true })}>
                Accepter
              </button>
              <button type="button" style={bouton(true)} onClick={() => repondre({ mesure: false, publicite: false })}>
                Refuser
              </button>
              <button type="button" style={bouton(false)} onClick={() => setDetail(true)}>
                Personnaliser
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
