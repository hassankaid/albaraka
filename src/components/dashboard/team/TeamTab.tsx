import { useMemo, useState } from "react";
import { useTeamPerformance, type TeamRankingRow } from "@/hooks/useTeamPerformance";
import { conferenceEnCours, dimanchePlus, formatConferenceLabel } from "@/lib/marketing/conferenceFilter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ChevronLeft, ChevronRight, Loader2, Sparkles, Target, Trophy, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Formatters ─────────────────────────────────────────────────────
const num = (n: number) => new Intl.NumberFormat("fr-FR").format(n);
const pct = (n: number, digits = 1) =>
  `${(n * 100).toFixed(digits).replace(/\.0+$/, "")}%`;
const eur = (n: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);

// ─── Helpers UI ─────────────────────────────────────────────────────
function roleBadge(role: string, level: string | null) {
  if (role === "ceo") return { label: "CEO", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" };
  if (role === "apporteur") return { label: "Apporteur", cls: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30" };
  if (role === "collaborateur") {
    if (level === "confirme") return { label: "Collab confirmé", cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" };
    if (level === "intermediaire") return { label: "Collab intermédiaire", cls: "bg-blue-500/10 text-blue-400/80 border-blue-500/20" };
    return { label: "Collab", cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" };
  }
  if (role === "agence") return { label: "Agence", cls: "bg-purple-500/15 text-purple-300 border-purple-500/30" };
  return { label: role, cls: "bg-muted text-muted-foreground border-border" };
}

const ROLE_PODIUM_META: Record<"setter" | "closer" | "apporteur", {
  label: string;
  icon: any;
  color: string;
}> = {
  setter:    { label: "Top Setters",    icon: Target,   color: "text-blue-400" },
  closer:    { label: "Top Closers",    icon: Trophy,   color: "text-emerald-400" },
  apporteur: { label: "Top Apporteurs", icon: Sparkles, color: "text-amber-400" },
};

const TOP_N = 5;
const NB_CONFERENCES = 26;

/** En-tête de colonne avec son explication au survol. */
function Entete({ titre, aide, className }: { titre: string; aide: string; className?: string }) {
  return (
    <TableHead className={className}>
      <Tooltip>
        <TooltipTrigger className="cursor-help underline decoration-dotted underline-offset-4">{titre}</TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs">{aide}</TooltipContent>
      </Tooltip>
    </TableHead>
  );
}

// ─── Composant principal ────────────────────────────────────────────
// Période = une conférence (décision du 17/11/2026) : le travail de la semaine
// où l'on inscrit à cette conférence, et les ventes rattachées à elle.
export default function TeamTab() {
  const enCours = useMemo(() => conferenceEnCours(), []);
  const conferences = useMemo(
    () => Array.from({ length: NB_CONFERENCES }, (_, i) => dimanchePlus(enCours, -i)),
    [enCours],
  );
  const [conference, setConference] = useState<string>(enCours);
  const index = conferences.indexOf(conference);

  const { data, isLoading, isError, error } = useTeamPerformance(conference);

  const libelle = (d: string) => `Conférence du ${formatConferenceLabel(d)}${d === enCours ? " (en cours)" : ""}`;

  return (
    <div className="space-y-4">
      {/* Sélecteur de conférence */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline" size="icon" className="h-9 w-9"
          disabled={index < 0 || index >= conferences.length - 1}
          onClick={() => setConference(conferences[index + 1])}
          aria-label="Conférence précédente"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Select value={conference} onValueChange={setConference}>
          <SelectTrigger className="w-[320px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {conferences.map((d) => (
              <SelectItem key={d} value={d}>{libelle(d)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline" size="icon" className="h-9 w-9"
          disabled={index <= 0}
          onClick={() => setConference(conferences[index - 1])}
          aria-label="Conférence suivante"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <p className="text-xs text-muted-foreground basis-full">
          Travail du {formatConferenceLabel(dimanchePlus(conference, -1))} (début de conférence) au {formatConferenceLabel(conference)} (début de conférence) ;
          calls et ventes de cette conférence{conference === enCours ? ", qui arriveront à partir du jour de la conférence" : ""}.
        </p>
      </div>

      {isLoading && (
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

      {!isLoading && !isError && data && (
        <>
          {/* ─── Qualification ──────────────────────────────────── */}
          <Card>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <h3 className="font-heading text-base text-foreground">Qualification et conversion</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Sur les leads que le membre a appelés, combien il en a inscrits à la conférence, combien ont pris un call et combien ont acheté.
                Le suivi après la conférence et la redistribution des leads sont comptés à part : ils ne pèsent pas sur le taux.
              </p>
              {data.qualification.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Aucun lead appelé sur cette période.
                </p>
              ) : (
                <div className="rounded-lg border border-border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead>Membre</TableHead>
                        <TableHead>Rôle</TableHead>
                        <Entete className="text-right" titre="Appelés" aide="Leads que le membre a fait passer de « À qualifier », « À relancer », « Pas de réponse » (ou d'un statut DM) à un résultat, ou sur lesquels il a noté une relance." />
                        <Entete className="text-right" titre="Inscrits" aide="Parmi ces leads appelés, ceux qu'il a passés en « Inscrit conférence » ou « Call booké »." />
                        <Entete className="text-right" titre="Taux" aide="Inscrits divisés par leads appelés." />
                        <Entete className="text-right" titre="Calls" aide="Inscrits qui ont ensuite pris un rendez-vous (non annulé)." />
                        <Entete className="text-right" titre="Ventes" aide="Ventes rattachées à cette conférence où le membre touche une commission de setter." />
                        <Entete className="text-right" titre="Post-conf." aide="Leads suivis après une conférence (rediffusion, sans réponse post-conférence…). Hors taux." />
                        <Entete className="text-right" titre="Gestion" aide="Leads redistribués : remis en « À qualifier », réattribués, basculés en DM. Hors taux." />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.qualification.map((row) => {
                        const rb = roleBadge(row.role, row.collaborateur_level);
                        const taux = row.taux_inscription;
                        const tauxCls = taux >= 0.3
                          ? "text-emerald-400"
                          : taux >= 0.15
                            ? "text-amber-400"
                            : "text-muted-foreground";
                        return (
                          <TableRow key={row.user_id} className="border-border hover:bg-secondary/40">
                            <TableCell className="font-medium text-foreground">{row.full_name}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn("text-[10px] leading-tight", rb.cls)}>
                                {rb.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">{num(row.nb_appeles)}</TableCell>
                            <TableCell className="text-right text-foreground font-medium">{num(row.nb_inscrits)}</TableCell>
                            <TableCell className={cn("text-right font-bold", tauxCls)}>
                              {row.nb_appeles > 0 ? pct(taux, 0) : "—"}
                            </TableCell>
                            <TableCell className="text-right text-foreground">{num(row.nb_calls)}</TableCell>
                            <TableCell className="text-right text-foreground">
                              {num(row.nb_ventes)}
                              {row.nb_ventes > 0 && (
                                <span className="block text-[10px] text-muted-foreground">{eur(row.montant_ventes_ht)} HT</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">{num(row.nb_post_conference)}</TableCell>
                            <TableCell className="text-right text-muted-foreground">{num(row.nb_gestion)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ─── Classements ventes ─────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {(["setter", "closer", "apporteur"] as const).map((role) => (
              <RankingPodium key={role} role={role} rows={data.rankings[role]} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Sous-composant Podium ─────────────────────────────────────────
function RankingPodium({
  role,
  rows,
}: {
  role: "setter" | "closer" | "apporteur";
  rows: TeamRankingRow[];
}) {
  const meta = ROLE_PODIUM_META[role];
  const Icon = meta.icon;
  const top = rows.slice(0, TOP_N);

  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-4 w-4", meta.color)} />
          <h3 className="font-heading text-base text-foreground">{meta.label}</h3>
          <Badge variant="outline" className="ml-auto text-[10px]">
            {rows.length} actif{rows.length > 1 ? "s" : ""}
          </Badge>
        </div>
        {top.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Aucune vente rattachée à cette conférence.
          </p>
        ) : (
          <ol className="space-y-1.5">
            {top.map((r, i) => {
              const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
              return (
                <li
                  key={r.user_id}
                  className={cn(
                    "flex items-start gap-3 rounded-md px-2.5 py-2 border",
                    i === 0
                      ? "border-amber-500/40 bg-amber-500/[0.04]"
                      : "border-border/60 bg-card",
                  )}
                >
                  <div className="flex-shrink-0 w-6 text-center text-sm font-bold text-muted-foreground">
                    {medal ?? `${i + 1}.`}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{r.full_name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {num(r.nb_ventes)} vente{r.nb_ventes > 1 ? "s" : ""} · {eur(r.montant_total_ht)} HT
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Commissions perçues : <span className="text-foreground font-medium">{eur(r.montant_commissions)}</span>
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
