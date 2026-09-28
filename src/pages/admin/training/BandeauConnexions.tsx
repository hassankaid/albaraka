// ─────────────────────────────────────────────────────────────────────────
// Vue d'ensemble des connexions des élèves.
//
// La page mesurait déjà l'ACTIVITÉ (dernier chapitre, dernier quiz). Ceci
// mesure la CONNEXION — deux choses différentes : on peut se connecter tous
// les jours sans rien terminer, et inversement terminer un chapitre puis
// disparaître.
//
// Ce qu'on ne peut pas afficher : un historique. auth.audit_log_entries est
// purgé par Supabase et se trouve vide ; on ne dispose donc que de la
// DERNIÈRE connexion de chacun, pas d'une courbe dans le temps. Pour obtenir
// un historique il faudrait enregistrer les connexions nous-mêmes à partir de
// maintenant, et cela ne retrouverait pas le passé.
// ─────────────────────────────────────────────────────────────────────────
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface Stats {
  eleves_total: number;
  jamais_connecte: number;
  connecte_24h: number;
  connecte_7j: number;
  connecte_30j: number;
  inactif_30j_plus: number;
}

export function useStatistiquesConnexions() {
  return useQuery({
    queryKey: ["statistiques-connexions"],
    queryFn: async (): Promise<Stats | null> => {
      const { data, error } = await (supabase as any).rpc("statistiques_connexions");
      if (error) throw error;
      return (data?.[0] ?? null) as Stats | null;
    },
  });
}

export default function BandeauConnexions() {
  const { data, isLoading } = useStatistiquesConnexions();

  if (isLoading) return <Skeleton className="h-24 w-full" />;
  if (!data) return null;

  const pct = (n: number) =>
    data.eleves_total > 0 ? Math.round((n / data.eleves_total) * 100) : 0;

  const cases = [
    { libelle: "Connectés aujourd'hui", valeur: data.connecte_24h, ton: "text-emerald-500" },
    { libelle: "Sur 7 jours", valeur: data.connecte_7j, ton: "text-emerald-500" },
    { libelle: "Sur 30 jours", valeur: data.connecte_30j, ton: "text-foreground" },
    { libelle: "Sans connexion depuis 30 j", valeur: data.inactif_30j_plus, ton: "text-amber-500" },
    // Le chiffre qui compte vraiment : un compte créé mais jamais ouvert n'est
    // pas un élève inactif, c'est un élève qui n'a jamais commencé.
    { libelle: "Ne se sont jamais connectés", valeur: data.jamais_connecte, ton: "text-destructive" },
  ];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-heading text-sm uppercase tracking-wider text-muted-foreground">
            Connexions
          </h2>
          <span className="text-xs text-muted-foreground">{data.eleves_total} élèves</span>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {cases.map((c) => (
            <div key={c.libelle}>
              <div className={`font-heading text-2xl ${c.ton}`}>{c.valeur}</div>
              <div className="text-[11px] leading-tight text-muted-foreground">
                {c.libelle}
                <span className="ml-1 opacity-60">{pct(c.valeur)} %</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
