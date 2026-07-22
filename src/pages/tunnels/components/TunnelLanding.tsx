// ─────────────────────────────────────────────────────────────────────────
// TunnelLanding — landing PARTAGÉE des tunnels natifs (WhatsApp & VSL).
//
// Copy + design IDENTIQUES pour les deux tunnels (demande Hassan : « la landing
// VSL sera exactement la même que le WhatsApp »). Ce qui varie = la config du
// tunnel (source captée, page de remerciement où le pop-in redirige).
//
// Reproduit la structure de la landing Systeme.io (bandeau / titre / sous-titre
// / CTA / « Ce que tu vas découvrir » / témoignages / CTA), poussée d'un cran
// (direction luxe éditorial noir & or). Module autonome (aucune dépendance vers
// quiz / rdv / redif / conferences).
// ─────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import { T, ensureTunnelFonts } from "../theme";
import { captureAttribution } from "../lib/source";
import { trackLandingView } from "../lib/pixel";
import type { TunnelConfig } from "../config";
import TunnelBackground from "./TunnelBackground";
import OptInModal from "./OptInModal";

const DISCOVERIES = [
  {
    n: "01",
    title: "Pourquoi ta génération a un avantage que personne ne t'a dit",
    body: "Tout le monde autour de toi te parle de sécurité, de diplôme, de patience. Personne ne t'a dit qu'il existe aujourd'hui des compétences que tu peux apprendre en quelques mois, et qui te permettent de gagner ta vie depuis ton téléphone. On te montre pourquoi maintenant, et pourquoi toi.",
  },
  {
    n: "02",
    title: "La compétence qui rend le résultat crédible",
    body: "Des frères et sœurs de 20 à 30 ans, sans expérience, sans réseau, sans capital, ont généré leurs premiers revenus en moins de 90 jours. Pas parce qu'ils étaient exceptionnels. Parce qu'ils avaient la bonne compétence, dans le bon cadre, avec les bonnes personnes autour d'eux. On te montre laquelle, et le chemin exact qu'ils ont suivi.",
  },
  {
    n: "03",
    title: "Comment faire ça sans trahir ce que tu es",
    body: "Pas besoin de te vendre ni de mentir, et encore moins de mettre ta foi de côté. On te montre comment des jeunes musulmans ont construit leur liberté financière de manière alignée — dans la méthode, pas juste dans l'intention.",
  },
];

// Témoignages : PLACEHOLDER volontaire. Sidali fournira les vrais avis.
// Rien ici n'est un faux avis présenté comme réel.
const TESTIMONIALS = [
  { initials: "—", name: "Prénom N.", quote: "[ Témoignage à insérer — Sidali fournira les vrais avis. ]" },
  { initials: "—", name: "Prénom N.", quote: "[ Témoignage à insérer — Sidali fournira les vrais avis. ]" },
  { initials: "—", name: "Prénom N.", quote: "[ Témoignage à insérer — Sidali fournira les vrais avis. ]" },
];

export default function TunnelLanding({ tunnel }: { tunnel: TunnelConfig }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    ensureTunnelFonts();
    captureAttribution(tunnel);
    trackLandingView();
    document.title = "Conférence Al Baraka — Réserve ta place";
  }, [tunnel]);

  const cta = (label: string, delay = 0) => (
    <button
      onClick={() => setOpen(true)}
      className="albt-cta albt-rise"
      style={{ animationDelay: `${delay}ms` }}
    >
      {label}
      <span className="albt-cta-arrow" aria-hidden>→</span>
    </button>
  );

  return (
    <div style={{ position: "relative", minHeight: "100vh", background: T.bg, color: T.cream, fontFamily: T.body, overflowX: "hidden" }}>
      <TunnelBackground />

      <style>{`
        @keyframes albt-rise { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:none} }
        @keyframes albt-livedot { 0%,100%{opacity:.4;transform:scale(1)} 50%{opacity:1;transform:scale(1.25)} }
        .albt-rise { animation: albt-rise .8s cubic-bezier(.2,.7,.3,1) both; }
        .albt-cta {
          display:inline-flex; align-items:center; gap:12px;
          padding:17px 34px; border:none; border-radius:999px; cursor:pointer;
          font-family:${T.body}; font-weight:700; font-size:clamp(1rem,2.4vw,1.12rem);
          color:#1A1206; background:linear-gradient(180deg, ${T.goldBright}, ${T.gold});
          box-shadow:0 14px 34px rgba(201,160,78,.34), inset 0 1px 0 rgba(255,255,255,.35);
          transition:transform .18s ease, box-shadow .18s ease;
        }
        .albt-cta:hover { transform:translateY(-2px); box-shadow:0 20px 46px rgba(201,160,78,.46), inset 0 1px 0 rgba(255,255,255,.4); }
        .albt-cta-arrow { transition:transform .18s ease; }
        .albt-cta:hover .albt-cta-arrow { transform:translateX(4px); }
        .albt-disc-card { transition:transform .2s ease, border-color .2s ease, background .2s ease; }
        .albt-disc-card:hover { transform:translateY(-4px); border-color:${T.goldLine}; background:rgba(201,160,78,.045); }
        /* Empilé sur mobile, 3 colonnes à partir de la tablette large */
        .albt-grid3 { display:grid; grid-template-columns:1fr; gap:18px; margin-top:34px; }
        @media (min-width:760px){ .albt-grid3 { grid-template-columns:repeat(3,1fr); } }
      `}</style>

      {/* ── BANDEAU — fond doré plein, fort contraste, gros sur mobile ── */}
      <div style={{ position: "relative", zIndex: 1, background: `linear-gradient(90deg, ${T.goldDeep}, ${T.gold} 44%, ${T.goldBright} 50%, ${T.gold} 56%, ${T.goldDeep})`, boxShadow: "0 3px 22px rgba(201,160,78,0.30)" }}>
        <p style={{ margin: "0 auto", maxWidth: 960, textAlign: "center", padding: "clamp(13px,3.6vw,18px) 18px", fontSize: "clamp(0.84rem,3.4vw,1.02rem)", lineHeight: 1.35, letterSpacing: "0.005em", color: "#1A1206", fontWeight: 700 }}>
          Pour les musulmans de 20 à 30 ans qui veulent vivre librement sans sacrifier leur foi
        </p>
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1080, margin: "0 auto", padding: "0 22px" }}>
        {/* ── HEADER / LOCKUP ──────────────────────────────────────── */}
        <header style={{ textAlign: "center", padding: "26px 0 8px" }}>
          <div style={{ fontFamily: T.display, letterSpacing: "0.34em", fontWeight: 600, fontSize: "clamp(1.05rem,3.2vw,1.25rem)", color: T.gold }}>
            AL&nbsp;BARAKA
          </div>
          <div style={{ fontSize: "0.62rem", letterSpacing: "0.34em", color: T.creamDim, marginTop: 6, textTransform: "uppercase" }}>
            Écosystème
          </div>
        </header>

        {/* ── HERO ─────────────────────────────────────────────────── */}
        <section style={{ textAlign: "center", padding: "clamp(28px,6vw,60px) 0 clamp(30px,6vw,56px)", maxWidth: 860, margin: "0 auto" }}>
          <h1 className="albt-rise" style={{ animationDelay: "40ms", fontFamily: T.display, fontWeight: 600, fontSize: "clamp(2.15rem,6.4vw,3.7rem)", lineHeight: 1.08, letterSpacing: "-0.01em", color: T.cream, margin: "0 0 20px" }}>
            Remplace ton salaire en moins de 6 mois grâce à l'Écosystème Al Baraka
          </h1>

          <p className="albt-rise" style={{ animationDelay: "150ms", fontFamily: T.display, fontStyle: "italic", fontSize: "clamp(1.05rem,3vw,1.4rem)", lineHeight: 1.4, color: T.goldBright, margin: "0 auto 26px", maxWidth: 680 }}>
            La 1<sup style={{ fontSize: "0.6em" }}>ère</sup> plateforme de business en ligne construite par des musulmans, pour des musulmans.
          </p>

          <p className="albt-rise" style={{ animationDelay: "220ms", fontFamily: T.body, fontSize: "clamp(1rem,2.6vw,1.14rem)", lineHeight: 1.6, color: T.creamMuted, margin: "0 auto 34px", maxWidth: 620 }}>
            En moins de 90 jours, certains ont généré leurs premiers revenus en ligne.
            Sans expérience. Sans réseau. Juste les bonnes compétences dans le bon
            environnement. Cette conférence te montre lequel.
          </p>

          <div className="albt-rise" style={{ animationDelay: "300ms", display: "flex", alignItems: "center", justifyContent: "center", gap: 14, margin: "8px 0 34px" }} aria-hidden>
            <span style={{ height: 1, width: "clamp(30px,12vw,64px)", background: `linear-gradient(90deg, transparent, ${T.goldLine})` }} />
            <span style={{ width: 6, height: 6, transform: "rotate(45deg)", background: T.gold, boxShadow: `0 0 8px ${T.goldGlow}` }} />
            <span style={{ height: 1, width: "clamp(30px,12vw,64px)", background: `linear-gradient(90deg, ${T.goldLine}, transparent)` }} />
          </div>

          {cta("Je m'inscris à la conférence", 360)}
        </section>

        {/* ── CE QUE TU VAS DÉCOUVRIR ──────────────────────────────── */}
        <section style={{ padding: "clamp(30px,6vw,56px) 0" }}>
          <SectionLabel>Ce que tu vas découvrir</SectionLabel>
          <div className="albt-grid3">
            {DISCOVERIES.map((d) => (
              <article
                key={d.n}
                className="albt-disc-card albt-rise"
                style={{ textAlign: "left", padding: "28px 26px", background: T.bgCard, border: `1px solid ${T.creamFaint}`, borderRadius: 18 }}
              >
                <div style={{ fontFamily: T.display, fontSize: "2.4rem", fontWeight: 700, lineHeight: 1, color: "transparent", WebkitTextStroke: `1px ${T.gold}`, marginBottom: 16 }}>
                  {d.n}
                </div>
                <h3 style={{ fontFamily: T.display, fontWeight: 600, fontSize: "1.32rem", lineHeight: 1.2, color: T.cream, margin: "0 0 12px" }}>
                  {d.title}
                </h3>
                <p style={{ fontFamily: T.body, fontSize: "0.95rem", lineHeight: 1.62, color: T.creamMuted, margin: 0 }}>
                  {d.body}
                </p>
              </article>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 40 }}>{cta("Je m'inscris à la conférence")}</div>
        </section>

        {/* ── TÉMOIGNAGES (placeholder) ────────────────────────────── */}
        <section style={{ padding: "clamp(30px,6vw,56px) 0" }}>
          <SectionLabel>Ils l'ont fait avant toi</SectionLabel>
          <div className="albt-grid3">
            {TESTIMONIALS.map((t, i) => (
              <figure key={i} className="albt-rise" style={{ margin: 0, padding: "26px 24px", background: T.bgCard, border: `1px dashed ${T.goldDim}`, borderRadius: 18 }}>
                <div style={{ fontFamily: T.display, fontSize: "2rem", color: T.goldDim, lineHeight: 0.5, marginBottom: 12 }}>“</div>
                <blockquote style={{ margin: 0, fontFamily: T.body, fontSize: "0.96rem", lineHeight: 1.6, color: T.creamMuted, fontStyle: "italic" }}>
                  {t.quote}
                </blockquote>
                <figcaption style={{ display: "flex", alignItems: "center", gap: 11, marginTop: 18 }}>
                  <span style={{ width: 38, height: 38, borderRadius: "50%", border: `1px solid ${T.goldLine}`, display: "grid", placeItems: "center", color: T.gold, fontSize: "0.9rem", fontWeight: 600 }}>
                    {t.initials}
                  </span>
                  <span style={{ fontFamily: T.body, fontSize: "0.88rem", color: T.cream, fontWeight: 500 }}>{t.name}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* ── CTA FINAL — juste le CTA (aucun texte inventé) ────────── */}
        <section style={{ padding: "clamp(6px,2vw,20px) 0 clamp(64px,11vw,100px)", textAlign: "center" }}>
          <div aria-hidden style={{ height: 1, width: "min(200px, 60%)", margin: "0 auto clamp(32px,7vw,52px)", background: `linear-gradient(90deg, transparent, ${T.goldLine}, transparent)` }} />
          {cta("Je m'inscris à la conférence")}
        </section>
      </div>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer style={{ position: "relative", zIndex: 1, borderTop: `1px solid ${T.goldDim}`, padding: "26px 22px", textAlign: "center" }}>
        <div style={{ fontFamily: T.display, letterSpacing: "0.3em", color: T.gold, fontSize: "0.9rem" }}>AL&nbsp;BARAKA</div>
        <p style={{ fontFamily: T.body, fontSize: "0.72rem", color: T.creamDim, marginTop: 8 }}>
          © {new Date().getFullYear()} Al Baraka. Tous droits réservés.
        </p>
      </footer>

      <OptInModal open={open} onClose={() => setOpen(false)} tunnel={tunnel} />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="albt-rise" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <span style={{ height: 1, width: "clamp(24px,10vw,60px)", background: `linear-gradient(90deg, transparent, ${T.goldLine})` }} />
      <h2 style={{ margin: 0, fontFamily: T.body, fontWeight: 600, fontSize: "0.82rem", letterSpacing: "0.22em", textTransform: "uppercase", color: T.goldBright, textAlign: "center" }}>
        {children}
      </h2>
      <span style={{ height: 1, width: "clamp(24px,10vw,60px)", background: `linear-gradient(90deg, ${T.goldLine}, transparent)` }} />
    </div>
  );
}
