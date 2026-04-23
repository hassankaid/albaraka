// Composants visuels du quiz lead magnet public.
// Identité visuelle alignée avec la plateforme Al Baraka :
//   - Fonts : Cormorant Garamond (display) + Inter (body)
//   - Palette : zinc-950 / gold-400 (#D4AF37) / cream
// Le composant est autonome (ne dépend ni du theme ni du layout global).

import { ReactNode } from "react";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import type { QuizConfig, QuizOption, QuizOwner, QuizProfile, QuizQuestion } from "./types";

// ──────────────────────────────────────────────────────────────────────
// Frame commun : fond noir + ornementations or
// ──────────────────────────────────────────────────────────────────────

export function QuizFrame({
  children,
  glowColor,
}: {
  children: ReactNode;
  glowColor?: string;
}) {
  // Layout : min-h-screen + flex column + my-auto sur l'enfant.
  // Résultat : si le contenu tient dans la hauteur, il est centré verticalement.
  //            S'il dépasse, il flow naturellement sans couper le haut.
  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-[#0a0906] text-[#f4ecd8] font-sans antialiased">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-280px] h-[680px] w-[680px] -translate-x-1/2 rounded-full blur-3xl"
        style={{
          background: glowColor
            ? `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`
            : "radial-gradient(circle, rgba(212,175,55,0.10) 0%, transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[-320px] left-1/2 h-[540px] w-[540px] -translate-x-1/2 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(212,175,55,0.04) 0%, transparent 70%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
      {/* my-auto centre verticalement si le contenu tient, collapse si trop grand */}
      <div className="relative z-10 mx-auto my-auto w-full max-w-[460px] px-5 py-10">
        {children}
      </div>
      <style>{`
        @keyframes alb-q-fade { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes alb-q-pulse { 0%,100% { transform: scale(1); opacity: 0.9; } 50% { transform: scale(1.08); opacity: 1; } }
        @keyframes alb-q-shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        .alb-q-fade { animation: alb-q-fade 0.5s cubic-bezier(.4,0,.2,1) both; }
        .alb-q-pulse { animation: alb-q-pulse 2s ease-in-out infinite; }
        .alb-q-shimmer { background-size: 200% auto; animation: alb-q-shimmer 3s linear infinite; }

        /* react-phone-number-input — un SEUL champ unifié, pas de bordures internes */
        .alb-phone .PhoneInput {
          display: flex;
          align-items: stretch;
          width: 100%;
          height: 52px;
          border: 1px solid rgba(212,175,55,0.25);
          border-radius: 0.75rem;
          background: rgba(20,15,8,0.5);
          transition: border-color 0.2s, background 0.2s;
          overflow: hidden;
        }
        .alb-phone .PhoneInput:focus-within {
          border-color: rgba(212,175,55,0.6);
          background: rgba(20,15,8,0.7);
        }
        .alb-phone.has-error .PhoneInput { border-color: rgba(239,68,68,0.55); }
        .alb-phone .PhoneInputCountry {
          position: relative;
          display: flex;
          align-items: center;
          padding: 0 0.85rem 0 0.9rem;
          border-right: 1px solid rgba(212,175,55,0.15);
          background: transparent;
        }
        .alb-phone .PhoneInputCountryIcon {
          width: 24px; height: 18px;
          box-shadow: none !important;
          background: transparent !important;
          border-radius: 2px;
          overflow: hidden;
        }
        .alb-phone .PhoneInputCountryIcon img,
        .alb-phone .PhoneInputCountryIcon svg { width: 100%; height: 100%; object-fit: cover; }
        .alb-phone .PhoneInputCountryIcon--border { box-shadow: 0 0 0 1px rgba(212,175,55,0.2) !important; }
        .alb-phone .PhoneInputCountrySelectArrow {
          color: rgba(244,236,216,0.5);
          margin-left: 0.55rem;
          width: 0.45rem; height: 0.45rem;
          border-style: solid;
          border-color: currentColor;
          border-width: 0 1.5px 1.5px 0;
          transform: rotate(45deg);
        }
        .alb-phone .PhoneInputCountrySelect {
          position: absolute; inset: 0; opacity: 0; cursor: pointer;
          color: #f4ecd8; /* couleur de la police dans la popup */
        }
        .alb-phone .PhoneInputCountrySelect option { background: #1a1510; color: #f4ecd8; }
        .alb-phone .PhoneInputInput {
          flex: 1;
          width: 100%;
          height: 100%;
          padding: 0 1rem;
          border: none;
          background: transparent;
          color: #f4ecd8;
          font-size: 15px;
          outline: none;
        }
        .alb-phone .PhoneInputInput::placeholder { color: rgba(244,236,216,0.3); }
      `}</style>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// SVG Flags — rendu universel (pas d'emojis) pour la question pays
// ──────────────────────────────────────────────────────────────────────

function FlagSVG({ value, title }: { value?: string; title?: string }) {
  const size = { width: 22, height: 16 };
  if (value === "france") {
    return (
      <svg viewBox="0 0 3 2" {...size} aria-label={title ?? "France"} className="rounded-[2px] ring-1 ring-black/30">
        <rect width="1" height="2" x="0" fill="#002654" />
        <rect width="1" height="2" x="1" fill="#FFFFFF" />
        <rect width="1" height="2" x="2" fill="#ED2939" />
      </svg>
    );
  }
  if (value === "belgique") {
    return (
      <svg viewBox="0 0 3 2" {...size} aria-label={title ?? "Belgique"} className="rounded-[2px] ring-1 ring-black/30">
        <rect width="1" height="2" x="0" fill="#000000" />
        <rect width="1" height="2" x="1" fill="#FDDA24" />
        <rect width="1" height="2" x="2" fill="#EF3340" />
      </svg>
    );
  }
  if (value === "suisse") {
    return (
      <svg viewBox="0 0 32 32" {...size} aria-label={title ?? "Suisse"} className="rounded-[2px] ring-1 ring-black/30">
        <rect width="32" height="32" fill="#D52B1E" />
        <rect x="13" y="6" width="6" height="20" fill="#FFFFFF" />
        <rect x="6" y="13" width="20" height="6" fill="#FFFFFF" />
      </svg>
    );
  }
  // Globe for "autre"
  return (
    <svg viewBox="0 0 24 24" {...size} aria-label={title ?? "Autre pays"} className="text-[#f4ecd8]/70">
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <ellipse cx="12" cy="12" rx="4" ry="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 12h20" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

// Map des valeurs pays → flag SVG (utilisé par QuestionPhase quand l'option a un value dans cette liste)
const FLAG_VALUES = new Set(["france", "belgique", "suisse", "autre"]);

// ──────────────────────────────────────────────────────────────────────
// ProgressBar
// ──────────────────────────────────────────────────────────────────────

export function QuizProgressBar({ current, total, phaseLabel }: { current: number; total: number; phaseLabel: string }) {
  const pct = Math.max(0, Math.min(100, Math.round((current / total) * 100)));
  return (
    <div className="mb-6 rounded-xl border border-gold-400/15 bg-black/30 px-5 py-3 backdrop-blur-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10.5px] font-medium uppercase tracking-[2.5px] text-[#f4ecd8]/40">{phaseLabel}</span>
        <span className="text-xs font-bold text-gold-400">{pct}%</span>
      </div>
      <div className="h-[4px] overflow-hidden rounded-full bg-[#f4ecd8]/8">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, #D4AF37 0%, #F5D77A 50%, #D4AF37 100%)",
            backgroundSize: "200% auto",
          }}
        />
      </div>
    </div>
  );
}

export function QuizBackButton({ onClick, show }: { onClick: () => void; show: boolean }) {
  if (!show) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-5 inline-flex items-center gap-1.5 bg-transparent text-[13px] text-[#f4ecd8]/40 transition-colors hover:text-gold-400"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m15 18-6-6 6-6" /></svg>
      Retour
    </button>
  );
}

// ──────────────────────────────────────────────────────────────────────
// CTA
// ──────────────────────────────────────────────────────────────────────

export function QuizCTAButton({
  children,
  onClick,
  disabled = false,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="group relative w-full overflow-hidden rounded-xl px-8 py-4 text-[15px] font-semibold tracking-wide text-[#0a0906] shadow-[0_8px_30px_-10px_rgba(212,175,55,0.5)] transition-all hover:shadow-[0_12px_40px_-10px_rgba(212,175,55,0.65)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:shadow-[0_8px_30px_-10px_rgba(212,175,55,0.5)]"
      style={{ background: "linear-gradient(135deg, #F5D77A 0%, #D4AF37 50%, #A68B3E 100%)" }}
    >
      <span className="relative z-10">{children}</span>
      <span
        aria-hidden
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full"
      />
    </button>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Ornement "filigrane"
// ──────────────────────────────────────────────────────────────────────

function Ornament() {
  return (
    <div className="mx-auto my-6 flex items-center justify-center gap-2" aria-hidden>
      <span className="h-px w-10 bg-gradient-to-r from-transparent to-gold-400/40" />
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 1 L9.5 6.5 L15 8 L9.5 9.5 L8 15 L6.5 9.5 L1 8 L6.5 6.5 Z" fill="#D4AF37" opacity="0.7" />
      </svg>
      <span className="h-px w-10 bg-gradient-to-l from-transparent to-gold-400/40" />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// InsightBubble
// ──────────────────────────────────────────────────────────────────────

export function InsightBubble({ text }: { text: string }) {
  return (
    <div className="my-5 rounded-2xl border border-gold-400/25 border-l-[3px] border-l-gold-400 bg-gradient-to-br from-gold-400/10 to-gold-400/5 px-5 py-4 backdrop-blur-sm">
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[2px] text-gold-400">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M9 18h6" /><path d="M10 22h4" /><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
        </svg>
        Le savais-tu ?
      </div>
      <div className="text-[13.5px] leading-relaxed text-[#f4ecd8]/85">{text}</div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Input partagé
// ──────────────────────────────────────────────────────────────────────

function QuizInputField({
  label,
  placeholder,
  value,
  onChange,
  error,
  type = "text",
  autoComplete,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-[12.5px] font-medium uppercase tracking-wider text-[#f4ecd8]/60">{label}</label>
      <input
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full rounded-xl border bg-black/40 px-4 text-[15px] text-[#f4ecd8] outline-none transition-all placeholder:text-[#f4ecd8]/30 focus:border-gold-400/60 focus:bg-black/50"
        style={{
          borderColor: error ? "rgba(239,68,68,0.5)" : "rgba(212,175,55,0.25)",
        }}
      />
      {error && (
        <div className="flex items-start gap-1.5 text-[12px] text-red-400">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0" aria-hidden>
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// LANDING
// ──────────────────────────────────────────────────────────────────────

export function LandingPhase({
  landing,
  onStart,
  ownerDisplayName,
  ownerDisplayRole,
}: {
  landing: QuizConfig["landing"];
  onStart: () => void;
  ownerDisplayName: string;
  ownerDisplayRole: string;
}) {
  return (
    <div className="alb-q-fade text-center">
      <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold-400/25 bg-gold-400/5 px-4 py-1.5 text-[11px] font-medium uppercase tracking-[1.5px] text-gold-400">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold-400/40" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gold-400" />
        </span>
        {landing.badge}
      </div>

      <h1 className="font-heading text-[40px] font-semibold leading-[1.1] tracking-tight text-[#f4ecd8] sm:text-[44px]">
        {landing.title}
      </h1>

      <Ornament />

      <p className="mx-auto mb-8 max-w-[400px] text-[15px] leading-relaxed text-[#f4ecd8]/70">
        {landing.description_prefix}
        <span className="font-semibold text-gold-400">{landing.description_highlight}</span>
      </p>

      <div className="mx-auto mb-9 max-w-[400px] space-y-3 text-left">
        {landing.bullets.map((item, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gold-400/30 bg-gold-400/10">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <span className="text-[14px] leading-relaxed text-[#f4ecd8]/85">{item}</span>
          </div>
        ))}
      </div>

      <QuizCTAButton onClick={onStart}>{landing.cta}</QuizCTAButton>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11.5px] text-[#f4ecd8]/40">
        {landing.trust_items.map((item, i) => (
          <span key={i}>{item}</span>
        ))}
      </div>

      {/* Carte apporteur */}
      <div className="mt-10 rounded-2xl border border-gold-400/15 bg-black/30 px-5 py-4 backdrop-blur-sm">
        <div className="mb-2 text-[10px] font-medium uppercase tracking-[1.8px] text-[#f4ecd8]/40">Partagé par</div>
        <div className="flex items-center justify-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-full font-heading text-xl font-bold text-[#0a0906]"
            style={{ background: "linear-gradient(135deg, #F5D77A, #A68B3E)" }}
          >
            {ownerDisplayName.charAt(0).toUpperCase()}
          </div>
          <div className="text-left">
            <div className="text-[14px] font-medium text-[#f4ecd8]">{ownerDisplayName}</div>
            <div className="text-[11px] text-[#f4ecd8]/50">{ownerDisplayRole}</div>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-gold-400/15 bg-black/20 px-5 py-4">
        <div className="text-[9.5px] font-medium uppercase tracking-[1.8px] text-[#f4ecd8]/35">{landing.powered_by_label}</div>
        <div className="mt-1 font-heading text-[22px] font-semibold text-gold-400">{landing.powered_by_brand}</div>
        <div className="mt-1 text-[11px] leading-relaxed text-[#f4ecd8]/40">{landing.powered_by_description}</div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// FORM (prénom + nom + email)
// ──────────────────────────────────────────────────────────────────────

export function FormPhase({
  intro,
  firstName,
  lastName,
  email,
  errors,
  submitting,
  onChangeFirstName,
  onChangeLastName,
  onChangeEmail,
  onSubmit,
  canSubmit,
}: {
  intro: QuizConfig["intro"];
  firstName: string;
  lastName: string;
  email: string;
  errors: Partial<Record<"firstName" | "lastName" | "email", string>>;
  submitting: boolean;
  onChangeFirstName: (v: string) => void;
  onChangeLastName: (v: string) => void;
  onChangeEmail: (v: string) => void;
  onSubmit: () => void;
  canSubmit: boolean;
}) {
  return (
    <div className="alb-q-fade">
      <div className="mb-8 text-center">
        <div className="mb-3 font-heading text-[42px] leading-none text-gold-400">﷽</div>
        <h2 className="font-heading text-[28px] font-semibold text-[#f4ecd8]">{intro.form_title}</h2>
        <Ornament />
        <p className="text-[14px] leading-relaxed text-[#f4ecd8]/65">{intro.form_description}</p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit && !submitting) onSubmit();
        }}
        className="space-y-4"
      >
        <QuizInputField
          label="Prénom"
          placeholder="Ex : Youssef"
          value={firstName}
          onChange={onChangeFirstName}
          error={errors.firstName}
          autoComplete="given-name"
        />
        <QuizInputField
          label="Nom"
          placeholder="Ex : Kaddour"
          value={lastName}
          onChange={onChangeLastName}
          error={errors.lastName}
          autoComplete="family-name"
        />
        <QuizInputField
          label="Adresse email"
          placeholder="youssef@email.com"
          value={email}
          onChange={onChangeEmail}
          error={errors.email}
          type="email"
          autoComplete="email"
        />
        <div className="pt-3">
          <QuizCTAButton type="submit" disabled={!canSubmit || submitting}>
            {submitting ? "Un instant…" : intro.form_cta}
          </QuizCTAButton>
        </div>
      </form>
      <p className="mt-4 text-center text-[11px] text-[#f4ecd8]/35">{intro.form_privacy}</p>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// INTRO QUIZ
// ──────────────────────────────────────────────────────────────────────

export function IntroQuizPhase({
  intro,
  firstName,
  onStart,
}: {
  intro: QuizConfig["intro"];
  firstName: string;
  onStart: () => void;
}) {
  return (
    <div className="alb-q-fade text-center">
      <div className="mb-5 text-[52px]">🎮</div>
      <h2 className="font-heading text-[30px] font-semibold text-[#f4ecd8]">
        {intro.ready_title}
        {firstName ? ` ${firstName}` : ""} ?
      </h2>
      <Ornament />
      <p className="mb-3 text-[14px] leading-relaxed text-[#f4ecd8]/70">{intro.description_line1}</p>
      <p className="mb-6 text-[13px] italic leading-relaxed text-gold-400/80">{intro.description_line2}</p>
      <div className="my-7 space-y-3 text-left">
        {intro.steps.map((step, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl border border-gold-400/15 bg-black/30 px-4 py-3 backdrop-blur-sm transition-colors hover:border-gold-400/30"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gold-400/25 bg-gold-400/5 text-lg">
              {step.icon}
            </div>
            <div className="flex-1 text-left">
              <div className="text-[13px] font-semibold text-gold-400">{step.title}</div>
              <div className="text-[12px] text-[#f4ecd8]/55">{step.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <p className="mb-6 text-[12.5px] text-[#f4ecd8]/50">{intro.footer}</p>
      <QuizCTAButton onClick={onStart}>{intro.cta}</QuizCTAButton>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// QUESTION CARD
// ──────────────────────────────────────────────────────────────────────

export function QuestionPhase({
  question,
  phaseIcon,
  selectedOptionText,
  showInsight,
  onSelect,
  onContinue,
  onBack,
  canGoBack,
}: {
  question: QuizQuestion;
  phaseIcon: string;
  selectedOptionText: string | null;
  showInsight: boolean;
  onSelect: (opt: QuizOption) => void;
  onContinue: () => void;
  onBack: () => void;
  canGoBack: boolean;
}) {
  return (
    <div className="alb-q-fade">
      <QuizBackButton onClick={onBack} show={canGoBack} />
      {phaseIcon && (
        <div className="mb-3 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-gold-400/25 bg-black/40 text-xl">
            {phaseIcon}
          </span>
        </div>
      )}
      <h2 className="mb-2 text-center font-heading text-[22px] font-semibold leading-snug text-[#f4ecd8]">
        {question.question}
      </h2>
      {question.subtitle ? (
        <p className="mb-6 text-center text-[13px] italic text-[#f4ecd8]/50">{question.subtitle}</p>
      ) : (
        <div className="mb-6" />
      )}
      <div className="space-y-2.5">
        {question.options.map((opt, i) => {
          const isSel = selectedOptionText === opt.text;
          const isCountry = !!opt.value && FLAG_VALUES.has(opt.value);
          return (
            <button
              key={i}
              type="button"
              onClick={() => {
                if (!selectedOptionText || !question.insight) onSelect(opt);
              }}
              disabled={!!selectedOptionText && !isSel}
              className={`group w-full rounded-2xl border px-4 py-3.5 text-left transition-all ${
                isSel
                  ? "border-gold-400/60 bg-gold-400/10 shadow-[0_0_20px_-5px_rgba(212,175,55,0.4)]"
                  : "border-gold-400/15 bg-black/25 hover:border-gold-400/35 hover:bg-black/40"
              } ${selectedOptionText && !isSel ? "opacity-40" : ""}`}
            >
              <div className="flex items-center gap-3">
                {isCountry ? (
                  <span className="flex h-[22px] w-[26px] shrink-0 items-center justify-center">
                    <FlagSVG value={opt.value} title={opt.text} />
                  </span>
                ) : opt.icon ? (
                  <span className="shrink-0 text-[22px] leading-none">{opt.icon}</span>
                ) : null}
                <span className={`flex-1 text-[14px] font-medium leading-snug ${isSel ? "text-gold-400" : "text-[#f4ecd8]/85"}`}>
                  {opt.text}
                </span>
                {isSel && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              {opt.detail && (
                <div className="mt-1.5 pl-[34px] text-[12px] leading-relaxed text-[#f4ecd8]/50">{opt.detail}</div>
              )}
            </button>
          );
        })}
      </div>
      {showInsight && question.insight && (
        <div className="alb-q-fade">
          <InsightBubble text={question.insight} />
          <QuizCTAButton onClick={onContinue}>Continuer</QuizCTAButton>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// CALCULATING
// ──────────────────────────────────────────────────────────────────────

export function CalculatingPhase() {
  const steps = [
    "Analyse de tes réponses…",
    "Identification de ton business idéal…",
    "Préparation de ton résultat…",
  ];
  return (
    <div className="alb-q-fade py-8 text-center">
      <div className="alb-q-pulse mb-6 text-[56px]">🤲</div>
      <h2 className="font-heading text-[26px] font-semibold text-[#f4ecd8]">Analyse en cours…</h2>
      <Ornament />
      <p className="mb-10 text-[13.5px] italic text-[#f4ecd8]/60">On identifie le business en ligne qui te correspond, bi idniLlah</p>
      <div className="mx-auto max-w-[320px] space-y-4">
        {steps.map((text, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl border border-gold-400/15 bg-black/30 px-4 py-3 opacity-0"
            style={{ animation: `alb-q-fade 0.5s ${i * 0.8}s forwards` }}
          >
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold-400/15">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <span className="text-[13px] text-[#f4ecd8]/75">{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// RESULT
// ──────────────────────────────────────────────────────────────────────

export function ResultPhase({
  profile,
  firstName,
  email,
  onContinue,
}: {
  profile: QuizProfile;
  firstName: string;
  email: string;
  onContinue: () => void;
}) {
  return (
    <div className="alb-q-fade">
      <div className="mb-8 text-center">
        <div className="mb-4 text-[10.5px] font-semibold uppercase tracking-[2.5px] text-[#f4ecd8]/40">
          {firstName ? `${firstName}, ` : ""}le business qui te correspond…
        </div>
        <div
          className="mx-auto mb-5 flex h-[96px] w-[96px] items-center justify-center rounded-full text-[44px]"
          style={{
            background: profile.gradient,
            boxShadow: `0 0 60px -10px ${profile.color}60`,
          }}
        >
          {profile.emoji}
        </div>
        <h1
          className="font-heading text-[40px] font-semibold leading-none tracking-tight"
          style={{ color: profile.color }}
        >
          {profile.title}
        </h1>
        <Ornament />
        <p className="text-[15px] font-medium text-[#f4ecd8]/80">{profile.subtitle}</p>
      </div>
      <div className="mb-6 rounded-2xl border border-gold-400/15 bg-black/30 p-5 backdrop-blur-sm">
        <p className="text-[14px] leading-relaxed text-[#f4ecd8]/85">{profile.description}</p>
      </div>
      <div className="mb-5 rounded-2xl border border-gold-400/30 bg-gradient-to-br from-gold-400/10 to-gold-400/5 p-5 text-center">
        <p className="mb-4 text-[13.5px] leading-relaxed text-[#f4ecd8]/75">
          Tu veux savoir <span className="font-semibold text-gold-400">concrètement comment développer ce business</span> et quelles compétences acquérir en premier ?
        </p>
        <QuizCTAButton onClick={onContinue}>Oui, je veux savoir comment faire</QuizCTAButton>
      </div>
      {email && (
        <p className="mb-3 text-center text-[11.5px] text-[#f4ecd8]/40">
          📩 Ton résultat a été envoyé à {email}
        </p>
      )}
      <p className="text-center text-[12px] italic leading-relaxed text-gold-400/60">
        Qu'Allah mette la barakah dans tes projets et te facilite le chemin vers un rizq halal et abondant 🤲
      </p>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// PHONE CAPTURE (PhoneInput avec drapeaux SVG et masque)
// ──────────────────────────────────────────────────────────────────────

export function PhonePhase({
  firstName,
  conference,
  phone,
  error,
  submitting,
  onChange,
  onSubmit,
}: {
  firstName: string;
  conference: QuizConfig["conference"];
  phone: string;
  error?: string;
  submitting: boolean;
  onChange: (v: string) => void;
  onSubmit: () => void;
  canSubmit: boolean;
}) {
  const isValid = phone && isValidPhoneNumber(phone);
  return (
    <div className="alb-q-fade">
      <div className="mb-8 text-center">
        <div className="mb-3 text-[48px]">📱</div>
        <h2 className="font-heading text-[26px] font-semibold text-[#f4ecd8]">
          {conference.phone_title}
          {firstName ? `, ${firstName}` : ""}
        </h2>
        <Ornament />
        <p className="text-[14px] leading-relaxed text-[#f4ecd8]/70">
          {conference.phone_description_prefix}
          <span className="font-semibold text-gold-400">{conference.phone_description_highlight}</span>.
        </p>
        <p className="mt-2 text-[12.5px] italic text-[#f4ecd8]/45">{conference.phone_reassurance}</p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (isValid && !submitting) onSubmit();
        }}
      >
        <div className="mb-5 space-y-2">
          <label className="block text-[12.5px] font-medium uppercase tracking-wider text-[#f4ecd8]/60">
            Ton numéro de téléphone
          </label>
          <div className={`alb-phone ${error ? "has-error" : ""}`}>
            <PhoneInput
              international
              defaultCountry="FR"
              value={phone}
              onChange={(v) => onChange(v ?? "")}
              placeholder="6 12 34 56 78"
              disabled={submitting}
            />
          </div>
          {error && (
            <div className="flex items-start gap-1.5 text-[12px] text-red-400">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0" aria-hidden>
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}
          {!error && phone && isValid && (
            <div className="flex items-center gap-1.5 text-[12px] text-emerald-400">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Numéro valide
            </div>
          )}
        </div>
        <QuizCTAButton type="submit" disabled={!isValid || submitting}>
          {submitting ? "Un instant…" : conference.phone_cta}
        </QuizCTAButton>
      </form>
      <p className="mt-4 text-center text-[11px] text-[#f4ecd8]/35">{conference.phone_privacy}</p>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// CONFERENCE
// ──────────────────────────────────────────────────────────────────────

export function ConferencePhase({
  firstName,
  conference,
  owner,
  whatsappMessage,
  onWhatsAppClick,
}: {
  firstName: string;
  conference: QuizConfig["conference"];
  owner: QuizOwner;
  whatsappMessage: string;
  onWhatsAppClick: () => void;
}) {
  const whatsappUrl = `https://wa.me/${owner.whatsapp_phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(whatsappMessage)}`;
  const whatsappIntro = conference.whatsapp_intro.replace("{name}", owner.display_name);

  return (
    <div className="alb-q-fade">
      <div className="mb-7 text-center">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-gold-400/25 bg-gold-400/5 px-4 py-1.5 text-[10.5px] font-semibold uppercase tracking-[1.8px] text-gold-400">
          {conference.conference_badge}
        </div>
        <h2 className="font-heading text-[26px] font-semibold leading-tight text-[#f4ecd8]">
          {firstName ? `${firstName}, ` : ""}
          {conference.conference_title_part1}
          <br />
          <span className="text-gold-400">{conference.conference_title_part2}</span>
        </h2>
        <Ornament />
        <p className="text-[14px] leading-relaxed text-[#f4ecd8]/70">{conference.conference_intro}</p>
      </div>

      <div className="mb-5 rounded-2xl border border-gold-400/25 bg-gradient-to-br from-gold-400/8 to-gold-400/3 p-5 backdrop-blur-sm">
        <div className="mb-3 text-[10.5px] font-semibold uppercase tracking-[1.8px] text-gold-400">{conference.conference_card_badge}</div>
        <h3 className="mb-4 font-heading text-[20px] font-semibold leading-snug text-[#f4ecd8]">
          {conference.conference_card_title}
        </h3>
        <div className="space-y-2.5">
          {conference.conference_bullets.map((item, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className="shrink-0 text-[16px] leading-none mt-0.5">{item.icon}</span>
              <span className="text-[13px] leading-relaxed text-[#f4ecd8]/80">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-gold-400/15 bg-black/30 p-4 text-center">
        <div className="mb-2 text-[12px] text-[#f4ecd8]/55">{conference.eligibility_title}</div>
        <div className="space-y-1 text-[13.5px] leading-relaxed text-[#f4ecd8]/85">
          {conference.eligibility_bullets.map((b, i) => (
            <div key={i} className="flex items-start gap-1.5 justify-start text-left">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="mt-1 shrink-0" aria-hidden>
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>{b}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-5 rounded-2xl border border-gold-400/25 bg-gradient-to-br from-gold-400/10 to-gold-400/3 p-5 text-center">
        <div className="mb-4 text-[13.5px] leading-relaxed text-[#f4ecd8]/75">{whatsappIntro}</div>
        <div
          className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full font-heading text-2xl font-bold text-[#0a0906]"
          style={{ background: "linear-gradient(135deg, #F5D77A, #A68B3E)" }}
        >
          {owner.display_name.charAt(0).toUpperCase()}
        </div>
        <div className="text-[15px] font-semibold text-[#f4ecd8]">{owner.display_name}</div>
        <div className="mb-5 text-[11.5px] text-[#f4ecd8]/45">{owner.display_role}</div>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onWhatsAppClick}
          className="group relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-xl px-6 py-4 text-[15px] font-semibold text-white shadow-[0_8px_30px_-8px_rgba(37,211,102,0.55)] transition-all hover:scale-[1.02] hover:shadow-[0_12px_40px_-8px_rgba(37,211,102,0.7)]"
          style={{ background: "linear-gradient(135deg, #25D366 0%, #1ea952 100%)" }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="white" aria-hidden className="shrink-0">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Écrire à {owner.display_name} sur WhatsApp
        </a>
        <div className="mt-4 rounded-xl border border-gold-400/10 bg-black/40 p-3 text-left">
          <div className="mb-1.5 text-[11px] text-[#f4ecd8]/45">{conference.whatsapp_message_preview_label}</div>
          <div className="text-[12px] italic leading-relaxed text-[#f4ecd8]/65">« {whatsappMessage} »</div>
        </div>
      </div>

      <p className="mb-4 text-center text-[11px] text-[#f4ecd8]/35">{conference.footer_tags}</p>
      <p className="text-center text-[12px] italic leading-relaxed text-gold-400/60">{conference.footer_dua}</p>

      <div className="mt-8 rounded-2xl border border-gold-400/15 bg-black/20 px-5 py-4 text-center">
        <div className="font-heading text-[22px] font-semibold text-gold-400">AL BARAKA</div>
        <div className="mt-1 text-[11px] leading-relaxed text-[#f4ecd8]/40">
          L'écosystème n°1 qui aide la oummah à générer un revenu halal en ligne
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// ERROR / NOT FOUND
// ──────────────────────────────────────────────────────────────────────

export function QuizErrorScreen({ title, message }: { title: string; message: string }) {
  return (
    <div className="alb-q-fade py-12 text-center">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-gold-400/25 bg-black/40">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
      <h1 className="font-heading text-[26px] font-semibold text-[#f4ecd8]">{title}</h1>
      <Ornament />
      <p className="mx-auto max-w-[380px] text-[14px] leading-relaxed text-[#f4ecd8]/65">{message}</p>
      <div className="mt-10 rounded-2xl border border-gold-400/15 bg-black/20 px-5 py-4">
        <div className="font-heading text-[22px] font-semibold text-gold-400">AL BARAKA</div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// LOADING
// ──────────────────────────────────────────────────────────────────────

export function QuizLoadingScreen() {
  return (
    <div className="py-24 text-center">
      <div className="alb-q-pulse mx-auto mb-4 text-[44px]">🤲</div>
      <p className="text-[13px] italic text-[#f4ecd8]/50">Chargement…</p>
    </div>
  );
}
