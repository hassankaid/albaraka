// RdvCalendly — Page 3 du funnel /rdv.
// Atteinte uniquement après les 5 OUI consécutifs (status='qualified').
//
// Affiche :
//   - Un message de validation ("Parfait, choisissez maintenant votre créneau")
//   - L'embed Calendly inline pré-rempli avec prénom + nom + email (a1 =
//     téléphone si la question custom est configurée côté Calendly).
//   - Un récap des 3 étapes (Choisir un créneau / Recevoir la confirmation /
//     L'appel stratégique).
//
// L'URL Calendly est lue depuis VITE_CALENDLY_URL (variable d'env Vercel).
// Le booking confirmé déclenche le webhook Calendly existant qui alimente
// la table `calls`, puis le trigger SQL rapproche automatiquement le lead
// du funnel via email/téléphone pour passer status='booked'.
//
// Garde-fou : si pas de lead_id en sessionStorage → redirect /rdv.

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import logo from "@/assets/al-baraka-logo-v2.png";
import { THEME, getStoredLeadId, getStoredPrefill } from "./rdvShared";

const CALENDLY_URL = (import.meta as any).env?.VITE_CALENDLY_URL as string | undefined;

export default function RdvCalendly() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const prefill = useMemo(() => getStoredPrefill(), []);

  useEffect(() => {
    if (!getStoredLeadId()) {
      navigate("/rdv", { replace: true });
      return;
    }
    setReady(true);
  }, [navigate]);

  // Injection du script officiel Calendly (widget inline)
  useEffect(() => {
    if (!ready) return;
    if (typeof window === "undefined") return;
    if ((window as any).Calendly) {
      setScriptLoaded(true);
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      "script[src='https://assets.calendly.com/assets/external/widget.js']"
    );
    if (existing) {
      // Script déjà présent (cas navigation multi-pages, peu probable ici)
      existing.addEventListener("load", () => setScriptLoaded(true));
      if ((window as any).Calendly) setScriptLoaded(true);
      return;
    }
    const s = document.createElement("script");
    s.src = "https://assets.calendly.com/assets/external/widget.js";
    s.async = true;
    s.onload = () => setScriptLoaded(true);
    document.body.appendChild(s);
  }, [ready]);

  // Construction de l'URL Calendly avec pré-remplissage
  const calendlyUrlWithPrefill = useMemo(() => {
    if (!CALENDLY_URL) return null;
    if (!prefill) return CALENDLY_URL;
    const url = new URL(CALENDLY_URL);
    const fullName = `${prefill.first_name} ${prefill.last_name}`.trim();
    url.searchParams.set("name", fullName);
    url.searchParams.set("email", prefill.email);
    // Calendly pré-remplit les "Custom Questions" via a1, a2, etc. Si Sidali
    // configure une question "Téléphone" en première position, le téléphone
    // sera pré-rempli ici. Sinon, le param sera ignoré sans casser.
    url.searchParams.set("a1", prefill.phone);
    // Masque les champs Calendly redondants (déjà remplis par notre form)
    url.searchParams.set("hide_gdpr_banner", "1");
    return url.toString();
  }, [prefill]);

  if (!ready) return null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: THEME.bg,
        color: THEME.cream,
        position: "relative",
        overflow: "hidden",
        fontFamily:
          '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: "40px 20px 60px",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at top, rgba(201,160,78,0.12) 0%, rgba(10,9,8,0) 55%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 820,
          marginInline: "auto",
          animation: "rdv-fade-in 0.5s ease-out",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <img
            src={logo}
            alt="AL BARAKA"
            style={{
              width: 64,
              height: 64,
              objectFit: "contain",
              marginInline: "auto",
              display: "block",
              marginBottom: 18,
              filter: "drop-shadow(0 0 22px rgba(201,160,78,0.28))",
            }}
          />
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: "rgba(201,160,78,0.14)",
              border: `1px solid ${THEME.goldLine}`,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <CheckCircle2 size={26} color={THEME.goldBright} />
          </div>
          <div
            style={{
              fontSize: 10.5,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: THEME.gold,
              marginBottom: 10,
            }}
          >
            Pré-qualification validée
          </div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 600,
              margin: 0,
              marginBottom: 10,
              lineHeight: 1.3,
            }}
          >
            Parfait, choisissez maintenant votre créneau
          </h1>
          <p
            style={{
              color: THEME.creamMuted,
              fontSize: 14.5,
              lineHeight: 1.6,
              margin: "0 auto",
              maxWidth: 520,
            }}
          >
            Vos coordonnées sont déjà pré-remplies. Sélectionnez simplement
            le jour et l'heure qui vous conviennent ci-dessous.
          </p>
        </div>

        {/* Récap 3 étapes */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
            marginBottom: 28,
          }}
        >
          {[
            { n: 1, label: "Choisir un créneau" },
            { n: 2, label: "Recevoir la confirmation par mail" },
            { n: 3, label: "L'appel stratégique" },
          ].map((step) => (
            <div
              key={step.n}
              style={{
                background: THEME.bgSoft,
                border: `1px solid ${THEME.goldLine}`,
                borderRadius: 12,
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: THEME.goldDim,
                  color: THEME.goldBright,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {step.n}
              </div>
              <div style={{ fontSize: 13.5, color: THEME.cream, lineHeight: 1.4 }}>{step.label}</div>
            </div>
          ))}
        </div>

        {/* Embed Calendly */}
        {!CALENDLY_URL ? (
          <div
            style={{
              background: "rgba(224,138,106,0.08)",
              border: "1px solid rgba(224,138,106,0.35)",
              borderRadius: 12,
              padding: "18px 22px",
              color: THEME.danger,
              fontSize: 13.5,
              textAlign: "center",
            }}
          >
            Configuration manquante : la variable d'environnement{" "}
            <code>VITE_CALENDLY_URL</code> n'est pas définie. Merci de
            contacter l'administrateur.
          </div>
        ) : (
          <div
            style={{
              background: THEME.bgSoft,
              border: `1px solid ${THEME.goldLine}`,
              borderRadius: 16,
              padding: 8,
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
              overflow: "hidden",
            }}
          >
            <div
              className="calendly-inline-widget"
              data-url={calendlyUrlWithPrefill || CALENDLY_URL}
              style={{ minWidth: 280, height: 720 }}
            />
            {!scriptLoaded && (
              <div
                style={{
                  position: "relative",
                  marginTop: -720,
                  height: 720,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  pointerEvents: "none",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    border: `3px solid ${THEME.goldDim}`,
                    borderTopColor: THEME.gold,
                    animation: "rdv-spin 0.9s linear infinite",
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes rdv-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes rdv-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
