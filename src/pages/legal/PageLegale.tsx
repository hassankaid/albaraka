// ─────────────────────────────────────────────────────────────────────────
// Le gabarit des trois pages légales.
//
// Une seule page pour les trois : elles n'ont ni mise en page ni logique
// différentes, seulement un texte différent. Ce texte vit dans `textes.ts`,
// où il est comparé au document d'origine par un test.
//
// Contraintes du cahier des charges (§3.2), qui ne sont pas décoratives :
//   - accessibles SANS connexion, sinon la loi n'est pas respectée ;
//   - texte à 16 px minimum, colonne d'environ 720 px ;
//   - indexables par les moteurs (on ne pose pas de noindex) ;
//   - le pied de page légal y figure aussi — il est posé par la racine de
//     l'application, sur toutes les pages. Ne pas en ajouter un ici : il
//     s'afficherait deux fois.
// ─────────────────────────────────────────────────────────────────────────
import { useEffect } from "react";
import { DATE_MISE_A_JOUR, type PageLegale as Texte } from "./textes";

/** Un titre d'article : « 1. Éditeur », « Article 7 – Paiement ». */
function estTitre(ligne: string): boolean {
  return /^\d+\.\s/.test(ligne) || /^Article\s\d+\s[–-]\s/.test(ligne);
}

/**
 * Une ligne d'énumération. Le document ne les balise pas : on les reconnaît à
 * ce qui les termine (« ; ») ou au fait qu'elles listent un couple
 * « libellé : valeur ». Se tromper n'abîme rien — la ligne reste affichée
 * mot pour mot, seul son retrait change.
 */
function estPuce(ligne: string): boolean {
  if (estTitre(ligne)) return false;
  if (ligne.endsWith(";")) return true;
  return /^(Dénomination|Siège|Numéro|Représentant|Contact|Email|Plateforme|Prospects|Clients|Données de|Enregistrements|Cookies et|Demandes|Identité et|Compte|droit )/.test(ligne);
}

export default function PageLegale({ texte }: { texte: Texte }) {
  useEffect(() => {
    document.title = texte.titreOnglet;
  }, [texte.titreOnglet]);

  return (
    <div style={{ minHeight: "100vh", background: "#080808", color: "#E8E3D8", display: "flex", flexDirection: "column" }}>
      <main
        style={{
          flex: "1 0 auto",
          width: "100%",
          maxWidth: 720,
          margin: "0 auto",
          padding: "clamp(32px, 6vw, 64px) 24px clamp(48px, 8vw, 80px)",
          fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontSize: 16,
          lineHeight: 1.7,
        }}
      >
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: "clamp(1.9rem, 5vw, 2.6rem)",
            lineHeight: 1.2,
            fontWeight: 400,
            margin: "0 0 8px",
            color: "#F5F1E6",
          }}
        >
          {texte.titre}
        </h1>

        {texte.dateDeMiseAJour && (
          <p style={{ margin: "0 0 32px", fontSize: 14, color: "#8F887B" }}>
            Dernière mise à jour : {DATE_MISE_A_JOUR}
          </p>
        )}
        {!texte.dateDeMiseAJour && <div style={{ height: 24 }} />}

        {texte.lignes.map((ligne, i) =>
          estTitre(ligne) ? (
            <h2
              key={i}
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: "1.35rem",
                fontWeight: 400,
                lineHeight: 1.3,
                color: "#C9A84C",
                margin: "34px 0 10px",
              }}
            >
              {ligne}
            </h2>
          ) : (
            <p
              key={i}
              style={{
                margin: estPuce(ligne) ? "0 0 6px 18px" : "0 0 14px",
                color: "#D5CFC2",
              }}
            >
              {estPuce(ligne) && (
                <span style={{ color: "#C9A84C", marginLeft: -18, marginRight: 8 }}>·</span>
              )}
              {ligne}
            </p>
          ),
        )}
      </main>
    </div>
  );
}
