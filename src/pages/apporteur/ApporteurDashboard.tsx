import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, ShoppingCart, TrendingUp, Euro, Clock, UserPlus, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

type PeriodFilter = "this_month" | "last_month" | "this_year" | "all";

function getPeriodRange(period: PeriodFilter): { from: string | null; to: string | null } {
  const now = new Date();
  if (period === "all") return { from: null, to: null };
  if (period === "this_month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
    return { from, to };
  }
  if (period === "last_month") {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
    return { from, to };
  }
  // this_year
  const from = new Date(now.getFullYear(), 0, 1).toISOString();
  const to = new Date(now.getFullYear(), 11, 31, 23, 59, 59).toISOString();
  return { from, to };
}

interface ActivityEvent {
  id: string;
  type: "lead_added" | "lead_converted" | "commission_received";
  label: string;
  date: string;
}

export default function ApporteurDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<PeriodFilter>("this_month");
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({ leads: 0, sales: 0, ca: 0, commissionsTotal: 0, commissionsPending: 0 });
  const [activity, setActivity] = useState<ActivityEvent[]>([]);

  const fetchData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const userId = profile.id;
    const { from, to } = getPeriodRange(period);

    // Build leads query
    let leadsQ = supabase.from("leads").select("*", { count: "exact", head: true }).eq("apporteur_id", userId);
    if (from) leadsQ = leadsQ.gte("created_at", from);
    if (to) leadsQ = leadsQ.lte("created_at", to);

    // Converted leads (sales via lead_id)
    let salesQ = supabase.from("sales").select("amount_ht, lead_id, leads!sales_lead_id_fkey(apporteur_id)");
    if (from) salesQ = salesQ.gte("sold_at", from);
    if (to) salesQ = salesQ.lte("sold_at", to);

    // Commissions
    let commissionsQ = supabase.from("commissions").select("amount, status").eq("beneficiary_user_id", userId);
    if (from) commissionsQ = commissionsQ.gte("created_at", from);
    if (to) commissionsQ = commissionsQ.lte("created_at", to);

    // Recent leads for activity
    const recentLeadsQ = supabase.from("leads").select("id, created_at, status, raw_full_name")
      .eq("apporteur_id", userId).order("created_at", { ascending: false }).limit(5);

    // Recent commissions for activity
    const recentCommQ = supabase.from("commissions").select("id, created_at, amount, status")
      .eq("beneficiary_user_id", userId).eq("status", "paid").order("created_at", { ascending: false }).limit(5);

    const [leadsRes, salesRes, commissionsRes, recentLeadsRes, recentCommRes] = await Promise.all([
      leadsQ, salesQ, commissionsQ, recentLeadsQ, recentCommQ,
    ]);

    const leadsCount = leadsRes.count || 0;

    // Filter sales where the lead belongs to this apporteur
    const mySales = (salesRes.data || []).filter((s: any) => s.leads?.apporteur_id === userId);
    const salesCount = mySales.length;
    const ca = mySales.reduce((sum: number, s: any) => sum + (s.amount_ht || 0), 0);

    const allComm = commissionsRes.data || [];
    const commissionsTotal = allComm.reduce((sum, c) => sum + (c.amount || 0), 0);
    const commissionsPending = allComm.filter(c => c.status === "pending").reduce((sum, c) => sum + (c.amount || 0), 0);

    setKpis({ leads: leadsCount, sales: salesCount, ca, commissionsTotal, commissionsPending });

    // Build activity feed
    const events: ActivityEvent[] = [];
    (recentLeadsRes.data || []).forEach((l) => {
      if (l.status === "close" || l.status === "converti") {
        events.push({ id: `conv-${l.id}`, type: "lead_converted", label: `Lead ${l.raw_full_name || ""} converti`, date: l.created_at! });
      } else {
        events.push({ id: `lead-${l.id}`, type: "lead_added", label: `Lead ${l.raw_full_name || ""} ajouté`, date: l.created_at! });
      }
    });
    (recentCommRes.data || []).forEach((c) => {
      events.push({ id: `comm-${c.id}`, type: "commission_received", label: `Commission de ${c.amount?.toLocaleString("fr-FR")} € reçue`, date: c.created_at! });
    });
    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setActivity(events.slice(0, 5));

    setLoading(false);
  }, [profile, period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const kpiCards = [
    { label: "Leads remontés", value: kpis.leads, icon: Users, gradient: "from-purple-500/20 to-blue-500/20" },
    { label: "Ventes", value: kpis.sales, icon: ShoppingCart, gradient: "from-emerald-500/20 to-teal-500/20" },
    { label: "CA généré", value: `${kpis.ca.toLocaleString("fr-FR")} €`, icon: TrendingUp, gradient: "from-blue-500/20 to-cyan-500/20" },
    { label: "Commissions gagnées", value: `${kpis.commissionsTotal.toLocaleString("fr-FR")} €`, icon: Euro, gradient: "from-orange-500/20 to-yellow-500/20" },
    { label: "Commissions en attente", value: `${kpis.commissionsPending.toLocaleString("fr-FR")} €`, icon: Clock, gradient: "from-pink-500/20 to-rose-500/20" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Bienvenue, {profile?.full_name?.split(" ")[0]}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Votre espace apporteur d'affaires</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
            <SelectTrigger className="w-40 bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">Ce mois</SelectItem>
              <SelectItem value="last_month">Mois dernier</SelectItem>
              <SelectItem value="this_year">Cette année</SelectItem>
              <SelectItem value="all">Tout</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => navigate("/my-space/leads")} className="gradient-primary text-primary-foreground gap-2">
            <UserPlus className="h-4 w-4" />
            Ajouter un lead
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {kpiCards.map((c) => (
          <Card key={c.label} className={`bg-gradient-to-br ${c.gradient} border-border/50 backdrop-blur-sm`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-background/50">
                  <c.icon className="h-4 w-4 text-foreground" />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{c.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{c.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-foreground">Activité récente</h3>
        {activity.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="p-6 text-center text-muted-foreground">
              Aucune activité récente
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/50 divide-y divide-border">
            {activity.map((ev) => (
              <div key={ev.id} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    ev.type === "lead_added" ? "bg-blue-400" :
                    ev.type === "lead_converted" ? "bg-emerald-400" : "bg-orange-400"
                  }`} />
                  <span className="text-sm text-foreground">{ev.label}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(ev.date), { addSuffix: true, locale: fr })}
                </span>
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}
