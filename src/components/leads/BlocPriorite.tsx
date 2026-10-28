// Récap du questionnaire d'un lead : priorité d'appel A-D, score /100, les deux
// réponses qui pèsent le plus, puis les alertes et informations (refonte du lead
// scoring, 28/10/2026). Partagé par la fiche contact et le panneau de diagnostic.
//
// Les apporteurs ne voient pas la priorité (élément d'évaluation interne) ; le CEO
// voit en plus l'ancien score /70, gardé 4 semaines pour comparer.
import { AlertTriangle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/formatDate";
import { infosScoring, PRIORITE_BADGES, PRIORITE_LABELS, reponsesCles, type Priorite } from "@/lib/leadScoring";

export interface ScoringAffiche {
  score: number | null;
  score_100?: number | null;
  priorite?: Priorite | null;
  flags: string[] | null;
  answers: Record<string, string> | null;
  completed_at: string | null;
  created_at: string;
  funnel_slug: string;
}

export function BlocPriorite({
  scoring,
  voirPriorite,
  voirAncien,
  userTz,
}: {
  scoring: ScoringAffiche;
  voirPriorite: boolean;
  voirAncien: boolean;
  userTz?: string;
}) {
  const { alertes, infos } = infosScoring(scoring.flags);
  const cles = reponsesCles(scoring.answers);

  return (
    <>
      <div className="rounded-md border border-border/50 bg-secondary/30 p-3 space-y-2">
        {voirPriorite && scoring.priorite && (
          <>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Badge variant="outline" className={`text-xs ${PRIORITE_BADGES[scoring.priorite]}`}>
                <span className="font-bold mr-1.5">{scoring.priorite}</span>
                {PRIORITE_LABELS[scoring.priorite]}
              </Badge>
              <span className="text-xs font-mono tabular-nums text-foreground">{scoring.score_100}/100</span>
            </div>
            {cles && <p className="text-xs text-foreground/90">{cles}</p>}
          </>
        )}
        <p className="text-[10px] text-muted-foreground">
          Questionnaire rempli le {formatDateTime(scoring.completed_at ?? scoring.created_at, userTz)}
          {voirAncien && scoring.score != null && <> — ancien score : {scoring.score}/70</>}
          {voirAncien && (
            <>
              {" — tunnel : "}
              <code className="font-mono text-[10px]">{scoring.funnel_slug}</code>
            </>
          )}
        </p>
      </div>

      {alertes.length > 0 && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-300" />
            <span className="text-xs font-medium text-amber-300 uppercase tracking-wider">
              Alertes setter ({alertes.length})
            </span>
          </div>
          <ul className="space-y-1">
            {alertes.map((a) => (
              <li key={a} className="text-xs text-foreground/90">• {a}</li>
            ))}
          </ul>
        </div>
      )}

      {infos.length > 0 && (
        <div className="rounded-md border border-border/50 bg-secondary/20 p-3 space-y-1">
          {infos.map((i) => (
            <p key={i} className="flex items-center gap-1.5 text-xs text-foreground/90">
              <Info className="h-3.5 w-3.5 text-muted-foreground" /> {i}
            </p>
          ))}
        </div>
      )}
    </>
  );
}
