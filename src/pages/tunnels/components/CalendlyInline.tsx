// Agenda Calendly inline (tunnel VSL) — intégré directement sous la vidéo.
//
// Réutilise le pattern éprouvé du funnel /rdv (widget officiel Calendly) :
//   - injection de assets.calendly.com/.../widget.js
//   - <div class="calendly-inline-widget" data-url=...> auto-initialisé
//   - pré-remplissage nom/email (+ a1 = téléphone si question custom configurée)
//   - thème dark/or pour rester cohérent avec la page
//   - à la réservation (message calendly.event_scheduled) → event Meta « Schedule »
//
// La réservation confirmée alimente la table `calls` via le webhook Calendly
// existant (rapproché du contact par email/téléphone) → visible dans le CRM.
import { useEffect, useMemo, useState } from "react";
import { T } from "../theme";
import { trackCalendlyBooked } from "../lib/pixel";
import { getTunnelPrefill } from "../lib/source";

const WIDGET_JS = "https://assets.calendly.com/assets/external/widget.js";

export default function CalendlyInline({ url }: { url: string }) {
  const [loaded, setLoaded] = useState(false);
  const prefill = useMemo(() => getTunnelPrefill(), []);

  // URL Calendly : pré-remplissage + thème assorti.
  const finalUrl = useMemo(() => {
    try {
      const u = new URL(url);
      if (prefill?.firstName) u.searchParams.set("name", prefill.firstName);
      if (prefill?.email) u.searchParams.set("email", prefill.email);
      if (prefill?.phone) u.searchParams.set("a1", prefill.phone);
      u.searchParams.set("hide_gdpr_banner", "1");
      // Thème Calendly (hex sans #) — accordé à la marque Al Baraka.
      u.searchParams.set("background_color", "0E0B08");
      u.searchParams.set("text_color", "F6F1E7");
      u.searchParams.set("primary_color", "C9A04E");
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

  // Réservation confirmée → event Meta « Schedule ».
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e?.data?.event === "calendly.event_scheduled") trackCalendlyBooked();
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  return (
    <div
      style={{
        position: "relative",
        background: "#0E0B08",
        border: `1px solid ${T.goldLine}`,
        borderRadius: 16,
        padding: 6,
        boxShadow: "0 22px 60px rgba(0,0,0,0.5)",
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
              border: `3px solid ${T.goldDim}`,
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
