// UpdateCardMerci — /update-card/merci
//
// Cible du return_url de confirmSetup. Le SetupIntent est confirmé côté Stripe ;
// la finalisation (carte par défaut + prélèvement de l'échéance) se fait côté
// webhook. On affiche simplement une confirmation au client.

import { useEffect, useMemo } from "react";
import logo from "@/assets/al-baraka-logo-v2.png";
import { CheckCircle2, AlertTriangle } from "lucide-react";

const THEME = {
  bg: "#0A0A0A",
  gold: "#C9A04E",
  goldBright: "#E4C57A",
  goldLine: "rgba(201,160,78,0.28)",
  cream: "#F5F1E6",
  creamMuted: "rgba(245,241,230,0.62)",
};

export default function UpdateCardMerci() {
  const status = useMemo(() => new URLSearchParams(window.location.search).get("redirect_status"), []);
  const ok = status === "succeeded" || status === null; // null = arrivée directe, on reste positif

  useEffect(() => {
    document.title = "Carte mise à jour — Al Baraka";
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: THEME.bg,
        color: THEME.cream,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        textAlign: "center",
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      <img
        src={logo}
        alt="AL BARAKA"
        style={{ width: 84, height: 84, objectFit: "contain", marginBottom: 22, filter: "drop-shadow(0 0 22px rgba(201,160,78,0.2))" }}
      />
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          border: `1px solid ${THEME.goldLine}`,
          display: "grid",
          placeItems: "center",
          marginBottom: 20,
          background: "radial-gradient(circle, rgba(201,160,78,0.14), transparent 70%)",
        }}
      >
        {ok ? <CheckCircle2 size={32} color={THEME.goldBright} /> : <AlertTriangle size={30} color={THEME.gold} />}
      </div>
      <h1 style={{ fontSize: 26, fontWeight: 600, margin: "0 0 12px" }}>
        {ok ? "Ta carte a été mise à jour" : "Un souci est survenu"}
      </h1>
      <p style={{ color: THEME.creamMuted, fontSize: 14.5, lineHeight: 1.6, maxWidth: 440 }}>
        {ok ? (
          <>
            Merci ! Ta nouvelle carte est enregistrée. Le prélèvement de ton échéance en attente est lancé, et tes
            prochaines mensualités passeront sur cette carte. Tu vas recevoir la confirmation par email.
          </>
        ) : (
          <>
            Ta carte n'a pas pu être validée (authentification ou refus). Réessaie avec ton lien, ou avec une autre
            carte. Si le problème persiste, contacte le support.
          </>
        )}
      </p>
    </div>
  );
}
