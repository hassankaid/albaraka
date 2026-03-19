import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Building2, Users, CreditCard, Receipt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface FixedCharge {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  category: string;
  is_active: boolean;
}

interface SalaryProfile {
  id: string;
  profile_id: string;
  full_name: string;
  amount: number;
  start_date: string;
  end_date: string | null;
}

interface Props {
  fixedCharges: FixedCharge[];
  activeSalaries: SalaryProfile[];
  totalFixedChargesMensuel: number;
  totalSalariesMensuel: number;
  commissionsPaid: number;
  commissionsDue: number;
  onRefresh: () => void;
}

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

const freqLabels: Record<string, string> = { monthly: "Mensuel", yearly: "Annuel", one_time: "Ponctuel" };

export default function ChargesCard({ fixedCharges, activeSalaries, totalFixedChargesMensuel, totalSalariesMensuel, commissionsPaid, commissionsDue, onRefresh }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!name || !amount) return;
    setSaving(true);
    const { error } = await (supabase.from("fixed_charges" as any) as any).insert({ name, amount: parseFloat(amount), frequency });
    setSaving(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Charge ajoutée" });
      setName("");
      setAmount("");
      setOpen(false);
      onRefresh();
    }
  };

  const handleDelete = async (id: string) => {
    await (supabase.from("fixed_charges" as any) as any).delete().eq("id", id);
    onRefresh();
  };

  const activeCharges = fixedCharges.filter((c) => c.is_active);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          Charges
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                <Plus className="h-3 w-3" /> Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouvelle charge fixe</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Nom</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Calendly, Supabase..." />
                </div>
                <div>
                  <Label>Montant (€)</Label>
                  <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="29.99" />
                </div>
                <div>
                  <Label>Fréquence</Label>
                  <Select value={frequency} onValueChange={setFrequency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Mensuel</SelectItem>
                      <SelectItem value="yearly">Annuel</SelectItem>
                      <SelectItem value="one_time">Ponctuel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAdd} disabled={saving} className="w-full">
                  {saving ? "Ajout..." : "Ajouter"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Summary */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Abonnements</span>
            </div>
            <span className="font-medium">{fmt(totalFixedChargesMensuel)}/mois</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Salaires fixes</span>
            </div>
            <span className="font-medium">{fmt(totalSalariesMensuel)}/mois</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Frais transaction</span>
            </div>
            <span className="text-muted-foreground text-xs italic">À venir</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Commissions</span>
            </div>
            <span className="font-medium">{fmt(commissionsPaid + commissionsDue)}</span>
          </div>
        </div>

        {/* Fixed charges list */}
        {activeCharges.length > 0 && (
          <div className="border-t border-border pt-2 space-y-1">
            <p className="text-xs text-muted-foreground font-medium mb-1">Abonnements actifs</p>
            {activeCharges.map((c) => (
              <div key={c.id} className="flex items-center justify-between text-xs group">
                <span className="text-foreground">{c.name}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{freqLabels[c.frequency] || c.frequency}</Badge>
                  <span className="font-medium">{fmt(c.amount)}</span>
                  <button onClick={() => handleDelete(c.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Salaries list */}
        {activeSalaries.length > 0 && (
          <div className="border-t border-border pt-2 space-y-1">
            <p className="text-xs text-muted-foreground font-medium mb-1">Salaires actifs</p>
            {activeSalaries.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-xs">
                <span className="text-foreground">{p.full_name}</span>
                <span className="font-medium">{fmt(p.amount)}/mois</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
