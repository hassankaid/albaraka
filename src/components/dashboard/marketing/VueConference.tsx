// Vue 1 — performance d'une conférence, choisie dans une liste déroulante.
//
// La période est exprimée en CONFÉRENCES, pas en dates : un lead inscrit le
// mercredi compte pour le dimanche vers lequel il a été poussé, et la dépense
// publicitaire de ce mercredi aussi. C'est la seule façon d'obtenir un CPL qui
// veut dire quelque chose à l'échelle d'une conférence.
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { buildConferenceList, conferenceEnCours, currentOrPrevSunday, formatConferenceLabelFull, type ConferenceFilter } from "@/lib/marketing/conferenceFilter";
import { additionner, calculerKpis } from "@/lib/marketing/perf";
import { useMarketingPerf } from "@/hooks/useMarketingPerf";
import TableauKpis, { type ColonneKpi } from "./TableauKpis";
import KpiVedette from "./KpiVedette";
import AnalyseSegments from "./AnalyseSegments";
import BlocRendezVous from "./BlocRendezVous";

export default function VueConference({ onPeriodeChange }: { onPeriodeChange?: (f: ConferenceFilter) => void }) {
  const conferences = useMemo(() => {
    // La liste va jusqu'à la conférence EN COURS d'inscription, pas jusqu'à la
    // dernière passée : c'est elle qui porte les leads de la semaine, et
    // l'arrêter avant la faisait disparaître de l'écran le dimanche matin.
    // Au-delà, rien à montrer — les dimanches suivants n'ont pas encore de leads.
    const borneHaute = conferenceEnCours(new Date());
    return buildConferenceList(new Date(), 26, 2).filter((d) => d <= borneHaute).reverse();
  }, []);

  // La sélection par défaut n'est PAS le premier élément de la liste.
  //
  // La liste s'arrête à la conférence qui collecte encore des inscriptions ;
  // celle-là n'a ni ventes ni CA, donc l'ouvrir par défaut donnerait un écran
  // presque vide. On ouvre sur la dernière conférence qui a eu lieu — celle
  // dont on vient lire les résultats. Le dimanche à 11h00, on bascule donc sur
  // la conférence du jour, pas sur celle de la semaine suivante.
  const parDefaut = useMemo(() => {
    const derniereTenue = currentOrPrevSunday(new Date());
    return conferences.includes(derniereTenue) ? derniereTenue : conferences[0];
  }, [conferences]);

  const [date, setDate] = useState(parDefaut);

  useEffect(() => {
    if (date && onPeriodeChange) onPeriodeChange({ mode: "single", date });
  }, [date, onPeriodeChange]);

  const { data, isLoading, error } = useMarketingPerf(
    date ? { mode: "conference", from: date, to: date } : null,
  );

  const lignes = data ?? [];
  const kpis = useMemo(() => calculerKpis(additionner(lignes)), [lignes]);

  const colonnes: ColonneKpi[] = [
    {
      cle: "valeur",
      entete: "Valeur",
      cellule: (def, k) => <span className="font-semibold">{def.format(def.valeur(k))}</span>,
    },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between gap-4 space-y-0">
          <CardTitle className="font-heading text-xl font-semibold">Performance d'une conférence</CardTitle>
          <Select value={date} onValueChange={setDate}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Choisir une conférence" />
            </SelectTrigger>
            <SelectContent>
              {conferences.map((d) => (
                <SelectItem key={d} value={d} className="capitalize">
                  {formatConferenceLabelFull(d)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-72" />
          ) : error ? (
            <p className="text-sm text-destructive">Impossible de charger les données : {(error as any)?.message ?? "erreur inconnue"}</p>
          ) : (
            <>
              <KpiVedette kpis={kpis} />
              <div className="mt-4">
                <TableauKpis kpis={kpis} colonnes={colonnes} />
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                {kpis.leads === 0
                  ? "Aucun lead rattaché à cette conférence."
                  : "Les leads sont comptés par conférence visée, pas par date d'inscription : un lead venu le mercredi compte pour le dimanche suivant. Les totaux d'un mois calendaire ne coïncideront donc pas avec la somme de ses conférences."}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {date && <BlocRendezVous periode={{ mode: "conference", from: date, to: date }} />}

      {!isLoading && lignes.length > 0 && (
        <AnalyseSegments lignes={lignes} titre="Meilleur et pire — sur cette conférence" />
      )}
    </div>
  );
}
