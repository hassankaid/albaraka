// ─────────────────────────────────────────────────────────────────────────
// PAGE INDÉPENDANTE — Témoignages (preuve sociale).
//
// La compilation ouvre la page (tout, d'une traite), puis UN SEUL mur de
// témoignages, captures et vidéos mélangées, pour aller en chercher un. La version
// précédente les séparait en « avis écrits » et « témoignages vidéo » : ça
// triait la preuve par support au lieu de la montrer, et la grille laissait
// de grands trous sous les vidéos les plus courtes — une rangée de grille
// prend la hauteur de son élément le plus haut.
//
// D'où la mise en page en colonnes : chaque tuile garde ses proportions et se
// range sous la précédente, sans trou possible. Les colonnes CSS ne suffisaient
// pas — avec des tuiles hautes et insécables, la 3e s'arrêtait 700 px avant les
// autres (mesuré). La répartition est donc calculée, chaque témoignage
// déclarant ses proportions.
//
// Le CONTENU vit dans `content.ts` — seul fichier à éditer pour l'alimenter.
//
// Bouton bas de page « Prendre rendez-vous » → événement Calendly
// `temoignages` (lien externe, pas d'embed).
//
// Autonome (module tunnels) : réutilise seulement le socle marque (theme,
// TunnelBackground, fonts). Pas de dépendance aux tunnels WA/VSL.
// ─────────────────────────────────────────────────────────────────────────
import { useEffect, useMemo } from "react";
import { T, CONFERENCE, ensureTunnelFonts } from "../theme";
import TunnelBackground from "../components/TunnelBackground";
import BookingUnavailable from "../components/BookingUnavailable";
import TestimonialTile from "../components/TestimonialTile";
import FeaturedTestimonial from "../components/FeaturedTestimonial";
import { TEMOIGNAGES, PLACEHOLDER_COUNT, testimonialKey } from "./content";
import { repartirEnColonnes, COMPILATION, COMPILATION_DUREE } from "../lib/testimonials";
import { useColonnes } from "../lib/useColonnes";

const placeholders = Array.from({ length: PLACEHOLDER_COUNT }, (_, i) => i + 1);

// ── Tuile d'attente, tant qu'aucun témoignage n'est publié ──
function PlaceholderTile({ n }: { n: number }) {
  return (
    <figure style={{ margin: 0 }}>
      <div
        style={{
          position: "relative",
          aspectRatio: n % 2 === 0 ? "4 / 3" : "9 / 16",
          borderRadius: 16,
          border: `1px solid ${T.goldLine}`,
          background: "linear-gradient(160deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015))",
          display: "grid",
          placeItems: "center",
        }}
      >
        <div
          style={{
            width: 54,
            height: 54,
            borderRadius: "50%",
            border: `1px solid ${T.goldLine}`,
            background: "radial-gradient(circle, rgba(201,160,78,0.18), transparent 70%)",
            display: "grid",
            placeItems: "center",
          }}
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill={T.goldBright} aria-hidden>
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
      <figcaption style={{ margin: "12px 2px 0", textAlign: "center", fontFamily: T.body, fontSize: "0.72rem", letterSpacing: "0.12em", textTransform: "uppercase", color: T.creamDim }}>
        Témoignage n°{n}
      </figcaption>
    </figure>
  );
}

export default function Temoignages() {
  useEffect(() => {
    ensureTunnelFonts();
    document.title = "Témoignages — Al Baraka";
  }, []);

  const colonnes = useColonnes({ deux: 900, une: 560 });
  const vide = TEMOIGNAGES.length === 0;
  const murs = useMemo(() => repartirEnColonnes(TEMOIGNAGES, colonnes), [colonnes]);
  // Les tuiles d'attente n'ont pas de contenu à peser : simple tour de rôle.
  const colonnesDAttente = useMemo(
    () => Array.from({ length: colonnes }, (_, i) => placeholders.filter((_, j) => j % colonnes === i)),
    [colonnes],
  );

  return (
    <div style={{ position: "relative", minHeight: "100vh", background: T.bg, color: T.cream, fontFamily: T.body, overflowX: "hidden" }}>
      <TunnelBackground />

      <style>{`
        @keyframes albt-rise { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
        .albt-rise { animation: albt-rise .8s cubic-bezier(.2,.7,.3,1) both; }
        /* Mur : colonnes réparties en JS, chacune empilant ses tuiles. */
        .albt-mur { display: flex; align-items: flex-start; gap: 20px; }
        .albt-col { flex: 1 1 0; min-width: 0; }
        .albt-col > figure { margin: 0 0 26px; }
        .albt-col > figure:last-child { margin-bottom: 0; }
        @media (max-width: 900px) { .albt-mur { gap: 16px; } .albt-col > figure { margin-bottom: 20px; } }
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
            Des membres de l'écosystème Al Baraka racontent leur expérience,
            sans filtre et dans leurs mots.
          </p>
          {vide && (
            <p className="albt-rise" style={{ animationDelay: "160ms", fontFamily: T.body, fontSize: "0.78rem", color: T.creamDim, marginTop: 16 }}>
              (Emplacements en attente — les témoignages arrivent.)
            </p>
          )}
        </div>

        {/* La compilation : ce que tout le monde dit, d'une traite. Le mur
            qui suit permet d'aller chercher un témoignage en particulier. */}
        <section className="albt-rise" style={{ animationDelay: "150ms", maxWidth: 880, margin: "0 auto clamp(52px,9vw,80px)" }}>
          <FeaturedTestimonial
            video={COMPILATION}
            eyebrow="Tout, d'une traite"
            title="Ils racontent, les uns après les autres"
            duree={COMPILATION_DUREE}
          />
        </section>

        {/* Le mur */}
        <section className="albt-rise" style={{ animationDelay: "180ms", marginBottom: "clamp(52px,9vw,80px)" }}>
          <div className="albt-mur">
            {vide
              ? colonnesDAttente.map((colonne, i) => (
                  <div className="albt-col" key={i}>
                    {colonne.map((n) => (
                      <PlaceholderTile key={n} n={n} />
                    ))}
                  </div>
                ))
              : murs.map((colonne, i) => (
                  <div className="albt-col" key={i}>
                    {colonne.map((item) => (
                      <TestimonialTile key={testimonialKey(item)} item={item} />
                    ))}
                  </div>
                ))}
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
