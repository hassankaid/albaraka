// Fond premium du module « tunnels » — « nuit dorée Al Baraka ».
// Full-bleed (position fixed) : il couvre le viewport pendant que la landing
// défile par-dessus. Or diffus + voile d'étoiles, jamais assez fort pour gêner
// la lecture du texte. Autonome (aucune dépendance), aria-hidden.
import { T } from "../theme";

// Étoiles réparties sur toute la largeur mais discrètes (le contenu passe
// au-dessus). Positions stables.
const STARS = [
  { x: 6, y: 8, s: 1.3, b: true, d: 3.6, dl: -0.4 },
  { x: 14, y: 22, s: 0.9, b: false, d: 5.0, dl: -1.8 },
  { x: 9, y: 41, s: 1.1, b: false, d: 4.6, dl: -2.6 },
  { x: 18, y: 63, s: 1.5, b: true, d: 3.3, dl: -1.1 },
  { x: 7, y: 82, s: 1.0, b: false, d: 5.2, dl: -0.7 },
  { x: 12, y: 93, s: 0.9, b: false, d: 4.8, dl: -3.0 },
  { x: 50, y: 5, s: 1.0, b: false, d: 4.9, dl: -2.1 },
  { x: 47, y: 97, s: 1.2, b: false, d: 4.3, dl: -1.4 },
  { x: 82, y: 10, s: 1.4, b: true, d: 3.4, dl: -0.9 },
  { x: 90, y: 27, s: 1.0, b: false, d: 5.1, dl: -2.9 },
  { x: 86, y: 46, s: 1.2, b: false, d: 4.5, dl: -1.6 },
  { x: 94, y: 66, s: 1.6, b: true, d: 3.2, dl: -2.3 },
  { x: 88, y: 84, s: 0.9, b: false, d: 5.4, dl: -0.5 },
  { x: 83, y: 95, s: 1.0, b: false, d: 4.7, dl: -1.9 },
];

export default function TunnelBackground() {
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
        zIndex: 0,
      }}
    >
      <style>{`
        @keyframes albt-star-soft   { 0%,100%{opacity:.25} 50%{opacity:.75} }
        @keyframes albt-star-bright { 0%,100%{opacity:.5;transform:scale(1)} 50%{opacity:1;transform:scale(1.3)} }
        @keyframes albt-neb-a { 0%,100%{opacity:.5;transform:translate(0,0) scale(1)} 50%{opacity:.8;transform:translate(16px,-10px) scale(1.08)} }
        @keyframes albt-neb-b { 0%,100%{opacity:.42;transform:translate(0,0) scale(1)} 50%{opacity:.7;transform:translate(-14px,12px) scale(1.1)} }
        @keyframes albt-neb-c { 0%,100%{opacity:.4;transform:translate(0,0) scale(1)} 50%{opacity:.68;transform:translate(12px,14px) scale(1.09)} }
      `}</style>

      {/* Base : dégradé chaud near-black + halos dorés ancrés en haut et sur les flancs */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `
            radial-gradient(ellipse 70% 50% at 50% -6%, rgba(201,160,78,0.16) 0%, transparent 60%),
            radial-gradient(ellipse 50% 40% at 0% 22%, rgba(201,160,78,0.10) 0%, transparent 58%),
            radial-gradient(ellipse 50% 40% at 100% 30%, rgba(201,160,78,0.09) 0%, transparent 58%),
            radial-gradient(ellipse 80% 50% at 50% 108%, rgba(201,160,78,0.10) 0%, transparent 60%),
            linear-gradient(180deg, ${T.bgDeep} 0%, ${T.bg} 42%, #050403 100%)
          `,
        }}
      />

      {/* Nébuleuses dorées floues (respiration lente) */}
      <div style={{ position: "absolute", top: "-12%", left: "-8%", width: "min(560px,52vw)", height: "min(520px,52vw)", background: "radial-gradient(circle, rgba(228,197,122,0.18) 0%, rgba(201,160,78,0.06) 38%, transparent 68%)", filter: "blur(120px)", animation: "albt-neb-a 74s ease-in-out infinite", mixBlendMode: "screen", willChange: "transform,opacity" }} />
      <div style={{ position: "absolute", top: "18%", right: "-12%", width: "min(520px,48vw)", height: "min(480px,48vw)", background: "radial-gradient(circle, rgba(228,197,122,0.15) 0%, rgba(201,160,78,0.05) 40%, transparent 70%)", filter: "blur(125px)", animation: "albt-neb-b 86s ease-in-out infinite", mixBlendMode: "screen", willChange: "transform,opacity" }} />
      <div style={{ position: "absolute", bottom: "-14%", left: "20%", width: "min(600px,60vw)", height: "min(420px,44vw)", background: "radial-gradient(circle, rgba(201,160,78,0.12) 0%, rgba(201,160,78,0.04) 42%, transparent 72%)", filter: "blur(130px)", animation: "albt-neb-c 92s ease-in-out infinite", mixBlendMode: "screen", willChange: "transform,opacity" }} />

      {/* Voile d'étoiles */}
      {STARS.map((s, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.s}px`,
            height: `${s.s}px`,
            borderRadius: "50%",
            background: s.b ? T.goldBright : T.gold,
            boxShadow: s.b
              ? `0 0 ${3 + s.s * 2}px rgba(228,197,122,0.8), 0 0 ${6 + s.s * 3}px rgba(201,160,78,0.3)`
              : `0 0 ${2 + s.s}px rgba(201,160,78,0.5)`,
            animation: `albt-star-${s.b ? "bright" : "soft"} ${s.d}s ease-in-out infinite`,
            animationDelay: `${s.dl}s`,
          }}
        />
      ))}

      {/* Liseré doré en haut */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: "linear-gradient(90deg, transparent, rgba(201,160,78,0.5) 50%, transparent)" }} />

      {/* Grain léger pour casser les aplats (texture premium) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.5,
          mixBlendMode: "overlay",
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.35'/></svg>\")",
        }}
      />
    </div>
  );
}
