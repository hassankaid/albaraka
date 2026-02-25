import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw } from "lucide-react";

const SOURCE_OPTIONS = [
  { value: "instagram_organic", label: "Instagram Organique" },
  { value: "instagram_ads", label: "Instagram Ads" },
];

export default function LeadInstagramForm({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("instagram_organic");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setPhone("");
    setSource("instagram_organic");
    setNotes("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !fullName.trim() || !phone.trim()) return;

    setSaving(true);

    const { data: contactId, error: rpcError } = await supabase.rpc("find_or_create_contact", {
      p_email: email.trim() || "",
      p_phone: phone.trim(),
      p_full_name: fullName.trim().toUpperCase(),
    });

    if (rpcError) {
      toast({ title: "Erreur", description: rpcError.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    const { error: insertError } = await supabase.from("leads").insert({
      contact_id: contactId,
      source,
      source_detail: source,
      assigned_to: profile.id,
      assigned_at: new Date().toISOString(),
      status: "nouveau",
    });

    if (insertError) {
      toast({ title: "Erreur", description: insertError.message, variant: "destructive" });
    } else {
      toast({ title: "Lead Instagram ajouté avec succès" });
      resetForm();
      onOpenChange(false);
      onSuccess();
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Nouveau Lead Instagram</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Prénom & Nom *</label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Prénom Nom"
              required
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemple.com"
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Téléphone *</label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+33 6 XX XX XX XX"
              required
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Source *</label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Notes</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes optionnelles..."
              className="bg-background"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={saving} className="gradient-primary text-primary-foreground">
              {saving && <RefreshCw className="h-4 w-4 animate-spin mr-2" />}
              Ajouter
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
