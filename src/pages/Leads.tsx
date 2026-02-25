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
  Users, UserPlus, RefreshCw, Search, Phone, CheckCircle2, Clock, PartyPopper, Inbox, ChevronDown, Instagram,
} from "lucide-react";
import LeadInstagramForm from "@/components/LeadInstagramForm";
import LeadApporteurForm from "@/components/LeadApporteurForm";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { formatDateTime } from "@/lib/formatDate";

type LeadEnriched = Tables<"leads_enriched">;

const STATUS_OPTIONS = [
  { value: "all", label: "Tous" },
  { value: "nouveau", label: "Nouveau" },
  { value: "contacte", label: "Contacté" },
  { value: "call_booke", label: "Call booké" },
  { value: "converti", label: "Converti" },
  { value: "perdu", label: "Perdu" },
];

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

const STATUS_COLORS: Record<string, string> = {
  nouveau: "bg-muted text-muted-foreground border-border",
  contacte: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  call_booke: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  converti: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  perdu: "bg-red-500/20 text-red-300 border-red-500/30",
};

const STATUS_LABELS: Record<string, string> = {
  nouveau: "Nouveau",
  contacte: "Contacté",
  call_booke: "Call booké",
  converti: "Converti",
  perdu: "Perdu",
};

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
      .update({ assigned_to: user.id, assigned_at: new Date().toISOString(), status: "contacte" })
      .eq("id", leadId);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Lead affecté avec succès" });
      fetchLeads();
    }
  };

  const handleReassign = async (leadId: string, newUserId: string) => {
    const { error } = await supabase
      .from("leads")
      .update({ assigned_to: newUserId, assigned_at: new Date().toISOString() })
      .eq("id", leadId);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
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
          l.contact_full_name?.toLowerCase().includes(q) ||
          l.contact_email?.toLowerCase().includes(q) ||
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
                      <TableHead>Statut</TableHead>
                      <TableHead>Assignation</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.map((lead) => (
                      <TableRow key={lead.id} className="border-border hover:bg-secondary/50 transition-colors">
                        {/* Contact */}
                        <TableCell>
                          <div>
                            <p className="font-semibold text-foreground">{lead.contact_full_name || "—"}</p>
                            <p className="text-xs text-muted-foreground">{lead.contact_email}</p>
                            <p className="text-xs text-muted-foreground">{lead.contact_phone}</p>
                          </div>
                        </TableCell>

                        {/* Source */}
                        <TableCell>
                          {lead.source_label && (
                            <Badge variant="outline" className={`text-xs ${SOURCE_COLORS[lead.source_label] || ""}`}>
                              {lead.source_label}
                            </Badge>
                          )}
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          {lead.status && (
                            <Badge variant="outline" className={`text-xs ${STATUS_COLORS[lead.status] || ""}`}>
                              {STATUS_LABELS[lead.status] || lead.status}
                            </Badge>
                          )}
                        </TableCell>

                        {/* Assignment */}
                        <TableCell>
                          <AssignmentCell
                            lead={lead}
                            currentUserId={user?.id}
                            userRole={user?.role}
                            collaborateurs={collaborateurs}
                            onAssignToMe={() => handleAssignToMe(lead.id!)}
                            onReassign={(newUserId) => handleReassign(lead.id!, newUserId)}
                          />
                        </TableCell>

                        {/* Date */}
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {lead.created_at
                              ? formatDistanceToNow(new Date(lead.created_at), { addSuffix: true, locale: fr })
                              : "—"}
                          </span>
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

      {/* Forms */}
      <LeadInstagramForm open={igFormOpen} onOpenChange={setIgFormOpen} onSuccess={fetchLeads} />
      <LeadApporteurForm open={apporteurFormOpen} onOpenChange={setApporteurFormOpen} onSuccess={fetchLeads} />
    </div>
  );
}

// Separate component for assignment cell logic
function AssignmentCell({
  lead,
  currentUserId,
  userRole,
  collaborateurs,
  onAssignToMe,
  onReassign,
}: {
  lead: LeadEnriched;
  currentUserId?: string;
  userRole?: string;
  collaborateurs: { id: string; full_name: string }[];
  onAssignToMe: () => void;
  onReassign: (userId: string) => void;
}) {
  // 1. Active call
  if (lead.has_active_call) {
    return (
      <div className="space-y-0.5">
        <Badge variant="outline" className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
          📞 Call le {lead.call_scheduled_at ? formatDateTime(lead.call_scheduled_at) : "—"}
        </Badge>
        {lead.call_assigned_to_name && (
          <p className="text-xs text-muted-foreground">avec {lead.call_assigned_to_name}</p>
        )}
      </div>
    );
  }

  // 2. Not assigned
  if (!lead.assigned_to) {
    return (
      <Button size="sm" variant="outline" onClick={onAssignToMe} className="gap-1.5 text-xs">
        <UserPlus className="h-3.5 w-3.5" />
        M'affecter
      </Button>
    );
  }

  // 3. Assigned to me
  if (lead.assigned_to === currentUserId) {
    return (
      <Badge variant="outline" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Assigné à moi
      </Badge>
    );
  }

  // 4. Assigned to someone else
  if (userRole === "ceo") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground">
            {lead.assigned_to_name || "Assigné"}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {collaborateurs
            .filter((c) => c.id !== lead.assigned_to)
            .map((c) => (
              <DropdownMenuItem key={c.id} onClick={() => onReassign(c.id)}>
                {c.full_name}
              </DropdownMenuItem>
            ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <span className="text-sm text-muted-foreground">
      {lead.assigned_to_name || "Assigné à un autre"}
    </span>
  );
}
