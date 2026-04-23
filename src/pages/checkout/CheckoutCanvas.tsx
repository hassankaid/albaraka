/**
 * Canvas premium Al Baraka — direction "Nour" (lumière).
 *
 * Principe : 1 seule idée, exécutée avec précision.
 * → un pattern islamique tessellé en toile de fond (3% opacity),
 *   pour donner de la matière à ce qui serait sinon un noir plat,
 * → deux aurores dorées géantes qui dérivent lentement à travers
 *   toute la page (60s et 85s, trajectoires décalées), pour le
 *   mouvement hypnotique,
 * → base noire très profonde avec léger dégradé.
 *
 * Rien d'autre. Pas d'étoiles, pas d'ondulations, pas de skyline.
 * Le canvas couvre toute la hauteur de la page (absolute/inset 0
 * dans un wrapper relative+overflow-hidden) et scrolle avec.
 */

const PATTERN_ID = "alb-girih";

export default function CheckoutCanvas() {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
        zIndex: 0,
      }}
    >
      <style>{`
        @keyframes alb-aurora-a {
          0%   { transform: translate(-12%, -8%) scale(1); opacity: 0.75; }
          25%  { transform: translate(18%, -18%) scale(1.18); opacity: 1; }
          50%  { transform: translate(32%, 14%) scale(1.1); opacity: 0.9; }
          75%  { transform: translate(-8%, 22%) scale(1.22); opacity: 1; }
          100% { transform: translate(-12%, -8%) scale(1); opacity: 0.75; }
        }
        @keyframes alb-aurora-b {
          0%   { transform: translate(20%, 10%) scale(1.1); opacity: 0.6; }
          33%  { transform: translate(-18%, -10%) scale(1); opacity: 0.9; }
          66%  { transform: translate(22%, -14%) scale(1.25); opacity: 0.75; }
          100% { transform: translate(20%, 10%) scale(1.1); opacity: 0.6; }
        }
        @keyframes alb-aurora-c {
          0%   { transform: translate(-14%, 20%) scale(0.95); opacity: 0.5; }
          40%  { transform: translate(14%, 4%) scale(1.15); opacity: 0.8; }
          70%  { transform: translate(22%, -18%) scale(1); opacity: 0.65; }
          100% { transform: translate(-14%, 20%) scale(0.95); opacity: 0.5; }
        }
      `}</style>

      {/* 1. Base sombre avec léger dégradé vertical (pas de noir LCD) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, #0B0908 0%, #080707 35%, #060606 65%, #0A0807 100%)",
        }}
      />

      {/* 2. Pattern islamique tessellé — étoile à 8 branches répétée, ultra subtil */}
      <svg
        width="100%"
        height="100%"
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.22,
        }}
      >
        <defs>
          <pattern
            id={PATTERN_ID}
            x="0"
            y="0"
            width="88"
            height="88"
            patternUnits="userSpaceOnUse"
          >
            <g
              fill="none"
              stroke="#C9A04E"
              strokeWidth="0.45"
              strokeOpacity="0.55"
              strokeLinejoin="round"
            >
              {/* Étoile à 8 branches = 2 carrés superposés (motif Girih traditionnel) */}
              <g transform="translate(44 44)">
                <rect x="-18" y="-18" width="36" height="36" />
                <rect x="-18" y="-18" width="36" height="36" transform="rotate(45)" />
                <circle cx="0" cy="0" r="6" strokeOpacity="0.35" />
              </g>
              {/* Motif aux 4 coins pour que la tessellation soit continue */}
              <g transform="translate(0 0)">
                <rect x="-12" y="-12" width="24" height="24" strokeOpacity="0.4" />
                <rect x="-12" y="-12" width="24" height="24" transform="rotate(45)" strokeOpacity="0.4" />
              </g>
              <g transform="translate(88 0)">
                <rect x="-12" y="-12" width="24" height="24" strokeOpacity="0.4" />
                <rect x="-12" y="-12" width="24" height="24" transform="rotate(45)" strokeOpacity="0.4" />
              </g>
              <g transform="translate(0 88)">
                <rect x="-12" y="-12" width="24" height="24" strokeOpacity="0.4" />
                <rect x="-12" y="-12" width="24" height="24" transform="rotate(45)" strokeOpacity="0.4" />
              </g>
              <g transform="translate(88 88)">
                <rect x="-12" y="-12" width="24" height="24" strokeOpacity="0.4" />
                <rect x="-12" y="-12" width="24" height="24" transform="rotate(45)" strokeOpacity="0.4" />
              </g>
            </g>
          </pattern>

          {/* Mask radial : le pattern s'estompe vers les bords */}
          <radialGradient id="alb-pattern-mask" cx="50%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
            <stop offset="55%" stopColor="#fff" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>

          <mask id="alb-pattern-vignette">
            <rect width="100%" height="100%" fill="url(#alb-pattern-mask)" />
          </mask>
        </defs>

        <rect
          width="100%"
          height="100%"
          fill={`url(#${PATTERN_ID})`}
          mask="url(#alb-pattern-vignette)"
        />
      </svg>

      {/* 3. Aurore A — grande tache dorée chaude qui dérive depuis le centre-gauche */}
      <div
        style={{
          position: "absolute",
          top: "5%",
          left: "15%",
          width: "min(820px, 70vw)",
          height: "min(820px, 70vw)",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(228,197,122,0.28) 0%, rgba(201,160,78,0.18) 25%, rgba(201,160,78,0.06) 50%, transparent 70%)",
          filter: "blur(80px)",
          animation: "alb-aurora-a 58s ease-in-out infinite",
          mixBlendMode: "screen",
          willChange: "transform, opacity",
        }}
      />

      {/* 4. Aurore B — tache plus froide / claire en bas-droite */}
      <div
        style={{
          position: "absolute",
          bottom: "10%",
          right: "5%",
          width: "min(720px, 65vw)",
          height: "min(720px, 65vw)",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(228,197,122,0.2) 0%, rgba(201,160,78,0.1) 35%, transparent 65%)",
          filter: "blur(90px)",
          animation: "alb-aurora-b 86s ease-in-out infinite",
          mixBlendMode: "screen",
          willChange: "transform, opacity",
        }}
      />

      {/* 5. Aurore C — plus petite, haut-droit, pour équilibrer visuellement */}
      <div
        style={{
          position: "absolute",
          top: "45%",
          right: "20%",
          width: "min(460px, 50vw)",
          height: "min(460px, 50vw)",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(201,160,78,0.14) 0%, transparent 60%)",
          filter: "blur(70px)",
          animation: "alb-aurora-c 72s ease-in-out infinite",
          mixBlendMode: "screen",
          willChange: "transform, opacity",
        }}
      />

      {/* 6. Vignette haut + bas pour assombrir les extrémités (ancre le contenu central) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, transparent 18%, transparent 82%, rgba(0,0,0,0.55) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* 7. Liseré doré ultra-fin en haut (signature visuelle discrète) */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "1px",
          background:
            "linear-gradient(90deg, transparent 0%, rgba(201,160,78,0.5) 50%, transparent 100%)",
        }}
      />
    </div>
  );
}
