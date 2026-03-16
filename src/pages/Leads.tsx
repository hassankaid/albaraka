import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Users, UserPlus, RefreshCw, Search, Phone, Inbox, ChevronDown, Instagram, Pencil, Eye, Info, Copy,
  ChevronLeft, ChevronRight, PartyPopper,
} from "lucide-react";
import LeadInstagramForm from "@/components/LeadInstagramForm";
import LeadApporteurForm from "@/components/LeadApporteurForm";
import ProcessLeadModal from "@/components/leads/ProcessLeadModal";
import ContactSheet from "@/components/ContactSheet";
import {
  LEAD_STATUS_COLORS,
  LEAD_STATUS_LABELS,
  STATUS_FILTER_OPTIONS,
  SOURCE_FILTER_OPTIONS,
  getSourceBadgeClass,
  getSourceLabel,
} from "@/lib/leadConfig";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type LeadEnriched = Tables<"leads_enriched">;

const TABS = [
  { value: "a_affecter", label: "À affecter" },
  { value: "mes_leads", label: "Mes leads" },
  { value: "tous", label: "Tous" },
] as const;

export default function Leads() {
  const { profile: user } = useAuth();
  const { toast } = useToast();
  const [leads, setLeads] = useState<LeadEnriched[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<string>("a_affecter");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [collaborateurs, setCollaborateurs] = useState<{ id: string; full_name: string }[]>([]);
  const [igFormOpen, setIgFormOpen] = useState(false);
  const [apporteurFormOpen, setApporteurFormOpen] = useState(false);
  const [processLead, setProcessLead] = useState<LeadEnriched | null>(null);
  const [contactSheetId, setContactSheetId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const fetchLeads = useCallback(async () => {
    let allLeads: LeadEnriched[] = [];
    let from = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from("leads_enriched")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, from + batchSize - 1);

      if (error || !data) { hasMore = false; break; }
      allLeads = allLeads.concat(data);
      hasMore = data.length >= batchSize;
      from += batchSize;
    }

    setLeads(allLeads);
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

  useEffect(() => {
    const channel = supabase
      .channel("leads-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, () => fetchLeads())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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
      lead_id: leadId, user_id: user.id, action: "assigned",
      old_value: null, new_value: user.id, note: null,
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
        lead_id: leadId, user_id: user.id, action: "reassigned",
        old_value: oldAssignedTo, new_value: newUserId,
      });
      toast({ title: "Lead réassigné avec succès" });
      fetchLeads();
    }
  };

  // Counts
  const counts = useMemo(() => ({
    total: leads.length,
    aQualifier: leads.filter((l) => l.status === "a_qualifier").length,
    a_affecter: leads.filter((l) => !l.assigned_to && !["call_booke", "close", "perdu"].includes(l.status || "")).length,
    call_booke: leads.filter((l) => l.status === "call_booke").length,
  }), [leads]);

  // Filtered leads
  const filteredLeads = useMemo(() => {
    let result = leads;

    if (tab === "a_affecter") {
      result = result.filter((l) => !l.assigned_to && !["call_booke", "close", "perdu"].includes(l.status || ""));
    } else if (tab === "mes_leads" && user) {
      result = result.filter((l) => l.assigned_to === user.id);
    }

    if (statusFilter !== "all") result = result.filter((l) => l.status === statusFilter);
    if (sourceFilter !== "all") result = result.filter((l) => l.source === sourceFilter);

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((l) =>
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

  useEffect(() => { setPage(0); }, [tab, statusFilter, sourceFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / PAGE_SIZE));
  const paginatedLeads = useMemo(
    () => filteredLeads.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [filteredLeads, page]
  );

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

  const formatShortDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return format(new Date(dateStr), "d MMM", { locale: fr });
  };

  return (
    <div className="space-y-4">
      {/* Top bar: KPIs + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm font-bold text-foreground">{counts.total}</span>
            <span className="text-xs text-muted-foreground">leads</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border">
            <span className="text-sm font-bold text-foreground">{counts.aQualifier}</span>
            <span className="text-xs text-muted-foreground">à qualifier</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-orange-500/30">
            <UserPlus className="h-3.5 w-3.5 text-orange-400" />
            <span className="text-sm font-bold text-foreground">{counts.a_affecter}</span>
            <span className="text-xs text-muted-foreground">à affecter</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border">
            <Phone className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-sm font-bold text-foreground">{counts.call_booke}</span>
            <span className="text-xs text-muted-foreground">call booké</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {user?.can_add_instagram_leads && (
            <Button size="sm" onClick={() => setIgFormOpen(true)} className="bg-gradient-to-r from-pink-500 to-purple-500 text-primary-foreground text-xs gap-1.5">
              <Instagram className="h-3.5 w-3.5" />
              Lead IG
            </Button>
          )}
          {user?.is_also_apporteur && (
            <Button size="sm" variant="outline" onClick={() => setApporteurFormOpen(true)} className="text-xs gap-1.5 border-blue-500/40 text-blue-400 hover:bg-blue-500/10">
              <UserPlus className="h-3.5 w-3.5" />
              Apporter
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRefresh} disabled={refreshing} title="Actualiser">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Tabs + filters row */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center bg-card border border-border rounded-lg p-0.5">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                tab === t.value
                  ? "gradient-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              {t.value === "a_affecter" ? ` (${counts.a_affecter})` : t.value === "tous" ? ` (${counts.total})` : ""}
            </button>
          ))}
        </div>

        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[130px] h-8 text-xs bg-card">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            {SOURCE_FILTER_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] h-8 text-xs bg-card">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTER_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs bg-card"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredLeads.length === 0 ? (
        emptyMessage()
      ) : (
        <>
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="w-[220px]">Contact</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Apporteur</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-[140px]">Setter</TableHead>
                  <TableHead className="w-[80px]">Date</TableHead>
                  <TableHead className="w-[70px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLeads.map((lead) => (
                  <TableRow key={lead.id} className="border-border hover:bg-secondary/50 transition-colors">
                    {/* Contact */}
                    <TableCell>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground text-sm truncate">{lead.raw_full_name || lead.contact_full_name || "—"}</p>
                        {lead.raw_email || lead.contact_email ? (
                          <p className="text-xs text-muted-foreground truncate">{lead.raw_email || lead.contact_email}</p>
                        ) : null}
                        {(() => {
                          const phone = lead.raw_phone || lead.contact_phone;
                          if (!phone) return null;
                          return (
                            <div className="flex items-center gap-1 mt-0.5">
                              <a href={`tel:${phone}`} className="text-xs text-muted-foreground hover:text-foreground hover:underline truncate">
                                {phone}
                              </a>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(phone);
                                  toast({ title: "Numéro copié" });
                                }}
                                className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                    </TableCell>
                    {/* Source */}
                    <TableCell>
                      {lead.source && (
                        <Badge variant="outline" className={`text-[10px] leading-tight ${getSourceBadgeClass(lead.source)}`}>
                          {getSourceLabel(lead.source)}
                        </Badge>
                      )}
                    </TableCell>
                    {/* Apporteur */}
                    <TableCell>
                      <span className="text-xs text-muted-foreground">{lead.apporteur_name || "—"}</span>
                    </TableCell>
                    {/* Statut */}
                    <TableCell>
                      {lead.status && (
                        <Badge variant="outline" className={`text-[10px] leading-tight ${LEAD_STATUS_COLORS[lead.status] || ""}`}>
                          {LEAD_STATUS_LABELS[lead.status] || lead.status}
                        </Badge>
                      )}
                    </TableCell>
                    {/* Setter */}
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
                          <span className="text-xs text-foreground">{lead.assigned_to_name}</span>
                        )
                      ) : !lead.has_active_call && !["call_booke", "close", "perdu"].includes(lead.status || "") ? (
                        <Button size="sm" variant="outline" onClick={() => handleAssignToMe(lead.id!)} className="gap-1 text-[11px] h-7 px-2">
                          <UserPlus className="h-3 w-3" />
                          M'affecter
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    {/* Date */}
                    <TableCell>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatShortDate(lead.created_at)}
                      </span>
                    </TableCell>
                    {/* Actions */}
                    <TableCell>
                      <div className="flex items-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setProcessLead(lead)}
                          title={lead.assigned_to === user?.id || user?.role === "ceo" ? "Traiter" : "Consulter"}
                        >
                          {lead.assigned_to === user?.id || user?.role === "ceo" ? (
                            <Pencil className="h-3.5 w-3.5" />
                          ) : (
                            <Info className="h-3.5 w-3.5" />
                          )}
                        </Button>
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
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredLeads.length)} sur {filteredLeads.length}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                  Préc.
                </Button>
                <span className="text-xs text-muted-foreground">{page + 1}/{totalPages}</span>
                <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                  Suiv.
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

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
