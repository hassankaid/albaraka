// LeadScoringPanel — affiche le diagnostic Quiz d'un lead à partir de son
// email (lookup dans lead_scoring_responses). Composant réutilisable :
//
//  - Mode CEO (showScoreAndCategory=true) : score numérique + catégorie
//    (tiède/chaud/froid) + alertes + réponses.
//  - Mode apporteur/collaborateur (showScoreAndCategory=false) : juste
//    "Quiz rempli le X" + alertes setter + 7 réponses détaillées. Pas de
//    score ni de catégorie (éléments d'évaluation interne).
//
// Si le lead n'a pas rempli le quiz, on affiche un état clair "Quiz non
// rempli" plutôt que rien (l'apporteur sait à quoi s'attendre lors du
// premier appel).

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, AlertTriangle, ClipboardList } from "lucide-react";
import { formatDateTime } from "@/lib/formatDate";
import {
  QUIZ_QUESTIONS,
  CATEGORY_LABELS,
  CATEGORY_BADGES,
  CATEGORY_EMOJIS,
  CATEGORY_DETAILS,
  FLAG_LABELS,
  type Category,
} from "@/lib/leadScoring";

interface ScoringResponse {
  id: string;
  funnel_slug: string;
  score: number;
  category: Category;
  flags: string[] | null;
  answers: Record<string, string>;
  completed_at: string | null;
  created_at: string;
}

interface LeadScoringPanelProps {
  /** Email du lead (utilisé pour le lookup case-insensitive). */
  email: string | null | undefined;
  /** Si true, expose score + catégorie. CEO uniquement par défaut. */
  showScoreAndCategory?: boolean;
  /** Fuseau horaire de l'utilisateur courant pour le formatage des dates. */
  userTz?: string;
}

export default function LeadScoringPanel({
  email,
  showScoreAndCategory = false,
  userTz,
}: LeadScoringPanelProps) {
  const [scoring, setScoring] = useState<ScoringResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchScoring() {
      setLoading(true);
      setScoring(null);
      const normalized = email?.toLowerCase().trim();
      if (!normalized) {
        if (!cancelled) setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("lead_scoring_responses")
        .select("id, funnel_slug, score, category, flags, answers, completed_at, created_at")
        .ilike("contact_email", normalized)
        .order("completed_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled) {
        if (data) setScoring(data as ScoringResponse);
        setLoading(false);
      }
    }
    fetchScoring();
    return () => {
      cancelled = true;
    };
  }, [email]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  // ── Pas de réponse au quiz ──
  if (!scoring) {
    return (
      <div className="rounded-md border border-border/50 bg-secondary/20 p-4 flex items-start gap-2.5">
        <ClipboardList className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Quiz de diagnostic non rempli</p>
          <p className="text-xs text-muted-foreground">
            Ce lead n'a pas (encore) répondu au quiz de qualification. Aucune information de pré-diagnostic disponible.
          </p>
        </div>
      </div>
    );
  }

  // ── Avec réponse ──
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Diagnostic Quiz</h3>
      </div>

      {/* Récap : catégorie + score réservés à showScoreAndCategory=true */}
      <div className="rounded-md border border-border/50 bg-secondary/30 p-3 space-y-2">
        {showScoreAndCategory && (
          <>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Badge variant="outline" className={`text-xs ${CATEGORY_BADGES[scoring.category]}`}>
                {CATEGORY_EMOJIS[scoring.category]} {CATEGORY_LABELS[scoring.category]}
              </Badge>
              <span className="text-xs font-mono tabular-nums text-foreground">
                {scoring.score}/70 pts
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground italic leading-relaxed">
              {CATEGORY_DETAILS[scoring.category]}
            </p>
          </>
        )}
        <p className="text-[10px] text-muted-foreground">
          Quiz rempli le{" "}
          {scoring.completed_at
            ? formatDateTime(scoring.completed_at, userTz)
            : formatDateTime(scoring.created_at, userTz)}
          {showScoreAndCategory && (
            <>
              {" — funnel: "}
              <code className="font-mono text-[10px]">{scoring.funnel_slug}</code>
            </>
          )}
        </p>
      </div>

      {/* Alertes setter — visibles dans les deux modes (info opérationnelle utile) */}
      {scoring.flags && scoring.flags.length > 0 && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-300" />
            <span className="text-xs font-medium text-amber-300 uppercase tracking-wider">
              Alertes setter ({scoring.flags.length})
            </span>
          </div>
          <ul className="space-y-1">
            {scoring.flags.map((flag) => (
              <li key={flag} className="text-xs text-foreground/90">
                • {FLAG_LABELS[flag] || flag}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Réponses détaillées — visibles dans les deux modes */}
      <details className="rounded-md border border-border/50 bg-secondary/20 group" open>
        <summary className="cursor-pointer text-xs font-medium text-foreground p-3 flex items-center justify-between">
          <span>Réponses du lead (7 questions)</span>
          <span className="text-muted-foreground group-open:rotate-180 transition-transform">▾</span>
        </summary>
        <div className="px-3 pb-3 pt-0 space-y-3">
          {QUIZ_QUESTIONS.map((q, idx) => {
            const code = scoring.answers?.[q.id];
            const opt = q.options.find((o) => o.code === code);
            return (
              <div key={q.id} className="space-y-1">
                <p className="text-[11px] text-muted-foreground leading-snug">
                  <span className="font-medium text-foreground">Q{idx + 1}. {q.title} —</span> {q.prompt}
                </p>
                <p className="text-xs text-foreground pl-4 border-l-2 border-primary/40">
                  {opt ? `${opt.label}` : <span className="text-muted-foreground italic">— pas de réponse —</span>}
                </p>
              </div>
            );
          })}
        </div>
      </details>
    </div>
  );
}
