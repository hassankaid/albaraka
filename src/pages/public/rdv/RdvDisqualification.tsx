// RdvDisqualification — Pages A..E du funnel /rdv.
// URL : /rdv/disqualification/:slug (slug = a|b|c|d|e)
// Affiche :
//   - Le titre + message spécifique à la raison du blocage
//   - Le rappel global des 4 conditions à remplir pour réserver
//   - Un bouton "Modifier ma réponse" qui ramène à la question concernée
//     (/rdv/questions?from=<index>) pour pouvoir corriger
//
// Si le slug est inconnu (URL forgée) → redirect /rdv.

import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle, ChevronLeft } from "lucide-react";
import logo from "@/assets/al-baraka-logo-v2.png";
import { THEME, DISQUALIFICATIONS, RDV_4_CONDITIONS, getStoredLeadId } from "./rdvShared";

export default function RdvDisqualification() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();

  const normalizedSlug = (slug || "").toLowerCase() as "a" | "b" | "c" | "d" | "e";
  const config = DISQUALIFICATIONS[normalizedSlug];

  useEffect(() => {
    // Sans lead_id ou slug invalide → on revient à l'intro
    if (!getStoredLeadId() || !config) {
      navigate("/rdv", { replace: true });
    }
  }, [config, navigate]);

  if (!config) return null;

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
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "48px 20px 60px",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at top, rgba(224,138,106,0.07) 0%, rgba(10,9,8,0) 55%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 560,
          animation: "rdv-fade-in 0.45s ease-out",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <img
            src={logo}
            alt="AL BARAKA"
            style={{
              width: 56,
              height: 56,
              objectFit: "contain",
              marginInline: "auto",
              display: "block",
              marginBottom: 22,
              filter: "drop-shadow(0 0 18px rgba(201,160,78,0.24))",
              opacity: 0.85,
            }}
          />

          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: "rgba(224,138,106,0.12)",
              border: "1px solid rgba(224,138,106,0.35)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 18,
            }}
          >
            <AlertCircle size={26} color={THEME.danger} />
          </div>

          <div
            style={{
              fontSize: 10.5,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: THEME.danger,
              marginBottom: 10,
            }}
          >
            Réservation impossible
          </div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 600,
              margin: 0,
              marginBottom: 16,
              lineHeight: 1.3,
              color: THEME.cream,
            }}
          >
            {config.title}
          </h1>
          <p
            style={{
              color: THEME.creamMuted,
              fontSize: 15,
              lineHeight: 1.6,
              margin: "0 auto",
              maxWidth: 460,
            }}
          >
            {config.message}
          </p>
        </div>

        {/* Bloc rappel des 4 conditions */}
        <div
          style={{
            background: THEME.bgSoft,
            border: `1px solid ${THEME.goldLine}`,
            borderRadius: 14,
            padding: "20px 22px",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              fontSize: 10.5,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: THEME.gold,
              marginBottom: 10,
              fontWeight: 600,
            }}
          >
            Pour rappel
          </div>
          <p
            style={{
              color: THEME.creamMuted,
              fontSize: 13.5,
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {RDV_4_CONDITIONS}
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
          <button
            type="button"
            onClick={() => navigate(`/rdv/questions?from=${config.questionIndex}`)}
            style={{
              background: `linear-gradient(180deg, ${THEME.goldBright} 0%, ${THEME.gold} 100%)`,
              color: "#1A1407",
              fontWeight: 600,
              fontSize: 14.5,
              padding: "12px 28px",
              borderRadius: 999,
              border: "none",
              cursor: "pointer",
              boxShadow: "0 8px 24px rgba(201,160,78,0.28), inset 0 1px 0 rgba(255,255,255,0.22)",
              transition: "transform 120ms ease, box-shadow 120ms ease",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
            }}
          >
            <ChevronLeft size={16} />
            Modifier ma réponse
          </button>

          <div
            style={{
              fontSize: 12,
              color: THEME.creamDim,
              letterSpacing: "0.04em",
            }}
          >
            Vous reviendrez à la question {config.questionIndex}
          </div>
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
