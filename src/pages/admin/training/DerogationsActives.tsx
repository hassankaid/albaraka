// ─────────────────────────────────────────────────────────────────────────
// Toutes les dérogations manuelles en vigueur, les plus anciennes d'abord.
//
// Ce n'est pas un écran de confort. Une dérogation sans date de fin est
// invisible une fois posée : l'élève voit une porte ouverte ou fermée, et
// l'automatique ne reprendra jamais la main. Sans cette liste, on se retrouve
// dans un an avec des décisions dont plus personne ne connaît la raison —
// c'est le mode de défaillance classique de ce genre d'outil.
//
// Tri par ancienneté, et pas par nom : ce qu'on veut voir en premier, c'est ce
// qui traîne depuis le plus longtemps.
// ─────────────────────────────────────────────────────────────────────────
import { Link } from "react-router-dom";
import { Lock, Unlock, CalendarClock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDerogationsActives, type DomaineAcces } from "@/hooks/useAccesManuels";

const DOMAINES: Record<DomaineAcces, string> = {
  coaching: "Coaching",
  formation: "Formation",
  fonctionnalite: "Fonctionnalité",
  pass: "Pass",
};

const jours = (iso: string) =>
  Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);

export default function DerogationsActives() {
  const { data, isLoading } = useDerogationsActives();

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  const lignes = data ?? [];

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-heading text-lg">Dérogations en vigueur</h2>
          <span className="text-xs text-muted-foreground">
            {lignes.length === 0 ? "aucune" : `${lignes.length} au total`}
          </span>
        </div>

        {lignes.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Tous les accès suivent le système automatique.
          </p>
        ) : (
          <div className="space-y-1.5">
            {lignes.map((d) => {
              const age = jours(d.accorde_le);
              return (
                <div
                  key={d.id}
                  className="flex items-start gap-3 rounded-md border border-border px-3 py-2 text-sm"
                >
                  <span
                    className={`mt-0.5 shrink-0 rounded p-1 ${
                      d.decision === "autorise"
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-destructive/10 text-destructive"
                    }`}
                    title={d.decision === "autorise" ? "Accès forcé ouvert" : "Accès forcé fermé"}
                  >
                    {d.decision === "autorise" ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <Link
                        to={`/admin/training/students/${d.user_id}`}
                        className="font-medium hover:underline"
                      >
                        {d.nom}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {DOMAINES[d.domaine]} · {d.cible}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{d.motif}</div>
                  </div>
                  <div className="shrink-0 text-right text-[11px] text-muted-foreground">
                    <div>
                      {age === 0 ? "aujourd'hui" : `il y a ${age} j`}
                    </div>
                    {d.expire_le ? (
                      <div className="flex items-center justify-end gap-1">
                        <CalendarClock className="h-3 w-3" />
                        {new Date(d.expire_le).toLocaleDateString("fr-FR")}
                      </div>
                    ) : (
                      // Le cas qui mérite l'attention : rien ne l'arrêtera.
                      <div className="text-amber-600">sans fin</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
