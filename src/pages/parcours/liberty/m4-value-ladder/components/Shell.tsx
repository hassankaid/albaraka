import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, RotateCcw } from "lucide-react";

interface ShellProps {
  children: ReactNode;
  onRestart?: () => void;
  demoLabel?: string | null;
  onExitDemo?: () => void;
}

export function Shell({ children, onRestart, demoLabel, onExitDemo }: ShellProps) {
  return (
    <div
      className="-mx-6 -my-6 min-h-[calc(100vh-4rem)] w-[calc(100%+3rem)] text-[#ECEEF4]"
      style={{
        background:
          "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(201,168,76,0.06), transparent 60%), " +
          "radial-gradient(ellipse 60% 40% at 100% 100%, rgba(201,168,76,0.03), transparent 70%), " +
          "#050505",
      }}
    >
      <div className="mx-auto w-full max-w-[860px] px-4 py-8 md:py-10">
        <Link
          to="/parcours/liberty"
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-white/40 transition-colors hover:text-[#C9A84C]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour au parcours LIBERTY
        </Link>

        <div
          className="relative overflow-hidden rounded-2xl p-7"
          style={{ background: "#080808", border: "0.5px solid rgba(201,168,76,0.18)" }}
        >
          <span
            className="pointer-events-none absolute inset-x-0 top-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.4), transparent)" }}
          />

          <header
            className="mb-5 flex items-center justify-between border-b pb-4"
            style={{ borderColor: "rgba(201,168,76,0.18)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-[#080808] shadow-[0_4px_14px_rgba(201,168,76,0.25)]"
                style={{ background: "#C9A84C" }}
              >
                L
              </div>
              <div>
                <h1 className="flex items-center gap-2 text-[13px] font-semibold leading-tight">
                  Module 4 — VALUE LADDER
                  {demoLabel && (
                    <button
                      type="button"
                      onClick={onExitDemo}
                      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors"
                      style={{
                        background: "rgba(255,180,80,0.12)",
                        border: "0.5px solid rgba(255,180,80,0.4)",
                        color: "#FFB450",
                      }}
                    >
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: "#FFB450" }} />
                      Démo · {demoLabel}
                      <span className="ml-1">✕</span>
                    </button>
                  )}
                </h1>
                <div className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-[#C9A84C]">
                  Liberty · Value Ladder
                </div>
              </div>
            </div>
            {onRestart && (
              <button
                type="button"
                onClick={onRestart}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors"
                style={{
                  background: "rgba(201,168,76,0.06)",
                  border: "0.5px solid rgba(201,168,76,0.4)",
                  color: "#C9A84C",
                }}
              >
                <RotateCcw className="h-3 w-3" />
                Recommencer
              </button>
            )}
          </header>

          {children}
        </div>

        <p className="mt-4 text-center text-[10px] uppercase tracking-[0.16em] text-white/25">
          AL BARAKA · Liberty · Module 4
        </p>
      </div>
    </div>
  );
}
