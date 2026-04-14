import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { phoneMatches } from "@/lib/phoneSearch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BookUser, RefreshCw, Search, Eye, Inbox, ChevronLeft, ChevronRight, Copy } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import ContactSheet from "@/components/ContactSheet";

interface ContactRow {
  id: string;
  full_name: string | null;
  email: string | null;
  phone_normalized: string | null;
  created_at: string | null;
  lead_count: number;
  call_count: number;
  last_activity: string | null;
}

const PAGE_SIZE = 50;

export default function Contacts() {
  const { toast } = useToast();
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const fetchContacts = useCallback(async () => {
    const { data: contactsData, error } = await supabase
      .from("contacts")
      .select("id, full_name, email, phone_normalized, created_at")
      .order("created_at", { ascending: false });

    if (error || !contactsData) {
      setLoading(false);
      return;
    }

    const { data: leadsData } = await supabase.from("leads").select("contact_id");
    const { data: callsData } = await supabase.from("calls").select("contact_id, scheduled_at");

    const leadCounts: Record<string, number> = {};
    const callCounts: Record<string, number> = {};
    const lastActivities: Record<string, string> = {};

    leadsData?.forEach((l) => {
      if (l.contact_id) leadCounts[l.contact_id] = (leadCounts[l.contact_id] || 0) + 1;
    });

    callsData?.forEach((c) => {
      if (c.contact_id) {
        callCounts[c.contact_id] = (callCounts[c.contact_id] || 0) + 1;
        if (c.scheduled_at) {
          const existing = lastActivities[c.contact_id];
          if (!existing || c.scheduled_at > existing) lastActivities[c.contact_id] = c.scheduled_at;
        }
      }
    });

    setContacts(contactsData.map((c) => ({
      ...c,
      lead_count: leadCounts[c.id] || 0,
      call_count: callCounts[c.id] || 0,
      last_activity: lastActivities[c.id] || c.created_at,
    })));
    setLoading(false);
  }, []);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchContacts();
    setRefreshing(false);
    toast({ title: "Données actualisées" });
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return contacts;
    const q = search.toLowerCase();
    return contacts.filter(
      (c) =>
        c.full_name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        phoneMatches(c.phone_normalized, search)
    );
  }, [contacts, search]);

  useEffect(() => { setPage(0); }, [search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(
    () => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [filtered, page]
  );

  return (
    <div className="space-y-4">
      {/* Top bar: KPIs + refresh */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border">
            <BookUser className="h-3.5 w-3.5 text-gold-300" />
            <span className="text-sm font-bold text-foreground">{contacts.length}</span>
            <span className="text-xs text-muted-foreground">contacts</span>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRefresh} disabled={refreshing} title="Actualiser">
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Search */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Rechercher nom, email, téléphone..."
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
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-semibold text-foreground">Aucun contact trouvé</p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="w-[200px]">Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead className="text-center">Leads</TableHead>
                  <TableHead className="text-center">Calls</TableHead>
                  <TableHead>Dernier contact</TableHead>
                  <TableHead className="w-[70px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((c) => (
                  <TableRow
                    key={c.id}
                    className="border-border hover:bg-secondary/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedContactId(c.id)}
                  >
                    <TableCell className="font-semibold text-foreground text-sm">{c.full_name || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.email || "—"}</TableCell>
                    <TableCell>
                      {c.phone_normalized ? (
                        <div className="flex items-center gap-1">
                          <a href={`tel:${c.phone_normalized}`} className="text-xs text-muted-foreground hover:text-foreground hover:underline">
                            {c.phone_normalized}
                          </a>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(c.phone_normalized!);
                              toast({ title: "Numéro copié" });
                            }}
                            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-xs text-foreground">{c.lead_count}</TableCell>
                    <TableCell className="text-center text-xs text-foreground">{c.call_count}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.last_activity
                        ? formatDistanceToNow(new Date(c.last_activity), { addSuffix: true, locale: fr })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); setSelectedContactId(c.id); }}
                        title="Voir fiche"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} sur {filtered.length}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" />Préc.
                </Button>
                <span className="text-xs text-muted-foreground">{page + 1}/{totalPages}</span>
                <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                  Suiv.<ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <ContactSheet
        contactId={selectedContactId}
        open={!!selectedContactId}
        onClose={() => setSelectedContactId(null)}
      />
    </div>
  );
}
