import { type ReactNode, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";

export function Card({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl p-6" style={{ background: "#111", border: "1px solid #2a2a2a" }}>{children}</div>;
}
export function StepH2({ marker, children }: { marker: string; children: ReactNode }) {
  return (
    <h2 className="mb-1.5 flex items-baseline gap-2 font-serif text-[27px] font-semibold leading-tight text-white">
      <span className="text-[#C9A84C]">{marker}</span>
      <span>{children}</span>
    </h2>
  );
}
export function Lead({ children }: { children: ReactNode }) {
  return <p className="mb-4 max-w-[70ch] text-[15px] leading-[1.55] text-white/55">{children}</p>;
}
export function Peda({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="my-4 rounded-[0_8px_8px_0] py-3 pl-4 pr-4 text-[14px] leading-[1.6]" style={{ borderLeft: "2px solid #C9A84C", background: "linear-gradient(90deg,rgba(201,168,76,.07),transparent)", color: "#e7d295" }}>
      {title && <h4 className="mb-1.5 font-semibold text-[#C9A84C]">{title}</h4>}
      <div className="text-white/70">{children}</div>
    </div>
  );
}
export function AlertSoft({ children, tone }: { children: ReactNode; tone?: "green" }) {
  return <div className="my-3 rounded-xl px-4 py-2.5 text-[12.5px] leading-[1.5]" style={{ background: tone === "green" ? "rgba(76,201,135,0.08)" : "rgba(201,168,76,0.06)", border: "0.5px solid " + (tone === "green" ? "#4cc987" : "rgba(201,168,76,0.3)"), color: tone === "green" ? "#b0e8c5" : "#e7d295" }}>{children}</div>;
}
export function FL({ children }: { children: ReactNode }) {
  return <label className="mt-3.5 mb-1.5 block text-[12.5px] text-white/45">{children}</label>;
}
export function Hint({ children }: { children: ReactNode }) { return <span className="text-white/35">{children}</span>; }

const inputStyle: React.CSSProperties = { background: "#0c0c0c", border: "1px solid #2a2a2a", color: "#f5f5f5" };
export function TInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={"w-full rounded-[9px] px-3 py-2.5 text-[14.5px] outline-none focus:border-[#C9A84C] " + (props.className || "")} style={{ ...inputStyle, ...(props.style || {}) }} />;
}
export function TArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={"w-full resize-y rounded-[9px] px-3 py-2.5 text-[14.5px] leading-[1.5] outline-none focus:border-[#C9A84C] " + (props.className || "")} style={{ minHeight: 84, ...inputStyle, ...(props.style || {}) }} />;
}

export function NavBar({ onBack, onNext, nextLabel, nextDisabled, hint }: { onBack?: () => void; onNext?: () => void; nextLabel?: string; nextDisabled?: boolean; hint?: string }) {
  return (
    <>
      <div className="mt-5 flex items-center justify-between">
        {onBack ? <button type="button" onClick={onBack} className="rounded-full px-4 py-2 text-[13px] font-medium" style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.4)", color: "#C9A84C" }}>← Retour</button> : <span />}
        {onNext && <button type="button" onClick={onNext} disabled={nextDisabled} className="rounded-full px-5 py-2.5 text-[13px] font-semibold text-[#080808] transition-all disabled:cursor-not-allowed disabled:opacity-40" style={{ background: "#C9A84C" }}>{nextLabel || "Continuer →"}</button>}
      </div>
      {onNext && hint && <div className="mt-2 text-[12px] text-white/50">Pour continuer, il te reste à : <b className="text-white/75">{hint}</b>.</div>}
    </>
  );
}
