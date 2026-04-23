/**
 * Background cinematic — "manuscrit céleste islamique".
 * Composé en couches (du plus loin au plus près) :
 *  1. Gradient radial doré centré en haut
 *  2. Halo central qui respire
 *  3. Constellation (étoiles reliées) → SVG vectoriel, vraies étoiles
 *  4. Poussière dorée flottante (CSS pur)
 *  5. Croissant de lune + étoile en haut à droite
 *  6. Skyline de mosquées en bas (silhouette fondue)
 *  7. Liserés dorés haut/bas
 * Aucune dépendance, zéro image — 100% CSS + SVG inline.
 */
import { CrescentMoon, MosqueSkyline, Constellation } from "./CheckoutOrnaments";

const GOLD = "#C9A04E";

const PARTICLE_COUNT = 22;

function Particle({ i }: { i: number }) {
  // Positions déterministes → pas de flash au remount
  const seed = (i * 9301 + 49297) % 233280;
  const rand = seed / 233280;
  const rand2 = ((i * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const left = rand * 100;
  const top = rand2 * 100;
  const size = 1 + (rand + rand2) * 1.3;
  const duration = 16 + rand * 12;
  const delay = -rand2 * 22;
  const opacity = 0.35 + rand * 0.5;

  return (
    <div
      style={{
        position: "absolute",
        left: `${left}%`,
        top: `${top}%`,
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "50%",
        background: GOLD,
        opacity,
        boxShadow: `0 0 ${5 + rand * 8}px rgba(201,160,78,0.65)`,
        animation: `alb-particle-float ${duration}s ease-in-out infinite`,
        animationDelay: `${delay}s`,
        pointerEvents: "none",
      }}
    />
  );
}

export default function CheckoutBackground() {
  return (
    <>
      <style>{`
        @keyframes alb-particle-float {
          0%, 100% { transform: translate(0, 0); opacity: var(--op, 0.5); }
          25% { transform: translate(10px, -18px); }
          50% { transform: translate(-8px, -26px); opacity: 0.8; }
          75% { transform: translate(-12px, -12px); }
        }
        @keyframes alb-glow-pulse {
          0%, 100% { opacity: 0.38; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.6; transform: translate(-50%, -50%) scale(1.08); }
        }
        @keyframes alb-moon-fade-in {
          from { opacity: 0; transform: translate(0, -12px); }
          to { opacity: 1; transform: translate(0, 0); }
        }
      `}</style>

      {/* 1. Gradient radial doré subtil centré en haut */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background:
            "radial-gradient(ellipse 85% 60% at 50% 0%, rgba(201,160,78,0.14) 0%, rgba(201,160,78,0.05) 35%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* 2. Halo central qui respire */}
      <div
        style={{
          position: "fixed",
          top: "18%",
          left: "50%",
          width: "680px",
          height: "680px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(201,160,78,0.13) 0%, transparent 60%)",
          filter: "blur(50px)",
          animation: "alb-glow-pulse 9s ease-in-out infinite",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* 3. Constellation */}
      <Constellation />

      {/* 4. Poussière dorée flottante */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          overflow: "hidden",
        }}
      >
        {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
          <Particle key={i} i={i} />
        ))}
      </div>

      {/* 5. Croissant de lune + étoile en haut à droite */}
      <div
        style={{
          position: "fixed",
          top: 36,
          right: 40,
          pointerEvents: "none",
          zIndex: 1,
          animation: "alb-moon-fade-in 1.4s ease-out 0.3s both",
          filter: "drop-shadow(0 0 12px rgba(201,160,78,0.35))",
        }}
      >
        <CrescentMoon size={72} />
      </div>

      {/* 6. Skyline de mosquées en bas */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          pointerEvents: "none",
          zIndex: 1,
          maskImage:
            "linear-gradient(to top, black 25%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to top, black 25%, transparent 100%)",
        }}
      >
        <MosqueSkyline />
      </div>

      {/* 7. Liserés dorés haut + bas */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: "1px",
          background:
            "linear-gradient(90deg, transparent 0%, rgba(201,160,78,0.55) 50%, transparent 100%)",
          pointerEvents: "none",
          zIndex: 2,
        }}
      />
    </>
  );
}
