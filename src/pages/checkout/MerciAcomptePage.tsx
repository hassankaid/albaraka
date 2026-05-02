// MerciAcomptePage — page de remerciement après paiement d'un acompte.
//
// Pas de flow d'onboarding (pas de password, pas de Discord, pas de RIB).
// Juste un message de confirmation + indication que la facture arrive par
// email avec un code personnel pour finaliser le paiement final plus tard.

import { useSearchParams } from "react-router-dom";
import { CheckCircle2, Mail, Lock } from "lucide-react";
import logo from "@/assets/al-baraka-logo-v2.png";
import CheckoutCanvas from "./CheckoutCanvas";

const THEME = {
  bg: "#0A0A0A",
  bgSoft: "#111111",
  gold: "#C9A04E",
  goldBright: "#E4C57A",
  goldDim: "rgba(201,160,78,0.18)",
  goldLine: "rgba(201,160,78,0.28)",
  cream: "#F5F1E6",
  creamMuted: "rgba(245,241,230,0.62)",
  creamDim: "rgba(245,241,230,0.38)",
};

export default function MerciAcomptePage() {
  const [searchParams] = useSearchParams();
  const piId = searchParams.get("payment_intent");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: THEME.bg,
        color: THEME.cream,
        position: "relative",
        overflow: "hidden",
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      <CheckoutCanvas />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          maxWidth: 480,
          margin: "0 auto",
          padding: "60px 20px",
          textAlign: "center",
        }}
      >
        <img
          src={logo}
          alt="AL BARAKA"
          style={{
            width: 90,
            height: 90,
            objectFit: "contain",
            marginBottom: 24,
            marginInline: "auto",
            display: "block",
            filter: "drop-shadow(0 0 24px rgba(201,160,78,0.22))",
          }}
        />

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 64,
            height: 64,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(201,160,78,0.25) 0%, rgba(201,160,78,0) 70%)",
            marginBottom: 16,
          }}
        >
          <CheckCircle2 size={48} color={THEME.gold} strokeWidth={1.5} />
        </div>

        <h1
          style={{
            fontSize: 32,
            fontWeight: 600,
            margin: "0 0 8px",
            background: `linear-gradient(135deg, ${THEME.cream} 0%, ${THEME.goldBright} 100%)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Al Hamdoulilah
        </h1>

        <p
          style={{
            fontSize: 14,
            color: THEME.creamMuted,
            marginBottom: 32,
            lineHeight: 1.6,
          }}
        >
          Votre acompte a bien été reçu. Qu'Allah ﷻ vous bénisse dans cette démarche.
        </p>

        <div
          style={{
            background: "rgba(20,20,20,0.6)",
            border: `1px solid ${THEME.goldLine}`,
            borderRadius: 16,
            padding: 28,
            backdropFilter: "blur(20px)",
            boxShadow: "0 30px 60px rgba(0,0,0,0.4)",
            textAlign: "left",
          }}
        >
          <h2
            style={{
              fontSize: 13,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: THEME.gold,
              fontWeight: 600,
              marginTop: 0,
              marginBottom: 18,
              textAlign: "center",
            }}
          >
            Prochaines étapes
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Step
              icon={<Mail size={18} color={THEME.gold} />}
              title="Vérifiez votre boîte mail"
              text={
                <>
                  Vous allez recevoir <strong style={{ color: THEME.cream }}>votre facture
                  PDF</strong> par email dans quelques minutes.
                </>
              }
            />
            <Step
              icon={<Lock size={18} color={THEME.gold} />}
              title="Votre code personnel"
              text={
                <>
                  Le mail contient votre <strong style={{ color: THEME.cream }}>code
                  paiement personnel</strong> (ALB-XXXXXX). Il sera utilisé par votre
                  conseiller pour finaliser le règlement de votre PASS AL BARAKA et
                  déduire automatiquement votre acompte.
                </>
              }
            />
            <Step
              icon={
                <span
                  style={{
                    width: 18,
                    height: 18,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "50%",
                    background: THEME.gold,
                    color: "#0A0A0A",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  ✓
                </span>
              }
              title="Votre conseiller vous recontacte"
              text="Vous serez recontacté(e) très prochainement pour finaliser ensemble votre PASS AL BARAKA et discuter du plan de paiement adapté."
            />
          </div>
        </div>

        {piId && (
          <p
            style={{
              fontSize: 11,
              color: THEME.creamDim,
              marginTop: 24,
              fontFamily: "monospace",
            }}
          >
            Référence : {piId}
          </p>
        )}
      </div>
    </div>
  );
}

function Step({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: "rgba(201,160,78,0.10)",
          border: `1px solid ${THEME.goldDim}`,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: THEME.cream,
            marginBottom: 4,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 12,
            color: THEME.creamMuted,
            lineHeight: 1.5,
          }}
        >
          {text}
        </div>
      </div>
    </div>
  );
}
