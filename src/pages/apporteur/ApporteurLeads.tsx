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
import { Users, UserPlus, RefreshCw, Search, Pencil } from "lucide-react";
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

// Liste des statuts qu'un apporteur peut appliquer à ses propres leads.
// Doit rester aligné avec la whitelist de la RPC apporteur_update_lead_status.
const APPORTEUR_EDITABLE_STATUSES = [
  { value: "a_qualifier", label: "À qualifier" },
  { value: "inscrit_conference", label: "Inscrit conférence" },
  { value: "call_booke", label: "Call booké" },
  { value: "a_relancer", label: "À relancer" },
  { value: "faux_numero", label: "Faux numéro" },
  { value: "pas_qualifie", label: "Pas qualifié" },
  { value: "perdu", label: "Perdu" },
  { value: "close", label: "Close (vente)" },
  { value: "pas_de_reponse", label: "Pas de réponse" },
  { value: "pas_de_reponse_post_conference", label: "Pas de réponse post-conf" },
];

// Statuts qui déclenchent un recyclage instantané du lead
// (désaffectation du commercial + retour dans le pot "À recycler" du CEO).
// Identique à INSTANT_RECYCLE_STATUSES côté ProcessLeadModal.
const RECYCLE_TRIGGER_STATUSES = new Set(["pas_de_reponse", "pas_de_reponse_post_conference"]);

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

  // Edit-status modal state
  const [editLead, setEditLead] = useState<LeadEnriched | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  function openEditModal(lead: LeadEnriched) {
    setEditLead(lead);
    setEditStatus(lead.status || "a_qualifier");
    setEditNote("");
  }

  async function handleSaveEdit() {
    if (!editLead || !editLead.id) return;
    setEditSaving(true);
    try {
      const { data, error } = await (supabase as any).rpc("apporteur_update_lead_status", {
        p_lead_id: editLead.id,
        p_new_status: editStatus,
        p_note: editNote.trim() || null,
      });
      if (error) throw new Error(error.message);
      const result = data as { ok: boolean; changed: boolean; recycled?: boolean };
      toast({
        title: result?.changed ? "Statut mis à jour" : "Aucun changement",
        description: !result?.changed
          ? "Le statut était déjà identique."
          : result?.recycled
            ? "Statut modifié et lead recyclé (commercial retiré, retour au pot « À recycler »)."
            : "Le statut du lead a bien été modifié.",
      });
      setEditLead(null);
      setEditNote("");
      await fetchLeads();
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err?.message || "Impossible de modifier le statut",
        variant: "destructive",
      });
    } finally {
      setEditSaving(false);
    }
  }

  // Récupère les leads de l'apporteur :
  //  - apporteur_id = moi (les leads que J'AI apportés)
  //  - assigned_to = moi (les leads que le CEO/admin M'A AFFECTÉS pour traitement)
  // Permet aux apporteurs de recevoir des leads à traiter comme un collaborateur intermédiaire.
  const fetchLeads = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from("leads_enriched")
      .select("*")
      .or(`apporteur_id.eq.${profile.id},assigned_to.eq.${profile.id}`)
      .order("created_at", { ascending: false });
    setLeads(data || []);
    setLoading(false);
  }, [profile]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const resetForm = () => {
    setFullName(""); setEmail(""); setPhone(""); setSource(""); setSourceDetail(""); setLeadStatus(""); setNotes("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !fullName.trim() || !phone || !source || !leadStatus) return;
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

    const apporteurSource = source.replace(/^apporteur_/, "");

    const { error: insertError } = await supabase.from("leads").insert({
      contact_id: contactId,
      raw_full_name: fullName.trim().toUpperCase(),
      raw_email: email.trim() || null,
      raw_phone: phone,
      source,
      source_detail: source === "apporteur_autre" ? sourceDetail.trim() || null : null,
      apporteur_id: profile.id,
      apporteur_source: apporteurSource,
      apporteur_source_detail: source === "apporteur_autre" ? sourceDetail.trim() || null : null,
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
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((lead) => {
                  const isAssignedToMe = lead.assigned_to === profile?.id && lead.apporteur_id !== profile?.id;
                  return (
                  <TableRow key={lead.id} className="border-border hover:bg-secondary/50 transition-colors">
                    <TableCell>
                      <div className="flex items-start gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground">{lead.contact_full_name || "—"}</p>
                          {lead.contact_email && <p className="text-xs text-muted-foreground">{lead.contact_email}</p>}
                        </div>
                        {isAssignedToMe && (
                          <Badge variant="outline" className="text-[9px] leading-tight shrink-0 bg-cyan-500/15 text-cyan-300 border-cyan-500/20" title="Lead que le CEO/admin t'a affecté pour traitement">
                            Affecté à moi
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-foreground">{lead.contact_phone || "—"}</TableCell>
                    <TableCell>
                      {lead.source && (
                        <Badge variant="outline" className={`text-xs ${getSourceBadgeClass(lead.source, lead.source_detail)}`}>
                          {getSourceLabel(lead.source, lead.source_detail)}
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
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="Modifier le statut"
                        onClick={() => openEditModal(lead)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          {/* Mobile */}
          <div className="space-y-3 md:hidden">
            {filtered.map((lead) => {
              const isAssignedToMe = lead.assigned_to === profile?.id && lead.apporteur_id !== profile?.id;
              return (
              <Card
                key={lead.id}
                className="border-border/50 cursor-pointer hover:border-primary/40 transition-colors"
                onClick={() => openEditModal(lead)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-semibold text-foreground">{lead.contact_full_name || "—"}</p>
                        {isAssignedToMe && (
                          <Badge variant="outline" className="text-[9px] leading-tight bg-cyan-500/15 text-cyan-300 border-cyan-500/20">
                            Affecté à moi
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{lead.contact_phone}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {lead.status && (
                        <Badge variant="outline" className={`text-xs ${LEAD_STATUS_COLORS[lead.status] || ""}`}>
                          {LEAD_STATUS_LABELS[lead.status] || lead.status}
                        </Badge>
                      )}
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    {lead.source && (
                      <Badge variant="outline" className={`text-xs ${getSourceBadgeClass(lead.source, lead.source_detail)}`}>
                        {getSourceLabel(lead.source, lead.source_detail)}
                      </Badge>
                    )}
                    <span>
                      {lead.created_at ? formatDistanceToNow(new Date(lead.created_at), { addSuffix: true, locale: fr }) : ""}
                    </span>
                  </div>
                </CardContent>
              </Card>
              );
            })}
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
              <label className="text-sm font-medium text-foreground">Prénom / Nom *</label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ex : Fatima Dupont" required className="bg-background" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Téléphone *</label>
              <PhoneInput international defaultCountry="FR" value={phone} onChange={setPhone} placeholder="Ex : 6 12 34 56 78" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Ex : fatima@gmail.com" className="bg-background" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Source *</label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Sélectionnez une source" />
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
                <Input value={sourceDetail} onChange={(e) => setSourceDetail(e.target.value)} placeholder="Ex : bouche-à-oreille, événement..." required className="bg-background" />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Statut *</label>
              <Select value={leadStatus} onValueChange={setLeadStatus}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Sélectionnez un statut" />
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
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Informations utiles sur le prospect..." className="bg-background" />
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

      {/* Modale "Modifier le statut" — pour rectifier en cas d'oubli ou
          d'erreur du collaborateur. RPC apporteur_update_lead_status filtre
          côté serveur (whitelist statuts + propriété du lead). */}
      <Dialog open={!!editLead} onOpenChange={(o) => { if (!o) setEditLead(null); }}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Modifier le statut</DialogTitle>
          </DialogHeader>
          {editLead && (
            <div className="space-y-4 py-2">
              <div className="rounded-md border border-border/60 bg-muted/30 p-3">
                <p className="text-sm font-medium text-foreground">
                  {editLead.contact_full_name || "—"}
                </p>
                {editLead.contact_email && (
                  <p className="text-xs text-muted-foreground">{editLead.contact_email}</p>
                )}
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Statut actuel :</span>
                  {editLead.status && (
                    <Badge variant="outline" className={`text-xs ${LEAD_STATUS_COLORS[editLead.status] || ""}`}>
                      {LEAD_STATUS_LABELS[editLead.status] || editLead.status}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Nouveau statut</label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APPORTEUR_EDITABLE_STATUSES.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Note <span className="text-xs text-muted-foreground font-normal">(optionnelle)</span>
                </label>
                <Textarea
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="Ex : oubli du collaborateur, erreur, info reçue par le prospect..."
                  className="bg-background"
                  rows={3}
                />
              </div>

              {RECYCLE_TRIGGER_STATUSES.has(editStatus) && (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300 leading-relaxed">
                  ⚠️ Ce statut déclenche un <strong>recyclage automatique</strong> du lead :
                  le commercial actuellement assigné sera retiré et le lead retournera dans
                  le pot « À recycler » côté admin pour redistribution.
                </div>
              )}

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                La modification est tracée dans l'historique du lead avec votre nom.
                Le commercial concerné verra le changement.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditLead(null)} disabled={editSaving}>
              Annuler
            </Button>
            <Button
              type="button"
              onClick={handleSaveEdit}
              disabled={editSaving || !editStatus}
              className="gradient-primary text-primary-foreground"
            >
              {editSaving && <RefreshCw className="h-4 w-4 animate-spin mr-2" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
