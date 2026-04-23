/**
 * Canvas Al Baraka — direction "Ciel étoilé ottoman".
 *
 * 3 couches successives sur les flancs (jamais au centre) :
 *
 *  1. Gradient multi-radial : au lieu d'un noir uni, 4 points
 *     lumineux dorés sont ancrés aux 4 angles de la page. Le centre
 *     reste sombre pour faire ressortir le formulaire. Gradients
 *     très diffus, pas de frontière visible.
 *
 *  2. 4 nébuleuses dorées (blur 110px) placées aux 4 coins. Chacune
 *     respire très lentement à son propre rythme (65-90s) avec des
 *     amplitudes minuscules. Donne de la "matière" aux zones vides.
 *
 *  3. Constellation : 8 lignes dorées ultra-fines (SVG, stroke 0.3px)
 *     qui relient certaines étoiles des flancs entre elles, formant
 *     des petits dessins verticaux à gauche et à droite. Aucune
 *     ligne ne traverse la zone centrale.
 *
 *  4. 30 étoiles scintillantes (inchangées) sur les flancs.
 *
 * Tout en absolute + zIndex 0, scrolle avec la page.
 */

const GOLD = "#C9A04E";
const GOLD_BRIGHT = "#E4C57A";

/* Étoiles confinées aux flancs gauche (x 3-19%) et droite (x 82-97%).
   Positions stables pour que la constellation puisse les référencer par index. */
const STARS = [
  // --- Flanc gauche (0-14) ---
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

  // --- Flanc droit (15-29) ---
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

/* Lignes de constellation : paires d'index d'étoiles à relier.
   On ne relie que des étoiles du même flanc, jamais traversant le centre. */
const CONSTELLATION_LINES: Array<[number, number]> = [
  // Flanc gauche
  [1, 3],     // étoile brillante y=7 → y=19
  [3, 5],     // y=19 → étoile brillante y=31
  [5, 8],     // y=31 → étoile brillante y=52
  [8, 12],    // y=52 → étoile brillante y=79
  // Flanc droit
  [16, 18],   // y=9 → y=21
  [18, 20],   // y=21 → étoile brillante y=34
  [20, 23],   // y=34 → étoile brillante y=55
  [23, 26],   // y=55 → étoile brillante y=83
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
        @keyframes alb-nebula-a { 0%,100%{opacity:.55;transform:translate(0,0) scale(1)} 50%{opacity:.85;transform:translate(14px,-8px) scale(1.07)} }
        @keyframes alb-nebula-b { 0%,100%{opacity:.45;transform:translate(0,0) scale(1)} 50%{opacity:.75;transform:translate(-12px,10px) scale(1.1)} }
        @keyframes alb-nebula-c { 0%,100%{opacity:.4 ;transform:translate(0,0) scale(1)} 50%{opacity:.7 ;transform:translate(10px,14px) scale(1.08)} }
        @keyframes alb-nebula-d { 0%,100%{opacity:.5 ;transform:translate(0,0) scale(1)} 50%{opacity:.8 ;transform:translate(-14px,-10px) scale(1.12)} }
        @keyframes alb-line-breathe {
          0%, 100% { opacity: 0.16; }
          50%      { opacity: 0.38; }
        }
      `}</style>

      {/* 1. Fond multi-radial : 4 ancres de lumière aux angles */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `
            radial-gradient(ellipse 55% 45% at 0% 0%,   rgba(201,160,78,0.16) 0%, transparent 55%),
            radial-gradient(ellipse 55% 45% at 100% 0%, rgba(201,160,78,0.14) 0%, transparent 55%),
            radial-gradient(ellipse 60% 50% at 0% 100%, rgba(201,160,78,0.10) 0%, transparent 55%),
            radial-gradient(ellipse 60% 50% at 100% 100%, rgba(201,160,78,0.12) 0%, transparent 55%),
            linear-gradient(180deg, #0B0908 0%, #080707 50%, #0B0908 100%)
          `,
        }}
      />

      {/* 2. Quatre nébuleuses dorées aux 4 coins (blur + respiration) */}
      <div
        style={{
          position: "absolute",
          top: "-8%",
          left: "-8%",
          width: "min(520px, 48vw)",
          height: "min(460px, 45vw)",
          background: "radial-gradient(circle, rgba(228,197,122,0.22) 0%, rgba(201,160,78,0.08) 35%, transparent 65%)",
          filter: "blur(110px)",
          animation: "alb-nebula-a 68s ease-in-out infinite",
          mixBlendMode: "screen",
          willChange: "transform, opacity",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "-8%",
          right: "-8%",
          width: "min(500px, 46vw)",
          height: "min(440px, 44vw)",
          background: "radial-gradient(circle, rgba(228,197,122,0.2) 0%, rgba(201,160,78,0.07) 35%, transparent 65%)",
          filter: "blur(110px)",
          animation: "alb-nebula-b 76s ease-in-out infinite",
          mixBlendMode: "screen",
          willChange: "transform, opacity",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-10%",
          left: "-10%",
          width: "min(540px, 50vw)",
          height: "min(480px, 48vw)",
          background: "radial-gradient(circle, rgba(201,160,78,0.14) 0%, rgba(201,160,78,0.05) 40%, transparent 70%)",
          filter: "blur(120px)",
          animation: "alb-nebula-c 84s ease-in-out infinite",
          mixBlendMode: "screen",
          willChange: "transform, opacity",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-10%",
          right: "-10%",
          width: "min(520px, 48vw)",
          height: "min(460px, 46vw)",
          background: "radial-gradient(circle, rgba(201,160,78,0.16) 0%, rgba(201,160,78,0.06) 40%, transparent 70%)",
          filter: "blur(120px)",
          animation: "alb-nebula-d 92s ease-in-out infinite",
          mixBlendMode: "screen",
          willChange: "transform, opacity",
        }}
      />

      {/* 3. Constellation : lignes fines qui relient certaines étoiles (un par un flanc) */}
      <svg
        width="100%"
        height="100%"
        preserveAspectRatio="none"
        style={{
          position: "absolute",
          inset: 0,
          animation: "alb-line-breathe 7s ease-in-out infinite",
        }}
      >
        {CONSTELLATION_LINES.map(([a, b], i) => {
          const sa = STARS[a];
          const sb = STARS[b];
          return (
            <line
              key={i}
              x1={`${sa.x}%`}
              y1={`${sa.y}%`}
              x2={`${sb.x}%`}
              y2={`${sb.y}%`}
              stroke={GOLD}
              strokeWidth="0.5"
              strokeLinecap="round"
            />
          );
        })}
      </svg>

      {/* 4. Étoiles scintillantes (inchangées) */}
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

      {/* 5. Liseré doré ultra-fin en haut */}
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
    </div>
  );
}
