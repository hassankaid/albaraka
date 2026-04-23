/**
 * Hero cinematic Al Baraka — direction "manuscrit céleste islamique".
 * Le logo tient le cœur, cerclé par un globe orbital animé (3 orbites elliptiques
 * qui tournent), drapé d'un halo pulsant. Titre en Cormorant Garamond XL avec
 * text-shadow multi-couche. Ornement bas remplacé par un fleuron.
 */
import logo from "@/assets/al-baraka-logo-v2.png";
import { OrbitalGlobe, OrnamentalDivider } from "./CheckoutOrnaments";

const GOLD = "#C9A04E";
const CREAM = "#F5F1E6";

interface CheckoutHeroProps {
  title: string;
  /** Petite accroche optionnelle au-dessus du titre (ex. "FÉLICITATIONS") */
  eyebrow?: string;
  /** Sous-titre optionnel sous le titre */
  subtitle?: string;
  /** Réduire la taille (pour la page merci qui a déjà beaucoup de contenu) */
  compact?: boolean;
}

export default function CheckoutHero({
  title,
  eyebrow,
  subtitle,
  compact = false,
}: CheckoutHeroProps) {
  const logoSize = compact ? 88 : 112;
  const orbSize = compact ? 200 : 240;
  const titleSize = compact ? "clamp(32px, 6vw, 46px)" : "clamp(38px, 7.5vw, 58px)";

  return (
    <div
      style={{
        textAlign: "center",
        marginBottom: compact ? "2rem" : "3rem",
        position: "relative",
        zIndex: 2,
      }}
    >
      <style>{`
        @keyframes alb-logo-halo {
          0%, 100% {
            box-shadow:
              0 0 0 1px rgba(201,160,78,0.45),
              0 0 40px rgba(201,160,78,0.28),
              0 0 90px rgba(201,160,78,0.16);
          }
          50% {
            box-shadow:
              0 0 0 1px rgba(201,160,78,0.7),
              0 0 60px rgba(201,160,78,0.5),
              0 0 140px rgba(201,160,78,0.28);
          }
        }
        @keyframes alb-halo-rotate {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes alb-stagger-in {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes alb-title-reveal {
          from {
            opacity: 0;
            transform: translateY(10px);
            letter-spacing: 0.55em;
          }
          to {
            opacity: 1;
            transform: translateY(0);
            letter-spacing: 0.2em;
          }
        }
        @keyframes alb-scale-in {
          from { opacity: 0; transform: scale(0.6); }
          to { opacity: 1; transform: scale(1); }
        }
        .alb-eyebrow { animation: alb-stagger-in 0.9s ease-out 0.1s both; }
        .alb-title { animation: alb-title-reveal 1.3s cubic-bezier(0.2, 0.8, 0.3, 1) 0.2s both; }
        .alb-subtitle { animation: alb-stagger-in 0.9s ease-out 0.7s both; }
        .alb-divider { animation: alb-stagger-in 0.9s ease-out 0.9s both; }
        .alb-logo-wrap { animation: alb-scale-in 1.1s cubic-bezier(0.3, 1.6, 0.5, 1) 0s both; }
      `}</style>

      {/* Bloc logo + orbites — wrapper qui sert à caler l'orbital globe */}
      <div
        className="alb-logo-wrap"
        style={{
          width: orbSize,
          height: orbSize,
          margin: "0 auto 28px",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Orbites animées (signature) */}
        <OrbitalGlobe size={orbSize} />

        {/* Halo tournant très lent derrière le logo */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: logoSize + 20,
            height: logoSize + 20,
            borderRadius: "50%",
            background:
              "conic-gradient(from 0deg, transparent 0%, rgba(201,160,78,0.18) 30%, transparent 55%, rgba(201,160,78,0.10) 80%, transparent 100%)",
            filter: "blur(6px)",
            animation: "alb-halo-rotate 18s linear infinite",
            transform: "translate(-50%, -50%)",
          }}
        />

        {/* Cercle contenant le logo */}
        <div
          style={{
            width: logoSize,
            height: logoSize,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(201,160,78,0.12) 0%, rgba(10,10,10,0.95) 70%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "alb-logo-halo 5s ease-in-out infinite",
            position: "relative",
            zIndex: 2,
          }}
        >
          <img
            src={logo}
            alt="Al Baraka"
            style={{
              width: logoSize - 14,
              height: logoSize - 14,
              objectFit: "contain",
              filter:
                "drop-shadow(0 0 10px rgba(201,160,78,0.5)) drop-shadow(0 0 2px rgba(228,197,122,0.6))",
            }}
          />
        </div>
      </div>

      {/* Eyebrow */}
      {eyebrow && (
        <div
          className="alb-eyebrow"
          style={{
            fontSize: 11,
            color: GOLD,
            letterSpacing: "0.45em",
            marginBottom: 18,
            fontWeight: 500,
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span
            style={{
              width: 20,
              height: 1,
              background: GOLD,
              opacity: 0.7,
              display: "inline-block",
            }}
          />
          {eyebrow}
          <span
            style={{
              width: 20,
              height: 1,
              background: GOLD,
              opacity: 0.7,
              display: "inline-block",
            }}
          />
        </div>
      )}

      {/* Titre principal en Cormorant Garamond — text-shadow multi-couche pour l'effet cinematic */}
      <h1
        className="alb-title"
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: titleSize,
          fontWeight: 500,
          color: CREAM,
          margin: 0,
          letterSpacing: "0.2em",
          lineHeight: 1.05,
          textShadow: `
            0 0 1px rgba(245,241,230,0.5),
            0 2px 24px rgba(201,160,78,0.35),
            0 4px 48px rgba(201,160,78,0.15)
          `,
        }}
      >
        {title}
      </h1>

      {/* Sous-titre fin en tracking large */}
      {subtitle && (
        <div
          className="alb-subtitle"
          style={{
            fontSize: 10,
            color: GOLD,
            letterSpacing: "0.42em",
            marginTop: 16,
            fontWeight: 500,
          }}
        >
          {subtitle}
        </div>
      )}

      {/* Fleuron ornemental */}
      <div
        className="alb-divider"
        style={{
          marginTop: 28,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <OrnamentalDivider width={200} />
      </div>
    </div>
  );
}
