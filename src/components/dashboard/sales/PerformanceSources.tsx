// Dashboard Sales, lot 2 (18/11/2026) : d'où viennent les ventes, et ce que
// chaque source a coûté. Vu par le CEO (onglet Sales) et par l'agence (son
// tableau de bord) : rien ici ne nomme un client ni ne montre une commission.
//
// Deux lectures :
//   • par canal, dépliable jusqu'à la créa : canal → campagne → groupe → créa ;
//   • par créa, à plat : la même vidéo, tous groupes et campagnes confondus.
// Puis le profil des acheteurs : priorité du quiz, délai avant achat, paiement.
import { Fragment, useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Download, Loader2, Megaphone, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { fmtEuros, fmtNombre } from "@/lib/marketing/perf";
import type { ConferenceFilter } from "@/lib/marketing/conferenceFilter";
import { classeurXlsx } from "@/lib/classeurXlsx";
import { cn } from "@/lib/utils";
import { useSalesSources } from "@/hooks/useSalesSources";
import { entonnoir } from "@/lib/sales/pilotage";
import {
  aplatir, arborescence, NOM_PLATEFORME, parCrea, profilDelai, profilPriorite, SEUIL_LEADS, SEUIL_VENTES,
  signaux, tendance, totalNoeuds, type Derives, type LigneProfil, type Mesures, type NoeudSource,
} from "@/lib/sales/sources";

type Ligne = Mesures & Derives;
type Vue = "canal" | "crea";
type Tri = "nom" | "depense" | "leads" | "cpl" | "inscrits" | "rdv" | "coutParRdv" | "ventes" | "caNet" | "encaisse" | "cpa" | "roas";

const pct = (v: number | null, d = 0) =>
  v === null ? "—" : `${(v * 100).toLocaleString("fr-FR", { maximumFractionDigits: d })} %`;
const fmtRoas = (v: number | null) => (v === null ? "—" : `×${v.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}`);

const TON = { bon: "text-emerald-400", mauvais: "text-red-400" } as const;

interface Colonne {
  cle: Tri;
  entete: string;
  aide: string;
  rendu: (l: Ligne, ref: Ligne) => ReactNode;
}

const COLONNES: Colonne[] = [
  { cle: "depense", entete: "Dépense", aide: "Jours de diffusion rattachés à la conférence, comme dans l'onglet Marketing. Canal et campagne : remontée par campagne ; groupe et créa : remontée par pub.", rendu: (l) => (l.depense ? fmtEuros(l.depense) : "—") },
  { cle: "leads", entete: "Leads", aide: "Leads de la conférence (ou de la période) arrivés par cette source.", rendu: (l) => fmtNombre(l.leads) },
  { cle: "cpl", entete: "CPL", aide: "Dépense ÷ leads.", rendu: (l) => fmtEuros(l.cpl, 2) },
  {
    cle: "inscrits", entete: "Inscrits", aide: "Leads passés par « Inscrit conférence », et part des leads.",
    rendu: (l) => <>{fmtNombre(l.inscrits)}<span className="block text-[10px] text-muted-foreground">{pct(l.tauxInscription)}</span></>,
  },
  {
    cle: "rdv", entete: "RDV", aide: "Leads qui ont pris un rendez-vous (non annulé) ; en petit, ceux dont le rendez-vous a eu lieu.",
    rendu: (l) => (
      <>
        {fmtNombre(l.rdv)}
        {l.rdv > 0 && <span className="block text-[10px] text-muted-foreground">{l.rdvTenus} tenu{l.rdvTenus > 1 ? "s" : ""}</span>}
      </>
    ),
  },
  {
    cle: "coutParRdv", entete: "Coût / RDV", aide: "Dépense ÷ rendez-vous pris.",
    rendu: (l, ref) => <span className={cn(TON[tendance(l.coutParRdv, ref.coutParRdv, true, l.rdv < SEUIL_VENTES) ?? "x"])}>{fmtEuros(l.coutParRdv)}</span>,
  },
  {
    cle: "ventes", entete: "Ventes", aide: "Ventes PASS rattachées à la conférence et dont le lead vient de cette source. En petit : part des leads qui ont acheté.",
    rendu: (l) => (
      <span className="font-medium text-foreground">
        {fmtNombre(l.ventes)}
        {l.perdues > 0 && <span className="block text-[10px] text-red-400">dont {l.perdues} perdue{l.perdues > 1 ? "s" : ""}</span>}
        {l.ventes > 0 && l.tauxVente !== null && <span className="block text-[10px] font-normal text-muted-foreground">{pct(l.tauxVente, 1)} des leads</span>}
      </span>
    ),
  },
  { cle: "caNet", entete: "CA net", aide: "Chiffre d'affaires HT signé, hors ventes perdues.", rendu: (l) => fmtEuros(l.caNet) },
  { cle: "encaisse", entete: "Encaissé", aide: "Échéances déjà payées sur ces ventes.", rendu: (l) => fmtEuros(l.encaisse) },
  {
    cle: "cpa", entete: "Coût / vente", aide: "Dépense ÷ ventes hors ventes perdues. Vert : 20 % moins cher que la moyenne ; rouge : 25 % plus cher (à partir de 3 ventes).",
    rendu: (l, ref) => <span className={cn("font-medium", TON[tendance(l.cpa, ref.cpa, true, l.ventes - l.perdues < SEUIL_VENTES) ?? "x"])}>{fmtEuros(l.cpa)}</span>,
  },
  {
    cle: "roas", entete: "ROAS", aide: "CA net ÷ dépense : ×3 = 3 € de CA pour 1 € de pub. Vert / rouge : par rapport à la moyenne.",
    rendu: (l, ref) => <span className={cn("font-bold", TON[tendance(l.roas, ref.roas, false, l.ventes - l.perdues < SEUIL_VENTES) ?? "x"])}>{fmtRoas(l.roas)}</span>,
  },
];

function trier(noeuds: NoeudSource[], tri: { col: Tri; desc: boolean }): NoeudSource[] {
  const s = [...noeuds].sort((a, b) => {
    if (tri.col === "nom") return tri.desc ? b.nom.localeCompare(a.nom, "fr") : a.nom.localeCompare(b.nom, "fr");
    const va = a[tri.col] as number | null;
    const vb = b[tri.col] as number | null;
    if (va === null && vb === null) return 0;
    if (va === null) return 1;
    if (vb === null) return -1;
    return tri.desc ? vb - va : va - vb;
  });
  return s.map((n) => ({ ...n, enfants: trier(n.enfants, tri) }));
}

const LIBELLE_NIVEAU: Record<NoeudSource["niveau"], string> = { canal: "Canal", campagne: "Campagne", groupe: "Groupe", crea: "Créa" };

export default function PerformanceSources({ filtre, suffixeExport }: { filtre: ConferenceFilter | null; suffixeExport: string }) {
  const { data, isLoading, isError, error } = useSalesSources(filtre);
  const [vue, setVue] = useState<Vue>("canal");
  const [tri, setTri] = useState<{ col: Tri; desc: boolean }>({ col: "ventes", desc: true });
  const [ouverts, setOuverts] = useState<Set<string>>(new Set());
  const [export_, setExport] = useState(false);

  const calc = useMemo(() => {
    if (!data) return null;
    const arbre = arborescence(data.ventes, data.entonnoir);
    const creas = parCrea(data.ventes, data.entonnoir);
    return {
      arbre,
      creas,
      total: totalNoeuds(arbre),
      totalCreas: totalNoeuds(creas),
      priorite: profilPriorite(data.ventes, data.entonnoir),
      delai: profilDelai(data.ventes),
      signaux: signaux(data.ventes),
    };
  }, [data]);

  const lignes = useMemo(() => (calc ? trier(vue === "canal" ? calc.arbre : calc.creas, tri) : []), [calc, vue, tri]);
  const reference = calc ? (vue === "canal" ? calc.total : calc.totalCreas) : null;

  const basculer = (cle: string) =>
    setOuverts((o) => {
      const n = new Set(o);
      if (n.has(cle)) n.delete(cle);
      else n.add(cle);
      return n;
    });

  const trierPar = (col: Tri) =>
    setTri((t) => (t.col === col ? { col, desc: !t.desc } : { col, desc: !["nom", "cpl", "coutParRdv", "cpa"].includes(col) }));

  const exporter = async () => {
    if (!calc) return;
    setExport(true);
    try {
      const entetes = ["Niveau", "Canal", "Campagne", "Groupe", "Créa", "Dépense (€)", "Leads", "CPL (€)", "Inscrits", "RDV", "RDV tenus",
        "Coût par RDV (€)", "Ventes", "dont perdues", "CA net HT (€)", "Encaissé (€)", "Coût par vente (€)", "ROAS", "Peu de données"];
      const r = (v: number | null) => (v === null ? null : Math.round(v * 100) / 100);
      const corps = aplatir(calc.arbre).map(({ chemin, noeud: n }) => [
        LIBELLE_NIVEAU[n.niveau], chemin[0] ?? "", chemin[1] ?? "", chemin[2] ?? "", chemin[3] ?? "",
        r(n.depense), n.leads, r(n.cpl), n.inscrits, n.rdv, n.rdvTenus, r(n.coutParRdv), n.ventes, n.perdues,
        r(n.caNet), r(n.encaisse), r(n.cpa), r(n.roas), n.faibleVolume ? "oui" : "",
      ]);
      const corpsCreas = calc.creas.map((n) => [
        n.nom, NOM_PLATEFORME[n.plateforme ?? ""] ?? "", r(n.depense), n.leads, r(n.cpl), n.inscrits, n.rdv, n.ventes, n.perdues,
        r(n.caNet), r(n.encaisse), r(n.cpa), r(n.roas), n.faibleVolume ? "oui" : "",
      ]);
      const blob = await classeurXlsx([
        { nom: "Par source", lignes: [entetes, ...corps], largeurs: [10, 16, 30, 24, 24, 11, 7, 9, 8, 6, 8, 11, 7, 8, 12, 11, 12, 7, 9] },
        {
          nom: "Par créa",
          lignes: [["Créa", "Plateforme", "Dépense (€)", "Leads", "CPL (€)", "Inscrits", "RDV", "Ventes", "dont perdues", "CA net HT (€)",
            "Encaissé (€)", "Coût par vente (€)", "ROAS", "Peu de données"], ...corpsCreas],
          largeurs: [28, 11, 11, 7, 9, 8, 6, 7, 8, 12, 11, 12, 7, 9],
        },
      ]);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `AlBaraka_Ventes_par_source_${suffixeExport}.xlsx`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e: any) {
      toast.error(e?.message ?? "Export impossible");
    } finally {
      setExport(false);
    }
  };

  const rendreLigne = (n: NoeudSource, profondeur: number): ReactNode => {
    const ouvert = ouverts.has(n.cle);
    const depliable = vue === "canal" && n.enfants.length > 0;
    return (
      <Fragment key={n.cle}>
        <tr
          className={cn("border-b last:border-0 hover:bg-muted/30", depliable && "cursor-pointer", profondeur === 0 && "font-medium")}
          onClick={depliable ? () => basculer(n.cle) : undefined}
        >
          <td className="px-2 py-2.5 align-top min-w-[260px]">
            <div className="flex items-start gap-1.5" style={{ paddingLeft: profondeur * 18 }}>
              {depliable ? (
                ouvert ? <ChevronDown className="h-3.5 w-3.5 shrink-0 mt-0.5" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              ) : (
                <span className="w-3.5 shrink-0" />
              )}
              {vue === "crea" && n.plateforme && (
                <Badge variant="outline" className="text-[10px] font-normal">{NOM_PLATEFORME[n.plateforme] ?? n.plateforme}</Badge>
              )}
              {profondeur > 0 && <span className="text-[10px] uppercase tracking-wide text-muted-foreground mt-0.5 shrink-0">{LIBELLE_NIVEAU[n.niveau]}</span>}
              <div className="min-w-0">
                <span className={cn("text-foreground", profondeur > 0 && "font-normal")}>{n.nom}</span>
                {n.faibleVolume && (n.leads > 0 || n.ventes > 0 || n.depense > 0) && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="block w-fit mt-1 whitespace-nowrap rounded border border-border px-1 text-[9px] uppercase tracking-wide text-muted-foreground">peu de données</span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">
                      Moins de {SEUIL_VENTES} ventes et moins de {SEUIL_LEADS} leads : trop peu pour conclure, les couleurs sont désactivées.
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          </td>
          {COLONNES.map((c) => (
            <td key={c.cle} className="px-2 py-2.5 text-right tabular-nums align-top whitespace-nowrap">{c.rendu(n, reference!)}</td>
          ))}
        </tr>
        {ouvert && n.enfants.map((e) => rendreLigne(e, profondeur + 1))}
      </Fragment>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-primary" /> Ventes par source
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Tabs value={vue} onValueChange={(v) => setVue(v as Vue)}>
                <TabsList className="h-8">
                  <TabsTrigger value="canal" className="text-xs">Par canal → créa</TabsTrigger>
                  <TabsTrigger value="crea" className="text-xs">Par créa</TabsTrigger>
                </TabsList>
              </Tabs>
              <Button variant="outline" size="sm" onClick={exporter} disabled={export_ || !calc}>
                {export_ ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Download className="h-4 w-4 mr-1.5" />} Excel
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {vue === "canal"
              ? "Cliquer sur une ligne pour descendre : canal, campagne, groupe, créa. Les pubs qui portent le même nom sont additionnées."
              : "La même vidéo, tous groupes et campagnes confondus (Meta et Snapchat : Google ne transmet pas la pub)."}
          </p>
        </CardHeader>
        <CardContent>
          {isLoading || !filtre ? (
            <Skeleton className="h-64" />
          ) : isError ? (
            <p className="text-sm text-destructive">Impossible de charger les données : {(error as any)?.message ?? "erreur inconnue"}</p>
          ) : lignes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Aucun lead, aucune dépense et aucune vente sur la période.</p>
          ) : (
            <>
            {calc && <Entonnoir t={calc.total} />}
            <div className="rounded-lg border overflow-x-auto">
              <table className="w-full text-sm min-w-[1150px]">
                <thead>
                  <tr className="border-b bg-muted/40 text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                    <EnTete col="nom" tri={tri} onTri={trierPar} align="left"
                      aide="Tri par défaut : les sources qui vendent le plus en haut.">
                      {vue === "canal" ? "Source" : "Créa"}
                    </EnTete>
                    {COLONNES.map((c) => (
                      <EnTete key={c.cle} col={c.cle} tri={tri} onTri={trierPar} aide={c.aide}>{c.entete}</EnTete>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lignes.map((n) => rendreLigne(n, 0))}
                  {reference && (
                    <tr className="bg-muted/40 font-semibold">
                      <td className="p-2.5">Total</td>
                      {COLONNES.map((c) => (
                        <td key={c.cle} className="px-2 py-2.5 text-right tabular-nums align-top whitespace-nowrap">{c.rendu(reference, reference)}</td>
                      ))}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            </>
          )}
          <p className="text-xs text-muted-foreground mt-3">
            Même période que le reste de l'onglet : ventes rattachées aux conférences choisies, leads de ces conférences, dépense des
            jours qui les précèdent. Une source sans dépense (Instagram, apporteurs…) n'a ni coût par vente ni ROAS. Couleurs : comparaison
            à la moyenne du tableau, seulement à partir de {SEUIL_VENTES} ventes ({SEUIL_VENTES} rendez-vous pour le coût par RDV).
          </p>
        </CardContent>
      </Card>

      {calc && calc.signaux.ventes > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-emerald-400" /> Profil des acheteurs
            </CardTitle>
            <p className="text-xs text-muted-foreground">Qui achète, au bout de combien de temps, et comment ils paient.</p>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-3">
            <TableProfil
              titre="Priorité du quiz"
              aide="Priorité A à D de la grille de scoring. Taux = ventes ÷ leads de la même priorité."
              lignes={calc.priorite}
              avecLeads
            />
            <TableProfil titre="Délai inscription → achat" aide="Temps entre l'arrivée du lead et la vente." lignes={calc.delai} />
            <div className="rounded-lg border p-3 space-y-2 text-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Paiement et signaux</p>
              <Ligne2 libelle="Payé en une fois" valeur={`${calc.signaux.comptant} vente${calc.signaux.comptant > 1 ? "s" : ""}`}
                precision={`${pct(calc.signaux.comptant / calc.signaux.ventes)} · panier ${fmtEuros(calc.signaux.panierComptant)}`} />
              <Ligne2 libelle="En plusieurs fois" valeur={`${calc.signaux.echelonne} vente${calc.signaux.echelonne > 1 ? "s" : ""}`}
                precision={`${pct(calc.signaux.echelonne / calc.signaux.ventes)} · panier ${fmtEuros(calc.signaux.panierEchelonne)}`} />
              <Ligne2 libelle="Réinscrits" valeur={fmtNombre(calc.signaux.reinscrits)}
                precision="leads qui se sont réinscrits (tag Réinscrit)" />
              <Ligne2 libelle="Signal Jeu-Ven" valeur={fmtNombre(calc.signaux.jeuVen)}
                precision="leads entrés les jours du tag Jeu-Ven, peu avant la conférence" />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Entonnoir({ t }: { t: Mesures }) {
  const etapes = entonnoir(t);
  return (
    <div className="mb-4 grid grid-cols-5 gap-1 rounded-lg border p-3">
      {etapes.map((e, i) => (
        <div key={e.cle} className="relative text-center">
          {i > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="absolute -left-3 top-1 text-[10px] text-muted-foreground tabular-nums cursor-help">
                  {e.taux === null ? "" : pct(e.taux, e.taux < 0.1 ? 1 : 0)} →
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">
                Passage depuis « {etapes[i - 1].libelle} ».
                {e.cle === "ventes" && " Les ventes de la période ne viennent pas toutes de ses leads (achats plus tardifs, ventes sans lead) : c'est un ordre de grandeur."}
              </TooltipContent>
            </Tooltip>
          )}
          <p className="font-heading text-xl text-foreground tabular-nums">{fmtNombre(e.valeur)}</p>
          <p className="text-[11px] text-muted-foreground">{e.libelle}</p>
        </div>
      ))}
    </div>
  );
}

function Ligne2({ libelle, valeur, precision }: { libelle: string; valeur: string; precision: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <div>
        <p className="text-foreground">{libelle}</p>
        <p className="text-[11px] text-muted-foreground">{precision}</p>
      </div>
      <p className="font-medium tabular-nums text-foreground">{valeur}</p>
    </div>
  );
}

function TableProfil({ titre, aide, lignes, avecLeads }: { titre: string; aide: string; lignes: LigneProfil[]; avecLeads?: boolean }) {
  const max = Math.max(1, ...lignes.map((l) => l.ventes));
  return (
    <div className="rounded-lg border p-3">
      <Tooltip>
        <TooltipTrigger className="text-xs font-medium uppercase tracking-wide text-muted-foreground cursor-help underline decoration-dotted underline-offset-4">
          {titre}
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs">{aide}</TooltipContent>
      </Tooltip>
      <div className="mt-2 space-y-2">
        {lignes.map((l) => (
          <div key={l.cle} className="text-sm">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-foreground">{l.libelle}</span>
              <span className="tabular-nums">
                <span className="font-medium text-foreground">{l.ventes}</span>
                <span className="text-[11px] text-muted-foreground">
                  {" "}vente{l.ventes > 1 ? "s" : ""}
                  {avecLeads && l.leads !== null && ` / ${fmtNombre(l.leads)} leads · ${pct(l.tauxVente, 1)}`}
                  {!avecLeads && ` · ${pct(l.part)}`}
                </span>
              </span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary/70" style={{ width: `${(l.ventes / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EnTete({
  col, tri, onTri, aide, align = "right", children,
}: {
  col: Tri;
  tri: { col: Tri; desc: boolean };
  onTri: (c: Tri) => void;
  aide: string;
  align?: "left" | "right";
  children: ReactNode;
}) {
  const actif = tri.col === col;
  return (
    <th className={cn("font-medium px-2 py-2.5 whitespace-nowrap", align === "left" ? "text-left" : "text-right")}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" onClick={() => onTri(col)} className={cn("inline-flex items-center gap-1 uppercase", actif && "text-foreground")}>
            {children}
            {actif && (tri.desc ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)}
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs normal-case tracking-normal text-xs">{aide}</TooltipContent>
      </Tooltip>
    </th>
  );
}
