import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RefreshCw, Search, Link2, Unlink, Users, Phone, BookUser, BadgeEuro, Database, ExternalLink, Trash2, Check, X, Pencil } from "lucide-react";
import { formatDateOnly } from "@/lib/formatDate";
import { getSourceLabel, getSourceBadgeClass, LEAD_STATUS_LABELS, LEAD_STATUS_COLORS, leadSourceConfig } from "@/lib/leadConfig";
import ContactSheet from "@/components/ContactSheet";

// ── Types ──
interface LeadRow {
  id: string;
  raw_full_name: string | null;
  raw_email: string | null;
  raw_phone: string | null;
  source: string;
  status: string;
  contact_id: string | null;
  contact_name: string | null;
  assigned_to_name: string | null;
  apporteur_name: string | null;
  created_at: string | null;
}

interface CallRow {
  id: string;
  raw_full_name: string | null;
  raw_email: string | null;
  raw_phone: string | null;
  scheduled_at: string;
  status: string;
  event_type: string | null;
  contact_id: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  lead_id: string | null;
  assigned_to_name: string | null;
}

interface ContactRow {
  id: string;
  full_name: string | null;
  email: string | null;
  phone_normalized: string | null;
  created_at: string | null;
}

interface SaleRow {
  id: string;
  product: string;
  amount_ht: number;
  sold_at: string | null;
  contact_id: string;
  contact_name: string | null;
  lead_id: string | null;
  call_id: string | null;
  closed_by_name: string | null;
  payment_status: string | null;
}

// ── Status labels ──
const CALL_STATUS_LABELS: Record<string, string> = {
  planifie: "Planifié",
  effectue: "Effectué",
  no_show: "No show",
  annule: "Annulé",
  close: "Close",
  reporte: "Reporté",
};

const PAYMENT_LABELS: Record<string, string> = {
  pending: "En attente",
  paid: "Payé",
  failed: "Échoué",
  refunded: "Remboursé",
};

const LEAD_SOURCES = ["systeme_io", "instagram", "apporteur", "whatsapp_ads", "facebook_ads", "autre"];
const LEAD_STATUSES = Object.keys(LEAD_STATUS_LABELS);
const CALL_STATUSES = Object.keys(CALL_STATUS_LABELS);
const CALL_EVENT_TYPES = ["vsl", "conference", "pole_vente", ""];
const PRODUCTS = ["Business Developer", "Liberty"];

// ── Inline Edit Cell ──
function EditableCell({
  value,
  onSave,
  type = "text",
  options,
  optionLabels,
  className = "",
}: {
  value: string | null;
  onSave: (val: string) => Promise<void>;
  type?: "text" | "select" | "number";
  options?: string[];
  optionLabels?: Record<string, string>;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(value || "");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditVal(value || "");
    setEditing(true);
  };

  const save = async () => {
    if (editVal === (value || "")) { setEditing(false); return; }
    setSaving(true);
    await onSave(editVal);
    setSaving(false);
    setEditing(false);
  };

  const cancel = () => { setEditing(false); setEditVal(value || ""); };

  if (editing) {
    if (type === "select" && options) {
      return (
        <Select value={editVal} onValueChange={async (v) => {
          setEditVal(v);
          setSaving(true);
          await onSave(v);
          setSaving(false);
          setEditing(false);
        }}>
          <SelectTrigger className="h-7 text-xs w-auto min-w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map(o => (
              <SelectItem key={o} value={o || "_empty"}>{optionLabels?.[o] || o || "—"}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    return (
      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
        <Input
          ref={inputRef}
          value={editVal}
          onChange={(e) => setEditVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
          className="h-7 text-xs px-1.5 w-auto min-w-[80px]"
          type={type === "number" ? "number" : "text"}
          disabled={saving}
        />
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={save} disabled={saving}>
          <Check className="h-3 w-3 text-green-500" />
        </Button>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={cancel}>
          <X className="h-3 w-3 text-muted-foreground" />
        </Button>
      </div>
    );
  }

  const displayVal = optionLabels?.[value || ""] || value;
  return (
    <span
      className={`cursor-pointer hover:bg-secondary/80 rounded px-1 py-0.5 transition-colors text-sm ${className}`}
      onClick={startEdit}
      title="Cliquer pour modifier"
    >
      {displayVal || <span className="text-muted-foreground italic">—</span>}
    </span>
  );
}

export default function AdminData() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const userTz = profile?.timezone || "Europe/Paris";
  const formatDate = (d: string | null) => (d ? formatDateOnly(d, userTz) : "—");

  const [tab, setTab] = useState("leads");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // Data
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [sales, setSales] = useState<SaleRow[]>([]);

  // Link modal
  const [linkModal, setLinkModal] = useState<{
    type: "lead" | "call" | "sale";
    id: string;
    field: string;
    currentValue: string | null;
    label: string;
  } | null>(null);
  const [linkSearch, setLinkSearch] = useState("");
  const [linkValue, setLinkValue] = useState<string>("");
  const [linkSaving, setLinkSaving] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ type: "lead" | "call" | "contact" | "sale"; id: string; label: string } | null>(null);

  // Contact sheet
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  // ── Batch fetch helper ──
  async function fetchAllRows<T>(
    queryFn: (offset: number, limit: number) => PromiseLike<{ data: T[] | null; error: any }>,
    batchSize = 1000
  ): Promise<T[]> {
    const all: T[] = [];
    let offset = 0;
    let hasMore = true;
    while (hasMore) {
      const { data, error } = await queryFn(offset, batchSize);
      if (error || !data || data.length === 0) { hasMore = false; break; }
      all.push(...data);
      offset += batchSize;
      hasMore = data.length === batchSize;
    }
    return all;
  }

  // ── Fetch ──
  const fetchLeads = useCallback(async () => {
    const data = await fetchAllRows<any>((offset, limit) =>
      supabase
        .from("leads_enriched")
        .select("id, raw_full_name, raw_email, raw_phone, source, status, contact_id, contact_full_name, assigned_to_name, apporteur_name, created_at")
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1)
    );
    setLeads(data.map((l: any) => ({ ...l, contact_name: l.contact_full_name })));
  }, []);

  const fetchCalls = useCallback(async () => {
    const data = await fetchAllRows<any>((offset, limit) =>
      supabase
        .from("calls_enriched")
        .select("id, raw_full_name, raw_email, raw_phone, scheduled_at, status, event_type, contact_id, contact_full_name, contact_phone, contact_email, lead_id, assigned_to_name")
        .order("scheduled_at", { ascending: false })
        .range(offset, offset + limit - 1)
    );
    setCalls(data.map((c: any) => ({ ...c, contact_name: c.contact_full_name })));
  }, []);

  const fetchContacts = useCallback(async () => {
    const data = await fetchAllRows<any>((offset, limit) =>
      supabase
        .from("contacts")
        .select("id, full_name, email, phone_normalized, created_at")
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1)
    );
    setContacts(data);
  }, []);

  const fetchSales = useCallback(async () => {
    const data = await fetchAllRows<any>((offset, limit) =>
      supabase
        .from("sales")
        .select(`
          id, product, amount_ht, sold_at, contact_id, lead_id, call_id, payment_status,
          contacts!sales_contact_id_fkey(full_name),
          profiles!sales_closed_by_fkey(full_name)
        `)
        .order("sold_at", { ascending: false })
        .range(offset, offset + limit - 1)
    );
    setSales(data.map((s: any) => ({
      ...s,
      contact_name: s.contacts?.full_name,
      closed_by_name: s.profiles?.full_name,
    })));
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchLeads(), fetchCalls(), fetchContacts(), fetchSales()]);
    setLoading(false);
  }, [fetchLeads, fetchCalls, fetchContacts, fetchSales]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleRefresh = async () => {
    await fetchAll();
    toast({ title: "Données actualisées" });
  };

  // ── Inline update helper ──
  const updateField = async (table: string, id: string, field: string, value: string, refreshFn: () => Promise<void>) => {
    const val = value === "" ? null : value;
    const { error } = await supabase.from(table as any).update({ [field]: val }).eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Modifié" });
      await refreshFn();
    }
  };

  // ── Delete ──
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const tableMap: Record<string, string> = { lead: "leads", call: "calls", contact: "contacts", sale: "sales" };
    const { error } = await supabase.from(tableMap[deleteTarget.type] as any).delete().eq("id", deleteTarget.id);
    if (error) {
      toast({ title: "Erreur de suppression", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Supprimé" });
      await fetchAll();
    }
    setDeleteTarget(null);
  };

  // ── Search filter ──
  const q = search.toLowerCase();
  const qNorm = q.replace(/[\s\-().+]/g, "");
  const matchesField = (val: string | null) => {
    if (!val) return false;
    const lower = val.toLowerCase();
    if (lower.includes(q)) return true;
    if (qNorm.length >= 3 && val.replace(/[\s\-().+]/g, "").includes(qNorm)) return true;
    return false;
  };

  const filteredLeads = useMemo(() => {
    if (!q) return leads;
    return leads.filter(l =>
      matchesField(l.raw_full_name) || matchesField(l.raw_email) || matchesField(l.raw_phone) ||
      matchesField(l.contact_name) || matchesField(l.apporteur_name) || matchesField(l.assigned_to_name)
    );
  }, [leads, q, qNorm]);

  const filteredCalls = useMemo(() => {
    if (!q) return calls;
    return calls.filter(c =>
      matchesField(c.raw_full_name) || matchesField(c.raw_email) || matchesField(c.raw_phone) ||
      matchesField(c.contact_name) || matchesField(c.contact_phone) || matchesField(c.contact_email) ||
      matchesField(c.assigned_to_name)
    );
  }, [calls, q, qNorm]);

  const filteredContacts = useMemo(() => {
    if (!q) return contacts;
    return contacts.filter(c =>
      matchesField(c.full_name) || matchesField(c.email) || matchesField(c.phone_normalized)
    );
  }, [contacts, q, qNorm]);

  const filteredSales = useMemo(() => {
    if (!q) return sales;
    return sales.filter(s =>
      matchesField(s.contact_name) || matchesField(s.product) || matchesField(s.closed_by_name)
    );
  }, [sales, q, qNorm]);

  // ── Link management ──
  const openLinkModal = (type: "lead" | "call" | "sale", id: string, field: string, currentValue: string | null, label: string) => {
    setLinkModal({ type, id, field, currentValue, label });
    setLinkValue(currentValue || "");
    setLinkSearch("");
  };

  const saveLink = async () => {
    if (!linkModal) return;
    setLinkSaving(true);
    const tableName = linkModal.type === "lead" ? "leads" : linkModal.type === "call" ? "calls" : "sales";
    const { error } = await supabase
      .from(tableName)
      .update({ [linkModal.field]: linkValue || null })
      .eq("id", linkModal.id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Rattachement mis à jour" });
      if (linkModal.type === "lead") await fetchLeads();
      else if (linkModal.type === "call") await fetchCalls();
      else await fetchSales();
    }
    setLinkSaving(false);
    setLinkModal(null);
  };

  const unlinkField = async () => {
    if (!linkModal) return;
    setLinkValue("");
    setLinkSaving(true);
    const tableName = linkModal.type === "lead" ? "leads" : linkModal.type === "call" ? "calls" : "sales";
    const { error } = await supabase
      .from(tableName)
      .update({ [linkModal.field]: null })
      .eq("id", linkModal.id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Lien supprimé" });
      if (linkModal.type === "lead") await fetchLeads();
      else if (linkModal.type === "call") await fetchCalls();
      else await fetchSales();
    }
    setLinkSaving(false);
    setLinkModal(null);
  };

  // Options for link selects
  const contactOptions = useMemo(() => {
    const searchQ = linkSearch.toLowerCase();
    const searchNorm = linkSearch.replace(/[\s\-().+]/g, "");
    return contacts
      .filter(c => !searchQ || c.full_name?.toLowerCase().includes(searchQ) || c.email?.toLowerCase().includes(searchQ) || (searchNorm.length >= 3 && c.phone_normalized?.replace(/[\s\-().+]/g, "").includes(searchNorm)))
      .slice(0, 50);
  }, [contacts, linkSearch]);

  const leadOptions = useMemo(() => {
    const searchQ = linkSearch.toLowerCase();
    return leads
      .filter(l => !searchQ || l.raw_full_name?.toLowerCase().includes(searchQ) || l.raw_email?.toLowerCase().includes(searchQ))
      .slice(0, 50);
  }, [leads, linkSearch]);

  const callOptions = useMemo(() => {
    const searchQ = linkSearch.toLowerCase();
    return calls
      .filter(c => !searchQ || c.raw_full_name?.toLowerCase().includes(searchQ) || c.contact_name?.toLowerCase().includes(searchQ))
      .slice(0, 50);
  }, [calls, linkSearch]);

  const getLinkOptions = () => {
    if (!linkModal) return [];
    if (linkModal.field === "contact_id") return contactOptions.map(c => ({
      id: c.id,
      label: c.full_name || "Sans nom",
      sub: [c.email, c.phone_normalized].filter(Boolean).join(" · ") || "Aucune info",
    }));
    if (linkModal.field === "lead_id") return leadOptions.map(l => {
      const details = [l.raw_email, l.raw_phone].filter(Boolean).join(" · ");
      const actors = [l.assigned_to_name && `Setter: ${l.assigned_to_name}`, l.apporteur_name && `Apporteur: ${l.apporteur_name}`].filter(Boolean).join(" · ");
      return {
        id: l.id,
        label: `${l.raw_full_name || "Sans nom"} — ${getSourceLabel(l.source)} — ${formatDate(l.created_at)}`,
        sub: [details, actors].filter(Boolean).join(" — ") || "",
      };
    });
    if (linkModal.field === "call_id") return callOptions.map(c => {
      const details = [c.raw_email || c.contact_email, c.raw_phone || c.contact_phone].filter(Boolean).join(" · ");
      const actor = c.assigned_to_name ? `Closer: ${c.assigned_to_name}` : "";
      return {
        id: c.id,
        label: `${c.raw_full_name || c.contact_name || "Sans nom"} — ${formatDate(c.scheduled_at)}`,
        sub: [details, actor].filter(Boolean).join(" — ") || "",
      };
    });
    return [];
  };

  const LinkButton = ({ linked, onClick, tooltip }: { linked: boolean; onClick: () => void; tooltip: string }) => (
    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onClick(); }} className="text-xs gap-1" title={tooltip}>
      {linked ? <Link2 className="h-3.5 w-3.5 text-primary" /> : <Unlink className="h-3.5 w-3.5 text-muted-foreground" />}
    </Button>
  );

  const DeleteButton = ({ onClick }: { onClick: () => void }) => (
    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onClick(); }} className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" title="Supprimer">
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Database className="h-6 w-6" /> Gestion des données
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Cliquez sur une valeur pour la modifier directement</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </div>

      {/* Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border-border/50 cursor-pointer hover:ring-1 hover:ring-primary/50 transition-all" onClick={() => setTab("leads")}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-background/50"><Users className="h-5 w-5 text-foreground" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{leads.length}</p>
              <p className="text-xs text-muted-foreground">Leads</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-border/50 cursor-pointer hover:ring-1 hover:ring-primary/50 transition-all" onClick={() => setTab("calls")}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-background/50"><Phone className="h-5 w-5 text-foreground" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{calls.length}</p>
              <p className="text-xs text-muted-foreground">Calls</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-border/50 cursor-pointer hover:ring-1 hover:ring-primary/50 transition-all" onClick={() => setTab("contacts")}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-background/50"><BookUser className="h-5 w-5 text-foreground" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{contacts.length}</p>
              <p className="text-xs text-muted-foreground">Contacts</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500/20 to-amber-500/20 border-border/50 cursor-pointer hover:ring-1 hover:ring-primary/50 transition-all" onClick={() => setTab("sales")}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-background/50"><BadgeEuro className="h-5 w-5 text-foreground" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{sales.length}</p>
              <p className="text-xs text-muted-foreground">Ventes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher par nom, email, téléphone..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-card" />
        {q && (
          <p className="text-xs text-muted-foreground mt-1.5 ml-1">
            {filteredLeads.length + filteredCalls.length + filteredContacts.length + filteredSales.length} résultat(s) trouvé(s)
          </p>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="leads" className="gap-1"><Users className="h-3.5 w-3.5" /> Leads {q && <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">{filteredLeads.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="calls" className="gap-1"><Phone className="h-3.5 w-3.5" /> Calls {q && <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">{filteredCalls.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="contacts" className="gap-1"><BookUser className="h-3.5 w-3.5" /> Contacts {q && <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">{filteredContacts.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="sales" className="gap-1"><BadgeEuro className="h-3.5 w-3.5" /> Ventes {q && <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">{filteredSales.length}</Badge>}</TabsTrigger>
        </TabsList>

        {/* ── LEADS TAB ── */}
        <TabsContent value="leads">
          <Card className="border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Setter</TableHead>
                  <TableHead>Apporteur</TableHead>
                  <TableHead>Contact lié</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((l) => (
                  <TableRow key={l.id} className="border-border hover:bg-secondary/50 transition-colors">
                    <TableCell>
                      <EditableCell value={l.raw_full_name} onSave={async (v) => updateField("leads", l.id, "raw_full_name", v, fetchLeads)} />
                    </TableCell>
                    <TableCell>
                      <EditableCell value={l.raw_email} onSave={async (v) => updateField("leads", l.id, "raw_email", v, fetchLeads)} />
                    </TableCell>
                    <TableCell>
                      <EditableCell value={l.raw_phone} onSave={async (v) => updateField("leads", l.id, "raw_phone", v, fetchLeads)} />
                    </TableCell>
                    <TableCell>
                      <EditableCell
                        value={l.source}
                        type="select"
                        options={LEAD_SOURCES}
                        optionLabels={Object.fromEntries(LEAD_SOURCES.map(s => [s, getSourceLabel(s)]))}
                        onSave={async (v) => updateField("leads", l.id, "source", v, fetchLeads)}
                      />
                    </TableCell>
                    <TableCell>
                      <EditableCell
                        value={l.status}
                        type="select"
                        options={LEAD_STATUSES}
                        optionLabels={LEAD_STATUS_LABELS}
                        onSave={async (v) => updateField("leads", l.id, "status", v, fetchLeads)}
                      />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{l.assigned_to_name || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{l.apporteur_name || "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {l.contact_name ? (
                          <Button variant="ghost" size="sm" className="text-xs gap-1 text-primary" onClick={() => setSelectedContactId(l.contact_id!)}>
                            <ExternalLink className="h-3 w-3" /> {l.contact_name}
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Aucun</span>
                        )}
                        <LinkButton linked={!!l.contact_id} onClick={() => openLinkModal("lead", l.id, "contact_id", l.contact_id, "Rattacher à un contact")} tooltip="Modifier le contact lié" />
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDate(l.created_at)}</TableCell>
                    <TableCell>
                      <DeleteButton onClick={() => setDeleteTarget({ type: "lead", id: l.id, label: l.raw_full_name || l.raw_email || l.id.slice(0, 8) })} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredLeads.length === 0 && (
              <div className="py-12 text-center text-muted-foreground">Aucun lead trouvé</div>
            )}
          </Card>
        </TabsContent>

        {/* ── CALLS TAB ── */}
        <TabsContent value="calls">
          <Card className="border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Closer</TableHead>
                  <TableHead>Contact lié</TableHead>
                  <TableHead>Lead lié</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCalls.map((c) => (
                  <TableRow key={c.id} className="border-border hover:bg-secondary/50 transition-colors">
                    <TableCell>
                      <EditableCell value={c.raw_full_name} onSave={async (v) => updateField("calls", c.id, "raw_full_name", v, fetchCalls)} />
                    </TableCell>
                    <TableCell>
                      <EditableCell value={c.raw_email} onSave={async (v) => updateField("calls", c.id, "raw_email", v, fetchCalls)} />
                    </TableCell>
                    <TableCell>
                      <EditableCell value={c.raw_phone} onSave={async (v) => updateField("calls", c.id, "raw_phone", v, fetchCalls)} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDate(c.scheduled_at)}</TableCell>
                    <TableCell>
                      <EditableCell
                        value={c.event_type}
                        type="select"
                        options={CALL_EVENT_TYPES}
                        optionLabels={{ vsl: "VSL", conference: "Conférence", pole_vente: "Pôle Vente", "": "—" }}
                        onSave={async (v) => updateField("calls", c.id, "event_type", v === "_empty" ? "" : v, fetchCalls)}
                      />
                    </TableCell>
                    <TableCell>
                      <EditableCell
                        value={c.status}
                        type="select"
                        options={CALL_STATUSES}
                        optionLabels={CALL_STATUS_LABELS}
                        onSave={async (v) => updateField("calls", c.id, "status", v, fetchCalls)}
                      />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.assigned_to_name || "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {c.contact_name ? (
                          <Button variant="ghost" size="sm" className="text-xs gap-1 text-primary" onClick={() => setSelectedContactId(c.contact_id!)}>
                            <ExternalLink className="h-3 w-3" /> {c.contact_name}
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Aucun</span>
                        )}
                        <LinkButton linked={!!c.contact_id} onClick={() => openLinkModal("call", c.id, "contact_id", c.contact_id, "Rattacher à un contact")} tooltip="Modifier le contact lié" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {c.lead_id ? (
                          <span className="text-xs text-primary">{c.lead_id.slice(0, 8)}…</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Aucun</span>
                        )}
                        <LinkButton linked={!!c.lead_id} onClick={() => openLinkModal("call", c.id, "lead_id", c.lead_id, "Rattacher à un lead")} tooltip="Modifier le lead lié" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <DeleteButton onClick={() => setDeleteTarget({ type: "call", id: c.id, label: c.raw_full_name || c.contact_name || c.id.slice(0, 8) })} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredCalls.length === 0 && (
              <div className="py-12 text-center text-muted-foreground">Aucun call trouvé</div>
            )}
          </Card>
        </TabsContent>

        {/* ── CONTACTS TAB ── */}
        <TabsContent value="contacts">
          <Card className="border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Date création</TableHead>
                  <TableHead>Actions</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.map((c) => (
                  <TableRow key={c.id} className="border-border hover:bg-secondary/50 transition-colors">
                    <TableCell>
                      <EditableCell value={c.full_name} onSave={async (v) => updateField("contacts", c.id, "full_name", v, fetchContacts)} />
                    </TableCell>
                    <TableCell>
                      <EditableCell value={c.email} onSave={async (v) => updateField("contacts", c.id, "email", v, fetchContacts)} />
                    </TableCell>
                    <TableCell>
                      <EditableCell value={c.phone_normalized} onSave={async (v) => updateField("contacts", c.id, "phone_normalized", v, fetchContacts)} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDate(c.created_at)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={(e) => { e.stopPropagation(); setSelectedContactId(c.id); }}>
                        <ExternalLink className="h-3.5 w-3.5" /> Voir fiche
                      </Button>
                    </TableCell>
                    <TableCell>
                      <DeleteButton onClick={() => setDeleteTarget({ type: "contact", id: c.id, label: c.full_name || c.email || c.id.slice(0, 8) })} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredContacts.length === 0 && (
              <div className="py-12 text-center text-muted-foreground">Aucun contact trouvé</div>
            )}
          </Card>
        </TabsContent>

        {/* ── SALES TAB ── */}
        <TabsContent value="sales">
          <Card className="border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Contact</TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead>Montant HT</TableHead>
                  <TableHead>Statut paiement</TableHead>
                  <TableHead>Closer</TableHead>
                  <TableHead>Lead lié</TableHead>
                  <TableHead>Call lié</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.map((s) => (
                  <TableRow key={s.id} className="border-border hover:bg-secondary/50 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-foreground text-sm">{s.contact_name || "—"}</span>
                        <LinkButton linked={!!s.contact_id} onClick={() => openLinkModal("sale", s.id, "contact_id", s.contact_id, "Rattacher à un contact")} tooltip="Modifier le contact lié" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <EditableCell
                        value={s.product}
                        type="select"
                        options={PRODUCTS}
                        onSave={async (v) => updateField("sales", s.id, "product", v, fetchSales)}
                      />
                    </TableCell>
                    <TableCell>
                      <EditableCell
                        value={String(s.amount_ht)}
                        type="number"
                        onSave={async (v) => updateField("sales", s.id, "amount_ht", v, fetchSales)}
                        className="font-semibold"
                      />
                    </TableCell>
                    <TableCell>
                      <EditableCell
                        value={s.payment_status || "pending"}
                        type="select"
                        options={Object.keys(PAYMENT_LABELS)}
                        optionLabels={PAYMENT_LABELS}
                        onSave={async (v) => updateField("sales", s.id, "payment_status", v, fetchSales)}
                      />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.closed_by_name || "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {s.lead_id ? (
                          <span className="text-xs text-primary">{s.lead_id.slice(0, 8)}…</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Aucun</span>
                        )}
                        <LinkButton linked={!!s.lead_id} onClick={() => openLinkModal("sale", s.id, "lead_id", s.lead_id, "Rattacher à un lead")} tooltip="Modifier le lead lié" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {s.call_id ? (
                          <span className="text-xs text-primary">{s.call_id.slice(0, 8)}…</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Aucun</span>
                        )}
                        <LinkButton linked={!!s.call_id} onClick={() => openLinkModal("sale", s.id, "call_id", s.call_id, "Rattacher à un call")} tooltip="Modifier le call lié" />
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDate(s.sold_at)}</TableCell>
                    <TableCell>
                      <DeleteButton onClick={() => setDeleteTarget({ type: "sale", id: s.id, label: `${s.contact_name || ""} — ${s.product}` })} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredSales.length === 0 && (
              <div className="py-12 text-center text-muted-foreground">Aucune vente trouvée</div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer <strong>{deleteTarget?.label}</strong> ?
              Cette action est irréversible et supprimera aussi les données liées (activités, commissions…).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Link Modal ── */}
      <Dialog open={!!linkModal} onOpenChange={(v) => !v && setLinkModal(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" /> {linkModal?.label}
            </DialogTitle>
            <DialogDescription>
              Sélectionnez l'élément à rattacher ou détachez le lien existant.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Rechercher</Label>
              <Input
                placeholder="Filtrer par nom, email, téléphone..."
                value={linkSearch}
                onChange={(e) => setLinkSearch(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="max-h-72 overflow-y-auto border rounded-md">
              {getLinkOptions().length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">Aucun résultat</div>
              ) : (
                getLinkOptions().map((opt) => (
                  <div
                    key={opt.id}
                    onClick={() => setLinkValue(opt.id)}
                    className={`px-3 py-2.5 cursor-pointer transition-colors border-b last:border-b-0 ${
                      linkValue === opt.id
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-secondary/50 text-foreground"
                    }`}
                  >
                    <p className="text-sm">{opt.label}</p>
                    {opt.sub && <p className="text-xs text-muted-foreground mt-0.5">{opt.sub}</p>}
                  </div>
                ))
              )}
            </div>

            {linkModal?.currentValue && (
              <p className="text-xs text-muted-foreground">
                ID actuel : <code className="bg-muted px-1 rounded">{linkModal.currentValue.slice(0, 12)}…</code>
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            {linkModal?.currentValue && (
              <Button variant="destructive" size="sm" onClick={unlinkField} disabled={linkSaving}>
                <Unlink className="h-4 w-4 mr-1" /> Détacher
              </Button>
            )}
            <Button onClick={saveLink} disabled={linkSaving || !linkValue} size="sm">
              <Link2 className="h-4 w-4 mr-1" /> Rattacher
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contact Sheet */}
      <ContactSheet contactId={selectedContactId} open={!!selectedContactId} onClose={() => setSelectedContactId(null)} />
    </div>
  );
}
