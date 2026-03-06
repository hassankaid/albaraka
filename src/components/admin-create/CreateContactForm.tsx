import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  onCreated?: (contactId: string) => void;
  /** Used in wizard mode to auto-advance */
  isWizardStep?: boolean;
}

export default function CreateContactForm({ onCreated, isWizardStep }: Props) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const handleCreate = async () => {
    if (!contactName.trim() && !contactEmail.trim() && !contactPhone.trim()) {
      toast({ title: "Remplissez au moins un champ", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.from("contacts").insert({
        full_name: contactName.trim().toUpperCase() || null,
        email: contactEmail.trim().toLowerCase() || null,
        phone_original: contactPhone.trim() || null,
        phone_normalized: contactPhone.trim() || null,
      }).select("id").single();
      if (error) throw error;

      const identifiers: { contact_id: string; identifier_type: string; identifier_value: string }[] = [];
      if (contactEmail.trim()) identifiers.push({ contact_id: data.id, identifier_type: "email", identifier_value: contactEmail.trim().toLowerCase() });
      if (contactPhone.trim()) identifiers.push({ contact_id: data.id, identifier_type: "phone", identifier_value: contactPhone.trim() });
      if (identifiers.length > 0) await supabase.from("contact_identifiers").insert(identifiers);

      toast({ title: "Contact créé ✓" });
      onCreated?.(data.id);

      if (!isWizardStep) {
        setContactName(""); setContactEmail(""); setContactPhone("");
      }
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle>Créer un contact</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Nom complet</Label>
          <Input placeholder="JEAN DUPONT" value={contactName} onChange={(e) => setContactName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" placeholder="jean@example.com" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Téléphone</Label>
          <Input placeholder="+33 6 12 34 56 78" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
        </div>
        <div className="flex justify-end">
          <Button onClick={handleCreate} disabled={submitting} className="gradient-primary text-primary-foreground">
            {submitting ? "Création…" : isWizardStep ? "Créer le contact →" : "Créer le contact"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
