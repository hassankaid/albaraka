/**
 * Background cinematic réutilisable pour les pages de paiement Al Baraka.
 * - Gradient radial doré très subtil, centré en haut
 * - Couche de "poussière dorée" avec animation de flottement (CSS pur, ~60 lignes)
 * - Liseré doré fin en haut et en bas de l'écran
 * - Coin décoratifs (quart de cercle doré) aux 4 angles
 * Aucune dépendance, aucune image — 100% CSS + SVG.
 */

const GOLD = "#C9A04E";

const PARTICLE_COUNT = 28;

function Particle({ i }: { i: number }) {
  // Positions semi-aléatoires mais déterministes → pas de flash au remount
  const seed = (i * 9301 + 49297) % 233280;
  const rand = seed / 233280;
  const rand2 = ((i * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const left = rand * 100;
  const top = rand2 * 100;
  const size = 1 + (rand + rand2) * 1.2;
  const duration = 14 + rand * 10;
  const delay = -rand2 * 20;
  const opacity = 0.35 + rand * 0.45;

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
        boxShadow: `0 0 ${4 + rand * 6}px rgba(201,160,78,0.6)`,
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
          25% { transform: translate(8px, -14px); }
          50% { transform: translate(-6px, -22px); opacity: 0.8; }
          75% { transform: translate(-10px, -10px); }
        }
        @keyframes alb-glow-pulse {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50% { opacity: 0.55; transform: scale(1.06); }
        }
      `}</style>

      {/* Gradient radial doré subtil centré en haut */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background:
            "radial-gradient(ellipse 80% 55% at 50% 0%, rgba(201,160,78,0.12) 0%, rgba(201,160,78,0.04) 35%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Halo central qui respire */}
      <div
        style={{
          position: "fixed",
          top: "20%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "620px",
          height: "620px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(201,160,78,0.10) 0%, transparent 60%)",
          filter: "blur(40px)",
          animation: "alb-glow-pulse 8s ease-in-out infinite",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Particules dorées flottantes */}
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

      {/* Liserés dorés haut + bas (gradient qui s'estompe sur les côtés) */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: "1px",
          background:
            "linear-gradient(90deg, transparent 0%, rgba(201,160,78,0.45) 50%, transparent 100%)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: "1px",
          background:
            "linear-gradient(90deg, transparent 0%, rgba(201,160,78,0.35) 50%, transparent 100%)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* Coins décoratifs (quart de cercle doré aux 4 angles) */}
      {[
        { top: 16, left: 16, rotate: 0 },
        { top: 16, right: 16, rotate: 90 },
        { bottom: 16, right: 16, rotate: 180 },
        { bottom: 16, left: 16, rotate: 270 },
      ].map((pos, i) => (
        <svg
          key={i}
          width="28"
          height="28"
          viewBox="0 0 28 28"
          style={{
            position: "fixed",
            ...pos,
            transform: `rotate(${pos.rotate}deg)`,
            pointerEvents: "none",
            zIndex: 1,
            opacity: 0.55,
          }}
        >
          <path
            d="M2 2 L2 12 M2 2 L12 2"
            stroke={GOLD}
            strokeWidth="1"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      ))}
    </>
  );
}
