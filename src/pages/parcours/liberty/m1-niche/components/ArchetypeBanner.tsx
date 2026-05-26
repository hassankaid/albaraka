import type { BilanState } from "../lib/types";

interface ArchetypeBannerProps {
  bilan: BilanState;
}

/**
 * Bandeau or doré affiché sur toutes les étapes Branche A après le Bilan.
 * Reprend l'archétype + marché choisi + sous-segment.
 * Réplique fidèle de `arch-banner` Sidali.
 */
export function ArchetypeBanner({ bilan }: ArchetypeBannerProps) {
  if (!bilan.archetype) return null;
  const sub = bilan.marche?.sous_segment;
  return (
    <div
      className="mb-4 flex items-center gap-3.5 rounded-[10px] px-4 py-3"
      style={{
        background:
          "linear-gradient(90deg, rgba(201,168,76,0.1), rgba(201,168,76,0.02))",
        border: "0.5px solid rgba(201,168,76,0.4)",
      }}
    >
      <span className="shrink-0 text-[22px]">{bilan.archetype.emoji}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[12px] font-semibold leading-tight text-[#C9A84C]">
          {bilan.archetype.label}
          {bilan.marche && <> · {bilan.marche.label}</>}
        </div>
        <div className="mt-0.5 text-[10px] uppercase tracking-[0.08em] text-white/60">
          {sub ? sub : "Hérité du Bilan d'Orientation"}
        </div>
      </div>
    </div>
  );
}
