// ─────────────────────────────────────────────────────────────────────────
// TUNNEL VSL — Page de confirmation de prise de rendez-vous.
//
// Atteinte après réservation sur le Calendly de /vsl/merci, via la REDIRECTION
// Calendly (à configurer côté Calendly : Confirmation Page → Redirect to an
// external site → https://event.albarakaecosysteme.com/vsl/confirmation, avec
// « pass event details to your redirect » activé).
//
// Calendly ajoute alors ces paramètres d'URL qu'on affiche ici :
//   invitee_full_name, invitee_email, event_start_time, event_type_name,
//   assigned_to (la personne avec qui a lieu l'appel), answer_1… (réponses custom)
// ─────────────────────────────────────────────────────────────────────────
import { useEffect, useMemo } from "react";
import { T, ensureTunnelFonts } from "../theme";
import { trackCalendlyBooked } from "../lib/pixel";
import { getTunnelPrefill } from "../lib/source";
import TunnelBackground from "../components/TunnelBackground";

function param(sp: URLSearchParams, key: string): string | null {
  const v = sp.get(key);
  return v && v.trim() ? v.trim() : null;
}

function formatWhen(raw: string | null): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw; // format inattendu → affiche brut
  try {
    return d.toLocaleString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return raw;
  }
}

export default function VslConfirmation() {
  const data = useMemo(() => {
    const sp = new URLSearchParams(window.location.search);
    const fullName = param(sp, "invitee_full_name");
    const prefill = getTunnelPrefill();
    const firstName = prefill?.firstName || (fullName ? fullName.split(" ")[0] : null);
    return {
      firstName,
      fullName: fullName || (prefill?.firstName ?? null),
      email: param(sp, "invitee_email") || prefill?.email || null,
      when: formatWhen(param(sp, "event_start_time")),
      host: param(sp, "assigned_to"),
      eventType: param(sp, "event_type_name"),
      phone: param(sp, "answer_1") || prefill?.phone || null,
    };
  }, []);

  useEffect(() => {
    ensureTunnelFonts();
    document.title = "Rendez-vous confirmé — Al Baraka";
    trackCalendlyBooked(); // event Meta « Schedule » (prod uniquement)
  }, []);

  const rows: Array<{ icon: string; label: string; value: string | null }> = [
    { icon: "🗓️", label: "Date & heure", value: data.when },
    { icon: "👤", label: "Avec", value: data.host },
    { icon: "🎥", label: "Type d'appel", value: data.eventType },
    { icon: "✍️", label: "Ton nom", value: data.fullName },
    { icon: "✉️", label: "Ton email", value: data.email },
    { icon: "📞", label: "Ton téléphone", value: data.phone },
  ].filter((r) => r.value);

  return (
    <div style={{ position: "relative", minHeight: "100vh", background: T.bg, color: T.cream, fontFamily: T.body, overflowX: "hidden" }}>
      <TunnelBackground />

      <style>{`
        @keyframes albc-rise { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
        .albc-rise { animation: albc-rise .8s cubic-bezier(.2,.7,.3,1) both; }
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

      <main style={{ position: "relative", zIndex: 1, maxWidth: 640, margin: "0 auto", padding: "clamp(30px,6vw,56px) 22px clamp(56px,10vw,90px)", textAlign: "center" }}>
        <div className="albc-rise" style={{ width: 72, height: 72, margin: "0 auto 22px", borderRadius: "50%", border: `1px solid ${T.goldLine}`, display: "grid", placeItems: "center", background: "radial-gradient(circle, rgba(201,160,78,0.16), transparent 70%)" }}>
          <span style={{ fontSize: 38, lineHeight: 1 }}>✅</span>
        </div>

        <h1 className="albc-rise" style={{ animationDelay: "60ms", fontFamily: T.display, fontWeight: 600, fontSize: "clamp(1.9rem,6vw,3rem)", lineHeight: 1.1, color: T.cream, margin: "0 0 12px", textTransform: "uppercase" }}>
          Rendez-vous confirmé
        </h1>

        <p className="albc-rise" style={{ animationDelay: "120ms", fontFamily: T.body, fontSize: "clamp(1rem,2.7vw,1.15rem)", lineHeight: 1.55, color: T.creamMuted, margin: "0 auto 30px", maxWidth: 480 }}>
          {data.firstName ? <>Bravo <strong style={{ color: T.goldBright, fontWeight: 600 }}>{data.firstName}</strong>, ton appel est réservé.</> : <>Ton appel est réservé.</>} Voici le récapitulatif.
        </p>

        {/* Récapitulatif du RDV */}
        <div className="albc-rise" style={{ animationDelay: "180ms", textAlign: "left", background: T.bgCard, border: `1px solid ${T.goldLine}`, borderRadius: 20, padding: "clamp(20px,4vw,30px)", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
          {rows.length > 0 ? (
            rows.map((r, i) => (
              <div key={r.label} style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "13px 0", borderTop: i === 0 ? "none" : `1px solid ${T.creamFaint}` }}>
                <span style={{ fontSize: 20, lineHeight: 1.3, width: 26, textAlign: "center", flexShrink: 0 }}>{r.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: T.body, fontSize: "0.72rem", letterSpacing: "0.1em", textTransform: "uppercase", color: T.goldBright, marginBottom: 2 }}>{r.label}</div>
                  <div style={{ fontFamily: T.body, fontSize: "1.02rem", color: T.cream, lineHeight: 1.4, textTransform: r.label === "Date & heure" ? "capitalize" : "none", wordBreak: "break-word" }}>{r.value}</div>
                </div>
              </div>
            ))
          ) : (
            <p style={{ fontFamily: T.body, color: T.creamMuted, margin: 0, textAlign: "center" }}>
              Ton rendez-vous est bien enregistré. Tu vas recevoir tous les détails par email.
            </p>
          )}
        </div>

        <p className="albc-rise" style={{ animationDelay: "260ms", fontFamily: T.body, fontSize: "0.9rem", color: T.creamMuted, marginTop: 24, lineHeight: 1.6 }}>
          Tu vas recevoir la <strong style={{ color: T.cream }}>confirmation et le lien de l'appel par email</strong>. Pense à l'ajouter à ton agenda. À très vite, in shā’ Allah.
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
