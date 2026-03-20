import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Save, UserMinus } from "lucide-react";
import { formatDateTime } from "@/lib/formatDate";

type LeadEnriched = Tables<"leads_enriched">;

import { LEAD_STATUS_LIST, LEAD_STATUS_COLORS, LEAD_STATUS_LABELS } from "@/lib/leadConfig";

export { LEAD_STATUS_COLORS, LEAD_STATUS_LABELS };

const STATUS_LIST = LEAD_STATUS_LIST;



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
  const [releasing, setReleasing] = useState(false);
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

  const handleRelease = async () => {
    if (!user || !lead.id) return;
    setReleasing(true);
    try {
      await supabase
        .from("leads")
        .update({ assigned_to: null, assigned_at: null, updated_at: new Date().toISOString() })
        .eq("id", lead.id);

      await supabase.from("lead_activities").insert({
        lead_id: lead.id,
        user_id: user.id,
        action: "unassign",
        old_value: lead.assigned_to_name || lead.assigned_to,
        new_value: null,
      });

      toast({ title: "Lead libéré" });
      onSuccess();
      onClose();
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setReleasing(false);
    }
  };

  const canEdit = lead.assigned_to === user?.id || user?.role === "ceo";
  const canRelease = canEdit && lead.assigned_to !== null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {canEdit ? "Traiter le lead" : "Consulter le lead"}
          </DialogTitle>
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
            <span className="text-muted-foreground">Apporteur</span>
            <span className="text-foreground">{lead.apporteur_name || "—"}</span>
            <span className="text-muted-foreground">Setter</span>
            <span className="text-foreground">{lead.assigned_to_name || "Non assigné"}</span>
          </div>
        </div>

        <Separator />

        {/* Section 2: Contact alert */}
        {lead.contact_id && otherLeadsCount > 0 && (
          <>
            <Alert className="border-yellow-500/30 bg-yellow-500/10">
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
              <AlertDescription className="text-yellow-300 text-xs">
                ⚠️ Ce contact a {otherLeadsCount} autre{otherLeadsCount > 1 ? "s" : ""} lead{otherLeadsCount > 1 ? "s" : ""}
              </AlertDescription>
            </Alert>
            <Separator />
          </>
        )}

        {/* Section 3: Status change */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground">Statut</h4>
          <Select value={status} onValueChange={setStatus} disabled={!canEdit}>
            <SelectTrigger className="bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_LIST.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            disabled={!canEdit}
          />
        </div>

        {/* Save or read-only message */}
        {canEdit ? (
          <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-2">
            Seul {lead.assigned_to_name || "le collaborateur assigné"} ou le CEO peut modifier ce lead
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
