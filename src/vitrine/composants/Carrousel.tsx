// ─────────────────────────────────────────────────────────────────────────
// Carrousel des témoignages vidéo (cahier §4.4 et §5).
//
// Ordinateur : autant de cartes que la largeur en contient (4 à 1200 px),
// flèches en bas à droite, indicateur de position à gauche, une carte par
// clic, flèche grisée en début et en fin de liste. Tablette : 2 ou 3 cartes.
// Mobile : défilement natif au doigt avec aimantation — les flèches et
// l'indicateur sont masqués par la feuille de style.
//
// Vidéos : on n'affiche d'abord que la miniature et le bouton lecture. Le
// lecteur Vimeo n'est chargé qu'au clic : la page reste légère et aucun
// cookie Vimeo n'est déposé avant que le visiteur l'ait voulu. Une seule
// vidéo à la fois : ouvrir une carte referme la précédente, ce qui arrête sa
// lecture puisque son lecteur est retiré de la page.
// ─────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Temoignage } from "../temoignages";
import { urlLecteurVimeo } from "../temoignages";
import { Fleche, Lecture } from "./Icones";

const LARGEUR_CARTE = 285;
const ESPACE = 20;

/** Combien de cartes tiennent entièrement dans une largeur donnée. */
export function cartesVisibles(largeur: number): number {
  return Math.max(1, Math.floor((largeur + ESPACE) / (LARGEUR_CARTE + ESPACE)));
}

/** Nombre de positions du carrousel : la dernière montre la dernière carte. */
export function nombrePositions(total: number, visibles: number): number {
  return Math.max(1, total - visibles + 1);
}

function CarteVideo({
  t,
  rang,
  total,
  enLecture,
  onLire,
  onFocus,
}: {
  t: Temoignage;
  rang: number;
  total: number;
  enLecture: boolean;
  onLire: () => void;
  onFocus: () => void;
}) {
  const url = urlLecteurVimeo(t);
  const numero = String(rang + 1).padStart(2, "0");

  return (
    <li className="v-video v-carte" aria-roledescription="diapositive" aria-label={`Témoignage ${rang + 1} sur ${total}`}>
      {enLecture && url ? (
        <iframe
          src={url}
          title={`Témoignage de ${t.prenom}`}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          className="v-video-bouton"
          onClick={onLire}
          onFocus={onFocus}
          disabled={!url}
          aria-label={url ? `Lire le témoignage de ${t.prenom}, ${t.activite}` : `Témoignage ${numero} bientôt disponible`}
        >
          {t.miniature ? (
            <>
              <img className="v-video-miniature" src={t.miniature} alt="" loading="lazy" decoding="async" />
              <span className="v-video-voile" />
              <span />
            </>
          ) : (
            <>
              <span className="v-video-halo" />
              <span className="v-video-numero">Vimeo · {numero}</span>
            </>
          )}
          <span className="v-video-lecture">
            <Lecture />
          </span>
          <span className="v-video-encart">
            <strong>{t.prenom}</strong>
            <span>{t.activite}</span>
          </span>
        </button>
      )}
    </li>
  );
}

export default function Carrousel({ temoignages }: { temoignages: Temoignage[] }) {
  const fenetre = useRef<HTMLDivElement>(null);
  const [visibles, setVisibles] = useState(4);
  const [position, setPosition] = useState(0);
  const [enLecture, setEnLecture] = useState<number | null>(null);

  const positions = nombrePositions(temoignages.length, visibles);
  const derniere = positions - 1;

  // La largeur de la fenêtre décide du nombre de cartes visibles.
  useLayoutEffect(() => {
    const el = fenetre.current;
    if (!el) return;
    const mesurer = () => setVisibles(cartesVisibles(el.clientWidth));
    mesurer();
    const obs = new ResizeObserver(mesurer);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Après un redimensionnement, la position ne doit pas dépasser la fin.
  useEffect(() => {
    setPosition((p) => Math.min(p, derniere));
  }, [derniere]);

  const aller = useCallback((p: number) => setPosition(Math.max(0, Math.min(derniere, p))), [derniere]);

  // Une carte atteinte au clavier (Tab) doit être visible : on fait avancer
  // le carrousel jusqu'à elle. Sur mobile, le défilement natif s'en charge.
  const montrer = (rang: number) => {
    if (rang < position) aller(rang);
    else if (rang >= position + visibles) aller(rang - visibles + 1);
  };

  return (
    <div
      className="v-carrousel"
      role="region"
      aria-roledescription="carrousel"
      aria-label="Témoignages vidéo de nos membres"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") aller(position + 1);
        if (e.key === "ArrowLeft") aller(position - 1);
      }}
    >
      <div className="v-carrousel-fenetre" ref={fenetre}>
        <ul
          className="v-carrousel-piste"
          style={{ transform: `translateX(-${position * (LARGEUR_CARTE + ESPACE)}px)` }}
        >
          {temoignages.map((t, i) => (
            <CarteVideo
              key={i}
              t={t}
              rang={i}
              total={temoignages.length}
              enLecture={enLecture === i}
              onLire={() => setEnLecture(i)}
              onFocus={() => montrer(i)}
            />
          ))}
        </ul>
      </div>

      <div className="v-carrousel-commandes">
        <div className="v-points" aria-hidden="true">
          {Array.from({ length: positions }, (_, i) => (
            <span key={i} className={`v-point${i === position ? " v-point--actif" : ""}`} />
          ))}
        </div>
        <p className="v-lecteur-ecran" aria-live="polite" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
          {`Témoignages ${position + 1} à ${Math.min(position + visibles, temoignages.length)} sur ${temoignages.length}`}
        </p>
        <div className="v-fleches">
          <button type="button" className="v-fleche" aria-label="Vidéos précédentes" onClick={() => aller(position - 1)} disabled={position === 0}>
            <Fleche sens="gauche" couleur="#F3EEE4" />
          </button>
          <button type="button" className="v-fleche v-fleche--suivant" aria-label="Vidéos suivantes" onClick={() => aller(position + 1)} disabled={position >= derniere}>
            <Fleche />
          </button>
        </div>
      </div>
    </div>
  );
}
