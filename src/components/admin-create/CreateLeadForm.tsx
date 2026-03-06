import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { leadSourceConfig, leadStatusConfig } from "@/lib/leadConfig";
import EntitySearchSelect from "./EntitySearchSelect";

interface Props {
  /** Pre-filled contact from wizard */
  prefilledContactId?: string | null;
  onCreated?: (leadId: string) => void;
  isWizardStep?: boolean;
  onBack?: () => void;
  onSkip?: () => void;
}

export default function CreateLeadForm({ prefilledContactId, onCreated, isWizardStep, onBack, onSkip }: Props) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const [contactId, setContactId] = useState<string | null>(prefilledContactId || null);
  const [contacts, setContacts] = useState<{ id: string; full_name: string | null; email: string | null }[]>([]);
  const [profiles, setProfiles] = useState<{ id: string; full_name: string; role: string }[]>([]);

  const [leadSource, setLeadSource] = useState("");
  const [leadStatus, setLeadStatus] = useState("a_qualifier");
  const [leadNotes, setLeadNotes] = useState("");
  const [leadCallType, setLeadCallType] = useState("");
  const [leadAssignedTo, setLeadAssignedTo] = useState("");
  const [leadApporteurId, setLeadApporteurId] = useState("");
  const [rawName, setRawName] = useState("");
  const [rawEmail, setRawEmail] = useState("");
  const [rawPhone, setRawPhone] = useState("");

  useEffect(() => {
    if (prefilledContactId) setContactId(prefilledContactId);
  }, [prefilledContactId]);

  useEffect(() => {
    if (!isWizardStep) {
      supabase.from("contacts").select("id, full_name, email").order("created_at", { ascending: false }).limit(500).then(({ data }) => { if (data) setContacts(data); });
    }
    supabase.from("profiles").select("id, full_name, role").then(({ data }) => { if (data) setProfiles(data); });
  }, [isWizardStep]);

  const teamProfiles = profiles.filter((p) => p.role === "ceo" || p.role === "collaborateur");
  const apporteurProfiles = profiles.filter((p) => p.role === "apporteur");

  const contactOptions = contacts.map((c) => ({ id: c.id, label: c.full_name || "Sans nom", sublabel: c.email || undefined }));

  const handleCreate = async () => {
    if (!leadSource) { toast({ title: "Source requise", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.from("leads").insert({
        contact_id: contactId || null,
        raw_full_name: rawName.trim().toUpperCase() || null,
        raw_email: rawEmail.trim() || null,
        raw_phone: rawPhone.trim() || null,
        source: leadSource,
        status: leadStatus,
        notes: leadNotes || null,
        call_type: leadCallType || null,
        assigned_to: leadAssignedTo || null,
        assigned_at: leadAssignedTo ? new Date().toISOString() : null,
        apporteur_id: leadApporteurId || null,
      }).select("id").single();
      if (error) throw error;
      toast({ title: "Lead créé ✓" });
      onCreated?.(data.id);
      if (!isWizardStep) {
        setLeadSource(""); setLeadStatus("a_qualifier"); setLeadNotes(""); setLeadCallType("");
        setLeadAssignedTo(""); setLeadApporteurId(""); setContactId(null);
        setRawName(""); setRawEmail(""); setRawPhone("");
      }
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Créer un lead</CardTitle>
          {onSkip && <Button variant="ghost" size="sm" onClick={onSkip}>Passer cette étape →</Button>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isWizardStep && (
          <EntitySearchSelect label="Rattacher à un contact (optionnel)" placeholder="Rechercher un contact…" options={contactOptions} value={contactId} onChange={setContactId} />
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {!isWizardStep && (
            <>
              <div className="space-y-2">
                <Label>Nom brut</Label>
                <Input placeholder="JEAN DUPONT" value={rawName} onChange={(e) => setRawName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email brut</Label>
                <Input type="email" placeholder="jean@example.com" value={rawEmail} onChange={(e) => setRawEmail(e.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Téléphone brut</Label>
                <Input placeholder="+33 6 12 34 56 78" value={rawPhone} onChange={(e) => setRawPhone(e.target.value)} />
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label>Source *</Label>
            <Select value={leadSource} onValueChange={setLeadSource}>
              <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
              <SelectContent>
                {Object.entries(leadSourceConfig).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Statut</Label>
            <Select value={leadStatus} onValueChange={setLeadStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(leadStatusConfig)
                  .filter(([k]) => !["nouveau", "contacte", "converti"].includes(k))
                  .map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Type de call</Label>
            <Select value={leadCallType} onValueChange={setLeadCallType}>
              <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="vsl">VSL</SelectItem>
                <SelectItem value="conference">Conférence</SelectItem>
                <SelectItem value="pole_vente">Pôle Vente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Setter (assigné à)</Label>
            <Select value={leadAssignedTo} onValueChange={setLeadAssignedTo}>
              <SelectTrigger><SelectValue placeholder="Non assigné" /></SelectTrigger>
              <SelectContent>
                {teamProfiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Apporteur</Label>
            <Select value={leadApporteurId} onValueChange={setLeadApporteurId}>
              <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
              <SelectContent>
                {apporteurProfiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea placeholder="Notes libres…" value={leadNotes} onChange={(e) => setLeadNotes(e.target.value)} />
        </div>
        <div className="flex justify-between">
          {onBack ? <Button variant="outline" onClick={onBack}>← Retour</Button> : <div />}
          <Button onClick={handleCreate} disabled={submitting} className="gradient-primary text-primary-foreground">
            {submitting ? "Création…" : isWizardStep ? "Créer le lead →" : "Créer le lead"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
