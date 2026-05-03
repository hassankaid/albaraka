import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { anyPhoneMatches } from "@/lib/phoneSearch";
import { Tables } from "@/integrations/supabase/types";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import type { DateRange } from "react-day-picker";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Users, UserPlus, RefreshCw, Search, Phone, Inbox, ChevronDown, Instagram, Pencil, Eye, Info, Copy,
  ChevronLeft, ChevronRight, PartyPopper, CheckSquare, UserMinus, CalendarRange, Recycle,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialogAction } from "@/components/ui/alert-dialog";
import { getDateKey } from "@/lib/formatDate";
import { fr } from "date-fns/locale";
import LeadInstagramForm from "@/components/LeadInstagramForm";
import LeadApporteurForm from "@/components/LeadApporteurForm";
import ProcessLeadModal from "@/components/leads/ProcessLeadModal";
import ContactSheet from "@/components/ContactSheet";
import {
  LEAD_STATUS_COLORS,
  LEAD_STATUS_LABELS,
  STATUS_FILTER_OPTIONS,
  SOURCE_GROUPS,
  leadSourceConfig,
  getSourceBadgeClass,
  getSourceLabel,
  getQuizCategoryBadgeClass,
  getQuizCategoryEmoji,
} from "@/lib/leadConfig";
type LeadEnriched = Tables<"leads_enriched">;

// Convert a Date picked on the calendar (browser-local interpretation)
// to a YYYY-MM-DD string based on its visible day parts — this is the day the user clicked.
const dateToYMD = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// A lead is in the logical "À recycler" queue when it has recycled_at set and no assignee.
// recycled_at is set either:
//  - instantly by ProcessLeadModal when a setter saves pas_de_reponse / pas_de_reponse_post_conference
//  - by the daily cron (recycle-stale-leads) for organic leads unassigned > 14 days
// The lead's status column remains unchanged — it still reflects the pipeline stage,
// the reason for recycling lives in the activity log (action: 'recycled').
const isRecycled = (l: Pick<LeadEnriched, "assigned_to" | "recycled_at">): boolean =>
  !l.assigned_to && !!l.recycled_at;

const COLLAB_CONFIRME_TABS = [
  { value: "a_affecter", label: "À affecter" },
  { value: "mes_leads", label: "Mes leads" },
] as const;

const COLLAB_INTERMEDIAIRE_TABS = [
  { value: "mes_leads", label: "Mes leads" },
] as const;

const CEO_TABS = [
  { value: "a_affecter", label: "À affecter" },
  { value: "a_recycler", label: "À recycler" },
  { value: "mes_leads", label: "Mes leads" },
  { value: "tous", label: "Tous" },
] as const;

export default function Leads() {
  const { profile: user } = useAuth();
  const realUser = user;
  const userTz = user?.timezone || "Europe/Paris";
  const { toast } = useToast();
  const [leads, setLeads] = useState<LeadEnriched[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Les collaborateurs intermédiaires n'ont pas l'onglet "À affecter" (ils ne
  // doivent jamais voir les coordonnées des leads qu'ils n'ont pas affectés pour
  // ne pas "griller" une cartouche prévue pour un confirmé).
  const isIntermediaire =
    user?.role === "collaborateur" && user?.collaborateur_level === "intermediaire";
  const [tab, setTab] = useState<string>(isIntermediaire ? "mes_leads" : "a_affecter");
  const [statusFilter, setStatusFilter] = useState("all");
  const ADS_SOURCES = ["vsl_a", "vsl_b", "webi", "instagram_ads", "whatsapp_ads"];
  const [sourceFilter, setSourceFilter] = useState<string[]>(ADS_SOURCES);
  const [search, setSearch] = useState("");
  const [collaborateurs, setCollaborateurs] = useState<{ id: string; full_name: string; collaborateur_level: string | null }[]>([]);
  const [apporteurs, setApporteurs] = useState<{ id: string; full_name: string }[]>([]);
  const [collabFilter, setCollabFilter] = useState("all");
  const [apporteurFilter, setApporteurFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [igFormOpen, setIgFormOpen] = useState(false);
  const [apporteurFormOpen, setApporteurFormOpen] = useState(false);
  const [processLead, setProcessLead] = useState<LeadEnriched | null>(null);
  const [contactSheetId, setContactSheetId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const [bulkConfirm, setBulkConfirm] = useState<{
    targetUserId: string;
    targetName: string;
    allIds: string[];
    alreadyAssigned: { id: string; assignedToName: string | null }[];
  } | null>(null);
  // Recyclage manuel (CEO)
  const [recycleDialog, setRecycleDialog] = useState<{ ids: string[] } | null>(null);
  const [recycleReason, setRecycleReason] = useState("");
  const [recyclingBulk, setRecyclingBulk] = useState(false);
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
      .select("id, full_name, collaborateur_level")
      .in("role", ["ceo", "collaborateur"]);
    if (data) setCollaborateurs(data);
  }, []);

  const fetchApporteurs = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "apporteur")
      .eq("is_active", true)
      .order("full_name");
    if (data) setApporteurs(data);
  }, []);

  useEffect(() => {
    fetchLeads();
    fetchCollaborateurs();
    fetchApporteurs();
  }, [fetchLeads, fetchCollaborateurs, fetchApporteurs]);

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

  const handleAssignToMe = async (leadId: string, currentStatus?: string | null) => {
    if (!realUser) return;
    const leadRow = leads.find((l) => l.id === leadId);
    const fromRecycled = !!leadRow && isRecycled(leadRow);
    const updatePayload: Record<string, unknown> = {
      assigned_to: realUser.id,
      assigned_at: new Date().toISOString(),
    };
    if (fromRecycled) {
      updatePayload.status = "a_qualifier";
      updatePayload.recycled_at = null;
    }
    const { error } = await supabase
      .from("leads")
      .update(updatePayload)
      .eq("id", leadId);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }

    await supabase.from("lead_activities").insert({
      lead_id: leadId, user_id: realUser.id, action: "assigned",
      old_value: null, new_value: realUser.id,
      note: fromRecycled ? "Réaffectation depuis recyclage" : null,
    });
    if (fromRecycled && currentStatus !== "a_qualifier") {
      await supabase.from("lead_activities").insert({
        lead_id: leadId, user_id: realUser.id, action: "status_change",
        old_value: currentStatus || null, new_value: "a_qualifier",
        note: "Réinitialisation après auto-affectation depuis recyclage",
      });
    }
    toast({ title: "Lead affecté avec succès" });
    fetchLeads();
  };

  const handleReassign = async (leadId: string, oldAssignedTo: string | null, newUserId: string, currentStatus?: string | null) => {
    if (!realUser) return;
    const leadRow = leads.find((l) => l.id === leadId);
    const fromRecycled = !!leadRow && isRecycled(leadRow);
    const updatePayload: Record<string, unknown> = {
      assigned_to: newUserId,
      assigned_at: new Date().toISOString(),
    };
    if (fromRecycled) {
      updatePayload.status = "a_qualifier";
      updatePayload.recycled_at = null;
    }
    const { error } = await supabase
      .from("leads")
      .update(updatePayload)
      .eq("id", leadId);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      await supabase.from("lead_activities").insert({
        lead_id: leadId, user_id: realUser.id, action: "reassigned",
        old_value: oldAssignedTo, new_value: newUserId,
        note: fromRecycled ? "Réaffectation depuis recyclage" : null,
      });
      if (fromRecycled && currentStatus !== "a_qualifier") {
        await supabase.from("lead_activities").insert({
          lead_id: leadId, user_id: realUser.id, action: "status_change",
          old_value: currentStatus || null, new_value: "a_qualifier",
          note: "Réinitialisation après redistribution depuis recyclage",
        });
      }
      toast({ title: "Lead réassigné avec succès" });
      fetchLeads();
    }
  };

  const handleRelease = async (leadId: string, oldAssignedToName: string | null, oldAssignedTo: string | null) => {
    if (!realUser) return;
    const { error } = await supabase
      .from("leads")
      .update({ assigned_to: null, assigned_at: null, updated_at: new Date().toISOString() })
      .eq("id", leadId);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      await supabase.from("lead_activities").insert({
        lead_id: leadId, user_id: realUser.id, action: "unassign",
        old_value: oldAssignedToName || oldAssignedTo, new_value: null,
      });
      toast({ title: "Lead libéré" });
      fetchLeads();
    }
  };

  const handleBulkAssign = async (newUserId: string) => {
    if (!realUser || selectedIds.size === 0) return;

    const ids = Array.from(selectedIds);
    // Check for leads already assigned to someone else
    const alreadyAssigned = leads
      .filter((l) => ids.includes(l.id!) && l.assigned_to && l.assigned_to !== newUserId)
      .map((l) => ({ id: l.id!, assignedToName: l.assigned_to_name || null }));

    const targetCollab = collaborateurs.find((c) => c.id === newUserId);

    if (alreadyAssigned.length > 0) {
      setBulkConfirm({
        targetUserId: newUserId,
        targetName: targetCollab?.full_name || "Collaborateur",
        allIds: ids,
        alreadyAssigned,
      });
      return;
    }

    await executeBulkAssign(ids, newUserId);
  };

  const executeBulkAssign = async (ids: string[], newUserId: string) => {
    if (!realUser) return;
    setBulkAssigning(true);

    // Capture statuses BEFORE update so we can log the transition per lead
    const leadsBefore = leads.filter((l) => l.id && ids.includes(l.id));

    const { error } = await supabase
      .from("leads")
      .update({
        assigned_to: newUserId,
        assigned_at: new Date().toISOString(),
        status: "a_qualifier",
        recycled_at: null,
      })
      .in("id", ids);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      const activities: any[] = [];
      for (const l of leadsBefore) {
        activities.push({
          lead_id: l.id, user_id: realUser.id, action: "reassigned",
          old_value: l.assigned_to || null, new_value: newUserId,
          note: "Affectation en masse depuis recyclage",
        });
        // Log the status transition if it actually changes
        if (l.status && l.status !== "a_qualifier") {
          activities.push({
            lead_id: l.id, user_id: realUser.id, action: "status_change",
            old_value: l.status, new_value: "a_qualifier",
            note: "Réinitialisation après redistribution depuis recyclage",
          });
        }
      }
      await supabase.from("lead_activities").insert(activities);
      toast({ title: `${ids.length} leads affectés avec succès` });
      setSelectedIds(new Set());
      fetchLeads();
    }
    setBulkAssigning(false);
    setBulkConfirm(null);
  };

  // Recyclage manuel (CEO uniquement) — système indépendant du cron et du recyclage instantané "pas_de_reponse"
  const handleManualRecycle = async (ids: string[], reason: string) => {
    if (!realUser || ids.length === 0) return;
    setRecyclingBulk(true);
    try {
      const { data, error } = await (supabase as any).rpc("manual_recycle_leads", {
        p_lead_ids: ids,
        p_reason: reason.trim() || null,
      });
      if (error) throw new Error(error.message);
      const recycledCount = (data as any)?.recycled_count ?? ids.length;
      toast({ title: `${recycledCount} lead${recycledCount > 1 ? "s" : ""} envoyé${recycledCount > 1 ? "s" : ""} dans À recycler` });
      setSelectedIds(new Set());
      setRecycleDialog(null);
      setRecycleReason("");
      fetchLeads();
    } catch (err: any) {
      toast({ title: "Erreur", description: err?.message || "Recyclage impossible", variant: "destructive" });
    } finally {
      setRecyclingBulk(false);
    }
  };

  const isCeo = user?.role === "ceo";

  // Scoped leads: collaborateurs only see their own (except "À affecter")
  const scopedLeads = useMemo(() => {
    if (isCeo) return leads;
    if (!user) return [];
    return leads.filter(l => l.assigned_to === user.id);
  }, [leads, user, isCeo]);

  // Counts
  const myLeadsCount = useMemo(() => {
    if (!user) return 0;
    return leads.filter(l => l.assigned_to === user.id).length;
  }, [leads, user]);

  const counts = useMemo(() => ({
    total: scopedLeads.length,
    aQualifier: scopedLeads.filter((l) => l.status === "a_qualifier").length,
    a_affecter: leads.filter((l) =>
      !l.assigned_to
      && !l.recycled_at
      && !["call_booke", "close", "perdu"].includes(l.status || "")
    ).length,
    a_recycler: leads.filter((l) => isRecycled(l)).length,
    call_booke: scopedLeads.filter((l) => l.status === "call_booke").length,
    mes_leads: myLeadsCount,
  }), [scopedLeads, leads, myLeadsCount]);

  // Filtered leads
  const filteredLeads = useMemo(() => {
    let result: LeadEnriched[];

    if (tab === "a_affecter") {
      // Always show ALL unassigned leads for everyone (excluding recycled queue)
      result = leads.filter((l) =>
        !l.assigned_to
        && !l.recycled_at
        && !["call_booke", "close", "perdu"].includes(l.status || "")
      );
    } else if (tab === "a_recycler") {
      // Logical "À recycler" queue: unassigned leads with recycled_at set
      result = leads.filter((l) => isRecycled(l));
    } else if (tab === "mes_leads") {
      result = user ? leads.filter((l) => l.assigned_to === user.id) : [];
    } else {
      // "tous" — scoped for collaborateurs
      result = scopedLeads;
    }

    if (statusFilter !== "all") result = result.filter((l) => l.status === statusFilter);
    if (sourceFilter.length > 0) result = result.filter((l) => l.source && sourceFilter.includes(l.source));
    if (collabFilter !== "all") result = result.filter((l) => l.assigned_to === collabFilter);
    if (apporteurFilter !== "all") result = result.filter((l) => l.apporteur_id === apporteurFilter);

    if (dateRange?.from && dateRange?.to) {
      const fromKey = dateToYMD(dateRange.from);
      const toKey = dateToYMD(dateRange.to);
      result = result.filter((l) => {
        if (!l.created_at) return false;
        const leadKey = getDateKey(l.created_at, userTz);
        return leadKey >= fromKey && leadKey <= toKey;
      });
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((l) =>
        l.raw_full_name?.toLowerCase().includes(q) ||
        l.contact_full_name?.toLowerCase().includes(q) ||
        l.raw_email?.toLowerCase().includes(q) ||
        l.contact_email?.toLowerCase().includes(q) ||
        anyPhoneMatches([l.raw_phone, l.contact_phone], search)
      );
    }

    return result;
  }, [leads, scopedLeads, tab, statusFilter, sourceFilter, collabFilter, apporteurFilter, search, dateRange, userTz, user]);

  useEffect(() => {
    setPage(0);
    setSelectedIds(new Set());
    setSourceFilter(tab === "a_affecter" ? ADS_SOURCES : []);
    setCollabFilter("all");
    setApporteurFilter("all");
    setDateRange(undefined);
  }, [tab]);

  useEffect(() => { setPage(0); }, [statusFilter, sourceFilter.length, search, collabFilter, apporteurFilter, dateRange]);

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
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      timeZone: userTz,
      day: "numeric",
      month: "short",
    });
  };

  const formatRangeLabel = (d: Date): string =>
    d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

  return (
    <div className="space-y-4">
      {/* Top bar: KPIs + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm font-bold text-foreground">{filteredLeads.length}</span>
            <span className="text-xs text-muted-foreground">résultats</span>
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
            <Button size="sm" onClick={() => setIgFormOpen(true)} className="bg-gradient-to-r from-gold-400 to-gold-600 text-primary-foreground text-xs gap-1.5">
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

      {/* Tabs + search row */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center bg-card border border-border rounded-lg p-0.5">
          {(isCeo
            ? CEO_TABS
            : isIntermediaire
              ? COLLAB_INTERMEDIAIRE_TABS
              : COLLAB_CONFIRME_TABS
          ).map((t) => (
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
              {t.value === "a_affecter" ? ` (${counts.a_affecter})`
                : t.value === "a_recycler" ? ` (${counts.a_recycler})`
                : t.value === "mes_leads" ? ` (${counts.mes_leads})`
                : t.value === "tous" ? ` (${counts.total})`
                : ""}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, email, téléphone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs bg-card"
          />
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs bg-card gap-1.5 justify-between">
              {sourceFilter.length === 0 ? "Sources" : `${sourceFilter.length} source${sourceFilter.length > 1 ? "s" : ""}`}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[250px] p-2" align="start">
            <div className="space-y-3">
              {SOURCE_GROUPS.map((group) => {
                const groupSources = group.sources as readonly string[];
                const selectedInGroup = groupSources.filter((s) => sourceFilter.includes(s));
                const allSelected = selectedInGroup.length === groupSources.length;
                const someSelected = selectedInGroup.length > 0 && !allSelected;

                return (
                  <div key={group.label}>
                    <button
                      className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-md hover:bg-secondary/60 transition-colors"
                      onClick={() => {
                        if (allSelected) {
                          setSourceFilter((prev) => prev.filter((s) => !groupSources.includes(s)));
                        } else {
                          setSourceFilter((prev) => [
                            ...prev.filter((s) => !groupSources.includes(s)),
                            ...groupSources,
                          ]);
                        }
                      }}
                    >
                      <Checkbox
                        checked={allSelected ? true : someSelected ? "indeterminate" : false}
                        className="pointer-events-none"
                      />
                      <span className="text-xs font-semibold text-foreground">{group.label}</span>
                    </button>
                    <div className="ml-4 mt-1 space-y-0.5">
                      {groupSources.map((srcKey) => {
                        const isSelected = sourceFilter.includes(srcKey);
                        const cfg = leadSourceConfig[srcKey];
                        if (!cfg) return null;
                        return (
                          <button
                            key={srcKey}
                            className="flex items-center gap-2 w-full text-left px-2 py-1 rounded-md hover:bg-secondary/40 transition-colors"
                            onClick={() => {
                              setSourceFilter((prev) =>
                                isSelected ? prev.filter((v) => v !== srcKey) : [...prev, srcKey]
                              );
                            }}
                          >
                            <Checkbox checked={isSelected} className="pointer-events-none" />
                            <span className="text-xs text-muted-foreground">{cfg.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            {sourceFilter.length > 0 && (
              <div className="border-t border-border mt-2 pt-2">
                <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setSourceFilter([])}>
                  Réinitialiser
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs bg-card gap-1.5">
              <CalendarRange className="h-3.5 w-3.5" />
              {dateRange?.from && dateRange?.to
                ? `${formatRangeLabel(dateRange.from)} – ${formatRangeLabel(dateRange.to)}`
                : "Période"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={1}
              locale={fr}
              weekStartsOn={1}
            />
            {(dateRange?.from || dateRange?.to) && (
              <div className="border-t border-border p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => setDateRange(undefined)}
                >
                  Effacer la période
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] h-7 text-xs bg-card">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTER_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.value === "all" ? "Statut : Tous" : s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isCeo && (
          <>
            <Select value={collabFilter} onValueChange={setCollabFilter}>
              <SelectTrigger className="w-[150px] h-7 text-xs bg-card">
                <SelectValue placeholder="Collaborateur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Collab : Tous</SelectItem>
                {collaborateurs.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={apporteurFilter} onValueChange={setApporteurFilter}>
              <SelectTrigger className="w-[150px] h-7 text-xs bg-card">
                <SelectValue placeholder="Apporteur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Apporteur : Tous</SelectItem>
                {apporteurs.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}

        {(statusFilter !== "all" || collabFilter !== "all" || apporteurFilter !== "all" || sourceFilter.length > 0 || dateRange?.from) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground"
            onClick={() => {
              setStatusFilter("all");
              setCollabFilter("all");
              setApporteurFilter("all");
              setSourceFilter(tab === "a_affecter" ? ADS_SOURCES : []);
              setDateRange(undefined);
            }}
          >
            Réinitialiser
          </Button>
        )}
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
          {/* Bulk action bar */}
          {isCeo && selectedIds.size > 0 && (
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-primary/10 border border-primary/20">
              <CheckSquare className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">{selectedIds.size} lead{selectedIds.size > 1 ? "s" : ""} sélectionné{selectedIds.size > 1 ? "s" : ""}</span>
              {tab === "a_recycler" ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" className="gap-1.5 text-xs" disabled={bulkAssigning}>
                      <UserPlus className="h-3.5 w-3.5" />
                      Affecter en masse
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {collaborateurs.map((c) => (
                      <DropdownMenuItem key={c.id} onClick={() => handleBulkAssign(c.id)}>
                        {c.full_name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  size="sm"
                  className="gap-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-white border-0"
                  onClick={() => setRecycleDialog({ ids: Array.from(selectedIds) })}
                  disabled={recyclingBulk}
                >
                  <Recycle className="h-3.5 w-3.5" />
                  Envoyer dans À recycler
                </Button>
              )}
              <Button size="sm" variant="ghost" className="text-xs text-muted-foreground" onClick={() => setSelectedIds(new Set())}>
                Désélectionner
              </Button>
            </div>
          )}

          <div className="rounded-lg border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  {isCeo && (
                    <TableHead className="w-[40px]">
                      <input
                        type="checkbox"
                        className="rounded border-border"
                        checked={paginatedLeads.length > 0 && paginatedLeads.every((l) => selectedIds.has(l.id!))}
                        onChange={(e) => {
                          const next = new Set(selectedIds);
                          paginatedLeads.forEach((l) => {
                            if (e.target.checked) next.add(l.id!);
                            else next.delete(l.id!);
                          });
                          setSelectedIds(next);
                        }}
                      />
                    </TableHead>
                  )}
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
                  <TableRow key={lead.id} className={`border-border hover:bg-secondary/50 transition-colors ${selectedIds.has(lead.id!) ? "bg-primary/5" : ""}`}>
                    {isCeo && (
                      <TableCell>
                        <input
                          type="checkbox"
                          className="rounded border-border"
                          checked={selectedIds.has(lead.id!)}
                          onChange={(e) => {
                            const next = new Set(selectedIds);
                            if (e.target.checked) next.add(lead.id!);
                            else next.delete(lead.id!);
                            setSelectedIds(next);
                          }}
                        />
                      </TableCell>
                    )}
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
                      <div className="flex flex-col gap-1">
                        {lead.source && (
                          <Badge variant="outline" className={`text-[10px] leading-tight w-fit ${getSourceBadgeClass(lead.source, lead.source_detail)}`}>
                            {getSourceLabel(lead.source, lead.source_detail)}
                          </Badge>
                        )}
                        {(lead as any).quiz_category && typeof (lead as any).quiz_score === "number" && (
                          <Badge variant="outline" className={`text-[10px] leading-tight w-fit ${getQuizCategoryBadgeClass((lead as any).quiz_category)}`} title={`Score Quiz Scoring : ${(lead as any).quiz_score}/70`}>
                            {getQuizCategoryEmoji((lead as any).quiz_category)} {(lead as any).quiz_score}/70
                          </Badge>
                        )}
                      </div>
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
                                  <DropdownMenuItem key={c.id} onClick={() => handleReassign(lead.id!, lead.assigned_to, c.id, lead.status)}>
                                    {c.full_name}
                                  </DropdownMenuItem>
                                ))}
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleRelease(lead.id!, lead.assigned_to_name, lead.assigned_to)}
                              >
                                <UserMinus className="h-3.5 w-3.5 mr-2" />
                                Libérer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <span className="text-xs text-foreground">{lead.assigned_to_name}</span>
                        )
                      ) : isRecycled(lead) && isCeo ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline" className="gap-1 text-[11px] h-7 px-2">
                              <UserPlus className="h-3 w-3" />
                              Affecter
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {collaborateurs.map((c) => (
                                <DropdownMenuItem key={c.id} onClick={() => handleReassign(lead.id!, null, c.id, lead.status)}>
                                  {c.full_name}
                                </DropdownMenuItem>
                              ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : !lead.has_active_call && !lead.recycled_at && !["call_booke", "close", "perdu"].includes(lead.status || "") && (isCeo || user?.collaborateur_level === "confirme") ? (
                        <Button size="sm" variant="outline" onClick={() => handleAssignToMe(lead.id!, lead.status)} className="gap-1 text-[11px] h-7 px-2">
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
                        {isCeo && !isRecycled(lead) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
                            onClick={() => setRecycleDialog({ ids: [lead.id!] })}
                            title="Envoyer dans À recycler"
                          >
                            <Recycle className="h-3.5 w-3.5" />
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

      {/* Confirmation dialog for bulk assign conflicts */}
      <AlertDialog open={!!bulkConfirm} onOpenChange={(open) => !open && setBulkConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leads déjà assignés</AlertDialogTitle>
            <AlertDialogDescription>
              {bulkConfirm && (
                <>
                  <strong>{bulkConfirm.alreadyAssigned.length}</strong> lead{bulkConfirm.alreadyAssigned.length > 1 ? "s" : ""} sur{" "}
                  <strong>{bulkConfirm.allIds.length}</strong> {bulkConfirm.allIds.length > 1 ? "sont" : "est"} déjà assigné{bulkConfirm.allIds.length > 1 ? "s" : ""} à un collaborateur.
                  <br />
                  Voulez-vous quand même les réaffecter à <strong>{bulkConfirm.targetName}</strong> ?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            {bulkConfirm && bulkConfirm.alreadyAssigned.length < bulkConfirm.allIds.length && (
              <Button
                variant="outline"
                onClick={() => {
                  const excludeIds = new Set(bulkConfirm.alreadyAssigned.map((a) => a.id));
                  const onlyNew = bulkConfirm.allIds.filter((id) => !excludeIds.has(id));
                  executeBulkAssign(onlyNew, bulkConfirm.targetUserId);
                }}
                disabled={bulkAssigning}
              >
                Affecter uniquement les non-assignés ({bulkConfirm.allIds.length - bulkConfirm.alreadyAssigned.length})
              </Button>
            )}
            {bulkConfirm && (
              <Button
                onClick={() => executeBulkAssign(bulkConfirm.allIds, bulkConfirm.targetUserId)}
                disabled={bulkAssigning}
              >
                Tout réaffecter ({bulkConfirm.allIds.length})
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation dialog for manual recycling (CEO only) */}
      <AlertDialog open={!!recycleDialog} onOpenChange={(open) => { if (!open) { setRecycleDialog(null); setRecycleReason(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Recycle className="h-5 w-5 text-amber-500" />
              Envoyer dans À recycler
            </AlertDialogTitle>
            <AlertDialogDescription>
              {recycleDialog && (
                <>
                  <strong>{recycleDialog.ids.length}</strong> lead{recycleDialog.ids.length > 1 ? "s" : ""} {recycleDialog.ids.length > 1 ? "seront désaffectés et envoyés" : "sera désaffecté et envoyé"} dans la section À recycler. Le statut actuel est préservé.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 pt-2">
            <label className="text-xs font-medium text-muted-foreground">Raison (optionnel)</label>
            <Textarea
              value={recycleReason}
              onChange={(e) => setRecycleReason(e.target.value)}
              placeholder="Ex : Sabrina en arrêt maladie, réattribution des leads…"
              rows={2}
              className="resize-none"
            />
            <p className="text-[11px] text-muted-foreground">Consigné dans l'historique de chaque lead recyclé.</p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={recyclingBulk}>Annuler</AlertDialogCancel>
            <Button
              className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white border-0"
              onClick={() => recycleDialog && handleManualRecycle(recycleDialog.ids, recycleReason)}
              disabled={recyclingBulk}
            >
              <Recycle className="h-4 w-4" />
              {recyclingBulk ? "Recyclage…" : `Recycler ${recycleDialog?.ids.length ?? 0} lead${(recycleDialog?.ids.length ?? 0) > 1 ? "s" : ""}`}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
