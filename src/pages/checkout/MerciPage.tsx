import { useSearchParams } from "react-router-dom";
import CheckoutHero from "./CheckoutHero";
import CheckoutBackground from "./CheckoutBackground";
import { DigitalEcosystem, OrnamentalDivider, SectionLabel } from "./CheckoutOrnaments";
import {
  Mail,
  KeyRound,
  Users,
  Compass,
  CheckCircle2,
  ShieldCheck,
  Globe,
  Lock,
} from "lucide-react";

const BRAND = {
  gold: "#C9A04E",
  goldSoft: "rgba(201,160,78,0.22)",
  goldMuted: "rgba(201,160,78,0.05)",
  cream: "#F5F1E6",
  creamMuted: "rgba(245,241,230,0.65)",
  creamSoft: "rgba(245,241,230,0.82)",
  black: "#0A0A0A",
};

const STEPS = [
  {
    n: "01",
    Icon: Mail,
    title: "Consulte ta boîte mail",
    body: "Ouvre l'email que nous venons de t'envoyer. Pense à vérifier tes spams si tu ne le vois pas tout de suite.",
  },
  {
    n: "02",
    Icon: KeyRound,
    title: "Définis ton mot de passe",
    body: "Clique sur le lien de l'email pour créer ton accès personnel à la plateforme.",
  },
  {
    n: "03",
    Icon: Users,
    title: "Rejoins la famille sur Discord",
    body: "Dès ta connexion, une étape te proposera de rejoindre notre communauté privée — c'est là que bat le cœur d'Al Baraka.",
  },
  {
    n: "04",
    Icon: Compass,
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
        padding: "3.5rem 1.5rem 3rem",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <CheckoutBackground />

      <style>{`
        @keyframes alb-check-pop {
          0% { transform: scale(0.6); opacity: 0; }
          60% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes alb-ring-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(201,160,78,0.5), 0 0 40px rgba(201,160,78,0.2); }
          50% { box-shadow: 0 0 0 16px rgba(201,160,78,0), 0 0 60px rgba(201,160,78,0.35); }
        }
        .alb-step:hover {
          border-color: rgba(201,160,78,0.55);
          background: rgba(201,160,78,0.06);
          transform: translateY(-1px);
        }
      `}</style>

      <div style={{ position: "relative", zIndex: 2, maxWidth: 560, margin: "0 auto" }}>
        <CheckoutHero
          title="AL HAMDOULILAH"
          subtitle="ÉCOSYSTÈME BY ETHICARENA"
          compact
        />
      </div>

      {/* Scène écosystème */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          margin: "0 auto 2rem",
          opacity: 0,
          animation: "alb-eco-in 1.4s ease-out 1s forwards",
        }}
      >
        <style>{`
          @keyframes alb-eco-in {
            from { opacity: 0; transform: translateY(14px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
        <DigitalEcosystem />
      </div>

      <div
        style={{
          maxWidth: 560,
          margin: "0 auto",
          padding: "2.25rem 2rem 2.25rem",
          border: `0.5px solid ${BRAND.goldSoft}`,
          borderRadius: 14,
          background: "rgba(10,10,10,0.62)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          boxShadow:
            "0 30px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(201,160,78,0.06), inset 0 0 80px rgba(201,160,78,0.02)",
          position: "relative",
          zIndex: 2,
        }}
      >

        {/* Cercle de validation — pulse doré animé */}
        <div style={{ textAlign: "center", marginBottom: "2.25rem" }}>
          <div
            style={{
              width: 120,
              height: 120,
              margin: "0 auto",
              border: `1px solid ${BRAND.gold}`,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              background:
                "radial-gradient(circle, rgba(201,160,78,0.14) 0%, rgba(10,10,10,0.3) 70%)",
              animation: "alb-ring-pulse 3s ease-in-out infinite",
            }}
          >
            <CheckCircle2
              size={58}
              strokeWidth={1.3}
              style={{
                color: BRAND.gold,
                animation: "alb-check-pop 0.9s ease-out",
                filter: "drop-shadow(0 0 12px rgba(201,160,78,0.6))",
              }}
            />
          </div>
        </div>

        {/* Message d'accueil */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <p
            style={{
              color: BRAND.cream,
              fontSize: 17,
              margin: "0 0 18px 0",
              lineHeight: 1.5,
              fontWeight: 500,
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              letterSpacing: 0.5,
            }}
          >
            Félicitations pour ce choix courageux.
          </p>
          <p
            style={{
              color: BRAND.creamSoft,
              fontSize: 14,
              margin: "0 auto",
              lineHeight: 1.85,
              maxWidth: 440,
            }}
          >
            Tu fais désormais partie de la famille Al Baraka. Investir en toi, dans tes compétences, dans un écosystème aligné avec tes valeurs, c'est la plus belle décision que tu aies prise aujourd'hui.
          </p>
          <p
            style={{
              color: BRAND.gold,
              fontSize: 12,
              margin: "22px 0 0 0",
              fontWeight: 500,
              fontStyle: "italic",
              letterSpacing: 1,
            }}
          >
            — Félicitations encore une fois —
          </p>
        </div>

        {/* Email d'accès — card premium */}
        <div
          style={{
            marginBottom: "2.5rem",
            padding: "20px 22px",
            border: `0.5px solid ${BRAND.gold}`,
            borderRadius: 12,
            background:
              "linear-gradient(145deg, rgba(201,160,78,0.1) 0%, rgba(201,160,78,0.02) 100%)",
            display: "flex",
            gap: 16,
            alignItems: "center",
            boxShadow: "inset 0 0 40px rgba(201,160,78,0.04)",
          }}
        >
          <div
            style={{
              flexShrink: 0,
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "rgba(201,160,78,0.15)",
              border: `0.5px solid ${BRAND.gold}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: BRAND.gold,
            }}
          >
            <Mail size={20} strokeWidth={1.4} />
          </div>
          <div>
            <div
              style={{
                fontSize: 14.5,
                fontWeight: 600,
                color: BRAND.cream,
                marginBottom: 4,
                letterSpacing: 0.2,
              }}
            >
              Ton email d'accès t'attend
            </div>
            <div style={{ fontSize: 12.5, color: "rgba(245,241,230,0.75)", lineHeight: 1.55 }}>
              Nous venons de t'envoyer un email avec ta facture et le lien pour définir ton mot de passe.
            </div>
          </div>
        </div>

        {/* Étapes */}
        <div style={{ marginBottom: "2rem" }}>
          <SectionLabel>LES PROCHAINES ÉTAPES</SectionLabel>

          {STEPS.map((s, i) => (
            <div
              key={s.n}
              className="alb-step"
              style={{
                display: "flex",
                gap: 14,
                padding: "16px 18px",
                border: `0.5px solid ${BRAND.goldSoft}`,
                borderRadius: 10,
                marginBottom: i === STEPS.length - 1 ? 0 : 10,
                alignItems: "flex-start",
                transition: "border-color 0.25s, background 0.25s, transform 0.25s",
                background: "rgba(201,160,78,0.02)",
              }}
            >
              <div
                style={{
                  flexShrink: 0,
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background:
                    "linear-gradient(135deg, rgba(201,160,78,0.22), rgba(201,160,78,0.05))",
                  border: "0.5px solid rgba(201,160,78,0.45)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: BRAND.gold,
                  position: "relative",
                }}
              >
                <s.Icon size={18} strokeWidth={1.5} />
                <span
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -6,
                    background: BRAND.black,
                    color: BRAND.gold,
                    border: `0.5px solid ${BRAND.gold}`,
                    borderRadius: 10,
                    fontSize: 9,
                    padding: "1px 6px",
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                    letterSpacing: 0.5,
                    fontWeight: 600,
                  }}
                >
                  {s.n}
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: BRAND.cream,
                    marginBottom: 4,
                    letterSpacing: 0.2,
                  }}
                >
                  {s.title}
                </div>
                <div style={{ fontSize: 13, color: BRAND.creamMuted, lineHeight: 1.6 }}>
                  {s.body}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Baraka */}
        <div
          style={{
            textAlign: "center",
            fontSize: 12.5,
            color: "rgba(245,241,230,0.65)",
            lineHeight: 1.7,
            paddingTop: "1.25rem",
            fontStyle: "italic",
            fontFamily: "'Cormorant Garamond', Georgia, serif",
          }}
        >
          Qu'Allah facilite ton parcours, inshaAllah.
        </div>

        {/* Fleuron ornemental */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: "1.75rem",
          }}
        >
          <OrnamentalDivider width={180} />
        </div>

        {/* Bandeau de réassurance */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 22,
            marginTop: "1.5rem",
            flexWrap: "wrap",
            padding: "14px 0 0",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              color: "rgba(245,241,230,0.55)",
              letterSpacing: 1,
            }}
          >
            <Lock size={13} strokeWidth={1.6} style={{ color: BRAND.gold }} />
            <span>PAIEMENT STRIPE</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              color: "rgba(245,241,230,0.55)",
              letterSpacing: 1,
            }}
          >
            <ShieldCheck size={13} strokeWidth={1.6} style={{ color: BRAND.gold }} />
            <span>SSL · 256 BITS</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              color: "rgba(245,241,230,0.55)",
              letterSpacing: 1,
            }}
          >
            <Globe size={13} strokeWidth={1.6} style={{ color: BRAND.gold }} />
            <span>CONFORME RGPD</span>
          </div>
        </div>

        {/* Référence */}
        {ref && (
          <div
            style={{
              textAlign: "center",
              fontSize: 10,
              color: "rgba(245,241,230,0.25)",
              marginTop: 18,
              fontFamily: "monospace",
              letterSpacing: 0.5,
            }}
          >
            Réf. {ref.slice(-12)}
          </div>
        )}
      </div>
    </div>
  );
}
