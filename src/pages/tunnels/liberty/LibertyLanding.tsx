// ─────────────────────────────────────────────────────────────────────────
// TUNNEL LIBERTY — Landing (page 1/3).
//
// Bandeau → titre → CTA → « Tu vas découvrir » → CTA. Rien d'autre : le
// document de l'équipe marketing ne prévoit pas de mur de témoignages ici,
// contrairement à la landing des tunnels de conférence.
//
// Le CTA ouvre le pop-in de capture (prénom / email / téléphone), qui crée le
// lead CRM puis redirige vers /liberty/merci où se trouve la VSL.
//
// Servie UNIQUEMENT depuis `event.albarakaecosysteme.com`.
// ─────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import { T, ensureTunnelFonts } from "../theme";
import { captureAttribution } from "../lib/source";
import { trackLandingView } from "../lib/pixel";
import { LIBERTY_TUNNEL } from "../config";
import TunnelBackground from "../components/TunnelBackground";
import OptInModal from "../components/OptInModal";
import { BANDEAU, TITRE, SOUS_TITRE, CTA_LANDING, DECOUVERTES, OPTIN } from "./content";

export default function LibertyLanding() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // L'attribution se capte à l'arrivée : les paramètres d'URL disparaissent
    // dès la première navigation interne, et le lead n'est créé qu'après.
    captureAttribution(LIBERTY_TUNNEL);
    trackLandingView();
    ensureTunnelFonts();
    document.title = "Al Baraka — Monétise ta compétence";
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
        @keyframes albl-rise { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
        .albl-rise { animation: albl-rise .8s cubic-bezier(.2,.7,.3,1) both; }
        .albl-cta {
          display:inline-block; font-family:${T.body}; font-weight:700; letter-spacing:0.02em;
          font-size:clamp(0.98rem,2.6vw,1.08rem); color:#1A1206; text-decoration:none;
          background: linear-gradient(135deg, ${T.goldBright}, ${T.gold});
          padding: 18px 42px; border-radius: 999px; border: none; cursor: pointer;
          box-shadow: 0 14px 34px rgba(201,160,78,0.34);
          transition: transform .2s ease, box-shadow .2s ease;
          text-transform: uppercase;
        }
        .albl-cta:hover { transform: translateY(-2px); box-shadow: 0 20px 44px rgba(201,160,78,0.46); }
      `}</style>

      <main
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 1000,
          margin: "0 auto",
          padding: "clamp(28px,5vw,48px) 22px clamp(56px,10vw,90px)",
        }}
      >
        {/* Bandeau haut */}
        <div
          className="albl-rise"
          style={{
            maxWidth: 820,
            margin: "0 auto clamp(22px,3vw,30px)",
            textAlign: "center",
            fontWeight: 500,
            fontSize: "clamp(0.72rem,2.1vw,0.82rem)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            lineHeight: 1.6,
            color: T.goldBright,
            border: `1px solid ${T.goldLine}`,
            borderRadius: 999,
            padding: "12px 24px",
            background: T.bgCard,
          }}
        >
          {BANDEAU}
        </div>

        {/* Titre + sous-titre + CTA */}
        <header className="albl-rise" style={{ animationDelay: "60ms", textAlign: "center", maxWidth: 880, margin: "0 auto clamp(52px,9vw,80px)" }}>
          <h1
            style={{
              fontFamily: T.display,
              fontWeight: 700,
              fontSize: "clamp(1.8rem,5.2vw,3.1rem)",
              lineHeight: 1.12,
              color: T.cream,
              margin: "0 0 14px",
              textTransform: "uppercase",
            }}
          >
            {TITRE}
          </h1>
          <p
            style={{
              fontFamily: T.body,
              fontSize: "clamp(1rem,2.7vw,1.18rem)",
              lineHeight: 1.6,
              color: T.creamMuted,
              margin: "0 auto 34px",
              maxWidth: 560,
            }}
          >
            {SOUS_TITRE}
          </p>
          <button type="button" className="albl-cta" onClick={() => setOpen(true)}>
            {CTA_LANDING}
          </button>
        </header>

        {/* Tu vas découvrir */}
        <section className="albl-rise" style={{ animationDelay: "140ms", maxWidth: 820, margin: "0 auto clamp(48px,8vw,72px)" }}>
          <h2
            style={{
              fontFamily: T.display,
              fontWeight: 600,
              fontSize: "clamp(1.35rem,4vw,2rem)",
              lineHeight: 1.18,
              color: T.cream,
              margin: "0 0 30px",
              textAlign: "center",
              textTransform: "uppercase",
            }}
          >
            Tu vas découvrir
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {DECOUVERTES.map((d) => (
              <div
                key={d.n}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 18,
                  background: T.bgCard,
                  border: `1px solid ${T.goldLine}`,
                  borderRadius: 18,
                  padding: "clamp(18px,3vw,24px)",
                }}
              >
                <div
                  style={{
                    fontFamily: T.display,
                    fontWeight: 700,
                    fontSize: "clamp(1.3rem,3.4vw,1.7rem)",
                    lineHeight: 1,
                    color: T.gold,
                    flexShrink: 0,
                    paddingTop: 2,
                  }}
                >
                  {d.n}
                </div>
                <p
                  style={{
                    fontFamily: T.body,
                    fontSize: "clamp(0.95rem,2.5vw,1.06rem)",
                    lineHeight: 1.65,
                    color: T.creamMuted,
                    margin: 0,
                  }}
                >
                  {d.texte}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA de bas de page */}
        <div className="albl-rise" style={{ animationDelay: "200ms", textAlign: "center" }}>
          <button type="button" className="albl-cta" onClick={() => setOpen(true)}>
            {CTA_LANDING}
          </button>
        </div>
      </main>

      {/* Le pied de page est celui de l'application, commun à toutes les
          pages : identité de la société, mentions légales, cookies. Celui
          qui vivait ici faisait doublon avec lui. */}

      <OptInModal
        open={open}
        onClose={() => setOpen(false)}
        tunnel={LIBERTY_TUNNEL}
        titre={OPTIN.titre}
        dateLigne={null}
        bouton={OPTIN.bouton}
      />
    </div>
  );
}
