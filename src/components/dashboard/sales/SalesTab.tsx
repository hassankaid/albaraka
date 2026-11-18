// Onglet « Sales » du dashboard CEO, lot 1 (18/11/2026).
//
// Tout part des ventes réellement saisies (bons de commande PASS) et des
// commissions saisies sur chaque vente : c'est ce qui dit qui a closé et qui a
// setté. Les calls servent au taux de closing, l'activité d'appel des setters
// vient du même calcul que l'onglet Équipe.
//
// Lot 2 (à venir) : performance par canal, campagne et créa, entonnoir, profil
// des acheteurs, ouverts aussi à l'agence.
import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Download, Loader2, Target, Trophy, Users, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import ConferenceFilter from "@/components/dashboard/marketing/ConferenceFilter";
import { dimanchePlus, formatConferenceLabelShort, type ConferenceFilter as Filtre } from "@/lib/marketing/conferenceFilter";
import { fmtEuros, fmtNombre } from "@/lib/marketing/perf";
import { classeurXlsx } from "@/lib/classeurXlsx";
import { cn } from "@/lib/utils";
import { useSalesDashboard } from "@/hooks/useSalesDashboard";
import {
  aCorriger, classementClosers, classementParRole, classementSetters, estPerdue, evolution,
  LIBELLES_STATUT_VENTE, nomsDe, synthese, taux,
  type LigneClassement, type VenteDashboard,
} from "@/lib/sales/dashboard";

const COULEUR_STATUT: Record<string, string> = {
  in_progress: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  paid: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  late: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  lost: "bg-red-500/15 text-red-300 border-red-500/30",
};

const jour = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "Europe/Paris" }) : "—";

function Entete({ titre, aide, className }: { titre: string; aide?: string; className?: string }) {
  if (!aide) return <TableHead className={className}>{titre}</TableHead>;
  return (
    <TableHead className={className}>
      <Tooltip>
        <TooltipTrigger className="cursor-help underline decoration-dotted underline-offset-4">{titre}</TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs">{aide}</TooltipContent>
      </Tooltip>
    </TableHead>
  );
}

function Kpi({ libelle, valeur, precision, ton = "neutre" }: {
  libelle: string; valeur: string; precision?: ReactNode; ton?: "neutre" | "or" | "bon" | "mauvais";
}) {
  return (
    <Card className={cn(ton === "mauvais" && "border-red-500/40 bg-red-500/[0.04]")}>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{libelle}</p>
        <p className={cn(
          "font-heading text-2xl mt-1",
          ton === "or" && "text-primary",
          ton === "bon" && "text-emerald-400",
          ton === "mauvais" && "text-red-400",
          ton === "neutre" && "text-foreground",
        )}>{valeur}</p>
        {precision && <p className="text-[11px] text-muted-foreground mt-1">{precision}</p>}
      </CardContent>
    </Card>
  );
}

function Commission({ l }: { l: LigneClassement }) {
  return (
    <TableCell className="text-right">
      {fmtEuros(l.commissions)}
      {l.commissions > 0 && (
        <span className="block text-[10px] text-muted-foreground">dont {fmtEuros(l.commissionsVersees)} versés</span>
      )}
    </TableCell>
  );
}

export default function SalesTab() {
  const [filtre, setFiltre] = useState<Filtre | null>(null);
  const { data, isLoading, isError, error } = useSalesDashboard(filtre);
  const precedente = filtre?.mode === "single" ? ({ mode: "single", date: dimanchePlus(filtre.date, -1) } as Filtre) : null;
  const { data: avant } = useSalesDashboard(precedente);

  const calc = useMemo(() => {
    if (!data) return null;
    return {
      s: synthese(data.ventes),
      closers: classementClosers(data.ventes, data.calls),
      setters: classementSetters(data.ventes, data.setters),
      apporteurs: classementParRole(data.ventes, "apporteur"),
      corriger: aCorriger(data.ventes, data.calls),
      perdues: data.ventes.filter(estPerdue),
    };
  }, [data]);
  const sAvant = useMemo(() => (avant ? synthese(avant.ventes) : null), [avant]);

  const exporter = async () => {
    if (!data) return;
    try {
      const entetes = [
        "Vendu le", "Conférence", "Client", "E-mail", "Téléphone", "Montant HT (€)", "Statut", "Échéances",
        "Encaissé (€)", "Reste à encaisser (€)", "Dont en retard (€)", "Closer", "Commission closer (€)",
        "Setter", "Commission setter (€)", "Apporteur", "Agence (€)", "Canal", "Tunnel", "Plateforme", "Campagne",
        "Groupe", "Créa / pub", "Priorité lead", "Inscrit le", "Délai inscription → achat (j)",
      ];
      const commission = (v: VenteDashboard, role: string) =>
        v.intervenants.filter((i) => i.role === role).reduce((a, i) => a + (i.montant ?? 0), 0) || null;
      const lignes = data.ventes.map((v) => [
        jour(v.vendu_le), v.conference_date, v.client, v.email, v.telephone, v.montant_ht,
        LIBELLES_STATUT_VENTE[v.statut_paiement] ?? v.statut_paiement, v.nb_echeances, v.encaisse,
        v.reste_a_encaisser, v.en_retard || null, nomsDe(v, "closer"), commission(v, "closer"),
        nomsDe(v, "setter"), commission(v, "setter"), nomsDe(v, "apporteur"), commission(v, "agence_marketing"),
        v.canal_libelle ?? v.canal, v.tunnel, v.pub_plateforme, v.campagne_nom, v.groupe_nom, v.pub_nom,
        v.quiz_priorite, jour(v.lead_cree_le),
        v.lead_cree_le ? Math.round((new Date(v.vendu_le).getTime() - new Date(v.lead_cree_le).getTime()) / 864e5) : null,
      ]);
      const blob = await classeurXlsx([{
        nom: "Ventes",
        lignes: [entetes, ...lignes],
        largeurs: [10, 11, 24, 28, 15, 10, 10, 9, 10, 10, 10, 18, 10, 18, 10, 16, 9, 16, 14, 9, 30, 24, 16, 8, 10, 10],
      }]);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      const suffixe = filtre?.mode === "single" ? filtre.date : filtre?.mode === "range" ? `${filtre.from}_${filtre.to}` : "tout";
      a.download = `AlBaraka_Ventes_${suffixe}.xlsx`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e: any) {
      toast.error(e?.message ?? "Export impossible");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <ConferenceFilter value={filtre ?? { mode: "all" }} onChange={setFiltre} />
        <Button variant="outline" size="sm" onClick={exporter} disabled={!data?.ventes.length}>
          <Download className="h-4 w-4 mr-1.5" /> Exporter les ventes
        </Button>
      </div>

      {(isLoading || !filtre) && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {isError && (
        <Card className="border-destructive/40">
          <CardContent className="p-6 text-sm text-destructive">
            Erreur de chargement : {(error as any)?.message ?? "inconnue"}
          </CardContent>
        </Card>
      )}

      {data && calc && (
        <>
          {/* ─── Synthèse ───────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi libelle="Ventes PASS" valeur={fmtNombre(calc.s.ventes)} ton="or"
              precision={evolution(calc.s.ventes, sAvant?.ventes) ?? "bons de commande saisis"} />
            <Kpi libelle="Chiffre d'affaires HT signé" valeur={fmtEuros(calc.s.caSigne)}
              precision={evolution(calc.s.caSigne, sAvant?.caSigne) ?? (calc.s.perdues ? `${fmtEuros(calc.s.caNet)} hors ventes perdues` : undefined)} />
            <Kpi libelle="Encaissé à ce jour" valeur={fmtEuros(calc.s.encaisse)} ton="bon"
              precision={calc.s.caSigne ? `${taux(calc.s.encaisse / calc.s.caSigne)} du signé` : undefined} />
            <Kpi libelle="Reste à encaisser" valeur={fmtEuros(calc.s.resteAEncaisser)}
              ton={calc.s.enRetard > 0 ? "mauvais" : "neutre"}
              precision={calc.s.enRetard > 0 ? `dont ${fmtEuros(calc.s.enRetard)} en retard` : "aucune échéance en retard"} />
            <Kpi libelle="Ventes perdues" valeur={fmtNombre(calc.s.perdues)} ton={calc.s.perdues ? "mauvais" : "neutre"}
              precision={calc.s.perdues ? `${fmtEuros(calc.s.caPerdu)} signés, comptés dans les ventes` : "aucune"} />
            <Kpi libelle="Panier moyen" valeur={fmtEuros(calc.s.panierMoyen)}
              precision={calc.s.partComptant !== null ? `${taux(calc.s.partComptant)} payées en une fois` : undefined} />
            <Kpi libelle="Délai inscription → achat"
              valeur={calc.s.delaiMedianJours === null ? "—" : `${Math.round(calc.s.delaiMedianJours * 10) / 10} j`}
              precision="médiane, depuis l'inscription du lead" />
            <Kpi libelle="Commissions" valeur={fmtEuros(calc.s.commissions)}
              precision={`dont ${fmtEuros(calc.s.commissionsVersees)} versés · closers, setters, agence`} />
          </div>

          {/* ─── Ventes perdues ─────────────────────────────────── */}
          {calc.perdues.length > 0 && (
            <Card className="border-red-500/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-400" /> Ventes perdues
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {calc.perdues.map((v) => (
                  <div key={v.vente_id} className="flex flex-wrap items-center gap-x-3 text-sm">
                    <span className="font-medium text-foreground">{v.client}</span>
                    <span className="text-muted-foreground">vendue le {jour(v.vendu_le)}</span>
                    <span>{fmtEuros(v.montant_ht)} signés, {fmtEuros(v.encaisse)} encaissés</span>
                    <span className="text-muted-foreground">closer : {nomsDe(v, "closer") || "—"}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* ─── Closers ────────────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="h-4 w-4 text-emerald-400" /> Closers
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Ventes d'après les commissions de closer saisies ; calls d'après Calendly.
              </p>
            </CardHeader>
            <CardContent>
              {calc.closers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Aucun call ni aucune vente sur la période.</p>
              ) : (
                <div className="rounded-lg border border-border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Closer</TableHead>
                        <Entete className="text-right" titre="Calls" aide="Rendez-vous pris, hors annulés." />
                        <Entete className="text-right" titre="Tenus" aide="Calls qui ont eu lieu : closé, non closé, follow-up, disqualifié, renvoyé." />
                        <Entete className="text-right" titre="No-show" aide="Nombre de no-show (et part parmi les calls passés)." />
                        <Entete className="text-right" titre="À renseigner" aide="Calls passés encore « planifié » : le résultat n'a pas été saisi. Le taux de closing est surestimé tant qu'il en reste." />
                        <Entete className="text-right" titre="Ventes" />
                        <Entete className="text-right" titre="Closing" aide="Ventes divisées par calls tenus." />
                        <TableHead className="text-right">CA signé</TableHead>
                        <TableHead className="text-right">Encaissé</TableHead>
                        <TableHead className="text-right">Panier</TableHead>
                        <TableHead className="text-right">Commissions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {calc.closers.map((l) => (
                        <TableRow key={l.cle}>
                          <TableCell className="font-medium text-foreground">{l.nom}</TableCell>
                          <TableCell className="text-right">{fmtNombre(l.callsPris)}</TableCell>
                          <TableCell className="text-right">{fmtNombre(l.tenus)}</TableCell>
                          <TableCell className="text-right">
                            {fmtNombre(l.noShow)}
                            {l.tauxNoShow !== null && <span className="block text-[10px] text-muted-foreground">{taux(l.tauxNoShow)}</span>}
                          </TableCell>
                          <TableCell className={cn("text-right", l.aRenseigner > 0 && "text-orange-400 font-medium")}>
                            {fmtNombre(l.aRenseigner)}
                          </TableCell>
                          <TableCell className="text-right font-medium text-foreground">
                            {fmtNombre(l.ventes)}
                            {l.perdues > 0 && <span className="block text-[10px] text-red-400">dont {l.perdues} perdue{l.perdues > 1 ? "s" : ""}</span>}
                          </TableCell>
                          <TableCell className="text-right font-bold text-primary">{taux(l.tauxClosing)}</TableCell>
                          <TableCell className="text-right">{fmtEuros(l.caSigne)}</TableCell>
                          <TableCell className="text-right">{fmtEuros(l.encaisse)}</TableCell>
                          <TableCell className="text-right">{fmtEuros(l.panierMoyen)}</TableCell>
                          <Commission l={l} />
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ─── Setters ────────────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-400" /> Setters
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Ventes d'après les commissions de setter saisies ; leads appelés et inscrits : même calcul que l'onglet Équipe.
              </p>
            </CardHeader>
            <CardContent>
              {calc.setters.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Aucune activité de setting sur la période.</p>
              ) : (
                <div className="rounded-lg border border-border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Setter</TableHead>
                        <Entete className="text-right" titre="Appelés" aide="Leads passés d'un statut d'appel à un résultat, ou relance notée." />
                        <Entete className="text-right" titre="Inscrits" aide="Leads appelés passés en Inscrit conférence ou Call booké." />
                        <Entete className="text-right" titre="Calls" aide="Inscrits qui ont ensuite pris un rendez-vous." />
                        <TableHead className="text-right">Ventes</TableHead>
                        <Entete className="text-right" titre="Appelé → vente" aide="Ventes divisées par leads appelés." />
                        <TableHead className="text-right">CA signé</TableHead>
                        <TableHead className="text-right">Encaissé</TableHead>
                        <TableHead className="text-right">Commissions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {calc.setters.map((l) => (
                        <TableRow key={l.cle}>
                          <TableCell className="font-medium text-foreground">{l.nom}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{fmtNombre(l.appeles)}</TableCell>
                          <TableCell className="text-right">
                            {fmtNombre(l.inscrits)}
                            {l.tauxInscription !== null && <span className="block text-[10px] text-muted-foreground">{taux(l.tauxInscription)}</span>}
                          </TableCell>
                          <TableCell className="text-right">{fmtNombre(l.calls)}</TableCell>
                          <TableCell className="text-right font-medium text-foreground">
                            {fmtNombre(l.ventes)}
                            {l.perdues > 0 && <span className="block text-[10px] text-red-400">dont {l.perdues} perdue{l.perdues > 1 ? "s" : ""}</span>}
                          </TableCell>
                          <TableCell className="text-right font-bold text-primary">
                            {l.tauxVente === null ? "—" : `${(l.tauxVente * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`}
                          </TableCell>
                          <TableCell className="text-right">{fmtEuros(l.caSigne)}</TableCell>
                          <TableCell className="text-right">{fmtEuros(l.encaisse)}</TableCell>
                          <Commission l={l} />
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {calc.apporteurs.length > 0 && (
                <p className="text-xs text-muted-foreground mt-3">
                  Apporteurs : {calc.apporteurs.map((a) => `${a.nom} (${a.ventes} vente${a.ventes > 1 ? "s" : ""}, ${fmtEuros(a.commissions)})`).join(" · ")}
                </p>
              )}
            </CardContent>
          </Card>

          {/* ─── À corriger ─────────────────────────────────────── */}
          <BlocACorriger c={calc.corriger} />

          {/* ─── Liste des ventes ───────────────────────────────── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> Ventes ({data.ventes.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.ventes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Aucune vente rattachée à cette période.</p>
              ) : (
                <div className="rounded-lg border border-border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Client</TableHead>
                        <TableHead>Vendu le</TableHead>
                        <TableHead>Conf.</TableHead>
                        <TableHead>Closer</TableHead>
                        <TableHead>Setter</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead className="text-right">Montant</TableHead>
                        <TableHead className="text-right">Encaissé</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.ventes.map((v) => (
                        <TableRow key={v.vente_id} className={cn(estPerdue(v) && "bg-red-500/[0.05]")}>
                          <TableCell className="font-medium text-foreground">{v.client ?? "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{jour(v.vendu_le)}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {v.conference_date ? formatConferenceLabelShort(v.conference_date) : "—"}
                          </TableCell>
                          <TableCell>{nomsDe(v, "closer") || <span className="text-orange-400">—</span>}</TableCell>
                          <TableCell>{nomsDe(v, "setter") || nomsDe(v, "apporteur") || <span className="text-muted-foreground">—</span>}</TableCell>
                          <TableCell className="text-xs">
                            {v.canal_libelle ?? v.canal ?? "—"}
                            {v.pub_nom && <span className="block text-muted-foreground">{v.pub_nom}</span>}
                          </TableCell>
                          <TableCell className="text-right">
                            {fmtEuros(v.montant_ht)}
                            <span className="block text-[10px] text-muted-foreground">
                              {v.nb_echeances <= 1 ? "comptant" : `${v.nb_echeances} échéances`}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">{fmtEuros(v.encaisse)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn("text-[10px]", COULEUR_STATUT[v.statut_paiement])}>
                              {LIBELLES_STATUT_VENTE[v.statut_paiement] ?? v.statut_paiement}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-3">
                PASS uniquement (les coachings individuels et l'abonnement Studio n'y sont pas). Une vente compte pour la
                conférence à travers laquelle la personne a pris rendez-vous.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function BlocACorriger({ c }: { c: ReturnType<typeof aCorriger> }) {
  const total = c.ventesSansSetter.length + c.ventesSansCloser.length + c.ventesSansSource.length + c.callsARenseigner.length;
  if (total === 0) return null;
  const parCloser = new Map<string, number>();
  for (const k of c.callsARenseigner) parCloser.set(k.closer ?? "Sans closer", (parCloser.get(k.closer ?? "Sans closer") ?? 0) + 1);

  const Ligne = ({ titre, n, aide, lien, children }: { titre: string; n: number; aide: string; lien: string; children: ReactNode }) =>
    n === 0 ? null : (
      <Collapsible className="rounded-md border border-border/60 px-3 py-2">
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 text-left text-sm">
          <span><span className="font-medium text-foreground">{n}</span> {titre}</span>
          <span className="text-xs text-muted-foreground">voir</span>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-1 text-xs text-muted-foreground">
          <p>{aide} <Link to={lien} className="text-primary underline">Ouvrir la page</Link></p>
          {children}
        </CollapsibleContent>
      </Collapsible>
    );

  return (
    <Card className="border-orange-500/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-orange-400" /> À corriger pour des chiffres justes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Ligne titre="vente(s) sans setter" n={c.ventesSansSetter.length} lien="/sales"
          aide="Aucune commission de setter saisie. Si un setter a inscrit la personne, ajoute-la dans « Gérer les commissions » de la vente.">
          {c.ventesSansSetter.map((v) => <p key={v.vente_id}>{v.client} · {jour(v.vendu_le)} · closer : {nomsDe(v, "closer") || "—"}</p>)}
        </Ligne>
        <Ligne titre="vente(s) sans closer" n={c.ventesSansCloser.length} lien="/sales"
          aide="Aucune commission de closer saisie sur la vente.">
          {c.ventesSansCloser.map((v) => <p key={v.vente_id}>{v.client} · {jour(v.vendu_le)}</p>)}
        </Ligne>
        <Ligne titre="vente(s) sans source connue" n={c.ventesSansSource.length} lien="/leads"
          aide="On ne sait pas d'où vient l'acheteur (pas de lead, ou lead sans source) : la vente ne compte pour aucun canal ni aucune créa.">
          {c.ventesSansSource.map((v) => <p key={v.vente_id}>{v.client} · {jour(v.vendu_le)} · {v.canal_libelle ?? "aucun lead"}</p>)}
        </Ligne>
        <Ligne titre="call(s) passé(s) sans résultat" n={c.callsARenseigner.length} lien="/calls"
          aide={`Encore « planifié » après la date : ${[...parCloser].map(([nom, n]) => `${nom} ${n}`).join(", ")}. À passer en closé, non closé, no-show, follow-up ou disqualifié.`}>
          {c.callsARenseigner.slice(0, 40).map((k) => <p key={k.call_id}>{k.client ?? "—"} · {jour(k.prevu_le)} · {k.closer ?? "sans closer"}</p>)}
        </Ligne>
      </CardContent>
    </Card>
  );
}
