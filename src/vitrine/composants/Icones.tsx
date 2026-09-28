// Icônes du site vitrine, tracées comme dans la maquette (trait fin, or).
// Toutes décoratives : `aria-hidden`, le texte voisin porte le sens.

const OR = "#D8B85E";

export function Fleche({ couleur = "#0A0907", taille = 18, sens = "droite" }: { couleur?: string; taille?: number; sens?: "droite" | "gauche" }) {
  return (
    <svg aria-hidden="true" width={taille} height={taille} viewBox="0 0 18 18" fill="none" stroke={couleur} strokeWidth="1.8" strokeLinecap="round">
      <path d={sens === "droite" ? "M3 9h12M10 4l5 5-5 5" : "M15 9H3M8 4L3 9l5 5"} />
    </svg>
  );
}

export function Coche({ taille = 16, epaisseur = 1.8 }: { taille?: number; epaisseur?: number }) {
  return (
    <svg aria-hidden="true" width={taille} height={taille} viewBox="0 0 18 18" fill="none" stroke={OR} strokeWidth={epaisseur} strokeLinecap="round">
      <path d="M3 9.5l4 4 8-9" />
    </svg>
  );
}

export function Lecture() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 22 22">
      <path d="M7 4l11 7-11 7z" fill={OR} />
    </svg>
  );
}

/** Le losange du coin de la carte portrait. */
export function Etoile() {
  return (
    <svg aria-hidden="true" width="26" height="26" viewBox="0 0 30 30" fill="none" stroke={OR} strokeWidth="1.3">
      <rect x="7" y="7" width="16" height="16" />
      <rect x="7" y="7" width="16" height="16" transform="rotate(45 15 15)" />
    </svg>
  );
}

/** Maison pour Construire, cible pour Attirer, coche pour Convertir (§4.3). */
export function IconePilier({ nom }: { nom: "maison" | "cible" | "coche" }) {
  return (
    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={OR} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {nom === "maison" && <path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6" />}
      {nom === "cible" && (
        <>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1" />
        </>
      )}
      {nom === "coche" && <path d="M4 12l5 5L20 6" />}
    </svg>
  );
}
