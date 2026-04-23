import { useSearchParams } from "react-router-dom";
import logo from "@/assets/al-baraka-logo-v2.png";
import { Mail, KeyRound, Users, Compass, CheckCircle2 } from "lucide-react";

const THEME = {
  bg: "#0A0A0A",
  gold: "#C9A04E",
  goldBright: "#E4C57A",
  goldDim: "rgba(201,160,78,0.18)",
  goldLine: "rgba(201,160,78,0.28)",
  cream: "#F5F1E6",
  creamMuted: "rgba(245,241,230,0.62)",
  creamDim: "rgba(245,241,230,0.38)",
};

const STEPS = [
  {
    Icon: Mail,
    title: "Consulte ta boîte mail",
    body: "Un email avec ta facture et ton lien d'accès t'a été envoyé. Vérifie aussi tes spams.",
  },
  {
    Icon: KeyRound,
    title: "Définis ton mot de passe",
    body: "Clique sur le lien de l'email pour créer ton accès personnel à la plateforme.",
  },
  {
    Icon: Users,
    title: "Rejoins la communauté",
    body: "À ta première connexion, une étape te proposera de rejoindre notre Discord privé.",
  },
  {
    Icon: Compass,
    title: "Découvre ton parcours",
    body: "La plateforme te guidera pas à pas dans ton écosystème Al Baraka.",
  },
];

export default function MerciPage() {
  const [searchParams] = useSearchParams();
  const ref = searchParams.get("payment_intent") || searchParams.get("session_id");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: THEME.bg,
        color: THEME.cream,
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: "4rem 1.25rem 3rem",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes alb-fade-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes alb-check-pop {
          0% { transform: scale(0.5); opacity: 0; }
          60% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes alb-ring-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(201,160,78,0.55); }
          50% { box-shadow: 0 0 0 20px rgba(201,160,78,0); }
        }

        .alb-fade { animation: alb-fade-up 0.7s ease-out both; }
        .alb-fade-2 { animation: alb-fade-up 0.7s ease-out 0.15s both; }
        .alb-fade-3 { animation: alb-fade-up 0.7s ease-out 0.3s both; }

        .alb-page-bg {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(ellipse 70% 45% at 50% 0%, rgba(201,160,78,0.13) 0%, rgba(201,160,78,0.04) 35%, transparent 70%),
            radial-gradient(ellipse 50% 30% at 50% 18%, rgba(228,197,122,0.06) 0%, transparent 60%);
        }

        .alb-title-gradient {
          background: linear-gradient(180deg, #F5F1E6 0%, #E4C57A 50%, #C9A04E 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
        }

        .alb-step {
          display: flex;
          gap: 14px;
          padding: 16px 16px;
          border: 1px solid ${THEME.goldDim};
          border-radius: 12px;
          background: linear-gradient(180deg, rgba(201,160,78,0.03) 0%, rgba(201,160,78,0.01) 100%);
          transition: border-color 0.2s, background 0.2s, transform 0.2s, box-shadow 0.2s;
        }
        .alb-step:hover {
          border-color: ${THEME.goldLine};
          background: linear-gradient(180deg, rgba(201,160,78,0.06) 0%, rgba(201,160,78,0.02) 100%);
          transform: translateY(-1px);
          box-shadow: 0 0 24px rgba(201,160,78,0.08);
        }
      `}</style>
      <div className="alb-page-bg" aria-hidden />

      <div style={{ maxWidth: 440, margin: "0 auto", position: "relative", zIndex: 2 }}>
        {/* Header logo + halo */}
        <div className="alb-fade" style={{ textAlign: "center", marginBottom: 36, position: "relative" }}>
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: -20,
              left: "50%",
              transform: "translateX(-50%)",
              width: 260,
              height: 260,
              background: "radial-gradient(circle, rgba(201,160,78,0.14) 0%, transparent 60%)",
              filter: "blur(20px)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              width: 72,
              height: 72,
              margin: "0 auto 22px",
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(201,160,78,0.12) 0%, rgba(10,10,10,0.9) 72%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <img
              src={logo}
              alt="Al Baraka"
              style={{
                width: 58,
                height: 58,
                objectFit: "contain",
                filter: "drop-shadow(0 0 10px rgba(201,160,78,0.4))",
              }}
            />
          </div>
        </div>

        {/* Cercle de validation — signature de la page merci */}
        <div className="alb-fade-2" style={{ textAlign: "center", marginBottom: 30 }}>
          <div
            style={{
              width: 96,
              height: 96,
              margin: "0 auto 24px",
              border: `1px solid ${THEME.gold}`,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              background:
                "radial-gradient(circle, rgba(201,160,78,0.15) 0%, rgba(10,10,10,0.3) 70%)",
              animation: "alb-ring-pulse 2.6s ease-in-out infinite",
            }}
          >
            <CheckCircle2
              size={48}
              strokeWidth={1.4}
              style={{
                color: THEME.gold,
                animation: "alb-check-pop 0.9s ease-out",
                filter: "drop-shadow(0 0 10px rgba(201,160,78,0.5))",
              }}
            />
          </div>

          <h1
            className="alb-title-gradient"
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: "clamp(34px, 6vw, 42px)",
              fontWeight: 500,
              margin: "0 0 14px 0",
              letterSpacing: "0.1em",
              lineHeight: 1.1,
              filter: "drop-shadow(0 2px 14px rgba(201,160,78,0.35))",
            }}
          >
            Al Hamdoulilah
          </h1>

          <p
            style={{
              color: THEME.creamMuted,
              fontSize: 15,
              margin: "0 auto",
              maxWidth: 380,
              lineHeight: 1.6,
            }}
          >
            Félicitations pour ce choix courageux. Tu fais désormais partie de la famille Al Baraka.
          </p>
        </div>

        {/* Email d'accès */}
        <div
          className="alb-fade-3"
          style={{
            padding: "18px 20px",
            border: `1px solid ${THEME.gold}`,
            borderRadius: 12,
            background:
              "linear-gradient(180deg, rgba(201,160,78,0.08) 0%, rgba(201,160,78,0.02) 100%)",
            display: "flex",
            gap: 14,
            alignItems: "center",
            marginBottom: 28,
          }}
        >
          <div
            style={{
              flexShrink: 0,
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "rgba(201,160,78,0.15)",
              border: `1px solid ${THEME.gold}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: THEME.gold,
            }}
          >
            <Mail size={18} strokeWidth={1.5} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13.5,
                fontWeight: 600,
                color: THEME.cream,
                marginBottom: 3,
              }}
            >
              Ton accès arrive par email
            </div>
            <div style={{ fontSize: 12.5, color: THEME.creamMuted, lineHeight: 1.5 }}>
              Facture + lien pour définir ton mot de passe.
            </div>
          </div>
        </div>

        {/* Étapes */}
        <div className="alb-fade-3" style={{ marginBottom: 36 }}>
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 600,
              letterSpacing: "0.22em",
              color: THEME.gold,
              textTransform: "uppercase",
              marginBottom: 16,
              textAlign: "center",
            }}
          >
            Tes prochaines étapes
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {STEPS.map((s, i) => (
              <div key={i} className="alb-step">
                <div
                  style={{
                    flexShrink: 0,
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    background: "rgba(201,160,78,0.08)",
                    border: `1px solid ${THEME.goldLine}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: THEME.gold,
                    position: "relative",
                  }}
                >
                  <s.Icon size={16} strokeWidth={1.5} />
                  <span
                    style={{
                      position: "absolute",
                      top: -5,
                      right: -5,
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      background: THEME.bg,
                      border: `1px solid ${THEME.gold}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 9.5,
                      fontWeight: 600,
                      color: THEME.gold,
                      fontFamily: "'Cormorant Garamond', Georgia, serif",
                    }}
                  >
                    {i + 1}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: THEME.cream,
                      marginBottom: 3,
                    }}
                  >
                    {s.title}
                  </div>
                  <div style={{ fontSize: 12.5, color: THEME.creamMuted, lineHeight: 1.55 }}>
                    {s.body}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Baraka + réf */}
        <div
          className="alb-fade-3"
          style={{
            textAlign: "center",
            paddingTop: 16,
            borderTop: `1px solid ${THEME.goldDim}`,
          }}
        >
          <div
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 14,
              color: THEME.creamMuted,
              fontStyle: "italic",
              letterSpacing: 0.5,
            }}
          >
            Qu'Allah facilite ton parcours, inshaAllah.
          </div>
          {ref && (
            <div
              style={{
                marginTop: 14,
                fontSize: 10,
                color: THEME.creamDim,
                fontFamily: "monospace",
                letterSpacing: 0.3,
              }}
            >
              Réf. {ref.slice(-12)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
