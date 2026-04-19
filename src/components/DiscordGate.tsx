import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const DISCORD_INVITE_URL = "https://discord.gg/k9aV7DJJgR";

const BRAND = {
  gold: "#C9A04E",
  goldSoft: "rgba(201,160,78,0.28)",
  goldMuted: "rgba(201,160,78,0.05)",
  cream: "#F5F1E6",
  creamMuted: "rgba(245,241,230,0.65)",
  creamSoft: "rgba(245,241,230,0.85)",
  black: "#0A0A0A",
};

function suggestPseudo(fullName: string | null | undefined): string {
  if (!fullName) return "";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  const firstName = parts[0];
  const lastName = parts[parts.length - 1];
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  return `${cap(firstName)}${cap(lastName).slice(0, 3)}`;
}

interface Props {
  onJoined?: () => void;
}

export function DiscordGate({ onJoined }: Props) {
  const { profile } = useAuth();
  const [joining, setJoining] = useState(false);
  const [copied, setCopied] = useState(false);

  const firstName = useMemo(() => {
    const fn = profile?.full_name?.trim() || "";
    return fn.split(/\s+/)[0] || "";
  }, [profile?.full_name]);

  const pseudo = useMemo(() => suggestPseudo(profile?.full_name), [profile?.full_name]);

  async function onJoinClick() {
    setJoining(true);
    try {
      const { error } = await supabase.rpc("record_discord_join");
      if (error) throw error;
      window.open(DISCORD_INVITE_URL, "_blank", "noopener,noreferrer");
      toast.success("Bienvenue dans la famille Al Baraka !");
      onJoined?.();
      // Force the AuthProvider to refetch the profile so the gate disappears.
      // (auth session onAuthStateChange will pick it up on the next focus,
      //  but a manual refresh ensures immediate UI update.)
      setTimeout(() => window.location.reload(), 400);
    } catch (e) {
      console.error("record_discord_join error:", e);
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Erreur : ${msg}`);
      setJoining(false);
    }
  }

  async function onCopyPseudo() {
    if (!pseudo) return;
    try {
      await navigator.clipboard.writeText(pseudo);
      setCopied(true);
      toast.success("Pseudo copié dans le presse-papiers");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier le pseudo");
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: BRAND.black,
        color: BRAND.cream,
        overflow: "auto",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
        padding: "3rem 1.5rem",
      }}
    >
      <div
        style={{
          maxWidth: 560,
          margin: "0 auto",
          padding: "3rem 2rem",
          border: `0.5px solid rgba(201,160,78,0.2)`,
          borderRadius: 12,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            style={{
              width: 72,
              height: 72,
              margin: "0 auto 20px",
              background: BRAND.black,
              border: `1px solid ${BRAND.gold}`,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="40" height="40" viewBox="0 0 40 40">
              <text
                x="20"
                y="28"
                textAnchor="middle"
                fontFamily="Georgia, serif"
                fontSize="22"
                fontWeight="400"
                fill={BRAND.gold}
                letterSpacing="1.5"
              >
                AB
              </text>
            </svg>
          </div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 500,
              letterSpacing: 5,
              color: BRAND.cream,
              marginBottom: 5,
            }}
          >
            AL BARAKA
          </div>
          <div style={{ fontSize: 9, color: BRAND.gold, letterSpacing: 2.5 }}>
            ÉCOSYSTÈME BY ETHICARENA
          </div>
        </div>

        <h1
          style={{
            fontSize: 28,
            fontWeight: 500,
            margin: "0 0 24px 0",
            letterSpacing: 0.5,
            textAlign: "center",
            fontFamily: "Georgia, serif",
            color: BRAND.cream,
          }}
        >
          As salam alaykoum{firstName ? ` ${firstName}` : ""}.
        </h1>

        <p
          style={{
            color: BRAND.creamSoft,
            fontSize: 15,
            lineHeight: 1.75,
            margin: "0 0 14px 0",
            textAlign: "center",
          }}
        >
          Avant de commencer ton parcours Al Baraka, rejoins notre communauté Discord. C'est là
          que bat le cœur de la famille Al Baraka — coaching, entraide, annonces, et surtout :
          les frères et sœurs qui ont le même projet que toi.
        </p>

        <button
          type="button"
          onClick={onJoinClick}
          disabled={joining}
          style={{
            width: "100%",
            background: BRAND.gold,
            color: BRAND.black,
            border: "none",
            borderRadius: 8,
            padding: "17px 20px",
            fontSize: 14,
            fontWeight: 500,
            cursor: joining ? "not-allowed" : "pointer",
            letterSpacing: 3,
            fontFamily: "inherit",
            margin: "28px 0",
            opacity: joining ? 0.6 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
          </svg>
          {joining ? "OUVERTURE..." : "REJOINDRE LE DISCORD AL BARAKA"}
        </button>

        <p style={{ color: BRAND.creamMuted, fontSize: 13, lineHeight: 1.7, margin: "0 0 24px 0" }}>
          Si tu n'as pas encore de compte Discord, tu vas devoir en créer un avant de rejoindre le
          serveur (c'est gratuit et ça prend 2 minutes).
        </p>

        <div
          style={{
            padding: "20px 22px",
            border: `0.5px solid ${BRAND.goldSoft}`,
            borderRadius: 8,
            background: BRAND.goldMuted,
            marginBottom: 24,
          }}
        >
          <h2
            style={{
              fontSize: 11,
              fontWeight: 500,
              margin: "0 0 12px 0",
              letterSpacing: 3,
              color: BRAND.gold,
            }}
          >
            TON PSEUDO SUR LE SERVEUR
          </h2>
          <p style={{ color: BRAND.creamSoft, fontSize: 13, lineHeight: 1.7, margin: "0 0 14px 0" }}>
            Ton pseudo sur le Discord Al Baraka doit suivre cette règle : <strong>[Prénom] + [3
            premières lettres du nom de famille]</strong>, majuscule au début de chaque partie,
            collé, sans espace ni tiret.
          </p>

          {pseudo && (
            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                padding: "12px 14px",
                background: "rgba(255,255,255,0.04)",
                border: `0.5px solid ${BRAND.goldSoft}`,
                borderRadius: 6,
                marginBottom: 14,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: BRAND.creamMuted, letterSpacing: 2, marginBottom: 4 }}>
                  TON PSEUDO SUGGÉRÉ
                </div>
                <div
                  style={{
                    fontSize: 18,
                    fontFamily: "Georgia, serif",
                    color: BRAND.gold,
                    letterSpacing: 0.5,
                  }}
                >
                  {pseudo}
                </div>
              </div>
              <button
                type="button"
                onClick={onCopyPseudo}
                style={{
                  background: "transparent",
                  border: `0.5px solid ${BRAND.gold}`,
                  color: BRAND.gold,
                  padding: "10px 14px",
                  borderRadius: 6,
                  fontSize: 11,
                  letterSpacing: 2,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  whiteSpace: "nowrap",
                }}
              >
                {copied ? "COPIÉ ✓" : "COPIER"}
              </button>
            </div>
          )}

          <div style={{ fontSize: 12, color: BRAND.creamMuted, lineHeight: 1.8 }}>
            <div style={{ marginBottom: 4 }}>Exemples :</div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>Mohamed Benali → MohamedBen</li>
              <li>Fatima El Idrissi → FatimaElI</li>
              <li>Yacine-Amine Toumi → YacineTou</li>
            </ul>
          </div>

          <p style={{ color: BRAND.creamMuted, fontSize: 12, lineHeight: 1.7, margin: "14px 0 0 0" }}>
            Si tu utilises déjà Discord, pas besoin de changer ton pseudo global — clique sur ton
            nom dans le serveur Al Baraka et choisis « Modifier le surnom » pour appliquer la
            règle uniquement chez nous.
          </p>
        </div>

        <div
          style={{
            padding: "20px 22px",
            border: `0.5px solid ${BRAND.goldSoft}`,
            borderRadius: 8,
            marginBottom: 24,
          }}
        >
          <h2
            style={{
              fontSize: 11,
              fontWeight: 500,
              margin: "0 0 10px 0",
              letterSpacing: 3,
              color: BRAND.gold,
            }}
          >
            PRÉSENTE-TOI À LA FAMILLE
          </h2>
          <p style={{ color: BRAND.creamSoft, fontSize: 13, lineHeight: 1.7, margin: "0 0 10px 0" }}>
            Une fois dans le Discord, rends-toi dans le salon <strong>#présentation</strong> pour
            enregistrer un vocal court (1 à 2 minutes) où tu te présentes :
          </p>
          <ul style={{ color: BRAND.creamMuted, fontSize: 13, lineHeight: 1.8, margin: 0, paddingLeft: 18 }}>
            <li>Ton prénom</li>
            <li>Ton âge</li>
            <li>Ce que tu fais dans la vie</li>
            <li>Ce qui t'a poussé(e) à rejoindre l'écosystème Al Baraka</li>
          </ul>
          <p style={{ color: BRAND.gold, fontSize: 12, margin: "14px 0 0 0", fontStyle: "italic" }}>
            C'est un beau moment d'intégration dans la famille.
          </p>
        </div>

        <div
          style={{
            textAlign: "center",
            fontSize: 11,
            color: "rgba(245,241,230,0.4)",
            letterSpacing: 1,
            marginTop: 16,
          }}
        >
          Tu ne peux accéder au reste de la plateforme qu'après avoir rejoint Discord.
        </div>
      </div>
    </div>
  );
}
