// Les quatre chiffres qui font décider, sortis du tableau et posés en tête.
//
// Le tableau à sept lignes traite les sept indicateurs à égalité. Ce n'est pas
// vrai : on ouvre cet écran pour savoir ce que la publicité a rapporté et ce
// qu'un lead coûte, pas pour lire un budget. Les quatre qui déclenchent une
// décision passent devant, les trois autres restent dans le tableau.
//
// La typographie vient de la plateforme — Cormorant Garamond pour les chiffres,
// comme les titres du reste de l'application. C'est ce qui distingue cet écran
// d'un tableau de bord générique.
import { Card, CardContent } from "@/components/ui/card";
import type { Kpis } from "@/lib/marketing/perf";
import { fmtEuros, fmtNombre, fmtPourcent } from "@/lib/marketing/perf";

type Ton = "or" | "bon" | "mauvais" | "neutre";

interface Vedette {
  libelle: string;
  valeur: string;
  precision?: string;
  ton: Ton;
}

const CLASSE_VALEUR: Record<Ton, string> = {
  or: "text-primary",
  bon: "text-[hsl(var(--kpi-paid))]",
  mauvais: "text-[hsl(var(--kpi-lost))]",
  neutre: "text-foreground",
};

function construire(k: Kpis, comparaison?: Kpis): Vedette[] {
  const evolution = (actuel: number | null, avant: number | null | undefined): string | undefined => {
    if (actuel === null || avant === null || avant === undefined || avant === 0) return undefined;
    const pct = ((actuel - avant) / Math.abs(avant)) * 100;
    if (!Number.isFinite(pct)) return undefined;
    return `${pct >= 0 ? "+" : ""}${Math.round(pct)} % vs mois précédent`;
  };

  return [
    {
      libelle: "CA généré",
      valeur: fmtEuros(k.ca),
      precision: comparaison ? evolution(k.ca, comparaison.ca) : `${fmtNombre(k.ventes)} vente${k.ventes > 1 ? "s" : ""}`,
      ton: "or",
    },
    {
      libelle: "ROI",
      valeur: fmtPourcent(k.roi),
      precision: k.roi === null ? "aucune dépense publicitaire" : `pour ${fmtEuros(k.depense, 2)} investis`,
      ton: k.roi === null ? "neutre" : k.roi >= 0 ? "bon" : "mauvais",
    },
    {
      libelle: "Leads",
      valeur: fmtNombre(k.leads),
      precision: comparaison ? evolution(k.leads, comparaison.leads) : undefined,
      ton: "neutre",
    },
    {
      libelle: "Coût par lead",
      valeur: fmtEuros(k.cpl, 2),
      precision: k.cpl === null ? "hors canaux payants" : undefined,
      ton: "neutre",
    },
  ];
}

export default function KpiVedette({ kpis, comparaison }: { kpis: Kpis; comparaison?: Kpis }) {
  const vedettes = construire(kpis, comparaison);

  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      {vedettes.map((v) => (
        <Card key={v.libelle} className={v.ton === "or" ? "gold-border" : undefined}>
          <CardContent className="p-4 sm:p-5">
            <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {v.libelle}
            </div>
            <div
              className={`font-heading font-semibold tabular-nums leading-none mt-2 text-[clamp(1.7rem,4vw,2.4rem)] ${CLASSE_VALEUR[v.ton]}`}
            >
              {v.valeur}
            </div>
            {v.precision && (
              <div className="text-xs text-muted-foreground mt-1.5 leading-snug">{v.precision}</div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
