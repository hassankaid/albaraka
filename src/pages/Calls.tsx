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
import {
  Phone, RefreshCw, Search, Calendar, Clock, CheckCircle2, Pencil, Eye, Info,
  ChevronLeft, ChevronRight, Inbox, Copy,
} from "lucide-react";
import { isToday, isAfter, isBefore, startOfWeek, endOfWeek, differenceInMinutes } from "date-fns";
import { formatDateTime } from "@/lib/formatDate";
import ProcessCallModal, { CALL_STATUS_COLORS, CALL_STATUS_LABELS } from "@/components/calls/ProcessCallModal";
import ContactSheet from "@/components/ContactSheet";

type CallEnriched = Tables<"calls_enriched">;

const STATUS_OPTIONS = [
  { value: "all", label: "Tous" },
  { value: "planifie", label: "Planifié" },
  { value: "annule", label: "Annulé" },
  { value: "no_show", label: "No show" },
  { value: "pas_interesse", label: "Pas intéressé" },
  { value: "disqualifie", label: "Disqualifié" },
  { value: "non_close", label: "Non close" },
  { value: "renvoye_pole_vente", label: "Renvoi Pôle Vente" },
  { value: "renvoye_conference", label: "Renvoi Conférence" },
  { value: "rediffusion", label: "Rediffusion" },
  { value: "follow_up", label: "Follow up" },
  { value: "close", label: "Close" },
];

const TYPE_OPTIONS = [
  { value: "all", label: "Tous" },
  { value: "appel_offert_vsl_a", label: "Appel VSL A" },
  { value: "appel_offert_vsl_b", label: "Appel VSL B" },
  { value: "appel_setting_webi", label: "Setting Webi" },
  { value: "inscription_conference", label: "Conférence" },
  { value: "appel_organique", label: "Organique" },
];

const TYPE_COLORS: Record<string, string> = {
  appel_offert_vsl_a: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  appel_offert_vsl_b: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  appel_setting_webi: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  inscription_conference: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  appel_organique: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
};

const TABS = [
  { value: "aujourdhui", label: "Aujourd'hui" },
  { value: "a_venir", label: "À venir" },
  { value: "passes", label: "Passés" },
  { value: "mes_calls", label: "Mes calls" },
] as const;

const PAGE_SIZE = 50;

export default function Calls() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [calls, setCalls] = useState<CallEnriched[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState("aujourdhui");
  const userTz = profile?.timezone || "Europe/Paris";
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const [processCall, setProcessCall] = useState<CallEnriched | null>(null);
  const [contactSheetId, setContactSheetId] = useState<string | null>(null);

  const fetchCalls = useCallback(async () => {
    const { data, error } = await supabase
      .from("calls_enriched")
      .select("*")
      .order("scheduled_at", { ascending: false });

    if (!error && data) setCalls(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCalls(); }, [fetchCalls]);

  useEffect(() => {
    const channel = supabase
      .channel("calls-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "calls" }, () => fetchCalls())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchCalls]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCalls();
    setRefreshing(false);
    toast({ title: "Données actualisées" });
  };

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const counts = useMemo(() => ({
    today: calls.filter((c) => c.scheduled_at && isToday(new Date(c.scheduled_at)) && c.status === "planifie").length,
    thisWeek: calls.filter((c) => {
      if (!c.scheduled_at) return false;
      const d = new Date(c.scheduled_at);
      return d >= weekStart && d <= weekEnd;
    }).length,
    planned: calls.filter((c) => c.status === "planifie").length,
    done: calls.filter((c) => c.status === "effectue" || c.status === "close").length,
  }), [calls, weekStart, weekEnd]);

  const filteredCalls = useMemo(() => {
    let result = calls;

    if (tab === "aujourdhui") {
      result = result.filter((c) => c.scheduled_at && isToday(new Date(c.scheduled_at)) && c.status === "planifie");
    } else if (tab === "a_venir") {
      result = result.filter((c) => c.scheduled_at && isAfter(new Date(c.scheduled_at), now) && c.status === "planifie");
    } else if (tab === "passes") {
      result = result.filter((c) =>
        (c.scheduled_at && isBefore(new Date(c.scheduled_at), now)) ||
        !["planifie"].includes(c.status || "")
      );
    } else if (tab === "mes_calls" && profile) {
      result = result.filter((c) => c.assigned_to === profile.id);
    }

    if (statusFilter !== "all") result = result.filter((c) => c.status === statusFilter);
    if (typeFilter !== "all") result = result.filter((c) => c.event_type === typeFilter);

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((c) =>
        c.contact_full_name?.toLowerCase().includes(q) ||
        c.contact_email?.toLowerCase().includes(q) ||
        c.contact_phone?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [calls, tab, statusFilter, typeFilter, search, profile, now]);

  useEffect(() => { setPage(0); }, [tab, statusFilter, typeFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredCalls.length / PAGE_SIZE));
  const paginatedCalls = useMemo(
    () => filteredCalls.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [filteredCalls, page]
  );

  const isUrgent = (scheduledAt: string | null) => {
    if (!scheduledAt) return false;
    const diff = differenceInMinutes(new Date(scheduledAt), now);
    return diff >= 0 && diff <= 60;
  };

  const emptyMessage = () => {
    const messages: Record<string, string> = {
      aujourdhui: "Aucun call prévu aujourd'hui",
      a_venir: "Aucun call à venir",
      mes_calls: "Aucun call assigné",
      passes: "Aucun call passé",
    };
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-semibold text-foreground">{messages[tab] || "Aucun call"}</p>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Top bar: KPIs + refresh */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border">
            <Calendar className="h-3.5 w-3.5 text-orange-400" />
            <span className="text-sm font-bold text-foreground">{counts.today}</span>
            <span className="text-xs text-muted-foreground">aujourd'hui</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border">
            <Clock className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-sm font-bold text-foreground">{counts.thisWeek}</span>
            <span className="text-xs text-muted-foreground">cette semaine</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border">
            <Phone className="h-3.5 w-3.5 text-purple-400" />
            <span className="text-sm font-bold text-foreground">{counts.planned}</span>
            <span className="text-xs text-muted-foreground">planifiés</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-sm font-bold text-foreground">{counts.done}</span>
            <span className="text-xs text-muted-foreground">closés</span>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRefresh} disabled={refreshing} title="Actualiser">
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
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
              {t.value === "aujourdhui" ? ` (${counts.today})` : ""}
            </button>
          ))}
        </div>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[130px] h-8 text-xs bg-card">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] h-8 text-xs bg-card">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
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
      ) : filteredCalls.length === 0 ? (
        emptyMessage()
      ) : (
        <>
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="w-[220px]">Contact</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date / Heure</TableHead>
                  <TableHead>Durée</TableHead>
                  <TableHead>Assigné à</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-[70px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCalls.map((call) => (
                  <TableRow
                    key={call.id}
                    className={`border-border hover:bg-secondary/50 transition-colors ${
                      call.status === "planifie" && isUrgent(call.scheduled_at)
                        ? "border-l-2 border-l-orange-500"
                        : ""
                    }`}
                  >
                    {/* Contact */}
                    <TableCell>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground text-sm truncate">{call.contact_full_name || "—"}</p>
                        {call.contact_email && (
                          <p className="text-xs text-muted-foreground truncate">{call.contact_email}</p>
                        )}
                        {call.contact_phone && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <a href={`tel:${call.contact_phone}`} className="text-xs text-muted-foreground hover:text-foreground hover:underline truncate">
                              {call.contact_phone}
                            </a>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(call.contact_phone!);
                                toast({ title: "Numéro copié" });
                              }}
                              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    {/* Type */}
                    <TableCell>
                      {call.event_type && (
                        <Badge variant="outline" className={`text-[10px] leading-tight ${TYPE_COLORS[call.event_type] || ""}`}>
                          {call.event_type_label || call.event_type}
                        </Badge>
                      )}
                    </TableCell>
                    {/* Date */}
                    <TableCell>
                      <span className="text-xs text-foreground whitespace-nowrap">
                        {call.scheduled_at ? formatDateTime(call.scheduled_at, userTz) : "—"}
                      </span>
                    </TableCell>
                    {/* Durée */}
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {call.duration_minutes ? `${call.duration_minutes} min` : "—"}
                      </span>
                    </TableCell>
                    {/* Assigné */}
                    <TableCell>
                      <span className="text-xs text-muted-foreground">{call.assigned_to_name || "—"}</span>
                    </TableCell>
                    {/* Statut */}
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] leading-tight ${CALL_STATUS_COLORS[call.status || ""] || ""}`}>
                        {CALL_STATUS_LABELS[call.status || ""] || call.status}
                      </Badge>
                    </TableCell>
                    {/* Actions */}
                    <TableCell>
                      <div className="flex items-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setProcessCall(call)}
                          title={call.assigned_to === profile?.id || profile?.role === "ceo" ? "Traiter" : "Consulter"}
                        >
                          {call.assigned_to === profile?.id || profile?.role === "ceo" ? (
                            <Pencil className="h-3.5 w-3.5" />
                          ) : (
                            <Info className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        {call.contact_id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setContactSheetId(call.contact_id)}
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
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredCalls.length)} sur {filteredCalls.length}
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

      {/* Modals */}
      <ProcessCallModal
        call={processCall}
        open={!!processCall}
        onClose={() => setProcessCall(null)}
        onSuccess={fetchCalls}
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
