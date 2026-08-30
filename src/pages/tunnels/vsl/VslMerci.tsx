// ─────────────────────────────────────────────────────────────────────────
// TUNNEL VSL — Page de remerciement (Thank-You) AVEC vidéo VSL.
//
// Structure cible : confirmation → vidéo VSL (gatée) → bouton « prendre RDV »
// (Calendly) → page de confirmation.
//
// ⚠️ ÉTAT ACTUEL (B1) = SQUELETTE : la vidéo et le Calendly ne sont pas encore
// fournis. Emplacements clairement marqués :
//   - B3 : intégrer la vraie vidéo VSL (gating « bouton débloqué à ~95% »).
//   - B4 : embed Calendly + page de confirmation après réservation.
// ─────────────────────────────────────────────────────────────────────────
import { useEffect } from "react";
import { trackTypLead } from "../lib/pixel";
import { T, CONFERENCE, ensureTunnelFonts } from "../theme";
import { useConference } from "../lib/conference";
import TunnelBackground from "../components/TunnelBackground";
import VimeoVideo from "../components/VimeoVideo";
import CalendlyInline from "../components/CalendlyInline";
import BookingUnavailable from "../components/BookingUnavailable";
import { resolveVariant } from "../variants";

export default function VslMerci() {
  const conference = useConference();
  const variant = resolveVariant("vsl", new URLSearchParams(window.location.search).get("v"));

  useEffect(() => {
    // Page de remerciement : PageView, et « Lead » si le visiteur vient
    // vraiment de s'inscrire (marqueur pose par le formulaire).
    void trackTypLead();
    ensureTunnelFonts();
    document.title = "Inscription confirmée — Al Baraka";
  }, []);

  return (
    <div style={{ position: "relative", minHeight: "100vh", background: T.bg, color: T.cream, fontFamily: T.body, overflowX: "hidden" }}>
      <TunnelBackground />

      <style>{`
        @keyframes albv-rise { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
        .albv-rise { animation: albv-rise .8s cubic-bezier(.2,.7,.3,1) both; }
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

      <main style={{ position: "relative", zIndex: 1, maxWidth: 980, margin: "0 auto", padding: "clamp(30px,5vw,56px) 22px clamp(56px,10vw,90px)", textAlign: "center" }}>
        <h1 className="albv-rise" style={{ fontFamily: T.display, fontWeight: 600, fontSize: "clamp(1.9rem,6vw,3rem)", lineHeight: 1.1, color: T.cream, margin: "0 auto 14px", maxWidth: 680, textTransform: "uppercase" }}>
          Félicitations !
        </h1>

        <p className="albv-rise" style={{ animationDelay: "130ms", fontFamily: T.body, fontSize: "clamp(1rem,2.7vw,1.18rem)", lineHeight: 1.55, color: T.creamMuted, margin: "0 auto 30px", maxWidth: 540 }}>
          Ton inscription à la conférence du{" "}
          <strong style={{ color: T.goldBright, fontWeight: 600 }}>{conference.dateLabel}</strong>{" "}
          ({CONFERENCE.tz}) est confirmée.
        </p>

        <p className="albv-rise" style={{ animationDelay: "180ms", fontFamily: T.body, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", fontSize: "0.78rem", color: T.goldBright, margin: "0 0 16px" }}>
          ⚠️ Regarde cette vidéo jusqu'au bout
        </p>

        {/* ── VIDÉO VSL (variante A/B) — plus large que le reste ─────── */}
        <div className="albv-rise" style={{ animationDelay: "160ms", maxWidth: 900, margin: "0 auto 30px" }}>
          <VimeoVideo variant={variant} />
        </div>

        {/* ── Agenda Calendly (directement sous la vidéo) ───────────
            Si l'événement n'est pas disponible (`calendlyUrl` à null), on
            affiche un panneau d'attente plutôt qu'un agenda mort. */}
        <p className="albv-rise" style={{ animationDelay: "240ms", fontFamily: T.body, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", fontSize: "0.78rem", color: T.goldBright, margin: "0 0 16px" }}>
          {CONFERENCE.calendlyUrl ? "Réserve ton appel ci-dessous" : "Ton appel avec l'équipe"}
        </p>
        <div className="albv-rise" style={{ animationDelay: "280ms", maxWidth: 900, margin: "0 auto" }}>
          {CONFERENCE.calendlyUrl ? (
            <CalendlyInline url={CONFERENCE.calendlyUrl} />
          ) : (
            <BookingUnavailable note="La prise de rendez-vous ouvre très bientôt. Ton inscription à la conférence est déjà confirmée — reviens sur cette page dans quelques instants pour choisir ton créneau." />
          )}
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
