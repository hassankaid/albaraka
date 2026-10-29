// Studio : vidéos du jour (1 gratuite, 5 avec l'abonnement à 10 €/mois, Sidali 13/10/2026).
// Depuis le 29/10/2026, la version gratuite a un motion design léger ; l'abonnement donne le
// motion design complet. Les durées sont les mêmes pour tous (5 min, 3 en voix off) tant que
// `duree_max_gratuit` est vide (Sidali, 29/10 au soir).
// Une « vidéo » = une nouvelle vidéo importée ; refaire le rendu d'une vidéo ne compte pas.
import { Link } from "react-router-dom";
import { Crown, Film, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useStudioAcces, type QuotaStudio as Quota } from "@/hooks/useStudioAcces";
import { minutes } from "@/lib/studio/reglages";

export const quotaEpuise = (q?: Quota) => !!q && q.restantes !== null && q.restantes <= 0;


/** Bandeau compact : « Aujourd'hui : 0 / 1 vidéo » + lien vers l'abonnement. */
export function BandeauQuota() {
  const { data: q } = useStudioAcces();
  if (!q || q.limite === null) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/30 px-4 py-3 text-sm" data-testid="bandeau-quota">
      <span className="flex items-center gap-2">
        <Film className="h-4 w-4 text-primary" />
        Aujourd'hui : <b>{q.utilisees} / {q.limite}</b> {q.limite > 1 ? "nouvelles vidéos" : "nouvelle vidéo"}
        {q.abonne && <span className="ml-1 inline-flex items-center gap-1 text-xs text-amber-600"><Crown className="h-3.5 w-3.5" /> Abonné</span>}
        {q.formule === "gratuit" && (
          <span className="text-xs text-muted-foreground" data-testid="formule-gratuite">
            · version gratuite : {q.duree_max_s ? `${minutes(q.duree_max_s)} max, ` : ""}motion design léger
          </span>
        )}
      </span>
      {!q.abonne ? (
        <Button asChild size="sm" variant="outline" className="gap-2">
          <Link to="/studio/abonnement">
            <Crown className="h-4 w-4" /> 5 vidéos par jour et motion design complet : 10 €/mois
          </Link>
        </Button>
      ) : (
        <Link to="/studio/abonnement" className="text-xs text-muted-foreground underline-offset-2 hover:underline">
          Mon abonnement
        </Link>
      )}
    </div>
  );
}

/** Affiché à la place de l'import quand les vidéos du jour sont utilisées. */
export function QuotaAtteint() {
  const { data: q } = useStudioAcces();
  if (!q) return null;
  return (
    <Card className="border-amber-500/40" data-testid="quota-atteint">
      <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
        <Lock className="h-8 w-8 text-amber-500" />
        {q.abonne ? (
          <>
            <h2 className="text-lg font-semibold">Tes {q.limite} vidéos du jour sont faites</h2>
            <p className="max-w-md text-sm text-muted-foreground">Reviens demain pour en importer de nouvelles. Tu peux toujours retoucher et refaire le rendu de tes vidéos.</p>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold">Ta vidéo gratuite du jour est faite</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Reviens demain pour la suivante, ou passe à l'abonnement Studio : <b>5 nouvelles vidéos par jour, jusqu'à 5 minutes, avec le motion design complet, pour 10 €/mois</b>, sans engagement. Tu peux toujours retoucher tes vidéos.
            </p>
            <Button asChild className="gap-2">
              <Link to="/studio/abonnement">
                <Crown className="h-4 w-4" /> Passer à 5 vidéos par jour
              </Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
