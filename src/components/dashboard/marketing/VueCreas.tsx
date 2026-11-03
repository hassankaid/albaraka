// Vue 3 — performance par créa (demande de Skalesy, 03/11/2026).
//
// Une ligne par créa (nom de la pub × plateforme) : ce qu'elle a coûté, ce
// qu'elle a amené, ce qu'elle a vendu. Au clic, les leads de la créa.
//
// LECTURE PAR COHORTE. La dépense compte par jour de diffusion ; les leads par
// jour d'inscription ; les ventes sont celles DE CES LEADS, quelle que soit la
// date de la vente. C'est ce qui dit ce qu'une créa a rapporté — mais une
// période récente n'a pas encore toutes ses ventes : un lead achète en moyenne
// trois jours après son inscription.
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fmtEuros, fmtNombre } from "@/lib/marketing/perf";
import {
  bornesPeriode, LIBELLES_PERIODE, NOM_PLATEFORME, regrouper, total, trier,
  type ColonneTri, type LigneCrea, type PeriodeCrea, type Plateforme,
} from "@/lib/marketing/creas";
import { LEAD_STATUS_LABELS } from "@/lib/leadConfig";
import { classeurXlsx } from "@/lib/classeurXlsx";
import { useDetailCrea, useMarketingCreas } from "@/hooks/useMarketingCreas";

const fmtRoas = (v: number | null) => (v === null ? "—" : `×${v.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}`);
const fmtPct = (v: number | null) => (v === null ? "—" : `${Math.round(v)} %`);
const fmtJour = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", timeZone: "Europe/Paris" }) : "—";

interface Colonne {
  cle: ColonneTri;
  entete: string;
  aide: string;
  rendu: (l: LigneCrea) => React.ReactNode;
}

const COLONNES: Colonne[] = [
  { cle: "depense", entete: "Dépense", aide: "Dépense de la pub sur la période, par jour de diffusion (Snap : jour en UTC+4).", rendu: (l) => fmtEuros(l.depense) },
  { cle: "leads", entete: "Leads", aide: "Inscriptions arrivées par cette pub sur la période.", rendu: (l) => fmtNombre(l.leads) },
  { cle: "cpl", entete: "CPL", aide: "Dépense ÷ leads.", rendu: (l) => fmtEuros(l.cpl, 2) },
  {
    cle: "inscrits", entete: "Inscrits", aide: "Leads passés par « Inscrit conférence », et part des leads.",
    rendu: (l) => (
      <span>
        {fmtNombre(l.inscrits)} <span className="text-xs text-muted-foreground">{fmtPct(l.tauxInscription)}</span>
      </span>
    ),
  },
  { cle: "rdv", entete: "RDV", aide: "Leads qui ont pris au moins un rendez-vous (non annulé).", rendu: (l) => fmtNombre(l.rdv) },
  { cle: "ventes", entete: "Ventes", aide: "Ventes de ces leads, quelle que soit la date de la vente.", rendu: (l) => fmtNombre(l.ventes) },
  { cle: "ca", entete: "CA", aide: "Chiffre d'affaires HT de ces ventes.", rendu: (l) => fmtEuros(l.ca) },
  { cle: "coutParVente", entete: "Coût / vente", aide: "Dépense ÷ ventes.", rendu: (l) => fmtEuros(l.coutParVente) },
  { cle: "roas", entete: "ROAS", aide: "CA ÷ dépense : ×3 = 3 € de CA pour 1 € de pub.", rendu: (l) => fmtRoas(l.roas) },
];

export default function VueCreas() {
  const [periode, setPeriode] = useState<PeriodeCrea>("30j");
  const [plateforme, setPlateforme] = useState<"toutes" | Plateforme>("toutes");
  const [parPub, setParPub] = useState(false);
  const [tri, setTri] = useState<{ col: ColonneTri; desc: boolean }>({ col: "ca", desc: true });
  const [ouverte, setOuverte] = useState<LigneCrea | null>(null);
  const [export_, setExport] = useState(false);

  const bornes = useMemo(() => bornesPeriode(periode), [periode]);
  const { data, isLoading, error } = useMarketingCreas(bornes.from, bornes.to);

  const lignes = useMemo(() => {
    const pubs = (data ?? []).filter((p) => plateforme === "toutes" || p.plateforme === plateforme);
    return trier(regrouper(pubs, parPub), tri.col, tri.desc);
  }, [data, plateforme, parPub, tri]);
  const tot = useMemo(() => total(lignes), [lignes]);

  const trierPar = (col: ColonneTri) =>
    setTri((t) => (t.col === col ? { col, desc: !t.desc } : { col, desc: col !== "nom" && col !== "cpl" && col !== "coutParVente" }));

  const exporter = async () => {
    setExport(true);
    try {
      const entetes = ["Créa", "Plateforme", "Pubs", "Dépense (€)", "Impressions", "Clics", "Leads", "CPL (€)", "Inscrits", "RDV", "Ventes", "CA HT (€)", "Coût par vente (€)", "ROAS"];
      const arrondi = (v: number | null, d = 2) => (v === null ? null : Math.round(v * 10 ** d) / 10 ** d);
      const corps = lignes.map((l) => [
        l.nom, NOM_PLATEFORME[l.plateforme], l.pubIds.length, arrondi(l.depense), l.impressions, l.clics, l.leads,
        arrondi(l.cpl), l.inscrits, l.rdv, l.ventes, arrondi(l.ca), arrondi(l.coutParVente), arrondi(l.roas),
      ]);
      const blob = await classeurXlsx([{
        nom: "Par créa",
        lignes: [entetes, ...corps],
        largeurs: [28, 12, 7, 12, 12, 9, 8, 10, 9, 7, 8, 12, 14, 8],
      }]);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `AlBaraka_Perf_par_crea_${bornes.from}_${bornes.to}.xlsx`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e: any) {
      toast.error(e?.message ?? "Export impossible");
    } finally {
      setExport(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="font-heading text-xl font-semibold">Performance par créa</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={periode} onValueChange={(v) => setPeriode(v as PeriodeCrea)}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(LIBELLES_PERIODE) as PeriodeCrea[]).map((p) => (
                  <SelectItem key={p} value={p}>{LIBELLES_PERIODE[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={plateforme} onValueChange={(v) => setPlateforme(v as typeof plateforme)}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="toutes">Meta et Snapchat</SelectItem>
                <SelectItem value="meta">Meta</SelectItem>
                <SelectItem value="snap">Snapchat</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 px-2">
              <Switch id="par-pub" checked={parPub} onCheckedChange={setParPub} />
              <Label htmlFor="par-pub" className="text-sm">Détailler par pub</Label>
            </div>
            <Button variant="outline" size="sm" onClick={exporter} disabled={export_ || lignes.length === 0}>
              {export_ ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Excel
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-72" />
        ) : error ? (
          <p className="text-sm text-destructive">Impossible de charger les données : {(error as any)?.message ?? "erreur inconnue"}</p>
        ) : lignes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune pub ni aucun lead payant sur cette période.</p>
        ) : (
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm min-w-[980px]">
              <thead>
                <tr className="border-b bg-muted/40 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  <EnTete col="nom" tri={tri} onTri={trierPar} aide="Nom de la pub dans le gestionnaire. Les pubs du même nom sont additionnées." align="left">
                    {parPub ? "Pub" : "Créa"}
                  </EnTete>
                  {COLONNES.map((c) => (
                    <EnTete key={c.cle} col={c.cle} tri={tri} onTri={trierPar} aide={c.aide}>{c.entete}</EnTete>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lignes.map((l) => (
                  <tr key={l.cle} className="border-b last:border-0 hover:bg-muted/30 cursor-pointer" onClick={() => setOuverte(l)}>
                    <td className="p-2.5">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-normal">{NOM_PLATEFORME[l.plateforme]}</Badge>
                        <span className="font-medium">{l.nom}</span>
                        {!parPub && l.pubIds.length > 1 && (
                          <span className="text-xs text-muted-foreground">{l.pubIds.length} pubs</span>
                        )}
                      </div>
                    </td>
                    {COLONNES.map((c) => (
                      <td key={c.cle} className="p-2.5 text-right tabular-nums">{c.rendu(l)}</td>
                    ))}
                  </tr>
                ))}
                <tr className="bg-muted/40 font-semibold">
                  <td className="p-2.5">Total</td>
                  {COLONNES.map((c) => (
                    <td key={c.cle} className="p-2.5 text-right tabular-nums">{c.rendu(tot)}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-3">
          Du {fmtJour(bornes.from + "T12:00:00Z")} au {fmtJour(bornes.to + "T12:00:00Z")}. La période s'arrête à hier : la dépense
          du jour n'arrive que le lendemain matin. La dépense compte par jour de diffusion, les leads par jour d'inscription, et les ventes sont celles de ces leads,
          quelle que soit la date de la vente : une période récente n'a donc pas encore toutes ses ventes. Meta et Snapchat
          seulement — Google ne transmet pas l'identifiant de la pub. « Pub non identifiée » : leads arrivés d'une régie sans
          l'identifiant de la pub dans le lien.
        </p>
      </CardContent>

      <DetailCrea ligne={ouverte} from={bornes.from} to={bornes.to} onClose={() => setOuverte(null)} />
    </Card>
  );
}

function EnTete({
  col, tri, onTri, aide, align = "right", children,
}: {
  col: ColonneTri;
  tri: { col: ColonneTri; desc: boolean };
  onTri: (c: ColonneTri) => void;
  aide: string;
  align?: "left" | "right";
  children: React.ReactNode;
}) {
  const actif = tri.col === col;
  return (
    <th className={`font-medium p-2.5 ${align === "left" ? "text-left" : "text-right"}`}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" onClick={() => onTri(col)} className={`inline-flex items-center gap-1 uppercase ${actif ? "text-foreground" : ""}`}>
            {children}
            {actif && (tri.desc ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)}
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs normal-case tracking-normal">{aide}</TooltipContent>
      </Tooltip>
    </th>
  );
}

function DetailCrea({ ligne, from, to, onClose }: { ligne: LigneCrea | null; from: string; to: string; onClose: () => void }) {
  const { data, isLoading, error } = useDetailCrea(ligne?.plateforme ?? null, ligne?.pubIds ?? [], from, to);
  const leads = data ?? [];

  return (
    <Dialog open={!!ligne} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{ligne?.nom} — {ligne ? NOM_PLATEFORME[ligne.plateforme] : ""}</DialogTitle>
          <DialogDescription>
            {ligne && `${fmtNombre(ligne.leads)} leads, ${fmtNombre(ligne.ventes)} vente${ligne.ventes > 1 ? "s" : ""}, ${fmtEuros(ligne.ca)} de CA pour ${fmtEuros(ligne.depense)} de dépense.`}
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <Skeleton className="h-40" />
        ) : error ? (
          <p className="text-sm text-destructive">Impossible de charger les leads : {(error as any)?.message ?? "erreur inconnue"}</p>
        ) : leads.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun lead sur la période : la pub a dépensé sans amener d'inscription.</p>
        ) : (
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="border-b bg-muted/40 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="text-left font-medium p-2">Lead</th>
                  <th className="text-left font-medium p-2">Arrivé le</th>
                  <th className="text-left font-medium p-2">Statut</th>
                  <th className="text-center font-medium p-2">Inscrit</th>
                  <th className="text-center font-medium p-2">RDV</th>
                  <th className="text-right font-medium p-2">Vente</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.lead_id} className="border-b last:border-0">
                    <td className="p-2 font-medium">{l.nom ?? "—"}</td>
                    <td className="p-2 tabular-nums">{fmtJour(l.cree_le)}</td>
                    <td className="p-2 text-muted-foreground">{LEAD_STATUS_LABELS[l.statut] ?? l.statut}</td>
                    <td className="p-2 text-center">{l.inscrit ? "✓" : ""}</td>
                    <td className="p-2 text-center">{l.rdv ? "✓" : ""}</td>
                    <td className="p-2 text-right tabular-nums">
                      {l.ventes > 0 ? <span className="font-semibold text-emerald-600">{fmtEuros(l.ca)} <span className="text-xs font-normal text-muted-foreground">le {fmtJour(l.vendu_le)}</span></span> : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
