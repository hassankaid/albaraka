// Tableau des sept indicateurs, en lignes. Les colonnes varient selon la vue :
// une seule pour la conférence, quatre pour le mensuel (mois, M-1, objectif,
// écart). C'est le même composant, pour que les deux vues ne divergent jamais
// ni dans l'ordre des indicateurs ni dans leur formatage.
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Kpis } from "@/lib/marketing/perf";
import { KPIS, type DefKpi } from "@/lib/marketing/kpiDefs";

export interface ColonneKpi {
  cle: string;
  entete: string;
  /** Rendu d'une cellule. `null` laisse la cellule vide. */
  cellule: (def: DefKpi, kpis: Kpis) => React.ReactNode;
  alignement?: "gauche" | "droite";
  classeEntete?: string;
}

export default function TableauKpis({ kpis, colonnes }: { kpis: Kpis; colonnes: ColonneKpi[] }) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm min-w-[520px]">
          <thead>
            <tr className="border-b bg-muted/40 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              <th className="text-left font-medium p-3">Indicateur</th>
              {colonnes.map((c) => (
                <th
                  key={c.cle}
                  className={`font-medium p-3 whitespace-nowrap ${c.alignement === "gauche" ? "text-left" : "text-right"} ${c.classeEntete ?? ""}`}
                >
                  {c.entete}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {KPIS.map((def) => (
              <tr key={def.cle} className="border-b last:border-0 hover:bg-muted/30">
                <td className="p-3">
                  <span className="inline-flex items-center gap-1.5">
                    {def.libelle}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-muted-foreground/60 hover:text-muted-foreground" aria-label={`Définition : ${def.libelle}`}>
                          <Info className="size-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs leading-relaxed">{def.aide}</TooltipContent>
                    </Tooltip>
                  </span>
                </td>
                {colonnes.map((c) => (
                  <td
                    key={c.cle}
                    className={`p-3 tabular-nums whitespace-nowrap ${c.alignement === "gauche" ? "text-left" : "text-right"}`}
                  >
                    {c.cellule(def, kpis)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TooltipProvider>
  );
}
