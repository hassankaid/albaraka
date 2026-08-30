// Vue 2 — performance mensuelle, avec le mois précédent, l'objectif et l'écart
// dans le même tableau.
//
// L'objectif se saisit directement dans la cellule : le CEO et l'agence y ont
// droit, et rien d'autre ne le protège côté client — c'est la politique d'accès
// en base qui fait foi.
//
// La période est ici CALENDAIRE, pas par conférence : un mois ne tombe pas sur
// des dimanches. Les leads comptent par date d'inscription, les ventes par date
// de vente, la dépense par jour de diffusion.
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { ConferenceFilter } from "@/lib/marketing/conferenceFilter";
import { additionner, calculerKpis, fmtNombre } from "@/lib/marketing/perf";
import { calculerEcart, type DefKpi } from "@/lib/marketing/kpiDefs";
import { useEnregistrerObjectif, useMarketingPerfComparee, useObjectifs, type KpiObjectif } from "@/hooks/useMarketingPerf";
import TableauKpis, { type ColonneKpi } from "./TableauKpis";
import KpiVedette from "./KpiVedette";
import AnalyseSegments from "./AnalyseSegments";
import BlocRendezVous from "./BlocRendezVous";

/** 18 derniers mois, du plus récent au plus ancien. */
function derniersMois(n = 18): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function bornesDuMois(premier: string): { from: string; to: string } {
  const d = new Date(premier + "T12:00:00Z");
  const fin = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  return { from: premier, to: fin.toISOString().slice(0, 10) };
}

function moisPrecedent(premier: string): string {
  const d = new Date(premier + "T12:00:00Z");
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1)).toISOString().slice(0, 10);
}

function libelleMois(premier: string): string {
  const d = new Date(premier + "T12:00:00Z");
  const s = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function VueMensuelle({ onPeriodeChange }: { onPeriodeChange?: (f: ConferenceFilter) => void }) {
  const mois = useMemo(() => derniersMois(), []);
  const [selection, setSelection] = useState(mois[0]);

  const precedent = moisPrecedent(selection);
  const bornes = bornesDuMois(selection);
  const bornesPrec = bornesDuMois(precedent);

  useEffect(() => {
    if (onPeriodeChange) onPeriodeChange({ mode: "range", from: bornes.from, to: bornes.to });
  }, [bornes.from, bornes.to, onPeriodeChange]);

  const perf = useMarketingPerfComparee(
    { mode: "calendrier", ...bornes },
    { mode: "calendrier", ...bornesPrec },
  );

  const objectifs = useObjectifs(selection);
  const enregistrer = useEnregistrerObjectif(selection);

  const kpis = useMemo(() => calculerKpis(additionner(perf.courant)), [perf.courant]);
  const kpisPrec = useMemo(() => calculerKpis(additionner(perf.precedent)), [perf.precedent]);

  const colonnes: ColonneKpi[] = [
    {
      cle: "mois",
      entete: libelleMois(selection),
      cellule: (def, k) => <span className="font-semibold">{def.format(def.valeur(k))}</span>,
    },
    {
      cle: "precedent",
      entete: libelleMois(precedent),
      cellule: (def) => <span className="text-muted-foreground">{def.format(def.valeur(kpisPrec))}</span>,
    },
    {
      cle: "objectif",
      entete: "Objectif",
      cellule: (def) => (
        <ChampObjectif
          def={def}
          valeur={objectifs.data?.[def.cle] ?? null}
          onEnregistrer={(v) =>
            enregistrer.mutate(
              { kpi: def.cle as KpiObjectif, valeur: v },
              {
                onSuccess: () => toast.success(v === null ? `Objectif « ${def.libelle} » retiré` : `Objectif « ${def.libelle} » enregistré`),
                onError: (e: any) => toast.error(e?.message ?? "Enregistrement impossible"),
              },
            )
          }
        />
      ),
    },
    {
      cle: "ecart",
      entete: "Écart",
      cellule: (def, k) => {
        const ecart = calculerEcart(def, def.valeur(k), objectifs.data?.[def.cle] ?? null);
        if (!ecart) return <span className="text-muted-foreground">—</span>;
        const couleur = def.sens === "neutre"
          ? "text-muted-foreground"
          : ecart.favorable ? "text-emerald-600" : "text-orange-600";
        return (
          <span className={couleur}>
            {def.format(ecart.absolu)}
            {ecart.pourcent !== null && (
              <span className="text-xs opacity-70 ml-1">
                ({ecart.pourcent > 0 ? "+" : ""}{fmtNombre(Math.round(ecart.pourcent))} %)
              </span>
            )}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between gap-4 space-y-0">
          <CardTitle className="font-heading text-xl font-semibold">Performance mensuelle</CardTitle>
          <Select value={selection} onValueChange={setSelection}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {mois.map((m) => (
                <SelectItem key={m} value={m}>{libelleMois(m)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {perf.isLoading ? (
            <Skeleton className="h-72" />
          ) : perf.error ? (
            <p className="text-sm text-destructive">Impossible de charger les données : {(perf.error as any)?.message ?? "erreur inconnue"}</p>
          ) : (
            <>
              <KpiVedette kpis={kpis} comparaison={kpisPrec} />
              <div className="mt-4">
                <TableauKpis kpis={kpis} colonnes={colonnes} />
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                L'écart se lit dans le sens du progrès : dépasser l'objectif de CPL ou de coût par vente s'affiche en orange, le dépasser en CA s'affiche en vert.
                Vider une case retire l'objectif.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <BlocRendezVous periode={{ mode: "calendrier", ...bornes }} />

      {!perf.isLoading && perf.courant.length > 0 && (
        <AnalyseSegments lignes={perf.courant} titre={`Meilleur et pire — ${libelleMois(selection)}`} />
      )}
    </div>
  );
}

function ChampObjectif({
  def, valeur, onEnregistrer,
}: {
  def: DefKpi;
  valeur: number | null;
  onEnregistrer: (v: number | null) => void;
}) {
  const [brouillon, setBrouillon] = useState<string | null>(null);
  const affiche = brouillon ?? (valeur !== null ? String(valeur) : "");

  const valider = () => {
    if (brouillon === null) return;
    const nettoye = brouillon.trim().replace(",", ".");
    if (nettoye === "") {
      onEnregistrer(null);
    } else {
      const n = Number(nettoye);
      if (!Number.isFinite(n)) {
        toast.error("Valeur numérique attendue");
        setBrouillon(null);
        return;
      }
      if (n !== valeur) onEnregistrer(n);
    }
    setBrouillon(null);
  };

  return (
    <Input
      value={affiche}
      onChange={(e) => setBrouillon(e.target.value)}
      onBlur={valider}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") setBrouillon(null);
      }}
      placeholder="—"
      inputMode="decimal"
      aria-label={`Objectif ${def.libelle}`}
      className="h-8 w-28 ml-auto text-right tabular-nums"
    />
  );
}
