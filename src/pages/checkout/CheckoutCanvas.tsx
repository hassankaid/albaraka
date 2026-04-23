/**
 * Canvas de fond premium pour les pages checkout & merci Al Baraka.
 *
 * Couvre TOUTE la hauteur de la page parente (pas juste la viewport) —
 * donc il scrolle naturellement avec le contenu : plus le formulaire
 * est long, plus il y a d'étoiles et d'ondulations visibles.
 *
 * Composition (du plus loin au plus près) :
 *  1. Gradient radial doré multi-couches (remplace le noir pur)
 *  2. Ondulations dorées horizontales (SVG paths sinusoïdaux)
 *  3. Champ d'étoiles scintillantes (~72 points répartis sur toute la page)
 *  4. Liseré doré très fin en haut et en bas
 *
 * 100% SVG + CSS, aucune image. L'usage : placer dans un wrapper
 * `position: relative; overflow: hidden` qui englobe tout le contenu.
 */

const GOLD = "#C9A04E";
const GOLD_BRIGHT = "#E4C57A";

const STAR_COUNT = 72;

function Star({ i }: { i: number }) {
  // Positions déterministes par i (pas de Math.random → pas de flash au remount)
  const seedA = (i * 9301 + 49297) % 233280;
  const seedB = ((i * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const seedC = ((i * 22695477 + 1) % 4294967296) / 4294967296;

  const left = (seedA / 233280) * 100;
  const top = seedB * 100;
  const size = 0.8 + seedC * 2.4;
  const isBright = (i % 11 === 0);
  const duration = 2.5 + seedC * 3.5;
  const delay = -seedB * 6;
  const baseOpacity = 0.35 + seedA / 466560; // 0.35 – 0.85

  const color = isBright ? GOLD_BRIGHT : GOLD;
  const glow = isBright ? `0 0 ${3 + size * 2}px rgba(228,197,122,0.9), 0 0 ${6 + size * 3}px rgba(201,160,78,0.4)` : `0 0 ${2 + size}px rgba(201,160,78,0.55)`;

  return (
    <div
      style={{
        position: "absolute",
        left: `${left}%`,
        top: `${top}%`,
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "50%",
        background: color,
        boxShadow: glow,
        opacity: baseOpacity,
        animation: `alb-twinkle-${isBright ? "bright" : "soft"} ${duration}s ease-in-out infinite`,
        animationDelay: `${delay}s`,
        pointerEvents: "none",
      }}
    />
  );
}

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
        @keyframes alb-twinkle-soft {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.15); }
        }
        @keyframes alb-twinkle-bright {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          30% { opacity: 1; transform: scale(1.35); }
          70% { opacity: 0.7; transform: scale(1.1); }
        }
        @keyframes alb-wave-flow-1 {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(-14px); }
        }
        @keyframes alb-wave-flow-2 {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(12px); }
        }
        @keyframes alb-wave-flow-3 {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(-18px); }
        }
        @keyframes alb-glow-breathe {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 0.95; }
        }
      `}</style>

      {/* 1. Fond dégradé multi-couches — remplace le noir uni */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `
            radial-gradient(ellipse 80% 40% at 50% 8%, rgba(201,160,78,0.16) 0%, rgba(201,160,78,0.04) 35%, transparent 65%),
            radial-gradient(ellipse 100% 60% at 50% 110%, rgba(201,160,78,0.12) 0%, transparent 55%),
            radial-gradient(ellipse 60% 40% at 15% 45%, rgba(228,197,122,0.05) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 85% 65%, rgba(201,160,78,0.05) 0%, transparent 60%),
            linear-gradient(180deg, #0A0A0A 0%, #0C0A06 30%, #0A0807 70%, #0A0A0A 100%)
          `,
        }}
      />

      {/* 2. Ondulations dorées — SVG preserveAspectRatio none pour s'étirer sur toute la hauteur */}
      <svg
        preserveAspectRatio="none"
        viewBox="0 0 1600 2400"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: 1,
        }}
      >
        <defs>
          <linearGradient id="alb-wave-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={GOLD} stopOpacity="0" />
            <stop offset="25%" stopColor={GOLD} stopOpacity="0.35" />
            <stop offset="50%" stopColor={GOLD_BRIGHT} stopOpacity="0.7" />
            <stop offset="75%" stopColor={GOLD} stopOpacity="0.35" />
            <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
          </linearGradient>
          <linearGradient id="alb-wave-grad-2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={GOLD} stopOpacity="0" />
            <stop offset="30%" stopColor={GOLD} stopOpacity="0.28" />
            <stop offset="50%" stopColor={GOLD} stopOpacity="0.55" />
            <stop offset="70%" stopColor={GOLD} stopOpacity="0.28" />
            <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
          </linearGradient>
          <linearGradient id="alb-wave-grad-3" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={GOLD} stopOpacity="0" />
            <stop offset="40%" stopColor={GOLD} stopOpacity="0.2" />
            <stop offset="60%" stopColor={GOLD} stopOpacity="0.2" />
            <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Vague 1 — haut */}
        <g style={{ animation: "alb-wave-flow-1 11s ease-in-out infinite" }}>
          <path
            d="M -50 260 Q 200 180 400 260 T 800 260 T 1200 260 T 1650 260"
            fill="none"
            stroke="url(#alb-wave-grad)"
            strokeWidth="0.9"
          />
          <path
            d="M -50 290 Q 200 210 400 290 T 800 290 T 1200 290 T 1650 290"
            fill="none"
            stroke="url(#alb-wave-grad-3)"
            strokeWidth="0.6"
          />
        </g>

        {/* Vague 2 — un tiers */}
        <g style={{ animation: "alb-wave-flow-2 14s ease-in-out infinite" }}>
          <path
            d="M -50 700 Q 240 640 480 700 T 960 700 T 1440 700 T 1650 700"
            fill="none"
            stroke="url(#alb-wave-grad-2)"
            strokeWidth="0.8"
          />
          <path
            d="M -50 730 Q 240 780 480 730 T 960 730 T 1440 730 T 1650 730"
            fill="none"
            stroke="url(#alb-wave-grad-3)"
            strokeWidth="0.5"
          />
        </g>

        {/* Vague 3 — milieu */}
        <g style={{ animation: "alb-wave-flow-3 13s ease-in-out infinite" }}>
          <path
            d="M -50 1200 Q 180 1140 360 1200 T 720 1200 T 1080 1200 T 1440 1200 T 1650 1200"
            fill="none"
            stroke="url(#alb-wave-grad)"
            strokeWidth="0.8"
          />
        </g>

        {/* Vague 4 — bas */}
        <g style={{ animation: "alb-wave-flow-2 16s ease-in-out infinite" }}>
          <path
            d="M -50 1700 Q 250 1640 500 1700 T 1000 1700 T 1500 1700 T 1650 1700"
            fill="none"
            stroke="url(#alb-wave-grad-2)"
            strokeWidth="0.7"
          />
          <path
            d="M -50 1730 Q 250 1780 500 1730 T 1000 1730 T 1500 1730 T 1650 1730"
            fill="none"
            stroke="url(#alb-wave-grad-3)"
            strokeWidth="0.5"
          />
        </g>

        {/* Vague 5 — très bas */}
        <g style={{ animation: "alb-wave-flow-1 18s ease-in-out infinite" }}>
          <path
            d="M -50 2100 Q 220 2040 440 2100 T 880 2100 T 1320 2100 T 1650 2100"
            fill="none"
            stroke="url(#alb-wave-grad)"
            strokeWidth="0.9"
          />
        </g>
      </svg>

      {/* 3. Champ d'étoiles scintillantes */}
      {Array.from({ length: STAR_COUNT }).map((_, i) => (
        <Star key={i} i={i} />
      ))}

      {/* 4. Deux zones de glow doux en profondeur */}
      <div
        style={{
          position: "absolute",
          top: "12%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(720px, 90vw)",
          height: "540px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(201,160,78,0.13) 0%, transparent 60%)",
          filter: "blur(50px)",
          animation: "alb-glow-breathe 9s ease-in-out infinite",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "60%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(540px, 80vw)",
          height: "420px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(228,197,122,0.08) 0%, transparent 65%)",
          filter: "blur(60px)",
          animation: "alb-glow-breathe 12s ease-in-out infinite 2s",
        }}
      />

      {/* 5. Liseré doré ultra-fin en haut */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "1px",
          background:
            "linear-gradient(90deg, transparent 0%, rgba(201,160,78,0.55) 50%, transparent 100%)",
        }}
      />
      {/* 6. Liseré doré ultra-fin en bas */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "1px",
          background:
            "linear-gradient(90deg, transparent 0%, rgba(201,160,78,0.35) 50%, transparent 100%)",
        }}
      />
    </div>
  );
}
