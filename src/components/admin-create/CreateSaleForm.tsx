import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/fetchAllRows";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import EntitySearchSelect from "./EntitySearchSelect";

const PRODUCT_OPTIONS = ["Business Developer", "Liberty"];

interface Props {
  prefilledContactId?: string | null;
  prefilledLeadId?: string | null;
  onCreated?: (saleId: string) => void;
  isWizardStep?: boolean;
  onBack?: () => void;
  onSkip?: () => void;
}

export default function CreateSaleForm({ prefilledContactId, prefilledLeadId, onCreated, isWizardStep, onBack, onSkip }: Props) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const [contactId, setContactId] = useState<string | null>(prefilledContactId || null);
  const [leadId, setLeadId] = useState<string | null>(prefilledLeadId || null);
  const [contacts, setContacts] = useState<{ id: string; full_name: string | null; email: string | null }[]>([]);
  const [leads, setLeads] = useState<{ id: string; raw_full_name: string | null; source: string }[]>([]);
  const [profiles, setProfiles] = useState<{ id: string; full_name: string; role: string }[]>([]);

  const [saleProduct, setSaleProduct] = useState("");
  const [saleAmount, setSaleAmount] = useState("");
  const [saleMensualites, setSaleMensualites] = useState("1");
  const [saleSoldAt, setSaleSoldAt] = useState<Date>(new Date());
  const [saleClosedBy, setSaleClosedBy] = useState("");

  useEffect(() => {
    if (prefilledContactId) setContactId(prefilledContactId);
    if (prefilledLeadId) setLeadId(prefilledLeadId);
  }, [prefilledContactId, prefilledLeadId]);

  useEffect(() => {
    if (!isWizardStep) {
      fetchAllRows<{ id: string; full_name: string | null; email: string | null }>("contacts", "id, full_name, email", { order: { column: "created_at", ascending: false } }).then(setContacts);
      fetchAllRows<{ id: string; raw_full_name: string | null; source: string }>("leads", "id, raw_full_name, source", { order: { column: "created_at", ascending: false } }).then(setLeads);
    }
    fetchAllRows<{ id: string; full_name: string; role: string; is_active: boolean }>("profiles", "id, full_name, role, is_active").then(setProfiles);
  }, [isWizardStep]);

  const teamProfiles = profiles.filter((p) => p.role === "ceo" || p.role === "collaborateur").sort((a, b) => a.full_name.localeCompare(b.full_name));
  const contactOptions = contacts.map((c) => ({ id: c.id, label: c.full_name || "Sans nom", sublabel: c.email || undefined }));
  const leadOptions = leads.map((l) => ({ id: l.id, label: l.raw_full_name || "Sans nom", sublabel: l.source }));

  const handleCreate = async () => {
    if (!saleProduct || !saleAmount) {
      toast({ title: "Produit et montant requis", variant: "destructive" }); return;
    }
    const finalContactId = contactId;
    if (!finalContactId) {
      toast({ title: "Contact requis", variant: "destructive" }); return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.from("sales").insert({
        contact_id: finalContactId,
        lead_id: leadId || null,
        product: saleProduct,
        amount_ht: parseFloat(saleAmount),
        mensualites: parseInt(saleMensualites) || 1,
        sold_at: saleSoldAt.toISOString(),
        closed_by: saleClosedBy || profile?.id || null,
      }).select("id").single();
      if (error) throw error;
      toast({ title: "Vente créée ✓" });
      onCreated?.(data.id);
      if (!isWizardStep) {
        setSaleProduct(""); setSaleAmount(""); setSaleMensualites("1");
        setSaleSoldAt(new Date()); setSaleClosedBy(""); setContactId(null); setLeadId(null);
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
          <CardTitle>Créer une vente</CardTitle>
          {onSkip && <Button variant="ghost" size="sm" onClick={onSkip}>Passer cette étape →</Button>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isWizardStep && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <EntitySearchSelect label="Contact *" placeholder="Rechercher un contact…" options={contactOptions} value={contactId} onChange={setContactId} />
            <EntitySearchSelect label="Lead (optionnel)" placeholder="Rechercher un lead…" options={leadOptions} value={leadId} onChange={setLeadId} />
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Produit *</Label>
            <Select value={saleProduct} onValueChange={setSaleProduct}>
              <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
              <SelectContent>
                {PRODUCT_OPTIONS.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Montant HT (€) *</Label>
            <Input type="number" placeholder="0" value={saleAmount} onChange={(e) => setSaleAmount(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Mensualités</Label>
            <Input type="number" min={1} max={24} value={saleMensualites} onChange={(e) => setSaleMensualites(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Closer</Label>
            <Select value={saleClosedBy} onValueChange={setSaleClosedBy}>
              <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
              <SelectContent>
                {teamProfiles.map((p) => (<SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Date de vente</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(saleSoldAt, "dd MMMM yyyy", { locale: fr })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={saleSoldAt} onSelect={(d) => d && setSaleSoldAt(d)} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex justify-between">
          {onBack ? <Button variant="outline" onClick={onBack}>← Retour</Button> : <div />}
          <Button onClick={handleCreate} disabled={submitting} className="gradient-primary text-primary-foreground">
            {submitting ? "Création…" : isWizardStep ? "Créer la vente →" : "Créer la vente"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
