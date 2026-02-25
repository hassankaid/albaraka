import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tables } from "@/integrations/supabase/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Clock, CheckCircle2, Euro, UserPlus, RefreshCw, Phone } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";
import LeadApporteurForm from "@/components/LeadApporteurForm";

type LeadEnriched = Tables<"leads_enriched">;

const STATUS_COLORS: Record<string, string> = {
  nouveau: "bg-muted text-muted-foreground border-border",
  contacte: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  call_booke: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  converti: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  perdu: "bg-red-500/20 text-red-300 border-red-500/30",
};

const STATUS_LABELS: Record<string, string> = {
  nouveau: "Nouveau", contacte: "Contacté", call_booke: "Call booké",
  converti: "Converti", perdu: "Perdu",
};

const COMMISSION_STATUS_COLORS: Record<string, string> = {
  pending: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  paid: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
};

const COMMISSION_STATUS_LABELS: Record<string, string> = {
  pending: "En attente", paid: "Payée",
};

interface CommissionRow {
  id: string;
  role: string;
  percentage: number;
  amount: number | null;
  status: string | null;
  created_at: string | null;
  sale_product: string | null;
  sale_amount: number | null;
  sale_date: string | null;
}

export default function MySpace() {
  const { profile } = useAuth();
  const [leads, setLeads] = useState<LeadEnriched[]>([]);
  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  // Stats
  const [totalLeads, setTotalLeads] = useState(0);
  const [enCours, setEnCours] = useState(0);
  const [convertis, setConvertis] = useState(0);
  const [totalCommissions, setTotalCommissions] = useState(0);

  const fetchData = useCallback(async () => {
    if (!profile) return;
    const userId = profile.id;

    // Fetch all in parallel
    const [
      totalRes, enCoursRes, convertisRes, commissionsAmountRes, leadsRes, commissionsDetailRes,
    ] = await Promise.all([
      supabase.from("leads").select("*", { count: "exact", head: true }).eq("apporteur_id", userId),
      supabase.from("leads").select("*", { count: "exact", head: true }).eq("apporteur_id", userId).not("status", "in", '("converti","perdu")'),
      supabase.from("leads").select("*", { count: "exact", head: true }).eq("apporteur_id", userId).eq("status", "converti"),
      supabase.from("commissions").select("amount").eq("beneficiary_user_id", userId),
      supabase.from("leads_enriched").select("*").eq("apporteur_id", userId).order("created_at", { ascending: false }),
      supabase.from("commissions").select(`*, sales!commissions_sale_id_fkey(product, amount_ht, sold_at)`).eq("beneficiary_user_id", userId).order("created_at", { ascending: false }),
    ]);

    setTotalLeads(totalRes.count || 0);
    setEnCours(enCoursRes.count || 0);
    setConvertis(convertisRes.count || 0);
    setTotalCommissions(commissionsAmountRes.data?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0);
    setLeads(leadsRes.data || []);

    setCommissions(
      (commissionsDetailRes.data || []).map((c: any) => ({
        id: c.id,
        role: c.role,
        percentage: c.percentage,
        amount: c.amount,
        status: c.status,
        created_at: c.created_at,
        sale_product: c.sales?.product || null,
        sale_amount: c.sales?.amount_ht || null,
        sale_date: c.sales?.sold_at || null,
      }))
    );

    setLoading(false);
  }, [profile]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const counterCards = [
    { label: "Leads apportés", value: totalLeads, icon: Users, gradient: "from-purple-500/20 to-blue-500/20" },
    { label: "En cours", value: enCours, icon: Clock, gradient: "from-orange-500/20 to-yellow-500/20" },
    { label: "Convertis", value: convertis, icon: CheckCircle2, gradient: "from-emerald-500/20 to-teal-500/20" },
    {
      label: "Commissions totales",
      value: `${totalCommissions.toLocaleString("fr-FR")} €`,
      icon: Euro,
      gradient: "from-blue-500/20 to-cyan-500/20",
    },
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
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Mon espace apporteur</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Bienvenue {profile?.full_name}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {counterCards.map((c) => (
          <Card key={c.label} className={`bg-gradient-to-br ${c.gradient} border-border/50 backdrop-blur-sm`}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-background/50">
                <c.icon className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{c.value}</p>
                <p className="text-xs text-muted-foreground">{c.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* CTA */}
      <div>
        <Button onClick={() => setFormOpen(true)} className="gradient-primary text-primary-foreground gap-2">
          <UserPlus className="h-4 w-4" />
          Apporter un lead
        </Button>
      </div>

      {/* Mes leads */}
      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-foreground">Mes leads</h3>
        {leads.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="p-8 text-center">
              <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-foreground font-medium">Aucun lead apporté</p>
              <p className="text-sm text-muted-foreground mt-1">Cliquez sur "Apporter un lead" pour commencer.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Desktop */}
            <Card className="border-border/50 overflow-hidden hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead>Contact</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Call prévu</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id} className="border-border hover:bg-secondary/50 transition-colors">
                      <TableCell>
                        <div>
                          <p className="font-semibold text-foreground">{lead.contact_full_name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{lead.contact_email}</p>
                          <p className="text-xs text-muted-foreground">{lead.contact_phone}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {lead.created_at
                          ? formatDistanceToNow(new Date(lead.created_at), { addSuffix: true, locale: fr })
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {lead.status && (
                          <Badge variant="outline" className={`text-xs ${STATUS_COLORS[lead.status] || ""}`}>
                            {STATUS_LABELS[lead.status] || lead.status}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {lead.has_active_call && lead.call_scheduled_at ? (
                          <Badge variant="outline" className="text-xs bg-blue-500/20 text-blue-300 border-blue-500/30">
                            <Phone className="h-3 w-3 mr-1" />
                            {format(new Date(lead.call_scheduled_at), "dd/MM à HH:mm", { locale: fr })}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>

            {/* Mobile */}
            <div className="space-y-3 md:hidden">
              {leads.map((lead) => (
                <Card key={lead.id} className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{lead.contact_full_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{lead.contact_email}</p>
                      </div>
                      {lead.status && (
                        <Badge variant="outline" className={`text-xs ${STATUS_COLORS[lead.status] || ""}`}>
                          {STATUS_LABELS[lead.status] || lead.status}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span>{lead.created_at ? formatDistanceToNow(new Date(lead.created_at), { addSuffix: true, locale: fr }) : ""}</span>
                      {lead.has_active_call && lead.call_scheduled_at && (
                        <>
                          <span>•</span>
                          <Badge variant="outline" className="text-xs bg-blue-500/20 text-blue-300 border-blue-500/30">
                            📞 {format(new Date(lead.call_scheduled_at), "dd/MM HH:mm", { locale: fr })}
                          </Badge>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Mes commissions */}
      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-foreground">Mes commissions</h3>
        {commissions.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="p-8 text-center">
              <Euro className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-foreground font-medium">Aucune commission pour le moment</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Desktop */}
            <Card className="border-border/50 overflow-hidden hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead>Vente</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>%</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissions.map((c) => (
                    <TableRow key={c.id} className="border-border hover:bg-secondary/50 transition-colors">
                      <TableCell className="text-foreground">{c.sale_product || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground capitalize">{c.role}</TableCell>
                      <TableCell className="text-sm text-foreground">{c.percentage}%</TableCell>
                      <TableCell className="font-semibold text-foreground">
                        {c.amount != null ? `${c.amount.toLocaleString("fr-FR")} €` : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${COMMISSION_STATUS_COLORS[c.status || "pending"] || ""}`}>
                          {COMMISSION_STATUS_LABELS[c.status || "pending"] || c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.created_at ? format(new Date(c.created_at), "dd MMM yyyy", { locale: fr }) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Total row */}
                  <TableRow className="border-border bg-secondary/30">
                    <TableCell colSpan={3} className="font-semibold text-foreground">Total</TableCell>
                    <TableCell className="font-bold text-foreground">
                      {totalCommissions.toLocaleString("fr-FR")} €
                    </TableCell>
                    <TableCell colSpan={2} />
                  </TableRow>
                </TableBody>
              </Table>
            </Card>

            {/* Mobile */}
            <div className="space-y-3 md:hidden">
              {commissions.map((c) => (
                <Card key={c.id} className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{c.sale_product || "Vente"}</p>
                        <p className="text-xs text-muted-foreground capitalize">{c.role} · {c.percentage}%</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-foreground">
                          {c.amount != null ? `${c.amount.toLocaleString("fr-FR")} €` : "—"}
                        </p>
                        <Badge variant="outline" className={`text-xs ${COMMISSION_STATUS_COLORS[c.status || "pending"] || ""}`}>
                          {COMMISSION_STATUS_LABELS[c.status || "pending"] || c.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Card className="border-border/50 bg-secondary/30">
                <CardContent className="p-4 flex justify-between">
                  <p className="font-semibold text-foreground">Total commissions</p>
                  <p className="font-bold text-foreground">{totalCommissions.toLocaleString("fr-FR")} €</p>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </section>

      <LeadApporteurForm open={formOpen} onOpenChange={setFormOpen} onSuccess={fetchData} />
    </div>
  );
}
