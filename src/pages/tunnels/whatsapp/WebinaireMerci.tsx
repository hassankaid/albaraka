// ─────────────────────────────────────────────────────────────────────────
// TUNNEL WHATSAPP — Page de remerciement (Thank-You).
//
// Adaptée de la TYP Systeme.io (go.albarakaecosysteme.com/remerciement-...) :
// on garde la structure « FÉLICITATIONS / inscription confirmée », mais on
// remplace toute la partie VSL (« ne quitte pas avant d'avoir regardé la vidéo »)
// par la dernière étape du tunnel WhatsApp : rejoindre le groupe.
//
// Le lien du groupe change par conférence → CONFERENCE.whatsappGroupUrl (config).
// ─────────────────────────────────────────────────────────────────────────
import { useEffect } from "react";
import { T, CONFERENCE, ensureTunnelFonts } from "../theme";
import { trackWhatsappJoin } from "../lib/pixel";
import TunnelBackground from "../components/TunnelBackground";
import VimeoVideo from "../components/VimeoVideo";
import { resolveVariant } from "../variants";

const WA_GREEN = "#25D366";
const WA_GREEN_DARK = "#1EB457";

export default function WebinaireMerci() {
  const variant = resolveVariant("wa", new URLSearchParams(window.location.search).get("v"));

  useEffect(() => {
    ensureTunnelFonts();
    document.title = "Inscription confirmée — Al Baraka";
  }, []);

  return (
    <div style={{ position: "relative", minHeight: "100vh", background: T.bg, color: T.cream, fontFamily: T.body, overflowX: "hidden" }}>
      <TunnelBackground />

      <style>{`
        @keyframes albm-rise { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
        @keyframes albm-pulse { 0%,100%{box-shadow:0 14px 34px rgba(37,211,102,.34)} 50%{box-shadow:0 14px 44px rgba(37,211,102,.55)} }
        .albm-rise { animation: albm-rise .8s cubic-bezier(.2,.7,.3,1) both; }
        .albm-wa {
          display:inline-flex; align-items:center; justify-content:center; gap:12px;
          padding:18px 32px; border:none; border-radius:999px; cursor:pointer; text-decoration:none;
          font-family:${T.body}; font-weight:700; font-size:clamp(1.02rem,2.6vw,1.16rem);
          color:#fff; background:linear-gradient(180deg, ${WA_GREEN}, ${WA_GREEN_DARK});
          animation: albm-pulse 2.4s ease-in-out infinite;
          transition:transform .18s ease;
        }
        .albm-wa:hover { transform:translateY(-2px); }
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

      <main style={{ position: "relative", zIndex: 1, maxWidth: 680, margin: "0 auto", padding: "clamp(24px,6vw,56px) 22px clamp(56px,10vw,90px)", textAlign: "center" }}>
        {/* Pastille de validation */}
        <div className="albm-rise" style={{ width: 76, height: 76, margin: "0 auto 26px", borderRadius: "50%", border: `1px solid ${T.goldLine}`, display: "grid", placeItems: "center", background: "radial-gradient(circle, rgba(201,160,78,0.16), transparent 70%)" }}>
          <span style={{ fontSize: 40, lineHeight: 1 }}>✅</span>
        </div>

        <h1 className="albm-rise" style={{ animationDelay: "60ms", fontFamily: T.display, fontWeight: 600, fontSize: "clamp(2rem,6.6vw,3.2rem)", lineHeight: 1.08, color: T.cream, margin: "0 0 16px", textTransform: "uppercase", letterSpacing: "0.01em" }}>
          Félicitations !
        </h1>

        <p className="albm-rise" style={{ animationDelay: "130ms", fontFamily: T.body, fontSize: "clamp(1.02rem,2.7vw,1.2rem)", lineHeight: 1.55, color: T.creamMuted, margin: "0 auto 34px", maxWidth: 520 }}>
          Ton inscription à la conférence du{" "}
          <strong style={{ color: T.goldBright, fontWeight: 600 }}>{CONFERENCE.dateLabel}</strong>{" "}
          ({CONFERENCE.tz}) est confirmée.
        </p>

        {/* Vidéo (variante A/B) */}
        <p className="albm-rise" style={{ animationDelay: "170ms", fontFamily: T.body, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", fontSize: "0.78rem", color: T.goldBright, margin: "0 0 14px" }}>
          ⚠️ Regarde cette vidéo en entier
        </p>
        <div className="albm-rise" style={{ animationDelay: "200ms", marginBottom: 30 }}>
          <VimeoVideo variant={variant} />
        </div>

        {/* Dernière étape — carte + bouton WhatsApp */}
        <div className="albm-rise" style={{ animationDelay: "210ms", padding: "clamp(26px,5vw,40px) clamp(20px,4vw,36px)", borderRadius: 22, border: `1px solid ${T.goldLine}`, background: "radial-gradient(ellipse 90% 120% at 50% 0%, rgba(201,160,78,0.10), transparent 70%), rgba(255,255,255,0.02)" }}>
          <p style={{ fontFamily: T.body, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", fontSize: "0.78rem", color: T.goldBright, margin: "0 0 12px" }}>
            ⚠️ Dernière étape obligatoire
          </p>
          <h2 style={{ fontFamily: T.display, fontWeight: 600, fontSize: "clamp(1.4rem,4.4vw,1.9rem)", lineHeight: 1.2, color: T.cream, margin: "0 auto 12px", maxWidth: 460 }}>
            Rejoins le groupe WhatsApp
          </h2>
          <p style={{ fontFamily: T.body, fontSize: "clamp(0.95rem,2.5vw,1.05rem)", lineHeight: 1.55, color: T.creamMuted, margin: "0 auto 26px", maxWidth: 440 }}>
            C'est là que tu recevras le <strong style={{ color: T.cream, fontWeight: 600 }}>lien de la conférence</strong> et les rappels. Sans ça, tu risques de la manquer.
          </p>

          <a
            className="albm-wa"
            href={CONFERENCE.whatsappGroupUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackWhatsappJoin()}
          >
            <WhatsAppIcon />
            Rejoindre le groupe WhatsApp
          </a>
        </div>

        <p className="albm-rise" style={{ animationDelay: "300ms", fontFamily: T.body, fontSize: "0.8rem", color: T.creamDim, marginTop: 22 }}>
          À tout de suite, in shā’ Allah.
        </p>
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

function WhatsAppIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.148-.669-1.611-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.999-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413"/>
    </svg>
  );
}
