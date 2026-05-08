// Admin — Back-office du quiz lead magnet.
// Accessible CEO only. 3 onglets : Statistiques / Submissions / Éditeur de config.

import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3,
  Users,
  Mail,
  CheckCircle2,
  Phone,
  MessageCircle,
  Eye,
  Trophy,
  ArrowDown,
  Download,
  Filter,
  Clock,
  UserPlus,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";
import { AdminQuizEditor } from "./AdminQuizEditor";

// ──────────────────────────────────────────────────────────────────────

interface OwnerRow {
  id: string;
  user_id: string;
  slug: string;
  display_name: string;
  display_role: string;
  is_active: boolean;
  total_views: number | null;
  created_at: string;
}

interface SubmissionRow {
  id: string;
  owner_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  status: string;
  profile: string | null;
  last_question_reached: string | null;
  created_at: string;
  quiz_completed_at: string | null;
  phone_captured_at: string | null;
  whatsapp_clicked_at: string | null;
  lead_id: string | null;
}

type StatusFilter = "all" | "email_captured" | "quiz_in_progress" | "quiz_completed" | "phone_captured" | "whatsapp_clicked";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  email_captured: { label: "Email seulement", color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  quiz_in_progress: { label: "Quiz en cours", color: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  quiz_completed: { label: "Quiz terminé", color: "bg-violet-500/20 text-violet-300 border-violet-500/30" },
  phone_captured: { label: "Tel capturé (lead)", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  whatsapp_clicked: { label: "Clic WhatsApp", color: "bg-green-500/20 text-green-300 border-green-500/30" },
};

const PROFILE_LABELS: Record<string, { label: string; color: string }> = {
  batisseur: { label: "Bâtisseur 👑", color: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  connecteur: { label: "Connecteur 🤝", color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  createur: { label: "Créateur 💡", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
};

// ──────────────────────────────────────────────────────────────────────

export default function AdminQuizLead() {
  const { profile } = useAuth();
  const { toast } = useToast();

  if (profile && profile.role !== "ceo") {
    return <Navigate to="/dashboard" replace />;
  }

  const [loading, setLoading] = useState(true);
  const [owners, setOwners] = useState<OwnerRow[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [ownersRes, subsRes] = await Promise.all([
        supabase
          .from("lead_quiz_owners")
          .select("id, user_id, slug, display_name, display_role, is_active, total_views, created_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("lead_quiz_submissions")
          .select("id, owner_id, first_name, last_name, email, phone, status, profile, last_question_reached, created_at, quiz_completed_at, phone_captured_at, whatsapp_clicked_at, lead_id")
          .order("created_at", { ascending: false })
          .limit(1000),
      ]);

      if (ownersRes.error) throw ownersRes.error;
      if (subsRes.error) throw subsRes.error;

      setOwners(ownersRes.data as OwnerRow[]);
      setSubmissions(subsRes.data as SubmissionRow[]);
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ownersById = useMemo(() => new Map(owners.map((o) => [o.id, o])), [owners]);
  const totalViews = useMemo(() => owners.reduce((s, o) => s + (o.total_views ?? 0), 0), [owners]);

  const stats = useMemo(() => {
    // Nouveau flow : prénom + email + tel sont capturés en une fois au début.
    // Donc "infoCaptured" = toutes les submissions (toutes ont au moins email,
    // les nouvelles ont aussi le tel).
    // L'ancien KPI "phoneCaptured" séparé n'a plus de sens en première mesure
    // (car toutes les nouvelles submissions ont un tel) → on le garde quand
    // même pour suivre la rétrocompat des anciennes submissions email_captured.
    // Note refonte 06/05/2026 : 'phone_captured' = coordonnées laissées (le tel
    // est demandé au début), pas "quiz fini". Donc on l'exclut des compteurs
    // quizInProgress et quizCompleted — ces compteurs reflètent réellement la
    // progression dans le quiz lui-même.
    const s = {
      infoCaptured: submissions.length,
      quizInProgress: submissions.filter((x) => ["quiz_in_progress", "quiz_completed", "whatsapp_clicked"].includes(x.status)).length,
      quizCompleted: submissions.filter((x) => ["quiz_completed", "whatsapp_clicked"].includes(x.status)).length,
      whatsappClicked: submissions.filter((x) => x.status === "whatsapp_clicked").length,
      // Rétrocompat : combien de submissions avec lead CRM créé (avec tel renseigné)
      withLead: submissions.filter((x) => !!x.lead_id).length,
    };
    return s;
  }, [submissions]);

  const profileDistribution = useMemo(() => {
    const dist: Record<string, number> = { batisseur: 0, connecteur: 0, createur: 0 };
    for (const s of submissions) {
      if (s.profile && dist[s.profile] !== undefined) dist[s.profile]++;
    }
    return dist;
  }, [submissions]);

  const topApporteurs = useMemo(() => {
    // Funnel apporteur simplifié : Coordonnées → Quiz terminés → WhatsApp
    const map = new Map<string, { display_name: string; slug: string; coords: number; quizDone: number; whatsapp: number }>();
    for (const o of owners) {
      map.set(o.id, { display_name: o.display_name, slug: o.slug, coords: 0, quizDone: 0, whatsapp: 0 });
    }
    for (const s of submissions) {
      const entry = map.get(s.owner_id);
      if (!entry) continue;
      // "Coordonnées" = toute submission (à minima email + nouveaux : email+tel)
      entry.coords++;
      if (["quiz_completed", "whatsapp_clicked"].includes(s.status)) entry.quizDone++;
      if (s.status === "whatsapp_clicked") entry.whatsapp++;
    }
    return Array.from(map.values())
      .filter((x) => x.coords > 0)
      .sort((a, b) => b.whatsapp - a.whatsapp || b.quizDone - a.quizDone || b.coords - a.coords)
      .slice(0, 10);
  }, [owners, submissions]);

  // Questions qui font décrocher : on regarde `last_question_reached` des quiz abandonnés
  const dropOffPoints = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of submissions) {
      if (s.status === "quiz_in_progress" && s.last_question_reached) {
        counts[s.last_question_reached] = (counts[s.last_question_reached] ?? 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [submissions]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-gold-400" />
            Quiz Lead Magnet
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Funnel de prospection partagé par les apporteurs — administration et éditorial
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          {owners.length} apporteur{owners.length > 1 ? "s" : ""} avec un lien actif
        </div>
      </div>

      <Tabs defaultValue="stats" className="space-y-5">
        <TabsList>
          <TabsTrigger value="stats" className="gap-2">
            <BarChart3 className="h-4 w-4" /> Statistiques
          </TabsTrigger>
          <TabsTrigger value="submissions" className="gap-2">
            <Users className="h-4 w-4" /> Submissions ({submissions.length})
          </TabsTrigger>
          <TabsTrigger value="editor" className="gap-2">
            <Sparkles className="h-4 w-4" /> Éditeur du quiz
          </TabsTrigger>
        </TabsList>

        {/* ═══ STATS ═══ */}
        <TabsContent value="stats" className="space-y-6">
          {loading ? (
            <StatsSkeleton />
          ) : (
            <>
              {/* KPI cards — funnel simplifié à 3 étapes (le tel est capturé
                  dès le formulaire initial, donc "Coordonnées" = "Tels".
                  La colonne "Avec lead CRM" reflète le nb de leads créés) */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <KpiCard icon={<Eye />} label="Visites" value={totalViews} color="text-slate-300" />
                <KpiCard icon={<Mail />} label="Coordonnées" value={stats.infoCaptured} color="text-blue-300" accent />
                <KpiCard icon={<CheckCircle2 />} label="Quiz terminés" value={stats.quizCompleted} color="text-violet-300" />
                <KpiCard icon={<MessageCircle />} label="Clics WhatsApp" value={stats.whatsappClicked} color="text-green-300" />
                <KpiCard icon={<Phone />} label="Avec lead CRM" value={stats.withLead} color="text-emerald-300" />
              </div>

              {/* Funnel */}
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Funnel de conversion</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <FunnelRow label="Visites sur un lien" value={totalViews} max={totalViews} color="#64748b" />
                  <FunnelRow label="Coordonnées laissées" value={stats.infoCaptured} max={totalViews} color="#3b82f6" accent />
                  <FunnelRow label="Quiz démarrés" value={stats.quizInProgress} max={totalViews} color="#f59e0b" />
                  <FunnelRow label="Quiz terminés" value={stats.quizCompleted} max={totalViews} color="#8b5cf6" />
                  <FunnelRow label="Clics WhatsApp" value={stats.whatsappClicked} max={totalViews} color="#25D366" />
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Profile distribution */}
                <Card className="border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Profils détectés</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {Object.entries(profileDistribution).map(([key, count]) => {
                      const total = Object.values(profileDistribution).reduce((s, v) => s + v, 0) || 1;
                      const pct = Math.round((count / total) * 100);
                      return (
                        <div key={key} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-foreground">{PROFILE_LABELS[key]?.label ?? key}</span>
                            <span className="text-muted-foreground">
                              {count} <span className="text-xs">({pct}%)</span>
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-background overflow-hidden">
                            <div
                              className="h-full"
                              style={{
                                width: `${pct}%`,
                                background: key === "batisseur" ? "#D4A017" : key === "connecteur" ? "#3b82f6" : "#10b981",
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    {Object.values(profileDistribution).reduce((s, v) => s + v, 0) === 0 && (
                      <p className="text-sm text-muted-foreground italic">Aucun quiz complet pour l'instant.</p>
                    )}
                  </CardContent>
                </Card>

                {/* Drop-off points */}
                <Card className="border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ArrowDown className="h-4 w-4 text-amber-400" />
                      Top questions qui font décrocher
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dropOffPoints.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">Aucun abandon détecté pour l'instant.</p>
                    ) : (
                      <ul className="space-y-2">
                        {dropOffPoints.map(([qid, count]) => (
                          <li key={qid} className="flex items-center justify-between text-sm rounded-md bg-background/40 px-3 py-2 border border-border/40">
                            <code className="text-xs text-muted-foreground">{qid}</code>
                            <Badge variant="outline" className="text-[10px]">
                              {count} abandon{count > 1 ? "s" : ""}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Top apporteurs */}
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-gold-400" />
                    Top 10 apporteurs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {topApporteurs.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">Aucun lead généré pour l'instant.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-muted-foreground border-b border-border/40">
                            <th className="py-2 font-medium">#</th>
                            <th className="py-2 font-medium">Apporteur</th>
                            <th className="py-2 font-medium">Slug</th>
                            <th className="py-2 font-medium text-right">Coordonnées</th>
                            <th className="py-2 font-medium text-right">Quiz ✓</th>
                            <th className="py-2 font-medium text-right">WhatsApp</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topApporteurs.map((a, i) => (
                            <tr key={a.slug} className="border-b border-border/20 last:border-0 hover:bg-background/40">
                              <td className="py-2 text-muted-foreground">{i + 1}</td>
                              <td className="py-2 font-medium text-foreground">{a.display_name}</td>
                              <td className="py-2 text-xs text-muted-foreground">
                                <code className="rounded bg-background/60 px-1.5 py-0.5">/quiz/{a.slug}</code>
                              </td>
                              <td className="py-2 text-right text-muted-foreground">{a.coords}</td>
                              <td className="py-2 text-right text-muted-foreground">{a.quizDone}</td>
                              <td className="py-2 text-right font-bold text-green-300">{a.whatsapp}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ═══ SUBMISSIONS ═══ */}
        <TabsContent value="submissions">
          <SubmissionsTab
            loading={loading}
            submissions={submissions}
            ownersById={ownersById}
            onRefresh={fetchAll}
          />
        </TabsContent>

        {/* ═══ EDITOR ═══ */}
        <TabsContent value="editor">
          <AdminQuizEditor />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Stats helpers
// ──────────────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, color, accent = false }: { icon: React.ReactNode; label: string; value: number; color?: string; accent?: boolean }) {
  return (
    <Card className={`border-border/50 ${accent ? "bg-gradient-to-br from-emerald-500/10 to-teal-500/10" : ""}`}>
      <CardContent className="p-4">
        <div className={`flex items-center gap-1.5 text-[11px] uppercase tracking-wider mb-1.5 ${color ?? "text-muted-foreground"}`}>
          <span className="inline-flex h-3.5 w-3.5 items-center justify-center">{icon}</span>
          {label}
        </div>
        <div className="text-2xl font-bold text-foreground">{value}</div>
      </CardContent>
    </Card>
  );
}

function FunnelRow({ label, value, max, color, accent = false }: { label: string; value: number; max: number; color: string; accent?: boolean }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className={`space-y-1 ${accent ? "rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2" : ""}`}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground">{label}</span>
        <span className="text-muted-foreground">
          <span className="font-bold text-foreground">{value}</span>{" "}
          <span className="text-xs">({pct}%)</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-background overflow-hidden">
        <div className="h-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-4 space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Skeleton className="h-48 w-full" />
      <div className="grid grid-cols-2 gap-5">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Submissions tab
// ──────────────────────────────────────────────────────────────────────

function SubmissionsTab({
  loading,
  submissions,
  ownersById,
  onRefresh,
}: {
  loading: boolean;
  submissions: SubmissionRow[];
  ownersById: Map<string, OwnerRow>;
  onRefresh: () => void;
}) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [apporteurFilter, setApporteurFilter] = useState<string>("all");

  const apporteursList = useMemo(() => {
    const uniq = new Map<string, { id: string; display_name: string; slug: string }>();
    ownersById.forEach((o) => uniq.set(o.id, { id: o.id, display_name: o.display_name, slug: o.slug }));
    return Array.from(uniq.values()).sort((a, b) => a.display_name.localeCompare(b.display_name));
  }, [ownersById]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return submissions.filter((sub) => {
      if (statusFilter !== "all" && sub.status !== statusFilter) return false;
      if (apporteurFilter !== "all" && sub.owner_id !== apporteurFilter) return false;
      if (s) {
        const hay = `${sub.first_name} ${sub.last_name} ${sub.email} ${sub.phone ?? ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [submissions, statusFilter, search, apporteurFilter]);

  const exportCsv = () => {
    const headers = [
      "date", "status", "apporteur", "slug", "first_name", "last_name", "email", "phone", "profile", "last_question", "lead_id",
    ];
    const rows = filtered.map((s) => {
      const o = ownersById.get(s.owner_id);
      return [
        s.created_at,
        s.status,
        o?.display_name ?? "",
        o?.slug ?? "",
        s.first_name,
        s.last_name,
        s.email,
        s.phone ?? "",
        s.profile ?? "",
        s.last_question_reached ?? "",
        s.lead_id ?? "",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quiz-submissions-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Chercher (prénom, nom, email, téléphone)…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm bg-background"
        />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-56 bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="email_captured">Email seulement</SelectItem>
            <SelectItem value="quiz_in_progress">Quiz en cours</SelectItem>
            <SelectItem value="quiz_completed">Quiz terminé</SelectItem>
            <SelectItem value="phone_captured">Tel capturé (lead)</SelectItem>
            <SelectItem value="whatsapp_clicked">Clic WhatsApp</SelectItem>
          </SelectContent>
        </Select>
        <Select value={apporteurFilter} onValueChange={setApporteurFilter}>
          <SelectTrigger className="w-64 bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les apporteurs</SelectItem>
            {apporteursList.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.display_name} ({a.slug})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={exportCsv} className="gap-1.5">
          <Download className="h-3.5 w-3.5" />
          Export CSV ({filtered.length})
        </Button>
        <Button variant="ghost" size="sm" onClick={onRefresh}>
          Rafraîchir
        </Button>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Aucune submission ne correspond à ces filtres.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border/40 bg-background/40">
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Statut</th>
                    <th className="px-3 py-2 font-medium">Apporteur</th>
                    <th className="px-3 py-2 font-medium">Prospect</th>
                    <th className="px-3 py-2 font-medium">Email</th>
                    <th className="px-3 py-2 font-medium">Téléphone</th>
                    <th className="px-3 py-2 font-medium">Profil</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => {
                    const o = ownersById.get(s.owner_id);
                    const st = STATUS_LABELS[s.status] ?? { label: s.status, color: "" };
                    const prof = s.profile ? PROFILE_LABELS[s.profile] : null;
                    return (
                      <tr key={s.id} className="border-b border-border/20 last:border-0 hover:bg-background/40">
                        <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(s.created_at), { addSuffix: true, locale: fr })}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant="outline" className={`text-[10px] ${st.color}`}>
                            {st.label}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {o ? (
                            <>
                              <div className="font-medium text-foreground">{o.display_name}</div>
                              <div className="text-muted-foreground">/{o.slug}</div>
                            </>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-medium text-foreground">{s.first_name} {s.last_name}</div>
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{s.email}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{s.phone ?? "—"}</td>
                        <td className="px-3 py-2">
                          {prof ? (
                            <Badge variant="outline" className={`text-[10px] ${prof.color}`}>
                              {prof.label}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
