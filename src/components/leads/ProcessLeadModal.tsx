import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Eye, AlertTriangle, Save } from "lucide-react";
import { formatDateTime } from "@/lib/formatDate";

type LeadEnriched = Tables<"leads_enriched">;

const STATUS_GROUPS = [
  {
    label: "En cours",
    items: [
      { value: "nouveau", label: "Nouveau" },
      { value: "contacte", label: "Contacté" },
      { value: "pas_de_reponse", label: "Pas de réponse" },
      { value: "a_relancer", label: "À relancer" },
      { value: "faux_numero", label: "Faux numéro" },
    ],
  },
  {
    label: "Qualification",
    items: [
      { value: "qualifie", label: "Qualifié" },
      { value: "pas_qualifie", label: "Pas qualifié" },
    ],
  },
  {
    label: "Call réservé (automatique)",
    items: [
      { value: "call_vsl", label: "Call VSL", disabled: true },
      { value: "call_conference", label: "Call Conférence", disabled: true },
      { value: "pole_vente", label: "Pôle Vente", disabled: true },
    ],
  },
  {
    label: "Clôturé",
    items: [
      { value: "converti", label: "Converti" },
      { value: "perdu", label: "Perdu" },
    ],
  },
];

export const LEAD_STATUS_COLORS: Record<string, string> = {
  nouveau: "bg-muted text-muted-foreground border-border",
  contacte: "bg-sky-500/20 text-sky-300 border-sky-500/30",
  pas_de_reponse: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  a_relancer: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  faux_numero: "bg-red-400/20 text-red-300 border-red-400/30",
  qualifie: "bg-lime-500/20 text-lime-300 border-lime-500/30",
  pas_qualifie: "bg-zinc-600/20 text-zinc-400 border-zinc-600/30",
  call_vsl: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  call_conference: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  pole_vente: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  converti: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  perdu: "bg-red-500/20 text-red-300 border-red-500/30",
};

export const LEAD_STATUS_LABELS: Record<string, string> = {
  nouveau: "Nouveau",
  contacte: "Contacté",
  pas_de_reponse: "Pas de réponse",
  a_relancer: "À relancer",
  faux_numero: "Faux numéro",
  qualifie: "Qualifié",
  pas_qualifie: "Pas qualifié",
  call_vsl: "Call VSL",
  call_conference: "Call Conférence",
  pole_vente: "Pôle Vente",
  converti: "Converti",
  perdu: "Perdu",
};

const READ_ONLY_STATUSES = ["call_vsl", "call_conference", "pole_vente"];

interface Props {
  lead: LeadEnriched | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onOpenContact: (contactId: string) => void;
}

export default function ProcessLeadModal({ lead, open, onClose, onSuccess, onOpenContact }: Props) {
  const { profile: user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [otherLeadsCount, setOtherLeadsCount] = useState(0);

  useEffect(() => {
    if (lead && open) {
      setStatus(lead.status || "nouveau");
      setNote("");
      // Check other leads for this contact
      if (lead.contact_id) {
        supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("contact_id", lead.contact_id)
          .neq("id", lead.id!)
          .then(({ count }) => setOtherLeadsCount(count || 0));
      }
    }
  }, [lead, open]);

  if (!lead) return null;

  const handleSave = async () => {
    if (!user || !lead.id) return;
    setSaving(true);

    try {
      const oldStatus = lead.status;
      const statusChanged = status !== oldStatus;
      const hasNote = note.trim().length > 0;

      if (!statusChanged && !hasNote) {
        toast({ title: "Aucune modification" });
        setSaving(false);
        return;
      }

      if (statusChanged) {
        await supabase
          .from("leads")
          .update({ status, updated_at: new Date().toISOString() })
          .eq("id", lead.id);

        await supabase.from("lead_activities").insert({
          lead_id: lead.id,
          user_id: user.id,
          action: "status_change",
          old_value: oldStatus,
          new_value: status,
        });
      }

      if (hasNote) {
        await supabase
          .from("leads")
          .update({ notes: note.trim(), updated_at: new Date().toISOString() })
          .eq("id", lead.id);

        await supabase.from("lead_activities").insert({
          lead_id: lead.id,
          user_id: user.id,
          action: "note_added",
          note: note.trim(),
        });
      }

      toast({ title: "Lead mis à jour" });
      onSuccess();
      onClose();
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const isReadOnly = READ_ONLY_STATUSES.includes(lead.status || "");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Traiter le lead</DialogTitle>
        </DialogHeader>

        {/* Section 1: Lead info */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground">Infos du lead</h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            <span className="text-muted-foreground">Nom</span>
            <span className="text-foreground">{lead.raw_full_name || "—"}</span>
            <span className="text-muted-foreground">Email</span>
            <span className="text-foreground truncate">{lead.raw_email || "—"}</span>
            <span className="text-muted-foreground">Téléphone</span>
            <span className="text-foreground">{lead.raw_phone || "—"}</span>
            <span className="text-muted-foreground">Source</span>
            <span className="text-foreground">{lead.source_label || "—"}</span>
            <span className="text-muted-foreground">Date d'entrée</span>
            <span className="text-foreground">{lead.created_at ? formatDateTime(lead.created_at) : "—"}</span>
            <span className="text-muted-foreground">Setter</span>
            <span className="text-foreground">{lead.assigned_to_name || "Non assigné"}</span>
          </div>
        </div>

        <Separator />

        {/* Section 2: Contact preview */}
        {lead.contact_id && (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground">Contact</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs text-primary"
                  onClick={() => {
                    onClose();
                    onOpenContact(lead.contact_id!);
                  }}
                >
                  <Eye className="h-3.5 w-3.5" />
                  Voir la fiche complète
                </Button>
              </div>
              {otherLeadsCount > 0 && (
                <Alert className="border-yellow-500/30 bg-yellow-500/10">
                  <AlertTriangle className="h-4 w-4 text-yellow-400" />
                  <AlertDescription className="text-yellow-300 text-xs">
                    ⚠️ Ce contact a {otherLeadsCount} autre{otherLeadsCount > 1 ? "s" : ""} lead{otherLeadsCount > 1 ? "s" : ""}
                  </AlertDescription>
                </Alert>
              )}
            </div>
            <Separator />
          </>
        )}

        {/* Section 3: Status change */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground">Statut</h4>
          {isReadOnly ? (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`text-xs ${LEAD_STATUS_COLORS[lead.status || ""] || ""}`}>
                {LEAD_STATUS_LABELS[lead.status || ""] || lead.status}
              </Badge>
              <span className="text-xs text-muted-foreground">(défini automatiquement par le call)</span>
            </div>
          ) : (
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_GROUPS.map((group) => (
                  <SelectGroup key={group.label}>
                    <SelectLabel className="text-xs text-muted-foreground">{group.label}</SelectLabel>
                    {group.items.map((item) => (
                      <SelectItem key={item.value} value={item.value} disabled={item.disabled}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <Separator />

        {/* Section 4: Note */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground">Note</h4>
          {lead.notes && (
            <p className="text-xs text-muted-foreground italic bg-muted/50 rounded p-2">
              Note actuelle : {lead.notes}
            </p>
          )}
          <Textarea
            placeholder="Ajouter un commentaire..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="bg-background min-h-[80px]"
          />
        </div>

        {/* Save */}
        <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
          <Save className="h-4 w-4" />
          {saving ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
