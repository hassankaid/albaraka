import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tables } from "@/integrations/supabase/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Users, UserPlus, RefreshCw, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS } from "@/lib/leadConfig";
import { leadSourceConfig, getSourceLabel, getSourceBadgeClass } from "@/lib/leadConfig";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";

type LeadEnriched = Tables<"leads_enriched">;

const APPORTEUR_SOURCES = [
  { value: "apporteur_facebook", label: "Facebook" },
  { value: "apporteur_whatsapp", label: "WhatsApp" },
  { value: "apporteur_instagram", label: "Instagram" },
  { value: "apporteur_linkedin", label: "LinkedIn" },
  { value: "apporteur_recommandation", label: "Recommandation" },
  { value: "apporteur_telegram", label: "Telegram" },
  { value: "apporteur_tiktok", label: "TikTok" },
  { value: "apporteur_autre", label: "Autre" },
];

const STATUS_OPTIONS = [
  { value: "inscrit_conference", label: "Inscrit conférence" },
  { value: "call_booke", label: "Call booké" },
];

export default function ApporteurLeads() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [leads, setLeads] = useState<LeadEnriched[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState<string | undefined>("");
  const [source, setSource] = useState("");
  const [sourceDetail, setSourceDetail] = useState("");
  const [leadStatus, setLeadStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchLeads = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from("leads_enriched")
      .select("*")
      .eq("apporteur_id", profile.id)
      .order("created_at", { ascending: false });
    setLeads(data || []);
    setLoading(false);
  }, [profile]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const resetForm = () => {
    setFullName(""); setEmail(""); setPhone(""); setSource("apporteur_recommandation"); setSourceDetail(""); setLeadStatus("inscrit_conference"); setNotes("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !fullName.trim() || !phone) return;
    if (!isValidPhoneNumber(phone)) {
      toast({ title: "Numéro de téléphone invalide", variant: "destructive" });
      return;
    }
    if (source === "apporteur_autre" && !sourceDetail.trim()) {
      toast({ title: "Veuillez préciser la source", variant: "destructive" });
      return;
    }
    setSaving(true);

    const { data: contactId, error: rpcError } = await supabase.rpc("find_or_create_contact", {
      p_email: email.trim() || "",
      p_phone: phone,
      p_full_name: fullName.trim().toUpperCase(),
    });

    if (rpcError) {
      toast({ title: "Erreur", description: rpcError.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    let finalNotes = "";
    if (source === "apporteur_autre" && sourceDetail.trim()) {
      finalNotes = `Source: ${sourceDetail.trim()}`;
    }
    if (notes.trim()) {
      finalNotes = finalNotes ? `${finalNotes}\n${notes.trim()}` : notes.trim();
    }

    const { error: insertError } = await supabase.from("leads").insert({
      contact_id: contactId,
      source: source,
      source_detail: source,
      apporteur_id: profile.id,
      apporteur_source: source,
      status: leadStatus,
      notes: finalNotes || null,
    });

    if (insertError) {
      toast({ title: "Erreur", description: insertError.message, variant: "destructive" });
    } else {
      toast({ title: "Lead ajouté avec succès" });
      resetForm();
      setFormOpen(false);
      fetchLeads();
    }
    setSaving(false);
  };

  const filtered = leads.filter((l) => {
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const match = [l.contact_full_name, l.contact_phone, l.contact_email]
        .some(v => v?.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const statusOptions = [
    { value: "all", label: "Tous les statuts" },
    ...Object.entries(LEAD_STATUS_LABELS)
      .filter(([k]) => !["nouveau", "contacte", "converti"].includes(k))
      .map(([k, v]) => ({ value: k, label: v })),
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Mes Leads</h2>
          <p className="text-sm text-muted-foreground">{leads.length} lead{leads.length > 1 ? "s" : ""} au total</p>
        </div>
        <Button onClick={() => setFormOpen(true)} className="gradient-primary text-primary-foreground gap-2">
          <UserPlus className="h-4 w-4" />
          Ajouter un lead
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, téléphone, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48 bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="p-8 text-center">
            <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-foreground font-medium">Aucun lead trouvé</p>
            <p className="text-sm text-muted-foreground mt-1">Ajoutez votre premier lead pour commencer.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop */}
          <Card className="border-border/50 overflow-hidden hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Nom</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((lead) => (
                  <TableRow key={lead.id} className="border-border hover:bg-secondary/50 transition-colors">
                    <TableCell>
                      <div>
                        <p className="font-semibold text-foreground">{lead.contact_full_name || "—"}</p>
                        {lead.contact_email && <p className="text-xs text-muted-foreground">{lead.contact_email}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-foreground">{lead.contact_phone || "—"}</TableCell>
                    <TableCell>
                      {lead.source && (
                        <Badge variant="outline" className={`text-xs ${getSourceBadgeClass(lead.source)}`}>
                          {getSourceLabel(lead.source)}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {lead.created_at
                        ? formatDistanceToNow(new Date(lead.created_at), { addSuffix: true, locale: fr })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {lead.status && (
                        <Badge variant="outline" className={`text-xs ${LEAD_STATUS_COLORS[lead.status] || ""}`}>
                          {LEAD_STATUS_LABELS[lead.status] || lead.status}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Mobile */}
          <div className="space-y-3 md:hidden">
            {filtered.map((lead) => (
              <Card key={lead.id} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{lead.contact_full_name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{lead.contact_phone}</p>
                    </div>
                    {lead.status && (
                      <Badge variant="outline" className={`text-xs ${LEAD_STATUS_COLORS[lead.status] || ""}`}>
                        {LEAD_STATUS_LABELS[lead.status] || lead.status}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    {lead.source && (
                      <Badge variant="outline" className={`text-xs ${getSourceBadgeClass(lead.source)}`}>
                        {getSourceLabel(lead.source)}
                      </Badge>
                    )}
                    <span>
                      {lead.created_at ? formatDistanceToNow(new Date(lead.created_at), { addSuffix: true, locale: fr }) : ""}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Add Lead Modal */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Ajouter un lead</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Prénom & Nom *</label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Prénom Nom" required className="bg-background" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Téléphone *</label>
              <PhoneInput international defaultCountry="FR" value={phone} onChange={setPhone} placeholder="6 12 34 56 78" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemple.com" className="bg-background" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Source *</label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPORTEUR_SOURCES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {source === "apporteur_autre" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Précisez la source *</label>
                <Input value={sourceDetail} onChange={(e) => setSourceDetail(e.target.value)} placeholder="Précisez la source..." required className="bg-background" />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Statut *</label>
              <Select value={leadStatus} onValueChange={setLeadStatus}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Notes</label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes optionnelles..." className="bg-background" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={saving} className="gradient-primary text-primary-foreground">
                {saving && <RefreshCw className="h-4 w-4 animate-spin mr-2" />}
                Ajouter
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
