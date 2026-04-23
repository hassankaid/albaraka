/**
 * Canvas Al Baraka — étoiles scintillantes sur les côtés.
 *
 * Le formulaire (max-width 440px centré) occupe la zone centrale et
 * doit rester visuellement propre : pas d'étoiles qui chevauchent les
 * champs. Les étoiles sont donc confinées aux **flancs** (x < 22 % ou
 * x > 78 %), sur toute la hauteur de la page, pour animer l'espace
 * qui serait sinon un grand vide noir.
 *
 * Tout est en absolute dans un wrapper relative+overflow-hidden qui
 * englobe le contenu → scrolle avec la page, rien n'est fixed.
 */

const GOLD = "#C9A04E";
const GOLD_BRIGHT = "#E4C57A";

/* Positions déterministes : moitiés gauche (x 2-22) et droite (x 78-98),
   réparties sur toute la hauteur (y 2-98). Tailles + vitesses variées
   pour créer un rythme naturel sans synchronisation visible. */
const STARS = [
  // --- Flanc gauche (haut → bas) ---
  { x: 4,  y: 3,  size: 1.1, bright: false, dur: 4.2, delay: 0    },
  { x: 11, y: 7,  size: 1.6, bright: true,  dur: 3.4, delay: -1.1 },
  { x: 6,  y: 13, size: 0.9, bright: false, dur: 5.0, delay: -2.3 },
  { x: 15, y: 19, size: 1.2, bright: false, dur: 4.6, delay: -0.8 },
  { x: 3,  y: 26, size: 0.8, bright: false, dur: 5.8, delay: -3.1 },
  { x: 19, y: 31, size: 1.8, bright: true,  dur: 3.2, delay: -1.5 },
  { x: 9,  y: 38, size: 1.0, bright: false, dur: 4.4, delay: -2.0 },
  { x: 14, y: 45, size: 0.9, bright: false, dur: 5.2, delay: -0.4 },
  { x: 5,  y: 52, size: 1.4, bright: true,  dur: 3.7, delay: -2.6 },
  { x: 18, y: 58, size: 1.1, bright: false, dur: 4.8, delay: -1.2 },
  { x: 7,  y: 65, size: 0.8, bright: false, dur: 5.4, delay: -3.4 },
  { x: 13, y: 72, size: 1.2, bright: false, dur: 4.2, delay: -0.9 },
  { x: 4,  y: 79, size: 1.6, bright: true,  dur: 3.5, delay: -2.1 },
  { x: 16, y: 86, size: 1.0, bright: false, dur: 4.9, delay: -1.6 },
  { x: 8,  y: 93, size: 0.9, bright: false, dur: 5.3, delay: -0.5 },

  // --- Flanc droit (haut → bas) ---
  { x: 87, y: 4,  size: 1.3, bright: false, dur: 4.6, delay: -1.8 },
  { x: 95, y: 9,  size: 1.7, bright: true,  dur: 3.3, delay: -0.2 },
  { x: 82, y: 15, size: 0.9, bright: false, dur: 5.1, delay: -2.7 },
  { x: 91, y: 21, size: 1.1, bright: false, dur: 4.5, delay: -1.0 },
  { x: 97, y: 28, size: 0.8, bright: false, dur: 5.6, delay: -3.3 },
  { x: 84, y: 34, size: 1.5, bright: true,  dur: 3.6, delay: -1.4 },
  { x: 93, y: 41, size: 1.0, bright: false, dur: 4.7, delay: -2.5 },
  { x: 86, y: 48, size: 0.9, bright: false, dur: 5.0, delay: -0.7 },
  { x: 96, y: 55, size: 1.3, bright: true,  dur: 3.9, delay: -1.9 },
  { x: 89, y: 62, size: 1.1, bright: false, dur: 4.4, delay: -3.0 },
  { x: 83, y: 69, size: 0.8, bright: false, dur: 5.7, delay: -0.3 },
  { x: 94, y: 76, size: 1.2, bright: false, dur: 4.3, delay: -2.2 },
  { x: 88, y: 83, size: 1.6, bright: true,  dur: 3.4, delay: -1.3 },
  { x: 97, y: 90, size: 0.9, bright: false, dur: 5.1, delay: -2.8 },
  { x: 85, y: 96, size: 1.0, bright: false, dur: 4.8, delay: -0.6 },
];

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
        @keyframes alb-star-soft {
          0%, 100% { opacity: 0.3; }
          50%      { opacity: 0.85; }
        }
        @keyframes alb-star-bright {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50%      { opacity: 1;    transform: scale(1.3); }
        }
      `}</style>

      {/* Fond noir avec léger dégradé vertical (pour éviter le noir LCD plat) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, #0A0908 0%, #080707 50%, #0B0908 100%)",
        }}
      />

      {/* Liseré doré ultra-fin en haut (signature) */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "1px",
          background:
            "linear-gradient(90deg, transparent 0%, rgba(201,160,78,0.45) 50%, transparent 100%)",
        }}
      />

      {/* Champ d'étoiles sur les flancs gauche + droit, toute la hauteur de la page */}
      {STARS.map((s, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            borderRadius: "50%",
            background: s.bright ? GOLD_BRIGHT : GOLD,
            boxShadow: s.bright
              ? `0 0 ${3 + s.size * 2}px rgba(228,197,122,0.85), 0 0 ${6 + s.size * 3}px rgba(201,160,78,0.35)`
              : `0 0 ${2 + s.size}px rgba(201,160,78,0.55)`,
            animation: `alb-star-${s.bright ? "bright" : "soft"} ${s.dur}s ease-in-out infinite`,
            animationDelay: `${s.delay}s`,
            transformOrigin: "center",
          }}
        />
      ))}
    </div>
  );
}
