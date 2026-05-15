import { useState, useEffect, useMemo, useCallback, type ReactNode } from "react";
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
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
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
} from "@/lib/leadConfig";
import {
  CATEGORY_LABELS as SCORING_CATEGORY_LABELS,
  CATEGORY_BADGES as SCORING_CATEGORY_BADGES,
  CATEGORY_EMOJIS as SCORING_CATEGORY_EMOJIS,
  type Category as ScoringCategory,
} from "@/lib/leadScoring";
// Vue leads_enriched étendue avec les colonnes scoring (quiz_*) et any_call_*.
// Les types Supabase régénérés ne reflètent pas encore ces colonnes — on type-
// cast côté usage. À synchroniser avec types.ts à la prochaine régénération.
type LeadEnriched = Tables<"leads_enriched"> & {
  quiz_filled?: boolean | null;
  quiz_score?: number | null;
  quiz_category?: ScoringCategory | null;
  quiz_completed_at?: string | null;
  quiz_flags?: string[] | null;
  quiz_answers?: Record<string, string> | null;
  any_call_id?: string | null;
  any_call_scheduled_at?: string | null;
  any_call_status?: string | null;
  has_any_call?: boolean | null;
  // Lead auto-libéré du pot apporteur vers le pool "À affecter" via le cron
  // hebdomadaire (lundi 00h Europe/Paris). NULL = lead jamais passé par la
  // bascule (== pas issu d'un apport, ou apport encore dans la semaine en cours).
  auto_released_at?: string | null;
};

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

// ─────────────────────────────────────────────────────────────────
// Combobox d'affectation : liste searchable d'utilisateurs (CEO,
// collaborateurs, apporteurs) groupée par rôle. Utilisé partout où
// le CEO ou un délégué can_assign_leads choisit à qui affecter
// un lead (réassign, "Affecter" sur recyclé, bulk assign).
// ─────────────────────────────────────────────────────────────────
type Assignee = {
  id: string;
  full_name: string;
  role: string;
  collaborateur_level: string | null;
};

const ROLE_BADGE_LABEL = (a: Assignee): string => {
  if (a.role === "ceo") return "CEO";
  if (a.role === "apporteur") return "Apporteur";
  if (a.collaborateur_level === "confirme") return "Collab confirmé";
  if (a.collaborateur_level === "intermediaire") return "Collab intermédiaire";
  return "Collab";
};

const ROLE_BADGE_CLASS = (role: string): string => {
  if (role === "ceo") return "bg-amber-500/15 text-amber-300 border-amber-500/20";
  if (role === "apporteur") return "bg-cyan-500/15 text-cyan-300 border-cyan-500/20";
  return "bg-blue-500/15 text-blue-300 border-blue-500/20";
};

const ROLE_GROUP_ORDER: { key: string; label: string }[] = [
  { key: "ceo", label: "CEO" },
  { key: "collab_confirme", label: "Collaborateurs confirmés" },
  { key: "collab_intermediaire", label: "Collaborateurs intermédiaires" },
  { key: "apporteur", label: "Apporteurs" },
];

function groupKeyOf(a: Assignee): string {
  if (a.role === "ceo") return "ceo";
  if (a.role === "apporteur") return "apporteur";
  if (a.collaborateur_level === "intermediaire") return "collab_intermediaire";
  return "collab_confirme";
}

interface AssigneeComboboxProps {
  assignees: Assignee[];
  onSelect: (id: string) => void;
  triggerNode: ReactNode;
  excludeId?: string | null; // ne propose pas le user déjà assigné
  align?: "start" | "center" | "end";
  searchPlaceholder?: string;
}

function AssigneeCombobox({
  assignees,
  onSelect,
  triggerNode,
  excludeId,
  align = "start",
  searchPlaceholder = "Rechercher...",
}: AssigneeComboboxProps) {
  const [open, setOpen] = useState(false);
  // Tri alphabétique global (ignore les groupes pour ordonner) puis on regroupe par rôle.
  // Garantit que dans chaque groupe, les noms sont en A→Z.
  const sorted = [...(excludeId ? assignees.filter((a) => a.id !== excludeId) : assignees)]
    .sort((a, b) => a.full_name.localeCompare(b.full_name, "fr", { sensitivity: "base" }));
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{triggerNode}</PopoverTrigger>
      {/*
        collisionPadding évite que le popover ne se colle exactement au bord
        de l'écran, et la max-height dynamique (--radix-popper-available-height)
        garantit que le popover ne dépasse jamais en haut/bas de l'écran.
      */}
      <PopoverContent
        className="w-[280px] p-0"
        align={align}
        collisionPadding={12}
        style={{ maxHeight: "var(--radix-popper-available-height)" }}
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} className="h-9" />
          <CommandList className="max-h-[calc(var(--radix-popper-available-height)-3rem)]">
            <CommandEmpty>Aucun résultat.</CommandEmpty>
            {ROLE_GROUP_ORDER.map((group) => {
              const items = sorted.filter((a) => groupKeyOf(a) === group.key);
              if (items.length === 0) return null;
              return (
                <CommandGroup key={group.key} heading={group.label}>
                  {items.map((a) => (
                    <CommandItem
                      key={a.id}
                      value={`${a.full_name} ${ROLE_BADGE_LABEL(a)}`}
                      onSelect={() => {
                        onSelect(a.id);
                        setOpen(false);
                      }}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="truncate">{a.full_name}</span>
                      <Badge
                        variant="outline"
                        className={`text-[9px] leading-tight shrink-0 ${ROLE_BADGE_CLASS(a.role)}`}
                      >
                        {ROLE_BADGE_LABEL(a)}
                      </Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

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
  // Index { contact_id -> { count, leads[] } } pour les contacts ayant >1
  // fiche lead. Alimenté par la RPC SECURITY DEFINER get_contact_leads_index
  // afin que même les collab intermédiaires (limités par RLS à leurs propres
  // leads) voient le signal de doublon. Périmètre strict : id/date/statut/
  // setter des autres fiches, rien de sensible. Cf. migration dédiée.
  const [contactLeadsIndex, setContactLeadsIndex] = useState<Record<string, {
    count: number;
    leads: { id: string; created_at: string; status: string; setter_name: string | null }[];
  }>>({});
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
  // Liste fusionnée des "assignables" : CEO + collaborateurs (tous niveaux)
  // + apporteurs actifs. Sert à la fois au dropdown d'affectation (CEO + délégués
  // peuvent affecter à n'importe qui) et aux filtres dérivés (collabs/apporteurs).
  const [assignables, setAssignables] = useState<{
    id: string;
    full_name: string;
    role: string;
    collaborateur_level: string | null;
  }[]>([]);
  const collaborateurs = useMemo(
    () => assignables.filter((a) => a.role !== "apporteur"),
    [assignables]
  );
  const apporteurs = useMemo(
    () => assignables.filter((a) => a.role === "apporteur"),
    [assignables]
  );
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

    // Fetch de l'index des contacts à fiches multiples (RPC scopée, bypasse
    // RLS uniquement pour count + date/statut/setter). Permet aux collab
    // intermédiaires de voir le signal de doublon sur leurs propres leads.
    const contactIds = Array.from(
      new Set(allLeads.map((l) => l.contact_id).filter(Boolean) as string[]),
    );
    if (contactIds.length > 0) {
      const { data: indexData } = await (supabase as any).rpc("get_contact_leads_index", {
        p_contact_ids: contactIds,
      });
      setContactLeadsIndex(indexData || {});
    } else {
      setContactLeadsIndex({});
    }

    setLoading(false);
  }, []);

  // Charge en une seule requête tous les utilisateurs susceptibles d'être
  // affectés à un lead (CEO + collabs + apporteurs actifs). Le tri par nom
  // facilite la recherche dans le combobox.
  const fetchAssignables = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, role, collaborateur_level, is_active")
      .in("role", ["ceo", "collaborateur", "apporteur"])
      .eq("is_active", true)
      .order("full_name");
    if (data) {
      setAssignables(
        data.map((p) => ({
          id: p.id,
          full_name: p.full_name,
          role: p.role,
          collaborateur_level: p.collaborateur_level,
        }))
      );
    }
  }, []);

  useEffect(() => {
    fetchLeads();
    fetchAssignables();
  }, [fetchLeads, fetchAssignables]);

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

    const targetCollab = assignables.find((a) => a.id === newUserId);

    if (alreadyAssigned.length > 0) {
      setBulkConfirm({
        targetUserId: newUserId,
        targetName: targetCollab?.full_name || "Setter",
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
  // Délégation d'affectation : CEO ou collaborateur avec can_assign_leads = true
  // (cf. fonction SQL can_assign_leads_now). Donne les mêmes pouvoirs d'affectation
  // que le CEO sur la liste leads, sans pour autant donner les autres droits CEO.
  const canAssign = isCeo || user?.can_assign_leads === true;

  // Scoped leads: les délégués d'affectation (CEO + can_assign_leads) voient
  // tous les leads ; les autres collaborateurs ne voient que les leurs.
  const scopedLeads = useMemo(() => {
    if (canAssign) return leads;
    if (!user) return [];
    return leads.filter(l => l.assigned_to === user.id);
  }, [leads, user, canAssign]);

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
      && !["call_booke", "renvoi_pole_vente", "close", "perdu"].includes(l.status || "")
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
        && !["call_booke", "renvoi_pole_vente", "close", "perdu"].includes(l.status || "")
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
          {(canAssign
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

        {canAssign && (
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
          {canAssign && selectedIds.size > 0 && (
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-primary/10 border border-primary/20">
              <CheckSquare className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">{selectedIds.size} lead{selectedIds.size > 1 ? "s" : ""} sélectionné{selectedIds.size > 1 ? "s" : ""}</span>
              {tab === "a_recycler" ? (
                <AssigneeCombobox
                  assignees={assignables}
                  onSelect={handleBulkAssign}
                  searchPlaceholder="Rechercher un setter..."
                  triggerNode={
                    <Button size="sm" className="gap-1.5 text-xs" disabled={bulkAssigning}>
                      <UserPlus className="h-3.5 w-3.5" />
                      Affecter en masse
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  }
                />
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
                  {canAssign && (
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
                  <TableHead className="w-[150px]">{isCeo ? "Scoring" : "Quiz"}</TableHead>
                  <TableHead className="w-[40px] text-center" title="Le lead a réservé un appel Calendly de lui-même">📞</TableHead>
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
                    {canAssign && (
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
                        {/* Badge "fiches multiples" : ce contact a plusieurs leads,
                            certains peut-être traités par d'autres setters. Clic =
                            ouvre la timeline complète du contact (ContactSheet). */}
                        {(() => {
                          if (!lead.contact_id) return null;
                          const entry = contactLeadsIndex[lead.contact_id];
                          if (!entry || entry.count <= 1) return null;
                          const others = entry.leads.filter((sib) => sib.id !== lead.id);
                          const tooltipLines = others.map((o) => {
                            const d = new Date(o.created_at).toLocaleDateString("fr-FR");
                            const status = LEAD_STATUS_LABELS[o.status] || o.status;
                            const setter = o.setter_name ? ` (${o.setter_name})` : "";
                            return `${d} → ${status}${setter}`;
                          });
                          const tooltip = `Ce contact a ${entry.count} fiches lead.\nClique pour voir l'historique complet.\n\nAutres fiches :\n${tooltipLines.join("\n")}`;
                          return (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (lead.contact_id) setContactSheetId(lead.contact_id);
                              }}
                              title={tooltip}
                              className="mt-0.5 inline-flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-400 hover:bg-amber-500/20 transition-colors"
                            >
                              📑 {entry.count} fiches
                            </button>
                          );
                        })()}
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
                        {/* Marqueur "Libéré du pot apporteur" : le lead a été
                            auto-libéré le lundi par le cron parce que son
                            apporteur ne l'avait pas qualifié dans sa semaine.
                            Aide les dispatchers à comprendre l'origine du lead
                            dans la pile "À affecter". */}
                        {lead.auto_released_at && !lead.assigned_to && (
                          <Badge
                            variant="outline"
                            className="text-[9px] leading-tight w-fit bg-amber-500/10 text-amber-400 border-amber-500/25"
                            title={`Libéré du pot apporteur le ${new Date(lead.auto_released_at).toLocaleDateString("fr-FR")} (apporteur : ${lead.apporteur_name ?? "—"})`}
                          >
                            ↻ Libéré pot apporteur
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    {/* Scoring / Quiz : contenu adapté au rôle.
                          - CEO : catégorie tiède/chaud/froid + score numérique + alertes
                          - Collab / apporteur : indicateur "rempli ou non" + alertes
                            (score et catégorie volontairement masqués — éléments
                            d'évaluation interne réservés au CEO). */}
                    <TableCell>
                      {lead.quiz_filled && lead.quiz_category ? (
                        isCeo ? (
                          <div className="flex flex-col gap-0.5">
                            <Badge
                              variant="outline"
                              className={`text-[10px] leading-tight w-fit ${SCORING_CATEGORY_BADGES[lead.quiz_category]}`}
                              title={`Quiz rempli le ${lead.quiz_completed_at ? new Date(lead.quiz_completed_at).toLocaleDateString("fr-FR") : "—"}${
                                lead.quiz_flags && lead.quiz_flags.length > 0
                                  ? ` — Alertes : ${lead.quiz_flags.join(", ")}`
                                  : ""
                              }`}
                            >
                              {SCORING_CATEGORY_EMOJIS[lead.quiz_category]} {SCORING_CATEGORY_LABELS[lead.quiz_category]}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {lead.quiz_score ?? "?"}/70
                              {lead.quiz_flags && lead.quiz_flags.length > 0 ? (
                                <span className="ml-1 text-amber-400 font-medium">
                                  ⚠ {lead.quiz_flags.length}
                                </span>
                              ) : null}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            <Badge
                              variant="outline"
                              className="text-[10px] leading-tight w-fit bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                              title={`Quiz rempli le ${lead.quiz_completed_at ? new Date(lead.quiz_completed_at).toLocaleDateString("fr-FR") : "—"}`}
                            >
                              ✓ Quiz rempli
                            </Badge>
                            {lead.quiz_flags && lead.quiz_flags.length > 0 ? (
                              <span
                                className="text-[10px] text-amber-400 font-medium"
                                title={`Alertes setter : ${lead.quiz_flags.join(", ")}`}
                              >
                                ⚠ {lead.quiz_flags.length} alerte{lead.quiz_flags.length > 1 ? "s" : ""}
                              </span>
                            ) : null}
                          </div>
                        )
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">Quiz non rempli</span>
                      )}
                    </TableCell>
                    {/* Call autonome : icône 📞 si le lead a déjà réservé un Calendly */}
                    <TableCell className="text-center">
                      {lead.has_any_call ? (
                        <Phone
                          className="h-3.5 w-3.5 inline text-emerald-400"
                          aria-label="Le lead a réservé un appel"
                          /* On laisse hover natif via title car Tooltip exige un wrapper */
                          {...(lead.any_call_scheduled_at
                            ? {
                                title: `Calendly réservé pour le ${new Date(
                                  lead.any_call_scheduled_at,
                                ).toLocaleString("fr-FR", {
                                  day: "2-digit",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}`,
                              }
                            : { title: "Le lead a réservé un appel Calendly" })}
                        />
                      ) : (
                        <span className="text-muted-foreground/40 text-[10px]">—</span>
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
                        (lead.assigned_to === user?.id || canAssign) ? (
                          // Combobox de réassign avec option "Libérer" en plus
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground h-auto p-0">
                                {lead.assigned_to_name || "Assigné"}
                                <ChevronDown className="h-3 w-3" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-[280px] p-0"
                              align="start"
                              collisionPadding={12}
                              style={{ maxHeight: "var(--radix-popper-available-height)" }}
                            >
                              <Command>
                                <CommandInput placeholder="Rechercher..." className="h-9" />
                                <CommandList className="max-h-[calc(var(--radix-popper-available-height)-3rem)]">
                                  <CommandEmpty>Aucun résultat.</CommandEmpty>
                                  {ROLE_GROUP_ORDER.map((group) => {
                                    const items = [...assignables]
                                      .filter((a) => groupKeyOf(a) === group.key && a.id !== lead.assigned_to)
                                      .sort((a, b) => a.full_name.localeCompare(b.full_name, "fr", { sensitivity: "base" }));
                                    if (items.length === 0) return null;
                                    return (
                                      <CommandGroup key={group.key} heading={group.label}>
                                        {items.map((a) => (
                                          <CommandItem
                                            key={a.id}
                                            value={`${a.full_name} ${ROLE_BADGE_LABEL(a)}`}
                                            onSelect={() => handleReassign(lead.id!, lead.assigned_to, a.id, lead.status)}
                                            className="flex items-center justify-between gap-2"
                                          >
                                            <span className="truncate">{a.full_name}</span>
                                            <Badge variant="outline" className={`text-[9px] leading-tight shrink-0 ${ROLE_BADGE_CLASS(a.role)}`}>
                                              {ROLE_BADGE_LABEL(a)}
                                            </Badge>
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    );
                                  })}
                                  <CommandGroup heading="Action">
                                    <CommandItem
                                      value="liberer libérer"
                                      onSelect={() => handleRelease(lead.id!, lead.assigned_to_name, lead.assigned_to)}
                                      className="text-destructive"
                                    >
                                      <UserMinus className="h-3.5 w-3.5 mr-2" />
                                      Libérer (désaffecter)
                                    </CommandItem>
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        ) : (
                          <span className="text-xs text-foreground">{lead.assigned_to_name}</span>
                        )
                      ) : isRecycled(lead) && canAssign ? (
                        // Admins sur lead recyclé : M'affecter rapide + Affecter à autre via combobox
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAssignToMe(lead.id!, lead.status)}
                            className="gap-1 text-[11px] h-7 px-2"
                            title="M'affecter ce lead"
                          >
                            <UserPlus className="h-3 w-3" />
                            Moi
                          </Button>
                          <AssigneeCombobox
                            assignees={assignables.filter((a) => a.id !== user?.id)}
                            onSelect={(id) => handleReassign(lead.id!, null, id, lead.status)}
                            searchPlaceholder="Rechercher un setter..."
                            triggerNode={
                              <Button size="sm" variant="outline" className="gap-1 text-[11px] h-7 px-2" title="Affecter à quelqu'un d'autre">
                                Autre
                                <ChevronDown className="h-3 w-3" />
                              </Button>
                            }
                          />
                        </div>
                      ) : !lead.has_active_call && !lead.recycled_at && !["call_booke", "renvoi_pole_vente", "close", "perdu"].includes(lead.status || "") && canAssign ? (
                        // Admins sur lead à affecter : M'affecter rapide + Affecter à autre via combobox
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAssignToMe(lead.id!, lead.status)}
                            className="gap-1 text-[11px] h-7 px-2"
                            title="M'affecter ce lead"
                          >
                            <UserPlus className="h-3 w-3" />
                            Moi
                          </Button>
                          <AssigneeCombobox
                            assignees={assignables.filter((a) => a.id !== user?.id)}
                            onSelect={(id) => handleReassign(lead.id!, null, id, lead.status)}
                            searchPlaceholder="Rechercher un setter..."
                            triggerNode={
                              <Button size="sm" variant="outline" className="gap-1 text-[11px] h-7 px-2" title="Affecter à quelqu'un d'autre">
                                Autre
                                <ChevronDown className="h-3 w-3" />
                              </Button>
                            }
                          />
                        </div>
                      ) : !lead.has_active_call && !lead.recycled_at && !["call_booke", "renvoi_pole_vente", "close", "perdu"].includes(lead.status || "") && user?.collaborateur_level === "confirme" ? (
                        // Collaborateurs confirmés (non-canAssign) : "M'affecter" rapide
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
                        {canAssign && !isRecycled(lead) && (
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
