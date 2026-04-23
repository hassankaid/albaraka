/**
 * Hero cinematic pour les pages checkout/merci Al Baraka.
 * - Logo Al Baraka (image) dans un cadre avec halo doré qui respire
 * - Titre XL en Cormorant Garamond, lettres très espacées
 * - Sous-titre "ÉCOSYSTÈME BY ETHICARENA" en tracking large
 * - Ornement doré (deux lignes + losange central) pour cadrer
 */
import logo from "@/assets/al-baraka-logo-v2.png";

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
  const logoSize = compact ? 84 : 108;
  const titleSize = compact ? "clamp(32px, 6vw, 44px)" : "clamp(36px, 7vw, 54px)";

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
              0 0 0 1px rgba(201,160,78,0.35),
              0 0 40px rgba(201,160,78,0.25),
              0 0 80px rgba(201,160,78,0.15);
          }
          50% {
            box-shadow:
              0 0 0 1px rgba(201,160,78,0.55),
              0 0 60px rgba(201,160,78,0.45),
              0 0 120px rgba(201,160,78,0.25);
          }
        }
        @keyframes alb-eyebrow-slide {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes alb-title-fade {
          from { opacity: 0; transform: translateY(8px); letter-spacing: 0.4em; }
          to { opacity: 1; transform: translateY(0); letter-spacing: 0.18em; }
        }
      `}</style>

      {/* Logo dans un cadre rond avec halo qui respire */}
      <div
        style={{
          width: logoSize,
          height: logoSize,
          margin: "0 auto 24px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(201,160,78,0.08) 0%, rgba(10,10,10,0.9) 70%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          animation: "alb-logo-halo 5s ease-in-out infinite",
          position: "relative",
        }}
      >
        <img
          src={logo}
          alt="Al Baraka"
          style={{
            width: logoSize - 14,
            height: logoSize - 14,
            objectFit: "contain",
            filter: "drop-shadow(0 0 8px rgba(201,160,78,0.4))",
          }}
        />
      </div>

      {/* Eyebrow */}
      {eyebrow && (
        <div
          style={{
            fontSize: 11,
            color: GOLD,
            letterSpacing: "0.4em",
            marginBottom: 16,
            fontWeight: 500,
            animation: "alb-eyebrow-slide 0.8s ease-out",
          }}
        >
          — {eyebrow} —
        </div>
      )}

      {/* Titre principal en Cormorant Garamond */}
      <h1
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: titleSize,
          fontWeight: 500,
          color: CREAM,
          margin: 0,
          letterSpacing: "0.18em",
          lineHeight: 1.1,
          textShadow: "0 2px 24px rgba(201,160,78,0.25)",
          animation: "alb-title-fade 1.1s ease-out",
        }}
      >
        {title}
      </h1>

      {/* Sous-titre fin en tracking large */}
      {subtitle && (
        <div
          style={{
            fontSize: 10,
            color: GOLD,
            letterSpacing: "0.38em",
            marginTop: 14,
            fontWeight: 500,
          }}
        >
          {subtitle}
        </div>
      )}

      {/* Ornement : deux lignes dorées + losange central */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          marginTop: 26,
        }}
      >
        <div
          style={{
            width: 80,
            height: 1,
            background:
              "linear-gradient(90deg, transparent 0%, rgba(201,160,78,0.7) 100%)",
          }}
        />
        <svg width="9" height="9" viewBox="0 0 8 8" style={{ flexShrink: 0 }}>
          <path d="M4 0L8 4L4 8L0 4Z" fill={GOLD} />
        </svg>
        <div
          style={{
            width: 80,
            height: 1,
            background:
              "linear-gradient(90deg, rgba(201,160,78,0.7) 0%, transparent 100%)",
          }}
        />
      </div>
    </div>
  );
}
