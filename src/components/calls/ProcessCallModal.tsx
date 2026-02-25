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
import { AlertTriangle, Save } from "lucide-react";
import { formatDateTime } from "@/lib/formatDate";

type CallEnriched = Tables<"calls_enriched">;

export const CALL_STATUS_COLORS: Record<string, string> = {
  planifie: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  annule: "bg-muted text-muted-foreground border-border",
  disqualifie: "bg-orange-400/20 text-orange-300 border-orange-400/30",
  pas_interesse: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  non_close: "bg-red-400/20 text-red-300 border-red-400/30",
  no_show: "bg-red-500/20 text-red-300 border-red-500/30",
  renvoye_pole_vente: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  renvoye_conference: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  rediffusion: "bg-purple-400/20 text-purple-300 border-purple-400/30",
  follow_up: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  close: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  effectue: "bg-emerald-400/20 text-emerald-300 border-emerald-400/30",
};

export const CALL_STATUS_LABELS: Record<string, string> = {
  planifie: "Planifié",
  annule: "Annulé",
  disqualifie: "Disqualifié",
  pas_interesse: "Pas intéressé",
  non_close: "Non close",
  no_show: "No show",
  renvoye_pole_vente: "Renvoi Pôle Vente",
  renvoye_conference: "Renvoi Conférence",
  rediffusion: "Rediffusion",
  follow_up: "Follow up",
  close: "Close",
  effectue: "Effectué",
};

const STATUS_LIST = [
  { value: "planifie", label: "Planifié" },
  { value: "disqualifie", label: "Disqualifié" },
  { value: "pas_interesse", label: "Pas intéressé" },
  { value: "non_close", label: "Non close" },
  { value: "no_show", label: "No show" },
  { value: "renvoye_pole_vente", label: "Renvoi Pôle Vente" },
  { value: "renvoye_conference", label: "Renvoi Conférence" },
  { value: "rediffusion", label: "Rediffusion" },
  { value: "follow_up", label: "Follow up" },
  { value: "close", label: "Close" },
];

interface Props {
  call: CallEnriched | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onOpenContact: (contactId: string) => void;
}

export default function ProcessCallModal({ call, open, onClose, onSuccess, onOpenContact }: Props) {
  const { profile: user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [otherLeadsCount, setOtherLeadsCount] = useState(0);
  const [otherCallsCount, setOtherCallsCount] = useState(0);

  useEffect(() => {
    if (call && open) {
      setStatus(call.status || "planifie");
      setNote("");
      if (call.contact_id) {
        Promise.all([
          supabase
            .from("leads")
            .select("id", { count: "exact", head: true })
            .eq("contact_id", call.contact_id),
          supabase
            .from("calls")
            .select("id", { count: "exact", head: true })
            .eq("contact_id", call.contact_id)
            .neq("id", call.id!),
        ]).then(([leadsRes, callsRes]) => {
          setOtherLeadsCount(leadsRes.count || 0);
          setOtherCallsCount(callsRes.count || 0);
        });
      }
    }
  }, [call, open]);

  if (!call) return null;

  const handleSave = async () => {
    if (!user || !call.id) return;
    setSaving(true);

    try {
      const oldStatus = call.status;
      const statusChanged = status !== oldStatus;
      const hasNote = note.trim().length > 0;

      if (!statusChanged && !hasNote) {
        toast({ title: "Aucune modification" });
        setSaving(false);
        return;
      }

      const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
      if (statusChanged) updatePayload.status = status;
      if (hasNote) updatePayload.closer_notes = note.trim();

      await supabase.from("calls").update(updatePayload).eq("id", call.id);

      if (statusChanged) {
        await supabase.from("call_activities").insert({
          call_id: call.id,
          user_id: user.id,
          action: "status_change",
          old_value: oldStatus,
          new_value: status,
        });
      }

      if (hasNote) {
        await supabase.from("call_activities").insert({
          call_id: call.id,
          user_id: user.id,
          action: "note_added",
          note: note.trim(),
        });
      }

      toast({ title: "Call mis à jour" });
      onSuccess();
      onClose();
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const userTz = user?.timezone || "Europe/Paris";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Traiter le call</DialogTitle>
        </DialogHeader>

        {/* Section 1: Call info */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground">Infos du call</h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            <span className="text-muted-foreground">Contact</span>
            <span className="text-foreground">{call.contact_full_name || "—"}</span>
            <span className="text-muted-foreground">Email</span>
            <span className="text-foreground truncate">{call.contact_email || "—"}</span>
            <span className="text-muted-foreground">Téléphone</span>
            <span className="text-foreground">{call.contact_phone || "—"}</span>
            <span className="text-muted-foreground">Type</span>
            <span className="text-foreground">{call.event_type_label || call.event_type || "—"}</span>
            <span className="text-muted-foreground">Date</span>
            <span className="text-foreground">{call.scheduled_at ? formatDateTime(call.scheduled_at, userTz) : "—"}</span>
            <span className="text-muted-foreground">Collaborateur</span>
            <span className="text-foreground">{call.assigned_to_name || "—"}</span>
          </div>
        </div>

        <Separator />

        {/* Section 2: Alerts */}
        {call.contact_id && (otherLeadsCount > 0 || otherCallsCount > 0) && (
          <>
            <div className="space-y-2">
              {otherLeadsCount > 0 && (
                <Alert className="border-yellow-500/30 bg-yellow-500/10">
                  <AlertTriangle className="h-4 w-4 text-yellow-400" />
                  <AlertDescription className="text-yellow-300 text-xs">
                    ⚠️ Ce contact a {otherLeadsCount} lead{otherLeadsCount > 1 ? "s" : ""}
                  </AlertDescription>
                </Alert>
              )}
              {otherCallsCount > 0 && (
                <Alert className="border-yellow-500/30 bg-yellow-500/10">
                  <AlertTriangle className="h-4 w-4 text-yellow-400" />
                  <AlertDescription className="text-yellow-300 text-xs">
                    ⚠️ Ce contact a {otherCallsCount} autre{otherCallsCount > 1 ? "s" : ""} call{otherCallsCount > 1 ? "s" : ""}
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
          <Select value={status} onValueChange={setStatus}>
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
          {call.closer_notes && (
            <p className="text-xs text-muted-foreground italic bg-muted/50 rounded p-2">
              Note actuelle : {call.closer_notes}
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
