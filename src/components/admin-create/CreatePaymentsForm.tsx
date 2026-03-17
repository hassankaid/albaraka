import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/fetchAllRows";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import EntitySearchSelect from "./EntitySearchSelect";

interface PaymentRow {
  amount: string;
  dueDate: Date;
  status: string;
  paymentMethod: string;
}

interface Props {
  prefilledContactId?: string | null;
  prefilledSaleId?: string | null;
  isWizardStep?: boolean;
  onBack?: () => void;
  onFinishSkip?: () => void;
}

export default function CreatePaymentsForm({ prefilledContactId, prefilledSaleId, isWizardStep, onBack, onFinishSkip }: Props) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const [contactId, setContactId] = useState<string | null>(prefilledContactId || null);
  const [saleId, setSaleId] = useState<string | null>(prefilledSaleId || null);
  const [contacts, setContacts] = useState<{ id: string; full_name: string | null; email: string | null }[]>([]);
  const [sales, setSales] = useState<{ id: string; product: string; amount_ht: number; contact_name: string | null; sold_at: string | null }[]>([]);

  const [payments, setPayments] = useState<PaymentRow[]>([
    { amount: "", dueDate: new Date(), status: "pending", paymentMethod: "" },
  ]);

  useEffect(() => {
    if (prefilledContactId) setContactId(prefilledContactId);
    if (prefilledSaleId) setSaleId(prefilledSaleId);
  }, [prefilledContactId, prefilledSaleId]);

  useEffect(() => {
    if (!isWizardStep) {
      fetchAllRows<{ id: string; full_name: string | null; email: string | null }>("contacts", "id, full_name, email", { order: { column: "created_at", ascending: false } }).then(setContacts);
      fetchAllRows<any>("sales", "id, product, amount_ht, sold_at, contacts(full_name)", { order: { column: "created_at", ascending: false } }).then((data) => {
        setSales(data.map((s: any) => ({ id: s.id, product: s.product, amount_ht: s.amount_ht, contact_name: s.contacts?.full_name || null, sold_at: s.sold_at })));
      });
    }
  }, [isWizardStep]);

  const contactOptions = contacts.map((c) => ({ id: c.id, label: c.full_name || "Sans nom", sublabel: c.email || undefined }));
  const saleOptions = sales.map((s) => {
    const date = s.sold_at ? new Date(s.sold_at).toLocaleDateString("fr-FR") : "";
    const name = s.contact_name || "—";
    return { id: s.id, label: `${s.product} · ${name}`, sublabel: `${s.amount_ht} € ${date ? `· ${date}` : ""}` };
  });

  const addPaymentRow = () => setPayments([...payments, { amount: "", dueDate: new Date(), status: "pending", paymentMethod: "" }]);
  const updatePayment = (i: number, field: keyof PaymentRow, value: any) => {
    const u = [...payments]; (u[i] as any)[field] = value; setPayments(u);
  };
  const removePayment = (i: number) => { if (payments.length > 1) setPayments(payments.filter((_, idx) => idx !== i)); };

  const handleCreate = async () => {
    const valid = payments.filter((p) => p.amount && parseFloat(p.amount) > 0);
    if (valid.length === 0) { toast({ title: "Ajoutez au moins un paiement", variant: "destructive" }); return; }
    if (!saleId && !isWizardStep) { toast({ title: "Vente requise", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      const rows = valid.map((p, i) => ({
        sale_id: saleId,
        contact_id: contactId,
        amount: parseFloat(p.amount),
        due_date: format(p.dueDate, "yyyy-MM-dd"),
        status: p.status,
        payment_method: p.paymentMethod || null,
        payment_number: i + 1,
        total_payments: valid.length,
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Créer les paiements</CardTitle>
          {onFinishSkip && <Button variant="ghost" size="sm" onClick={onFinishSkip}>Terminer sans paiement →</Button>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isWizardStep && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <EntitySearchSelect label="Contact (optionnel)" placeholder="Rechercher un contact…" options={contactOptions} value={contactId} onChange={setContactId} />
            <EntitySearchSelect label="Vente *" placeholder="Rechercher une vente…" options={saleOptions} value={saleId} onChange={setSaleId} />
          </div>
        )}
        {payments.map((p, i) => (
          <div key={i} className="p-4 border border-border rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Paiement {i + 1}</span>
              {payments.length > 1 && (
                <Button variant="ghost" size="sm" onClick={() => removePayment(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
                    <SelectItem value="late">En retard</SelectItem>
                    <SelectItem value="lost">Perdu</SelectItem>
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
          {onBack ? <Button variant="outline" onClick={onBack}>← Retour</Button> : <div />}
          <Button onClick={handleCreate} disabled={submitting} className="gradient-primary text-primary-foreground">
            {submitting ? "Création…" : "Créer les paiements ✓"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
