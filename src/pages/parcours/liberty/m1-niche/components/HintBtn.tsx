import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { getHint, hasHint } from "../lib/hints";

interface HintBtnProps {
  hintKey: string;
}

/**
 * Bouton (?) qui ouvre un popover avec 3 exemples (argent / santé / relations).
 * Réplique fidèle du `hintBtn()` Sidali V2.
 *
 * Le popover est positionné en flottant sous le bouton (ou au-dessus s'il manque
 * de place en bas). Fermé en cliquant à l'extérieur ou sur le X.
 */
export function HintBtn({ hintKey }: HintBtnProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number; flipUp: boolean }>({
    top: 0, left: 0, flipUp: false,
  });
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  if (!hasHint(hintKey)) return null;

  function computePosition() {
    const anchor = btnRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const popW = 360;
    const popH = popRef.current?.offsetHeight ?? 280;
    const vh = window.innerHeight;
    const vw = window.innerWidth;

    let top = rect.bottom + 10;
    let flipUp = false;
    if (top + popH > vh - 16) {
      top = rect.top - popH - 10;
      flipUp = true;
    }
    if (top < 16) top = 16;

    let left = rect.left - 10;
    if (left + popW > vw - 16) left = vw - popW - 16;
    if (left < 16) left = 16;

    setPosition({ top, left, flipUp });
  }

  useEffect(() => {
    if (!open) return;
    // Positionne après le 1er render pour avoir la hauteur réelle.
    computePosition();
    const onResize = () => computePosition();
    const onScroll = () => setOpen(false);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      const target = e.target as Node;
      if (popRef.current?.contains(target)) return;
      if (btnRef.current?.contains(target)) return;
      setOpen(false);
    }
    // Petit délai pour ne pas attraper le clic d'ouverture.
    const t = window.setTimeout(() => {
      document.addEventListener("click", onClick);
    }, 50);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("click", onClick);
    };
  }, [open]);

  const data = getHint(hintKey)!;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        aria-label="Voir 3 exemples concrets"
        className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full align-middle text-[10px] font-bold leading-none transition-all hover:scale-110"
        style={{
          background: open ? "#C9A84C" : "rgba(201,168,76,0.12)",
          border: "0.5px solid rgba(201,168,76,0.4)",
          color: open ? "#080808" : "#C9A84C",
        }}
      >
        ?
      </button>

      {open &&
        createPortal(
          <div
            ref={popRef}
            className="fixed z-[250] w-[360px] max-w-[calc(100vw-32px)] rounded-xl p-3.5 text-white shadow-[0_16px_48px_rgba(0,0,0,0.6)]"
            style={{
              top: position.top,
              left: position.left,
              background: "#14130E",
              border: "0.5px solid rgba(201,168,76,0.4)",
              boxShadow:
                "0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,168,76,0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Petite flèche pointant vers le bouton */}
            <span
              className="absolute h-3 w-3 rotate-45"
              style={{
                background: "#14130E",
                top: position.flipUp ? "auto" : -7,
                bottom: position.flipUp ? -7 : "auto",
                left: 20,
                borderTop: position.flipUp
                  ? "none"
                  : "0.5px solid rgba(201,168,76,0.4)",
                borderLeft: position.flipUp
                  ? "none"
                  : "0.5px solid rgba(201,168,76,0.4)",
                borderRight: position.flipUp
                  ? "0.5px solid rgba(201,168,76,0.4)"
                  : "none",
                borderBottom: position.flipUp
                  ? "0.5px solid rgba(201,168,76,0.4)"
                  : "none",
              }}
            />
            {/* Header */}
            <div
              className="mb-2.5 flex items-center justify-between border-b pb-2"
              style={{ borderColor: "rgba(201,168,76,0.18)" }}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#C9A84C]">
                3 exemples · 1 par marché core
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-5 w-5 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-[#C9A84C]/10 hover:text-[#C9A84C]"
                aria-label="Fermer"
              >
                <X className="h-3 w-3" />
              </button>
            </div>

            <HintSection emoji="💰" label="Argent" color="#FFB450" text={data.argent} />
            <HintSection emoji="❤️" label="Santé" color="#50C878" text={data.sante} />
            <HintSection
              emoji="🤝"
              label="Relations"
              color="#C9A84C"
              text={data.relations}
              last
            />
          </div>,
          document.body,
        )}
    </>
  );
}

function HintSection({
  emoji,
  label,
  color,
  text,
  last,
}: {
  emoji: string;
  label: string;
  color: string;
  text: string;
  last?: boolean;
}) {
  return (
    <div className={last ? "" : "mb-2.5"}>
      <div
        className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.08em]"
        style={{ color }}
      >
        <span>{emoji}</span>
        <span>{label}</span>
      </div>
      <div
        className="whitespace-pre-line border-l pl-2.5 text-[11.5px] leading-[1.55] text-white/70"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        {text}
      </div>
    </div>
  );
}
