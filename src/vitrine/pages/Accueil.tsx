// La page d'accueil du site vitrine : six blocs, dans l'ordre du cahier (§3).
import { lazy, Suspense, useEffect, useState } from "react";
import { ACCUEIL, HISTOIRE, MISSION, RENDEZ_VOUS, RETOURS, REFERENCEMENT } from "../contenu";
import { TEMOIGNAGES_DE_RESERVE, lireTemoignagesPublies, type Temoignage } from "../temoignages";
import { SUPABASE_CLE_PUBLIQUE, SUPABASE_URL } from "../api";
import Or from "../composants/Or";
import Carrousel from "../composants/Carrousel";
import { Coche, Etoile, Fleche, IconePilier } from "../composants/Icones";
import portrait from "../assets/portrait-sidali.webp";

// Le formulaire est tout en bas de page, et il embarque la bibliothèque des
// numéros de téléphone (la plus lourde du site). Chargé à part, il ne retarde
// pas le premier affichage ; `VitrineApp` le précharge dès que la page est
// au repos, pour qu'il soit prêt bien avant qu'on l'atteigne.
export const chargerFormulaire = () => import("../composants/FormulaireRdv");
const FormulaireRdv = lazy(chargerFormulaire);

/**
 * Halo or partant du bas-centre et trois arches concentriques qui
 * s'estompent vers le haut (cahier §4.1). Dessiné en 1440 × 900 comme la
 * maquette, et recadré par le navigateur à toute autre largeur.
 */
function DecorAccueil() {
  return (
    <svg className="v-decor" aria-hidden="true" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice">
      <defs>
        <radialGradient id="v-aube" cx="50%" cy="100%" r="62%">
          <stop offset="0" stopColor="#D8B85E" stopOpacity="0.34" />
          <stop offset="0.35" stopColor="#8A6A22" stopOpacity="0.14" />
          <stop offset="1" stopColor="#060606" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="v-arches" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#D8B85E" stopOpacity="0" />
          <stop offset="1" stopColor="#D8B85E" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <rect width="1440" height="900" fill="url(#v-aube)" />
      <g fill="none" stroke="url(#v-arches)" strokeWidth="1">
        <path d="M420 900 V620 a300 300 0 0 1 600 0 V900" />
        <path d="M300 900 V620 a420 420 0 0 1 840 0 V900" strokeOpacity="0.6" />
        <path d="M180 900 V620 a540 540 0 0 1 1080 0 V900" strokeOpacity="0.35" />
      </g>
    </svg>
  );
}

function EnteteHistoire({ classe }: { classe: string }) {
  return (
    <div className={`v-histoire-entete ${classe}`}>
      <span className="v-etiquette">{HISTOIRE.etiquette}</span>
      <h2 className="v-h2">
        <Or texte={HISTOIRE.titre} />
      </h2>
    </div>
  );
}

/**
 * Les témoignages publiés depuis la plateforme. `null` tant qu'ils ne sont
 * pas arrivés : le carrousel montre alors des cartes muettes, jamais les
 * « [Prénom] » de réserve — sinon un visiteur les verrait clignoter avant les
 * vrais noms. Liste vide ou erreur : cartes de réserve.
 */
function useTemoignages(): Temoignage[] | null {
  const [liste, setListe] = useState<Temoignage[] | null>(null);
  useEffect(() => {
    let actif = true;
    lireTemoignagesPublies(SUPABASE_URL, SUPABASE_CLE_PUBLIQUE)
      .then((l) => actif && setListe(l.length ? l : TEMOIGNAGES_DE_RESERVE))
      .catch((e) => {
        console.warn("[site vitrine] témoignages indisponibles", e);
        if (actif) setListe(TEMOIGNAGES_DE_RESERVE);
      });
    return () => {
      actif = false;
    };
  }, []);
  return liste;
}

export default function Accueil() {
  const temoignages = useTemoignages();
  return (
    <main id="contenu">
      {/* ── 1. Accueil ─────────────────────────────────────────────── */}
      <section id="top" className="v-accueil">
        <DecorAccueil />
        <div className="v-accueil-contenu">
          <span className="v-etiquette">
            <span className="v-etiquette-point" />
            <span className="v-etiquette-ordinateur">{ACCUEIL.etiquette}</span>
            <span className="v-libelle-mobile">{ACCUEIL.etiquetteMobile}</span>
          </span>
          <h1 className="v-h1">
            <Or texte={ACCUEIL.titre} />
          </h1>
          <p className="v-accueil-sous-titre">{ACCUEIL.sousTitre}</p>
          <div className="v-accueil-boutons">
            <a href="#rendez-vous" className="v-bouton v-bouton-or">
              {ACCUEIL.boutonPrincipal}
              <Fleche />
            </a>
            <a href="#histoire" className="v-bouton v-bouton-contour">
              {ACCUEIL.boutonSecondaire}
            </a>
          </div>
          <div className="v-preuve">
            <div className="v-pastilles" aria-hidden="true">
              <span className="v-pastille v-pastille--1" />
              <span className="v-pastille v-pastille--2" />
              <span className="v-pastille v-pastille--3" />
              <span className="v-pastille v-pastille--4" />
              <span className="v-pastille v-pastille--chiffre">{ACCUEIL.pastille}</span>
            </div>
            <span className="v-preuve-texte">
              <strong>{ACCUEIL.preuveForte}</strong>
              <br />
              {ACCUEIL.preuveSuite}
            </span>
          </div>
        </div>
      </section>

      {/* ── 2. Notre histoire ──────────────────────────────────────── */}
      <section id="histoire" className="v-histoire">
        <div className="v-conteneur v-histoire-grille">
          <EnteteHistoire classe="v-histoire-entete--mobile" />
          <div className="v-carte v-portrait">
            <img src={portrait} alt={REFERENCEMENT.altPortrait} width={960} height={960} loading="lazy" decoding="async" />
            <div className="v-portrait-encart">
              <div className="v-portrait-nom">
                <strong>{HISTOIRE.nom}</strong>
                <span>{HISTOIRE.fonction}</span>
              </div>
              <Etoile />
            </div>
          </div>
          <div className="v-histoire-texte">
            <EnteteHistoire classe="v-histoire-entete--ordinateur" />
            {HISTOIRE.paragraphes.map((p) => (
              <p key={p.slice(0, 20)} className="v-paragraphe">
                {p}
              </p>
            ))}
            <div className="v-signature" aria-hidden="true">
              {HISTOIRE.signature}
            </div>
            <dl className="v-chiffres">
              {HISTOIRE.chiffres.map((c) => (
                <div key={c.libelle} className="v-chiffre">
                  <dt>
                    <span className="v-libelle-ordinateur">{c.libelle}</span>
                    <span className="v-libelle-mobile">{c.libelleMobile}</span>
                  </dt>
                  <dd>
                    {c.valeur}
                    {c.or && <span className="v-or">{c.or}</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* ── 3. Notre mission ───────────────────────────────────────── */}
      <section id="mission" className="v-mission">
        <div className="v-mission-halo" aria-hidden="true" />
        <div className="v-conteneur v-mission-contenu">
          <div className="v-mission-entete">
            <span className="v-etiquette">{MISSION.etiquette}</span>
            <p className="v-mission-phrase">
              <Or texte={MISSION.phrase} />
            </p>
          </div>
          <ul className="v-piliers">
            {MISSION.piliers.map((p) => (
              <li key={p.titre} className="v-carte v-pilier">
                <div className="v-pilier-icone">
                  <IconePilier nom={p.icone} />
                </div>
                <h3>{p.titre}</h3>
                <p className="v-pilier-description">{p.description}</p>
                <p className="v-pilier-competences">{p.competences}</p>
              </li>
            ))}
          </ul>
          <ul className="v-engagements">
            {MISSION.engagements.map((e) => (
              <li key={e} className="v-engagement">
                <Coche />
                {e}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── 4. Les retours de nos membres ──────────────────────────── */}
      <section id="retours" className="v-retours">
        <div className="v-conteneur v-retours-contenu">
          <div className="v-retours-entete">
            <div className="v-retours-titre">
              <span className="v-etiquette">{RETOURS.etiquette}</span>
              <h2 className="v-h2">
                <Or texte={RETOURS.titre} />
              </h2>
            </div>
            <p className="v-retours-mention v-retours-mention--haut">{RETOURS.mention}</p>
          </div>
          <Carrousel temoignages={temoignages ?? TEMOIGNAGES_DE_RESERVE} enAttente={temoignages === null} />
          <p className="v-consigne">
            <Fleche couleur="#D8B85E" taille={14} />
            {RETOURS.consigneMobile}
          </p>
          <p className="v-retours-mention v-retours-mention--bas">{RETOURS.mention}</p>
        </div>
      </section>

      {/* ── 5. Prendre rendez-vous ─────────────────────────────────── */}
      <section id="rendez-vous" className="v-rdv">
        <div className="v-conteneur v-rdv-bloc">
          <div className="v-rdv-halo" aria-hidden="true" />
          <div className="v-rdv-grille">
            <div className="v-rdv-texte">
              <span className="v-etiquette">{RENDEZ_VOUS.etiquette}</span>
              <h2 className="v-h2">
                <Or texte={RENDEZ_VOUS.titre} />
              </h2>
              <p className="v-rdv-intro">{RENDEZ_VOUS.texte}</p>
              <ul className="v-rassurants">
                {RENDEZ_VOUS.pointsRassurants.map((r) => (
                  <li key={r} className="v-rassurant">
                    <span className="v-rassurant-coche">
                      <Coche taille={14} epaisseur={2} />
                    </span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
            {/* Même hauteur que le formulaire : rien ne saute à son arrivée. */}
            <Suspense fallback={<div className="v-formulaire" style={{ minHeight: 560 }} aria-busy="true" />}>
              <FormulaireRdv />
            </Suspense>
          </div>
        </div>
      </section>
    </main>
  );
}
