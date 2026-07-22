// ─────────────────────────────────────────────────────────────────────────
// PAGE INDÉPENDANTE — Réservation d'un appel avec l'équipe de Sidali.
//
// Ce n'est PAS un tunnel (pas d'opt-in, pas de landing, pas d'attribution ads).
// C'est une page autonome dont le lien est partagé PENDANT la conférence (à
// l'oral / à l'écran) ou APRÈS (dans le groupe WhatsApp), pour que les gens
// réservent un appel. But : identifier qui prend rendez-vous avant/après une
// conf.
//
// Copy repris de l'ancienne page Systeme.io « call-webinaire ». Widget Calendly
// FOND CLAIR (comme le VSL). La remontée CRM est AUTOMATIQUE et déjà en place :
// webhook-calendly mappe l'événement `inscription-conference` sur
// event_type = 'inscription_conference' et crée un `call` autonome (même
// pipeline que la page SIO qu'on remplace) → 0 code back.
// ─────────────────────────────────────────────────────────────────────────
import { useEffect } from "react";
import { T, CONFERENCE, ensureTunnelFonts } from "../theme";
import TunnelBackground from "../components/TunnelBackground";
import CalendlyInline from "../components/CalendlyInline";

export default function AppelConference() {
  useEffect(() => {
    ensureTunnelFonts();
    document.title = "Réserve ton appel — Al Baraka";
  }, []);

  return (
    <div style={{ position: "relative", minHeight: "100vh", background: T.bg, color: T.cream, fontFamily: T.body, overflowX: "hidden" }}>
      <TunnelBackground />

      <style>{`
        @keyframes alba-rise { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
        .alba-rise { animation: alba-rise .8s cubic-bezier(.2,.7,.3,1) both; }
      `}</style>

      {/* Header lockup */}
      <header style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "28px 0 4px" }}>
        <div style={{ fontFamily: T.display, letterSpacing: "0.34em", fontWeight: 600, fontSize: "clamp(1.05rem,3.2vw,1.25rem)", color: T.gold }}>
          AL&nbsp;BARAKA
        </div>
        <div style={{ fontSize: "0.62rem", letterSpacing: "0.34em", color: T.creamDim, marginTop: 6, textTransform: "uppercase" }}>
          Écosystème
        </div>
      </header>

      <main style={{ position: "relative", zIndex: 1, maxWidth: 900, margin: "0 auto", padding: "clamp(28px,5vw,52px) 22px clamp(56px,10vw,90px)", textAlign: "center" }}>
        {/* Eyebrow (« Réservation Appel » sur SIO) */}
        <div className="alba-rise" style={{ display: "inline-block", fontFamily: T.body, fontWeight: 600, letterSpacing: "0.24em", textTransform: "uppercase", fontSize: "0.72rem", color: T.goldBright, border: `1px solid ${T.goldLine}`, borderRadius: 999, padding: "7px 16px", marginBottom: 20 }}>
          Réservation appel
        </div>

        <h1 className="alba-rise" style={{ animationDelay: "60ms", fontFamily: T.display, fontWeight: 600, fontSize: "clamp(1.9rem,6vw,3rem)", lineHeight: 1.12, color: T.cream, margin: "0 auto 16px", maxWidth: 720, textTransform: "uppercase" }}>
          Réserve un appel privé avec l'équipe de Sidali
        </h1>

        <p className="alba-rise" style={{ animationDelay: "120ms", fontFamily: T.body, fontSize: "clamp(1rem,2.7vw,1.18rem)", lineHeight: 1.6, color: T.creamMuted, margin: "0 auto 34px", maxWidth: 560 }}>
          Réserve le créneau qui te convient le mieux dans le calendrier ci-dessous,
          réponds aux questions du formulaire et valide ton appel.
        </p>

        {/* Agenda Calendly (fond clair) */}
        <div className="alba-rise" style={{ animationDelay: "180ms", maxWidth: 900, margin: "0 auto" }}>
          <CalendlyInline url={CONFERENCE.appelCalendlyUrl} />
        </div>
      </main>

      {/* Footer */}
      <footer style={{ position: "relative", zIndex: 1, borderTop: `1px solid ${T.goldDim}`, padding: "24px 22px", textAlign: "center" }}>
        <div style={{ fontFamily: T.display, letterSpacing: "0.3em", color: T.gold, fontSize: "0.9rem" }}>AL&nbsp;BARAKA</div>
        <p style={{ fontFamily: T.body, fontSize: "0.72rem", color: T.creamDim, marginTop: 8 }}>
          © {new Date().getFullYear()} Al Baraka. Tous droits réservés.
        </p>
      </footer>
    </div>
  );
}
