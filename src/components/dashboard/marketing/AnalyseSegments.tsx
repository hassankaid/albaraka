// ─────────────────────────────────────────────────────────────────────────
// « Quel est le meilleur canal, et le pire ? » — décliné sur trois axes :
// par canal, par tunnel, puis par combinaison canal × tunnel.
//
// Le classement ne se fait pas toujours sur le même critère, et c'est voulu :
// le ROI n'existe que là où il y a de la dépense. Dès qu'un canal organique
// entre dans la comparaison, on bascule sur le CA par lead — le seul rendement
// qui se compare entre du payant et du gratuit. Le critère retenu est affiché,
// jamais deviné par le lecteur.
//
// Les segments trop petits sont écartés du classement plutôt que noyés dedans :
// un canal à deux leads dont un achète afficherait un rendement spectaculaire
// et ferait prendre une mauvaise décision. Ils restent listés, avec la raison.
// ─────────────────────────────────────────────────────────────────────────
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, ArrowUp, Info } from "lucide-react";
import BarrePart from "./BarrePart";
import {
  classer, estCanalMarketing, fmtEuros, fmtNombre, fmtPourcent,
  libelleCritere, parCanal, parCombinaison, parTunnel, SEUIL_LEADS,
  type Classement, type PerfBrute, type Segment,
} from "@/lib/marketing/perf";

interface Props {
  lignes: PerfBrute[];
  titre?: string;
}

type Axe = "canal" | "tunnel" | "combinaison";

const AXES: { cle: Axe; onglet: string; question: string }[] = [
  { cle: "canal", onglet: "Par canal", question: "Quel canal rapporte le plus ?" },
  { cle: "tunnel", onglet: "Par tunnel", question: "Quel tunnel convertit le mieux ?" },
  { cle: "combinaison", onglet: "Par combinaison", question: "Quel couple canal × tunnel faut-il pousser ?" },
];

export default function AnalyseSegments({ lignes, titre = "Meilleur et pire" }: Props) {
  const [axe, setAxe] = useState<Axe>("canal");

  const classements = useMemo(() => {
    // Les apporteurs et les ventes non attribuées sortent du classement : ce ne
    // sont pas des canaux d'acquisition marketing, les comparer n'aurait pas de sens.
    const perimetre = lignes.filter(estCanalMarketing);
    return {
      canal: classer(parCanal(perimetre)),
      tunnel: classer(parTunnel(perimetre)),
      combinaison: classer(parCombinaison(perimetre)),
    } as Record<Axe, Classement>;
  }, [lignes]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-heading text-xl font-semibold">{titre}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={axe} onValueChange={(v) => setAxe(v as Axe)}>
          <TabsList className="grid grid-cols-3 mb-4">
            {AXES.map((a) => (
              <TabsTrigger key={a.cle} value={a.cle} className="text-xs">{a.onglet}</TabsTrigger>
            ))}
          </TabsList>

          {AXES.map((a) => (
            <TabsContent key={a.cle} value={a.cle} className="space-y-4 mt-0">
              <p className="text-sm text-muted-foreground">{a.question}</p>
              <ContenuAxe classement={classements[a.cle]} />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}

function ContenuAxe({ classement }: { classement: Classement }) {
  const { meilleur, pire, critere, compares, ecartes } = classement;

  if (!meilleur) {
    return (
      <p className="text-sm text-muted-foreground">
        Pas assez de volume sur cette période pour classer quoi que ce soit
        {ecartes.length > 0 && <> — {ecartes.length} segment{ecartes.length > 1 ? "s" : ""} sous le seuil de {SEUIL_LEADS} leads</>}.
      </p>
    );
  }

  const totalLeads = compares.reduce((a, s) => a + s.kpis.leads, 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Podium segment={meilleur} critere={critere} rang="meilleur" ecart={ecartEntreLesDeux(meilleur, pire, critere)} />
        {pire && <Podium segment={pire} critere={critere} rang="pire" />}
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm min-w-[820px]">
          <thead>
            <tr className="border-b bg-muted/40 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              <th className="text-left font-medium p-2.5">Segment</th>
              <th className="text-right font-medium p-2.5">Leads</th>
              <th className="text-right font-medium p-2.5">CPL</th>
              <th className="text-right font-medium p-2.5">Ventes</th>
              <th className="text-right font-medium p-2.5">CA</th>
              <th className="text-right font-medium p-2.5">Coût / vente</th>
              <th className="text-right font-medium p-2.5">Budget</th>
              <th className="text-right font-medium p-2.5">ROI</th>
              <th className="text-right font-medium p-2.5">CA / lead</th>
            </tr>
          </thead>
          <tbody>
            {compares.map((s, i) => (
              <tr key={s.cle} className="border-b last:border-0 hover:bg-muted/30">
                <td className="p-2.5 min-w-[190px]">
                  <div className="flex items-baseline gap-2">
                    <span className="text-muted-foreground tabular-nums text-xs">{i + 1}</span>
                    <span className={i === 0 ? "font-medium" : undefined}>{s.libelle}</span>
                  </div>
                  <BarrePart valeur={s.kpis.leads} total={totalLeads} ton={i === 0 ? "or" : "neutre"} />
                </td>
                <td className="p-2.5 text-right tabular-nums">{fmtNombre(s.kpis.leads)}</td>
                <td className="p-2.5 text-right tabular-nums">{fmtEuros(s.kpis.cpl, 2)}</td>
                <td className="p-2.5 text-right tabular-nums">{fmtNombre(s.kpis.ventes)}</td>
                <td className="p-2.5 text-right tabular-nums">{fmtEuros(s.kpis.ca)}</td>
                <td className="p-2.5 text-right tabular-nums">{fmtEuros(s.kpis.coutParVente, 2)}</td>
                <td className="p-2.5 text-right tabular-nums">{fmtEuros(s.kpis.depense, 2)}</td>
                <td className={`p-2.5 text-right tabular-nums ${
                  s.kpis.roi === null ? "" : s.kpis.roi >= 0 ? "text-[hsl(var(--kpi-paid))]" : "text-[hsl(var(--kpi-lost))]"
                }`}>{fmtPourcent(s.kpis.roi)}</td>
                <td className="p-2.5 text-right tabular-nums">{fmtEuros(s.kpis.caParLead, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground flex items-start gap-1.5">
        <Info className="size-3.5 mt-0.5 shrink-0" />
        <span>
          Classé sur le <strong>{libelleCritere(critere)}</strong>
          {critere === "caParLead" && " — le ROI n'est pas comparable ici, tous les segments n'ont pas de dépense publicitaire"}.
          {ecartes.length > 0 && (
            <> Écartés du classement : {ecartes.map((e) => `${e.libelle} (${e.raison})`).join(", ")}.</>
          )}
        </span>
      </p>
    </div>
  );
}

/**
 * L'écart entre le meilleur et le pire, en toutes lettres. C'est le calcul que
 * le lecteur allait faire de tête ; autant le lui donner.
 */
function ecartEntreLesDeux(meilleur: Segment, pire: Segment | null, critere: "roi" | "caParLead"): string | undefined {
  if (!pire) return undefined;
  const a = critere === "roi" ? meilleur.kpis.roi : meilleur.kpis.caParLead;
  const b = critere === "roi" ? pire.kpis.roi : pire.kpis.caParLead;
  if (a === null || b === null) return undefined;

  if (critere === "caParLead") {
    if (b <= 0) return `${pire.libelle} n'a rien rapporté`;
    const facteur = a / b;
    if (!Number.isFinite(facteur) || facteur < 1.05) return undefined;
    return `${facteur.toFixed(1).replace(".", ",")}× ce que rapporte ${pire.libelle}`;
  }
  const points = Math.round(a - b);
  if (points === 0) return undefined;
  return `${points} points de ROI de plus que ${pire.libelle}`;
}

function Podium({ segment, critere, rang, ecart }: {
  segment: Segment;
  critere: "roi" | "caParLead";
  rang: "meilleur" | "pire";
  ecart?: string;
}) {
  const estMeilleur = rang === "meilleur";
  const valeur = critere === "roi" ? fmtPourcent(segment.kpis.roi) : fmtEuros(segment.kpis.caParLead, 2);

  return (
    <div
      className={`rounded-xl border p-4 sm:p-5 ${
        estMeilleur
          ? "gold-border bg-primary/[0.04]"
          : "border-border bg-muted/40"
      }`}
    >
      <div className="flex items-center gap-2 mb-2 text-[11px] font-medium uppercase tracking-[0.12em]">
        {estMeilleur
          ? <ArrowUp className="size-3.5 text-primary" />
          : <ArrowDown className="size-3.5 text-muted-foreground" />}
        <span className={estMeilleur ? "text-primary" : "text-muted-foreground"}>
          {estMeilleur ? "Meilleur" : "Pire"}
        </span>
      </div>

      <div className="font-medium text-[15px]">{segment.libelle}</div>

      <div className={`font-heading font-semibold tabular-nums leading-none mt-2 text-[clamp(1.6rem,3.6vw,2.1rem)] ${
        estMeilleur ? "text-primary" : "text-muted-foreground"
      }`}>
        {valeur}
      </div>

      <div className="text-xs text-muted-foreground mt-2 leading-snug">
        {fmtNombre(segment.kpis.leads)} leads · {fmtNombre(segment.kpis.ventes)} vente{segment.kpis.ventes > 1 ? "s" : ""} · {fmtEuros(segment.kpis.ca)}
      </div>

      {ecart && (
        <div className="text-xs mt-2 pt-2 border-t border-border/60 text-muted-foreground">{ecart}</div>
      )}
    </div>
  );
}
