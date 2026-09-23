// ─────────────────────────────────────────────────────────────────────────
// PAGES DE NURTURING — /video-1, /video-2, /video-3
//
// Une page par vidéo d'avant-conférence, servie UNIQUEMENT depuis
// `event.albarakaecosysteme.com` (cf. tunnelRoutes dans App.tsx et les règles
// d'hôte de vercel.json).
//
// Structure : bandeau de la conférence → les trois parties → la vidéo → le
// passage à la suivante. Rien à saisir, rien à réserver : le visiteur est
// déjà inscrit à la conférence, ces pages ne servent qu'à le faire patienter
// utilement. Le seul lien sortant est la vidéo suivante — et, sur la
// troisième, le groupe WhatsApp que les mails poussent déjà.
//
// La date vient de `useConference()`, comme les autres pages du module : la
// conférence bascule toute seule d'un dimanche au suivant, sans redéploiement.
// ─────────────────────────────────────────────────────────────────────────
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { T, ensureTunnelFonts } from "../theme";
import { useConference } from "../lib/conference";
import TunnelBackground from "../components/TunnelBackground";
import VimeoVideo from "../components/VimeoVideo";
import { VIDEOS, BANDEAU, cheminVideo } from "./content";

/** La barre des trois parties : où j'en suis, et où je peux aller. */
function Parties({ courante }: { courante: number }) {
  return (
    <nav
      aria-label="Les trois vidéos"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "clamp(8px,1.6vw,14px)",
        maxWidth: 820,
        margin: "0 auto clamp(30px,5vw,44px)",
      }}
    >
      {VIDEOS.map((v) => {
        const active = v.numero === courante;
        return (
          <Link
            key={v.numero}
            to={cheminVideo(v.numero)}
            aria-current={active ? "page" : undefined}
            style={{
              display: "block",
              textDecoration: "none",
              textAlign: "center",
              borderRadius: 12,
              padding: "clamp(10px,2vw,14px) clamp(6px,1.5vw,12px)",
              border: `1px solid ${active ? T.gold : T.goldDim}`,
              background: active ? T.goldDim : T.bgCard,
              transition: "border-color .2s, background .2s",
            }}
          >
            <div
              style={{
                fontFamily: T.body,
                fontSize: "clamp(0.6rem,1.8vw,0.68rem)",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: active ? T.goldBright : T.creamDim,
                marginBottom: 5,
              }}
            >
              Partie {v.numero}
            </div>
            <div
              style={{
                fontFamily: T.display,
                fontSize: "clamp(0.82rem,2.3vw,1rem)",
                lineHeight: 1.25,
                color: active ? T.cream : T.creamMuted,
              }}
            >
              {v.onglet}
            </div>
          </Link>
        );
      })}
    </nav>
  );
}

/** Le bouton doré, identique aux CTA des autres pages du module. */
function BoutonOr({ to, href, children }: { to?: string; href?: string; children: React.ReactNode }) {
  const style: React.CSSProperties = {
    display: "inline-block",
    fontFamily: T.body,
    fontWeight: 600,
    fontSize: "clamp(0.92rem,2.4vw,1.02rem)",
    letterSpacing: "0.02em",
    color: "#1A1407",
    background: `linear-gradient(180deg, ${T.goldBright} 0%, ${T.gold} 100%)`,
    borderRadius: 999,
    padding: "15px 34px",
    textDecoration: "none",
    boxShadow: `0 14px 34px ${T.goldGlow}`,
  };
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" style={style}>
        {children}
      </a>
    );
  }
  return (
    <Link to={to ?? "/"} style={style}>
      {children}
    </Link>
  );
}

export default function NurturingVideo({ numero }: { numero: 1 | 2 | 3 }) {
  const fiche = VIDEOS.find((v) => v.numero === numero)!;
  const suivante = VIDEOS.find((v) => v.numero === numero + 1) ?? null;
  const { dateLabel, whatsappGroupUrl } = useConference();

  useEffect(() => {
    ensureTunnelFonts();
    document.title = `Vidéo ${numero} — AL BARAKA`;
  }, [numero]);

  return (
    <div style={{ position: "relative", minHeight: "100vh", background: T.bg, color: T.cream, overflowX: "hidden" }}>
      <TunnelBackground />

      <style>{`
        @keyframes nurt-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
        .nurt-rise { animation: nurt-rise .8s cubic-bezier(.2,.7,.3,1) both; }
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
        {/* Bandeau : la conférence à laquelle ces vidéos préparent */}
        <div
          className="nurt-rise"
          style={{
            maxWidth: 640,
            margin: "0 auto clamp(26px,4vw,38px)",
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
          {BANDEAU} — {dateLabel}
        </div>

        <div className="nurt-rise" style={{ animationDelay: "60ms" }}>
          <Parties courante={numero} />
        </div>

        <h1
          className="nurt-rise"
          style={{
            animationDelay: "120ms",
            fontFamily: T.display,
            fontWeight: 700,
            fontSize: "clamp(1.35rem,4.2vw,2.3rem)",
            lineHeight: 1.2,
            color: T.cream,
            textAlign: "center",
            maxWidth: 820,
            margin: "0 auto clamp(26px,4vw,38px)",
          }}
        >
          <span style={{ color: T.gold }}>Vidéo #{numero} :</span> {fiche.accroche}
        </h1>

        <section className="nurt-rise" style={{ animationDelay: "180ms", maxWidth: 860, margin: "0 auto" }}>
          <VimeoVideo variant={fiche.video} titre={`Vidéo ${numero} — ${fiche.accroche}`} />
        </section>

        <div className="nurt-rise" style={{ animationDelay: "240ms", textAlign: "center", marginTop: "clamp(34px,6vw,54px)" }}>
          {suivante ? (
            <BoutonOr to={cheminVideo(suivante.numero)}>Accéder à la vidéo suivante</BoutonOr>
          ) : (
            <>
              {/* Dernière vidéo : plus rien à dérouler, on ramène au rendez-vous. */}
              <p
                style={{
                  fontFamily: T.body,
                  fontSize: "clamp(0.95rem,2.5vw,1.06rem)",
                  lineHeight: 1.65,
                  color: T.creamMuted,
                  maxWidth: 560,
                  margin: "0 auto 26px",
                }}
              >
                On se retrouve {dateLabel.charAt(0).toLowerCase()}
                {dateLabel.slice(1)}, in shā Allāh.
              </p>
              <BoutonOr href={whatsappGroupUrl}>Rejoindre le groupe WhatsApp</BoutonOr>
            </>
          )}
        </div>
      </main>

      <footer
        style={{
          position: "relative",
          zIndex: 1,
          borderTop: `1px solid ${T.goldDim}`,
          padding: "24px 22px",
          textAlign: "center",
        }}
      >
        <div style={{ fontFamily: T.display, letterSpacing: "0.3em", color: T.gold, fontSize: "0.9rem" }}>
          AL&nbsp;BARAKA
        </div>
      </footer>
    </div>
  );
}
