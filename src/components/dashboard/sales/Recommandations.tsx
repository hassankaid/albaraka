// Dashboard Sales, lot 3 (18/11/2026) : créas à couper, à pousser, à surveiller.
// Fenêtre glissante des N dernières conférences, seuils réglés par le CEO.
// Vu aussi par l'agence (lecture seule) : c'est elle qui pilote les pubs.
import { useMemo, useState } from "react";
import { ChevronDown, Lightbulb, Loader2, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fmtEuros } from "@/lib/marketing/perf";
import { currentOrPrevSunday, formatConferenceLabelShort } from "@/lib/marketing/conferenceFilter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useSalesSources } from "@/hooks/useSalesSources";
import { useEnregistrerReglages, useReglagesPilotage } from "@/hooks/useSalesPilotage";
import { NOM_PLATEFORME, parCrea, totalNoeuds } from "@/lib/sales/sources";
import {
  cibleEffective, fenetre, LIBELLE_VERDICT, recommander, REGLAGES_DEFAUT,
  type Recommandation, type Reglages, type Verdict,
} from "@/lib/sales/pilotage";

const STYLE: Record<Verdict, { bord: string; texte: string }> = {
  couper: { bord: "border-red-500/40", texte: "text-red-400" },
  pousser: { bord: "border-emerald-500/40", texte: "text-emerald-400" },
  surveiller: { bord: "border-orange-500/40", texte: "text-orange-400" },
  attendre: { bord: "border-border", texte: "text-muted-foreground" },
  garder: { bord: "border-border", texte: "text-foreground" },
};

const fmtRoas = (v: number | null) => (v === null ? "—" : `×${v.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}`);

export default function Recommandations() {
  const { profile } = useAuth();
  const estCeo = profile?.role === "ceo";
  const { data: reglagesLus, isLoading: chargeReglages } = useReglagesPilotage();
  const reglages = reglagesLus ?? REGLAGES_DEFAUT;
  const derniere = useMemo(() => currentOrPrevSunday(new Date()), []);
  const f = fenetre(derniere, reglages.fenetre_conferences);
  const { data, isLoading, isError, error } = useSalesSources(chargeReglages ? null : { mode: "range", from: f.from, to: f.to });
  const { data: derniereData } = useSalesSources({ mode: "single", date: derniere });
  const [reglagesOuverts, setReglagesOuverts] = useState(false);

  const calc = useMemo(() => {
    if (!data) return null;
    const creas = parCrea(data.ventes, data.entonnoir);
    const actives = new Set(
      derniereData ? parCrea(derniereData.ventes, derniereData.entonnoir).filter((c) => c.depense > 0).map((c) => c.cle) : [],
    );
    const reference = totalNoeuds(creas);
    const recos = recommander(creas, actives, reglages, reference);
    const par = (v: Verdict) => recos.filter((r) => r.verdict === v);
    return { cible: cibleEffective(reglages, reference), recos, par, suivi: !!derniereData };
  }, [data, derniereData, reglages]);

  return (
    <Card>
      <CardHeader className="pb-2 space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" /> Recommandations par créa
          </CardTitle>
          {estCeo && (
            <Button variant="outline" size="sm" onClick={() => setReglagesOuverts(true)}>
              <Settings2 className="h-4 w-4 mr-1.5" /> Seuils
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Sur les {reglages.fenetre_conferences} dernières conférences ({formatConferenceLabelShort(f.from)} → {formatConferenceLabelShort(f.to)}),
          quelle que soit la période choisie plus haut. Cible : {calc?.cible ? fmtEuros(calc.cible) : "—"} par vente
          {reglages.cpa_cible ? " (fixée)" : " (moyenne de la fenêtre, aucune cible fixée)"}. La dernière conférence n'a pas encore toutes ses ventes.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading || chargeReglages ? (
          <Skeleton className="h-40" />
        ) : isError ? (
          <p className="text-sm text-destructive">Impossible de charger les données : {(error as any)?.message ?? "erreur inconnue"}</p>
        ) : !calc || calc.recos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Aucune créa avec de la dépense sur la fenêtre.</p>
        ) : (
          <>
            <div className="grid gap-3 lg:grid-cols-3">
              {(["couper", "pousser", "surveiller"] as Verdict[]).map((v) => (
                <Groupe key={v} verdict={v} recos={calc.par(v)} />
              ))}
            </div>
            <Collapsible>
              <CollapsibleTrigger className="group flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
                {calc.par("garder").length} à garder · {calc.par("attendre").length} trop tôt pour juger
              </CollapsibleTrigger>
              <CollapsibleContent className="grid gap-3 lg:grid-cols-2 mt-3">
                <Groupe verdict="garder" recos={calc.par("garder")} />
                <Groupe verdict="attendre" recos={calc.par("attendre")} />
              </CollapsibleContent>
            </Collapsible>
          </>
        )}
      </CardContent>
      {estCeo && reglagesOuverts && (
        <DialogueSeuils ouvert={reglagesOuverts} onClose={() => setReglagesOuverts(false)} reglages={reglages} />
      )}
    </Card>
  );
}

function Groupe({ verdict, recos }: { verdict: Verdict; recos: Recommandation[] }) {
  const s = STYLE[verdict];
  return (
    <div className={cn("rounded-lg border p-3", s.bord)}>
      <p className={cn("text-sm font-medium mb-2", s.texte)}>
        {LIBELLE_VERDICT[verdict]} <span className="text-muted-foreground font-normal">({recos.length})</span>
      </p>
      {recos.length === 0 ? (
        <p className="text-xs text-muted-foreground">Aucune.</p>
      ) : (
        <div className="space-y-2.5">
          {recos.map((r) => (
            <div key={r.noeud.cle} className="text-sm">
              <div className="flex flex-wrap items-center gap-1.5">
                {r.noeud.plateforme && (
                  <Badge variant="outline" className="text-[10px] font-normal">{NOM_PLATEFORME[r.noeud.plateforme] ?? r.noeud.plateforme}</Badge>
                )}
                <span className="font-medium text-foreground">{r.noeud.nom}</span>
                {!r.active && <span className="text-[10px] uppercase tracking-wide text-muted-foreground">sans dépense la dernière semaine</span>}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {fmtEuros(r.noeud.depense)} · {r.noeud.leads} leads · {r.noeud.rdv} RDV · {r.noeud.ventes} vente{r.noeud.ventes > 1 ? "s" : ""}
                {r.noeud.perdues > 0 && ` (dont ${r.noeud.perdues} perdue${r.noeud.perdues > 1 ? "s" : ""})`} · ROAS {fmtRoas(r.noeud.roas)}
              </p>
              <p className="text-xs mt-0.5">{r.raison}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DialogueSeuils({ ouvert, onClose, reglages }: { ouvert: boolean; onClose: () => void; reglages: Reglages }) {
  const enregistrer = useEnregistrerReglages();
  // Monté à chaque ouverture : repart des seuils enregistrés.
  const [v, setV] = useState<Record<keyof Reglages, string>>(() => versTexte(reglages));

  const lire = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));
  const valider = async () => {
    const r: Reglages = {
      cpa_cible: lire(v.cpa_cible),
      couper_multiple: lire(v.couper_multiple) ?? REGLAGES_DEFAUT.couper_multiple,
      pousser_ratio: (lire(v.pousser_ratio) ?? REGLAGES_DEFAUT.pousser_ratio * 100) / 100,
      ventes_min: Math.round(lire(v.ventes_min) ?? REGLAGES_DEFAUT.ventes_min),
      fenetre_conferences: Math.round(lire(v.fenetre_conferences) ?? REGLAGES_DEFAUT.fenetre_conferences),
    };
    const invalide = [r.cpa_cible ?? 1, r.couper_multiple, r.pousser_ratio, r.ventes_min, r.fenetre_conferences].some((x) => !Number.isFinite(x))
      || (r.cpa_cible !== null && r.cpa_cible <= 0) || r.couper_multiple < 1 || r.pousser_ratio <= 0 || r.pousser_ratio > 1
      || r.ventes_min < 1 || r.fenetre_conferences < 1 || r.fenetre_conferences > 12;
    if (invalide) {
      toast.error("Valeurs invalides : vérifier les bornes indiquées.");
      return;
    }
    try {
      await enregistrer.mutateAsync(r);
      toast.success("Seuils enregistrés");
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Enregistrement impossible");
    }
  };

  const champ = (cle: keyof Reglages, libelle: string, aide: string, suffixe: string) => (
    <div className="space-y-1">
      <Label htmlFor={`seuil-${cle}`}>{libelle}</Label>
      <div className="flex items-center gap-2">
        <Input id={`seuil-${cle}`} inputMode="decimal" value={v[cle]} onChange={(e) => setV({ ...v, [cle]: e.target.value })} className="w-28" />
        <span className="text-sm text-muted-foreground">{suffixe}</span>
      </div>
      <p className="text-[11px] text-muted-foreground">{aide}</p>
    </div>
  );

  return (
    <Dialog open={ouvert} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Seuils des recommandations</DialogTitle>
          <DialogDescription>Ils s'appliquent aussi à l'écran de l'agence.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {champ("cpa_cible", "Coût par vente visé", "Vide : le coût par vente moyen de la fenêtre sert de cible.", "€")}
          {champ("couper_multiple", "À couper au-delà de", "Dépense sans vente, ou coût par vente, au-delà de ce multiple de la cible (1 ou plus).", "× la cible")}
          {champ("pousser_ratio", "À pousser en dessous de", "Coût par vente sous ce pourcentage de la cible (1 à 100)…", "% de la cible")}
          {champ("ventes_min", "… avec au moins", "Nombre de ventes minimum pour conseiller de pousser.", "ventes")}
          {champ("fenetre_conferences", "Fenêtre", "Nombre de conférences regardées, la dernière comprise (1 à 12).", "conférences")}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={valider} disabled={enregistrer.isPending}>
            {enregistrer.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />} Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function versTexte(r: Reglages): Record<keyof Reglages, string> {
  return {
    cpa_cible: r.cpa_cible === null ? "" : String(r.cpa_cible),
    couper_multiple: String(r.couper_multiple),
    pousser_ratio: String(Math.round(r.pousser_ratio * 100)),
    ventes_min: String(r.ventes_min),
    fenetre_conferences: String(r.fenetre_conferences),
  };
}
