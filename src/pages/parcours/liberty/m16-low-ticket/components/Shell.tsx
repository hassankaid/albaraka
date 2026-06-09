import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { STEPS_META, stepIndex, VERSION, type M16State, type M16Step } from "../lib/types";
import { stepUnlocked, hasUpstream } from "../lib/validations";

interface ShellProps {
  children: ReactNode;
  state: M16State;
  onRestart?: () => void;
  onExitDemo?: () => void;
  onGoToStep: (s: M16Step) => void;
}

export function Shell({ children, state, onRestart, onExitDemo, onGoToStep }: ShellProps) {
  const highIdx = stepIndex(state.highest);

  return (
    <div className="-mx-6 -my-6 min-h-[calc(100vh-4rem)] w-[calc(100%+3rem)] text-[#f4f1e8]"
      style={{ background: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(201,168,76,0.06), transparent 60%), #080808" }}>
      <div className="mx-auto w-full max-w-[980px] px-4 py-8 md:py-10">
        <Link to="/parcours/liberty" className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-white/40 transition-colors hover:text-[#C9A84C]">
          <ArrowLeft className="h-3.5 w-3.5" /> Retour au parcours LIBERTY
        </Link>

        <header className="flex items-center justify-between gap-4 border-b pb-4" style={{ borderColor: "#262420" }}>
          <div className="flex items-baseline gap-3">
            <span className="font-serif text-[28px] font-bold tracking-[0.5px] text-[#C9A84C]">M16</span>
            <span className="text-[12px] uppercase tracking-[0.14em] text-white/40">Low-Ticket</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border px-2 py-0.5 text-[11px] text-white/40" style={{ borderColor: "#262420" }}>{VERSION}</span>
            {onRestart && (
              <button type="button" onClick={onRestart} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium" style={{ background: "rgba(201,168,76,0.06)", border: "0.5px solid rgba(201,168,76,0.4)", color: "#C9A84C" }}>
                <RotateCcw className="h-3 w-3" /> Recommencer
              </button>
            )}
          </div>
        </header>

        {/* Bannières */}
        {state.demoMode ? (
          <div className="mt-4 rounded-xl px-4 py-2.5 text-[12.5px] leading-[1.5]" style={{ background: "rgba(255,180,80,0.1)", border: "0.5px solid rgba(255,180,80,0.4)", color: "#FFB450" }}>
            Mode démo — « {state.demoLabel} ». Rien n'est sauvegardé ni propagé.{onExitDemo && <> <button type="button" onClick={onExitDemo} className="font-semibold underline">Quitter la démo</button></>}
          </div>
        ) : !hasUpstream(state) ? (
          <div className="mt-4 rounded-xl px-4 py-2.5 text-[12.5px] leading-[1.5]" style={{ background: "rgba(201,168,76,0.07)", border: "0.5px solid rgba(201,168,76,0.3)", color: "#e7d295" }}>
            Contexte amont non détecté : tu peux quand même avancer, les champs intelligents se remplaceront par des espaces à personnaliser.
          </div>
        ) : null}

        {/* Stepper */}
        <div className="my-5 flex flex-wrap gap-1.5">
          {STEPS_META.map((m) => {
            const idx = stepIndex(m.id);
            const unlocked = stepUnlocked(m.id, state);
            const active = m.id === state.current;
            const done = !active && (idx < highIdx || unlocked);
            return (
              <button key={m.id} type="button" title={m.full} disabled={!unlocked && !active}
                onClick={() => onGoToStep(m.id)}
                className="rounded-full px-2.5 py-1.5 text-[11.5px] font-medium transition-all disabled:cursor-not-allowed"
                style={{
                  background: active ? "#C9A84C" : "#101010",
                  color: active ? "#080808" : done ? "#e7d295" : !unlocked ? "rgba(255,255,255,0.25)" : "#9a9488",
                  border: "1px solid " + (active ? "#C9A84C" : done ? "#3a3528" : "#262420"),
                  opacity: !unlocked && !active ? 0.4 : 1,
                }}>
                {m.short}
              </button>
            );
          })}
        </div>

        {children}

        <p className="mt-4 text-center text-[10px] uppercase tracking-[0.16em] text-white/25">AL BARAKA · Liberty · Module 16</p>
      </div>
    </div>
  );
}
