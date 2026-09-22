// ─────────────────────────────────────────────────────────────────────────
// Porte d'entrée du questionnaire sans lien personnel — /questionnaire
//
// L'annonce Discord ne peut pas porter un lien par élève : elle renvoie ici.
// On demande l'adresse, et le lien personnel part par e-mail.
//
// Le lien n'est jamais affiché à l'écran, et la réponse est la même que
// l'adresse soit connue ou non : cette page est publique, elle ne doit pas
// permettre de savoir qui est élève d'AL BARAKA.
// ─────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/client";
import logo from "@/assets/al-baraka-logo-v2.png";
import { THEME as T } from "./questions";

const EMAIL_RX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function QuestionnaireEntree() {
  const [email, setEmail] = useState("");
  const [etat, setEtat] = useState<"saisie" | "envoi" | "envoye">("saisie");
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => { document.title = "Questionnaire — AL BARAKA"; }, []);

  const envoyer = async () => {
    if (!EMAIL_RX.test(email.trim())) {
      setErreur("Merci d'indiquer une adresse e-mail valide.");
      return;
    }
    setErreur(null);
    setEtat("envoi");
    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/questionnaire-retrouver-lien`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ email: email.trim() }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErreur(d?.message ?? "Réessaie dans un instant."); setEtat("saisie"); return; }
      setEtat("envoye");
    } catch {
      setErreur("Réessaie dans un instant.");
      setEtat("saisie");
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: T.bg, color: T.cream,
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: "28px 18px 56px",
    }}>
      <div style={{ textAlign: "center" }}>
        <img src={logo} alt="AL BARAKA" style={{ height: 46, opacity: 0.95 }} />
      </div>

      <div style={{ maxWidth: 480, margin: "40px auto 0" }}>
        {etat === "envoye" ? (
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: 62, height: 62, margin: "0 auto 22px", borderRadius: "50%",
              border: `1px solid ${T.goldLine}`, display: "grid", placeItems: "center",
              background: "radial-gradient(circle, rgba(201,160,78,0.16), transparent 70%)",
            }}>
              <span style={{ fontSize: 28, lineHeight: 1 }}>✉️</span>
            </div>
            <h1 style={{ fontSize: 22, lineHeight: 1.25, margin: "0 0 14px" }}>Regarde tes e-mails</h1>
            <p style={{ color: T.creamMuted, fontSize: 15, lineHeight: 1.6, margin: 0 }}>
              Si cette adresse est bien celle d'un élève, ton lien personnel vient de t'être envoyé.
              Pense à regarder dans les indésirables.
            </p>
          </div>
        ) : (
          <>
            <h1 style={{ fontSize: 23, lineHeight: 1.25, margin: "0 0 14px", textAlign: "center" }}>
              Reçois ton lien personnel
            </h1>
            <p style={{ color: T.creamMuted, fontSize: 15, lineHeight: 1.6, margin: "0 0 26px", textAlign: "center" }}>
              Indique l'adresse e-mail de ton compte AL BARAKA. On t'envoie ton lien,
              qui n'est valable que pour toi.
            </p>
            <input
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErreur(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") void envoyer(); }}
              placeholder="ton@email.com"
              type="email"
              autoComplete="email"
              style={{
                width: "100%", padding: "14px 16px", borderRadius: 12,
                border: `1px solid ${erreur ? T.danger : "rgba(245,241,230,0.16)"}`,
                background: "rgba(255,255,255,0.03)", color: T.cream,
                fontSize: 15.5, fontFamily: "inherit", outline: "none", marginBottom: 12,
              }}
            />
            {erreur && (
              <p style={{ color: T.danger, fontSize: 13.5, margin: "0 0 12px" }}>{erreur}</p>
            )}
            <button
              type="button"
              onClick={() => void envoyer()}
              disabled={etat === "envoi"}
              style={{
                width: "100%", padding: "15px 22px", borderRadius: 999, border: "none",
                background: `linear-gradient(180deg, ${T.goldBright} 0%, ${T.gold} 100%)`,
                color: "#1A1407", fontSize: 15.5, fontWeight: 700,
                cursor: etat === "envoi" ? "default" : "pointer",
                opacity: etat === "envoi" ? 0.7 : 1, fontFamily: "inherit",
              }}
            >
              {etat === "envoi" ? "Un instant…" : "Recevoir mon lien"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
