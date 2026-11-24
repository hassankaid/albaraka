// Follow-up (22/11/2026, demande de Sabrina) : date de relance d'un lead ou d'un
// suivi de closer, avec son échéance (aujourd'hui, en retard, à venir).
import { CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { aujourdhuiParis, echeanceFollowUp, MOTIFS_FOLLOW_UP } from "@/lib/leadConfig";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

/** Date de relance (obligatoire) et motif d'un follow-up : fenêtre de traitement et espace /my-space. */
export function ChampsFollowUp({
  le, onLe, motif, onMotif, precision, onPrecision, disabled,
}: {
  le: string; onLe: (v: string) => void;
  motif: string; onMotif: (v: string) => void;
  precision: string; onPrecision: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-md border border-pink-500/30 bg-pink-500/5 p-3 space-y-2" data-testid="bloc-follow-up">
      <p className="text-xs text-muted-foreground">
        Lead intéressé, à recontacter à une date précise. Il sort du suivi des relances et reste chez toi jusqu'à cette date : un rappel t'arrive le matin même.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-xs font-medium" htmlFor="fu-le">Date de relance</label>
          <Input id="fu-le" type="date" value={le} min={aujourdhuiParis()} onChange={(e) => onLe(e.target.value)} disabled={disabled} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Motif</label>
          <Select value={motif} onValueChange={onMotif} disabled={disabled}>
            <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MOTIFS_FOLLOW_UP.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      {motif === "Autre" && (
        <Input placeholder="Précise le motif (ex. attend l'accord de son conjoint)" value={precision} onChange={(e) => onPrecision(e.target.value)} disabled={disabled} />
      )}
    </div>
  );
}
