// Composants visuels du quiz lead magnet public.
// Identité visuelle dark + or (#0A0E17 / #D4A017 / #F0C850).

import { ReactNode } from "react";
import type { QuizConfig, QuizOption, QuizOwner, QuizProfile, QuizQuestion } from "./types";

// ──────────────────────────────────────────────────────────────────────
// Frame commun : fond noir + glow
// ──────────────────────────────────────────────────────────────────────

export function QuizFrame({
  children,
  glowColor,
  narrow = false,
}: {
  children: ReactNode;
  glowColor?: string;
  narrow?: boolean;
}) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0A0E17] text-white" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-200px] h-[600px] w-[600px] -translate-x-1/2 rounded-full"
        style={{
          background: glowColor
            ? `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`
            : "radial-gradient(circle, rgba(212,160,23,0.08) 0%, transparent 70%)",
        }}
      />
      <div className={`relative z-10 mx-auto w-full ${narrow ? "max-w-[440px]" : "max-w-[480px]"} px-5`}>
        {children}
      </div>
      <style>{`
        @keyframes alb-quiz-fade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes alb-quiz-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.1); } }
        .alb-quiz-fade { animation: alb-quiz-fade 0.4s ease-out both; }
        .alb-quiz-pulse { animation: alb-quiz-pulse 1.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// ProgressBar
// ──────────────────────────────────────────────────────────────────────

export function QuizProgressBar({ current, total, phaseLabel }: { current: number; total: number; phaseLabel: string }) {
  const pct = Math.max(0, Math.min(100, Math.round((current / total) * 100)));
  return (
    <div className="border-b border-[rgba(212,160,23,0.15)] bg-[rgba(15,20,30,0.95)] px-6 py-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-[2px] text-white/50">{phaseLabel}</span>
        <span className="text-[13px] font-bold text-[#D4A017]">{pct}%</span>
      </div>
      <div className="h-[5px] overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%`, background: "linear-gradient(90deg, #D4A017, #F0C850)" }}
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
      className="mb-4 inline-flex items-center gap-1.5 bg-transparent text-[13px] text-white/40 transition-colors hover:text-white/70"
    >
      ← Retour
    </button>
  );
}

// ──────────────────────────────────────────────────────────────────────
// CTA principal — bouton or
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
      className="w-full rounded-xl px-8 py-4 text-[16px] font-bold tracking-wide text-[#0A0E17] transition-all hover:scale-[1.03] disabled:scale-100 disabled:opacity-40"
      style={{ background: "linear-gradient(135deg, #D4A017, #F0C850)", fontFamily: "'DM Sans', sans-serif" }}
    >
      {children}
    </button>
  );
}

// ──────────────────────────────────────────────────────────────────────
// InsightBubble
// ──────────────────────────────────────────────────────────────────────

export function InsightBubble({ text }: { text: string }) {
  return (
    <div className="my-4 rounded-xl border border-[rgba(212,160,23,0.2)] border-l-[3px] border-l-[#D4A017] bg-[rgba(212,160,23,0.08)] px-5 py-3.5">
      <div className="mb-1 text-[10px] font-bold uppercase tracking-[2px] text-[#D4A017]">💡 Le savais-tu ?</div>
      <div className="text-[13.5px] leading-relaxed text-white/80">{text}</div>
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
    <div className="pb-16 pt-16 text-center">
      <span className="mb-6 inline-block rounded-full border border-[rgba(212,160,23,0.3)] bg-[rgba(212,160,23,0.1)] px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[1.5px] text-[#D4A017]">
        {landing.badge}
      </span>
      <h1
        className="mb-4 text-[32px] font-extrabold leading-tight"
        style={{
          fontFamily: "'Outfit', sans-serif",
          background: "linear-gradient(135deg, #FFFFFF 0%, #D4A017 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        {landing.title}
      </h1>
      <p className="mb-8 text-[16px] leading-relaxed text-white/60">
        {landing.description_prefix}
        <span className="font-bold text-[#D4A017]">{landing.description_highlight}</span>
      </p>
      <div className="mb-9 space-y-3.5 text-left">
        {landing.bullets.map((item, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-[rgba(212,160,23,0.2)] bg-[rgba(212,160,23,0.12)]">
              <span className="text-[14px] text-[#D4A017]">✓</span>
            </div>
            <span className="text-[14.5px] text-white/75">{item}</span>
          </div>
        ))}
      </div>
      <QuizCTAButton onClick={onStart}>{landing.cta}</QuizCTAButton>
      <div className="mt-5 flex flex-wrap justify-center gap-5 text-[12px] text-white/35">
        {landing.trust_items.map((item, i) => (
          <span key={i}>{item}</span>
        ))}
      </div>

      <div className="mt-10 rounded-xl border border-white/5 bg-white/[0.02] px-5 py-4">
        <div className="mb-1.5 text-[11px] uppercase tracking-[1.5px] text-white/35">Partagé par</div>
        <div className="flex items-center justify-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full font-extrabold text-[#0A0E17]"
            style={{
              background: "linear-gradient(135deg, #D4A017, #8B6914)",
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            {ownerDisplayName.charAt(0).toUpperCase()}
          </div>
          <div className="text-left">
            <div className="text-[14px] font-bold text-white">{ownerDisplayName}</div>
            <div className="text-[11px] text-white/40">{ownerDisplayRole}</div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-white/5 bg-white/[0.02] px-5 py-4">
        <div className="mb-1.5 text-[11px] uppercase tracking-[1.5px] text-white/35">{landing.powered_by_label}</div>
        <div className="text-[20px] font-extrabold text-[#D4A017]" style={{ fontFamily: "'Outfit', sans-serif" }}>
          {landing.powered_by_brand}
        </div>
        <div className="mt-1 text-[11px] leading-relaxed text-white/40">{landing.powered_by_description}</div>
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
    <div className="alb-quiz-fade py-10">
      <div className="mb-9 text-center">
        <div className="mb-3 text-[48px]">﷽</div>
        <h2 className="mb-2 text-[24px] font-extrabold" style={{ fontFamily: "'Outfit', sans-serif" }}>
          {intro.form_title}
        </h2>
        <p className="text-[14.5px] leading-relaxed text-white/55">{intro.form_description}</p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit && !submitting) onSubmit();
        }}
        className="space-y-5"
      >
        <QuizInputField
          label="👤 Ton prénom"
          placeholder="Ex : Youssef"
          value={firstName}
          onChange={onChangeFirstName}
          error={errors.firstName}
          autoComplete="given-name"
        />
        <QuizInputField
          label="👤 Ton nom"
          placeholder="Ex : Kaddour"
          value={lastName}
          onChange={onChangeLastName}
          error={errors.lastName}
          autoComplete="family-name"
        />
        <QuizInputField
          label="✉️ Ton adresse email"
          placeholder="Ex : youssef@email.com"
          value={email}
          onChange={onChangeEmail}
          error={errors.email}
          type="email"
          autoComplete="email"
        />
        <div className="pt-2">
          <QuizCTAButton type="submit" disabled={!canSubmit || submitting}>
            {submitting ? "Un instant…" : intro.form_cta}
          </QuizCTAButton>
        </div>
      </form>
      <p className="mt-4 text-center text-[11.5px] text-white/30">{intro.form_privacy}</p>
    </div>
  );
}

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
    <div>
      <label className="mb-2 block text-[13px] font-semibold text-white/60">{label}</label>
      <input
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-[10px] border bg-white/5 px-4 py-3.5 text-[15px] text-white outline-none transition-colors placeholder:text-white/30 focus:border-[rgba(212,160,23,0.5)]"
        style={{
          borderColor: error ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.1)",
          fontFamily: "'DM Sans', sans-serif",
        }}
      />
      {error && <div className="mt-1.5 text-[12px] text-red-400">⚠️ {error}</div>}
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
    <div className="alb-quiz-fade py-12 text-center">
      <div className="mb-5 text-[56px]">🎮</div>
      <h2 className="mb-3 text-[26px] font-extrabold" style={{ fontFamily: "'Outfit', sans-serif" }}>
        {intro.ready_title}
        {firstName ? ` ${firstName}` : ""} ?
      </h2>
      <p className="mb-2 text-[15px] leading-relaxed text-white/60">{intro.description_line1}</p>
      <p className="mb-4 text-[13.5px] italic leading-relaxed text-[rgba(212,160,23,0.7)]">{intro.description_line2}</p>
      <div className="my-7 space-y-4 text-left">
        {intro.steps.map((step, i) => (
          <div key={i} className="flex items-start gap-3.5 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3.5">
            <span className="text-[24px]">{step.icon}</span>
            <div>
              <div className="mb-0.5 text-[14px] font-bold text-[#D4A017]">{step.title}</div>
              <div className="text-[13px] text-white/50">{step.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <p className="mb-7 text-[13.5px] text-white/45">{intro.footer}</p>
      <QuizCTAButton onClick={onStart}>{intro.cta}</QuizCTAButton>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// QUESTION CARD (profile / situation / education / rhetorical / orientation)
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
    <div className="alb-quiz-fade px-0 py-6">
      <QuizBackButton onClick={onBack} show={canGoBack} />
      <div className="mb-2 text-center">
        <span className="text-[36px]">{phaseIcon}</span>
      </div>
      <h2 className="mb-2 text-center text-[19px] font-extrabold leading-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
        {question.question}
      </h2>
      {question.subtitle ? (
        <p className="mb-6 text-center text-[13px] text-white/40">{question.subtitle}</p>
      ) : (
        <div className="mb-6" />
      )}
      <div className="space-y-2.5">
        {question.options.map((opt, i) => {
          const isSel = selectedOptionText === opt.text;
          return (
            <button
              key={i}
              type="button"
              onClick={() => {
                if (!selectedOptionText || !question.insight) onSelect(opt);
              }}
              disabled={!!selectedOptionText && !isSel}
              className="w-full rounded-2xl border p-4 text-left transition-all hover:border-[rgba(212,160,23,0.3)] disabled:pointer-events-none"
              style={{
                borderColor: isSel ? "rgba(212,160,23,0.5)" : "rgba(255,255,255,0.06)",
                background: isSel ? "rgba(212,160,23,0.08)" : "rgba(255,255,255,0.03)",
                opacity: selectedOptionText && !isSel ? 0.4 : 1,
              }}
            >
              <div className="flex items-center gap-3.5">
                {opt.icon && <span className="flex-shrink-0 text-[26px]">{opt.icon}</span>}
                <span
                  className="text-[14.5px] font-semibold"
                  style={{ color: isSel ? "#D4A017" : "rgba(255,255,255,0.8)" }}
                >
                  {opt.text}
                </span>
              </div>
              {opt.detail && <div className="mt-1.5 pl-[42px] text-[12.5px] leading-relaxed text-white/40">{opt.detail}</div>}
            </button>
          );
        })}
      </div>
      {showInsight && question.insight && (
        <div className="alb-quiz-fade">
          <InsightBubble text={question.insight} />
          <div className="mt-2">
            <QuizCTAButton onClick={onContinue}>Continuer →</QuizCTAButton>
          </div>
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
    "Analyse de tes réponses...",
    "Identification de ton business idéal...",
    "Préparation de ton résultat...",
  ];
  return (
    <div className="py-20 text-center">
      <div className="alb-quiz-pulse mb-6 text-[64px]">🤲</div>
      <h2 className="mb-4 text-[24px] font-extrabold" style={{ fontFamily: "'Outfit', sans-serif" }}>
        Analyse en cours...
      </h2>
      <p className="mb-10 text-[14px] text-white/50">On identifie le business en ligne qui te correspond, bi idniLlah</p>
      {steps.map((text, i) => (
        <div
          key={i}
          className="mb-3.5 flex items-center justify-center gap-3 opacity-0"
          style={{ animation: `alb-quiz-fade 0.5s ${i * 0.8}s forwards` }}
        >
          <span className="text-[#D4A017]">✓</span>
          <span className="text-[14px] text-white/60">{text}</span>
        </div>
      ))}
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
    <div className="alb-quiz-fade py-6">
      <div className="mb-8 text-center">
        <div className="mb-4 text-[11px] uppercase tracking-[2px] text-white/40">
          {firstName ? `${firstName}, ` : ""}le business qui te correspond c'est...
        </div>
        <div
          className="mx-auto mb-5 flex h-[90px] w-[90px] items-center justify-center rounded-full text-[42px]"
          style={{
            background: profile.gradient,
            boxShadow: `0 0 40px ${profile.color}30`,
          }}
        >
          {profile.emoji}
        </div>
        <h1
          className="mb-1.5 text-[34px] font-black leading-tight"
          style={{ color: profile.color, fontFamily: "'Outfit', sans-serif" }}
        >
          {profile.title}
        </h1>
        <p className="text-[16px] font-medium text-white/70">{profile.subtitle}</p>
      </div>
      <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <p className="text-[14.5px] leading-relaxed text-white/70">{profile.description}</p>
      </div>
      <div className="mb-4 rounded-2xl border border-[rgba(212,160,23,0.2)] bg-[rgba(212,160,23,0.06)] p-5 text-center">
        <p className="mb-4 text-[14px] leading-relaxed text-white/55">
          Tu veux savoir{" "}
          <span className="font-bold text-[#D4A017]">concrètement comment développer ce business</span> et quelles
          compétences acquérir en premier ?
        </p>
        <QuizCTAButton onClick={onContinue}>Oui, je veux savoir comment faire →</QuizCTAButton>
      </div>
      {email && <p className="mb-3 text-center text-[12px] text-white/30">📩 Ton résultat a été envoyé à {email}</p>}
      <p className="text-center text-[12.5px] italic text-[rgba(212,160,23,0.5)]">
        Qu'Allah mette la barakah dans tes projets et te facilite le chemin vers un rizq halal et abondant 🤲
      </p>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// PHONE CAPTURE
// ──────────────────────────────────────────────────────────────────────

export function PhonePhase({
  firstName,
  conference,
  phone,
  error,
  submitting,
  onChange,
  onSubmit,
  canSubmit,
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
  return (
    <div className="alb-quiz-fade py-10">
      <div className="mb-7 text-center">
        <div className="mb-3 text-[48px]">📱</div>
        <h2 className="mb-2.5 text-[22px] font-extrabold" style={{ fontFamily: "'Outfit', sans-serif" }}>
          {conference.phone_title}
          {firstName ? `, ${firstName}` : ""}
        </h2>
        <p className="text-[14.5px] leading-relaxed text-white/55">
          {conference.phone_description_prefix}
          <span className="font-semibold text-[#D4A017]">{conference.phone_description_highlight}</span>.
        </p>
        <p className="mt-2 text-[13px] text-white/40">{conference.phone_reassurance}</p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit && !submitting) onSubmit();
        }}
      >
        <div className="mb-6">
          <label className="mb-2 block text-[13px] font-semibold text-white/60">📱 Ton numéro de téléphone</label>
          <input
            type="tel"
            autoComplete="tel"
            placeholder="Ex : +33 6 12 34 56 78"
            value={phone}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-[10px] border bg-white/5 px-4 py-3.5 text-[15px] text-white outline-none transition-colors placeholder:text-white/30 focus:border-[rgba(212,160,23,0.5)]"
            style={{
              borderColor: error ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.1)",
              fontFamily: "'DM Sans', sans-serif",
            }}
          />
          {error && <div className="mt-1.5 text-[12px] text-red-400">⚠️ {error}</div>}
        </div>
        <QuizCTAButton type="submit" disabled={!canSubmit || submitting}>
          {submitting ? "Un instant…" : conference.phone_cta}
        </QuizCTAButton>
      </form>
      <p className="mt-4 text-center text-[11.5px] text-white/30">{conference.phone_privacy}</p>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// CONFERENCE (page finale + CTA WhatsApp)
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
    <div className="alb-quiz-fade py-8">
      <div className="mb-7 text-center">
        <div className="mb-5 inline-block rounded-full border border-[rgba(212,160,23,0.3)] bg-[rgba(212,160,23,0.1)] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[1.5px] text-[#D4A017]">
          {conference.conference_badge}
        </div>
        <h2 className="mb-3 text-[24px] font-extrabold leading-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
          {firstName ? `${firstName}, ` : ""}
          {conference.conference_title_part1}
          <br />
          <span className="text-[#D4A017]">{conference.conference_title_part2}</span>
        </h2>
        <p className="text-[14.5px] leading-relaxed text-white/60">{conference.conference_intro}</p>
      </div>

      <div className="mb-5 rounded-2xl border border-[rgba(212,160,23,0.2)] bg-[rgba(212,160,23,0.04)] p-5">
        <div className="mb-3 text-[11px] font-bold uppercase tracking-[2px] text-[#D4A017]">
          {conference.conference_card_badge}
        </div>
        <h3
          className="mb-4 text-[19px] font-extrabold leading-snug text-white"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          {conference.conference_card_title}
        </h3>
        <div className="space-y-2.5">
          {conference.conference_bullets.map((item, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className="flex-shrink-0 text-[16px]">{item.icon}</span>
              <span className="text-[13.5px] text-white/70">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-center">
        <div className="mb-1 text-[13px] text-white/50">{conference.eligibility_title}</div>
        <div className="space-y-1 text-[14px] leading-relaxed text-white/80">
          {conference.eligibility_bullets.map((b, i) => (
            <div key={i}>✅ {b}</div>
          ))}
        </div>
      </div>

      {/* WhatsApp card */}
      <div className="mb-5 rounded-2xl border border-[rgba(212,160,23,0.2)] bg-[rgba(212,160,23,0.04)] p-5 text-center">
        <div className="mb-4 text-[14px] leading-relaxed text-white/55">{whatsappIntro}</div>
        <div
          className="mx-auto mb-3 flex h-[56px] w-[56px] items-center justify-center rounded-full text-[24px] font-extrabold text-[#0A0E17]"
          style={{ background: "linear-gradient(135deg, #D4A017, #8B6914)", fontFamily: "'Outfit', sans-serif" }}
        >
          {owner.display_name.charAt(0).toUpperCase()}
        </div>
        <div className="text-[16px] font-bold text-white">{owner.display_name}</div>
        <div className="mb-5 text-[12px] text-white/40">{owner.display_role}</div>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onWhatsAppClick}
          className="flex w-full items-center justify-center gap-2.5 rounded-xl px-6 py-4 text-[16px] font-bold text-white transition-transform hover:scale-[1.03]"
          style={{ background: "#25D366", boxShadow: "0 4px 20px rgba(37,211,102,0.3)" }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white" aria-hidden>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Écrire à {owner.display_name} sur WhatsApp
        </a>
        <div className="mt-4 rounded-xl border border-white/5 bg-white/[0.04] p-4 text-left">
          <div className="mb-1.5 text-[12px] text-white/40">{conference.whatsapp_message_preview_label}</div>
          <div className="text-[12.5px] italic leading-relaxed text-white/55">"{whatsappMessage}"</div>
        </div>
      </div>

      <p className="mb-5 text-center text-[11.5px] text-white/30">{conference.footer_tags}</p>
      <p className="text-center text-[13px] italic text-[rgba(212,160,23,0.5)]">{conference.footer_dua}</p>

      <div className="mt-8 rounded-xl border border-white/5 bg-white/[0.02] px-5 py-4 text-center">
        <div className="text-[20px] font-extrabold text-[#D4A017]" style={{ fontFamily: "'Outfit', sans-serif" }}>
          AL BARAKA
        </div>
        <div className="mt-1 text-[11px] leading-relaxed text-white/40">
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
    <div className="py-24 text-center">
      <div className="mb-4 text-[56px]">🔒</div>
      <h1 className="mb-3 text-[24px] font-extrabold" style={{ fontFamily: "'Outfit', sans-serif" }}>
        {title}
      </h1>
      <p className="text-[14.5px] leading-relaxed text-white/60">{message}</p>
      <div className="mt-10 rounded-xl border border-white/5 bg-white/[0.02] px-5 py-4 text-center">
        <div className="text-[20px] font-extrabold text-[#D4A017]" style={{ fontFamily: "'Outfit', sans-serif" }}>
          AL BARAKA
        </div>
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
      <div className="alb-quiz-pulse mb-4 text-[48px]">🤲</div>
      <p className="text-[14px] text-white/50">Chargement…</p>
    </div>
  );
}
