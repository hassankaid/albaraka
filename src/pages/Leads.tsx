import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Users, UserPlus, RefreshCw, Search, Phone, Clock, PartyPopper, Inbox, ChevronDown, Instagram, Pencil, Eye, Info, Copy,
} from "lucide-react";
import LeadInstagramForm from "@/components/LeadInstagramForm";
import LeadApporteurForm from "@/components/LeadApporteurForm";
import ProcessLeadModal, { LEAD_STATUS_COLORS, LEAD_STATUS_LABELS } from "@/components/leads/ProcessLeadModal";
import ContactSheet from "@/components/ContactSheet";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { formatDateTime } from "@/lib/formatDate";

type LeadEnriched = Tables<"leads_enriched">;

const STATUS_OPTIONS = [
  { value: "all", label: "Tous" },
  { value: "a_qualifier", label: "À qualifier" },
  { value: "faux_numero", label: "Faux numéro" },
  { value: "pas_de_reponse", label: "Pas de réponse" },
  { value: "pas_qualifie", label: "Pas qualifié" },
  { value: "a_relancer", label: "À relancer" },
  { value: "perdu", label: "Perdu" },
  { value: "call_booke", label: "Call booké" },
  { value: "close", label: "Close" },
];

const CALL_TYPE_CONFIG: Record<string, { label: string; className: string }> = {
  call_vsl: { label: "Call VSL", className: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
  call_conference: { label: "Call Conférence", className: "bg-violet-500/20 text-violet-300 border-violet-500/30" },
  pole_vente: { label: "Pôle Vente", className: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
};

const SOURCE_OPTIONS = [
  { value: "all", label: "Tous" },
  { value: "vsl_a", label: "VSL A" },
  { value: "vsl_b", label: "VSL B" },
  { value: "vsl_webi", label: "VSL Webi" },
  { value: "instagram_organic", label: "Instagram Organique" },
  { value: "instagram_ads", label: "Instagram Ads" },
  { value: "apporteur", label: "Apporteur" },
];

const SOURCE_COLORS: Record<string, string> = {
  "VSL A": "bg-purple-500/20 text-purple-300 border-purple-500/30",
  "VSL B": "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "VSL Webi": "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  "Instagram Organique": "bg-pink-500/20 text-pink-300 border-pink-500/30",
  "Instagram Ads": "bg-pink-600/20 text-pink-400 border-pink-600/30",
  "Apporteur": "bg-orange-500/20 text-orange-300 border-orange-500/30",
};

const STATUS_COLORS = LEAD_STATUS_COLORS;

const STATUS_LABELS = LEAD_STATUS_LABELS;

export default function Leads() {
  const { profile: user } = useAuth();
  const { toast } = useToast();
  const [leads, setLeads] = useState<LeadEnriched[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState("a_affecter");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [collaborateurs, setCollaborateurs] = useState<{ id: string; full_name: string }[]>([]);
  const [igFormOpen, setIgFormOpen] = useState(false);
  const [apporteurFormOpen, setApporteurFormOpen] = useState(false);
  const [processLead, setProcessLead] = useState<LeadEnriched | null>(null);
  const [contactSheetId, setContactSheetId] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    const { data, error } = await supabase
      .from("leads_enriched")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) setLeads(data);
    setLoading(false);
  }, []);

  const fetchCollaborateurs = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("role", ["ceo", "collaborateur"]);
    if (data) setCollaborateurs(data);
  }, []);

  useEffect(() => {
    fetchLeads();
    fetchCollaborateurs();
  }, [fetchLeads, fetchCollaborateurs]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("leads-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, () => {
        fetchLeads();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLeads]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLeads();
    setRefreshing(false);
    toast({ title: "Données actualisées" });
  };

  const handleAssignToMe = async (leadId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("leads")
      .update({ assigned_to: user.id, assigned_at: new Date().toISOString() })
      .eq("id", leadId);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }

    await supabase.from("lead_activities").insert({
      lead_id: leadId,
      user_id: user.id,
      action: "assigned",
      old_value: null,
      new_value: user.id,
      note: null,
    });

    toast({ title: "Lead affecté avec succès" });
    fetchLeads();
  };

  const handleReassign = async (leadId: string, oldAssignedTo: string | null, newUserId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("leads")
      .update({ assigned_to: newUserId, assigned_at: new Date().toISOString() })
      .eq("id", leadId);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      await supabase.from("lead_activities").insert({
        lead_id: leadId,
        user_id: user.id,
        action: "reassigned",
        old_value: oldAssignedTo,
        new_value: newUserId,
      });
      toast({ title: "Lead réassigné avec succès" });
      fetchLeads();
    }
  };

  // Filtered leads
  const filteredLeads = useMemo(() => {
    let result = leads;

    // Tab filter
    if (tab === "a_affecter") {
      result = result.filter(
        (l) => !l.has_active_call && !l.assigned_to && l.status === "nouveau"
      );
    } else if (tab === "mes_leads" && user) {
      result = result.filter((l) => l.assigned_to === user.id);
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((l) => l.status === statusFilter);
    }

    // Source filter
    if (sourceFilter !== "all") {
      result = result.filter((l) => l.source === sourceFilter);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.raw_full_name?.toLowerCase().includes(q) ||
          l.contact_full_name?.toLowerCase().includes(q) ||
          l.raw_email?.toLowerCase().includes(q) ||
          l.contact_email?.toLowerCase().includes(q) ||
          l.raw_phone?.toLowerCase().includes(q) ||
          l.contact_phone?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [leads, tab, statusFilter, sourceFilter, search, user]);

  // Counters
  const counts = useMemo(() => ({
    total: leads.length,
    nouveaux: leads.filter((l) => l.status === "nouveau").length,
    a_affecter: leads.filter((l) => !l.has_active_call && !l.assigned_to && l.status === "nouveau").length,
    call_booke: leads.filter((l) => l.has_active_call).length,
  }), [leads]);

  const counterCards = [
    { label: "Total", value: counts.total, icon: Users, gradient: "from-purple-500/20 to-blue-500/20" },
    { label: "Nouveaux", value: counts.nouveaux, icon: Inbox, gradient: "from-muted to-muted" },
    { label: "À affecter", value: counts.a_affecter, icon: UserPlus, gradient: "from-orange-500/20 to-yellow-500/20" },
    { label: "Call booké", value: counts.call_booke, icon: Phone, gradient: "from-blue-500/20 to-cyan-500/20" },
  ];

  const emptyMessage = () => {
    if (tab === "a_affecter") {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <PartyPopper className="h-12 w-12 text-primary mb-4" />
          <p className="text-lg font-semibold text-foreground">Tous les leads sont affectés !</p>
        </div>
      );
    }
    if (tab === "mes_leads") {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-semibold text-foreground">Aucun lead assigné</p>
          <p className="text-sm text-muted-foreground mt-1">Va dans "À affecter" pour en prendre.</p>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-semibold text-foreground">Aucun lead pour le moment.</p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Leads</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Gestion des prospects</p>
        </div>
        <div className="flex items-center gap-2">
          {user?.can_add_instagram_leads && (
            <Button size="sm" onClick={() => setIgFormOpen(true)} className="bg-gradient-to-r from-pink-500 to-purple-500 text-primary-foreground text-xs gap-1.5">
              <Instagram className="h-4 w-4" />
              Lead Instagram
            </Button>
          )}
          {user?.is_also_apporteur && (
            <Button size="sm" variant="outline" onClick={() => setApporteurFormOpen(true)} className="text-xs gap-1.5 border-blue-500/40 text-blue-400 hover:bg-blue-500/10">
              <UserPlus className="h-4 w-4" />
              Apporter un lead
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Counter cards */}
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

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="a_affecter">À affecter ({counts.a_affecter})</TabsTrigger>
          <TabsTrigger value="mes_leads">Mes leads</TabsTrigger>
          <TabsTrigger value="tous">Tous ({counts.total})</TabsTrigger>
        </TabsList>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] bg-card">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[140px] bg-card">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              {SOURCE_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher nom, email, téléphone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-card"
            />
          </div>
        </div>

        {/* Table content for all tabs */}
        {["a_affecter", "mes_leads", "tous"].map((tabValue) => (
          <TabsContent key={tabValue} value={tabValue} className="mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredLeads.length === 0 ? (
              emptyMessage()
            ) : (
              <Card className="border-border/50 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead>Contact</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Call</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="w-[150px]">Setter</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.map((lead) => (
                      <TableRow key={lead.id} className="border-border hover:bg-secondary/50 transition-colors">
                        <TableCell>
                          <div>
                            <p className="font-semibold text-foreground">{lead.raw_full_name || lead.contact_full_name || "—"}</p>
                            <p className="text-xs text-muted-foreground">{lead.raw_email || lead.contact_email}</p>
                            {(() => {
                              const phone = lead.raw_phone || lead.contact_phone;
                              if (!phone) return <p className="text-xs text-muted-foreground">—</p>;
                              return (
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <a href={`tel:${phone}`} className="text-sm font-medium text-foreground hover:underline">
                                    {phone}
                                  </a>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigator.clipboard.writeText(phone);
                                      toast({ title: "Numéro copié" });
                                    }}
                                    title="Copier"
                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              );
                            })()}
                          </div>
                        </TableCell>
                        <TableCell>
                          {lead.source_label && (
                            <Badge variant="outline" className={`text-xs ${SOURCE_COLORS[lead.source_label] || ""}`}>
                              {lead.source_label}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const ct = (lead as any).call_type as string | null;
                            const config = ct ? CALL_TYPE_CONFIG[ct] : null;
                            if (config) {
                              return (
                                <Badge variant="outline" className={`text-xs ${config.className}`}>
                                  {config.label}
                                </Badge>
                              );
                            }
                            return <span className="text-sm text-muted-foreground">—</span>;
                          })()}
                        </TableCell>
                        <TableCell>
                          {lead.status && (
                            <Badge variant="outline" className={`text-xs ${STATUS_COLORS[lead.status] || ""}`}>
                              {STATUS_LABELS[lead.status] || lead.status}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {lead.assigned_to ? (
                            (lead.assigned_to === user?.id || user?.role === "ceo") ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground h-auto p-0">
                                    {lead.assigned_to_name || "Assigné"}
                                    <ChevronDown className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                  {collaborateurs
                                    .filter((c) => c.id !== lead.assigned_to)
                                    .map((c) => (
                                      <DropdownMenuItem key={c.id} onClick={() => handleReassign(lead.id!, lead.assigned_to, c.id)}>
                                        {c.full_name}
                                      </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : (
                              <span className="text-sm text-foreground">{lead.assigned_to_name}</span>
                            )
                          ) : !lead.has_active_call ? (
                            <Button size="sm" variant="outline" onClick={() => handleAssignToMe(lead.id!)} className="gap-1.5 text-xs">
                              <UserPlus className="h-3.5 w-3.5" />
                              M'affecter
                            </Button>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {lead.created_at
                              ? formatDistanceToNow(new Date(lead.created_at), { addSuffix: true, locale: fr })
                              : "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {(lead.assigned_to === user?.id || user?.role === "ceo") ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setProcessLead(lead)}
                                title="Traiter"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setProcessLead(lead)}
                                title="Consulter"
                              >
                                <Info className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {lead.contact_id && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setContactSheetId(lead.contact_id)}
                                title="Voir contact"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Forms & Modals */}
      <LeadInstagramForm open={igFormOpen} onOpenChange={setIgFormOpen} onSuccess={fetchLeads} />
      <LeadApporteurForm open={apporteurFormOpen} onOpenChange={setApporteurFormOpen} onSuccess={fetchLeads} />
      <ProcessLeadModal
        lead={processLead}
        open={!!processLead}
        onClose={() => setProcessLead(null)}
        onSuccess={fetchLeads}
        onOpenContact={(id) => setContactSheetId(id)}
      />
      <ContactSheet
        contactId={contactSheetId}
        open={!!contactSheetId}
        onClose={() => setContactSheetId(null)}
      />
    </div>
  );
}
