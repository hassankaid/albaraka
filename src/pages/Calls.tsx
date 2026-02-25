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
import {
  Phone, RefreshCw, Search, Calendar, Clock, CheckCircle2, Pencil, Eye,
} from "lucide-react";
import { isToday, isAfter, isBefore, startOfWeek, endOfWeek, differenceInMinutes } from "date-fns";
import { formatDateTime } from "@/lib/formatDate";
import ProcessCallModal, { CALL_STATUS_COLORS, CALL_STATUS_LABELS } from "@/components/calls/ProcessCallModal";
import ContactSheet from "@/components/ContactSheet";

type CallEnriched = Tables<"calls_enriched">;

const STATUS_OPTIONS = [
  { value: "all", label: "Tous" },
  { value: "planifie", label: "Planifié" },
  { value: "close", label: "Close" },
  { value: "no_show", label: "No show" },
  { value: "follow_up", label: "Follow up" },
  { value: "non_close", label: "Non close" },
  { value: "annule", label: "Annulé" },
  { value: "effectue", label: "Effectué" },
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

  // Process modal state
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

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("calls-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "calls" }, () => {
        fetchCalls();
      })
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

  // Counters
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

  // Filtered calls
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

    if (statusFilter !== "all") {
      result = result.filter((c) => c.status === statusFilter);
    }
    if (typeFilter !== "all") {
      result = result.filter((c) => c.event_type === typeFilter);
    }
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

  const counterCards = [
    { label: "Aujourd'hui", value: counts.today, icon: Calendar, gradient: "from-orange-500/20 to-yellow-500/20" },
    { label: "Cette semaine", value: counts.thisWeek, icon: Clock, gradient: "from-blue-500/20 to-cyan-500/20" },
    { label: "Planifiés", value: counts.planned, icon: Phone, gradient: "from-purple-500/20 to-blue-500/20" },
    { label: "Closés", value: counts.done, icon: CheckCircle2, gradient: "from-emerald-500/20 to-teal-500/20" },
  ];

  const isUrgent = (scheduledAt: string | null) => {
    if (!scheduledAt) return false;
    const diff = differenceInMinutes(new Date(scheduledAt), now);
    return diff >= 0 && diff <= 60;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Calls</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Gestion des appels</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
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
          <TabsTrigger value="aujourdhui">Aujourd'hui ({counts.today})</TabsTrigger>
          <TabsTrigger value="a_venir">À venir</TabsTrigger>
          <TabsTrigger value="passes">Passés</TabsTrigger>
          <TabsTrigger value="mes_calls">Mes calls</TabsTrigger>
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

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px] bg-card">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((s) => (
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

        {/* Table for all tabs */}
        {["aujourdhui", "a_venir", "passes", "mes_calls"].map((tabValue) => (
          <TabsContent key={tabValue} value={tabValue} className="mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredCalls.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Phone className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-semibold text-foreground">
                  {tabValue === "aujourdhui" ? "Aucun call prévu aujourd'hui" :
                   tabValue === "a_venir" ? "Aucun call à venir" :
                   tabValue === "mes_calls" ? "Aucun call assigné" :
                   "Aucun call passé"}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <Card className="border-border/50 overflow-hidden hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead>Contact</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Date / Heure</TableHead>
                        <TableHead>Durée</TableHead>
                        <TableHead>Assigné à</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCalls.map((call) => (
                        <TableRow
                          key={call.id}
                          className={`border-border hover:bg-secondary/50 transition-colors ${
                            call.status === "planifie" && isUrgent(call.scheduled_at)
                              ? "border-l-2 border-l-orange-500"
                              : ""
                          }`}
                        >
                          <TableCell>
                            <div>
                              <p className="font-semibold text-foreground">{call.contact_full_name || "—"}</p>
                              <p className="text-xs text-muted-foreground">{call.contact_email}</p>
                              <p className="text-xs text-muted-foreground">{call.contact_phone}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {call.event_type && (
                              <Badge variant="outline" className={`text-xs ${TYPE_COLORS[call.event_type] || ""}`}>
                                {call.event_type_label || call.event_type}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-foreground">
                            {call.scheduled_at
                              ? formatDateTime(call.scheduled_at, userTz)
                              : "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {call.duration_minutes ? `${call.duration_minutes} min` : "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {call.assigned_to_name || "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${CALL_STATUS_COLORS[call.status || ""] || ""}`}>
                              {CALL_STATUS_LABELS[call.status || ""] || call.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setProcessCall(call)}
                                title="Traiter"
                              >
                                <Pencil className="h-3.5 w-3.5" />
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
                </Card>

                {/* Mobile cards */}
                <div className="space-y-3 md:hidden">
                  {filteredCalls.map((call) => (
                    <Card
                      key={call.id}
                      className={`border-border/50 ${
                        call.status === "planifie" && isUrgent(call.scheduled_at)
                          ? "border-l-2 border-l-orange-500"
                          : ""
                      }`}
                    >
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-foreground">{call.contact_full_name || "—"}</p>
                            <p className="text-xs text-muted-foreground">{call.contact_email}</p>
                          </div>
                          <Badge variant="outline" className={`text-xs ${CALL_STATUS_COLORS[call.status || ""] || ""}`}>
                            {CALL_STATUS_LABELS[call.status || ""] || call.status}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{call.scheduled_at ? formatDateTime(call.scheduled_at, userTz) : "—"}</span>
                          <span>•</span>
                          <span>{call.duration_minutes ? `${call.duration_minutes} min` : "—"}</span>
                          {call.event_type && (
                            <Badge variant="outline" className={`text-xs ${TYPE_COLORS[call.event_type] || ""}`}>
                              {call.event_type_label || call.event_type}
                            </Badge>
                          )}
                        </div>
                        {call.assigned_to_name && (
                          <p className="text-xs text-muted-foreground">Assigné à {call.assigned_to_name}</p>
                        )}
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setProcessCall(call)}
                            title="Traiter"
                          >
                            <Pencil className="h-3.5 w-3.5" />
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
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Process Call Modal */}
      <ProcessCallModal
        call={processCall}
        open={!!processCall}
        onClose={() => setProcessCall(null)}
        onSuccess={fetchCalls}
        onOpenContact={(id) => setContactSheetId(id)}
      />

      {/* Contact Sheet */}
      <ContactSheet
        contactId={contactSheetId}
        open={!!contactSheetId}
        onClose={() => setContactSheetId(null)}
      />
    </div>
  );
}
