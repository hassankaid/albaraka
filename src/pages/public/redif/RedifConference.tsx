// RedifConference — page publique /redif/:token
//
// Sprint S (17/05/2026) : 1 lien par conference. Le prospect arrive ici via
// le lien partage sur WhatsApp par Sidali. Si la conference n'est pas encore
// configuree (status != 'ready'), affiche un etat d'attente. Sinon, 3 etapes :
//   1. THANKS  — page d'accueil avec CTA "Voir la rediffusion"
//   2. REPLAY  — iframe Zoom + barre progression 90% + bouton "J'ai termine"
//   3. CONFIRM — modal 2 cases a cocher (prix + souhait) puis bouton Calendly
//
// UI inspiree du doc Sidali (palette noir/or, Crimson Pro italique + Inter).
// Logique cle :
//   - UNLOCK_RATIO = 0.9 : le bouton "J'ai termine" devient cliquable apres
//     90% de video_duration_min
//   - Fallback Zoom : URL contient "zoom.us" → overlay "Ouvrir dans Zoom"
//     apres 2.5s (contourne X-Frame-Options)

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertTriangle, Calendar } from "lucide-react";
import { VideoPlayer } from "@/components/training/VideoPlayer";

// Sprint S5 (17/05/2026) : on reutilise le composant <VideoPlayer/> du module
// Formation (qui aspire la vraie duree via Vimeo Player SDK / YouTube IFrame
// API et fire onNearEnd a 95%). Plus de timer fixe, plus de regex maison :
// le composant gere Vimeo / YouTube / HTML5 / iframe generique nativement.

const THEME = {
  bg: "#080808",
  bgSoft: "#111111",
  bgCard: "#161616",
  gold: "#C9A84C",
  goldBright: "#E8D48B",
  goldSoft: "#8B7D3C",
  line: "rgba(201,168,76,0.18)",
  lineSoft: "rgba(201,168,76,0.08)",
  text: "#F5EFE0",
  textSoft: "#B8B0A0",
  textMute: "#6B6660",
};

// Sprint S5 (17/05/2026) : plus de timer fixe. Le bouton "J'ai termine"
// se debloque quand le composant VideoPlayer fire onNearEnd (95% de la
// vraie duree de la video, calculee par le SDK Vimeo/YouTube).

interface ConferenceLookup {
  conference_date: string;
  replay_url: string | null;
  replay_code: string | null;        // Sprint S4 : ignore cote frontend
  video_duration_min: number;        // Sprint S4 : ignore cote frontend
  calendly_url: string | null;
  is_valid: boolean;
  reason: string | null;
}

type Page = "thanks" | "replay";

export default function RedifConference() {
  const { token } = useParams<{ token: string }>();
  const [lookup, setLookup] = useState<ConferenceLookup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<Page>("thanks");

  // --- Lookup au mount ---
  useEffect(() => {
    if (!token) {
      setError("token_required");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data, error: rpcErr } = await supabase.rpc("lookup_conference_replay" as any, {
          p_token: token,
        });
        if (cancelled) return;
        if (rpcErr) {
          console.error("[RedifConference] RPC error:", rpcErr);
          setError("rpc_failed");
          return;
        }
        const row = Array.isArray(data) && data.length > 0 ? (data[0] as ConferenceLookup) : null;
        if (!row) {
          setError("not_found");
          return;
        }
        setLookup(row);
        if (!row.is_valid) {
          setError(row.reason || "unknown");
        }
      } catch (e) {
        if (cancelled) return;
        console.error("[RedifConference] unexpected:", e);
        setError("unknown");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // ===== Loading state =====
  if (loading) {
    return (
      <Centered>
        <Loader2 size={28} color={THEME.gold} style={{ animation: "redif-spin 1s linear infinite" }} />
        <Style />
      </Centered>
    );
  }

  // ===== Error / pas pret =====
  if (error || !lookup || !lookup.is_valid) {
    return <NotReadyScreen reason={error || "unknown"} conferenceDate={lookup?.conference_date} />;
  }

  // ===== Conf ready : affiche les pages =====
  return (
    <PageLayout>
      {page === "thanks" ? (
        <ThanksPage onContinue={() => setPage("replay")} />
      ) : (
        <ReplayPage
          replayUrl={lookup.replay_url!}
          calendlyUrl={lookup.calendly_url!}
        />
      )}
    </PageLayout>
  );
}

// ─── PageLayout : header brand + fond ─────────────────────────────────────

function PageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: THEME.bg,
        color: THEME.text,
        fontFamily: '"Inter", -apple-system, sans-serif',
        position: "relative",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          background:
            "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(201,168,76,0.06), transparent 60%)," +
            "radial-gradient(ellipse 60% 40% at 50% 100%, rgba(201,168,76,0.03), transparent 60%)",
          pointerEvents: "none",
        }}
      />
      <header
        style={{
          padding: "32px 24px 16px",
          textAlign: "center",
          borderBottom: `1px solid ${THEME.lineSoft}`,
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            fontFamily: '"Crimson Pro", Georgia, serif',
            fontWeight: 500,
            fontSize: 22,
            letterSpacing: "0.32em",
            color: THEME.gold,
            textTransform: "uppercase",
            display: "inline-block",
          }}
        >
          AL BARAKA
        </div>
        <div
          style={{
            width: 40,
            height: 1,
            background: THEME.gold,
            margin: "8px auto 0",
            opacity: 0.5,
          }}
        />
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.42em",
            color: THEME.textMute,
            textTransform: "uppercase",
            marginTop: 10,
            fontWeight: 500,
          }}
        >
          Écosystème · by EthicArena
        </div>
      </header>
      <main
        style={{
          padding: "48px 24px 64px",
          display: "flex",
          justifyContent: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ width: "100%", maxWidth: 720 }}>{children}</div>
      </main>
      <Style />
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: THEME.bg,
        color: THEME.text,
        fontFamily: '"Inter", -apple-system, sans-serif',
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      {children}
    </div>
  );
}

// ─── NotReadyScreen : conf pas configuree / token invalide ───────────────

function NotReadyScreen({ reason, conferenceDate }: { reason: string; conferenceDate?: string }) {
  const isReplayNotReady = reason === "replay_not_ready";
  const isNotFound = reason === "not_found" || reason === "token_required";
  const isArchived = reason === "archived";

  const formattedDate = conferenceDate
    ? new Date(conferenceDate + "T12:00:00Z").toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  let title = "Rediffusion indisponible";
  let message = "Cette rediffusion n'est pas disponible.";
  if (isReplayNotReady) {
    title = "Rediffusion en préparation";
    message = `La rediffusion de la conférence${formattedDate ? ` du ${formattedDate}` : ""} n'est pas encore disponible. Veuillez repasser dans quelques heures.`;
  } else if (isNotFound) {
    title = "Lien invalide";
    message = "Ce lien ne correspond à aucune conférence. Vérifiez l'URL ou contactez votre référent.";
  } else if (isArchived) {
    title = "Rediffusion archivée";
    message = "Cette rediffusion n'est plus accessible.";
  }

  return (
    <PageLayout>
      <div
        style={{
          background: THEME.bgCard,
          border: `1px solid ${THEME.line}`,
          borderRadius: 4,
          padding: "48px 32px",
          textAlign: "center",
          boxShadow: "0 30px 80px -20px rgba(0,0,0,0.6)",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "rgba(201,168,76,0.10)",
            border: `1px solid ${THEME.line}`,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20,
          }}
        >
          <AlertTriangle size={24} color={THEME.gold} />
        </div>
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.4em",
            color: THEME.gold,
            textTransform: "uppercase",
            fontWeight: 600,
            marginBottom: 14,
          }}
        >
          AL BARAKA
        </div>
        <h1
          style={{
            fontFamily: '"Crimson Pro", Georgia, serif',
            fontWeight: 400,
            fontSize: "clamp(28px, 5vw, 38px)",
            color: THEME.text,
            marginBottom: 14,
            lineHeight: 1.15,
          }}
        >
          {title}
        </h1>
        <p style={{ color: THEME.textSoft, fontSize: 15, lineHeight: 1.6, marginBottom: 8 }}>
          {message}
        </p>
      </div>
    </PageLayout>
  );
}

// ─── ThanksPage : page 1, accueil + CTA ──────────────────────────────────

function ThanksPage({ onContinue }: { onContinue: () => void }) {
  return (
    <div
      style={{
        background: THEME.bgCard,
        border: `1px solid ${THEME.line}`,
        borderRadius: 4,
        padding: "48px 32px",
        boxShadow: "0 30px 80px -20px rgba(0,0,0,0.6)",
        animation: "redif-fade 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.4em",
          color: THEME.gold,
          textTransform: "uppercase",
          fontWeight: 600,
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span style={{ width: 24, height: 1, background: THEME.gold }} />
        Bienvenue
      </div>
      <h1
        style={{
          fontFamily: '"Crimson Pro", Georgia, serif',
          fontWeight: 400,
          fontSize: "clamp(36px, 6vw, 54px)",
          color: THEME.text,
          marginBottom: 8,
          lineHeight: 1.1,
        }}
      >
        Merci d'avoir rejoint <em style={{ fontStyle: "italic", color: THEME.gold }}>notre groupe</em>.
      </h1>
      <h2
        style={{
          fontFamily: '"Crimson Pro", Georgia, serif',
          fontWeight: 300,
          fontStyle: "italic",
          fontSize: "clamp(18px, 2.4vw, 22px)",
          color: THEME.textSoft,
          marginBottom: 32,
        }}
      >
        La rediffusion de la conférence vous attend.
      </h2>
      <p style={{ fontSize: 16, lineHeight: 1.7, color: THEME.textSoft, marginBottom: 20 }}>
        Vous avez fait le premier pas en rejoignant le groupe WhatsApp de la conférence AL BARAKA.
        Avant d'aller plus loin, prenez le temps de visionner la <span style={{ color: THEME.goldBright, fontWeight: 500 }}>rediffusion complète</span> :
        elle pose les fondations de tout ce que nous proposons.
      </p>
      <p style={{ fontSize: 16, lineHeight: 1.7, color: THEME.textSoft, marginBottom: 32 }}>
        Une fois la rediffusion terminée, vous pourrez réserver un appel avec l'un de nos coachs.
      </p>
      <button
        type="button"
        onClick={onContinue}
        className="redif-btn redif-btn-primary"
      >
        <span>Voir la rediffusion</span>
        <span className="redif-arrow">→</span>
      </button>
    </div>
  );
}

// ─── ReplayPage : page 2, video + progression + CTA ──────────────────────

function ReplayPage({
  replayUrl,
  calendlyUrl,
}: {
  replayUrl: string;
  calendlyUrl: string;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  // Sprint S5 : canFinish passe a true quand VideoPlayer fire onNearEnd
  // (95% de la vraie duree de la video, calculee par le SDK).
  const [canFinish, setCanFinish] = useState(false);

  return (
    <div style={{ animation: "redif-fade 0.6s cubic-bezier(0.16, 1, 0.3, 1)" }}>
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.4em",
          color: THEME.gold,
          textTransform: "uppercase",
          fontWeight: 600,
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span style={{ width: 24, height: 1, background: THEME.gold }} />
        Rediffusion
      </div>

      {/* Sprint S5 : composant VideoPlayer du module Formation
          (Vimeo SDK + YouTube IFrame API + HTML5 + iframe generique).
          Aspire la vraie duree → onNearEnd a 95%. */}
      <div style={{ marginBottom: 20 }}>
        <VideoPlayer
          video={{
            id: "redif",
            titre: "Rediffusion AL BARAKA",
            url: replayUrl,
            vimeo_id: null,
            duree_secondes: null,
          }}
          onNearEnd={() => setCanFinish(true)}
        />
      </div>

      <button
        type="button"
        disabled={!canFinish}
        onClick={() => setShowConfirm(true)}
        className="redif-btn redif-btn-primary redif-btn-full"
      >
        <span>
          {canFinish
            ? "J'ai terminé la rediffusion"
            : "Visionnez la rediffusion pour débloquer ce bouton"}
        </span>
        {canFinish && <span className="redif-arrow">→</span>}
      </button>

      <p style={{ fontSize: 12, color: THEME.textMute, marginTop: 14, textAlign: "center" }}>
        Le bouton se débloque automatiquement à 95 % de la rediffusion.
      </p>

      {showConfirm && (
        <ConfirmModal calendlyUrl={calendlyUrl} onClose={() => setShowConfirm(false)} />
      )}
    </div>
  );
}

// ─── ConfirmModal : 2 cases + CTA Calendly ───────────────────────────────

function ConfirmModal({
  calendlyUrl,
  onClose,
}: {
  calendlyUrl: string;
  onClose: () => void;
}) {
  const [checkedPrice, setCheckedPrice] = useState(false);
  const [checkedJoin, setCheckedJoin] = useState(false);
  const canReserve = checkedPrice && checkedJoin;

  function reserve() {
    if (!canReserve) return;
    window.open(calendlyUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div
      role="dialog"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(8,8,8,0.85)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        zIndex: 100,
        animation: "redif-fade 0.3s ease",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: THEME.bgCard,
          border: `1px solid ${THEME.line}`,
          borderRadius: 4,
          padding: "36px 30px",
          maxWidth: 520,
          width: "100%",
          boxShadow: "0 40px 100px -20px rgba(0,0,0,0.8)",
          position: "relative",
        }}
      >
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.4em",
            color: THEME.gold,
            textTransform: "uppercase",
            fontWeight: 600,
            marginBottom: 14,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ width: 24, height: 1, background: THEME.gold }} />
          Confirmation
        </div>
        <h2
          style={{
            fontFamily: '"Crimson Pro", Georgia, serif',
            fontWeight: 400,
            fontSize: 26,
            color: THEME.text,
            marginBottom: 24,
            lineHeight: 1.2,
          }}
        >
          Avant de réserver votre <em style={{ fontStyle: "italic", color: THEME.gold }}>appel</em>
        </h2>
        <p style={{ color: THEME.textSoft, fontSize: 14, lineHeight: 1.6, marginBottom: 18 }}>
          Merci de confirmer les deux points suivants :
        </p>

        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            padding: "14px 16px",
            background: THEME.bgSoft,
            border: `1px solid ${checkedPrice ? THEME.gold : THEME.line}`,
            borderRadius: 4,
            marginBottom: 12,
            cursor: "pointer",
            transition: "border-color 0.3s",
          }}
        >
          <input
            type="checkbox"
            checked={checkedPrice}
            onChange={(e) => setCheckedPrice(e.target.checked)}
            style={{ marginTop: 3, accentColor: THEME.gold, cursor: "pointer" }}
          />
          <span style={{ fontSize: 14, color: THEME.text, lineHeight: 1.5 }}>
            J'ai pris connaissance du <strong style={{ color: THEME.goldBright }}>prix de l'accompagnement</strong> présenté durant la conférence.
          </span>
        </label>

        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            padding: "14px 16px",
            background: THEME.bgSoft,
            border: `1px solid ${checkedJoin ? THEME.gold : THEME.line}`,
            borderRadius: 4,
            marginBottom: 24,
            cursor: "pointer",
            transition: "border-color 0.3s",
          }}
        >
          <input
            type="checkbox"
            checked={checkedJoin}
            onChange={(e) => setCheckedJoin(e.target.checked)}
            style={{ marginTop: 3, accentColor: THEME.gold, cursor: "pointer" }}
          />
          <span style={{ fontSize: 14, color: THEME.text, lineHeight: 1.5 }}>
            Je confirme mon souhait de <strong style={{ color: THEME.goldBright }}>rejoindre l'écosystème AL BARAKA</strong> et je souhaite échanger avec un coach.
          </span>
        </label>

        <button
          type="button"
          disabled={!canReserve}
          onClick={reserve}
          className="redif-btn redif-btn-primary redif-btn-full"
        >
          <Calendar size={16} />
          <span>Réserver mon appel avec un coach</span>
        </button>

        <button
          type="button"
          onClick={onClose}
          style={{
            marginTop: 16,
            background: "transparent",
            border: "none",
            color: THEME.textMute,
            fontSize: 12,
            cursor: "pointer",
            display: "block",
            margin: "16px auto 0",
            padding: 6,
          }}
        >
          Annuler
        </button>
      </div>
    </div>
  );
}

// ─── Styles globaux (CSS inline) ─────────────────────────────────────────

function Style() {
  return (
    <style>{`
      @keyframes redif-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes redif-fade {
        from { opacity: 0; transform: translateY(16px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .redif-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 16px 32px;
        font-family: 'Inter', -apple-system, sans-serif;
        font-size: 13px;
        font-weight: 600;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        border: 1px solid ${THEME.gold};
        background: transparent;
        color: ${THEME.gold};
        cursor: pointer;
        text-decoration: none;
        border-radius: 4px;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .redif-btn:hover:not(:disabled) {
        background: ${THEME.gold};
        color: ${THEME.bg};
      }
      .redif-btn:disabled {
        opacity: 0.35;
        cursor: not-allowed;
        border-color: ${THEME.textMute};
        color: ${THEME.textMute};
      }
      .redif-btn-primary {
        background: ${THEME.gold};
        color: ${THEME.bg};
      }
      .redif-btn-primary:hover:not(:disabled) {
        background: ${THEME.goldBright};
        color: ${THEME.bg};
      }
      .redif-btn-full {
        width: 100%;
      }
      .redif-arrow {
        transition: transform 0.3s;
      }
      .redif-btn:hover:not(:disabled) .redif-arrow {
        transform: translateX(4px);
      }
      .redif-btn-ghost {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 14px;
        font-family: 'Inter', sans-serif;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        border: 1px solid ${THEME.line};
        background: transparent;
        color: ${THEME.textSoft};
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .redif-btn-ghost:hover {
        color: ${THEME.gold};
        border-color: ${THEME.gold};
      }
    `}</style>
  );
}
