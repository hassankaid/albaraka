// Rendez-vous ventilés par agenda d'origine.
//
// Trois agendas vivants, trois intentions différentes :
//   • conférence  — le prospect vient d'assister au direct ;
//   • tunnel VSL  — il a vu la vidéo, pas la conférence ;
//   • retargeting — il revient seul depuis la page témoignages.
//
// Un « nombre de RDV » global mélangerait ces trois-là et masquerait la seule
// chose qu'on veut savoir : lequel de ces chemins remplit vraiment l'agenda.
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtNombre, fmtPourcent } from "@/lib/marketing/perf";
import { useMarketingRdv, type PeriodePerf, type RdvParOrigine } from "@/hooks/useMarketingPerf";

const LIBELLES: Record<RdvParOrigine["origine"], { titre: string; aide: string }> = {
  conference: { titre: "Événement conférence", aide: "Pris sur l'agenda de la conférence" },
  vsl: { titre: "Tunnel VSL", aide: "Pris sous la vidéo du tunnel" },
  retargeting: { titre: "Retargeting", aide: "Pris depuis la page témoignages" },
  autre: { titre: "Autre", aide: "Organique, historique, hors périmètre" },
};

const ORDRE: RdvParOrigine["origine"][] = ["conference", "vsl", "retargeting", "autre"];

export default function BlocRendezVous({ periode }: { periode: PeriodePerf | null }) {
  const { data, isLoading, error } = useMarketingRdv(periode);

  if (error) return null;

  const lignes = data ?? [];
  const total = lignes.reduce((a, l) => a + l.rdv, 0);
  const triees = [...lignes].sort((a, b) => ORDRE.indexOf(a.origine) - ORDRE.indexOf(b.origine));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Rendez-vous par origine</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-32" />
        ) : total === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun rendez-vous sur cette période.</p>
        ) : (
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="text-left font-medium p-2.5">Origine</th>
                  <th className="text-right font-medium p-2.5">RDV pris</th>
                  <th className="text-right font-medium p-2.5">Part</th>
                  <th className="text-right font-medium p-2.5">Honorés</th>
                  <th className="text-right font-medium p-2.5">No-show</th>
                  <th className="text-right font-medium p-2.5">Annulés</th>
                </tr>
              </thead>
              <tbody>
                {triees.map((l) => (
                  <tr key={l.origine} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-2.5">
                      <div>{LIBELLES[l.origine].titre}</div>
                      <div className="text-xs text-muted-foreground">{LIBELLES[l.origine].aide}</div>
                    </td>
                    <td className="p-2.5 text-right tabular-nums font-medium">{fmtNombre(l.rdv)}</td>
                    <td className="p-2.5 text-right tabular-nums text-muted-foreground">
                      {total > 0 ? Math.round((l.rdv / total) * 100) : 0} %
                    </td>
                    <td className="p-2.5 text-right tabular-nums">{fmtNombre(l.honores)}</td>
                    <td className="p-2.5 text-right tabular-nums">{fmtNombre(l.no_show)}</td>
                    <td className="p-2.5 text-right tabular-nums">{fmtNombre(l.annules)}</td>
                  </tr>
                ))}
                <tr className="bg-muted/30 font-semibold">
                  <td className="p-2.5">Total</td>
                  <td className="p-2.5 text-right tabular-nums">{fmtNombre(total)}</td>
                  <td className="p-2.5 text-right tabular-nums">100 %</td>
                  <td className="p-2.5 text-right tabular-nums">{fmtNombre(triees.reduce((a, l) => a + l.honores, 0))}</td>
                  <td className="p-2.5 text-right tabular-nums">{fmtNombre(triees.reduce((a, l) => a + l.no_show, 0))}</td>
                  <td className="p-2.5 text-right tabular-nums">{fmtNombre(triees.reduce((a, l) => a + l.annules, 0))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-3">
          « Honoré » = le rendez-vous a eu lieu, quelle qu'en soit l'issue. Un rendez-vous encore à
          venir n'y est pas compté.
        </p>
      </CardContent>
    </Card>
  );
}
