// ─────────────────────────────────────────────────────────────────────────
// TUNNEL « AL BARAKA 200 €/MOIS » — page unique.
//
// Un seul écran : bandeau → titre → sous-titre → vidéo → agenda → témoignages.
//
// Pas d'opt-in, contrairement au tunnel Liberty : c'est un tunnel de prise
// d'appel direct, la qualification se fait pendant l'appel (décision Hassan du
// 22/09/2026). Le visiteur saisit donc ses coordonnées dans Calendly, et rien
// n'est capté avant — il n'y a volontairement ni lead CRM ni séquence de mails
// sur ce tunnel.
//
// Servie UNIQUEMENT depuis `event.albarakaecosysteme.com` (cf. tunnelRoutes
// dans App.tsx et les règles d'hôte de vercel.json).
// ─────────────────────────────────────────────────────────────────────────
import { useEffect, useMemo } from "react";
import { T, ensureTunnelFonts } from "../theme";
import { trackLandingView } from "../lib/pixel";
import { repartirEnColonnes, testimonialKey } from "../lib/testimonials";
import { useColonnes } from "../lib/useColonnes";
import TunnelBackground from "../components/TunnelBackground";
import TestimonialTile from "../components/TestimonialTile";
import CalendlyInline from "../components/CalendlyInline";
import VimeoVideo from "../components/VimeoVideo";
import {
  BANDEAU,
  TITRE,
  SOUS_TITRE,
  VSL,
  MODALITES,
  RDV_TITRE,
  RDV_TEXTE,
  CALENDLY_URL,
  TEMOIGNAGES_200,
} from "./content";

export default function AlBaraka200() {
  const colonnes = useColonnes({ deux: 900, une: 560 });
  const murs = useMemo(() => repartirEnColonnes(TEMOIGNAGES_200, colonnes), [colonnes]);

  useEffect(() => {
    trackLandingView();
    ensureTunnelFonts();
    document.title = "Al Baraka — 200 €/mois";
  }, []);

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        background: T.bg,
        color: T.cream,
        fontFamily: T.body,
        overflowX: "hidden",
      }}
    >
      <TunnelBackground />

      <style>{`
        @keyframes alb200-rise { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
        .alb200-rise { animation: alb200-rise .8s cubic-bezier(.2,.7,.3,1) both; }
        .alb200-mur { display: flex; align-items: flex-start; gap: 20px; }
        .alb200-col { flex: 1 1 0; min-width: 0; }
        .alb200-col > figure { margin: 0 0 26px; }
        .alb200-col > figure:last-child { margin-bottom: 0; }
        @media (max-width: 900px) { .alb200-mur { gap: 16px; } .alb200-col > figure { margin-bottom: 20px; } }
      `}</style>

      <main
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 1040,
          margin: "0 auto",
          padding: "clamp(28px,5vw,48px) 22px clamp(56px,10vw,90px)",
        }}
      >
        {/* Bandeau haut */}
        <div
          className="alb200-rise"
          style={{
            maxWidth: 780,
            margin: "0 auto clamp(20px,3vw,28px)",
            textAlign: "center",
            fontFamily: T.body,
            fontWeight: 500,
            fontSize: "clamp(0.72rem,2.1vw,0.82rem)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            lineHeight: 1.6,
            color: T.goldBright,
            border: `1px solid ${T.goldLine}`,
            borderRadius: 999,
            padding: "12px 22px",
            background: T.bgCard,
          }}
        >
          {BANDEAU}
        </div>

        {/* Titre + sous-titre */}
        <header className="alb200-rise" style={{ animationDelay: "60ms", textAlign: "center", maxWidth: 880, margin: "0 auto clamp(30px,5vw,44px)" }}>
          <h1
            style={{
              fontFamily: T.display,
              fontWeight: 700,
              fontSize: "clamp(1.7rem,5vw,3rem)",
              lineHeight: 1.12,
              color: T.cream,
              margin: "0 0 18px",
              textTransform: "uppercase",
            }}
          >
            {TITRE}
          </h1>
          <p
            style={{
              fontFamily: T.body,
              fontSize: "clamp(0.98rem,2.6vw,1.14rem)",
              lineHeight: 1.65,
              color: T.creamMuted,
              margin: "0 auto",
              maxWidth: 680,
            }}
          >
            {SOUS_TITRE}
          </p>
        </header>

        {/* Vidéo */}
        <section className="alb200-rise" style={{ animationDelay: "120ms", maxWidth: 860, margin: "0 auto clamp(48px,8vw,74px)" }}>
          <VimeoVideo variant={VSL} titre="Al Baraka — 200 €/mois" />
        </section>

        {/* Étude de faisabilité → agenda Calendly */}
        <section className="alb200-rise" style={{ animationDelay: "180ms", marginBottom: "clamp(52px,9vw,80px)" }}>
          <div style={{ textAlign: "center", maxWidth: 620, margin: "0 auto 28px" }}>
            <h2
              style={{
                fontFamily: T.display,
                fontWeight: 600,
                fontSize: "clamp(1.4rem,4vw,2.1rem)",
                lineHeight: 1.18,
                color: T.cream,
                margin: "0 0 14px",
                textTransform: "uppercase",
              }}
            >
              {RDV_TITRE}
            </h2>
            <p style={{ fontFamily: T.body, fontSize: "clamp(0.95rem,2.5vw,1.06rem)", lineHeight: 1.65, color: T.creamMuted, margin: 0 }}>
              {RDV_TEXTE}
            </p>
          </div>
          <div style={{ maxWidth: 860, margin: "0 auto" }}>
            <CalendlyInline url={CALENDLY_URL} />
          </div>
          {/* Ce qu'on signe, écrit avant l'appel et non découvert au paiement. */}
          <p
            style={{
              maxWidth: 720,
              margin: "clamp(18px,3vw,26px) auto 0",
              padding: "14px 18px",
              borderRadius: 12,
              border: `1px solid ${T.goldDim}`,
              background: T.bgCard,
              fontFamily: T.body,
              fontSize: "clamp(0.78rem,2vw,0.88rem)",
              lineHeight: 1.6,
              textAlign: "center",
              color: T.creamMuted,
            }}
          >
            {MODALITES}
          </p>
        </section>

        {/* Mur de témoignages */}
        <section className="alb200-rise" style={{ animationDelay: "240ms" }}>
          <div className="alb200-mur">
            {murs.map((colonne, i) => (
              <div className="alb200-col" key={i}>
                {colonne.map((item) => (
                  <TestimonialTile key={testimonialKey(item)} item={item} />
                ))}
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer style={{ position: "relative", zIndex: 1, borderTop: `1px solid ${T.goldDim}`, padding: "24px 22px", textAlign: "center" }}>
        <div style={{ fontFamily: T.display, letterSpacing: "0.3em", color: T.gold, fontSize: "0.9rem" }}>AL&nbsp;BARAKA</div>
        <p style={{ fontFamily: T.body, fontSize: "0.72rem", color: T.creamDim, marginTop: 8 }}>
          © {new Date().getFullYear()} Al Baraka. Tous droits réservés.
        </p>
      </footer>
    </div>
  );
}
