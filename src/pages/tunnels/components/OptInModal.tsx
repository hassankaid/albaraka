// Pop-in d'inscription du tunnel WhatsApp.
//
// Reproduit le pop-in Systeme.io de référence — y compris son PARTI PRIS :
// un panneau CLAIR (blanc/ivoire) qui ressort fort sur la page sombre.
//   Titre  : « INSCRIS-TOI GRATUITEMENT À LA CONFÉRENCE »
//   Sous-titre doré : date + heure exactes de la conférence
//   « Veuillez renseigner les informations ci-dessous »
//   Prénom / Email / Téléphone (drapeau + indicatif) / « Je valide mon inscription »
//
// À la validation : event Meta « Lead » → POST vers l'edge function
// tunnel-lead-submit (find_or_create_contact + INSERT leads, source webi_wa_*)
// → redirection vers la page de remerciement /webinaire/merci.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { T, CONFERENCE } from "../theme";
import { trackLead } from "../lib/pixel";
import { submitTunnelLead } from "../lib/api";
import { getAttribution } from "../lib/source";
import type { TunnelConfig } from "../config";
import PhoneField, { isValidPhoneNumber } from "./PhoneField";

interface Props {
  open: boolean;
  onClose: () => void;
  tunnel: TunnelConfig;
}

// Palette CLAIRE du pop-in (contraste fort sur la page sombre, comme la SIO).
const L = {
  panel: "#FCF9F3", // ivoire chaud
  ink: "#1A1206", // texte principal (near-black chaud)
  inkMuted: "rgba(26,18,6,0.64)",
  inkDim: "rgba(26,18,6,0.44)",
  fieldBg: "#FFFFFF",
  fieldBorder: "#E4DBCB",
  gold: "#C9A04E",
  goldBright: "#E4C57A",
  goldText: "#9A7328", // or plus foncé, lisible sur fond clair
  danger: "#B23A2E",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function OptInModal({ open, onClose, tunnel }: Props) {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!firstName.trim()) return setError("Ton prénom est requis.");
    if (!EMAIL_RE.test(email.trim())) return setError("Ton email ne semble pas valide.");
    if (!phone || !isValidPhoneNumber(phone)) return setError("Ton numéro de téléphone n'est pas valide.");

    setSubmitting(true);
    try {
      // 1) Création du lead dans le CRM (edge function), avec la source du tunnel.
      await submitTunnelLead({ first_name: firstName.trim(), email: email.trim(), phone }, tunnel);
      // 2) Event Meta « Lead » (Advanced Matching) — no-op hors prod.
      await trackLead({ firstName: firstName.trim(), email: email.trim(), phone });
      // 3) Page de remerciement propre au tunnel (en portant la variante A/B).
      const variant = getAttribution(tunnel)?.variant;
      navigate(variant ? `${tunnel.merciPath}?v=${encodeURIComponent(variant)}` : tunnel.merciPath);
    } catch (err) {
      console.warn("[tunnel] soumission échouée :", err);
      setSubmitting(false);
      setError("Une erreur est survenue. Réessaie dans un instant.");
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        background: "rgba(4,3,2,0.82)",
        backdropFilter: "blur(6px)",
        animation: "albt-fade 0.25s ease both",
        overflowY: "auto",
      }}
    >
      <style>{`
        @keyframes albt-fade { from{opacity:0} to{opacity:1} }
        @keyframes albt-pop { from{opacity:0;transform:translateY(14px) scale(.98)} to{opacity:1;transform:none} }
        .albt-linput::placeholder { color: ${L.inkDim}; }
        .albt-linput:focus { border-color: ${L.gold} !important; box-shadow: 0 0 0 3px rgba(201,160,78,0.18) !important; }
      `}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "460px",
          margin: "auto",
          background: L.panel,
          borderRadius: "24px",
          padding: "clamp(26px, 5vw, 40px)",
          boxShadow: "0 40px 90px rgba(0,0,0,0.55), 0 0 0 1px rgba(201,160,78,0.25)",
          animation: "albt-pop 0.3s cubic-bezier(.2,.7,.3,1) both",
          position: "relative",
        }}
      >
        <button
          onClick={onClose}
          aria-label="Fermer"
          style={{ position: "absolute", top: 14, right: 18, background: "none", border: "none", color: L.inkDim, fontSize: 26, cursor: "pointer", lineHeight: 1 }}
        >
          ×
        </button>

        <h3 style={{ fontFamily: T.display, color: L.ink, fontSize: "clamp(1.4rem,5vw,1.8rem)", lineHeight: 1.15, textAlign: "center", margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.005em" }}>
          Inscris-toi gratuitement à la conférence
        </h3>
        <p style={{ fontFamily: T.body, color: L.goldText, fontWeight: 700, fontSize: "1rem", textAlign: "center", margin: "0 0 6px" }}>
          {CONFERENCE.dateLabel} · {CONFERENCE.tz}
        </p>
        <p style={{ fontFamily: T.body, color: L.inkMuted, fontSize: "0.9rem", textAlign: "center", margin: "0 0 22px" }}>
          Veuillez renseigner les informations ci-dessous
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            className="albt-linput"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Prénom"
            autoComplete="given-name"
            style={inputStyle}
          />
          <input
            className="albt-linput"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            type="email"
            autoComplete="email"
            style={inputStyle}
          />
          <PhoneField value={phone} onChange={setPhone} />

          {error && (
            <div style={{ color: L.danger, fontFamily: T.body, fontSize: "0.85rem", fontWeight: 500 }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              marginTop: 6,
              padding: "16px 20px",
              border: "none",
              borderRadius: "999px",
              fontFamily: T.body,
              fontWeight: 700,
              fontSize: "1.02rem",
              color: "#1A1206",
              cursor: submitting ? "default" : "pointer",
              background: `linear-gradient(180deg, ${L.goldBright}, ${L.gold})`,
              boxShadow: "0 12px 28px rgba(201,160,78,0.4)",
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? "Un instant…" : "Je valide mon inscription"}
          </button>

          <p style={{ fontFamily: T.body, color: L.inkDim, fontSize: "0.72rem", textAlign: "center", margin: "6px 0 0", lineHeight: 1.5 }}>
            Tes informations restent confidentielles. Zéro spam.
          </p>
        </form>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  background: L.fieldBg,
  border: `1px solid ${L.fieldBorder}`,
  borderRadius: "12px",
  color: L.ink,
  fontFamily: T.body,
  fontSize: "1rem",
  outline: "none",
  transition: "border-color .15s, box-shadow .15s",
};
