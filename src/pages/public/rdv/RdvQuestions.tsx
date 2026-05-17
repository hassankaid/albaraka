// RdvQuestions — Page 2 étapes 2-6 du funnel /rdv.
// Step-by-step (une question à la fois, pas de scroll long), affichage
// d'une barre de progression.
//
// Comportement :
//   - Récupère lead_id depuis sessionStorage (sinon redirige vers /rdv)
//   - Affiche Q1..Q5 séquentiellement
//   - Click sur une option YES → log via edge function, puis next question
//   - Click sur une option NO → log via edge function (status=disqualified),
//                                 puis redirect /rdv/disqualification/<slug>
//   - À la fin (5 OUI) → call action="qualified" → redirect /rdv/calendly
//
// Le bouton "Question précédente" est aussi disponible pour permettre au
// user de revenir en arrière. Si il revient et change un OUI précédent en
// NON, l'edge function loggera une nouvelle réponse (l'historique est gardé,
// la "dernière réponse" prévaut côté action="qualified").
//
// Cas spécial : le user peut atterrir ici depuis une page de disqualification
// (bouton retour) via /rdv/questions?from=2 (ou autre index 1..5). Dans ce
// cas, on positionne directement currentIdx sur cette question.

import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/al-baraka-logo-v2.png";
import { ChevronLeft } from "lucide-react";
import { THEME, QUESTIONS, getStoredLeadId, clearStoredLeadId } from "./rdvShared";

type Phase = "asking" | "submitting" | "transitioning";

export default function RdvQuestions() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromParam = Number(searchParams.get("from") || "1");
  const initialIdx = Number.isInteger(fromParam) && fromParam >= 1 && fromParam <= 5 ? fromParam - 1 : 0;

  const [leadId, setLeadId] = useState<string | null>(null);
  const [currentIdx, setCurrentIdx] = useState(initialIdx);
  const [phase, setPhase] = useState<Phase>("asking");
  const [error, setError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    const stored = getStoredLeadId();
    if (!stored) {
      // Pas de lead_id → on n'a pas fait le step coords, on redirige
      navigate("/rdv", { replace: true });
      return;
    }
    setLeadId(stored);
  }, [navigate]);

  const totalQuestions = QUESTIONS.length;
  const currentQ = QUESTIONS[currentIdx];
  const progressPct = Math.round(((currentIdx + 1) / totalQuestions) * 100);

  async function submitAnswer(answer: "yes" | "no") {
    if (submittingRef.current || !leadId || !currentQ) return;
    submittingRef.current = true;
    setPhase("submitting");
    setError(null);

    try {
      const { data, error: fnErr } = await supabase.functions.invoke<{
        ok?: boolean;
        error?: string;
      }>("rdv-funnel-submit", {
        body: {
          action: "answer",
          lead_id: leadId,
          question_index: currentQ.index,
          answer,
        },
      });

      if (fnErr || !data?.ok) {
        console.error("[RdvQuestions] submit answer error", fnErr, data);
        setError("Une erreur est survenue. Merci de réessayer.");
        setPhase("asking");
        submittingRef.current = false;
        return;
      }

      // Petit délai pour l'animation (fade-out)
      setPhase("transitioning");
      window.setTimeout(async () => {
        if (answer === "no") {
          navigate(`/rdv/disqualification/${currentQ.disqualSlug}`);
          return;
        }
        // YES : question suivante ou finalisation
        if (currentIdx === totalQuestions - 1) {
          // Toutes les questions répondues → finaliser
          try {
            const { data: qData, error: qErr } = await supabase.functions.invoke<{
              ok?: boolean;
              error?: string;
              already_qualified?: boolean;
            }>("rdv-funnel-submit", {
              body: {
                action: "qualified",
                lead_id: leadId,
              },
            });
            if (qErr || !qData?.ok) {
              console.error("[RdvQuestions] qualified error", qErr, qData);
              setError("Une erreur est survenue. Merci de réessayer.");
              setPhase("asking");
              submittingRef.current = false;
              return;
            }
            navigate("/rdv/calendly");
          } catch (e) {
            console.error("[RdvQuestions] qualified unexpected", e);
            setError("Une erreur est survenue. Merci de réessayer.");
            setPhase("asking");
            submittingRef.current = false;
          }
        } else {
          // Question suivante
          setCurrentIdx((idx) => idx + 1);
          setPhase("asking");
          submittingRef.current = false;
        }
      }, 220);
    } catch (e) {
      console.error("[RdvQuestions] unexpected", e);
      setError("Une erreur est survenue. Merci de réessayer.");
      setPhase("asking");
      submittingRef.current = false;
    }
  }

  function goBack() {
    if (currentIdx === 0) {
      navigate("/rdv/coordonnees");
      return;
    }
    setCurrentIdx((idx) => idx - 1);
  }

  if (!leadId) {
    // Loader court le temps du redirect (cas pas de lead_id)
    return (
      <div
        style={{
          minHeight: "100vh",
          background: THEME.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: `3px solid ${THEME.goldDim}`,
            borderTopColor: THEME.gold,
            animation: "rdv-spin 0.9s linear infinite",
          }}
        />
        <style>{`@keyframes rdv-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

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
        padding: "40px 20px 60px",
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
          maxWidth: 580,
        }}
      >
        {/* Header : logo + progression */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <img
            src={logo}
            alt="AL BARAKA"
            style={{
              width: 56,
              height: 56,
              objectFit: "contain",
              marginInline: "auto",
              display: "block",
              marginBottom: 22,
              filter: "drop-shadow(0 0 18px rgba(201,160,78,0.24))",
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 12, maxWidth: 320, marginInline: "auto" }}>
            <div
              style={{
                flex: 1,
                height: 4,
                borderRadius: 999,
                background: THEME.goldDim,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${progressPct}%`,
                  background: `linear-gradient(90deg, ${THEME.gold} 0%, ${THEME.goldBright} 100%)`,
                  borderRadius: 999,
                  transition: "width 280ms ease",
                }}
              />
            </div>
            <div
              style={{
                fontSize: 11,
                color: THEME.gold,
                letterSpacing: "0.08em",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {currentIdx + 1} / {totalQuestions}
            </div>
          </div>
        </div>

        {/* Question */}
        <div
          key={currentQ.index}
          style={{
            background: THEME.bgSoft,
            border: `1px solid ${THEME.goldLine}`,
            borderRadius: 18,
            padding: "30px 28px 28px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            opacity: phase === "transitioning" ? 0.35 : 1,
            transform: phase === "transitioning" ? "translateY(-4px)" : "translateY(0)",
            transition: "opacity 220ms ease, transform 220ms ease",
            animation: "rdv-fade-in 0.4s ease-out",
          }}
        >
          <div
            style={{
              fontSize: 10.5,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: THEME.gold,
              marginBottom: 12,
            }}
          >
            Question {currentQ.index} sur {totalQuestions}
          </div>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 600,
              lineHeight: 1.35,
              margin: 0,
              marginBottom: 28,
              color: THEME.cream,
            }}
          >
            {currentQ.title}
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button
              type="button"
              onClick={() => submitAnswer("yes")}
              disabled={phase !== "asking"}
              style={{
                background: phase === "asking"
                  ? `linear-gradient(180deg, ${THEME.goldBright} 0%, ${THEME.gold} 100%)`
                  : THEME.goldDim,
                color: phase === "asking" ? "#1A1407" : THEME.cream,
                fontWeight: 600,
                fontSize: 14.5,
                padding: "14px 20px",
                borderRadius: 12,
                border: "none",
                cursor: phase === "asking" ? "pointer" : "default",
                textAlign: "left",
                lineHeight: 1.45,
                transition: "transform 120ms ease, box-shadow 120ms ease",
                boxShadow: phase === "asking"
                  ? "0 4px 18px rgba(201,160,78,0.22), inset 0 1px 0 rgba(255,255,255,0.18)"
                  : "none",
              }}
              onMouseEnter={(e) => {
                if (phase !== "asking") return;
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
              }}
            >
              {currentQ.yesLabel}
            </button>

            <button
              type="button"
              onClick={() => submitAnswer("no")}
              disabled={phase !== "asking"}
              style={{
                background: "transparent",
                color: THEME.cream,
                fontWeight: 500,
                fontSize: 14.5,
                padding: "14px 20px",
                borderRadius: 12,
                border: `1px solid ${THEME.goldLine}`,
                cursor: phase === "asking" ? "pointer" : "default",
                textAlign: "left",
                lineHeight: 1.45,
                transition: "background 120ms ease, border-color 120ms ease",
                opacity: phase === "asking" ? 1 : 0.6,
              }}
              onMouseEnter={(e) => {
                if (phase !== "asking") return;
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(201,160,78,0.05)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = THEME.gold;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                (e.currentTarget as HTMLButtonElement).style.borderColor = THEME.goldLine;
              }}
            >
              {currentQ.noLabel}
            </button>
          </div>

          {error && (
            <div
              style={{
                marginTop: 16,
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
        </div>

        {/* Bouton retour */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
          <button
            type="button"
            onClick={goBack}
            disabled={phase !== "asking"}
            style={{
              background: "transparent",
              color: THEME.creamMuted,
              border: "none",
              fontSize: 13,
              cursor: phase === "asking" ? "pointer" : "default",
              padding: "6px 12px",
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontFamily: "inherit",
              transition: "color 120ms ease",
              opacity: phase === "asking" ? 1 : 0.5,
            }}
            onMouseEnter={(e) => {
              if (phase !== "asking") return;
              (e.currentTarget as HTMLButtonElement).style.color = THEME.cream;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = THEME.creamMuted;
            }}
          >
            <ChevronLeft size={14} />
            {currentIdx === 0 ? "Retour aux coordonnées" : "Question précédente"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes rdv-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
