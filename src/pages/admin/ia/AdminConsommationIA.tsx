// « Consommation IA » (CEO) : ce que coûte l'IA de la plateforme, par fonctionnalité
// et par personne, sur une période. Source : le journal ia_consommations (chaque appel
// à OpenRouter), lu par les RPC ia_tableau et ia_detail_utilisateur, réservées au CEO.
import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertTriangle, ArrowDown, ArrowUp, Download, ExternalLink, Loader2, RefreshCw, Search, Sparkles,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  bornes, coutParVideo, fonctionnalite, joursDe, PERIODES, pourcent, recenser, usd, versCSV,
  type LigneFonctionnalite, type Periode,
} from "@/lib/ia/consommation";

// RPC absentes des types générés (migrations 20261019220000 et suivantes)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const OR = "#C9A04E";
const GRIS = "#7C8597";
const RECHARGER = "https://openrouter.ai/settings/credits";
/** Avant, seul le Studio était mesuré. */
const SUIVI_COMPLET = new Date("2026-10-19T00:00:00+02:00");

interface Personne {
  user_id: string;
  nom: string;
  email: string | null;
  role: string | null;
  pass: string | null;
  cout: number;
  cout_studio: number;
  cout_autres: number;
  appels: number;
  videos: number;
  dernier: string | null;
}

interface Tableau {
  credit: { reste: number; mesure_le: string } | null;
  seuil: number | null;
  totaux: { cout: number; appels: number; utilisateurs: number; videos: number; cout_studio: number };
  par_jour: { jour: string; cout: number; studio: number; appels: number }[];
  par_fonctionnalite: LigneFonctionnalite[];
  par_utilisateur: Personne[];
}

interface Detail {
  par_fonctionnalite: { fonctionnalite: string; appels: number; cout: number; dernier: string }[];
  derniers: {
    cree_le: string; fonctionnalite: string; modele: string | null; tokens_entree: number | null;
    tokens_sortie: number | null; cout: number; statut: string; reference: string | null;
  }[];
}

type CleTri = "nom" | "videos" | "cout_studio" | "cout_autres" | "cout" | "dernier";

const ROLES: Record<string, string> = { ceo: "Admin", collaborateur: "Équipe", apporteur: "Élève", agence: "Agence" };

const ilYa = (d: string | null) => (d ? formatDistanceToNow(new Date(d), { addSuffix: true, locale: fr }) : "—");

export default function AdminConsommationIA() {
  const { profile } = useAuth();
  const [periode, setPeriode] = useState<Periode>("30j");
  const [recherche, setRecherche] = useState("");
  const [tri, setTri] = useState<{ cle: CleTri; desc: boolean }>({ cle: "cout", desc: true });
  const [ouverte, setOuverte] = useState<Personne | null>(null);

  const { debut, fin } = useMemo(() => bornes(periode), [periode]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["ia-tableau", periode],
    enabled: profile?.role === "ceo",
    queryFn: async (): Promise<Tableau | null> => {
      const { data, error } = await db.rpc("ia_tableau", { p_debut: debut.toISOString(), p_fin: fin.toISOString() });
      if (error) throw error;
      return data as Tableau | null;
    },
  });

  const fonctions = useMemo(() => recenser(data?.par_fonctionnalite ?? []), [data]);

  const jours = useMemo(() => {
    const parJour = new Map((data?.par_jour ?? []).map((j) => [j.jour, j]));
    // « Depuis le début » : on part du premier jour où il y a eu une dépense
    const premier = periode === "tout" && data?.par_jour?.length ? new Date(`${data.par_jour[0].jour}T12:00:00`) : debut;
    return joursDe(premier, fin).map((jour) => {
      const j = parJour.get(jour);
      const studio = Number(j?.studio ?? 0);
      return {
        jour,
        label: new Date(`${jour}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
        studio,
        autres: Math.max(0, Number(j?.cout ?? 0) - studio),
        appels: j?.appels ?? 0,
      };
    });
  }, [data, debut, fin, periode]);

  const personnes = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    const liste = (data?.par_utilisateur ?? []).filter(
      (p) => !q || `${p.nom} ${p.email ?? ""}`.toLowerCase().includes(q),
    );
    const signe = tri.desc ? -1 : 1;
    return [...liste].sort((a, b) => {
      if (tri.cle === "nom") return signe * a.nom.localeCompare(b.nom, "fr");
      if (tri.cle === "dernier") return signe * (a.dernier ?? "").localeCompare(b.dernier ?? "");
      return signe * (Number(a[tri.cle]) - Number(b[tri.cle]));
    });
  }, [data, recherche, tri]);

  if (profile && profile.role !== "ceo") return <Navigate to="/dashboard" replace />;

  const t = data?.totaux;
  const total = Number(t?.cout ?? 0);
  const studio = Number(t?.cout_studio ?? 0);
  const parVideo = coutParVideo(data?.par_fonctionnalite ?? [], Number(t?.videos ?? 0));
  const reste = data?.credit?.reste ?? null;
  const seuil = Number(data?.seuil ?? 10);
  const etatCredit = reste === null ? "inconnu" : reste <= 0 ? "epuise" : reste < seuil ? "bas" : "ok";

  const exporter = () => {
    const lignes = [
      ["Nom", "Email", "Rôle", "Pass", "Vidéos Studio", "Coût Studio ($)", "Coût autres IA ($)", "Coût total ($)", "Appels", "Dernier usage"],
      ...personnes.map((p) => [
        p.nom, p.email, ROLES[p.role ?? ""] ?? p.role, p.pass, p.videos,
        Number(p.cout_studio).toFixed(4), Number(p.cout_autres).toFixed(4), Number(p.cout).toFixed(4), p.appels,
        p.dernier ? new Date(p.dernier).toLocaleString("fr-FR") : "",
      ]),
    ];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([versCSV(lignes)], { type: "text/csv;charset=utf-8" }));
    a.download = `consommation-ia-${periode}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const Entete = ({ cle, children, className }: { cle: CleTri; children: React.ReactNode; className?: string }) => (
    <TableHead className={className}>
      <button
        type="button"
        className={cn("inline-flex items-center gap-1 hover:text-foreground", tri.cle === cle && "text-foreground")}
        onClick={() => setTri((t) => ({ cle, desc: t.cle === cle ? !t.desc : cle !== "nom" }))}
      >
        {children}
        {tri.cle === cle && (tri.desc ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)}
      </button>
    </TableHead>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-heading text-2xl font-bold">
            <Sparkles className="h-6 w-6 text-primary" />
            Consommation IA
          </h1>
          <p className="text-sm text-muted-foreground">
            Toute l'IA de la plateforme, par fonctionnalité et par personne. Réservé à l'admin.
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={periode} onValueChange={(v) => setPeriode(v as Periode)}>
            <SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PERIODES.map((p) => <SelectItem key={p.valeur} value={p.valeur}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => void refetch()} aria-label="Actualiser">
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
          </Button>
        </div>
      </div>

      {debut < SUIVI_COMPLET && (
        <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Suivi complet depuis le 19 octobre 2026 : avant cette date, seul le Studio était mesuré.
        </p>
      )}

      {isLoading || !data ? (
        <div className="flex justify-center py-24">
          {isLoading ? <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /> : <p className="text-muted-foreground">Données indisponibles.</p>}
        </div>
      ) : (
        <>
          {/* Indicateurs */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Card className={cn(
              etatCredit === "bas" && "border-amber-500/60 bg-amber-500/5",
              etatCredit === "epuise" && "border-red-500/60 bg-red-500/10",
            )}>
              <CardContent className="p-4">
                <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {etatCredit === "bas" || etatCredit === "epuise" ? <AlertTriangle className="h-3.5 w-3.5 text-amber-400" /> : null}
                  Crédit restant
                </p>
                <p className="mt-1 font-heading text-2xl font-bold tabular-nums">{reste === null ? "—" : usd(reste)}</p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    {data.credit?.mesure_le ? `mesuré ${ilYa(data.credit.mesure_le)}` : "pas encore mesuré"}
                  </p>
                  <a href={RECHARGER} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                    Recharger <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Dépense</p>
                <p className="mt-1 font-heading text-2xl font-bold tabular-nums">{usd(total)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t.appels} appel{t.appels > 1 ? "s" : ""} · {t.utilisateurs} personne{t.utilisateurs > 1 ? "s" : ""}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Studio / autres IA</p>
                <p className="mt-1 font-heading text-2xl font-bold tabular-nums">{pourcent(studio, total)} %</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  <span style={{ color: OR }}>■</span> {usd(studio)} · <span style={{ color: GRIS }}>■</span> {usd(total - studio)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Coût d'une vidéo</p>
                <p className="mt-1 font-heading text-2xl font-bold tabular-nums">{parVideo === null ? "—" : usd(parVideo)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t.videos} vidéo{t.videos > 1 ? "s" : ""} Studio (relances comprises)
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Dépense par jour */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Dépense par jour</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={jours} margin={{ left: -12, right: 8, top: 8 }}>
                  <CartesianGrid vertical={false} stroke="rgba(127,127,127,0.15)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={16} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v} $`} width={52} />
                  <Tooltip
                    cursor={{ fill: "rgba(201,160,78,0.08)" }}
                    contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    labelFormatter={(_l, p) => {
                      const j = p?.[0]?.payload;
                      return j ? `${j.label} · ${j.appels} appel${j.appels > 1 ? "s" : ""}` : "";
                    }}
                    formatter={(v: number, nom: string) => [usd(v), nom === "studio" ? "Studio" : "Autres IA"]}
                  />
                  <Bar dataKey="studio" stackId="c" fill={OR} />
                  <Bar dataKey="autres" stackId="c" fill={GRIS} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Par fonctionnalité */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Par fonctionnalité</CardTitle>
              <p className="text-xs text-muted-foreground">Toutes les fonctionnalités IA de la plateforme, même celles qui n'ont pas servi sur la période.</p>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fonctionnalité</TableHead>
                    <TableHead className="text-right">Appels</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">Personnes</TableHead>
                    <TableHead className="text-right">Coût</TableHead>
                    <TableHead className="hidden w-[140px] md:table-cell">Part</TableHead>
                    <TableHead className="hidden lg:table-cell">Dernier usage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fonctions.map((f) => (
                    <TableRow key={f.fonctionnalite} className={cn(f.appels === 0 && "opacity-50")}>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{f.fiche.nom}</span>
                          {f.fiche.groupe === "studio" && <Badge variant="outline" className="border-primary/40 text-[10px] text-primary">Studio</Badge>}
                          {f.fiche.inactive && <Badge variant="secondary" className="text-[10px]">{f.fiche.inactive}</Badge>}
                          {f.erreurs > 0 && <Badge variant="destructive" className="text-[10px]">{f.erreurs} échec{f.erreurs > 1 ? "s" : ""}</Badge>}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{f.appels === 0 ? "Pas utilisée sur la période. " : ""}{f.fiche.description}</p>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{f.appels}</TableCell>
                      <TableCell className="hidden text-right tabular-nums sm:table-cell">{f.utilisateurs}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{usd(f.cout)}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full" style={{ width: `${pourcent(Number(f.cout), total)}%`, background: f.fiche.groupe === "studio" ? OR : GRIS }} />
                          </div>
                          <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">{pourcent(Number(f.cout), total)} %</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">{ilYa(f.dernier)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Par personne */}
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0 pb-3">
              <div>
                <CardTitle className="text-base">Par personne</CardTitle>
                <p className="text-xs text-muted-foreground">Cliquez sur une ligne pour voir le détail de ses appels.</p>
              </div>
              <div className="flex w-full gap-2 sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Nom ou email…" className="pl-9" />
                </div>
                <Button variant="outline" size="sm" className="h-10 gap-1.5" onClick={exporter} disabled={personnes.length === 0}>
                  <Download className="h-4 w-4" /> CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {personnes.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  {recherche ? "Personne ne correspond à la recherche." : "Aucune consommation sur la période."}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <Entete cle="nom">Personne</Entete>
                      <Entete cle="videos" className="text-right">Vidéos</Entete>
                      <Entete cle="cout_studio" className="hidden text-right sm:table-cell">Studio</Entete>
                      <Entete cle="cout_autres" className="hidden text-right sm:table-cell">Autres IA</Entete>
                      <Entete cle="cout" className="text-right">Total</Entete>
                      <Entete cle="dernier" className="hidden lg:table-cell">Dernier usage</Entete>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {personnes.map((p) => (
                      <TableRow key={p.user_id} className="cursor-pointer" onClick={() => setOuverte(p)}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="truncate font-medium">{p.nom}</span>
                            {p.role && p.role !== "apporteur" && <Badge variant="secondary" className="text-[10px]">{ROLES[p.role] ?? p.role}</Badge>}
                          </div>
                          <p className="truncate text-xs text-muted-foreground">{p.email}</p>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{p.videos || "—"}</TableCell>
                        <TableCell className="hidden text-right tabular-nums sm:table-cell">{usd(p.cout_studio)}</TableCell>
                        <TableCell className="hidden text-right tabular-nums sm:table-cell">{usd(p.cout_autres)}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">{usd(p.cout)}</TableCell>
                        <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">{ilYa(p.dernier)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <DetailPersonne personne={ouverte} periode={periode} debut={debut} fin={fin} onFermer={() => setOuverte(null)} />
    </div>
  );
}

function DetailPersonne({ personne, periode, debut, fin, onFermer }: {
  personne: Personne | null; periode: Periode; debut: Date; fin: Date; onFermer: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["ia-detail", personne?.user_id, periode],
    enabled: !!personne,
    queryFn: async (): Promise<Detail | null> => {
      const { data, error } = await db.rpc("ia_detail_utilisateur", {
        p_user: personne!.user_id, p_debut: debut.toISOString(), p_fin: fin.toISOString(),
      });
      if (error) throw error;
      return data as Detail | null;
    },
  });
  const libelle = PERIODES.find((p) => p.valeur === periode)?.label.toLowerCase();

  return (
    <Sheet open={!!personne} onOpenChange={(o) => !o && onFermer()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {personne && (
          <>
            <SheetHeader>
              <SheetTitle>{personne.nom}</SheetTitle>
              <SheetDescription>
                {personne.email}{personne.pass ? ` · pass ${personne.pass.replace(/_/g, " ")}` : ""} · {libelle}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              {[
                { label: "Total", valeur: usd(personne.cout) },
                { label: "Vidéos Studio", valeur: String(personne.videos) },
                { label: "Appels", valeur: String(personne.appels) },
              ].map((k) => (
                <div key={k.label} className="rounded-lg border border-border p-2">
                  <p className="text-[11px] text-muted-foreground">{k.label}</p>
                  <p className="font-heading text-lg font-bold tabular-nums">{k.valeur}</p>
                </div>
              ))}
            </div>

            {isLoading || !data ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <>
                <h3 className="mb-2 mt-6 text-sm font-semibold">Par fonctionnalité</h3>
                <div className="space-y-2">
                  {data.par_fonctionnalite.map((f) => (
                    <div key={f.fonctionnalite} className="flex items-center justify-between gap-3 text-sm">
                      <span>{fonctionnalite(f.fonctionnalite).nom}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {f.appels} × · <span className="font-medium text-foreground">{usd(f.cout)}</span>
                      </span>
                    </div>
                  ))}
                  {data.par_fonctionnalite.length === 0 && <p className="text-sm text-muted-foreground">Aucun appel sur la période.</p>}
                </div>

                {data.derniers.length > 0 && (
                  <>
                    <h3 className="mb-2 mt-6 text-sm font-semibold">Derniers appels</h3>
                    <div className="divide-y divide-border rounded-lg border border-border">
                      {data.derniers.map((d, i) => (
                        <div key={i} className="flex items-start justify-between gap-3 px-3 py-2 text-xs">
                          <div className="min-w-0">
                            <p className="font-medium text-foreground">{fonctionnalite(d.fonctionnalite).nom}</p>
                            <p className="text-muted-foreground">
                              {new Date(d.cree_le).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                              {d.tokens_entree ? ` · ${(d.tokens_entree + (d.tokens_sortie ?? 0)).toLocaleString("fr-FR")} tokens` : ""}
                              {d.statut === "reprise" ? " · repris de l'historique" : ""}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {d.statut === "erreur" && <Badge variant="destructive" className="text-[10px]">échec</Badge>}
                            <span className="tabular-nums font-medium">{usd(d.cout)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
