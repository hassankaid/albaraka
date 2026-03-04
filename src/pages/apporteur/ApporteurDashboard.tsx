import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, ShoppingCart, TrendingUp, Euro, UserPlus, RefreshCw, ArrowRight, CheckCircle2, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { formatDateOnly } from "@/lib/formatDate";
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS } from "@/lib/leadConfig";
import LeadApporteurForm from "@/components/LeadApporteurForm";

type PeriodFilter = "this_month" | "last_month" | "this_year" | "all";

function getPeriodRange(period: PeriodFilter): { from: string | null; to: string | null } {
  const now = new Date();
  if (period === "all") return { from: null, to: null };
  if (period === "this_month") {
    return { from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString() };
  }
  if (period === "last_month") {
    return { from: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(), to: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString() };
  }
  return { from: new Date(now.getFullYear(), 0, 1).toISOString(), to: new Date(now.getFullYear(), 11, 31, 23, 59, 59).toISOString() };
}

function maskPhone(phone: string | null): string {
  if (!phone) return "—";
  // Keep last 4 digits visible
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 6) return phone;
  const last4 = digits.slice(-4);
  const prefix = phone.slice(0, phone.length - 4).replace(/\d(?=.*\d{0})/g, "");
  // Simple masking: show prefix format + XX XX + last 4
  return phone.replace(/\d{4}$/, last4).replace(/\d(?=\d{4})/g, (m, offset) => {
    const posFromEnd = phone.length - 1 - offset;
    return posFromEnd >= 4 && posFromEnd < phone.replace(/\D/g, "").length - 0 ? "X" : m;
  });
}

function maskPhoneSimple(phone: string | null): string {
  if (!phone) return "—";
  const clean = phone.replace(/\D/g, "");
  if (clean.length <= 4) return phone;
  const last4 = clean.slice(-4);
  // Format: +XX X XX XX XX XX with last 4 visible
  if (clean.length >= 11) {
    return `+${clean.slice(0, 2)} ${clean.slice(2, 3)} XX XX ${last4.slice(0, 2)} ${last4.slice(2)}`;
  }
  // Shorter numbers: 0X XX XX XX XX
  if (clean.length === 10) {
    return `0${clean.slice(1, 2)} XX XX ${last4.slice(0, 2)} ${last4.slice(2)}`;
  }
  return phone.slice(0, phone.length - 4).replace(/\d/g, "X") + last4;
}

interface CommissionItem {
  id: string;
  sale_id: string;
  amount: number | null;
  status: string | null;
  client_name: string | null;
  payment_number: number | null;
  total_payments: number | null;
  payment_paid_at: string | null;
  payment_due_date: string | null;
}

interface LeadItem {
  id: string;
  full_name: string | null;
  phone: string | null;
  status: string | null;
  created_at: string;
}

export default function ApporteurDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<PeriodFilter>("this_month");
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  // Data
  const [allCommissions, setAllCommissions] = useState<CommissionItem[]>([]);
  const [perfLeads, setPerfLeads] = useState(0);
  const [perfSales, setPerfSales] = useState(0);
  const [perfCA, setPerfCA] = useState(0);
  const [perfCollected, setPerfCollected] = useState(0);
  const [recentLeads, setRecentLeads] = useState<LeadItem[]>([]);

  const fetchData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const userId = profile.id;
    const { from, to } = getPeriodRange(period);

    // Leads count for performance (filtered)
    let leadsQ = supabase.from("leads").select("*", { count: "exact", head: true }).eq("apporteur_id", userId);
    if (from) leadsQ = leadsQ.gte("created_at", from);
    if (to) leadsQ = leadsQ.lte("created_at", to);

    // Sales for performance (filtered) - include amount + payments
    let salesQ = supabase.from("sales").select("amount_ht, lead_id, leads!sales_lead_id_fkey(apporteur_id), payments!payments_sale_id_fkey(amount, status)");
    if (from) salesQ = salesQ.gte("sold_at", from);
    if (to) salesQ = salesQ.lte("sold_at", to);

    const [commRes, leadsRes, salesRes, recentLeadsRes] = await Promise.all([
      // All commissions (no period filter)
      supabase.from("commissions")
        .select("*, sales!commissions_sale_id_fkey(contacts!sales_contact_id_fkey(full_name)), payments!commissions_payment_id_fkey(payment_number, total_payments, paid_at, due_date)")
        .eq("beneficiary_user_id", userId)
        .eq("role", "apporteur")
        .order("created_at", { ascending: false }),
      leadsQ,
      salesQ,
      // Recent leads - also fetch raw_phone as fallback
      supabase.from("leads_enriched")
        .select("id, contact_full_name, contact_phone, raw_phone, status, created_at")
        .eq("apporteur_id", userId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    // Commissions
    setAllCommissions((commRes.data || []).map((c: any) => ({
      id: c.id,
      sale_id: c.sale_id,
      amount: c.amount,
      status: c.status,
      client_name: c.sales?.contacts?.full_name || null,
      payment_number: c.payments?.payment_number || null,
      total_payments: c.payments?.total_payments || null,
      payment_paid_at: c.payments?.paid_at || null,
      payment_due_date: c.payments?.due_date || null,
    })));

    // Perf
    setPerfLeads(leadsRes.count || 0);
    const mySales = (salesRes.data || []).filter((s: any) => s.leads?.apporteur_id === userId);
    setPerfSales(mySales.length);
    setPerfCA(mySales.reduce((sum: number, s: any) => sum + (s.amount_ht || 0), 0));
    setPerfCollected(mySales.reduce((sum: number, s: any) => {
      const paid = (s.payments || []).filter((p: any) => p.status === "paid");
      return sum + paid.reduce((ps: number, p: any) => ps + (p.amount || 0), 0);
    }, 0));

    // Recent leads
    setRecentLeads((recentLeadsRes.data || []).map((l: any) => ({
      id: l.id,
      full_name: l.contact_full_name,
      phone: l.contact_phone || l.raw_phone,
      status: l.status,
      created_at: l.created_at,
    })));

    setLoading(false);
  }, [profile, period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Commission KPIs (global, no filter) ──
  const notCancelled = allCommissions.filter(c => c.status !== "cancelled");
  const uniqueSaleIds = new Set(notCancelled.map(c => c.sale_id));
  const totalPrevu = notCancelled.reduce((s, c) => s + (c.amount || 0), 0);
  const totalRecevoir = allCommissions.filter(c => ["due", "invoiced"].includes(c.status || "")).reduce((s, c) => s + (c.amount || 0), 0);
  const totalRecu = allCommissions.filter(c => c.status === "paid").reduce((s, c) => s + (c.amount || 0), 0);
  const totalPending = allCommissions.filter(c => c.status === "pending").reduce((s, c) => s + (c.amount || 0), 0);
  const totalCancelled = allCommissions.filter(c => c.status === "cancelled").reduce((s, c) => s + (c.amount || 0), 0);
  const totalAll = totalRecu + totalRecevoir + totalPending + totalCancelled;

  // ── Progress bar ──
  const progressSegments = useMemo(() => {
    if (totalAll <= 0) return [];
    const segs = [
      { color: "#22c55e", width: (totalRecu / totalAll) * 100 },
      { color: "#f59e0b", width: (totalRecevoir / totalAll) * 100 },
      { color: "#6b7280", width: (totalPending / totalAll) * 100 },
    ];
    if (totalCancelled > 0) {
      segs.push({ color: "#ef4444", width: (totalCancelled / totalAll) * 100 });
    }
    return segs;
  }, [totalAll, totalRecu, totalRecevoir, totalPending, totalCancelled]);

  // ── Upcoming commissions ──
  const upcoming = useMemo(() => {
    const dueItems = allCommissions
      .filter(c => ["due", "invoiced"].includes(c.status || ""))
      .sort((a, b) => (a.payment_due_date || "").localeCompare(b.payment_due_date || ""));
    const pendingItems = allCommissions
      .filter(c => c.status === "pending")
      .sort((a, b) => (a.payment_due_date || "").localeCompare(b.payment_due_date || ""));
    return [...dueItems, ...pendingItems];
  }, [allCommissions]);

  // ── Conversion rate ──
  const conversionRate = perfLeads > 0 ? Math.round((perfSales / perfLeads) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ═══ 1. HEADER ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Bienvenue, {profile?.full_name?.split(" ")[0]} 👋</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Votre espace apporteur d'affaires</p>
        </div>
        <Button onClick={() => setFormOpen(true)} className="gradient-primary text-primary-foreground gap-2">
          <UserPlus className="h-4 w-4" />
          Ajouter un lead
        </Button>
      </div>

      {/* ═══ 2. MES COMMISSIONS (global) ═══ */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Mes Commissions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-border/50 bg-gradient-to-br from-blue-500/10 to-cyan-500/10">
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-foreground">{totalPrevu.toLocaleString("fr-FR")} €</p>
              <p className="text-xs text-muted-foreground">Total prévu ({uniqueSaleIds.size} vente{uniqueSaleIds.size > 1 ? "s" : ""})</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-gradient-to-br from-orange-500/10 to-yellow-500/10">
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-foreground">{totalRecevoir.toLocaleString("fr-FR")} €</p>
              <p className="text-xs text-muted-foreground">À recevoir</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-gradient-to-br from-emerald-500/10 to-teal-500/10">
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-foreground">{totalRecu.toLocaleString("fr-FR")} €</p>
              <p className="text-xs text-muted-foreground">Reçu</p>
            </CardContent>
          </Card>
        </div>

        {totalAll > 0 && (
          <div className="space-y-2">
            <div className="h-3 w-full rounded-full overflow-hidden flex bg-secondary">
              {progressSegments.map((seg, i) => (
                seg.width > 0 && (
                  <div key={i} className="h-full transition-all" style={{ width: `${seg.width}%`, backgroundColor: seg.color }} />
                )
              ))}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#22c55e" }} />
                {totalRecu.toLocaleString("fr-FR")} € reçu
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#f59e0b" }} />
                {totalRecevoir.toLocaleString("fr-FR")} € à recevoir
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#6b7280" }} />
                {totalPending.toLocaleString("fr-FR")} € en attente
              </span>
            </div>
          </div>
        )}
      </section>

      {/* ═══ 3. MES PERFORMANCES (filtré) ═══ */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Mes Performances</h3>
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
            <SelectTrigger className="w-36 bg-card h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">Ce mois</SelectItem>
              <SelectItem value="last_month">Mois dernier</SelectItem>
              <SelectItem value="this_year">Cette année</SelectItem>
              <SelectItem value="all">Tout</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card className="border-border/50 bg-gradient-to-br from-purple-500/10 to-blue-500/10">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-background/50"><Users className="h-5 w-5 text-foreground" /></div>
              <div>
                <p className="text-2xl font-bold text-foreground">{perfLeads}</p>
                <p className="text-xs text-muted-foreground">Leads remontés</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-gradient-to-br from-emerald-500/10 to-teal-500/10">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-background/50"><ShoppingCart className="h-5 w-5 text-foreground" /></div>
              <div>
                <p className="text-2xl font-bold text-foreground">{perfSales}</p>
                <p className="text-xs text-muted-foreground">Ventes</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-gradient-to-br from-blue-500/10 to-cyan-500/10">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-background/50"><Euro className="h-5 w-5 text-foreground" /></div>
              <div>
                <p className="text-2xl font-bold text-foreground">{perfCA.toLocaleString("fr-FR")} €</p>
                <p className="text-xs text-muted-foreground">CA généré</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-gradient-to-br from-orange-500/10 to-yellow-500/10">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-background/50"><Euro className="h-5 w-5 text-foreground" /></div>
              <div>
                <p className="text-2xl font-bold text-foreground">{perfCollected.toLocaleString("fr-FR")} €</p>
                <p className="text-xs text-muted-foreground">CA collecté</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-gradient-to-br from-pink-500/10 to-rose-500/10">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-background/50"><TrendingUp className="h-5 w-5 text-foreground" /></div>
              <div>
                <p className="text-2xl font-bold text-foreground">{conversionRate}%</p>
                <p className="text-xs text-muted-foreground">Taux de conversion</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ═══ 4. PROCHAINES COMMISSIONS ═══ */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Prochaines Commissions</h3>
          <Button variant="ghost" size="sm" className="text-muted-foreground text-xs" onClick={() => navigate("/my-space/commissions")}>
            Voir tout <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
        {upcoming.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="p-6 text-center">
              <CheckCircle2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Aucune commission à venir</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {upcoming.slice(0, 5).map((c) => {
              const isDue = ["due", "invoiced"].includes(c.status || "");
              return (
                <Card key={c.id} className="border-border/50">
                  <CardContent className="p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: isDue ? "#f59e0b" : "#6b7280" }} />
                      <span className="font-semibold text-foreground text-sm truncate">{c.client_name || "—"}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                        Mensualité {c.payment_number || "?"}/{c.total_payments || "?"}
                      </span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {isDue && c.payment_paid_at
                          ? `Payée le ${formatDateOnly(c.payment_paid_at)}`
                          : c.payment_due_date
                            ? `Échéance ${formatDateOnly(c.payment_due_date)}`
                            : "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-bold text-foreground text-sm">
                        {c.amount != null ? `${c.amount.toLocaleString("fr-FR")} €` : "—"}
                      </span>
                      <Badge variant="outline" className={`text-xs whitespace-nowrap ${isDue
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                        : "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
                      }`}>
                        {isDue ? "À recevoir" : "En attente"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* ═══ 5. MES LEADS RÉCENTS ═══ */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Mes Leads Récents</h3>
          <Button variant="ghost" size="sm" className="text-muted-foreground text-xs" onClick={() => navigate("/my-space/leads")}>
            Voir tout <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
        {recentLeads.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="p-6 text-center">
              <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Aucun lead pour le moment</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {recentLeads.map((lead) => (
              <Card key={lead.id} className="border-border/50">
                <CardContent className="p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="font-semibold text-foreground text-sm truncate">{lead.full_name || "—"}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {maskPhoneSimple(lead.phone)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {lead.status && (
                      <Badge variant="outline" className={`text-xs ${LEAD_STATUS_COLORS[lead.status] || "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"}`}>
                        {LEAD_STATUS_LABELS[lead.status] || lead.status}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true, locale: fr })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <LeadApporteurForm open={formOpen} onOpenChange={setFormOpen} onSuccess={fetchData} />
    </div>
  );
}
