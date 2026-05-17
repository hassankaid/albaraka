// RdvCoordonnees — Page 2 étape 1 du funnel /rdv.
// Capture les coordonnées du lead (prénom, nom, email, téléphone). À la
// validation, on appelle l'edge function rdv-funnel-submit (action="coords")
// qui INSERT le row et retourne le lead_id. On stocke en sessionStorage puis
// on redirige vers /rdv/questions.
//
// Téléphone : utilise <PhoneInputField> (composant maison wrappant
// react-phone-number-input) avec drapeau pays, indicateur téléphonique, et
// masque de saisie automatique.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/al-baraka-logo-v2.png";
import { PhoneInputField, isValidPhoneNumber } from "@/components/ui/PhoneInputField";
import { THEME, setStoredLeadId, setStoredPrefill } from "./rdvShared";

const EMAIL_RX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

export default function RdvCoordonnees() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validate(): string | null {
    if (!firstName.trim() || firstName.trim().length < 2) return "Veuillez saisir votre prénom.";
    if (!lastName.trim() || lastName.trim().length < 2) return "Veuillez saisir votre nom.";
    if (!email.trim() || !EMAIL_RX.test(email.trim())) return "Veuillez saisir un email valide.";
    if (!phone || !isValidPhoneNumber(phone)) return "Veuillez saisir un numéro de téléphone valide.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      // Détection du country code depuis le numéro E.164 (ex : "+33612..." → on
      // ne le calcule pas ici, le composant le sait mais on n'a pas accès direct.
      // L'edge function l'accepte en optionnel, le matching côté webhook
      // Calendly se fait sur le numéro E.164 entier — donc OK).
      const { data, error: fnErr } = await supabase.functions.invoke<{
        ok?: boolean;
        lead_id?: string;
        error?: string;
      }>("rdv-funnel-submit", {
        body: {
          action: "coords",
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone,
        },
      });

      if (fnErr) {
        // Tente d'extraire le détail du body de réponse (400 avec JSON)
        const ctx = (fnErr as { context?: Response }).context;
        let parsed: any = null;
        if (ctx && typeof ctx.json === "function") {
          try {
            parsed = await ctx.json();
          } catch {
            /* ignore */
          }
        }
        const code = parsed?.error || fnErr.message || "unknown_error";
        console.error("[RdvCoordonnees] submit error", code, fnErr);
        setError(
          code === "invalid_email"
            ? "Votre email semble invalide."
            : code === "invalid_phone"
            ? "Votre numéro de téléphone semble invalide."
            : "Une erreur est survenue. Merci de réessayer."
        );
        setSubmitting(false);
        return;
      }

      if (!data?.ok || !data?.lead_id) {
        setError("Une erreur est survenue. Merci de réessayer.");
        setSubmitting(false);
        return;
      }

      setStoredLeadId(data.lead_id);
      setStoredPrefill({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone!,
      });

      navigate("/rdv/questions");
    } catch (e: any) {
      console.error("[RdvCoordonnees] unexpected error", e);
      setError("Une erreur est survenue. Merci de réessayer.");
      setSubmitting(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "#0F0E0C",
    border: `1px solid ${THEME.goldLine}`,
    borderRadius: 10,
    color: THEME.cream,
    padding: "12px 14px",
    fontSize: 15,
    fontFamily: "inherit",
    outline: "none",
    transition: "border-color 120ms ease, box-shadow 120ms ease",
  };
  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 12,
    fontWeight: 500,
    color: THEME.cream,
    marginBottom: 6,
    letterSpacing: "0.03em",
  };

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
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "48px 20px 60px",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at top, rgba(201,160,78,0.10) 0%, rgba(10,9,8,0) 55%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 460,
          animation: "rdv-fade-in 0.45s ease-out",
        }}
      >
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
              fontSize: 10.5,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: THEME.gold,
              marginBottom: 10,
            }}
          >
            Vos coordonnées
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, lineHeight: 1.3 }}>
            Avant de commencer
          </h1>
          <p
            style={{
              color: THEME.creamMuted,
              fontSize: 13.5,
              lineHeight: 1.55,
              margin: "10px auto 0",
              maxWidth: 380,
            }}
          >
            Renseignez vos coordonnées : nous les utiliserons pour préparer
            votre rendez-vous.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
            <div>
              <label htmlFor="rdv-first-name" style={labelStyle}>
                Prénom
              </label>
              <input
                id="rdv-first-name"
                type="text"
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                style={inputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = THEME.gold;
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${THEME.goldDim}`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = THEME.goldLine;
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>
            <div>
              <label htmlFor="rdv-last-name" style={labelStyle}>
                Nom
              </label>
              <input
                id="rdv-last-name"
                type="text"
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                style={inputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = THEME.gold;
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${THEME.goldDim}`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = THEME.goldLine;
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label htmlFor="rdv-email" style={labelStyle}>
              Adresse e-mail
            </label>
            <input
              id="rdv-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = THEME.gold;
                e.currentTarget.style.boxShadow = `0 0 0 3px ${THEME.goldDim}`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = THEME.goldLine;
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          <div style={{ marginBottom: 22 }}>
            <label htmlFor="rdv-phone" style={labelStyle}>
              Numéro de téléphone
            </label>
            <div className="rdv-phone-wrapper">
              <PhoneInputField
                id="rdv-phone"
                value={phone}
                onChange={setPhone}
                defaultCountry="FR"
                placeholder="Ex : 6 12 34 56 78"
              />
            </div>
          </div>

          {error && (
            <div
              style={{
                marginBottom: 16,
                padding: "10px 14px",
                borderRadius: 8,
                background: "rgba(224,138,106,0.10)",
                border: "1px solid rgba(224,138,106,0.35)",
                color: THEME.danger,
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: "100%",
              background: submitting
                ? THEME.goldDim
                : `linear-gradient(180deg, ${THEME.goldBright} 0%, ${THEME.gold} 100%)`,
              color: submitting ? THEME.cream : "#1A1407",
              fontWeight: 600,
              fontSize: 15,
              padding: "13px 24px",
              borderRadius: 999,
              border: "none",
              cursor: submitting ? "default" : "pointer",
              boxShadow: submitting
                ? "none"
                : "0 8px 30px rgba(201,160,78,0.32), inset 0 1px 0 rgba(255,255,255,0.25)",
              transition: "transform 120ms ease, box-shadow 120ms ease, background 120ms ease",
              letterSpacing: "0.01em",
            }}
          >
            {submitting ? "Validation en cours…" : "Continuer →"}
          </button>
        </form>
      </div>

      {/* Style spécifique pour customiser le PhoneInputField dans le thème doré */}
      <style>{`
        @keyframes rdv-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .rdv-phone-wrapper .PhoneInput {
          display: flex;
          align-items: stretch;
          background: #0F0E0C;
          border: 1px solid ${THEME.goldLine};
          border-radius: 10px;
          overflow: hidden;
          transition: border-color 120ms ease, box-shadow 120ms ease;
        }
        .rdv-phone-wrapper .PhoneInput:focus-within {
          border-color: ${THEME.gold};
          box-shadow: 0 0 0 3px ${THEME.goldDim};
        }
        .rdv-phone-wrapper .PhoneInputCountry {
          background: rgba(201,160,78,0.06);
          padding: 0 10px;
          border-right: 1px solid ${THEME.goldLine};
          color: ${THEME.cream};
        }
        .rdv-phone-wrapper .PhoneInputCountrySelectArrow {
          color: ${THEME.gold};
          opacity: 1;
        }
        .rdv-phone-wrapper .PhoneInputInput {
          flex: 1;
          background: transparent;
          color: ${THEME.cream};
          font-size: 15px;
          font-family: inherit;
          padding: 12px 14px;
          border: none;
          outline: none;
        }
        .rdv-phone-wrapper .PhoneInputInput::placeholder {
          color: ${THEME.creamDim};
        }
      `}</style>
    </div>
  );
}
