// Page publique embed dans Systemio (iframe).
// Reçoit prénom/email/tél en query params, affiche les 7 questions du
// Quiz Scoring, soumet à l'edge function, redirige vers la thank-you URL
// configurée pour le tunnel.
//
// Hauteur iframe : auto-resize via postMessage (script à mettre dans Systemio
// si supporté ; sinon fallback hauteur fixe via CSS).

import { useEffect, useReducer, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  QUIZ_QUESTIONS,
  type QuizAnswers,
  type QuizCategory,
} from "@/lib/quizScoringDefinition";

// ──────────────────────────────────────────────────────────────────────
// State
// ──────────────────────────────────────────────────────────────────────

type Phase = "loading" | "ready" | "questions" | "submitting" | "redirecting" | "error";

interface State {
  phase: Phase;
  funnel: { slug: string; name: string } | null;
  identity: { firstName: string; email: string; phone: string } | null;
  currentQ: number;
  answers: QuizAnswers;
  selectedCode: string | null;
  errorMessage: string | null;
  thankYouUrl: string | null;
  finalScore: number | null;
  finalCategory: QuizCategory | null;
}

type Action =
  | { type: "init_ok"; funnel: State["funnel"]; identity: State["identity"] }
  | { type: "init_error"; message: string }
  | { type: "start_quiz" }
  | { type: "select_option"; code: string }
  | { type: "next_question" }
  | { type: "prev_question" }
  | { type: "submit_start" }
  | { type: "submit_ok"; thankYouUrl: string; score: number; category: QuizCategory }
  | { type: "submit_error"; message: string }
  | { type: "redirect_starting" };

const initialState: State = {
  phase: "loading",
  funnel: null,
  identity: null,
  currentQ: 0,
  answers: {},
  selectedCode: null,
  errorMessage: null,
  thankYouUrl: null,
  finalScore: null,
  finalCategory: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "init_ok":
      return { ...state, phase: "ready", funnel: action.funnel, identity: action.identity };
    case "init_error":
      return { ...state, phase: "error", errorMessage: action.message };
    case "start_quiz":
      return { ...state, phase: "questions", currentQ: 0, selectedCode: null };
    case "select_option":
      return { ...state, selectedCode: action.code };
    case "next_question": {
      if (state.selectedCode == null) return state;
      const q = QUIZ_QUESTIONS[state.currentQ];
      const newAnswers: QuizAnswers = { ...state.answers, [q.id]: state.selectedCode };
      const isLast = state.currentQ === QUIZ_QUESTIONS.length - 1;
      if (isLast) {
        return { ...state, answers: newAnswers, phase: "submitting" };
      }
      const nextIdx = state.currentQ + 1;
      const nextQId = QUIZ_QUESTIONS[nextIdx].id;
      return {
        ...state,
        answers: newAnswers,
        currentQ: nextIdx,
        selectedCode: newAnswers[nextQId] ?? null,
      };
    }
    case "prev_question": {
      if (state.currentQ === 0) return state;
      const prevIdx = state.currentQ - 1;
      const prevQId = QUIZ_QUESTIONS[prevIdx].id;
      return { ...state, currentQ: prevIdx, selectedCode: state.answers[prevQId] ?? null };
    }
    case "submit_start":
      return { ...state, phase: "submitting", errorMessage: null };
    case "submit_ok":
      return {
        ...state,
        phase: "redirecting",
        thankYouUrl: action.thankYouUrl,
        finalScore: action.score,
        finalCategory: action.category,
      };
    case "submit_error":
      return { ...state, phase: "questions", errorMessage: action.message };
    case "redirect_starting":
      return { ...state, phase: "redirecting" };
    default:
      return state;
  }
}

// ──────────────────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────────────────

export default function QuizFunnel() {
  const [searchParams] = useSearchParams();
  const [state, dispatch] = useReducer(reducer, initialState);
  const submitOnceRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // ─── 1. Init : valider params + résoudre le tunnel ───
  useEffect(() => {
    const slug = (searchParams.get("slug") || "").toLowerCase().trim();
    const firstName = (searchParams.get("prenom") || searchParams.get("first_name") || "").trim();
    const email = (searchParams.get("email") || "").trim();
    const phone = (searchParams.get("tel") || searchParams.get("phone") || "").trim();

    if (!slug) {
      dispatch({ type: "init_error", message: "Lien invalide : tunnel manquant." });
      return;
    }
    if (!firstName || firstName.length < 2) {
      dispatch({ type: "init_error", message: "Prénom manquant dans le lien." });
      return;
    }
    if (!email) {
      dispatch({ type: "init_error", message: "Email manquant dans le lien." });
      return;
    }
    if (!phone) {
      dispatch({ type: "init_error", message: "Numéro de téléphone manquant dans le lien." });
      return;
    }

    // Résolution du tunnel via la table publique en lecture
    (async () => {
      const { data, error } = await supabase
        .from("quiz_funnels")
        .select("slug, name, active")
        .eq("slug", slug)
        .maybeSingle();

      if (error) {
        dispatch({ type: "init_error", message: "Erreur de chargement. Réessaie." });
        return;
      }
      if (!data) {
        dispatch({ type: "init_error", message: "Tunnel introuvable." });
        return;
      }
      if (!data.active) {
        dispatch({ type: "init_error", message: "Ce questionnaire n'est plus actif." });
        return;
      }

      dispatch({
        type: "init_ok",
        funnel: { slug: data.slug, name: data.name },
        identity: { firstName, email, phone },
      });
    })();
  }, [searchParams]);

  // ─── 2. Auto-démarrer le quiz quand prêt ───
  useEffect(() => {
    if (state.phase === "ready") {
      const t = setTimeout(() => dispatch({ type: "start_quiz" }), 300);
      return () => clearTimeout(t);
    }
  }, [state.phase]);

  // ─── 3. Soumission à l'edge function ───
  useEffect(() => {
    if (state.phase !== "submitting" || submitOnceRef.current) return;
    if (!state.funnel || !state.identity) return;
    submitOnceRef.current = true;

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("submit-funnel-quiz", {
          body: {
            slug: state.funnel!.slug,
            first_name: state.identity!.firstName,
            email: state.identity!.email,
            phone: state.identity!.phone,
            answers: state.answers,
          },
        });

        if (error) {
          submitOnceRef.current = false;
          dispatch({ type: "submit_error", message: "Une erreur est survenue. Réessaie." });
          return;
        }
        if (!data?.ok) {
          submitOnceRef.current = false;
          dispatch({ type: "submit_error", message: data?.message || "Soumission impossible." });
          return;
        }

        dispatch({
          type: "submit_ok",
          thankYouUrl: data.thank_you_url,
          score: data.score,
          category: data.category,
        });
      } catch {
        submitOnceRef.current = false;
        dispatch({ type: "submit_error", message: "Erreur réseau. Réessaie." });
      }
    })();
  }, [state.phase, state.funnel, state.identity, state.answers]);

  // ─── 4. Redirection après succès ───
  useEffect(() => {
    if (state.phase !== "redirecting" || !state.thankYouUrl) return;
    // On laisse 1.5s pour que l'utilisateur voie le résultat avant redirect.
    const t = setTimeout(() => {
      // Si on est dans une iframe Systemio, on pousse la redirection sur le
      // top frame (sinon Systemio reste en sandwich autour de la thank-you).
      try {
        if (window.top && window.top !== window.self) {
          window.top.location.href = state.thankYouUrl!;
          return;
        }
      } catch {
        // bloquage cross-origin : fallback sur la frame courante
      }
      window.location.href = state.thankYouUrl!;
    }, 1500);
    return () => clearTimeout(t);
  }, [state.phase, state.thankYouUrl]);

  // ─── 5. Auto-resize iframe via postMessage ───
  // Émet la hauteur du contenu vers la frame parent (Systemio peut écouter
  // ce message pour ajuster la hauteur de l'iframe automatiquement).
  useEffect(() => {
    if (!containerRef.current) return;
    const sendHeight = () => {
      const h = containerRef.current?.scrollHeight ?? 0;
      try {
        window.parent?.postMessage({ type: "quiz-funnel-resize", height: h }, "*");
      } catch { /* noop */ }
    };
    sendHeight();
    const ro = new ResizeObserver(sendHeight);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [state.phase, state.currentQ]);

  return (
    <div ref={containerRef} className="min-h-screen w-full bg-[#0a0908] text-[#f4ecd8] font-sans">
      {state.phase === "loading" && <LoadingView />}
      {state.phase === "error" && <ErrorView message={state.errorMessage || "Erreur."} />}
      {(state.phase === "ready" || state.phase === "questions" || state.phase === "submitting") && state.funnel && state.identity && (
        <QuizContent state={state} dispatch={dispatch} />
      )}
      {state.phase === "redirecting" && (
        <RedirectView
          firstName={state.identity?.firstName || ""}
          score={state.finalScore ?? 0}
          category={state.finalCategory ?? "tiede"}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Sub-views
// ──────────────────────────────────────────────────────────────────────

function LoadingView() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#C9A04E]/30 border-t-[#E4C57A]" />
        <p className="mt-6 text-sm tracking-wider text-[#f4ecd8]/60 uppercase">Chargement</p>
      </div>
    </div>
  );
}

function ErrorView({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
          <svg className="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-base text-[#f4ecd8]">{message}</p>
        <p className="mt-3 text-xs text-[#f4ecd8]/50">
          Si le problème persiste, contacte-nous ou clique à nouveau sur le lien d'invitation.
        </p>
      </div>
    </div>
  );
}

function QuizContent({ state, dispatch }: { state: State; dispatch: React.Dispatch<Action> }) {
  const isQuestions = state.phase === "questions";
  const isSubmitting = state.phase === "submitting";
  const total = QUIZ_QUESTIONS.length;
  const q = QUIZ_QUESTIONS[state.currentQ];
  const progress = ((state.currentQ + (isQuestions ? 0 : 1)) / total) * 100;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-5 py-10 sm:px-8 sm:py-12">
      {/* En-tête : nom du tunnel + progression */}
      <div className="mb-8 sm:mb-10">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#C9A04E]/70">
          Quiz Scoring · {state.funnel?.name}
        </p>
        <h1 className="mt-3 text-2xl font-light leading-tight text-[#f4ecd8] sm:text-3xl" style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}>
          {state.identity?.firstName ? `Salam ${state.identity.firstName},` : "Salam,"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[#f4ecd8]/70 sm:text-base">
          Quelques questions rapides pour qu'on prépare au mieux ton prochain échange avec un de nos conseillers.
        </p>
      </div>

      {/* Progression */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.15em] text-[#f4ecd8]/50">
          <span>Question {state.currentQ + 1} / {total}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-[#f4ecd8]/10">
          <div
            className="h-full bg-gradient-to-r from-[#C9A04E] to-[#E4C57A] transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      {isSubmitting ? (
        <SubmittingView />
      ) : (
        <div className="flex-1">
          <h2
            className="text-xl leading-snug text-[#f4ecd8] sm:text-2xl"
            style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 500 }}
          >
            {q.title}
          </h2>

          <div className="mt-6 space-y-2.5">
            {q.options.map((opt) => {
              const selected = state.selectedCode === opt.code;
              return (
                <button
                  key={opt.code}
                  type="button"
                  onClick={() => dispatch({ type: "select_option", code: opt.code })}
                  className={`group w-full rounded-lg border px-4 py-3.5 text-left text-[14px] leading-snug transition-all sm:px-5 sm:py-4 sm:text-[15px] ${
                    selected
                      ? "border-[#C9A04E] bg-[#C9A04E]/10 text-[#f4ecd8]"
                      : "border-[#f4ecd8]/15 bg-[#f4ecd8]/[0.02] text-[#f4ecd8]/85 hover:border-[#C9A04E]/40 hover:bg-[#C9A04E]/5"
                  }`}
                >
                  <span className="flex items-start gap-3">
                    <span
                      className={`mt-[3px] flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border transition-colors ${
                        selected ? "border-[#E4C57A] bg-[#E4C57A]" : "border-[#f4ecd8]/30 group-hover:border-[#C9A04E]/60"
                      }`}
                    >
                      {selected && <span className="h-1.5 w-1.5 rounded-full bg-[#0a0908]" />}
                    </span>
                    <span>{opt.label}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Erreur de soumission éventuelle */}
          {state.errorMessage && (
            <p className="mt-4 text-sm text-red-400">{state.errorMessage}</p>
          )}

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={() => dispatch({ type: "prev_question" })}
              disabled={state.currentQ === 0}
              className="text-[13px] uppercase tracking-[0.15em] text-[#f4ecd8]/50 transition-colors hover:text-[#f4ecd8]/80 disabled:opacity-0 disabled:pointer-events-none"
            >
              ← Précédent
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: "next_question" })}
              disabled={state.selectedCode == null}
              className="rounded-md bg-gradient-to-r from-[#C9A04E] to-[#E4C57A] px-6 py-2.5 text-[13px] font-medium uppercase tracking-[0.12em] text-[#0a0908] transition-opacity hover:opacity-90 disabled:opacity-30 disabled:pointer-events-none sm:px-8 sm:py-3"
            >
              {state.currentQ === total - 1 ? "Terminer" : "Suivant →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SubmittingView() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-16">
      <div className="h-12 w-12 animate-spin rounded-full border-2 border-[#C9A04E]/30 border-t-[#E4C57A]" />
      <p className="mt-8 text-base text-[#f4ecd8]" style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}>
        On enregistre tes réponses...
      </p>
      <p className="mt-2 text-xs uppercase tracking-[0.15em] text-[#f4ecd8]/50">
        Quelques secondes
      </p>
    </div>
  );
}

const CATEGORY_DISPLAY: Record<QuizCategory, { title: string; subtitle: string }> = {
  chaud: {
    title: "On t'appelle très vite.",
    subtitle: "Ton profil correspond exactement à ce qu'on cherche. Reste joignable.",
  },
  tiede: {
    title: "On va t'accompagner.",
    subtitle: "Un conseiller va prendre contact pour mieux comprendre ton projet.",
  },
  froid: {
    title: "On va échanger.",
    subtitle: "Un conseiller te recontacte pour cadrer ton projet ensemble.",
  },
  hors_cible: {
    title: "Merci pour tes réponses.",
    subtitle: "On revient vers toi rapidement.",
  },
};

function RedirectView({
  firstName,
  category,
}: {
  firstName: string;
  score: number;
  category: QuizCategory;
}) {
  const display = CATEGORY_DISPLAY[category];
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-lg text-center">
        <div className="mx-auto mb-6 h-14 w-14 rounded-full bg-[#C9A04E]/15 flex items-center justify-center">
          <svg className="h-7 w-7 text-[#E4C57A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2
          className="text-2xl text-[#f4ecd8] sm:text-3xl"
          style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 400 }}
        >
          {firstName ? `Baraka Allahou fik ${firstName}.` : "Baraka Allahou fik."}
        </h2>
        <p className="mt-4 text-base text-[#E4C57A]">{display.title}</p>
        <p className="mt-2 text-sm text-[#f4ecd8]/65">{display.subtitle}</p>
        <p className="mt-8 text-[11px] uppercase tracking-[0.15em] text-[#f4ecd8]/40">
          Redirection en cours...
        </p>
      </div>
    </div>
  );
}
