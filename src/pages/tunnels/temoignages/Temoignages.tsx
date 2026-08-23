// ─────────────────────────────────────────────────────────────────────────
// PAGE INDÉPENDANTE — Témoignages (preuve sociale).
//
// Vitrine des témoignages : captures d'écran (images) + témoignages vidéo.
// Le CONTENU vit dans `content.ts` — c'est le seul fichier à éditer pour
// alimenter la page. Chaque section bascule d'elle-même : liste vide =
// emplacements d'attente, liste remplie = vrais témoignages. Les deux
// sections sont indépendantes, on peut donc livrer les captures avant les
// vidéos sans que la page paraisse cassée entre-temps.
//
// Bouton bas de page « Prendre rendez-vous » → redirection vers l'événement
// Calendly `temoignages` (lien externe, pas d'embed).
//
// Autonome (module tunnels) : réutilise seulement le socle marque (theme,
// TunnelBackground, fonts). Pas de dépendance aux tunnels WA/VSL.
// ─────────────────────────────────────────────────────────────────────────
import { useEffect } from "react";
import { T, CONFERENCE, ensureTunnelFonts } from "../theme";
import TunnelBackground from "../components/TunnelBackground";
import BookingUnavailable from "../components/BookingUnavailable";
import TestimonialVideo from "../components/TestimonialVideo";
import type { ScreenshotTestimonial } from "../lib/testimonials";
import { SCREENSHOTS, VIDEOS, PLACEHOLDER_SHOTS, PLACEHOLDER_VIDEOS } from "./content";

const shotSlots = Array.from({ length: PLACEHOLDER_SHOTS }, (_, i) => i + 1);
const videoSlots = Array.from({ length: PLACEHOLDER_VIDEOS }, (_, i) => i + 1);

// ── Placeholder « capture d'écran » (portrait, façon capture WhatsApp/DM) ──
function ScreenshotSlot({ n }: { n: number }) {
  return (
    <div
      style={{
        position: "relative",
        aspectRatio: "4 / 5",
        borderRadius: 16,
        border: `1px solid ${T.goldLine}`,
        background: "linear-gradient(160deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        overflow: "hidden",
      }}
    >
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={T.gold} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <circle cx="8.5" cy="9" r="1.6" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
      <div style={{ fontFamily: T.body, fontSize: "0.72rem", letterSpacing: "0.12em", textTransform: "uppercase", color: T.creamDim }}>
        Capture n°{n}
      </div>
    </div>
  );
}

// ── Placeholder « témoignage vidéo » (16:9 + bouton play) ──
function VideoSlot({ n }: { n: number }) {
  return (
    <div
      style={{
        position: "relative",
        aspectRatio: "16 / 9",
        borderRadius: 16,
        border: `1px solid ${T.goldLine}`,
        background: "linear-gradient(160deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015))",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: 58,
          height: 58,
          borderRadius: "50%",
          border: `1px solid ${T.goldLine}`,
          background: "radial-gradient(circle, rgba(201,160,78,0.18), transparent 70%)",
          display: "grid",
          placeItems: "center",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill={T.goldBright} aria-hidden>
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
      <div style={{ fontFamily: T.body, fontSize: "0.72rem", letterSpacing: "0.12em", textTransform: "uppercase", color: T.creamDim }}>
        Témoignage vidéo n°{n}
      </div>
    </div>
  );
}

// ── Capture d'écran réelle ──
// Pas de recadrage ni de hauteur imposée : une capture d'avis est du TEXTE,
// la rogner la rendrait illisible. L'image garde donc ses proportions et la
// grille s'adapte (colonnes façon mosaïque).
function Screenshot({ shot }: { shot: ScreenshotTestimonial }) {
  return (
    <figure
      style={{
        margin: 0,
        borderRadius: 16,
        border: `1px solid ${T.goldLine}`,
        background: "rgba(255,255,255,0.03)",
        overflow: "hidden",
        breakInside: "avoid",
      }}
    >
      <img
        src={shot.src}
        alt={shot.alt}
        loading="lazy"
        decoding="async"
        style={{ display: "block", width: "100%", height: "auto" }}
      />
    </figure>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div style={{ textAlign: "center", margin: "0 auto 26px" }}>
      <div style={{ fontFamily: T.body, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", fontSize: "0.7rem", color: T.goldBright, marginBottom: 10 }}>
        {eyebrow}
      </div>
      <h2 style={{ fontFamily: T.display, fontWeight: 600, fontSize: "clamp(1.4rem,4vw,2rem)", lineHeight: 1.15, color: T.cream, margin: 0 }}>
        {title}
      </h2>
    </div>
  );
}

export default function Temoignages() {
  useEffect(() => {
    ensureTunnelFonts();
    document.title = "Témoignages — Al Baraka";
  }, []);

  return (
    <div style={{ position: "relative", minHeight: "100vh", background: T.bg, color: T.cream, fontFamily: T.body, overflowX: "hidden" }}>
      <TunnelBackground />

      <style>{`
        @keyframes albt-rise { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
        .albt-rise { animation: albt-rise .8s cubic-bezier(.2,.7,.3,1) both; }
        .albt-shots { display:grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; }
        .albt-vids  { display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 18px; align-items: start; }
        /* Mosaïque des vraies captures : hauteurs libres, aucun recadrage. */
        .albt-mosaic { column-count: 3; column-gap: 16px; }
        .albt-mosaic > figure { margin: 0 0 16px; }
        @media (max-width: 860px) { .albt-mosaic { column-count: 2; } }
        @media (max-width: 520px) { .albt-mosaic { column-count: 1; } }
        .albt-cta {
          display:inline-block; font-family:${T.body}; font-weight:700; letter-spacing:0.02em;
          font-size:1.02rem; color:#1A1206; text-decoration:none;
          background: linear-gradient(135deg, ${T.goldBright}, ${T.gold});
          padding: 17px 40px; border-radius: 999px;
          box-shadow: 0 14px 34px rgba(201,160,78,0.34);
          transition: transform .2s ease, box-shadow .2s ease;
        }
        .albt-cta:hover { transform: translateY(-2px); box-shadow: 0 20px 44px rgba(201,160,78,0.46); }
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

      <main style={{ position: "relative", zIndex: 1, maxWidth: 1040, margin: "0 auto", padding: "clamp(28px,5vw,52px) 22px clamp(56px,10vw,90px)" }}>
        {/* Hero */}
        <div style={{ textAlign: "center", maxWidth: 720, margin: "0 auto clamp(40px,7vw,64px)" }}>
          <div className="albt-rise" style={{ display: "inline-block", fontFamily: T.body, fontWeight: 600, letterSpacing: "0.24em", textTransform: "uppercase", fontSize: "0.72rem", color: T.goldBright, border: `1px solid ${T.goldLine}`, borderRadius: 999, padding: "7px 16px", marginBottom: 20 }}>
            Témoignages
          </div>
          <h1 className="albt-rise" style={{ animationDelay: "60ms", fontFamily: T.display, fontWeight: 600, fontSize: "clamp(2rem,6.4vw,3.2rem)", lineHeight: 1.1, color: T.cream, margin: "0 0 16px", textTransform: "uppercase" }}>
            Ils l'ont vécu, ils en parlent
          </h1>
          <p className="albt-rise" style={{ animationDelay: "120ms", fontFamily: T.body, fontSize: "clamp(1rem,2.7vw,1.18rem)", lineHeight: 1.6, color: T.creamMuted, margin: "0 auto", maxWidth: 560 }}>
            Des membres de l'écosystème Al Baraka partagent leur expérience,
            sans filtre — en captures d'écran comme en vidéo.
          </p>
          {(SCREENSHOTS.length === 0 || VIDEOS.length === 0) && (
            <p className="albt-rise" style={{ animationDelay: "160ms", fontFamily: T.body, fontSize: "0.78rem", color: T.creamDim, marginTop: 16 }}>
              (Emplacements en attente — les témoignages arrivent.)
            </p>
          )}
        </div>

        {/* Captures d'écran */}
        <section className="albt-rise" style={{ animationDelay: "180ms", marginBottom: "clamp(48px,8vw,72px)" }}>
          <SectionTitle eyebrow="Avis écrits" title="Ce qu'ils nous écrivent" />
          {SCREENSHOTS.length > 0 ? (
            <div className="albt-mosaic">
              {SCREENSHOTS.map((shot) => (
                <Screenshot key={shot.src} shot={shot} />
              ))}
            </div>
          ) : (
            <div className="albt-shots">
              {shotSlots.map((n) => (
                <ScreenshotSlot key={n} n={n} />
              ))}
            </div>
          )}
        </section>

        {/* Témoignages vidéo */}
        <section className="albt-rise" style={{ animationDelay: "220ms", marginBottom: "clamp(48px,8vw,72px)" }}>
          <SectionTitle eyebrow="Face caméra" title="Témoignages vidéo" />
          <div className="albt-vids">
            {VIDEOS.length > 0
              ? VIDEOS.map((video) => (
                  <TestimonialVideo key={video.kind === "vimeo" ? video.id : video.src} video={video} />
                ))
              : videoSlots.map((n) => <VideoSlot key={n} n={n} />)}
          </div>
        </section>

        {/* CTA final → Calendly */}
        <div style={{ textAlign: "center", maxWidth: 620, margin: "0 auto" }}>
          <h2 style={{ fontFamily: T.display, fontWeight: 600, fontSize: "clamp(1.5rem,4.6vw,2.2rem)", lineHeight: 1.15, color: T.cream, margin: "0 0 14px", textTransform: "uppercase" }}>
            À ton tour d'écrire ton histoire
          </h2>
          <p style={{ fontFamily: T.body, fontSize: "clamp(0.98rem,2.6vw,1.12rem)", lineHeight: 1.6, color: T.creamMuted, margin: "0 auto 28px", maxWidth: 480 }}>
            Réserve un créneau et parlons de ton projet.
          </p>
          {/* Pas d'événement Calendly disponible → panneau d'attente plutôt
              qu'un bouton qui mènerait à une page d'erreur. */}
          {CONFERENCE.temoignagesCalendlyUrl ? (
            <a className="albt-cta" href={CONFERENCE.temoignagesCalendlyUrl}>
              Prendre rendez-vous
            </a>
          ) : (
            <div style={{ maxWidth: 520, margin: "0 auto" }}>
              <BookingUnavailable note="La prise de rendez-vous ouvre très bientôt. Reviens sur cette page dans quelques instants pour choisir ton créneau." />
            </div>
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
