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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Users, UserPlus, RefreshCw, Search, Pencil, Sparkles, Inbox, ClipboardList } from "lucide-react";
import LeadScoringPanel from "@/components/leads/LeadScoringPanel";
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

// Deux vues distinctes sur les leads de l'apporteur :
//  - "apportes"  : tous les leads dont apporteur_id=moi, quel que soit le canal
//                  (quiz, Instagram, TikTok, etc.). Un sous-filtre permet de
//                  zoomer sur un canal spécifique.
//  - "a_traiter" : leads que le CEO/admin lui a affectés pour les traiter
//                  (assigned_to=moi). Recherche + filtre statut habituels.
type LeadTab = "apportes" | "a_traiter";

// Labels affichés dans le sous-filtre "Source" de l'onglet "Mes leads apportés".
// La clé correspond à la colonne `source` de la table leads.
const APPORTEUR_SOURCE_LABELS: Record<string, string> = {
  apporteur_quiz: "Quiz",
  apporteur_facebook: "Facebook",
  apporteur_whatsapp: "WhatsApp",
  apporteur_instagram: "Instagram",
  apporteur_linkedin: "LinkedIn",
  apporteur_recommandation: "Recommandation",
  apporteur_telegram: "Telegram",
  apporteur_tiktok: "TikTok",
  apporteur_autre: "Autre",
};

export default function ApporteurLeads() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [leads, setLeads] = useState<LeadEnriched[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<LeadTab>("apportes");
  // Sous-filtre "Source" actif dans l'onglet "Mes leads apportés".
  // "all" = toutes sources confondues.
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  // Form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState<string | undefined>("");
  const [source, setSource] = useState("");
  const [sourceDetail, setSourceDetail] = useState("");
  const [leadStatus, setLeadStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit modal state (statut + source).
  // La modification de source n'est proposée QUE pour les leads que l'apporteur
  // a apportés lui-même (lead.apporteur_id === profile.id) — pas pour ceux qui
  // lui ont été simplement affectés (assigned_to). Trace dans lead_activities.
  // Mini-modale "Diagnostic Quiz" pour consulter les réponses scoring du lead
  // depuis l'interface apporteur (lecture seule, sans score ni catégorie).
  const [scoringLead, setScoringLead] = useState<LeadEnriched | null>(null);

  const [editLead, setEditLead] = useState<LeadEnriched | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editSource, setEditSource] = useState("");
  const [editSourceDetail, setEditSourceDetail] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Le caller peut-il modifier la SOURCE ? Oui ssi il EST l'apporteur du lead.
  // C'est sa donnée à lui (il l'a saisie au départ), donc il peut la corriger
  // même si le lead est en cours de traitement par un autre collab.
  const canEditSource = !!editLead && editLead.apporteur_id === profile?.id;

  // Le caller peut-il modifier le STATUT ? Oui dans 2 cas :
  //  1) Le lead lui est assigné (assigned_to=moi) → il est en charge du traitement
  //  2) Le lead n'est encore assigné à personne (assigned_to=NULL) ET il en est
  //     l'apporteur → pas de risque de double saisie.
  // Sinon (lead assigné à quelqu'un d'autre), édition du statut bloquée pour
  // éviter d'écraser le travail du collab qui traite le lead.
  const canEditStatus = !!editLead && (
    editLead.assigned_to === profile?.id ||
    (editLead.assigned_to === null && editLead.apporteur_id === profile?.id)
  );

  // Nom du collab/admin actuellement en charge du lead (pour afficher dans la
  // colonne "Assigné à" et dans la modale en mode "double saisie bloquée").
  const editLeadAssignee = editLead?.assigned_to_name ?? null;

  function openEditModal(lead: LeadEnriched) {
    setEditLead(lead);
    setEditStatus(lead.status || "a_qualifier");
    // Pré-remplit la source depuis l'état actuel du lead. La colonne `source`
    // contient la valeur préfixée "apporteur_xxx" pour les leads apporteurs.
    // Si le lead a été créé via un autre canal (ex : import), la source peut
    // ne pas matcher la whitelist : on tombe alors sur le placeholder.
    const currentSource = lead.source || "";
    const isInWhitelist = APPORTEUR_SOURCES.some((s) => s.value === currentSource);
    setEditSource(isInWhitelist ? currentSource : "");
    setEditSourceDetail(lead.source_detail || "");
    setEditNote("");
  }

  async function handleSaveEdit() {
    if (!editLead || !editLead.id) return;
    setEditSaving(true);
    try {
      // 1) Statut — uniquement si le caller a le droit de l'éditer.
      //    Empêche la double saisie : si le lead est assigné à un autre
      //    collab, l'apporteur ne peut PAS toucher au statut (l'assigné le
      //    pilote). Cf. canEditStatus.
      let statusResult: { ok: boolean; changed: boolean; recycled?: boolean } | null = null;
      if (canEditStatus) {
        const { data: statusData, error: statusErr } = await (supabase as any).rpc(
          "apporteur_update_lead_status",
          {
            p_lead_id: editLead.id,
            p_new_status: editStatus,
            p_note: editNote.trim() || null,
          },
        );
        if (statusErr) throw new Error(statusErr.message);
        statusResult = statusData as { ok: boolean; changed: boolean; recycled?: boolean };
      }

      // 2) Source — seulement si l'apporteur est le propriétaire du lead ET
      //    qu'il a sélectionné une source valide. Reste autorisé même si le
      //    lead est assigné ailleurs (c'est sa propre donnée d'apporteur).
      let sourceChanged = false;
      if (canEditSource && editSource) {
        const { data: srcData, error: srcErr } = await (supabase as any).rpc(
          "apporteur_update_lead_source",
          {
            p_lead_id: editLead.id,
            p_source: editSource,
            p_source_detail: editSource === "apporteur_autre" ? (editSourceDetail.trim() || null) : null,
            p_note: !canEditStatus && editNote.trim() ? editNote.trim() : null,
          },
        );
        if (srcErr) throw new Error(srcErr.message);
        const srcResult = srcData as { ok: boolean; changed: boolean };
        sourceChanged = !!srcResult?.changed;
      }

      // Toast récapitulatif
      const parts: string[] = [];
      if (statusResult?.changed) {
        parts.push(statusResult.recycled ? "statut modifié + lead recyclé" : "statut modifié");
      }
      if (sourceChanged) parts.push("source modifiée");

      if (parts.length === 0) {
        toast({
          title: "Aucun changement",
          description: "Tout était déjà identique.",
        });
      } else {
        toast({
          title: "Lead mis à jour",
          description: parts.join(" + ") + ".",
        });
      }

      setEditLead(null);
      setEditNote("");
      await fetchLeads();
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err?.message || "Impossible de modifier le lead",
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

  // Découpe les leads par onglet AVANT d'appliquer recherche + filtre statut,
  // pour que les compteurs reflètent toujours le périmètre brut de l'onglet.
  const apportesLeads = leads.filter((l) => l.apporteur_id === profile?.id);
  const aTraiterLeads = leads.filter((l) => l.assigned_to === profile?.id);

  // Sources réellement présentes dans les leads apportés (= options dynamiques
  // du sous-filtre). On évite d'afficher "Telegram" si l'utilisateur n'a jamais
  // apporté via Telegram.
  const sourcesPresentes = Array.from(
    new Set(apportesLeads.map((l) => l.source).filter(Boolean))
  ) as string[];
  // Comptage par source pour afficher le badge à côté de chaque option.
  const sourceCounts = apportesLeads.reduce<Record<string, number>>((acc, l) => {
    if (l.source) acc[l.source] = (acc[l.source] ?? 0) + 1;
    return acc;
  }, {});

  const activeLeads = activeTab === "apportes" ? apportesLeads : aTraiterLeads;

  const filtered = activeLeads.filter((l) => {
    // Filtre source : uniquement dans l'onglet "Mes leads apportés"
    if (activeTab === "apportes" && sourceFilter !== "all" && l.source !== sourceFilter) return false;
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
          <p className="text-sm text-muted-foreground">
            {apportesLeads.length} apporté{apportesLeads.length > 1 ? "s" : ""} · {aTraiterLeads.length} à traiter
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)} className="gradient-primary text-primary-foreground gap-2">
          <UserPlus className="h-4 w-4" />
          Ajouter un lead
        </Button>
      </div>

      {/* Onglets : "Mes leads apportés" vs "Mes leads à traiter" */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as LeadTab)}>
        <TabsList className="bg-card border border-border/60">
          <TabsTrigger value="apportes" className="gap-2 data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Mes leads apportés
            <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0 h-4 bg-background/60">
              {apportesLeads.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="a_traiter" className="gap-2 data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
            <Inbox className="h-3.5 w-3.5" />
            Mes leads à traiter
            <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0 h-4 bg-background/60">
              {aTraiterLeads.length}
            </Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

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
        {/* Sous-filtre par source : visible uniquement dans l'onglet
            "Mes leads apportés", et masqué s'il n'y a qu'une seule source
            (pas d'intérêt à filtrer). */}
        {activeTab === "apportes" && sourcesPresentes.length > 1 && (
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-48 bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les sources</SelectItem>
              {sourcesPresentes
                .slice()
                .sort((a, b) => (sourceCounts[b] ?? 0) - (sourceCounts[a] ?? 0))
                .map((src) => (
                  <SelectItem key={src} value={src}>
                    {APPORTEUR_SOURCE_LABELS[src] ?? src} ({sourceCounts[src] ?? 0})
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        )}
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
            {activeTab === "apportes" ? (
              <>
                <p className="text-foreground font-medium">
                  {apportesLeads.length === 0
                    ? "Aucun lead apporté pour l'instant"
                    : "Aucun lead ne correspond à ta recherche"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {apportesLeads.length === 0
                    ? "Partage ton lien quiz ou ajoute un lead manuellement pour commencer."
                    : "Essaie de retirer les filtres (source, statut ou recherche)."}
                </p>
              </>
            ) : (
              <>
                <p className="text-foreground font-medium">
                  {aTraiterLeads.length === 0 ? "Aucun lead à traiter pour l'instant" : "Aucun lead ne correspond à ta recherche"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {aTraiterLeads.length === 0
                    ? "Le CEO/admin ne t'a affecté aucun lead pour l'instant."
                    : "Essaie de retirer le filtre statut ou la recherche."}
                </p>
              </>
            )}
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
                  {/* Colonne "Assigné à" uniquement dans l'onglet "Mes leads
                      apportés" — utile pour savoir qui traite ce lead et
                      éviter la double saisie. Dans "Mes leads à traiter",
                      c'est toujours moi → colonne inutile. */}
                  {activeTab === "apportes" && <TableHead>Assigné à</TableHead>}
                  <TableHead>Date</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((lead) => {
                  const isAssignedToMe = lead.assigned_to === profile?.id && lead.apporteur_id !== profile?.id;
                  const isMineUnassigned = lead.apporteur_id === profile?.id && lead.assigned_to === null;
                  const isMineButAssignedElsewhere = lead.apporteur_id === profile?.id && lead.assigned_to !== null && lead.assigned_to !== profile?.id;
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
                    {activeTab === "apportes" && (
                      <TableCell className="text-sm">
                        {lead.assigned_to_name ? (
                          <span className="text-foreground">{lead.assigned_to_name}</span>
                        ) : (
                          <span className="text-muted-foreground italic">Non assigné</span>
                        )}
                      </TableCell>
                    )}
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
                      <div className="flex items-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title="Voir le diagnostic Quiz (réponses + alertes du lead)"
                          onClick={() => setScoringLead(lead)}
                        >
                          <ClipboardList className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title={
                            isMineButAssignedElsewhere
                              ? `Lead en cours de traitement par ${lead.assigned_to_name ?? "un autre collab"} — tu peux uniquement corriger la source`
                              : "Modifier le statut (et la source si tu as apporté ce lead)"
                          }
                          onClick={() => openEditModal(lead)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </div>
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
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {lead.status && (
                        <Badge variant="outline" className={`text-xs ${LEAD_STATUS_COLORS[lead.status] || ""}`}>
                          {LEAD_STATUS_LABELS[lead.status] || lead.status}
                        </Badge>
                      )}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setScoringLead(lead); }}
                        className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-secondary/70 transition-colors"
                        title="Voir le diagnostic Quiz"
                      >
                        <ClipboardList className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground flex-wrap">
                    {lead.source && (
                      <Badge variant="outline" className={`text-xs ${getSourceBadgeClass(lead.source, lead.source_detail)}`}>
                        {getSourceLabel(lead.source, lead.source_detail)}
                      </Badge>
                    )}
                    <span>
                      {lead.created_at ? formatDistanceToNow(new Date(lead.created_at), { addSuffix: true, locale: fr }) : ""}
                    </span>
                  </div>
                  {/* Mobile : affiche "Assigné à" uniquement dans "Mes leads apportés" */}
                  {activeTab === "apportes" && (
                    <div className="mt-2 pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
                      Assigné à&nbsp;:{" "}
                      <span className={lead.assigned_to_name ? "text-foreground font-medium" : "italic"}>
                        {lead.assigned_to_name ?? "Non assigné"}
                      </span>
                    </div>
                  )}
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

      {/* Modale "Modifier le lead" — pour rectifier statut et/ou source en cas
          d'oubli ou d'erreur. La modification de source n'est proposée que pour
          les leads que l'apporteur a apportés lui-même (apporteur_id === moi).
          Les RPCs apporteur_update_lead_status et apporteur_update_lead_source
          filtrent côté serveur (whitelist + ownership). */}
      <Dialog open={!!editLead} onOpenChange={(o) => { if (!o) setEditLead(null); }}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {canEditStatus && canEditSource
                ? "Modifier le lead"
                : canEditStatus
                  ? "Modifier le statut"
                  : canEditSource
                    ? "Corriger la source du lead"
                    : "Détails du lead"}
            </DialogTitle>
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
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Statut :</span>
                    {editLead.status && (
                      <Badge variant="outline" className={`text-xs ${LEAD_STATUS_COLORS[editLead.status] || ""}`}>
                        {LEAD_STATUS_LABELS[editLead.status] || editLead.status}
                      </Badge>
                    )}
                  </div>
                  {editLead.source && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Source :</span>
                      <Badge variant="outline" className={`text-xs ${getSourceBadgeClass(editLead.source, editLead.source_detail)}`}>
                        {getSourceLabel(editLead.source, editLead.source_detail)}
                      </Badge>
                    </div>
                  )}
                </div>
                {/* Affiche l'assigné actuel — info clé pour comprendre qui
                    pilote le statut. */}
                <div className="mt-2 pt-2 border-t border-border/40 text-xs">
                  <span className="text-muted-foreground">Assigné à :</span>{" "}
                  <span className={editLeadAssignee ? "text-foreground font-medium" : "text-muted-foreground italic"}>
                    {editLeadAssignee ?? "Non assigné"}
                  </span>
                </div>
              </div>

              {/* Avertissement : on ne peut pas toucher au statut si le lead
                  est en cours de traitement par quelqu'un d'autre. Évite la
                  double saisie / l'écrasement du travail du collab assigné. */}
              {!canEditStatus && (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/[0.06] p-3 text-xs leading-relaxed">
                  <p className="text-amber-300 font-medium">
                    Statut verrouillé
                  </p>
                  <p className="text-muted-foreground mt-1">
                    Ce lead est en cours de traitement par{" "}
                    <span className="text-foreground font-medium">
                      {editLeadAssignee ?? "un autre collaborateur"}
                    </span>
                    . Pour éviter d'écraser son travail, tu ne peux pas
                    modifier son statut.
                    {canEditSource && " Tu peux uniquement corriger la source ci-dessous."}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Nouveau statut
                  {!canEditStatus && (
                    <span className="text-xs text-muted-foreground font-normal ml-2">(verrouillé)</span>
                  )}
                </label>
                <Select value={editStatus} onValueChange={setEditStatus} disabled={!canEditStatus}>
                  <SelectTrigger className="bg-background disabled:opacity-50 disabled:cursor-not-allowed">
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

              {/* Modification de source — uniquement pour les leads apportés
                  par l'apporteur lui-même. */}
              {canEditSource && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Source du lead{" "}
                      <span className="text-xs text-muted-foreground font-normal">(modifiable car tu as apporté ce lead)</span>
                    </label>
                    <Select value={editSource} onValueChange={setEditSource}>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Sélectionner une source" />
                      </SelectTrigger>
                      <SelectContent>
                        {APPORTEUR_SOURCES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {editSource === "apporteur_autre" && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Précisez la source *</label>
                      <Input
                        value={editSourceDetail}
                        onChange={(e) => setEditSourceDetail(e.target.value)}
                        placeholder="Ex : bouche-à-oreille, événement..."
                        className="bg-background"
                      />
                    </div>
                  )}
                </>
              )}

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

              {canEditStatus && RECYCLE_TRIGGER_STATUSES.has(editStatus) && (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300 leading-relaxed">
                  ⚠️ Ce statut déclenche un <strong>recyclage automatique</strong> du lead :
                  le commercial actuellement assigné sera retiré et le lead retournera dans
                  le pot « À recycler » côté admin pour redistribution.
                </div>
              )}

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Toute modification (statut ou source) est tracée dans l'historique du lead avec votre nom.
                {canEditSource && " Les changements de source sont visibles par les admins."}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditLead(null)} disabled={editSaving}>
              {canEditStatus || canEditSource ? "Annuler" : "Fermer"}
            </Button>
            {(canEditStatus || canEditSource) && (
              <Button
                type="button"
                onClick={handleSaveEdit}
                disabled={
                  editSaving
                  || (canEditStatus && !editStatus)
                  || (canEditSource && editSource === "apporteur_autre" && !editSourceDetail.trim())
                }
                className="gradient-primary text-primary-foreground"
              >
                {editSaving && <RefreshCw className="h-4 w-4 animate-spin mr-2" />}
                Enregistrer
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mini-modale "Diagnostic Quiz" : affiche les réponses + alertes setter
          du lead pour aider l'apporteur à préparer son appel.
          Score et catégorie (tiède/chaud/froid) sont masqués — c'est de
          l'évaluation interne réservée au CEO. */}
      <Dialog open={!!scoringLead} onOpenChange={(o) => { if (!o) setScoringLead(null); }}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Diagnostic Quiz — {scoringLead?.contact_full_name || "lead"}
            </DialogTitle>
          </DialogHeader>
          {scoringLead && (
            <div className="py-1">
              <LeadScoringPanel
                email={scoringLead.contact_email}
                showScoreAndCategory={false}
              />
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setScoringLead(null)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
