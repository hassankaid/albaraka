/**
 * Canvas Al Baraka — version minimale avec skyline discrète.
 *
 * Composition :
 *  - Fond noir avec léger dégradé vertical.
 *  - Un ciel étoilé : quelques étoiles dorées réparties dans la
 *    moitié haute, scintillement discret à rythmes variés.
 *  - Skyline de ville orientale en bas de la page (silhouette dorée,
 *    minarets + dômes), avec des points lumineux dans les bâtiments
 *    qui pulsent à des rythmes différents pour créer du rythme
 *    sans être distrayant.
 *
 * Tout est en position: absolute dans un wrapper relative+overflow
 * hidden qui englobe le contenu — donc le canvas scrolle avec la
 * page, aucun élément ne reste collé à la viewport.
 */

const GOLD = "#C9A04E";
const GOLD_BRIGHT = "#E4C57A";

/* Positions déterministes des étoiles (répandues en haut de la page) */
const STARS = [
  { x: 8, y: 6, size: 1.6, bright: true, dur: 3.2, delay: 0 },
  { x: 22, y: 12, size: 1.1, bright: false, dur: 4.0, delay: -1.5 },
  { x: 34, y: 4, size: 0.9, bright: false, dur: 5.2, delay: -2 },
  { x: 47, y: 9, size: 1.3, bright: true, dur: 3.8, delay: -0.7 },
  { x: 60, y: 5, size: 1.0, bright: false, dur: 4.6, delay: -3 },
  { x: 72, y: 11, size: 1.8, bright: true, dur: 3.5, delay: -1.8 },
  { x: 85, y: 7, size: 0.9, bright: false, dur: 5.0, delay: -0.3 },
  { x: 92, y: 14, size: 1.1, bright: false, dur: 4.2, delay: -2.5 },
  { x: 15, y: 22, size: 0.8, bright: false, dur: 5.8, delay: -1.2 },
  { x: 40, y: 26, size: 1.0, bright: true, dur: 3.3, delay: -0.9 },
  { x: 65, y: 24, size: 0.9, bright: false, dur: 4.9, delay: -2.2 },
  { x: 80, y: 28, size: 1.2, bright: false, dur: 4.4, delay: -3.5 },
];

/* Lumières des minarets & bâtiments — pulsent à rythmes variés */
const LIGHTS = [
  { cx: 188, cy: 68, r: 2.5, dur: 2.8, delay: 0 },
  { cx: 340, cy: 96, r: 2.2, dur: 3.4, delay: -1.2 },
  { cx: 522, cy: 52, r: 3, dur: 3.0, delay: -0.5 },
  { cx: 720, cy: 88, r: 2, dur: 4.2, delay: -2 },
  { cx: 918, cy: 62, r: 2.8, dur: 3.6, delay: -1.8 },
  { cx: 1110, cy: 92, r: 2.2, dur: 3.2, delay: -0.8 },
  { cx: 1312, cy: 58, r: 2.5, dur: 4.0, delay: -2.5 },
  { cx: 1490, cy: 82, r: 2, dur: 3.8, delay: -1.4 },
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
          0%, 100% { opacity: 0.35; }
          50%      { opacity: 0.9;  }
        }
        @keyframes alb-star-bright {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50%      { opacity: 1;    transform: scale(1.25); }
        }
        @keyframes alb-light-pulse {
          0%, 100% { opacity: 0.5; }
          50%      { opacity: 1;   }
        }
      `}</style>

      {/* 1. Fond noir avec léger dégradé vertical */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, #0A0908 0%, #080707 50%, #0C0A08 100%)",
        }}
      />

      {/* 2. Étoiles réparties dans la moitié haute */}
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
              ? `0 0 ${3 + s.size * 2}px rgba(228,197,122,0.8), 0 0 ${6 + s.size * 3}px rgba(201,160,78,0.3)`
              : `0 0 ${2 + s.size}px rgba(201,160,78,0.55)`,
            animation: `alb-star-${s.bright ? "bright" : "soft"} ${s.dur}s ease-in-out infinite`,
            animationDelay: `${s.delay}s`,
            transformOrigin: "center",
          }}
        />
      ))}

      {/* 3. Skyline de ville orientale en bas de la page (silhouette dorée) */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: "none",
        }}
      >
        <svg
          viewBox="0 0 1600 180"
          preserveAspectRatio="xMidYMax slice"
          width="100%"
          height="180"
          style={{ display: "block" }}
        >
          <defs>
            <linearGradient id="alb-skyline-grad" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor={GOLD} stopOpacity="0.55" />
              <stop offset="70%" stopColor={GOLD} stopOpacity="0.12" />
              <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Silhouette fondue vers le haut */}
          <g fill="url(#alb-skyline-grad)">
            {/* Gauche : bâtiments + minaret */}
            <path d="M 0 180 L 0 140 L 48 140 L 48 120 L 72 120 L 72 148 L 108 148 L 108 180 Z" />
            <path d="M 138 180 L 138 110 L 144 98 L 150 84 Q 154 78 152 78 Q 148 78 152 84 L 158 98 L 164 110 L 164 180 Z" />
            <circle cx="152" cy="72" r="4" />
            <path d="M 152 62 L 154 68 L 152 66 L 150 68 Z" />

            {/* Dôme grand */}
            <path d="M 200 180 L 200 130 L 214 130 L 214 104 Q 258 56 302 104 L 302 130 L 316 130 L 316 180 Z" />
            <rect x="256" y="70" width="4" height="24" />
            <circle cx="258" cy="68" r="4" />
            <path d="M 256 58 L 260 64 L 258 62 L 256 64 Z" />

            {/* Bâtiments moyens */}
            <path d="M 342 180 L 342 150 L 372 150 L 372 130 L 402 130 L 402 158 L 420 158 L 420 180 Z" />

            {/* Minaret élancé */}
            <path d="M 452 180 L 452 92 L 458 78 L 464 62 Q 468 56 466 56 Q 462 56 466 62 L 472 78 L 478 92 L 478 180 Z" />
            <circle cx="466" cy="50" r="4" />
            <path d="M 466 40 L 469 47 L 466 46 L 463 47 Z" />

            {/* Mosquée centrale majestueuse */}
            <path d="M 510 180 L 510 130 L 524 130 L 524 94 Q 566 42 608 94 L 608 130 L 622 130 L 622 180 Z" />
            <rect x="564" y="56" width="4" height="26" />
            <circle cx="566" cy="54" r="5" />
            <path d="M 564 42 L 568 50 L 566 48 L 564 50 Z" />
            {/* Petits dômes latéraux */}
            <path d="M 490 180 L 490 146 Q 510 124 530 146 L 530 180 Z" />
            <path d="M 602 180 L 602 146 Q 622 124 642 146 L 642 180 Z" />

            {/* Minaret central haut */}
            <path d="M 658 180 L 658 80 L 664 66 L 670 50 Q 674 44 672 44 Q 668 44 672 50 L 678 66 L 684 80 L 684 180 Z" />
            <circle cx="672" cy="38" r="4" />
            <path d="M 672 28 L 675 35 L 672 34 L 669 35 Z" />

            {/* Bâtiments */}
            <path d="M 712 180 L 712 156 L 752 156 L 752 132 L 788 132 L 788 166 L 808 166 L 808 180 Z" />

            {/* Dôme moyen */}
            <path d="M 840 180 L 840 142 Q 876 108 912 142 L 912 180 Z" />
            <rect x="874" y="118" width="3" height="18" />
            <circle cx="876" cy="116" r="3" />

            {/* Minaret */}
            <path d="M 942 180 L 942 96 L 948 82 L 954 68 Q 958 62 956 62 Q 952 62 956 68 L 962 82 L 968 96 L 968 180 Z" />
            <circle cx="956" cy="56" r="4" />

            {/* Bâtiments + dôme grand droite */}
            <path d="M 1000 180 L 1000 158 L 1030 158 L 1030 138 L 1060 138 L 1060 166 L 1080 166 L 1080 180 Z" />
            <path d="M 1100 180 L 1100 128 L 1114 128 L 1114 102 Q 1158 54 1202 102 L 1202 128 L 1216 128 L 1216 180 Z" />
            <rect x="1156" y="68" width="4" height="24" />
            <circle cx="1158" cy="66" r="4" />
            <path d="M 1156 56 L 1160 62 L 1158 60 L 1156 62 Z" />

            {/* Minaret tall right */}
            <path d="M 1250 180 L 1250 72 L 1256 58 L 1262 42 Q 1266 36 1264 36 Q 1260 36 1264 42 L 1270 58 L 1276 72 L 1276 180 Z" />
            <circle cx="1264" cy="30" r="4" />
            <path d="M 1264 20 L 1267 27 L 1264 26 L 1261 27 Z" />

            {/* Bâtiments */}
            <path d="M 1310 180 L 1310 150 L 1346 150 L 1346 124 L 1384 124 L 1384 156 L 1412 156 L 1412 180 Z" />

            {/* Dôme bas droit */}
            <path d="M 1440 180 L 1440 142 Q 1476 108 1512 142 L 1512 180 Z" />
            <rect x="1474" y="118" width="3" height="18" />
            <circle cx="1476" cy="116" r="3" />

            {/* Minaret fin droite */}
            <path d="M 1548 180 L 1548 88 L 1554 72 L 1560 56 Q 1564 50 1562 50 Q 1558 50 1562 56 L 1568 72 L 1574 88 L 1574 180 Z" />
            <circle cx="1562" cy="44" r="4" />
            <path d="M 1562 34 L 1565 41 L 1562 40 L 1559 41 Z" />
          </g>

          {/* Lumières qui pulsent dans les bâtiments */}
          {LIGHTS.map((l, i) => (
            <circle
              key={i}
              cx={l.cx}
              cy={l.cy}
              r={l.r}
              fill={GOLD_BRIGHT}
              style={{
                filter: `drop-shadow(0 0 ${l.r * 2}px rgba(228,197,122,0.9))`,
                animation: `alb-light-pulse ${l.dur}s ease-in-out infinite`,
                animationDelay: `${l.delay}s`,
              }}
            />
          ))}

          {/* Ligne de sol dorée fine */}
          <line
            x1="0"
            y1="179"
            x2="1600"
            y2="179"
            stroke={GOLD}
            strokeWidth="0.5"
            opacity="0.4"
          />
        </svg>
      </div>

      {/* 4. Liseré doré ultra-fin en haut */}
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
