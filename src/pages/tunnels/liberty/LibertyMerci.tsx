// ─────────────────────────────────────────────────────────────────────────
// TUNNEL LIBERTY — Page de remerciement (page 2/3), celle qui porte la VSL.
//
// Titre → vidéo → CTA « Je réserve un appel » → agenda Calendly.
//
// Le bouton n'est pas verrouillé par la lecture de la vidéo : les CTA des
// tunnels sont visibles tout de suite (décision Hassan), et un verrou à 95 %
// se contourne de toute façon en tirant la barre de progression. Il fait
// défiler jusqu'à l'agenda, posé juste en dessous.
//
// La réservation confirmée déclenche la redirection Calendly (configurée côté
// Calendly) vers /liberty/confirmation.
// ─────────────────────────────────────────────────────────────────────────
import { useEffect, useRef } from "react";
import { T, ensureTunnelFonts } from "../theme";
import { trackTypLead } from "../lib/pixel";
import { resolveVariant } from "../variants";
import TunnelBackground from "../components/TunnelBackground";
import VimeoVideo from "../components/VimeoVideo";
import CalendlyInline from "../components/CalendlyInline";
import { TITRE, CTA_RDV, CALENDLY_URL } from "./content";

export default function LibertyMerci() {
  const agenda = useRef<HTMLDivElement>(null);
  const variant = resolveVariant("liberty", null);

  useEffect(() => {
    // PageView, et « Lead » si le visiteur vient vraiment de s'inscrire
    // (marqueur posé par le pop-in de la landing).
    void trackTypLead();
    ensureTunnelFonts();
    document.title = "Ta vidéo — Al Baraka";
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
        @keyframes alblm-rise { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
        .alblm-rise { animation: alblm-rise .8s cubic-bezier(.2,.7,.3,1) both; }
        .alblm-cta {
          display:inline-block; font-family:${T.body}; font-weight:700; letter-spacing:0.02em;
          font-size:clamp(0.98rem,2.6vw,1.08rem); color:#1A1206; text-decoration:none;
          background: linear-gradient(135deg, ${T.goldBright}, ${T.gold});
          padding: 18px 42px; border-radius: 999px; border: none; cursor: pointer;
          box-shadow: 0 14px 34px rgba(201,160,78,0.34);
          transition: transform .2s ease, box-shadow .2s ease;
          text-transform: uppercase;
        }
        .alblm-cta:hover { transform: translateY(-2px); box-shadow: 0 20px 44px rgba(201,160,78,0.46); }
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
        <header className="alblm-rise" style={{ textAlign: "center", maxWidth: 880, margin: "0 auto clamp(30px,5vw,44px)" }}>
          <h1
            style={{
              fontFamily: T.display,
              fontWeight: 700,
              fontSize: "clamp(1.7rem,5vw,3rem)",
              lineHeight: 1.12,
              color: T.cream,
              margin: 0,
              textTransform: "uppercase",
            }}
          >
            {TITRE}
          </h1>
        </header>

        {/* La VSL */}
        <section className="alblm-rise" style={{ animationDelay: "60ms", maxWidth: 880, margin: "0 auto clamp(30px,5vw,44px)" }}>
          <VimeoVideo variant={variant} />
        </section>

        {/* CTA → l'agenda, juste en dessous */}
        <div className="alblm-rise" style={{ animationDelay: "120ms", textAlign: "center", marginBottom: "clamp(48px,8vw,74px)" }}>
          <button
            type="button"
            className="alblm-cta"
            onClick={() => agenda.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          >
            {CTA_RDV}
          </button>
        </div>

        {/* L'agenda */}
        <section ref={agenda} className="alblm-rise" style={{ animationDelay: "180ms", maxWidth: 860, margin: "0 auto", scrollMarginTop: 24 }}>
          <CalendlyInline url={CALENDLY_URL} />
        </section>
      </main>

      {/* Le pied de page est celui de l'application, commun à toutes les
          pages : identité de la société, mentions légales, cookies. Celui
          qui vivait ici faisait doublon avec lui. */}
    </div>
  );
}
