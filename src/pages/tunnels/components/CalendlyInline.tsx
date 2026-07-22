// Agenda Calendly inline (tunnel VSL) — intégré directement sous la vidéo.
//
// Réutilise le pattern éprouvé du funnel /rdv (widget officiel Calendly) :
//   - injection de assets.calendly.com/.../widget.js
//   - <div class="calendly-inline-widget" data-url=...> auto-initialisé
//   - pré-remplissage nom/email (+ a1 = téléphone si question custom configurée)
//   - FOND CLAIR pour ressortir sur la page sombre (demande Hassan)
//
// La réservation confirmée déclenche la REDIRECTION Calendly (configurée côté
// Calendly) vers /vsl/confirmation qui affiche les détails + l'event Meta.
import { useEffect, useMemo, useState } from "react";
import { T } from "../theme";
import { getTunnelPrefill } from "../lib/source";

const WIDGET_JS = "https://assets.calendly.com/assets/external/widget.js";

export default function CalendlyInline({ url }: { url: string }) {
  const [loaded, setLoaded] = useState(false);
  const prefill = useMemo(() => getTunnelPrefill(), []);

  // URL Calendly : pré-remplissage + thème CLAIR.
  const finalUrl = useMemo(() => {
    try {
      const u = new URL(url);
      if (prefill?.firstName) u.searchParams.set("name", prefill.firstName);
      if (prefill?.email) u.searchParams.set("email", prefill.email);
      if (prefill?.phone) u.searchParams.set("a1", prefill.phone);
      u.searchParams.set("hide_gdpr_banner", "1");
      // Thème CLAIR (hex sans #) — l'agenda ressort sur le fond sombre de la page.
      u.searchParams.set("background_color", "ffffff");
      u.searchParams.set("text_color", "1a1206");
      u.searchParams.set("primary_color", "c9a04e");
      return u.toString();
    } catch {
      return url;
    }
  }, [url, prefill]);

  // Injection du script officiel Calendly (auto-initialise .calendly-inline-widget).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ((window as any).Calendly) {
      setLoaded(true);
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(`script[src='${WIDGET_JS}']`);
    if (existing) {
      existing.addEventListener("load", () => setLoaded(true));
      if ((window as any).Calendly) setLoaded(true);
      return;
    }
    const s = document.createElement("script");
    s.src = WIDGET_JS;
    s.async = true;
    s.onload = () => setLoaded(true);
    document.body.appendChild(s);
  }, []);

  return (
    <div
      style={{
        position: "relative",
        background: "#FFFFFF",
        border: `1px solid ${T.goldLine}`,
        borderRadius: 18,
        padding: 6,
        boxShadow: "0 24px 60px rgba(0,0,0,0.45), 0 0 0 1px rgba(201,160,78,0.10)",
        overflow: "hidden",
      }}
    >
      <div className="calendly-inline-widget" data-url={finalUrl} style={{ minWidth: 280, height: 720 }} />
      {!loaded && (
        <div
          style={{
            position: "absolute",
            inset: 0,
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
              border: "3px solid rgba(201,160,78,0.25)",
              borderTopColor: T.gold,
              animation: "albcal-spin 0.9s linear infinite",
            }}
          />
        </div>
      )}
      <style>{`@keyframes albcal-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
