/**
 * Mini-bibliothèque UI réutilisable pour le M1 NICHE.
 * Reprend les classes/styles Sidali (charte AL BARAKA noir + or) en composants React.
 */

import { type ReactNode, type TextareaHTMLAttributes, type InputHTMLAttributes, type ButtonHTMLAttributes, forwardRef } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── StepEyebrow / StepTitle / StepSub ──────────────────────────────────────
export function StepEyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#C9A84C]">
      {children}
    </span>
  );
}

export function StepTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-2 text-[22px] font-semibold leading-tight tracking-tight text-white">
      {children}
    </h2>
  );
}

export function StepSub({ children }: { children: ReactNode }) {
  return (
    <p className="mb-6 max-w-[580px] text-[13px] leading-[1.6] text-white/60">
      {children}
    </p>
  );
}

// ─── InputBlock + Label + Helper ────────────────────────────────────────────
export function InputBlock({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mb-5", className)}>{children}</div>;
}

export function InputLabel({ children }: { children: ReactNode }) {
  return (
    <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.1em] text-[#C9A84C]">
      {children}
    </label>
  );
}

export function InputHelper({ children, intent = "neutral" }: { children: ReactNode; intent?: "neutral" | "warning" }) {
  const color = intent === "warning" ? "text-amber-400/80" : "text-white/40";
  return <p className={cn("mt-1.5 text-[11px] leading-[1.55]", color)}>{children}</p>;
}

// ─── TextInput / TextArea ───────────────────────────────────────────────────
type InputProps = InputHTMLAttributes<HTMLInputElement>;
export const TextInput = forwardRef<HTMLInputElement, InputProps>(function TextInput(
  { className, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      type="text"
      {...rest}
      className={cn(
        "w-full rounded-[10px] px-3.5 py-3 text-sm text-white outline-none transition-all placeholder:text-white/30",
        className,
      )}
      style={{
        background: "#14130E",
        border: "1px solid rgba(201,168,76,0.18)",
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "#C9A84C";
        e.currentTarget.style.background = "#0F0E0A";
        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(201,168,76,0.08)";
        rest.onFocus?.(e);
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "rgba(201,168,76,0.18)";
        e.currentTarget.style.background = "#14130E";
        e.currentTarget.style.boxShadow = "none";
        rest.onBlur?.(e);
      }}
    />
  );
});

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { className, rows = 3, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      {...rest}
      className={cn(
        "w-full resize-y rounded-[10px] px-3.5 py-3 text-sm leading-[1.6] text-white outline-none transition-all placeholder:text-white/30",
        className,
      )}
      style={{
        background: "#14130E",
        border: "1px solid rgba(201,168,76,0.18)",
        minHeight: 80,
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "#C9A84C";
        e.currentTarget.style.background = "#0F0E0A";
        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(201,168,76,0.08)";
        rest.onFocus?.(e);
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "rgba(201,168,76,0.18)";
        e.currentTarget.style.background = "#14130E";
        e.currentTarget.style.boxShadow = "none";
        rest.onBlur?.(e);
      }}
    />
  );
});

// ─── Buttons ────────────────────────────────────────────────────────────────
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger" | "cta";
};

export function Btn({ variant = "primary", className, children, ...rest }: BtnProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-[13px] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40";
  let style: React.CSSProperties = {};
  if (variant === "primary") {
    style = {
      background: "linear-gradient(135deg, #C9A84C 0%, #E8C770 100%)",
      color: "#FFFFFF",
      textShadow: "0 1px 2px rgba(0,0,0,0.45)",
      boxShadow: "0 8px 24px rgba(201,168,76,0.4)",
    };
  } else if (variant === "ghost") {
    style = {
      background: "rgba(201,168,76,0.06)",
      color: "#C9A84C",
      border: "1px solid rgba(201,168,76,0.4)",
    };
  } else if (variant === "danger") {
    style = {
      background: "rgba(232,107,107,0.08)",
      color: "#E86B6B",
      border: "1px solid rgba(232,107,107,0.4)",
    };
  } else if (variant === "cta") {
    style = {
      background: "linear-gradient(135deg, #C9A84C 0%, #E8C770 100%)",
      color: "#FFFFFF",
      textShadow: "0 1px 2px rgba(0,0,0,0.45)",
      boxShadow: "0 12px 32px rgba(201,168,76,0.45)",
      padding: "16px 36px",
      fontSize: 15,
    };
  }
  return (
    <button {...rest} style={{ ...style, ...(rest.style ?? {}) }} className={cn(base, className)}>
      {children}
    </button>
  );
}

// ─── Card (cadre sombre +or) ────────────────────────────────────────────────
export function Card({ children, className, accent }: { children: ReactNode; className?: string; accent?: "gold" | "warning" }) {
  const borderColor =
    accent === "warning" ? "rgba(255,180,80,0.3)" : "rgba(201,168,76,0.18)";
  const bg = accent === "warning" ? "rgba(255,180,80,0.04)" : "#14130E";
  return (
    <div
      className={cn("rounded-xl p-4", className)}
      style={{ background: bg, border: `0.5px solid ${borderColor}` }}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  return (
    <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#C9A84C]">
      {children}
    </p>
  );
}

// ─── Option (checkbox card) ────────────────────────────────────────────────
interface OptionProps {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}

export function Option({ selected, onClick, children }: OptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-[10px] px-4 py-3.5 text-left text-sm text-white transition-all"
      style={{
        background: selected ? "#2A2310" : "#14130E",
        border: selected ? "1px solid #C9A84C" : "1px solid rgba(201,168,76,0.18)",
        boxShadow: selected ? "inset 0 0 0 1px #C9A84C" : "none",
        fontWeight: selected ? 600 : 400,
      }}
      onMouseEnter={(e) => {
        if (!selected) {
          e.currentTarget.style.background = "#1F1B0F";
          e.currentTarget.style.borderColor = "#C9A84C";
        }
      }}
      onMouseLeave={(e) => {
        if (!selected) {
          e.currentTarget.style.background = "#14130E";
          e.currentTarget.style.borderColor = "rgba(201,168,76,0.18)";
        }
      }}
    >
      <span
        className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] transition-all"
        style={{
          background: selected ? "#C9A84C" : "transparent",
          border: selected ? "1.5px solid #C9A84C" : "1.5px solid rgba(201,168,76,0.4)",
        }}
      >
        {selected && <Check className="h-3 w-3" strokeWidth={3} style={{ color: "#080808" }} />}
      </span>
      <span className="flex-1">{children}</span>
    </button>
  );
}

// ─── Loading screen ────────────────────────────────────────────────────────
export function LoadingScreen({ message, hint }: { message: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-[#C9A84C]" />
      <p className="text-[14px] font-medium text-white/80">{message}</p>
      {hint && <p className="text-[11px] text-white/40">{hint}</p>}
    </div>
  );
}

// ─── Actions row ────────────────────────────────────────────────────────────
export function Actions({ children, align = "between" }: { children: ReactNode; align?: "between" | "right" | "center" }) {
  const justify = align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-between";
  return (
    <div className={cn("mt-6 flex flex-wrap items-center gap-2.5", justify)}>{children}</div>
  );
}
