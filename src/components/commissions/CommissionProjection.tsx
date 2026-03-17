import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, TrendingUp, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ROLE_CONFIG } from "@/lib/roleConfig";

interface CommissionData {
  amount: number;
  status: string | null;
  paid_at: string | null;
  role: string;
  beneficiary_user_id: string | null;
  beneficiary_external: string | null;
  beneficiary_name: string;
  payment_due_date: string | null;
  payment_paid_at: string | null;
  contact_name: string;
  sale_product: string;
  percentage: number;
}

interface MonthData {
  month: string; // YYYY-MM
  label: string;
  projected: number;
  paid: number;
  due: number;
  pending: number;
  cancelled: number;
}

interface CommissionProjectionProps {
  /** If set, only show commissions for this user */
  userId?: string;
  /** If set, filter by role source category */
  roleSourceFilter?: string;
}

export default function CommissionProjection({ userId, roleSourceFilter }: CommissionProjectionProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [commissions, setCommissions] = useState<CommissionData[]>([]);
  const [beneficiaryFilter, setBeneficiaryFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const ROLE_SOURCE_CATEGORY: Record<string, string> = {
    apporteur: "apporteur",
    setter: "collaborateur",
    closer: "collaborateur",
    agence_marketing: "collaborateur",
    collaborateur: "collaborateur",
  };

  const fetchData = useCallback(async () => {
    let query = supabase
      .from("commissions")
      .select(`
        amount, status, paid_at, role,
        beneficiary_user_id, beneficiary_external,
        profiles!commissions_beneficiary_user_id_fkey(full_name),
        sales!commissions_sale_id_fkey(
          product,
          contacts!sales_contact_id_fkey(full_name)
        ),
        payments!commissions_payment_id_fkey(due_date, paid_at),
        percentage
      `)
      .not("payment_id", "is", null);

    if (userId) {
      query = query.eq("beneficiary_user_id", userId);
    }

    const { data } = await query;

    if (data) {
      let mapped = data.map((c: any) => ({
        amount: c.amount || 0,
        status: c.status,
        paid_at: c.paid_at,
        role: c.role,
        beneficiary_user_id: c.beneficiary_user_id,
        beneficiary_external: c.beneficiary_external,
        beneficiary_name: c.profiles?.full_name || c.beneficiary_external || "—",
        payment_due_date: c.payments?.due_date || null,
        payment_paid_at: c.payments?.paid_at || null,
        contact_name: c.sales?.contacts?.full_name || "—",
        sale_product: c.sales?.product || "—",
        percentage: c.percentage,
      }));
      if (roleSourceFilter) {
        mapped = mapped.filter(c => (ROLE_SOURCE_CATEGORY[c.role] || "collaborateur") === roleSourceFilter);
      }
      setCommissions(mapped);
    }
    setLoading(false);
  }, [userId, roleSourceFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Unique beneficiaries
  const beneficiaries = useMemo(() => {
    const map = new Map<string, string>();
    commissions.forEach((c) => {
      const key = c.beneficiary_user_id || c.beneficiary_external || "unknown";
      if (!map.has(key)) map.set(key, c.beneficiary_name);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [commissions]);

  // Filtered commissions
  const filtered = useMemo(() => {
    return commissions.filter((c) => {
      if (beneficiaryFilter !== "all") {
        const key = c.beneficiary_user_id || c.beneficiary_external || "unknown";
        if (key !== beneficiaryFilter) return false;
      }
      if (roleFilter !== "all" && c.role !== roleFilter) return false;
      return true;
    });
  }, [commissions, beneficiaryFilter, roleFilter]);

  // Group by month: paid/due/invoiced → by payment_paid_at, pending/cancelled → by due_date
  const monthlyData = useMemo(() => {
    const map = new Map<string, MonthData>();

    filtered.forEach((c) => {
      const isPaidOrDue = ["paid", "due", "invoiced"].includes(c.status || "");
      const dateRef = isPaidOrDue ? (c.payment_paid_at || c.payment_due_date) : c.payment_due_date;
      if (!dateRef) return;
      const monthKey = dateRef.substring(0, 7); // YYYY-MM
      if (!map.has(monthKey)) {
        const [y, m] = monthKey.split("-");
        const date = new Date(parseInt(y), parseInt(m) - 1);
        map.set(monthKey, {
          month: monthKey,
          label: date.toLocaleDateString("fr-FR", { month: "short", year: "numeric" }),
          projected: 0,
          paid: 0,
          due: 0,
          pending: 0,
          cancelled: 0,
        });
      }
      const entry = map.get(monthKey)!;
      const amt = c.amount || 0;
      entry.projected += amt;
      if (c.status === "paid") entry.paid += amt;
      else if (c.status === "due" || c.status === "invoiced") entry.due += amt;
      else if (c.status === "cancelled") entry.cancelled += amt;
      else entry.pending += amt;
    });

    return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [filtered]);

  // Detail for selected month (same logic as grouping)
  const monthDetail = useMemo(() => {
    if (!selectedMonth) return [];
    return filtered.filter((c) => {
      const isPaidOrDue = ["paid", "due", "invoiced"].includes(c.status || "");
      const dateRef = isPaidOrDue ? (c.payment_paid_at || c.payment_due_date) : c.payment_due_date;
      return dateRef?.startsWith(selectedMonth);
    });
  }, [filtered, selectedMonth]);

  // Totals
  const totalProjected = monthlyData.reduce((s, m) => s + m.projected, 0);
  const totalPaid = monthlyData.reduce((s, m) => s + m.paid, 0);
  const totalDue = monthlyData.reduce((s, m) => s + m.due, 0);
  const totalPending = monthlyData.reduce((s, m) => s + m.pending, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border">
          <TrendingUp className="h-3.5 w-3.5 text-primary" />
          <span className="text-sm font-bold text-foreground">{totalProjected.toLocaleString("fr-FR")} €</span>
          <span className="text-xs text-muted-foreground">total projeté</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-sm font-bold text-foreground">{totalPaid.toLocaleString("fr-FR")} €</span>
          <span className="text-xs text-muted-foreground">payées</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border">
          <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-sm font-bold text-foreground">{totalDue.toLocaleString("fr-FR")} €</span>
          <span className="text-xs text-muted-foreground">à payer</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-bold text-foreground">{totalPending.toLocaleString("fr-FR")} €</span>
          <span className="text-xs text-muted-foreground">en attente</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {!userId && (
          <Select value={beneficiaryFilter} onValueChange={(v) => { setBeneficiaryFilter(v); setSelectedMonth(null); }}>
            <SelectTrigger className="w-[200px] h-8 text-xs bg-card">
              <SelectValue placeholder="Tous les bénéficiaires" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les bénéficiaires</SelectItem>
              {beneficiaries.map(([key, name]) => (
                <SelectItem key={key} value={key}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {!roleSourceFilter && (
          <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setSelectedMonth(null); }}>
            <SelectTrigger className="w-[130px] h-8 text-xs bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous rôles</SelectItem>
              <SelectItem value="apporteur">Apporteur</SelectItem>
              <SelectItem value="setter">Setter</SelectItem>
              <SelectItem value="closer">Closer</SelectItem>
              <SelectItem value="agence_marketing">Agence</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Chart */}
      {monthlyData.length > 0 && (
        <div className="rounded-lg border border-border/50 bg-card p-4">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={monthlyData}
              onClick={(e) => {
                if (e?.activeLabel) {
                  const clicked = monthlyData.find((m) => m.label === e.activeLabel);
                  if (clicked) setSelectedMonth(clicked.month === selectedMonth ? null : clicked.month);
                }
              }}
            >
              <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-muted-foreground" />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v.toLocaleString("fr-FR")} €`} width={80} />
              <Tooltip
                formatter={(value: number, name: string) => [`${value.toLocaleString("fr-FR")} €`, name]}
                contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                itemStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Bar dataKey="paid" name="Payées" fill="hsl(142, 71%, 45%)" stackId="a" radius={[0, 0, 0, 0]} />
              <Bar dataKey="due" name="À payer" fill="hsl(38, 92%, 50%)" stackId="a" />
              <Bar dataKey="pending" name="En attente" fill="hsl(var(--muted-foreground))" stackId="a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-muted-foreground text-center mt-2">Cliquez sur un mois pour voir le détail</p>
        </div>
      )}

      {/* Monthly summary table */}
      <div className="rounded-lg border border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead>Mois</TableHead>
              <TableHead className="text-right">Projeté</TableHead>
              <TableHead className="text-right">Payé</TableHead>
              <TableHead className="text-right">À payer</TableHead>
              <TableHead className="text-right">En attente</TableHead>
              <TableHead className="text-right">Annulé</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {monthlyData.map((m) => (
              <TableRow
                key={m.month}
                className={`border-border cursor-pointer transition-colors ${
                  selectedMonth === m.month ? "bg-secondary" : "hover:bg-secondary/50"
                }`}
                onClick={() => setSelectedMonth(m.month === selectedMonth ? null : m.month)}
              >
                <TableCell className="font-medium text-foreground text-sm capitalize">{m.label}</TableCell>
                <TableCell className="text-right font-semibold text-sm text-foreground">{m.projected.toLocaleString("fr-FR")} €</TableCell>
                <TableCell className="text-right text-sm text-emerald-400">{m.paid.toLocaleString("fr-FR")} €</TableCell>
                <TableCell className="text-right text-sm text-amber-400">{m.due.toLocaleString("fr-FR")} €</TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">{m.pending.toLocaleString("fr-FR")} €</TableCell>
                <TableCell className="text-right text-sm text-destructive">{m.cancelled > 0 ? `${m.cancelled.toLocaleString("fr-FR")} €` : "—"}</TableCell>
              </TableRow>
            ))}
            {/* Total row */}
            <TableRow className="border-border bg-muted/30 font-bold">
              <TableCell className="text-foreground text-sm">Total</TableCell>
              <TableCell className="text-right text-sm text-foreground">{totalProjected.toLocaleString("fr-FR")} €</TableCell>
              <TableCell className="text-right text-sm text-emerald-400">{totalPaid.toLocaleString("fr-FR")} €</TableCell>
              <TableCell className="text-right text-sm text-amber-400">{totalDue.toLocaleString("fr-FR")} €</TableCell>
              <TableCell className="text-right text-sm text-muted-foreground">{totalPending.toLocaleString("fr-FR")} €</TableCell>
              <TableCell className="text-right text-sm text-destructive">
                {monthlyData.reduce((s, m) => s + m.cancelled, 0) > 0
                  ? `${monthlyData.reduce((s, m) => s + m.cancelled, 0).toLocaleString("fr-FR")} €`
                  : "—"}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Month detail */}
      {selectedMonth && monthDetail.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">
            Détail — {monthlyData.find((m) => m.month === selectedMonth)?.label}
          </h3>
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Bénéficiaire</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead>%</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthDetail.map((c, i) => {
                  const cfg = ROLE_CONFIG[c.role];
                  const statusMap: Record<string, { label: string; cls: string }> = {
                    paid: { label: "Payée", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
                    due: { label: "À payer", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
                    invoiced: { label: "Facturée", cls: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
                    pending: { label: "En attente", cls: "bg-muted text-muted-foreground border-border" },
                    cancelled: { label: "Annulée", cls: "bg-destructive/15 text-destructive border-destructive/30" },
                  };
                  const st = statusMap[c.status || "pending"] || statusMap.pending;
                  return (
                    <TableRow key={i} className="border-border hover:bg-secondary/50">
                      <TableCell className="text-sm font-medium text-foreground">{c.beneficiary_name}</TableCell>
                      <TableCell>
                        {cfg ? (
                          <Badge variant="outline" className={`text-[10px] ${cfg.class}`}>
                            {cfg.label}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">{c.role}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{c.contact_name}</TableCell>
                      <TableCell className="text-xs text-foreground">{c.sale_product}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{c.percentage}%</TableCell>
                      <TableCell className="text-right font-semibold text-sm text-foreground">
                        {c.amount.toLocaleString("fr-FR")} €
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${st.cls}`}>{st.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
