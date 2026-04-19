import { useSearchParams } from "react-router-dom";

const BRAND = {
  gold: "#C9A04E",
  goldSoft: "rgba(201,160,78,0.2)",
  goldMuted: "rgba(201,160,78,0.05)",
  cream: "#F5F1E6",
  creamMuted: "rgba(245,241,230,0.65)",
  creamSoft: "rgba(245,241,230,0.82)",
  black: "#0A0A0A",
};

const STEPS = [
  {
    n: "01",
    title: "Consulte ta boîte mail",
    body: "Ouvre l'email que nous venons de t'envoyer. Pense à vérifier tes spams si tu ne le vois pas tout de suite.",
  },
  {
    n: "02",
    title: "Définis ton mot de passe",
    body: "Clique sur le lien de l'email pour créer ton accès personnel à la plateforme.",
  },
  {
    n: "03",
    title: "Rejoins la famille sur Discord",
    body: "Dès ta connexion, une étape te proposera de rejoindre notre communauté privée — c'est là que bat le cœur d'Al Baraka.",
  },
  {
    n: "04",
    title: "Découvre ton parcours",
    body: "Une fois connecté·e, la plateforme te guidera pas à pas dans ton écosystème Al Baraka.",
  },
];

export default function MerciPage() {
  const [searchParams] = useSearchParams();
  // Stripe Payment Element redirect adds ?payment_intent=pi_xxx...
  // Legacy Checkout Session flow used ?session_id=cs_xxx...
  const ref = searchParams.get("payment_intent") || searchParams.get("session_id");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: BRAND.black,
        color: BRAND.cream,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
        padding: "3.5rem 1.5rem",
      }}
    >
      <style>{`
        .alb-conf-step { transition: border-color 0.3s; }
        .alb-conf-step:hover { border-color: rgba(201,160,78,0.5); }
      `}</style>
      <div
        style={{
          maxWidth: 520,
          margin: "0 auto",
          padding: "3rem 2rem",
          border: `0.5px solid ${BRAND.goldSoft}`,
          borderRadius: 12,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div
            style={{
              width: 60,
              height: 60,
              margin: "0 auto 16px",
              background: BRAND.black,
              border: `1px solid ${BRAND.gold}`,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="34" height="34" viewBox="0 0 40 40">
              <text
                x="20"
                y="28"
                textAnchor="middle"
                fontFamily="Georgia, serif"
                fontSize="19"
                fontWeight="400"
                fill={BRAND.gold}
                letterSpacing="1.5"
              >
                AB
              </text>
            </svg>
          </div>
          <div style={{ fontSize: 14, fontWeight: 500, letterSpacing: 5, color: BRAND.cream, marginBottom: 5 }}>
            AL BARAKA
          </div>
          <div style={{ fontSize: 9, color: BRAND.gold, letterSpacing: 2.5 }}>
            ÉCOSYSTÈME BY ETHICARENA
          </div>
        </div>

        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div
            style={{
              width: 110,
              height: 110,
              margin: "0 auto",
              border: `1px solid ${BRAND.gold}`,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                width: 130,
                height: 130,
                border: "0.5px solid rgba(201,160,78,0.3)",
                borderRadius: "50%",
              }}
            />
            <svg width="52" height="52" viewBox="0 0 52 52">
              <path
                d="M14 26L22 34L38 18"
                fill="none"
                stroke={BRAND.gold}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 500,
              margin: "0 0 14px 0",
              letterSpacing: 1,
              fontFamily: "Georgia, serif",
              color: BRAND.gold,
            }}
          >
            Al Hamdoulilah.
          </h1>
          <p style={{ color: BRAND.cream, fontSize: 16, margin: "0 0 20px 0", lineHeight: 1.6, fontWeight: 500 }}>
            Félicitations pour ce choix courageux.
          </p>
          <p
            style={{
              color: BRAND.creamSoft,
              fontSize: 14,
              margin: "0 auto",
              lineHeight: 1.85,
              maxWidth: 400,
            }}
          >
            Tu fais désormais partie de la famille Al Baraka. Investir en toi, dans tes compétences, dans un écosystème aligné avec tes valeurs, c'est la plus belle décision que tu aies prise aujourd'hui.
          </p>
          <p
            style={{
              color: BRAND.gold,
              fontSize: 13,
              margin: "18px 0 0 0",
              fontWeight: 500,
              fontStyle: "italic",
              letterSpacing: 0.5,
            }}
          >
            Félicitations encore une fois.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            marginBottom: "2.5rem",
          }}
        >
          <div style={{ width: 70, height: 0.5, background: BRAND.gold }} />
          <svg width="8" height="8" viewBox="0 0 8 8">
            <path d="M4 0L8 4L4 8L0 4Z" fill={BRAND.gold} />
          </svg>
          <div style={{ width: 70, height: 0.5, background: BRAND.gold }} />
        </div>

        <div
          style={{
            marginBottom: "2.5rem",
            padding: "20px 22px",
            border: `1px solid ${BRAND.gold}`,
            borderRadius: 8,
            background: BRAND.goldMuted,
            display: "flex",
            gap: 16,
            alignItems: "center",
          }}
        >
          <div style={{ flexShrink: 0 }}>
            <svg width="34" height="34" viewBox="0 0 34 34">
              <rect x="3" y="7" width="28" height="20" rx="2" fill="none" stroke={BRAND.gold} strokeWidth="1.2" />
              <path
                d="M3 9L17 19L31 9"
                fill="none"
                stroke={BRAND.gold}
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: BRAND.cream, marginBottom: 4 }}>
              Ton email d'accès t'attend
            </div>
            <div style={{ fontSize: 12, color: "rgba(245,241,230,0.7)", lineHeight: 1.55 }}>
              Nous venons de t'envoyer un email avec ta facture et le lien pour définir ton mot de passe.
            </div>
          </div>
        </div>

        <div style={{ marginBottom: "2rem" }}>
          <h2
            style={{
              fontSize: 11,
              fontWeight: 500,
              margin: "0 0 20px 0",
              letterSpacing: 3,
              color: BRAND.gold,
              textAlign: "center",
            }}
          >
            LES PROCHAINES ÉTAPES
          </h2>

          {STEPS.map((s, i) => (
            <div
              key={s.n}
              className="alb-conf-step"
              style={{
                display: "flex",
                gap: 16,
                padding: "16px 18px",
                border: `0.5px solid ${BRAND.goldSoft}`,
                borderRadius: 8,
                marginBottom: i === STEPS.length - 1 ? 0 : 10,
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  flexShrink: 0,
                  fontFamily: "Georgia, serif",
                  fontSize: 20,
                  color: BRAND.gold,
                  fontWeight: 400,
                  lineHeight: 1,
                  minWidth: 28,
                }}
              >
                {s.n}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: BRAND.cream, marginBottom: 4 }}>
                  {s.title}
                </div>
                <div style={{ fontSize: 13, color: BRAND.creamMuted, lineHeight: 1.55 }}>{s.body}</div>
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            textAlign: "center",
            fontSize: 12,
            color: "rgba(245,241,230,0.55)",
            lineHeight: 1.7,
            paddingTop: "1rem",
            fontStyle: "italic",
          }}
        >
          Qu'Allah facilite ton parcours, inshaAllah.
        </div>

        {ref && (
          <div
            style={{
              textAlign: "center",
              fontSize: 10,
              color: "rgba(245,241,230,0.25)",
              marginTop: 16,
              fontFamily: "monospace",
            }}
          >
            Réf. {ref.slice(-12)}
          </div>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            marginTop: "2rem",
          }}
        >
          <div style={{ width: 50, height: 0.5, background: "rgba(201,160,78,0.4)" }} />
          <svg width="6" height="6" viewBox="0 0 8 8">
            <path d="M4 0L8 4L4 8L0 4Z" fill="rgba(201,160,78,0.5)" />
          </svg>
          <div style={{ width: 50, height: 0.5, background: "rgba(201,160,78,0.4)" }} />
        </div>
      </div>
    </div>
  );
}
