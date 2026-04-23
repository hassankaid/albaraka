import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { isValidPhoneNumber } from "react-phone-number-input";
import {
  pingView,
  resolveQuiz,
  submitEmailCapture,
  submitPhoneCapture,
  submitQuizCompleted,
  submitQuizProgress,
  submitWhatsAppClicked,
} from "./api";
import type { AnswersMap, ProfileKey, QuizAnswer, QuizConfig, QuizOption, QuizOwner, QuizPhase, QuizQuestion, Scores } from "./types";
import {
  CalculatingPhase,
  ConferencePhase,
  FormPhase,
  IntroQuizPhase,
  LandingPhase,
  PhonePhase,
  QuestionPhase,
  QuizErrorScreen,
  QuizFrame,
  QuizLoadingScreen,
  QuizProgressBar,
  ResultPhase,
} from "./LeadQuizUI";

// ──────────────────────────────────────────────────────────────────────
// Validation
// ──────────────────────────────────────────────────────────────────────

const DISPOSABLE_DOMAINS = [
  "yopmail.com", "tempmail.com", "guerrillamail.com", "mailinator.com", "throwaway.email",
  "temp-mail.org", "fakeinbox.com", "sharklasers.com", "guerrillamailblock.com", "grr.la",
  "dispostable.com", "trashmail.com", "10minutemail.com", "tempail.com", "mohmal.com",
  "maildrop.cc", "harakirimail.com", "tmpmail.net", "bupmail.com", "emailfake.com",
];

function validateEmail(email: string): { valid: boolean; error: string | null } {
  if (!email || email.trim().length < 5) return { valid: false, error: "Adresse email requise" };
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!regex.test(email.trim())) return { valid: false, error: "Format d'email invalide" };
  const domain = email.trim().split("@")[1].toLowerCase();
  if (DISPOSABLE_DOMAINS.includes(domain)) return { valid: false, error: "Les adresses email temporaires ne sont pas acceptées" };
  return { valid: true, error: null };
}

function validatePhone(phone: string): { valid: boolean; error: string | null } {
  if (!phone || phone.trim().length < 4) return { valid: false, error: "Numéro de téléphone requis" };
  try {
    if (!isValidPhoneNumber(phone)) return { valid: false, error: "Numéro invalide" };
  } catch {
    return { valid: false, error: "Numéro invalide" };
  }
  return { valid: true, error: null };
}

// ──────────────────────────────────────────────────────────────────────
// State
// ──────────────────────────────────────────────────────────────────────

interface State {
  phase: QuizPhase;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  currentQ: number;
  answers: AnswersMap;
  scores: Scores;
  selectedOption: string | null;
  showInsight: boolean;
  orientationChoice: ProfileKey | null;
  resultProfile: ProfileKey | null;
  submissionId: string | null;
  formErrors: Partial<Record<"firstName" | "lastName" | "email" | "phone", string>>;
  submittingForm: boolean;
  submittingPhone: boolean;
  phoneCaptured: boolean;
}

const initialState: State = {
  phase: "landing",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  currentQ: 0,
  answers: {},
  scores: { batisseur: 0, connecteur: 0, createur: 0 },
  selectedOption: null,
  showInsight: false,
  orientationChoice: null,
  resultProfile: null,
  submissionId: null,
  formErrors: {},
  submittingForm: false,
  submittingPhone: false,
  phoneCaptured: false,
};

type Action =
  | { type: "SET_PHASE"; phase: QuizPhase }
  | { type: "SET_CURRENT_Q"; q: number }
  | { type: "SET_FORM_FIELD"; field: "firstName" | "lastName" | "email" | "phone"; value: string }
  | { type: "SET_FORM_ERRORS"; errors: State["formErrors"] }
  | { type: "SET_SUBMITTING_FORM"; value: boolean }
  | { type: "SET_SUBMITTING_PHONE"; value: boolean }
  | { type: "SET_SUBMISSION_ID"; id: string }
  | { type: "SELECT_OPTION"; question: QuizQuestion; option: QuizOption }
  | { type: "SHOW_INSIGHT" }
  | { type: "CLEAR_SELECTION" }
  | { type: "SET_ORIENTATION"; value: ProfileKey; profile: ProfileKey }
  | { type: "SET_RESULT_PROFILE"; profile: ProfileKey }
  | { type: "MARK_PHONE_CAPTURED" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_PHASE":
      return { ...state, phase: action.phase };
    case "SET_CURRENT_Q":
      return { ...state, currentQ: action.q, selectedOption: null, showInsight: false };
    case "SET_FORM_FIELD":
      return {
        ...state,
        [action.field]: action.value,
        formErrors: { ...state.formErrors, [action.field]: undefined },
      };
    case "SET_FORM_ERRORS":
      return { ...state, formErrors: action.errors };
    case "SET_SUBMITTING_FORM":
      return { ...state, submittingForm: action.value };
    case "SET_SUBMITTING_PHONE":
      return { ...state, submittingPhone: action.value };
    case "SET_SUBMISSION_ID":
      return { ...state, submissionId: action.id };
    case "SELECT_OPTION": {
      const { question, option } = action;
      const answer: QuizAnswer = { text: option.text, value: option.value, icon: option.icon };
      const newAnswers = { ...state.answers, [question.id]: answer };
      const newScores = { ...state.scores };
      if (option.scores) {
        newScores.batisseur += option.scores.batisseur ?? 0;
        newScores.connecteur += option.scores.connecteur ?? 0;
        newScores.createur += option.scores.createur ?? 0;
      }
      return { ...state, answers: newAnswers, scores: newScores, selectedOption: option.text };
    }
    case "SHOW_INSIGHT":
      return { ...state, showInsight: true };
    case "CLEAR_SELECTION":
      return { ...state, selectedOption: null, showInsight: false };
    case "SET_ORIENTATION":
      return { ...state, orientationChoice: action.value, resultProfile: action.profile };
    case "SET_RESULT_PROFILE":
      return { ...state, resultProfile: action.profile };
    case "MARK_PHONE_CAPTURED":
      return { ...state, phoneCaptured: true };
    default:
      return state;
  }
}

// ──────────────────────────────────────────────────────────────────────
// LocalStorage helpers
// ──────────────────────────────────────────────────────────────────────

const STORAGE_PREFIX = "alb-quiz-submission-";

function loadStoredSubmission(slug: string): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + slug);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.submission_id && typeof parsed.submission_id === "string") {
      // Ne ressusciter que si moins de 72h
      if (parsed.ts && Date.now() - parsed.ts < 72 * 3600 * 1000) return parsed.submission_id;
    }
  } catch {
    // noop
  }
  return null;
}

function storeSubmission(slug: string, submissionId: string) {
  try {
    localStorage.setItem(STORAGE_PREFIX + slug, JSON.stringify({ submission_id: submissionId, ts: Date.now() }));
  } catch {
    // noop
  }
}

function clearStoredSubmission(slug: string) {
  try {
    localStorage.removeItem(STORAGE_PREFIX + slug);
  } catch {
    // noop
  }
}

// ──────────────────────────────────────────────────────────────────────
// Helpers quiz
// ──────────────────────────────────────────────────────────────────────

function getActiveSituationQuestions(questions: QuizQuestion[], answers: AnswersMap): QuizQuestion[] {
  return questions.filter((q) => {
    if (!q.showIf) return true;
    const prev = answers[q.showIf.questionId];
    return prev && prev.value === q.showIf.value;
  });
}

function calculateResult(scores: Scores, orientation: ProfileKey): ProfileKey {
  const f = { ...scores };
  f[orientation] = (f[orientation] ?? 0) + 5;
  const max = Math.max(f.batisseur, f.connecteur, f.createur);
  if (f.batisseur === max) return "batisseur";
  if (f.connecteur === max) return "connecteur";
  return "createur";
}

function phaseIcon(phase: QuizPhase): string {
  switch (phase) {
    case "profile": return "🧠";
    case "situation": return "📋";
    case "education": return "🛠️";
    case "rhetorical": return "👁️";
    case "orientation": return "🧭";
    default: return "";
  }
}

function phaseLabel(phase: QuizPhase): string {
  switch (phase) {
    case "profile": return "Ton profil";
    case "situation": return "Ta situation";
    case "education": return "Tes compétences";
    case "rhetorical": return "Ta vision";
    case "orientation": return "Ton chemin";
    default: return "";
  }
}

// ──────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────

export default function LeadQuiz() {
  const { slug } = useParams<{ slug: string }>();
  const slugLower = useMemo(() => (slug ?? "").toLowerCase().trim(), [slug]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["public-quiz", slugLower],
    queryFn: () => resolveQuiz(slugLower),
    enabled: !!slugLower,
    retry: 0,
    staleTime: 5 * 60 * 1000,
  });

  const [state, dispatch] = useReducer(reducer, initialState);
  const didPingView = useRef(false);
  const pendingProgress = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ping view (non bloquant)
  useEffect(() => {
    if (!slugLower || didPingView.current || !data) return;
    didPingView.current = true;
    pingView(slugLower);
  }, [slugLower, data]);

  // Restaure submission_id si présent
  useEffect(() => {
    if (!slugLower) return;
    const stored = loadStoredSubmission(slugLower);
    if (stored && !state.submissionId) {
      dispatch({ type: "SET_SUBMISSION_ID", id: stored });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugLower]);

  // Debounce progress sync
  const syncProgress = useCallback(
    (submissionId: string, answers: AnswersMap, lastQuestionReached?: string) => {
      if (pendingProgress.current) clearTimeout(pendingProgress.current);
      pendingProgress.current = setTimeout(() => {
        submitQuizProgress({ submission_id: submissionId, answers, last_question_reached: lastQuestionReached }).catch(() => {
          // silencieux
        });
      }, 400);
    },
    [],
  );

  // ──────────────────────────────────────────────────────────────────────
  // Dérivés (config)
  // ──────────────────────────────────────────────────────────────────────

  const config: QuizConfig | null = data?.config ?? null;
  const owner: QuizOwner | null = data?.owner ?? null;

  const profileQs = config?.questions.profile ?? [];
  const situationAll = config?.questions.situation ?? [];
  const educationQs = config?.questions.education ?? [];
  const rhetoricalQs = config?.questions.rhetorical ?? [];
  const orientationQ = config?.orientation_question;
  const profilesMap = config?.profiles;

  const activeSituationQs = useMemo(
    () => getActiveSituationQuestions(situationAll, state.answers),
    [situationAll, state.answers],
  );

  const totalSteps = profileQs.length + activeSituationQs.length + educationQs.length + rhetoricalQs.length + 1;

  const currentStepIndex = (() => {
    if (state.phase === "profile") return state.currentQ;
    if (state.phase === "situation") return profileQs.length + state.currentQ;
    if (state.phase === "education") return profileQs.length + activeSituationQs.length + state.currentQ;
    if (state.phase === "rhetorical")
      return profileQs.length + activeSituationQs.length + educationQs.length + state.currentQ;
    if (state.phase === "orientation")
      return profileQs.length + activeSituationQs.length + educationQs.length + rhetoricalQs.length;
    return 0;
  })();

  const currentQuestion: QuizQuestion | null = (() => {
    if (state.phase === "profile") return profileQs[state.currentQ] ?? null;
    if (state.phase === "situation") return activeSituationQs[state.currentQ] ?? null;
    if (state.phase === "education") return educationQs[state.currentQ] ?? null;
    if (state.phase === "rhetorical") return rhetoricalQs[state.currentQ] ?? null;
    if (state.phase === "orientation") return orientationQ ?? null;
    return null;
  })();

  // ──────────────────────────────────────────────────────────────────────
  // Actions
  // ──────────────────────────────────────────────────────────────────────

  const goLandingToForm = () => dispatch({ type: "SET_PHASE", phase: "form" });

  const handleFormSubmit = async () => {
    const errors: State["formErrors"] = {};
    const fn = state.firstName.trim();
    const ln = state.lastName.trim();
    const em = state.email.trim();
    if (fn.length < 2) errors.firstName = "Prénom trop court";
    if (ln.length < 2) errors.lastName = "Nom trop court";
    const ec = validateEmail(em);
    if (!ec.valid) errors.email = ec.error ?? "Email invalide";
    if (Object.keys(errors).length > 0) {
      dispatch({ type: "SET_FORM_ERRORS", errors });
      return;
    }
    dispatch({ type: "SET_SUBMITTING_FORM", value: true });
    try {
      const { submission_id } = await submitEmailCapture({
        slug: slugLower,
        first_name: fn,
        last_name: ln,
        email: em,
        referrer: document.referrer || null,
      });
      dispatch({ type: "SET_SUBMISSION_ID", id: submission_id });
      storeSubmission(slugLower, submission_id);
      dispatch({ type: "SET_PHASE", phase: "intro" });
    } catch (e: any) {
      dispatch({
        type: "SET_FORM_ERRORS",
        errors: { email: "Un problème est survenu. Réessaye dans un instant." },
      });
    } finally {
      dispatch({ type: "SET_SUBMITTING_FORM", value: false });
    }
  };

  const startQuiz = () => {
    dispatch({ type: "SET_PHASE", phase: "profile" });
    dispatch({ type: "SET_CURRENT_Q", q: 0 });
  };

  const advanceQuestion = useCallback(() => {
    dispatch({ type: "CLEAR_SELECTION" });
    if (state.phase === "profile") {
      if (state.currentQ < profileQs.length - 1) {
        dispatch({ type: "SET_CURRENT_Q", q: state.currentQ + 1 });
      } else {
        dispatch({ type: "SET_PHASE", phase: "situation" });
        dispatch({ type: "SET_CURRENT_Q", q: 0 });
      }
    } else if (state.phase === "situation") {
      const active = getActiveSituationQuestions(situationAll, state.answers);
      const currentSQ = active[state.currentQ];
      const gIdx = situationAll.indexOf(currentSQ);
      let nextQ: QuizQuestion | null = null;
      for (let i = gIdx + 1; i < situationAll.length; i++) {
        const c = situationAll[i];
        if (!c.showIf) {
          nextQ = c;
          break;
        }
        const p = state.answers[c.showIf.questionId];
        if (p && p.value === c.showIf.value) {
          nextQ = c;
          break;
        }
      }
      if (nextQ) {
        const nA = getActiveSituationQuestions(situationAll, state.answers);
        dispatch({ type: "SET_CURRENT_Q", q: Math.max(0, nA.indexOf(nextQ)) });
      } else {
        dispatch({ type: "SET_PHASE", phase: "education" });
        dispatch({ type: "SET_CURRENT_Q", q: 0 });
      }
    } else if (state.phase === "education") {
      if (state.currentQ < educationQs.length - 1) {
        dispatch({ type: "SET_CURRENT_Q", q: state.currentQ + 1 });
      } else {
        dispatch({ type: "SET_PHASE", phase: "rhetorical" });
        dispatch({ type: "SET_CURRENT_Q", q: 0 });
      }
    } else if (state.phase === "rhetorical") {
      if (state.currentQ < rhetoricalQs.length - 1) {
        dispatch({ type: "SET_CURRENT_Q", q: state.currentQ + 1 });
      } else {
        dispatch({ type: "SET_PHASE", phase: "orientation" });
      }
    }
  }, [state.phase, state.currentQ, state.answers, profileQs.length, situationAll, educationQs.length, rhetoricalQs.length]);

  const handleAnswer = (question: QuizQuestion, option: QuizOption) => {
    dispatch({ type: "SELECT_OPTION", question, option });
    if (question.insight) {
      setTimeout(() => dispatch({ type: "SHOW_INSIGHT" }), 350);
    } else {
      setTimeout(() => advanceQuestion(), 600);
    }
  };

  // Sync progress when an answer is locked in
  useEffect(() => {
    if (state.submissionId && Object.keys(state.answers).length > 0 && !state.resultProfile) {
      const lastQ = Object.keys(state.answers)[Object.keys(state.answers).length - 1];
      syncProgress(state.submissionId, state.answers, lastQ);
    }
  }, [state.answers, state.submissionId, state.resultProfile, syncProgress]);

  const handleOrientation = async (option: QuizOption) => {
    if (!orientationQ || !option.value) return;
    const orientationValue = option.value as ProfileKey;
    const profile = calculateResult(state.scores, orientationValue);
    dispatch({ type: "SET_ORIENTATION", value: orientationValue, profile });
    dispatch({
      type: "SELECT_OPTION",
      question: orientationQ,
      option,
    });

    // Fire-and-forget : enregistre le quiz complet
    if (state.submissionId) {
      submitQuizCompleted({
        submission_id: state.submissionId,
        profile,
        scores: state.scores,
        orientation_choice: orientationValue,
        answers: { ...state.answers, [orientationQ.id]: { text: option.text, value: option.value } },
      }).catch(() => void 0);
    }

    setTimeout(() => {
      dispatch({ type: "SET_PHASE", phase: "calculating" });
      setTimeout(() => {
        dispatch({ type: "SET_PHASE", phase: "result" });
      }, 3500);
    }, 600);
  };

  const goBack = () => {
    dispatch({ type: "CLEAR_SELECTION" });
    if (state.phase === "profile" && state.currentQ > 0) {
      dispatch({ type: "SET_CURRENT_Q", q: state.currentQ - 1 });
    } else if (state.phase === "situation") {
      if (state.currentQ > 0) dispatch({ type: "SET_CURRENT_Q", q: state.currentQ - 1 });
      else {
        dispatch({ type: "SET_PHASE", phase: "profile" });
        dispatch({ type: "SET_CURRENT_Q", q: profileQs.length - 1 });
      }
    } else if (state.phase === "education") {
      if (state.currentQ > 0) dispatch({ type: "SET_CURRENT_Q", q: state.currentQ - 1 });
      else {
        dispatch({ type: "SET_PHASE", phase: "situation" });
        dispatch({ type: "SET_CURRENT_Q", q: Math.max(0, activeSituationQs.length - 1) });
      }
    } else if (state.phase === "rhetorical") {
      if (state.currentQ > 0) dispatch({ type: "SET_CURRENT_Q", q: state.currentQ - 1 });
      else {
        dispatch({ type: "SET_PHASE", phase: "education" });
        dispatch({ type: "SET_CURRENT_Q", q: educationQs.length - 1 });
      }
    } else if (state.phase === "orientation") {
      dispatch({ type: "SET_PHASE", phase: "rhetorical" });
      dispatch({ type: "SET_CURRENT_Q", q: rhetoricalQs.length - 1 });
    }
  };

  const canGoBack =
    (state.phase === "profile" && state.currentQ > 0) ||
    state.phase === "situation" ||
    state.phase === "education" ||
    state.phase === "rhetorical" ||
    state.phase === "orientation";

  // Phone
  const emailCheck = validateEmail(state.email);
  const canSubmitForm =
    state.firstName.trim().length >= 2 &&
    state.lastName.trim().length >= 2 &&
    emailCheck.valid;

  const phoneCheck = state.phone.trim() ? validatePhone(state.phone) : { valid: false, error: null };
  const canSubmitPhone = phoneCheck.valid;

  const handlePhoneSubmit = async () => {
    if (!state.submissionId) {
      dispatch({ type: "SET_FORM_ERRORS", errors: { phone: "Session expirée. Rafraîchis la page." } });
      return;
    }
    const pCheck = validatePhone(state.phone);
    if (!pCheck.valid) {
      dispatch({ type: "SET_FORM_ERRORS", errors: { phone: pCheck.error ?? "Numéro invalide" } });
      return;
    }
    dispatch({ type: "SET_SUBMITTING_PHONE", value: true });
    try {
      await submitPhoneCapture({ submission_id: state.submissionId, phone: state.phone.trim() });
      dispatch({ type: "MARK_PHONE_CAPTURED" });
      dispatch({ type: "SET_FORM_ERRORS", errors: {} });
      dispatch({ type: "SET_PHASE", phase: "conference" });
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      // Tentative de récupération auto : si la submission est introuvable
      // (cache LocalStorage périmé), on recrée une submission et on réessaye.
      if (msg.includes("submission_not_found")) {
        try {
          const { submission_id } = await submitEmailCapture({
            slug: slugLower,
            first_name: state.firstName,
            last_name: state.lastName,
            email: state.email,
            referrer: document.referrer || null,
          });
          dispatch({ type: "SET_SUBMISSION_ID", id: submission_id });
          storeSubmission(slugLower, submission_id);
          await submitPhoneCapture({ submission_id, phone: state.phone.trim() });
          dispatch({ type: "MARK_PHONE_CAPTURED" });
          dispatch({ type: "SET_FORM_ERRORS", errors: {} });
          dispatch({ type: "SET_PHASE", phase: "conference" });
        } catch (e2: any) {
          console.error("[quiz] phone submit recovery failed", e2);
          dispatch({ type: "SET_FORM_ERRORS", errors: { phone: "Un problème est survenu, réessaye dans un instant." } });
        }
      } else {
        console.error("[quiz] phone submit failed", e);
        const friendly = msg.includes("invalid_phone")
          ? "Numéro invalide, vérifie le format."
          : "Un problème est survenu, réessaye dans un instant.";
        dispatch({ type: "SET_FORM_ERRORS", errors: { phone: friendly } });
      }
    } finally {
      dispatch({ type: "SET_SUBMITTING_PHONE", value: false });
    }
  };

  const handleWhatsAppClick = () => {
    if (!state.submissionId) return;
    submitWhatsAppClicked(state.submissionId);
    clearStoredSubmission(slugLower);
  };

  // ──────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────

  if (isLoading || !data) {
    if (error) {
      return (
        <QuizFrame>
          <QuizErrorScreen
            title="Lien invalide ou désactivé"
            message="Le lien que tu as utilisé ne pointe vers aucun parcours actif. Vérifie qu'il n'y a pas de faute de frappe ou contacte la personne qui te l'a partagé."
          />
        </QuizFrame>
      );
    }
    return (
      <QuizFrame>
        <QuizLoadingScreen />
      </QuizFrame>
    );
  }

  if (!config || !owner || !profilesMap || !orientationQ) {
    return (
      <QuizFrame>
        <QuizErrorScreen
          title="Oups, problème de chargement"
          message="Une erreur est survenue lors du chargement du quiz. Réessaye dans quelques instants."
        />
      </QuizFrame>
    );
  }

  // Landing
  if (state.phase === "landing") {
    return (
      <QuizFrame>
        <LandingPhase
          landing={config.landing}
          onStart={goLandingToForm}
          ownerDisplayName={owner.display_name}
          ownerDisplayRole={owner.display_role}
        />
      </QuizFrame>
    );
  }

  // Form
  if (state.phase === "form") {
    return (
      <QuizFrame>
        <FormPhase
          intro={config.intro}
          firstName={state.firstName}
          lastName={state.lastName}
          email={state.email}
          errors={state.formErrors}
          submitting={state.submittingForm}
          canSubmit={canSubmitForm}
          onChangeFirstName={(v) => dispatch({ type: "SET_FORM_FIELD", field: "firstName", value: v })}
          onChangeLastName={(v) => dispatch({ type: "SET_FORM_FIELD", field: "lastName", value: v })}
          onChangeEmail={(v) => dispatch({ type: "SET_FORM_FIELD", field: "email", value: v })}
          onSubmit={handleFormSubmit}
        />
      </QuizFrame>
    );
  }

  // Intro
  if (state.phase === "intro") {
    return (
      <QuizFrame>
        <IntroQuizPhase intro={config.intro} firstName={state.firstName} onStart={startQuiz} />
      </QuizFrame>
    );
  }

  // Calculating
  if (state.phase === "calculating") {
    return (
      <QuizFrame>
        <CalculatingPhase />
      </QuizFrame>
    );
  }

  // Result
  if (state.phase === "result" && state.resultProfile) {
    const prof = profilesMap[state.resultProfile];
    return (
      <QuizFrame glowColor={`${prof.color}15`}>
        <ResultPhase
          profile={prof}
          firstName={state.firstName}
          email={state.email}
          onContinue={() => dispatch({ type: "SET_PHASE", phase: "phone" })}
        />
      </QuizFrame>
    );
  }

  // Phone capture
  if (state.phase === "phone") {
    return (
      <QuizFrame>
        <PhonePhase
          firstName={state.firstName}
          conference={config.conference}
          phone={state.phone}
          error={state.formErrors.phone}
          submitting={state.submittingPhone}
          canSubmit={canSubmitPhone}
          onChange={(v) => dispatch({ type: "SET_FORM_FIELD", field: "phone", value: v })}
          onSubmit={handlePhoneSubmit}
        />
      </QuizFrame>
    );
  }

  // Conference
  if (state.phase === "conference") {
    return (
      <QuizFrame>
        <ConferencePhase
          firstName={state.firstName}
          conference={config.conference}
          owner={owner}
          whatsappMessage={config.whatsapp_message}
          onWhatsAppClick={handleWhatsAppClick}
        />
      </QuizFrame>
    );
  }

  // Orientation
  if (state.phase === "orientation") {
    return (
      <QuizFrame>
        <div>
          <QuizProgressBar current={currentStepIndex} total={totalSteps} phaseLabel={phaseLabel(state.phase)} />
          <QuestionPhase
            question={orientationQ}
            phaseIcon={phaseIcon(state.phase)}
            selectedOptionText={state.selectedOption}
            showInsight={false}
            onSelect={handleOrientation}
            onContinue={advanceQuestion}
            onBack={goBack}
            canGoBack={canGoBack}
          />
        </div>
      </QuizFrame>
    );
  }

  // Quiz questions standard
  if (currentQuestion) {
    return (
      <QuizFrame>
        <div>
          <QuizProgressBar current={currentStepIndex} total={totalSteps} phaseLabel={phaseLabel(state.phase)} />
          <QuestionPhase
            question={currentQuestion}
            phaseIcon={phaseIcon(state.phase)}
            selectedOptionText={state.selectedOption}
            showInsight={state.showInsight}
            onSelect={(opt) => handleAnswer(currentQuestion, opt)}
            onContinue={advanceQuestion}
            onBack={goBack}
            canGoBack={canGoBack}
          />
        </div>
      </QuizFrame>
    );
  }

  return (
    <QuizFrame>
      <QuizLoadingScreen />
    </QuizFrame>
  );
}
