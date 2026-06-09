import { type ReactNode, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";

export function Card({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl p-6" style={{ background: "#101010", border: "1px solid #262420" }}>{children}</div>;
}
export function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="text-[11px] uppercase tracking-[0.16em] text-[#C9A84C]">{children}</div>;
}
export function HStep({ children }: { children: ReactNode }) {
  return <h1 className="mt-1 font-serif text-[27px] font-semibold leading-tight text-white">{children}</h1>;
}
export function Lead({ children }: { children: ReactNode }) {
  return <p className="mt-1 mb-4 max-w-[70ch] text-[15px] leading-[1.55] text-white/55">{children}</p>;
}
export function Peda({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return <div className="my-4 rounded-[8px] py-3 pl-4 pr-3 text-[14px] leading-[1.55] text-[#e7d295]" style={{ borderLeft: "2px solid #C9A84C", background: "linear-gradient(90deg,rgba(201,168,76,.07),transparent)", ...style }}>{children}</div>;
}
export function FL({ children }: { children: ReactNode }) {
  return <label className="mt-3.5 mb-1.5 block text-[12.5px] tracking-[0.3px] text-white/45">{children}</label>;
}

const inputStyle: React.CSSProperties = { background: "#161513", border: "1px solid #262420", color: "#f4f1e8" };
export function TInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={"w-full rounded-[9px] px-3 py-2.5 text-[14.5px] outline-none focus:border-[#C9A84C] " + (props.className || "")} style={{ ...inputStyle, ...(props.style || {}) }} />;
}
export function TArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={"w-full resize-y rounded-[9px] px-3 py-2.5 text-[14.5px] leading-[1.5] outline-none focus:border-[#C9A84C] " + (props.className || "")} style={{ minHeight: 84, ...inputStyle, ...(props.style || {}) }} />;
}

export function NavBtns({ onBack, onNext, nextLabel, nextDisabled }: { onBack: () => void; onNext?: () => void; nextLabel?: string; nextDisabled?: boolean }) {
  return (
    <div className="mt-5 flex items-center justify-between">
      <button type="button" onClick={onBack} className="rounded-full px-4 py-2 text-[13px] font-medium" style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.4)", color: "#C9A84C" }}>← Retour</button>
      {onNext && (
        <button type="button" onClick={onNext} disabled={nextDisabled} className="rounded-full px-5 py-2.5 text-[13px] font-semibold text-[#080808] transition-all disabled:cursor-not-allowed disabled:opacity-40" style={{ background: "#C9A84C" }}>{nextLabel || "Continuer →"}</button>
      )}
    </div>
  );
}
