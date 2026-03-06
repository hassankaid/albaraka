import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Check, User, FileText, BadgeEuro, CreditCard, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { leadSourceConfig, leadStatusConfig } from "@/lib/leadConfig";

const STEPS = [
  { key: "contact", label: "Contact", icon: User },
  { key: "lead", label: "Lead", icon: FileText },
  { key: "sale", label: "Vente", icon: BadgeEuro },
  { key: "payments", label: "Paiements", icon: CreditCard },
] as const;

const PRODUCT_OPTIONS = ["Business Developer", "Liberty"];

interface PaymentRow {
  amount: string;
  dueDate: Date;
  status: string;
  paymentMethod: string;
}

export default function AdminCreateWizard() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // IDs created
  const [createdContactId, setCreatedContactId] = useState<string | null>(null);
  const [createdLeadId, setCreatedLeadId] = useState<string | null>(null);
  const [createdSaleId, setCreatedSaleId] = useState<string | null>(null);

  // Step 1: Contact
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  // Step 2: Lead
  const [skipLead, setSkipLead] = useState(false);
  const [leadSource, setLeadSource] = useState("");
  const [leadStatus, setLeadStatus] = useState("a_qualifier");
  const [leadNotes, setLeadNotes] = useState("");
  const [leadCallType, setLeadCallType] = useState("");

  // Profiles for setter/apporteur/closer
  const [profiles, setProfiles] = useState<{ id: string; full_name: string; role: string }[]>([]);
  const [leadAssignedTo, setLeadAssignedTo] = useState("");
  const [leadApporteurId, setLeadApporteurId] = useState("");

  // Step 3: Sale
  const [skipSale, setSkipSale] = useState(false);
  const [saleProduct, setSaleProduct] = useState("");
  const [saleAmount, setSaleAmount] = useState("");
  const [saleMensualites, setSaleMensualites] = useState("1");
  const [saleSoldAt, setSaleSoldAt] = useState<Date>(new Date());
  const [saleClosedBy, setSaleClosedBy] = useState("");

  // Step 4: Payments
  const [payments, setPayments] = useState<PaymentRow[]>([
    { amount: "", dueDate: new Date(), status: "pending", paymentMethod: "" },
  ]);

  // Load profiles on mount
  useState(() => {
    supabase.from("profiles").select("id, full_name, role").then(({ data }) => {
      if (data) setProfiles(data);
    });
  });

  const handleCreateContact = async () => {
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
      setCreatedContactId(data.id);

      // Also create contact identifiers
      const identifiers = [];
      if (contactEmail.trim()) {
        identifiers.push({ contact_id: data.id, identifier_type: "email", identifier_value: contactEmail.trim().toLowerCase() });
      }
      if (contactPhone.trim()) {
        identifiers.push({ contact_id: data.id, identifier_type: "phone", identifier_value: contactPhone.trim() });
      }
      if (identifiers.length > 0) {
        await supabase.from("contact_identifiers").insert(identifiers);
      }

      toast({ title: "Contact créé ✓" });
      setStep(1);
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateLead = async () => {
    if (skipLead) { setStep(2); return; }
    if (!leadSource) {
      toast({ title: "Source requise", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.from("leads").insert({
        contact_id: createdContactId,
        raw_full_name: contactName.trim().toUpperCase() || null,
        raw_email: contactEmail.trim() || null,
        raw_phone: contactPhone.trim() || null,
        source: leadSource,
        status: leadStatus,
        notes: leadNotes || null,
        call_type: leadCallType || null,
        assigned_to: leadAssignedTo || null,
        assigned_at: leadAssignedTo ? new Date().toISOString() : null,
        apporteur_id: leadApporteurId || null,
      }).select("id").single();
      if (error) throw error;
      setCreatedLeadId(data.id);
      toast({ title: "Lead créé ✓" });
      setStep(2);
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateSale = async () => {
    if (skipSale) { setStep(3); return; }
    if (!saleProduct || !saleAmount || !createdContactId) {
      toast({ title: "Produit et montant requis", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.from("sales").insert({
        contact_id: createdContactId,
        lead_id: createdLeadId || null,
        product: saleProduct,
        amount_ht: parseFloat(saleAmount),
        mensualites: parseInt(saleMensualites) || 1,
        sold_at: saleSoldAt.toISOString(),
        closed_by: saleClosedBy || profile?.id || null,
      }).select("id").single();
      if (error) throw error;
      setCreatedSaleId(data.id);
      toast({ title: "Vente créée ✓" });
      setStep(3);
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreatePayments = async () => {
    const validPayments = payments.filter((p) => p.amount && parseFloat(p.amount) > 0);
    if (validPayments.length === 0) {
      toast({ title: "Ajoutez au moins un paiement", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const rows = validPayments.map((p, i) => ({
        sale_id: createdSaleId,
        contact_id: createdContactId,
        amount: parseFloat(p.amount),
        due_date: format(p.dueDate, "yyyy-MM-dd"),
        status: p.status,
        payment_method: p.paymentMethod || null,
        payment_number: i + 1,
        total_payments: validPayments.length,
      }));
      const { error } = await supabase.from("payments").insert(rows);
      if (error) throw error;
      toast({ title: "Paiements créés ✓" });
      navigate("/admin/data");
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const addPaymentRow = () => {
    setPayments([...payments, { amount: "", dueDate: new Date(), status: "pending", paymentMethod: "" }]);
  };

  const updatePayment = (index: number, field: keyof PaymentRow, value: any) => {
    const updated = [...payments];
    (updated[index] as any)[field] = value;
    setPayments(updated);
  };

  const removePayment = (index: number) => {
    if (payments.length <= 1) return;
    setPayments(payments.filter((_, i) => i !== index));
  };

  const teamProfiles = profiles.filter((p) => p.role === "ceo" || p.role === "collaborateur");
  const apporteurProfiles = profiles.filter((p) => p.role === "apporteur");

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Stepper */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const completed = i < step;
          const active = i === step;
          return (
            <div key={s.key} className="flex items-center gap-2 flex-1">
              <div
                className={cn(
                  "flex items-center justify-center w-9 h-9 rounded-full border-2 transition-colors shrink-0",
                  completed && "bg-primary border-primary text-primary-foreground",
                  active && "border-primary text-primary",
                  !completed && !active && "border-muted-foreground/30 text-muted-foreground/50"
                )}
              >
                {completed ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span className={cn("text-sm font-medium hidden sm:block", active ? "text-foreground" : "text-muted-foreground")}>{s.label}</span>
              {i < STEPS.length - 1 && <div className={cn("h-px flex-1", i < step ? "bg-primary" : "bg-border")} />}
            </div>
          );
        })}
      </div>

      {/* Step 1: Contact */}
      {step === 0 && (
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
              <Button onClick={handleCreateContact} disabled={submitting} className="gradient-primary text-primary-foreground">
                {submitting ? "Création…" : "Créer le contact →"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Lead */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Créer un lead</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setSkipLead(true); setStep(2); }}>
                Passer cette étape →
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <Button variant="outline" onClick={() => setStep(0)}>← Retour</Button>
              <Button onClick={handleCreateLead} disabled={submitting} className="gradient-primary text-primary-foreground">
                {submitting ? "Création…" : "Créer le lead →"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Sale */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Créer une vente</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setSkipSale(true); setStep(3); }}>
                Passer cette étape →
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Produit *</Label>
                <Select value={saleProduct} onValueChange={setSaleProduct}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {PRODUCT_OPTIONS.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
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
                    {teamProfiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                    ))}
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
              <Button variant="outline" onClick={() => setStep(1)}>← Retour</Button>
              <Button onClick={handleCreateSale} disabled={submitting} className="gradient-primary text-primary-foreground">
                {submitting ? "Création…" : "Créer la vente →"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Payments */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Créer les paiements</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/admin/data")}>
                Terminer sans paiement →
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {payments.map((p, i) => (
              <div key={i} className="p-4 border border-border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">Paiement {i + 1}</span>
                  {payments.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => removePayment(i)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Montant (€) *</Label>
                    <Input type="number" placeholder="0" value={p.amount} onChange={(e) => updatePayment(i, "amount", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Date d'échéance</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal text-sm">
                          <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                          {format(p.dueDate, "dd/MM/yyyy")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={p.dueDate} onSelect={(d) => d && updatePayment(i, "dueDate", d)} initialFocus className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Statut</Label>
                    <Select value={p.status} onValueChange={(v) => updatePayment(i, "status", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">En attente</SelectItem>
                        <SelectItem value="paid">Payé</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Méthode</Label>
                    <Select value={p.paymentMethod} onValueChange={(v) => updatePayment(i, "paymentMethod", v)}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="virement">Virement</SelectItem>
                        <SelectItem value="carte">Carte</SelectItem>
                        <SelectItem value="especes">Espèces</SelectItem>
                        <SelectItem value="cheque">Chèque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
            <Button variant="outline" onClick={addPaymentRow} className="w-full">
              <Plus className="h-4 w-4 mr-2" /> Ajouter un paiement
            </Button>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>← Retour</Button>
              <Button onClick={handleCreatePayments} disabled={submitting} className="gradient-primary text-primary-foreground">
                {submitting ? "Création…" : "Créer les paiements ✓"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
