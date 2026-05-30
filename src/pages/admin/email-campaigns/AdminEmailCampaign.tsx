/**
 * Dashboard suivi de la campagne email Conference AL BARAKA.
 *
 * Affiche par email (1-5) :
 *  - Nombre d'envois
 *  - Délivrés / Bounced
 *  - Ouverts (et taux)
 *  - Clics (et taux)
 *  - Plaintes spam
 *
 * + Détail par destinataire : qui a reçu, ouvert, cliqué.
 * Auto-refresh toutes les 30s.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Mail,
  CheckCircle2,
  Eye,
  MousePointerClick,
  AlertTriangle,
  XCircle,
  RefreshCw,
} from "lucide-react";

const CAMPAIGN_SLUG = "conf_2026_05_31";

const EMAIL_NAMES: Record<number, string> = {
  1: "Email 1 — L'invitation",
  2: "Email 2 — La promesse",
  3: "Email 3 — Jour J",
  4: "Email 4 — T-2h",
  5: "Email 5 — Ouverture salle",
};

interface CampaignStat {
  campaign_slug: string;
  email_seq: number;
  nb_envoyes: number;
  nb_destinataires_uniques: number;
  nb_doublons: number;
  nb_echec_envoi: number;
  nb_delivres: number;
  nb_ouverts: number;
  nb_clics: number;
  nb_bounces: number;
  nb_complaints: number;
  nb_desabos: number;
  premier_envoi_at: string | null;
  dernier_envoi_at: string | null;
}

interface DuplicateRow {
  campaign_slug: string;
  email_seq: number;
  recipient_email: string;
  recipient_first_name: string | null;
  nb_envois: number;
  premier_envoi: string;
  dernier_envoi: string;
  ecart_secondes: number;
}

interface SendDetail {
  recipient_email: string;
  recipient_first_name: string | null;
  resend_email_id: string | null;
  status: string;
  error_message: string | null;
  sent_at: string;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  bounced_at: string | null;
}

function pct(num: number, total: number): string {
  if (!total) return "0,0 %";
  return ((num / total) * 100).toFixed(1).replace(".", ",") + " %";
}

function fmtDate(s: string | null): string {
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminEmailCampaign() {
  const { profile, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeSeq, setActiveSeq] = useState("1");
  const [search, setSearch] = useState("");

  const isAuthorized =
    !!profile && (profile.role === "ceo" || profile.is_coach === true);

  // 1. Stats agrégées
  const stats = useQuery({
    queryKey: ["email-campaign-stats", CAMPAIGN_SLUG],
    enabled: isAuthorized,
    refetchInterval: 30_000,
    queryFn: async (): Promise<CampaignStat[]> => {
      const { data, error } = await (supabase as any)
        .from("email_campaign_stats")
        .select("*")
        .eq("campaign_slug", CAMPAIGN_SLUG)
        .order("email_seq");
      if (error) throw error;
      return (data ?? []) as CampaignStat[];
    },
  });

  // 2. Détail par destinataire pour l'email sélectionné
  const details = useQuery({
    queryKey: ["email-campaign-details", CAMPAIGN_SLUG, activeSeq],
    enabled: isAuthorized,
    refetchInterval: 30_000,
    queryFn: async (): Promise<SendDetail[]> => {
      const { data: sends, error: sErr } = await (supabase as any)
        .from("email_campaign_sends")
        .select("recipient_email, recipient_first_name, resend_email_id, status, error_message, sent_at")
        .eq("campaign_slug", CAMPAIGN_SLUG)
        .eq("email_seq", parseInt(activeSeq))
        .order("sent_at", { ascending: false })
        .limit(2000);
      if (sErr) throw sErr;
      const sendsList = (sends ?? []) as any[];
      const ids = sendsList.map((s) => s.resend_email_id).filter(Boolean);

      // Events groupés par email_id
      const eventsByEmail = new Map<string, Record<string, string>>();
      if (ids.length > 0) {
        const { data: events } = await (supabase as any)
          .from("email_campaign_events")
          .select("resend_email_id, event_type, occurred_at")
          .in("resend_email_id", ids);
        for (const ev of (events ?? []) as any[]) {
          if (!eventsByEmail.has(ev.resend_email_id))
            eventsByEmail.set(ev.resend_email_id, {});
          const m = eventsByEmail.get(ev.resend_email_id)!;
          // Garde le premier occurrence par type (delivered, opened, clicked, bounced)
          if (!m[ev.event_type]) m[ev.event_type] = ev.occurred_at;
        }
      }

      return sendsList.map((s) => {
        const m = s.resend_email_id ? eventsByEmail.get(s.resend_email_id) ?? {} : {};
        return {
          ...s,
          delivered_at: m["email.delivered"] ?? null,
          opened_at: m["email.opened"] ?? null,
          clicked_at: m["email.clicked"] ?? null,
          bounced_at: m["email.bounced"] ?? null,
        };
      });
    },
  });

  // 3. Doublons (destinataires qui ont reçu le même email plusieurs fois)
  const duplicates = useQuery({
    queryKey: ["email-campaign-duplicates", CAMPAIGN_SLUG, activeSeq],
    enabled: isAuthorized,
    refetchInterval: 60_000,
    queryFn: async (): Promise<DuplicateRow[]> => {
      const { data, error } = await (supabase as any)
        .from("email_campaign_duplicates")
        .select("*")
        .eq("campaign_slug", CAMPAIGN_SLUG)
        .eq("email_seq", parseInt(activeSeq))
        .order("nb_envois", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as DuplicateRow[];
    },
  });

  if (authLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-lg font-semibold mb-2">Accès réservé</h2>
        <p className="text-sm text-muted-foreground">Cette page est réservée aux CEO / coachs.</p>
        <Button onClick={() => navigate("/")} variant="outline" className="mt-4">
          Retour
        </Button>
      </div>
    );
  }

  const allStats = stats.data ?? [];
  const totals = allStats.reduce(
    (acc, s) => ({
      sent: acc.sent + s.nb_envoyes,
      uniques: acc.uniques + (s.nb_destinataires_uniques ?? 0),
      doublons: acc.doublons + (s.nb_doublons ?? 0),
      delivered: acc.delivered + s.nb_delivres,
      opened: acc.opened + s.nb_ouverts,
      clicked: acc.clicked + s.nb_clics,
      bounced: acc.bounced + s.nb_bounces,
    }),
    { sent: 0, uniques: 0, doublons: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0 },
  );

  const currentStat = allStats.find((s) => s.email_seq === parseInt(activeSeq));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Campagne — Conférence 31/05</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Suivi temps réel · 1 000 destinataires · 5 emails
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            stats.refetch();
            details.refetch();
          }}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* KPIs globaux — 1ère ligne : volume */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          icon={<Mail />}
          label="Envois total"
          value={totals.sent}
          hint={totals.doublons > 0 ? `+${totals.doublons} doublons` : undefined}
        />
        <KpiCard
          icon={<Mail className="text-indigo-600" />}
          label="Destinataires uniques"
          value={totals.uniques}
        />
        <KpiCard
          icon={<AlertTriangle className="text-orange-500" />}
          label="Doublons"
          value={totals.doublons}
          hint={totals.uniques > 0 ? `${((totals.doublons / totals.uniques) * 100).toFixed(1)}% des uniques` : undefined}
        />
        <KpiCard
          icon={<CheckCircle2 className="text-green-600" />}
          label="Délivrés"
          value={totals.delivered}
          pct={pct(totals.delivered, totals.sent)}
        />
      </div>

      {/* KPIs globaux — 2ème ligne : engagement */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <KpiCard
          icon={<Eye className="text-blue-600" />}
          label="Ouverts"
          value={totals.opened}
          pct={pct(totals.opened, totals.delivered)}
        />
        <KpiCard
          icon={<MousePointerClick className="text-amber-600" />}
          label="Clics WhatsApp"
          value={totals.clicked}
          pct={pct(totals.clicked, totals.delivered)}
        />
        <KpiCard
          icon={<XCircle className="text-red-600" />}
          label="Bounces"
          value={totals.bounced}
          pct={pct(totals.bounced, totals.sent)}
        />
      </div>

      {/* Détail par email */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Détail par email</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeSeq} onValueChange={setActiveSeq}>
            <TabsList className="grid grid-cols-5 mb-4">
              {[1, 2, 3, 4, 5].map((seq) => {
                const s = allStats.find((x) => x.email_seq === seq);
                return (
                  <TabsTrigger key={seq} value={String(seq)} className="text-xs">
                    {EMAIL_NAMES[seq].split("—")[0].trim()}
                    {s && s.nb_envoyes > 0 && (
                      <Badge variant="secondary" className="ml-2 px-1.5">
                        {s.nb_envoyes}
                      </Badge>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {[1, 2, 3, 4, 5].map((seq) => {
              const s = allStats.find((x) => x.email_seq === seq);
              return (
                <TabsContent key={seq} value={String(seq)} className="space-y-4">
                  <div className="border rounded-lg p-4 bg-muted/30">
                    <h3 className="font-semibold mb-3">{EMAIL_NAMES[seq]}</h3>
                    {!s || s.nb_envoyes === 0 ? (
                      <p className="text-sm text-muted-foreground">Pas encore envoyé.</p>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                          <Metric label="Envois" value={s.nb_envoyes} />
                          <Metric
                            label="Uniques"
                            value={s.nb_destinataires_uniques ?? 0}
                            color="text-indigo-600"
                          />
                          <Metric
                            label="Doublons"
                            value={s.nb_doublons ?? 0}
                            color={s.nb_doublons > 0 ? "text-orange-600" : ""}
                          />
                          <Metric
                            label="Délivrés"
                            value={s.nb_delivres}
                            pct={pct(s.nb_delivres, s.nb_envoyes)}
                            color="text-green-600"
                          />
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <Metric
                            label="Ouverts"
                            value={s.nb_ouverts}
                            pct={pct(s.nb_ouverts, s.nb_delivres)}
                            color="text-blue-600"
                          />
                          <Metric
                            label="Clics WhatsApp"
                            value={s.nb_clics}
                            pct={pct(s.nb_clics, s.nb_delivres)}
                            color="text-amber-600"
                          />
                          <Metric
                            label="Bounces"
                            value={s.nb_bounces}
                            pct={pct(s.nb_bounces, s.nb_envoyes)}
                            color="text-red-600"
                          />
                          <Metric
                            label="Plaintes"
                            value={s.nb_complaints}
                            color="text-red-700"
                          />
                        </div>
                      </>
                    )}
                    {s?.premier_envoi_at && (
                      <p className="text-xs text-muted-foreground mt-3">
                        Envoyé entre {fmtDate(s.premier_envoi_at)} et {fmtDate(s.dernier_envoi_at)}
                      </p>
                    )}
                  </div>

                  {/* Bloc doublons (si applicable) */}
                  {s && (s.nb_doublons ?? 0) > 0 && (duplicates.data ?? []).length > 0 && (
                    <div className="border border-orange-200 bg-orange-50/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                        <h4 className="font-semibold text-sm">
                          {(duplicates.data ?? []).length} destinataire{(duplicates.data ?? []).length > 1 ? "s" : ""} ayant reçu cet email plusieurs fois
                        </h4>
                      </div>
                      <div className="border rounded-lg overflow-auto max-h-[300px] bg-white">
                        <table className="w-full text-xs">
                          <thead className="bg-orange-100/60 sticky top-0">
                            <tr>
                              <th className="text-left p-2 font-medium">Prénom</th>
                              <th className="text-left p-2 font-medium">Email</th>
                              <th className="text-left p-2 font-medium">Nb envois</th>
                              <th className="text-left p-2 font-medium">1er envoi</th>
                              <th className="text-left p-2 font-medium">Dernier envoi</th>
                              <th className="text-left p-2 font-medium">Écart</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(duplicates.data ?? []).slice(0, 1000).map((d) => (
                              <tr key={d.recipient_email} className="border-t hover:bg-orange-50/40">
                                <td className="p-2 font-medium">{d.recipient_first_name ?? "—"}</td>
                                <td className="p-2 text-muted-foreground">{d.recipient_email}</td>
                                <td className="p-2">
                                  <Badge variant="outline" className="bg-orange-100 border-orange-300 text-orange-800">
                                    {d.nb_envois}×
                                  </Badge>
                                </td>
                                <td className="p-2">{fmtDate(d.premier_envoi)}</td>
                                <td className="p-2">{fmtDate(d.dernier_envoi)}</td>
                                <td className="p-2 text-muted-foreground">
                                  {d.ecart_secondes < 60
                                    ? `${Math.round(d.ecart_secondes)}s`
                                    : d.ecart_secondes < 3600
                                    ? `${Math.round(d.ecart_secondes / 60)}min`
                                    : `${Math.round(d.ecart_secondes / 3600)}h`}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Recherche + liste destinataires */}
                  {s && s.nb_envoyes > 0 && (
                    <div>
                      <div className="mb-3">
                        <Input
                          placeholder="Rechercher un email ou prénom..."
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          className="max-w-sm"
                        />
                      </div>
                      <div className="border rounded-lg overflow-auto max-h-[500px]">
                        <table className="w-full text-xs">
                          <thead className="bg-muted/50 sticky top-0">
                            <tr>
                              <th className="text-left p-2 font-medium">Destinataire</th>
                              <th className="text-left p-2 font-medium">Envoyé</th>
                              <th className="text-left p-2 font-medium">Délivré</th>
                              <th className="text-left p-2 font-medium">Ouvert</th>
                              <th className="text-left p-2 font-medium">Cliqué</th>
                              <th className="text-left p-2 font-medium">Statut</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(details.data ?? [])
                              .filter(
                                (r) =>
                                  !search ||
                                  r.recipient_email.toLowerCase().includes(search.toLowerCase()) ||
                                  (r.recipient_first_name ?? "")
                                    .toLowerCase()
                                    .includes(search.toLowerCase()),
                              )
                              .slice(0, 500)
                              .map((r) => (
                                <tr
                                  key={`${r.recipient_email}-${r.sent_at}`}
                                  className="border-t hover:bg-muted/30"
                                >
                                  <td className="p-2">
                                    <div className="font-medium">{r.recipient_first_name ?? "—"}</div>
                                    <div className="text-muted-foreground">{r.recipient_email}</div>
                                  </td>
                                  <td className="p-2">{fmtDate(r.sent_at)}</td>
                                  <td className="p-2">
                                    {r.delivered_at ? (
                                      <span className="text-green-600">✓ {fmtDate(r.delivered_at)}</span>
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </td>
                                  <td className="p-2">
                                    {r.opened_at ? (
                                      <span className="text-blue-600">👁 {fmtDate(r.opened_at)}</span>
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </td>
                                  <td className="p-2">
                                    {r.clicked_at ? (
                                      <span className="text-amber-600">▸ {fmtDate(r.clicked_at)}</span>
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </td>
                                  <td className="p-2">
                                    {r.status === "failed" ? (
                                      <Badge variant="destructive">Échec</Badge>
                                    ) : r.bounced_at ? (
                                      <Badge variant="destructive">Bounce</Badge>
                                    ) : r.clicked_at ? (
                                      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                                        Cliqué
                                      </Badge>
                                    ) : r.opened_at ? (
                                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                                        Ouvert
                                      </Badge>
                                    ) : r.delivered_at ? (
                                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                        Délivré
                                      </Badge>
                                    ) : (
                                      <Badge variant="secondary">Envoyé</Badge>
                                    )}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {(details.data ?? []).length} lignes · Affichage limité à 500.
                      </p>
                    </div>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Auto-refresh toutes les 30 secondes. Données issues de Resend via webhook.
      </p>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  pct,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  pct?: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1 text-xs text-muted-foreground">
          {icon}
          <span>{label}</span>
        </div>
        <div className="text-2xl font-bold">{value.toLocaleString("fr-FR")}</div>
        {pct && <div className="text-xs text-muted-foreground mt-1">{pct}</div>}
        {hint && <div className="text-xs text-orange-600 mt-1">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function Metric({
  label,
  value,
  pct,
  color,
}: {
  label: string;
  value: number;
  pct?: string;
  color?: string;
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-xl font-semibold ${color ?? ""}`}>{value.toLocaleString("fr-FR")}</div>
      {pct && <div className="text-xs text-muted-foreground">{pct}</div>}
    </div>
  );
}
