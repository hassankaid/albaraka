// Follow-up (22/11/2026, demande de Sabrina) : date de relance d'un lead ou d'un
// suivi de closer, avec son échéance (aujourd'hui, en retard, à venir).
import { CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { aujourdhuiParis, echeanceFollowUp } from "@/lib/leadConfig";

const LIBELLE = { retard: "en retard", aujourdhui: "aujourd'hui", a_venir: "" } as const;
const COULEUR = {
  retard: "border-red-500/50 bg-red-500/15 text-red-300",
  aujourdhui: "border-amber-400/60 bg-amber-400/15 text-amber-200",
  a_venir: "border-pink-500/40 bg-pink-500/10 text-pink-200",
} as const;

export function dateCourte(le: string): string {
  const [a, m, j] = le.slice(0, 10).split("-");
  return `${j}/${m}${a !== String(new Date().getFullYear()) ? `/${a.slice(2)}` : ""}`;
}

export function BadgeFollowUp({ le, motif, className }: { le: string | null | undefined; motif?: string | null; className?: string }) {
  const e = echeanceFollowUp(le, aujourdhuiParis());
  if (!le || !e) return null;
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold", COULEUR[e], className)}
      title={motif ? `Relance prévue le ${dateCourte(le)} · ${motif}` : `Relance prévue le ${dateCourte(le)}`}
      data-testid="badge-follow-up"
    >
      <CalendarClock className="h-3 w-3" />
      {dateCourte(le)}
      {LIBELLE[e] && <span>· {LIBELLE[e]}</span>}
    </span>
  );
}
