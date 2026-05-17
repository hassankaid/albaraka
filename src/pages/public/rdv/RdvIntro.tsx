// RdvIntro — Page 1 du funnel /rdv.
// Affiche l'intro et le CTA "Commencer le questionnaire (durée 20 secondes)".
// Au clic → /rdv/coordonnees.
//
// Important : on RESET le lead_id en sessionStorage à l'arrivée sur /rdv
// pour permettre à un user de refaire un funnel complet depuis le début
// (utile si on partage /rdv plusieurs fois sur le même appareil).

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/al-baraka-logo-v2.png";
import { THEME, clearStoredLeadId } from "./rdvShared";

export default function RdvIntro() {
  const navigate = useNavigate();

  useEffect(() => {
    // Nouveau parcours = on repart de zéro.
    clearStoredLeadId();
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: THEME.bg,
        color: THEME.cream,
        position: "relative",
        overflow: "hidden",
        fontFamily:
          '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      {/* Halo doré statique en fond */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at center, rgba(201,160,78,0.14) 0%, rgba(10,9,8,0) 60%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          textAlign: "center",
          maxWidth: 560,
          animation: "rdv-fade-in 0.5s ease-out",
        }}
      >
        <img
          src={logo}
          alt="AL BARAKA"
          style={{
            width: 92,
            height: 92,
            objectFit: "contain",
            marginBottom: 28,
            marginInline: "auto",
            display: "block",
            filter: "drop-shadow(0 0 30px rgba(201,160,78,0.32))",
          }}
        />

        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: THEME.gold,
            marginBottom: 14,
          }}
        >
          Étape préalable
        </div>

        <h1
          style={{
            fontSize: 30,
            fontWeight: 600,
            color: THEME.cream,
            margin: 0,
            marginBottom: 22,
            lineHeight: 1.25,
          }}
        >
          Avant de réserver, quelques questions.
        </h1>

        <p
          style={{
            color: THEME.creamMuted,
            fontSize: 15,
            lineHeight: 1.65,
            margin: 0,
            marginBottom: 38,
            maxWidth: 480,
            marginInline: "auto",
          }}
        >
          Nous cherchons sincèrement à vous aider à devenir libre, mais pour ce
          faire nous avons besoin de votre sérieux afin de vous emmener jusqu'au
          résultat. Je vous laisse répondre à ces quelques questions avant le
          rendez-vous.
        </p>

        <button
          type="button"
          onClick={() => navigate("/rdv/coordonnees")}
          style={{
            background: `linear-gradient(180deg, ${THEME.goldBright} 0%, ${THEME.gold} 100%)`,
            color: "#1A1407",
            fontWeight: 600,
            fontSize: 15,
            padding: "14px 32px",
            borderRadius: 999,
            border: "none",
            cursor: "pointer",
            boxShadow:
              "0 8px 30px rgba(201,160,78,0.32), inset 0 1px 0 rgba(255,255,255,0.25)",
            transition: "transform 120ms ease, box-shadow 120ms ease",
            letterSpacing: "0.01em",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow =
              "0 12px 36px rgba(201,160,78,0.42), inset 0 1px 0 rgba(255,255,255,0.3)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow =
              "0 8px 30px rgba(201,160,78,0.32), inset 0 1px 0 rgba(255,255,255,0.25)";
          }}
        >
          Commencer le questionnaire
        </button>

        <div
          style={{
            marginTop: 14,
            fontSize: 12,
            color: THEME.creamDim,
            letterSpacing: "0.04em",
          }}
        >
          Durée 20 secondes
        </div>
      </div>

      <style>{`
        @keyframes rdv-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
