/**
 * Background cinematic — "manuscrit céleste islamique" (version allégée).
 * Uniquement des éléments d'ambiance en arrière-plan : gradient, halo
 * pulsant, constellation, particules. Plus de skyline / lune en fixed —
 * ces éléments figuratifs sont maintenant intégrés dans le flux (hero
 * et scène "écosystème") pour qu'ils scrollent avec la page.
 */
import { Constellation } from "./CheckoutOrnaments";

const GOLD = "#C9A04E";

const PARTICLE_COUNT = 22;

function Particle({ i }: { i: number }) {
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
      `}</style>

      {/* Gradient radial doré subtil centré en haut */}
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

      {/* Halo central qui respire */}
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

      {/* Constellation */}
      <Constellation />

      {/* Poussière dorée flottante */}
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

      {/* Liseré doré en haut uniquement (le bas de page est ancré par la scène écosystème scrollable) */}
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
