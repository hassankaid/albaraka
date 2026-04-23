/**
 * Ornements SVG réutilisables pour les pages checkout Al Baraka.
 * Direction artistique : "Manuscrit céleste islamique".
 * Tous les composants sont purement vectoriels + animations CSS.
 */

const GOLD = "#C9A04E";
const GOLD_BRIGHT = "#E4C57A";

/* ========================================================================
 *  1. Globe orbital — signature du hero
 *  3 orbites elliptiques qui tournent, étoiles voyageuses sur chacune.
 * ======================================================================== */
export function OrbitalGlobe({ size = 220 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        position: "absolute",
        inset: 0,
        margin: "auto",
        pointerEvents: "none",
      }}
      aria-hidden
    >
      <style>{`
        @keyframes alb-orbit-spin-1 { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes alb-orbit-spin-2 { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
        @keyframes alb-orbit-spin-3 { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes alb-star-twinkle {
          0%, 100% { opacity: 0.9; }
          50% { opacity: 0.35; }
        }
        .alb-orbit { transform-origin: 50% 50%; transform-box: fill-box; }
        .alb-orbit-1 { animation: alb-orbit-spin-1 22s linear infinite; }
        .alb-orbit-2 { animation: alb-orbit-spin-2 34s linear infinite; }
        .alb-orbit-3 { animation: alb-orbit-spin-3 48s linear infinite; }
        .alb-orbit-star { animation: alb-star-twinkle 3s ease-in-out infinite; }
      `}</style>

      <svg
        viewBox="0 0 220 220"
        width="100%"
        height="100%"
        style={{ overflow: "visible" }}
      >
        <defs>
          <radialGradient id="alb-star-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={GOLD_BRIGHT} stopOpacity="1" />
            <stop offset="50%" stopColor={GOLD} stopOpacity="0.5" />
            <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="alb-orbit-gradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={GOLD} stopOpacity="0" />
            <stop offset="50%" stopColor={GOLD} stopOpacity="0.7" />
            <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Orbite 1 — horizontale */}
        <g className="alb-orbit alb-orbit-1" style={{ transformOrigin: "110px 110px" }}>
          <ellipse
            cx="110"
            cy="110"
            rx="102"
            ry="44"
            fill="none"
            stroke="url(#alb-orbit-gradient)"
            strokeWidth="0.7"
          />
          <circle cx="212" cy="110" r="3" fill="url(#alb-star-glow)">
            <animate attributeName="r" values="2.5;4;2.5" dur="2.8s" repeatCount="indefinite" />
          </circle>
        </g>

        {/* Orbite 2 — inclinée 45° */}
        <g
          className="alb-orbit alb-orbit-2"
          style={{ transformOrigin: "110px 110px" }}
        >
          <g transform="rotate(45 110 110)">
            <ellipse
              cx="110"
              cy="110"
              rx="104"
              ry="38"
              fill="none"
              stroke="url(#alb-orbit-gradient)"
              strokeWidth="0.6"
            />
            <circle cx="214" cy="110" r="2.3" fill="url(#alb-star-glow)" />
            <circle cx="6" cy="110" r="1.8" fill={GOLD} opacity="0.7" />
          </g>
        </g>

        {/* Orbite 3 — verticale large */}
        <g
          className="alb-orbit alb-orbit-3"
          style={{ transformOrigin: "110px 110px" }}
        >
          <g transform="rotate(-30 110 110)">
            <ellipse
              cx="110"
              cy="110"
              rx="96"
              ry="106"
              fill="none"
              stroke="url(#alb-orbit-gradient)"
              strokeWidth="0.5"
              opacity="0.8"
            />
            <circle cx="206" cy="110" r="1.6" fill={GOLD_BRIGHT} />
          </g>
        </g>

        {/* Étoiles fixes scintillantes autour */}
        {[
          { x: 32, y: 32, r: 1 },
          { x: 188, y: 44, r: 0.8 },
          { x: 196, y: 180, r: 1.2 },
          { x: 22, y: 176, r: 0.7 },
          { x: 110, y: 4, r: 1 },
          { x: 4, y: 110, r: 0.8 },
        ].map((s, i) => (
          <circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={s.r}
            fill={GOLD}
            className="alb-orbit-star"
            style={{ animationDelay: `${i * 0.5}s` }}
          />
        ))}
      </svg>
    </div>
  );
}

/* ========================================================================
 *  2. Croissant de lune + étoile — décoration d'angle
 * ======================================================================== */
export function CrescentMoon({ size = 64 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      style={{ overflow: "visible" }}
      aria-hidden
    >
      <defs>
        <filter id="alb-moon-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Croissant — deux arcs */}
      <path
        d="M 40 12 A 22 22 0 1 0 40 52 A 18 18 0 1 1 40 12 Z"
        fill="none"
        stroke={GOLD}
        strokeWidth="1.1"
        opacity="0.85"
        filter="url(#alb-moon-glow)"
      />
      {/* Étoile à 8 branches */}
      <g transform="translate(14 20)" opacity="0.9">
        <path
          d="M 0 -7 L 1.5 -1.5 L 7 0 L 1.5 1.5 L 0 7 L -1.5 1.5 L -7 0 L -1.5 -1.5 Z"
          fill={GOLD_BRIGHT}
        />
        <path
          d="M 0 -5 L 5 0 L 0 5 L -5 0 Z"
          fill={GOLD}
          opacity="0.6"
          transform="rotate(45)"
        />
      </g>
    </svg>
  );
}

/* ========================================================================
 *  3. Skyline de mosquées stylisée — pied de page
 *  Silhouette dorée ultra-subtile.
 * ======================================================================== */
export function MosqueSkyline() {
  return (
    <svg
      viewBox="0 0 1600 140"
      preserveAspectRatio="xMidYMax slice"
      width="100%"
      height="140"
      style={{ display: "block" }}
      aria-hidden
    >
      <defs>
        <linearGradient id="alb-skyline-fade" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={GOLD} stopOpacity="0.42" />
          <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Silhouette — tours + dômes + minarets */}
      <g fill="url(#alb-skyline-fade)">
        <path d="M 0 140 L 0 100 L 40 100 L 40 80 L 60 80 L 60 110 L 90 110 L 90 140 Z" />
        {/* Minaret 1 */}
        <path d="M 120 140 L 120 70 L 125 60 L 130 50 Q 135 42 130 42 Q 125 42 130 50 L 135 60 L 140 70 L 140 140 Z" />
        <circle cx="130" cy="38" r="4" />
        <path d="M 130 30 L 132 35 L 130 34 L 128 35 Z" />
        {/* Dôme central 1 */}
        <path d="M 160 140 L 160 80 Q 200 30 240 80 L 240 140 Z" />
        <rect x="198" y="40" width="4" height="18" />
        <circle cx="200" cy="40" r="3" />
        {/* Bâtiments */}
        <path d="M 260 140 L 260 95 L 290 95 L 290 75 L 320 75 L 320 105 L 340 105 L 340 140 Z" />
        {/* Minaret 2 haut */}
        <path d="M 360 140 L 360 50 L 368 38 L 376 26 Q 380 20 378 20 Q 375 20 380 26 L 388 38 L 396 50 L 396 140 Z" />
        <circle cx="378" cy="16" r="5" />
        <path d="M 378 6 L 381 13 L 378 11 L 375 13 Z" />
        {/* Grande mosquée centrale */}
        <path d="M 420 140 L 420 90 L 430 90 L 430 60 Q 480 10 530 60 L 530 90 L 540 90 L 540 140 Z" />
        <rect x="478" y="20" width="4" height="24" />
        <circle cx="480" cy="18" r="4" />
        <path d="M 478 8 L 482 14 L 480 12 L 478 14 Z" />
        {/* Minaret 3 */}
        <path d="M 560 140 L 560 60 L 568 48 L 576 36 Q 580 30 578 30 Q 575 30 580 36 L 588 48 L 596 60 L 596 140 Z" />
        <circle cx="578" cy="26" r="4" />
        {/* Bâtiments moyens */}
        <path d="M 610 140 L 610 100 L 650 100 L 650 82 L 680 82 L 680 110 L 700 110 L 700 140 Z" />
        {/* Dôme secondaire */}
        <path d="M 720 140 L 720 90 Q 760 46 800 90 L 800 140 Z" />
        <rect x="758" y="56" width="3" height="16" />
        <circle cx="760" cy="56" r="2.5" />
        {/* Bâtiments + minaret 4 */}
        <path d="M 820 140 L 820 95 L 850 95 L 850 115 L 870 115 L 870 140 Z" />
        <path d="M 890 140 L 890 55 L 898 42 L 906 28 Q 910 22 908 22 Q 905 22 910 28 L 918 42 L 926 55 L 926 140 Z" />
        <circle cx="908" cy="18" r="4" />
        {/* Dôme grand droite */}
        <path d="M 950 140 L 950 85 L 962 85 L 962 55 Q 1010 10 1058 55 L 1058 85 L 1070 85 L 1070 140 Z" />
        <rect x="1008" y="20" width="4" height="22" />
        <circle cx="1010" cy="18" r="4" />
        <path d="M 1008 8 L 1012 14 L 1010 12 L 1008 14 Z" />
        {/* Minaret 5 */}
        <path d="M 1100 140 L 1100 45 L 1108 32 L 1116 18 Q 1120 12 1118 12 Q 1115 12 1120 18 L 1128 32 L 1136 45 L 1136 140 Z" />
        <circle cx="1118" cy="8" r="4" />
        {/* Bâtiments droite */}
        <path d="M 1160 140 L 1160 105 L 1200 105 L 1200 85 L 1230 85 L 1230 115 L 1250 115 L 1250 140 Z" />
        {/* Dôme droite */}
        <path d="M 1270 140 L 1270 92 Q 1310 48 1350 92 L 1350 140 Z" />
        <rect x="1308" y="58" width="3" height="16" />
        <circle cx="1310" cy="58" r="2.5" />
        {/* Minaret 6 + fin */}
        <path d="M 1370 140 L 1370 65 L 1378 52 L 1386 38 Q 1390 32 1388 32 Q 1385 32 1390 38 L 1398 52 L 1406 65 L 1406 140 Z" />
        <circle cx="1388" cy="28" r="4" />
        <path d="M 1430 140 L 1430 100 L 1470 100 L 1470 78 L 1500 78 L 1500 110 L 1540 110 L 1540 140 Z" />
        <path d="M 1560 140 L 1560 90 Q 1580 62 1600 90 L 1600 140 Z" />
      </g>

      {/* Ligne de sol dorée fine */}
      <line x1="0" y1="139" x2="1600" y2="139" stroke={GOLD} strokeWidth="0.5" opacity="0.55" />
    </svg>
  );
}

/* ========================================================================
 *  4. Étoile islamique à 8 branches — coin de carte
 * ======================================================================== */
export function IslamicStar({ size = 42 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      aria-hidden
    >
      {/* Étoile à 8 branches = 2 carrés superposés */}
      <g transform="translate(20 20)">
        <rect
          x="-14"
          y="-14"
          width="28"
          height="28"
          fill="none"
          stroke={GOLD}
          strokeWidth="0.8"
          opacity="0.75"
        />
        <rect
          x="-14"
          y="-14"
          width="28"
          height="28"
          fill="none"
          stroke={GOLD}
          strokeWidth="0.8"
          opacity="0.75"
          transform="rotate(45)"
        />
        <circle cx="0" cy="0" r="3" fill="none" stroke={GOLD} strokeWidth="0.8" opacity="0.7" />
        <circle cx="0" cy="0" r="1" fill={GOLD_BRIGHT} />
      </g>
    </svg>
  );
}

/* ========================================================================
 *  5. Arabesque de coin — remplace le simple L
 *  Volute + pointillé + étoile centrale.
 * ======================================================================== */
export function CornerArabesque({ corner = "tl", size = 56 }: { corner?: "tl" | "tr" | "bl" | "br"; size?: number }) {
  const rotations = { tl: 0, tr: 90, br: 180, bl: 270 };
  const rotate = rotations[corner];
  return (
    <svg
      viewBox="0 0 56 56"
      width={size}
      height={size}
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-hidden
    >
      <g fill="none" stroke={GOLD} strokeLinecap="round">
        {/* L structurant */}
        <path
          d="M 4 4 L 4 18 M 4 4 L 18 4"
          strokeWidth="1.3"
          opacity="0.95"
        />
        {/* Volute arabesque */}
        <path
          d="M 4 22 Q 4 34 14 34 Q 22 34 22 26 Q 22 20 16 20 Q 12 20 12 24"
          strokeWidth="0.7"
          opacity="0.55"
        />
        {/* Pointillé décoratif */}
        <circle cx="26" cy="8" r="0.9" fill={GOLD} stroke="none" opacity="0.7" />
        <circle cx="32" cy="8" r="0.7" fill={GOLD} stroke="none" opacity="0.55" />
        <circle cx="38" cy="8" r="0.5" fill={GOLD} stroke="none" opacity="0.4" />
        <circle cx="8" cy="26" r="0.9" fill={GOLD} stroke="none" opacity="0.7" />
        <circle cx="8" cy="32" r="0.7" fill={GOLD} stroke="none" opacity="0.55" />
        <circle cx="8" cy="38" r="0.5" fill={GOLD} stroke="none" opacity="0.4" />
        {/* Mini-étoile */}
        <g transform="translate(20 20)" opacity="0.8">
          <path
            d="M 0 -3 L 0.8 -0.8 L 3 0 L 0.8 0.8 L 0 3 L -0.8 0.8 L -3 0 L -0.8 -0.8 Z"
            fill={GOLD_BRIGHT}
            stroke="none"
          />
        </g>
      </g>
    </svg>
  );
}

/* ========================================================================
 *  6. Fleuron ornemental — séparateur (remplace le losange simple)
 * ======================================================================== */
export function OrnamentalDivider({ width = 180 }: { width?: number }) {
  return (
    <svg
      viewBox="0 0 180 16"
      width={width}
      height="16"
      style={{ overflow: "visible" }}
      aria-hidden
    >
      <defs>
        <linearGradient id="alb-div-left" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={GOLD} stopOpacity="0" />
          <stop offset="100%" stopColor={GOLD} stopOpacity="0.8" />
        </linearGradient>
        <linearGradient id="alb-div-right" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={GOLD} stopOpacity="0.8" />
          <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Ligne gauche */}
      <line x1="0" y1="8" x2="72" y2="8" stroke="url(#alb-div-left)" strokeWidth="0.6" />
      {/* Volute gauche */}
      <path
        d="M 68 8 Q 72 4 76 8 Q 80 12 84 8"
        fill="none"
        stroke={GOLD}
        strokeWidth="0.7"
        opacity="0.8"
      />
      {/* Fleuron central — losange + petits arcs */}
      <g transform="translate(90 8)">
        <path d="M 0 -5 L 5 0 L 0 5 L -5 0 Z" fill={GOLD} />
        <circle cx="-10" cy="0" r="0.9" fill={GOLD} opacity="0.7" />
        <circle cx="10" cy="0" r="0.9" fill={GOLD} opacity="0.7" />
        <path d="M -7 0 Q -5 -2 -3 0" fill="none" stroke={GOLD} strokeWidth="0.6" opacity="0.7" />
        <path d="M 7 0 Q 5 -2 3 0" fill="none" stroke={GOLD} strokeWidth="0.6" opacity="0.7" />
      </g>
      {/* Volute droite (miroir) */}
      <path
        d="M 96 8 Q 100 12 104 8 Q 108 4 112 8"
        fill="none"
        stroke={GOLD}
        strokeWidth="0.7"
        opacity="0.8"
      />
      {/* Ligne droite */}
      <line x1="108" y1="8" x2="180" y2="8" stroke="url(#alb-div-right)" strokeWidth="0.6" />
    </svg>
  );
}

/* ========================================================================
 *  7bis. Label de section — format éditorial avec trait + mini-étoile
 *  Usage : <SectionLabel>CE QUE TU REJOINS</SectionLabel>
 * ======================================================================== */
export function SectionLabel({ children, center = true }: { children: string; center?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: center ? "center" : "flex-start",
        gap: 14,
        margin: "0 0 20px 0",
      }}
    >
      <span
        style={{
          flex: center ? "0 0 48px" : "0",
          height: 0.5,
          background: "linear-gradient(90deg, transparent, rgba(201,160,78,0.6))",
          width: center ? undefined : 0,
        }}
      />
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          background: GOLD,
          transform: "rotate(45deg)",
          flexShrink: 0,
        }}
      />
      <h2
        style={{
          fontSize: 11,
          fontWeight: 600,
          margin: 0,
          letterSpacing: "0.32em",
          color: GOLD,
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          textTransform: "uppercase",
        }}
      >
        {children}
      </h2>
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          background: GOLD,
          transform: "rotate(45deg)",
          flexShrink: 0,
        }}
      />
      <span
        style={{
          flex: center ? "0 0 48px" : "1",
          height: 0.5,
          background: "linear-gradient(90deg, rgba(201,160,78,0.6), transparent)",
        }}
      />
    </div>
  );
}

/* ========================================================================
 *  8bis. Scène "Écosystème Al Baraka"
 *  Reprise de la bannière client : laptop + tablette + icônes sociales,
 *  minarets stylisés en arrière-plan, lune croissant, lanterne.
 *  Silhouette dorée sur fond transparent, lignes de connexion animées.
 *  Pas fixed — s'intègre dans le flux de la page (scrolle avec).
 * ======================================================================== */
export function DigitalEcosystem() {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 720,
        margin: "0 auto",
        position: "relative",
        padding: "0 16px",
        pointerEvents: "none",
      }}
      aria-hidden
    >
      <style>{`
        @keyframes alb-eco-float-a {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes alb-eco-float-b {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-9px); }
        }
        @keyframes alb-eco-float-c {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes alb-eco-pulse {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 1; }
        }
        @keyframes alb-eco-dash {
          to { stroke-dashoffset: -30; }
        }
        @keyframes alb-eco-bar-grow {
          0% { transform: scaleY(0.4); opacity: 0.6; }
          100% { transform: scaleY(1); opacity: 1; }
        }
        .alb-eco-float-a { animation: alb-eco-float-a 5s ease-in-out infinite; }
        .alb-eco-float-b { animation: alb-eco-float-b 6s ease-in-out infinite 0.6s; }
        .alb-eco-float-c { animation: alb-eco-float-c 7s ease-in-out infinite 1.2s; }
        .alb-eco-pulse { animation: alb-eco-pulse 2.4s ease-in-out infinite; }
        .alb-eco-dash-line { stroke-dasharray: 4 4; animation: alb-eco-dash 2s linear infinite; }
        .alb-eco-bar { transform-origin: bottom; animation: alb-eco-bar-grow 1.4s cubic-bezier(0.25, 1.2, 0.5, 1) both; }
      `}</style>

      <svg
        viewBox="0 0 720 280"
        width="100%"
        height="auto"
        style={{ display: "block", overflow: "visible" }}
      >
        <defs>
          <linearGradient id="eco-screen-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(201,160,78,0.18)" />
            <stop offset="100%" stopColor="rgba(201,160,78,0.04)" />
          </linearGradient>
          <linearGradient id="eco-minaret-fade" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={GOLD} stopOpacity="0.35" />
            <stop offset="100%" stopColor={GOLD} stopOpacity="0.05" />
          </linearGradient>
          <radialGradient id="eco-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={GOLD_BRIGHT} stopOpacity="0.7" />
            <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
          </radialGradient>
          <filter id="eco-soft-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ondulation dorée en fond */}
        <path
          d="M 0 210 Q 180 180 360 210 T 720 210"
          fill="none"
          stroke={GOLD}
          strokeWidth="0.6"
          opacity="0.25"
        />
        <path
          d="M 0 228 Q 180 200 360 228 T 720 228"
          fill="none"
          stroke={GOLD}
          strokeWidth="0.4"
          opacity="0.18"
        />

        {/* Minarets stylisés — fond éloigné */}
        <g fill="url(#eco-minaret-fade)" opacity="0.55">
          {/* Minaret gauche */}
          <path d="M 38 250 L 38 130 L 44 118 L 50 106 Q 54 100 52 100 Q 48 100 52 106 L 58 118 L 64 130 L 64 250 Z" />
          <circle cx="51" cy="94" r="3" />
          <path d="M 51 86 L 53 91 L 51 90 L 49 91 Z" />
          {/* Dôme gauche */}
          <path d="M 82 250 L 82 186 Q 115 150 148 186 L 148 250 Z" />
          <rect x="113" y="158" width="3" height="18" />
          <circle cx="114.5" cy="156" r="2.5" />
          {/* Minaret droite */}
          <path d="M 656 250 L 656 140 L 662 128 L 668 116 Q 672 110 670 110 Q 666 110 670 116 L 676 128 L 682 140 L 682 250 Z" />
          <circle cx="669" cy="104" r="3" />
          <path d="M 669 96 L 671 101 L 669 100 L 667 101 Z" />
          {/* Dôme droite */}
          <path d="M 574 250 L 574 180 Q 608 148 642 180 L 642 250 Z" />
          <rect x="606" y="154" width="3" height="18" />
          <circle cx="607.5" cy="152" r="2.5" />
        </g>

        {/* Laptop central (signature de la scène) */}
        <g transform="translate(360 190)" className="alb-eco-float-a">
          {/* Écran */}
          <rect
            x="-85"
            y="-78"
            width="170"
            height="108"
            rx="6"
            fill="rgba(10,10,10,0.85)"
            stroke={GOLD}
            strokeWidth="1.2"
            filter="url(#eco-soft-glow)"
          />
          {/* Ecran intérieur */}
          <rect
            x="-80"
            y="-73"
            width="160"
            height="98"
            rx="3"
            fill="url(#eco-screen-fill)"
            stroke="rgba(201,160,78,0.35)"
            strokeWidth="0.5"
          />

          {/* Dashboard : 4 barres animées */}
          {[
            { x: -60, h: 30 },
            { x: -30, h: 48 },
            { x: 0, h: 36 },
            { x: 30, h: 58 },
          ].map((b, i) => (
            <rect
              key={i}
              x={b.x}
              y={20 - b.h}
              width="18"
              height={b.h}
              fill={GOLD}
              opacity="0.85"
              rx="1"
              className="alb-eco-bar"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}

          {/* Ligne de tendance en hausse */}
          <polyline
            points="-68,-30 -50,-42 -30,-35 -10,-52 15,-45 35,-60 55,-55 72,-65"
            fill="none"
            stroke={GOLD_BRIGHT}
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#eco-soft-glow)"
          />
          {/* Point brillant au bout */}
          <circle cx="72" cy="-65" r="2.5" fill={GOLD_BRIGHT} className="alb-eco-pulse" />

          {/* Base du laptop */}
          <path
            d="M -100 32 L 100 32 L 95 42 L -95 42 Z"
            fill="rgba(10,10,10,0.9)"
            stroke={GOLD}
            strokeWidth="1.2"
          />
          <line x1="-8" y1="36" x2="8" y2="36" stroke={GOLD} strokeWidth="0.6" opacity="0.6" />
        </g>

        {/* Tablette à droite en avant-plan */}
        <g transform="translate(560 200) rotate(-8)" className="alb-eco-float-b">
          <rect
            x="-36"
            y="-52"
            width="72"
            height="104"
            rx="5"
            fill="rgba(10,10,10,0.92)"
            stroke={GOLD}
            strokeWidth="1.1"
            filter="url(#eco-soft-glow)"
          />
          <rect
            x="-32"
            y="-46"
            width="64"
            height="86"
            rx="2"
            fill="url(#eco-screen-fill)"
            stroke="rgba(201,160,78,0.3)"
            strokeWidth="0.4"
          />
          {/* Mini-app : cercles concentriques (formation/progression) */}
          <circle cx="0" cy="-16" r="18" fill="none" stroke={GOLD} strokeWidth="0.8" opacity="0.6" />
          <circle cx="0" cy="-16" r="12" fill="none" stroke={GOLD} strokeWidth="0.8" opacity="0.8" />
          <circle cx="0" cy="-16" r="6" fill={GOLD} opacity="0.9" />
          {/* Lignes texte en bas */}
          <line x1="-22" y1="14" x2="22" y2="14" stroke={GOLD} strokeWidth="0.5" opacity="0.55" />
          <line x1="-22" y1="22" x2="14" y2="22" stroke={GOLD} strokeWidth="0.5" opacity="0.45" />
          <line x1="-22" y1="30" x2="18" y2="30" stroke={GOLD} strokeWidth="0.5" opacity="0.45" />
          {/* Bouton home */}
          <circle cx="0" cy="46" r="3" fill="none" stroke={GOLD} strokeWidth="0.6" opacity="0.7" />
        </g>

        {/* Téléphone / petit écran à gauche */}
        <g transform="translate(180 210) rotate(6)" className="alb-eco-float-c">
          <rect
            x="-22"
            y="-42"
            width="44"
            height="84"
            rx="5"
            fill="rgba(10,10,10,0.92)"
            stroke={GOLD}
            strokeWidth="1"
            filter="url(#eco-soft-glow)"
          />
          <rect
            x="-19"
            y="-37"
            width="38"
            height="68"
            rx="2"
            fill="url(#eco-screen-fill)"
            stroke="rgba(201,160,78,0.25)"
            strokeWidth="0.4"
          />
          {/* Icônes grid */}
          {[
            [-10, -26],
            [0, -26],
            [10, -26],
            [-10, -14],
            [0, -14],
            [10, -14],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="2.5" fill={GOLD} opacity="0.7" />
          ))}
          <line x1="-14" y1="0" x2="14" y2="0" stroke={GOLD} strokeWidth="0.5" opacity="0.5" />
          <line x1="-14" y1="8" x2="10" y2="8" stroke={GOLD} strokeWidth="0.5" opacity="0.4" />
          <line x1="-14" y1="16" x2="12" y2="16" stroke={GOLD} strokeWidth="0.5" opacity="0.4" />
          {/* Bouton home */}
          <circle cx="0" cy="36" r="2" fill="none" stroke={GOLD} strokeWidth="0.5" opacity="0.7" />
        </g>

        {/* Icônes sociales flottantes autour du laptop, reliées par des lignes */}
        {/* Instagram */}
        <g transform="translate(230 70)" className="alb-eco-float-a">
          <circle cx="0" cy="0" r="16" fill="rgba(10,10,10,0.85)" stroke={GOLD} strokeWidth="1" filter="url(#eco-soft-glow)" />
          <rect x="-7" y="-7" width="14" height="14" rx="3" fill="none" stroke={GOLD} strokeWidth="1.2" />
          <circle cx="0" cy="0" r="3.5" fill="none" stroke={GOLD} strokeWidth="1.2" />
          <circle cx="4.5" cy="-4.5" r="0.9" fill={GOLD} />
        </g>
        <line x1="245" y1="82" x2="300" y2="140" stroke={GOLD} strokeWidth="0.5" opacity="0.4" className="alb-eco-dash-line" />

        {/* Facebook/f */}
        <g transform="translate(320 40)" className="alb-eco-float-b">
          <circle cx="0" cy="0" r="14" fill="rgba(10,10,10,0.85)" stroke={GOLD} strokeWidth="1" filter="url(#eco-soft-glow)" />
          <path
            d="M 2 -7 L 2 -4 L 5 -4 M 2 -4 L 2 8 M -2 -1 L 5 -1"
            fill="none"
            stroke={GOLD}
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
        <line x1="320" y1="55" x2="330" y2="110" stroke={GOLD} strokeWidth="0.5" opacity="0.4" className="alb-eco-dash-line" />

        {/* YouTube (triangle play) */}
        <g transform="translate(400 40)" className="alb-eco-float-c">
          <rect x="-15" y="-10" width="30" height="20" rx="5" fill="rgba(10,10,10,0.85)" stroke={GOLD} strokeWidth="1" filter="url(#eco-soft-glow)" />
          <path d="M -3 -5 L 6 0 L -3 5 Z" fill={GOLD} />
        </g>
        <line x1="400" y1="55" x2="395" y2="110" stroke={GOLD} strokeWidth="0.5" opacity="0.4" className="alb-eco-dash-line" />

        {/* WhatsApp */}
        <g transform="translate(480 70)" className="alb-eco-float-a">
          <circle cx="0" cy="0" r="15" fill="rgba(10,10,10,0.85)" stroke={GOLD} strokeWidth="1" filter="url(#eco-soft-glow)" />
          <path
            d="M -5 5 Q -6 -4 -2 -6 Q 4 -7 6 -2 Q 7 2 3 4 L 4 7 L -2 6 Q -5 6 -5 5 Z"
            fill="none"
            stroke={GOLD}
            strokeWidth="1.1"
            strokeLinejoin="round"
          />
        </g>
        <line x1="465" y1="82" x2="420" y2="140" stroke={GOLD} strokeWidth="0.5" opacity="0.4" className="alb-eco-dash-line" />

        {/* Croissant de lune en haut droite */}
        <g transform="translate(640 50)" className="alb-eco-float-b">
          <path
            d="M 12 -4 A 15 15 0 1 0 12 26 A 12 12 0 1 1 12 -4 Z"
            fill="none"
            stroke={GOLD}
            strokeWidth="1"
            opacity="0.85"
            filter="url(#eco-soft-glow)"
          />
          <path
            d="M -6 8 L -5 10 L -3 10 L -4 12 L -3 14 L -6 13 L -9 14 L -8 12 L -9 10 L -7 10 Z"
            fill={GOLD_BRIGHT}
          />
        </g>

        {/* Lanterne à gauche */}
        <g transform="translate(80 90)" className="alb-eco-float-c">
          <line x1="0" y1="-20" x2="0" y2="-12" stroke={GOLD} strokeWidth="0.8" />
          <path
            d="M -8 -12 L 8 -12 L 10 -8 L -10 -8 Z"
            fill="rgba(10,10,10,0.85)"
            stroke={GOLD}
            strokeWidth="0.9"
          />
          <path
            d="M -10 -8 L -10 10 Q -10 16 -4 16 L 4 16 Q 10 16 10 10 L 10 -8 Z"
            fill="rgba(201,160,78,0.15)"
            stroke={GOLD}
            strokeWidth="1"
          />
          <circle cx="0" cy="4" r="3" fill={GOLD_BRIGHT} className="alb-eco-pulse" filter="url(#eco-soft-glow)" />
          <line x1="-10" y1="0" x2="10" y2="0" stroke={GOLD} strokeWidth="0.5" opacity="0.5" />
          <path
            d="M -4 16 L -4 22 L 4 22 L 4 16"
            fill="none"
            stroke={GOLD}
            strokeWidth="0.7"
          />
        </g>

        {/* Étoiles scintillantes d'ambiance */}
        {[
          { x: 120, y: 45, r: 1.2 },
          { x: 160, y: 90, r: 0.8 },
          { x: 540, y: 40, r: 1 },
          { x: 270, y: 100, r: 0.7 },
          { x: 430, y: 110, r: 0.9 },
          { x: 360, y: 70, r: 1 },
        ].map((s, i) => (
          <circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={s.r}
            fill={GOLD_BRIGHT}
            className="alb-eco-pulse"
            style={{ animationDelay: `${i * 0.4}s` }}
          />
        ))}
      </svg>
    </div>
  );
}

/* ========================================================================
 *  9. Constellation manuscrite — champ d'étoiles avec lignes
 *  Remplace les particules génériques par des vraies étoiles liées.
 * ======================================================================== */
export function Constellation() {
  // Positions fixes qui dessinent vaguement "AB" stylisé + étoiles filantes
  const stars = [
    // Amas gauche
    { x: 12, y: 18, r: 1.6, bright: true },
    { x: 18, y: 24, r: 1 },
    { x: 8, y: 28, r: 0.8 },
    { x: 15, y: 32, r: 1.2 },
    // Amas droite
    { x: 82, y: 14, r: 1.4, bright: true },
    { x: 88, y: 22, r: 0.9 },
    { x: 76, y: 28, r: 1 },
    { x: 92, y: 34, r: 0.7 },
    // Amas bas
    { x: 20, y: 75, r: 1 },
    { x: 30, y: 82, r: 0.7 },
    { x: 68, y: 78, r: 1.3, bright: true },
    { x: 82, y: 85, r: 0.8 },
    // Amas milieu haut
    { x: 48, y: 8, r: 0.9 },
    { x: 52, y: 12, r: 0.6 },
  ];
  const lines: Array<[number, number]> = [
    [0, 1],
    [1, 2],
    [1, 3],
    [4, 5],
    [4, 6],
    [6, 7],
    [8, 9],
    [10, 11],
  ];

  return (
    <>
      <style>{`
        @keyframes alb-star-breath {
          0%, 100% { opacity: var(--op, 0.6); transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
        }
        .alb-star-bright { animation: alb-star-breath 4s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }
      `}</style>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 0,
          opacity: 0.55,
        }}
        aria-hidden
      >
        {/* Lignes de constellation */}
        {lines.map(([a, b], i) => (
          <line
            key={i}
            x1={stars[a].x}
            y1={stars[a].y}
            x2={stars[b].x}
            y2={stars[b].y}
            stroke={GOLD}
            strokeWidth="0.08"
            opacity="0.35"
          />
        ))}
        {/* Étoiles */}
        {stars.map((s, i) => (
          <circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={s.r / 4}
            fill={s.bright ? GOLD_BRIGHT : GOLD}
            className={s.bright ? "alb-star-bright" : ""}
            style={{ animationDelay: `${i * 0.4}s`, filter: s.bright ? "drop-shadow(0 0 0.4px rgba(201,160,78,0.8))" : "none" }}
          />
        ))}
      </svg>
    </>
  );
}
