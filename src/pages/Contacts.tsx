import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BookUser, RefreshCw, Search, Eye } from "lucide-react";
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

export default function Contacts() {
  const { toast } = useToast();
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  const fetchContacts = useCallback(async () => {
    // Fetch contacts with counts via separate queries
    const { data: contactsData, error } = await supabase
      .from("contacts")
      .select("id, full_name, email, phone_normalized, created_at")
      .order("created_at", { ascending: false });

    if (error || !contactsData) {
      setLoading(false);
      return;
    }

    // Get lead counts per contact
    const { data: leadsData } = await supabase
      .from("leads")
      .select("contact_id");

    // Get call counts per contact
    const { data: callsData } = await supabase
      .from("calls")
      .select("contact_id, scheduled_at");

    const leadCounts: Record<string, number> = {};
    const callCounts: Record<string, number> = {};
    const lastActivities: Record<string, string> = {};

    leadsData?.forEach((l) => {
      if (l.contact_id) {
        leadCounts[l.contact_id] = (leadCounts[l.contact_id] || 0) + 1;
      }
    });

    callsData?.forEach((c) => {
      if (c.contact_id) {
        callCounts[c.contact_id] = (callCounts[c.contact_id] || 0) + 1;
        if (c.scheduled_at) {
          const existing = lastActivities[c.contact_id];
          if (!existing || c.scheduled_at > existing) {
            lastActivities[c.contact_id] = c.scheduled_at;
          }
        }
      }
    });

    const rows: ContactRow[] = contactsData.map((c) => ({
      ...c,
      lead_count: leadCounts[c.id] || 0,
      call_count: callCounts[c.id] || 0,
      last_activity: lastActivities[c.id] || c.created_at,
    }));

    setContacts(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

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
        c.phone_normalized?.toLowerCase().includes(q)
    );
  }, [contacts, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Contacts</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Répertoire des contacts</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </div>

      {/* Counter */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 border-border/50 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-background/50">
              <BookUser className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{contacts.length}</p>
              <p className="text-xs text-muted-foreground">Total contacts</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher nom, email, téléphone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-card"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookUser className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-semibold text-foreground">Aucun contact trouvé</p>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <Card className="border-border/50 overflow-hidden hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead className="text-center">Leads</TableHead>
                  <TableHead className="text-center">Calls</TableHead>
                  <TableHead>Dernier contact</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow
                    key={c.id}
                    className="border-border hover:bg-secondary/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedContactId(c.id)}
                  >
                    <TableCell className="font-semibold text-foreground">{c.full_name || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.email || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.phone_normalized || "—"}</TableCell>
                    <TableCell className="text-center text-sm text-foreground">{c.lead_count}</TableCell>
                    <TableCell className="text-center text-sm text-foreground">{c.call_count}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.last_activity
                        ? formatDistanceToNow(new Date(c.last_activity), { addSuffix: true, locale: fr })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => { e.stopPropagation(); setSelectedContactId(c.id); }}
                        className="text-xs gap-1"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Voir fiche
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {filtered.map((c) => (
              <Card
                key={c.id}
                className="border-border/50 cursor-pointer hover:bg-secondary/50 transition-colors"
                onClick={() => setSelectedContactId(c.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{c.full_name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{c.email}</p>
                      <p className="text-xs text-muted-foreground">{c.phone_normalized}</p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>{c.lead_count} leads · {c.call_count} calls</p>
                      {c.last_activity && (
                        <p>{formatDistanceToNow(new Date(c.last_activity), { addSuffix: true, locale: fr })}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Contact sheet */}
      <ContactSheet
        contactId={selectedContactId}
        open={!!selectedContactId}
        onClose={() => setSelectedContactId(null)}
      />
    </div>
  );
}
