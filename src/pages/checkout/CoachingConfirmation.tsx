// CoachingConfirmation — /coaching/confirmation : la page vers laquelle l'agenda
// Calendly « COACHING INDIVIDUEL - AL BARAKA » redirige après une réservation
// (demande de Hassan, 03/11/2026). Elle remplace la redirection héritée de
// Liberty, qui envoyait une fausse conversion aux pixels Liberty.
//
// AUCUN pixel ni évènement ici : un coaching n'est pas une conversion publicitaire.
//
// Calendly transmet la réservation dans l'URL (« Passer les détails de
// l'évènement à votre page redirigée ») : invitee_full_name, event_start_time,
// assigned_to, event_type_name. Sans eux (page ouverte à la main), on affiche une
// confirmation générique, sans date.
import { useEffect, useMemo } from "react";
import { CalendarCheck, Clock, Mail, User } from "lucide-react";
import CheckoutCanvas from "./CheckoutCanvas";

const OR = "#C9A04E";
const CREME = "#F5F1E6";
const CREME_DOUX = "rgba(245,241,230,0.62)";
const FUSEAU = "Europe/Paris";

function param(sp: URLSearchParams, cle: string): string | null {
  const v = sp.get(cle);
  return v && v.trim() ? v.trim() : null;
}

export function lireReservation(search: string) {
  const sp = new URLSearchParams(search);
  const brut = param(sp, "event_start_time");
  const debut = brut ? new Date(brut) : null;
  const date = debut && !isNaN(debut.getTime()) ? debut : null;
  const nom = param(sp, "invitee_full_name");
  const morceau = (opts: Intl.DateTimeFormatOptions) => (date ? date.toLocaleString("fr-FR", { timeZone: FUSEAU, ...opts }) : null);
  return {
    prenom: nom ? nom.split(" ")[0] : null,
    coach: param(sp, "assigned_to"),
    jourSemaine: morceau({ weekday: "long" }),
    jour: morceau({ day: "numeric" }),
    mois: morceau({ month: "long" }),
    annee: morceau({ year: "numeric" }),
    heure: morceau({ hour: "2-digit", minute: "2-digit" }),
  };
}

const capitale = (s: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export default function CoachingConfirmation() {
  const r = useMemo(() => lireReservation(window.location.search), []);

  useEffect(() => {
    document.title = "Coaching confirmé — Al Baraka";
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0A0A0A",
        color: CREME,
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: "4rem 1.25rem 3rem",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <CheckoutCanvas />
      <div style={{ maxWidth: 440, margin: "0 auto", position: "relative", zIndex: 2, textAlign: "center" }}>
        <CalendarCheck size={34} strokeWidth={1.4} color={OR} style={{ margin: "0 auto 14px" }} />
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: "clamp(32px, 6vw, 40px)",
            fontWeight: 500,
            margin: "0 0 10px",
            letterSpacing: "0.06em",
            background: "linear-gradient(180deg, #F5F1E6 0%, #E4C57A 50%, #C9A04E 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Coaching confirmé
        </h1>
        <p style={{ color: CREME_DOUX, fontSize: 15, lineHeight: 1.6, margin: "0 auto 28px", maxWidth: 360 }}>
          {r.prenom ? `Bravo ${r.prenom}, ` : ""}ton coaching individuel est réservé. On a hâte de travailler avec toi.
        </p>

        {r.jour ? (
          <div
            style={{
              display: "flex",
              gap: 18,
              alignItems: "stretch",
              textAlign: "left",
              border: `1px solid ${OR}`,
              borderRadius: 16,
              padding: 16,
              background: "linear-gradient(180deg, rgba(201,160,78,0.10) 0%, rgba(201,160,78,0.02) 100%)",
              marginBottom: 24,
            }}
          >
            {/* Le dateur */}
            <div
              style={{
                flexShrink: 0,
                width: 92,
                borderRadius: 12,
                overflow: "hidden",
                background: CREME,
                color: "#0A0A0A",
                textAlign: "center",
                boxShadow: "0 8px 24px rgba(201,160,78,0.25)",
              }}
            >
              <div style={{ background: OR, color: "#0A0A0A", fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", padding: "6px 0" }}>
                {r.mois}
              </div>
              <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1, padding: "10px 0 2px" }}>{r.jour}</div>
              <div style={{ fontSize: 11.5, fontWeight: 600, paddingBottom: 9, textTransform: "capitalize" }}>{r.jourSemaine}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 9, fontSize: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 15.5 }}>
                {capitale(r.jourSemaine)} {r.jour} {r.mois} {r.annee}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", color: CREME_DOUX }}>
                <Clock size={15} color={OR} /> {r.heure} (heure de Paris) · 1 h
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", color: CREME_DOUX }}>
                <User size={15} color={OR} /> Avec {r.coach ?? "ta coach"}
              </div>
            </div>
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            textAlign: "left",
            border: "1px solid rgba(201,160,78,0.18)",
            borderRadius: 12,
            padding: "14px 16px",
            marginBottom: 30,
          }}
        >
          <Mail size={18} color={OR} style={{ flexShrink: 0 }} />
          <div style={{ fontSize: 13, color: CREME_DOUX, lineHeight: 1.55 }}>
            Tu vas recevoir <b style={{ color: CREME }}>l'invitation et le lien de la séance par e-mail</b>. Ajoute-la à ton
            agenda et prépare tes questions : c'est ton moment.
          </div>
        </div>

        <a
          href="https://plateforme.albarakaecosysteme.com"
          style={{ display: "inline-block", background: OR, color: "#0A0A0A", fontWeight: 700, fontSize: 14, padding: "12px 24px", borderRadius: 999, textDecoration: "none" }}
        >
          Retour à la plateforme
        </a>
        <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontStyle: "italic", color: CREME_DOUX, marginTop: 26 }}>
          Qu'Allah facilite ton parcours, in shā' Allah.
        </p>
      </div>
    </div>
  );
}
