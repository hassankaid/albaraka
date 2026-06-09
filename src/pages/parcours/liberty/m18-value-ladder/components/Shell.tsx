import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { STEPS_META, stepIndex, VERSION, type M18State, type M18Step } from "../lib/types";
import { canEnterStep } from "../lib/validations";

interface ShellProps {
  children: ReactNode;
  state: M18State;
  onRestart?: () => void;
  onExitDemo?: () => void;
  onGoToStep: (s: M18Step) => void;
}

export function Shell({ children, state, onRestart, onExitDemo, onGoToStep }: ShellProps) {
  const hiIdx = stepIndex(state.highest);
  const m14 = state.m14_data, m6 = state.m6_data;
  const hasMT = m14 && m14.mt_prix;
  const hasHT = (m6 && m6.prix_ht) || (m14 && m14.prix_ht);

  return (
    <div className="-mx-6 -my-6 min-h-[calc(100vh-4rem)] w-[calc(100%+3rem)] text-[#f5f5f5]"
      style={{ background: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(201,168,76,0.06), transparent 60%), #080808" }}>
      <div className="mx-auto w-full max-w-[1100px] px-4 py-8 md:py-10">
        <Link to="/parcours/liberty" className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-white/40 transition-colors hover:text-[#C9A84C]">
          <ArrowLeft className="h-3.5 w-3.5" /> Retour au parcours LIBERTY
        </Link>

        <header className="flex items-center justify-between gap-4 border-b pb-4" style={{ borderColor: "#2a2a2a" }}>
          <div className="flex items-baseline gap-3">
            <span className="font-serif text-[22px] font-semibold tracking-[0.04em] text-[#C9A84C]">LIBERTY</span>
            <span className="text-[12px] uppercase tracking-[0.14em] text-white/40">AL BARAKA · M18</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border px-2 py-0.5 text-[11px] text-white/40" style={{ borderColor: "#2a2a2a" }}>{VERSION}</span>
            {onRestart && (
              <button type="button" onClick={onRestart} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium" style={{ background: "rgba(201,168,76,0.06)", border: "0.5px solid rgba(201,168,76,0.4)", color: "#C9A84C" }}>
                <RotateCcw className="h-3 w-3" /> Recommencer
              </button>
            )}
          </div>
        </header>

        {/* Bannières */}
        {state.demoMode && (
          <div className="mt-4 rounded-xl px-4 py-2.5 text-[12.5px] leading-[1.5]" style={{ background: "rgba(255,180,80,0.1)", border: "0.5px solid rgba(255,180,80,0.4)", color: "#FFB450" }}>
            ◇ <strong>Mode démonstration{state._activeDemo ? " — " + state._activeDemo.name : ""}</strong> · Tu explores un exemple complet. Tes données ne sont pas touchées.{onExitDemo && <> <button type="button" onClick={onExitDemo} className="font-semibold underline">Quitter la démo et revenir à ma carte</button></>}
          </div>
        )}
        {state.signed && (
          <div className="mt-4 rounded-xl px-4 py-2.5 text-[12.5px] leading-[1.5]" style={{ background: "rgba(76,201,135,0.08)", border: "0.5px solid #4cc987", color: "#b0e8c5" }}>
            ✓ <strong>Écosystème verrouillé</strong>{state.signed_at ? " le " + new Date(state.signed_at).toLocaleDateString("fr-FR") : ""}{state.signed_by ? " par " + state.signed_by : ""}. Les champs sont en lecture seule.
          </div>
        )}
        {!state.demoMode && !state.signed && !hasMT && !hasHT && (
          <div className="mt-4 rounded-xl px-4 py-2.5 text-[12.5px] leading-[1.5]" style={{ background: "rgba(201,138,76,0.08)", border: "0.5px solid #c98a4c", color: "#e8c9a0" }}>
            ⚠ <strong>Aucune offre amont détectée.</strong> La Value Ladder s’assemble à partir de ce que tu as déjà construit (ton High-Ticket en M5/M6, ton Middle-Ticket en M14). Tu peux remplir à la main, mais reviens poser ces modules pour une carte cohérente.
          </div>
        )}
        {!state.demoMode && !state.signed && state.m16_data && (
          <div className="mt-4 rounded-xl px-4 py-2.5 text-[12.5px] leading-[1.5]" style={{ background: "rgba(76,201,135,0.08)", border: "0.5px solid #4cc987", color: "#b0e8c5" }}>
            ✓ Ton Low-Ticket (M16) a été récupéré et pré-rempli dans le niveau 2.
          </div>
        )}

        {/* Stepper */}
        <div className="my-5 flex flex-wrap gap-1.5">
          {STEPS_META.map((s) => {
            const idx = stepIndex(s.id);
            const active = s.id === state.current;
            const done = !active && idx <= hiIdx;
            const open = state.demoMode || idx <= hiIdx || canEnterStep(state, s.id);
            const locked = !open && !active;
            return (
              <button key={s.id} type="button" title={s.full} disabled={locked} onClick={() => onGoToStep(s.id)}
                className="rounded-full px-3 py-1.5 text-[11.5px] font-medium transition-all disabled:cursor-not-allowed"
                style={{
                  background: active ? "#C9A84C" : "#111",
                  color: active ? "#080808" : done ? "#e7d295" : locked ? "rgba(255,255,255,0.3)" : "#aaa",
                  border: "1px solid " + (active ? "#C9A84C" : done ? "#3a3528" : "#2a2a2a"),
                  opacity: locked ? 0.4 : 1,
                }}>
                {s.short}
              </button>
            );
          })}
        </div>

        {children}

        <p className="mt-4 text-center text-[10px] uppercase tracking-[0.16em] text-white/25">AL BARAKA · Liberty · Module 18 — Value Ladder</p>
      </div>
    </div>
  );
}
