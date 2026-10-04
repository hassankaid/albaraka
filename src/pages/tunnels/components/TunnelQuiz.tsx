// ─────────────────────────────────────────────────────────────────────────
// Quiz de lead scoring des tunnels WhatsApp et VSL (04/10/2026).
//
// Reprend le quiz de l'époque Systeme.io (pages /scoring/*) : mêmes 7
// questions, mêmes textes, une question à la fois, passage automatique à la
// suivante, retour possible. Seul l'habillage change : celui du tunnel.
//
// Placé entre l'inscription et la page de remerciement, OBLIGATOIRE (pas de
// bouton « passer »), comme avant. Mais il ne bloque jamais un inscrit : sans
// jeton, ou si l'enregistrement échoue deux fois, on va au remerciement.
//
// C'est la première page après l'inscription : c'est donc ICI que part le
// « Lead » vers les régies. Quelqu'un qui abandonne le quiz reste compté.
// ─────────────────────────────────────────────────────────────────────────
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { QUIZ_QUESTIONS } from "@/lib/leadScoring";
import { T, ensureTunnelFonts } from "../theme";
import { trackTypLead } from "../lib/pixel";
import { avecVariante, envoyerQuiz, lireJetonQuiz, oublierJetonQuiz } from "../lib/quiz";
import TunnelBackground from "./TunnelBackground";
import type { TunnelConfig } from "../config";

type Etat = "questions" | "envoi" | "fait";

export default function TunnelQuiz({ tunnel }: { tunnel: TunnelConfig }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const variant = params.get("v");
  const merci = avecVariante(tunnel.merciPath, variant);
  const [jeton] = useState(() => lireJetonQuiz(tunnel));

  const [index, setIndex] = useState(0);
  const [reponses, setReponses] = useState<Record<string, string>>({});
  const [etat, setEtat] = useState<Etat>("questions");

  const total = QUIZ_QUESTIONS.length;
  const question = QUIZ_QUESTIONS[index];
  const progression = useMemo(() => Math.round((index / total) * 100), [index, total]);

  useEffect(() => {
    // Première page après l'inscription : le « Lead » part d'ici (garde-fou
    // à usage unique dans pixel.ts — la page de remerciement ne le recompte pas).
    void trackTypLead();
    ensureTunnelFonts();
    document.title = "Diagnostic personnalisé — Al Baraka";
    if (!jeton) navigate(merci, { replace: true });
  }, [jeton, merci, navigate]);

  async function envoyer(finales: Record<string, string>) {
    setEtat("envoi");
    for (let essai = 0; essai < 2; essai++) {
      try {
        await envoyerQuiz(tunnel, jeton!, finales);
        oublierJetonQuiz(tunnel);
        setEtat("fait");
        window.setTimeout(() => navigate(merci, { replace: true }), 1200);
        return;
      } catch (err) {
        console.warn("[tunnel-quiz] enregistrement échoué :", err);
      }
    }
    // Deux échecs : on n'insiste pas, l'inscrit ne doit pas rester bloqué.
    oublierJetonQuiz(tunnel);
    navigate(merci, { replace: true });
  }

  function choisir(code: string) {
    if (etat !== "questions") return;
    const nouvelles = { ...reponses, [question.id]: code };
    setReponses(nouvelles);
    window.setTimeout(() => {
      if (index < total - 1) setIndex(index + 1);
      else void envoyer(nouvelles);
    }, 350);
  }

  if (!jeton) return <div style={{ minHeight: "100vh", background: T.bg }} aria-hidden />;

  return (
    <div style={{ position: "relative", minHeight: "100vh", background: T.bg, color: T.cream, fontFamily: T.body, overflowX: "hidden" }}>
      <TunnelBackground />
      <style>{`
        @keyframes albq-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @keyframes albq-spin { to { transform: rotate(360deg); } }
        .albq-option { transition: border-color .15s ease, background .15s ease, box-shadow .15s ease; }
        /* Survol réservé aux souris : au doigt, il resterait « collé » sur la
           réponse placée au même endroit à la question suivante. */
        @media (hover: hover) {
          .albq-option:hover { border-color: ${T.gold} !important; background: rgba(201,160,78,0.06) !important; }
        }
      `}</style>

      <header style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "28px 0 4px" }}>
        <div style={{ fontFamily: T.display, letterSpacing: "0.34em", fontWeight: 600, fontSize: "clamp(1.05rem,3.2vw,1.25rem)", color: T.gold }}>
          AL&nbsp;BARAKA
        </div>
        <div style={{ fontSize: "0.62rem", letterSpacing: "0.34em", color: T.creamDim, marginTop: 6, textTransform: "uppercase" }}>
          Écosystème
        </div>
      </header>

      <main style={{ position: "relative", zIndex: 1, maxWidth: 640, margin: "0 auto", padding: "clamp(22px,4vw,40px) 20px 60px" }}>
        {etat === "questions" ? (
          <>
            <div style={{ textAlign: "center", fontSize: "0.72rem", letterSpacing: "0.18em", textTransform: "uppercase", color: T.gold, marginBottom: 22 }}>
              Diagnostic personnalisé
            </div>

            <div style={{ marginBottom: 28 }}>
              <div style={{ height: 6, borderRadius: 999, background: T.goldDim, overflow: "hidden", marginBottom: 8 }}>
                <div
                  style={{
                    height: "100%",
                    width: `${progression}%`,
                    background: `linear-gradient(90deg, ${T.gold}, ${T.goldBright})`,
                    transition: "width .4s ease-out",
                  }}
                />
              </div>
              <div style={{ fontSize: "0.72rem", color: T.creamMuted, textAlign: "center", letterSpacing: "0.06em" }}>
                Question {index + 1} sur {total}
              </div>
            </div>

            <div
              key={question.id}
              style={{
                background: "rgba(20,17,12,0.62)",
                border: `1px solid ${T.goldLine}`,
                borderRadius: 16,
                padding: "clamp(18px,4vw,26px)",
                backdropFilter: "blur(18px)",
                boxShadow: "0 30px 60px rgba(0,0,0,0.4)",
                animation: "albq-in .35s ease-out",
              }}
            >
              <h1 style={{ fontFamily: T.body, fontSize: "clamp(1.05rem,3.4vw,1.2rem)", fontWeight: 600, lineHeight: 1.4, margin: "0 0 18px", color: T.cream }}>
                {question.prompt}
              </h1>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {question.options.map((opt) => {
                  const choisie = reponses[question.id] === opt.code;
                  return (
                    <button
                      key={opt.code}
                      type="button"
                      className="albq-option"
                      onClick={() => choisir(opt.code)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "14px 16px",
                        borderRadius: 12,
                        border: `1px solid ${choisie ? T.gold : T.goldLine}`,
                        background: choisie ? "rgba(201,160,78,0.12)" : "rgba(255,255,255,0.02)",
                        boxShadow: choisie ? "0 0 0 3px rgba(201,160,78,0.18)" : "none",
                        color: T.cream,
                        fontFamily: T.body,
                        fontSize: "0.95rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <span
                        aria-hidden
                        style={{
                          width: 20,
                          height: 20,
                          flexShrink: 0,
                          borderRadius: "50%",
                          border: `2px solid ${choisie ? T.gold : T.goldLine}`,
                          background: choisie ? T.gold : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {choisie && <span style={{ width: 8, height: 8, borderRadius: "50%", background: T.bg }} />}
                      </span>
                      <span style={{ flex: 1 }}>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {index > 0 && (
              <div style={{ marginTop: 18, textAlign: "center" }}>
                <button
                  type="button"
                  onClick={() => setIndex(index - 1)}
                  style={{ background: "transparent", border: "none", color: T.creamMuted, fontSize: "0.85rem", cursor: "pointer", textDecoration: "underline", fontFamily: T.body }}
                >
                  ← Question précédente
                </button>
              </div>
            )}
          </>
        ) : (
          <div role="status" style={{ textAlign: "center", padding: "12vh 0" }}>
            {etat === "envoi" ? (
              <>
                <div
                  aria-hidden
                  style={{
                    width: 36,
                    height: 36,
                    margin: "0 auto 18px",
                    borderRadius: "50%",
                    border: `3px solid ${T.goldDim}`,
                    borderTopColor: T.gold,
                    animation: "albq-spin .9s linear infinite",
                  }}
                />
                <h1 style={{ fontFamily: T.body, fontSize: "1.25rem", fontWeight: 600, margin: "0 0 8px" }}>On enregistre ton diagnostic…</h1>
                <p style={{ color: T.creamMuted, fontSize: "0.85rem", margin: 0 }}>Quelques instants encore.</p>
              </>
            ) : (
              <>
                <h1 style={{ fontFamily: T.body, fontSize: "1.35rem", fontWeight: 600, margin: "0 0 8px", color: T.cream }}>Diagnostic enregistré ✓</h1>
                <p style={{ color: T.creamMuted, fontSize: "0.85rem", margin: 0 }}>On te redirige…</p>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
