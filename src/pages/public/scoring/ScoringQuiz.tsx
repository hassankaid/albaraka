// ScoringQuiz — quiz lead scoring de 7 questions mono-réponse.
// Reçoit ?funnel=<slug>&token=<uuid> (ou ?orphan=1 si pas de token = mode
// "réponse orpheline" capturée pour matching manuel CEO).
//
// Comportement :
//   1. Affiche les 7 questions une par une avec une progression
//   2. Mono-réponse à chaque (boutons radio stylisés en cards)
//   3. Auto-advance dès qu'une option est sélectionnée
//   4. À la fin → soumet à submit-scoring-quiz → redirige vers TYP Systemio
//
// On ne demande JAMAIS l'email/coordonnées au lead. Le rattachement se fait
// 100% côté backend via le token.

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { QUIZ_QUESTIONS } from "@/lib/leadScoring";
import logo from "@/assets/al-baraka-logo-v2.png";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

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

type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; redirectUrl: string }
  | { kind: "error"; message: string };

export default function ScoringQuiz() {
  const [searchParams] = useSearchParams();
  const funnel = (searchParams.get("funnel") || "").trim();
  const token = (searchParams.get("token") || "").trim() || null;
  const isOrphan = searchParams.get("orphan") === "1";

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitState, setSubmitState] = useState<SubmitState>({ kind: "idle" });

  const total = QUIZ_QUESTIONS.length;
  const currentQ = QUIZ_QUESTIONS[currentIdx];
  const allAnswered = QUIZ_QUESTIONS.every((q) => answers[q.id]);
  const progress = useMemo(() => Math.round(((currentIdx) / total) * 100), [currentIdx, total]);

  // Si aucun funnel, on bloque tout
  if (!funnel) {
    return (
      <Centered>
        <AlertTriangle size={32} style={{ color: THEME.gold, marginBottom: 14 }} />
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 10 }}>Lien invalide</h1>
        <p style={{ color: THEME.creamMuted, fontSize: 14 }}>
          Paramètre <code>?funnel=</code> manquant.
        </p>
      </Centered>
    );
  }

  // Auto-advance : dès qu'une option est sélectionnée, on attend 350ms
  // et on passe à la question suivante (ou on déclenche la soumission).
  function selectOption(optionCode: string) {
    if (submitState.kind === "submitting") return;
    const newAnswers = { ...answers, [currentQ.id]: optionCode };
    setAnswers(newAnswers);

    setTimeout(() => {
      if (currentIdx < total - 1) {
        setCurrentIdx(currentIdx + 1);
      } else {
        // Dernière question → soumission
        submit(newAnswers);
      }
    }, 350);
  }

  async function submit(finalAnswers: Record<string, string>) {
    setSubmitState({ kind: "submitting" });
    try {
      const { data, error } = await supabase.functions.invoke<{
        ok: boolean;
        score: number;
        category: string;
        redirect_url: string;
        error?: string;
        message?: string;
      }>("submit-scoring-quiz", {
        body: {
          funnel,
          token: token || undefined,
          answers: finalAnswers,
        },
      });

      // 4xx via FunctionsHttpError : lit le body
      let result = data;
      if (error) {
        const ctx = (error as { context?: Response }).context;
        if (ctx && typeof ctx.json === "function") {
          try { result = await ctx.json(); } catch { result = null as any; }
        }
        if (!result) {
          throw new Error(error.message || "Erreur réseau");
        }
      }

      if (!result?.ok) {
        throw new Error(result?.message || result?.error || "Soumission échouée");
      }

      // Succès : on redirige côté client vers la TYP Systemio
      setSubmitState({ kind: "success", redirectUrl: result.redirect_url });
      // Petit délai pour laisser voir le check vert
      setTimeout(() => {
        window.location.href = result.redirect_url;
      }, 1200);
    } catch (e: any) {
      console.error("[ScoringQuiz] submit error", e);
      setSubmitState({ kind: "error", message: e?.message || "Erreur inconnue" });
    }
  }

  function back() {
    if (currentIdx > 0 && submitState.kind === "idle") {
      setCurrentIdx(currentIdx - 1);
    }
  }

  // Vues d'état terminal
  if (submitState.kind === "submitting") {
    return (
      <Centered>
        <Loader2 size={36} className="animate-spin" style={{ color: THEME.gold, marginBottom: 18 }} />
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
          On enregistre ton diagnostic…
        </h1>
        <p style={{ color: THEME.creamMuted, fontSize: 13 }}>
          Quelques instants encore.
        </p>
      </Centered>
    );
  }

  if (submitState.kind === "success") {
    return (
      <Centered>
        <CheckCircle2 size={40} style={{ color: "rgb(74,222,128)", marginBottom: 14 }} />
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>
          Diagnostic enregistré ✓
        </h1>
        <p style={{ color: THEME.creamMuted, fontSize: 13, marginBottom: 4 }}>
          On te redirige…
        </p>
      </Centered>
    );
  }

  if (submitState.kind === "error") {
    return (
      <Centered>
        <AlertTriangle size={32} style={{ color: "rgb(248,113,113)", marginBottom: 14 }} />
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 10 }}>
          Une erreur est survenue
        </h1>
        <p style={{ color: THEME.creamMuted, fontSize: 13, marginBottom: 14 }}>
          {submitState.message}
        </p>
        <button
          type="button"
          onClick={() => submit(answers)}
          style={{
            background: `linear-gradient(135deg, ${THEME.gold}, ${THEME.goldBright})`,
            color: "#0A0A0A",
            border: "none",
            padding: "12px 24px",
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "inherit",
            cursor: "pointer",
          }}
        >
          Réessayer
        </button>
      </Centered>
    );
  }

  // Quiz en cours
  return (
    <div
      style={{
        minHeight: "100vh",
        background: THEME.bg,
        color: THEME.cream,
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: "32px 20px 60px",
      }}
    >
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <img
            src={logo}
            alt="AL BARAKA"
            style={{
              width: 60,
              height: 60,
              objectFit: "contain",
              marginInline: "auto",
              display: "block",
              filter: "drop-shadow(0 0 18px rgba(201,160,78,0.18))",
              marginBottom: 12,
            }}
          />
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: THEME.gold,
              marginBottom: 6,
            }}
          >
            Diagnostic personnalisé
          </div>
          {isOrphan && (
            <div
              style={{
                marginTop: 12,
                padding: "8px 12px",
                borderRadius: 8,
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.25)",
                fontSize: 11,
                color: "rgb(252,211,77)",
                display: "inline-block",
              }}
            >
              ⚠ Mode dégradé : tes réponses seront capturées mais leur association à ton inscription se fera manuellement.
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 32 }}>
          <div
            style={{
              height: 6,
              borderRadius: 999,
              background: THEME.goldDim,
              overflow: "hidden",
              marginBottom: 8,
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progress}%`,
                background: `linear-gradient(90deg, ${THEME.gold}, ${THEME.goldBright})`,
                transition: "width 0.4s ease-out",
              }}
            />
          </div>
          <div
            style={{
              fontSize: 11,
              color: THEME.creamMuted,
              textAlign: "center",
              letterSpacing: "0.06em",
            }}
          >
            Question {currentIdx + 1} sur {total}
          </div>
        </div>

        {/* Question + options */}
        <div
          key={currentQ.id}
          style={{
            background: "rgba(20,20,20,0.6)",
            border: `1px solid ${THEME.goldLine}`,
            borderRadius: 16,
            padding: 24,
            backdropFilter: "blur(20px)",
            boxShadow: "0 30px 60px rgba(0,0,0,0.4)",
            animation: "alb-q-slide-in 0.35s ease-out",
          }}
        >
          <h2
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: THEME.cream,
              marginTop: 0,
              marginBottom: 20,
              lineHeight: 1.4,
            }}
          >
            {currentQ.prompt}
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {currentQ.options.map((opt) => {
              const selected = answers[currentQ.id] === opt.code;
              return (
                <button
                  key={opt.code}
                  type="button"
                  onClick={() => selectOption(opt.code)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "14px 16px",
                    borderRadius: 12,
                    border: `1px solid ${selected ? THEME.gold : THEME.goldDim}`,
                    background: selected ? "rgba(201,160,78,0.12)" : "rgba(255,255,255,0.02)",
                    color: THEME.cream,
                    fontSize: 14,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    transition: "all 0.15s ease-out",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    boxShadow: selected ? "0 0 0 3px rgba(201,160,78,0.18)" : "none",
                  }}
                  onMouseEnter={(e) => {
                    if (!selected) {
                      e.currentTarget.style.borderColor = THEME.gold;
                      e.currentTarget.style.background = "rgba(201,160,78,0.06)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!selected) {
                      e.currentTarget.style.borderColor = THEME.goldDim;
                      e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                    }
                  }}
                >
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      border: `2px solid ${selected ? THEME.gold : THEME.goldDim}`,
                      background: selected ? THEME.gold : "transparent",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.15s",
                    }}
                  >
                    {selected && (
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "#0A0A0A",
                        }}
                      />
                    )}
                  </span>
                  <span style={{ flex: 1 }}>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bouton back */}
        {currentIdx > 0 && (
          <div style={{ marginTop: 18, textAlign: "center" }}>
            <button
              type="button"
              onClick={back}
              style={{
                background: "transparent",
                border: "none",
                color: THEME.creamMuted,
                fontSize: 13,
                cursor: "pointer",
                textDecoration: "underline",
                fontFamily: "inherit",
              }}
            >
              ← Question précédente
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes alb-q-slide-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
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
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        textAlign: "center",
      }}
    >
      {children}
    </div>
  );
}
