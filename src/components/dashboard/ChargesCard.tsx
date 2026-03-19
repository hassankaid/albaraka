import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Plus, Trash2, Building2, Users, CreditCard, Receipt, Settings2, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

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

interface SalaryPeriod {
  id: string;
  profile_id: string;
  amount: number;
  start_date: string;
  end_date: string | null;
}

interface Profile {
  id: string;
  full_name: string;
  role: string;
  is_active: boolean;
}

interface Props {
  fixedCharges: FixedCharge[];
  activeSalaries: SalaryProfile[];
  totalFixedChargesMensuel: number;
  totalSalariesMensuel: number;
  commissionsPaid: number;
  commissionsDue: number;
  salaryPeriods: SalaryPeriod[];
  profiles: Profile[];
  onRefreshCharges: () => void;
  onRefreshSalaries: () => void;
}

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

const freqLabels: Record<string, string> = { monthly: "Mensuel", yearly: "Annuel", one_time: "Ponctuel" };

export default function ChargesCard({
  fixedCharges, activeSalaries, totalFixedChargesMensuel, totalSalariesMensuel,
  commissionsPaid, commissionsDue, salaryPeriods, profiles, onRefreshCharges, onRefreshSalaries,
}: Props) {
  const [manageOpen, setManageOpen] = useState(false);

  // Add charge form
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [saving, setSaving] = useState(false);

  // Add salary form
  const [salaryProfileId, setSalaryProfileId] = useState("");
  const [salaryAmount, setSalaryAmount] = useState("");
  const [salaryStartDate, setSalaryStartDate] = useState<Date | undefined>(new Date());
  const [salaryEndDate, setSalaryEndDate] = useState<Date | undefined>(undefined);
  const [savingSalary, setSavingSalary] = useState(false);

  const activeCharges = fixedCharges.filter((c) => c.is_active);

  // Profiles eligible for new salary (collaborateur/agence without active period)
  const today = new Date().toISOString().slice(0, 10);
  const activeSalaryProfileIds = new Set(salaryPeriods.filter(sp => !sp.end_date || sp.end_date >= today).map(sp => sp.profile_id));
  const eligibleProfiles = profiles.filter(p => ["collaborateur", "agence"].includes(p.role) && p.is_active && !activeSalaryProfileIds.has(p.id));

  // All salary periods with profile names
  const allSalaryPeriods = salaryPeriods.map(sp => {
    const profile = profiles.find(p => p.id === sp.profile_id);
    return { ...sp, full_name: profile?.full_name || "Inconnu", role: profile?.role || "" };
  }).sort((a, b) => {
    const aActive = !a.end_date || a.end_date >= today;
    const bActive = !b.end_date || b.end_date >= today;
    if (aActive !== bActive) return aActive ? -1 : 1;
    return a.full_name.localeCompare(b.full_name);
  });

  const handleAddCharge = async () => {
    if (!name || !amount) return;
    setSaving(true);
    const { error } = await (supabase.from("fixed_charges" as any) as any).insert({ name, amount: parseFloat(amount), frequency });
    setSaving(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Charge ajoutée" });
      setName(""); setAmount(""); onRefreshCharges();
    }
  };

  const handleDeleteCharge = async (id: string) => {
    await (supabase.from("fixed_charges" as any) as any).delete().eq("id", id);
    onRefreshCharges();
  };

  const handleAddSalary = async () => {
    if (!salaryProfileId || !salaryAmount || !salaryStartDate) return;
    setSavingSalary(true);
    const payload: any = {
      profile_id: salaryProfileId,
      amount: parseFloat(salaryAmount),
      start_date: format(salaryStartDate, "yyyy-MM-dd"),
    };
    if (salaryEndDate) payload.end_date = format(salaryEndDate, "yyyy-MM-dd");
    const { error } = await (supabase.from("salary_periods" as any) as any).insert(payload);
    setSavingSalary(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Salaire ajouté" });
      setSalaryProfileId(""); setSalaryAmount(""); setSalaryStartDate(new Date()); setSalaryEndDate(undefined);
      onRefreshSalaries();
    }
  };

  const handleEndSalary = async (id: string) => {
    const { error } = await (supabase.from("salary_periods" as any) as any).update({ end_date: today }).eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Salaire clôturé" });
      onRefreshSalaries();
    }
  };

  const handleDeleteSalary = async (id: string) => {
    const { error } = await (supabase.from("salary_periods" as any) as any).delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Période supprimée" });
      onRefreshSalaries();
    }
  };

  const handleUpdateSalaryAmount = async (id: string, newAmount: number) => {
    const { error } = await (supabase.from("salary_periods" as any) as any).update({ amount: newAmount }).eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      onRefreshSalaries();
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            Charges
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setManageOpen(true)}>
              <Settings2 className="h-3 w-3" /> Gérer
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
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
        </CardContent>
      </Card>

      {/* ── MANAGE CHARGES MODAL ── */}
      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Gestion des charges</DialogTitle>
            <DialogDescription>Gérez vos salaires fixes et abonnements.</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="salaries" className="flex-1 min-h-0 flex flex-col">
            <TabsList className="flex-shrink-0">
              <TabsTrigger value="salaries" className="gap-1.5">
                <Users className="h-3.5 w-3.5" /> Salaires fixes
              </TabsTrigger>
              <TabsTrigger value="subscriptions" className="gap-1.5">
                <Building2 className="h-3.5 w-3.5" /> Abonnements
              </TabsTrigger>
            </TabsList>

            {/* ── SALAIRES TAB ── */}
            <TabsContent value="salaries" className="flex-1 min-h-0 overflow-y-auto space-y-4 mt-3">
              {/* Add salary form */}
              {eligibleProfiles.length > 0 && (
                <div className="border border-dashed border-border rounded-lg p-3 space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">Ajouter un salaire fixe</p>
                  <div className="grid grid-cols-[1fr_100px] gap-2">
                    <Select value={salaryProfileId} onValueChange={setSalaryProfileId}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Collaborateur..." /></SelectTrigger>
                      <SelectContent>
                        {eligibleProfiles.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input type="number" placeholder="€/mois" value={salaryAmount} onChange={e => setSalaryAmount(e.target.value)} className="h-8 text-sm text-right" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Label className="text-[11px] text-muted-foreground">Début</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full h-8 text-xs justify-start", !salaryStartDate && "text-muted-foreground")}>
                            <CalendarDays className="h-3 w-3 mr-1.5" />
                            {salaryStartDate ? format(salaryStartDate, "d MMM yyyy", { locale: fr }) : "Date début"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={salaryStartDate} onSelect={setSalaryStartDate} className="p-3 pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="flex-1">
                      <Label className="text-[11px] text-muted-foreground">Fin (optionnel)</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full h-8 text-xs justify-start", !salaryEndDate && "text-muted-foreground")}>
                            <CalendarDays className="h-3 w-3 mr-1.5" />
                            {salaryEndDate ? format(salaryEndDate, "d MMM yyyy", { locale: fr }) : "Indéterminée"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={salaryEndDate} onSelect={setSalaryEndDate} className="p-3 pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="pt-4">
                      <Button size="sm" className="h-8 text-xs" onClick={handleAddSalary} disabled={savingSalary || !salaryProfileId || !salaryAmount}>
                        <Plus className="h-3 w-3 mr-1" /> Ajouter
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Salary periods list */}
              <div className="space-y-1.5">
                {allSalaryPeriods.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">Aucun salaire fixe configuré</p>
                )}
                {allSalaryPeriods.map(sp => {
                  const isActive = !sp.end_date || sp.end_date >= today;
                  return (
                    <div key={sp.id} className={cn("flex items-center gap-3 rounded-lg border p-3 group", isActive ? "border-border" : "border-border/50 opacity-60")}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground truncate">{sp.full_name}</span>
                          {isActive ? (
                            <Badge variant="outline" className="text-[10px] text-[hsl(var(--kpi-paid))] border-[hsl(var(--kpi-paid)/0.3)]">Actif</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">Terminé</Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {format(new Date(sp.start_date), "d MMM yyyy", { locale: fr })}
                          {sp.end_date ? ` → ${format(new Date(sp.end_date), "d MMM yyyy", { locale: fr })}` : " → en cours"}
                        </p>
                      </div>
                      <div className="w-24">
                        <Input
                          type="number"
                          value={sp.amount}
                          onChange={() => {}}
                          onBlur={(e) => {
                            const v = parseFloat(e.target.value);
                            if (v > 0 && v !== sp.amount) handleUpdateSalaryAmount(sp.id, v);
                          }}
                          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                          defaultValue={sp.amount}
                          className="h-7 text-sm text-right tabular-nums"
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">€/mois</span>
                      <div className="flex items-center gap-1">
                        {isActive && (
                          <Button size="sm" variant="outline" className="h-7 text-[11px] px-2" onClick={() => handleEndSalary(sp.id)}>
                            Clôturer
                          </Button>
                        )}
                        <button onClick={() => handleDeleteSalary(sp.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive p-1">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* ── ABONNEMENTS TAB ── */}
            <TabsContent value="subscriptions" className="flex-1 min-h-0 overflow-y-auto space-y-4 mt-3">
              {/* Add charge form */}
              <div className="border border-dashed border-border rounded-lg p-3 space-y-3">
                <p className="text-xs font-medium text-muted-foreground">Ajouter un abonnement</p>
                <div className="grid grid-cols-[1fr_100px_120px] gap-2 items-end">
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Nom</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Calendly, Supabase..." className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Montant (€)</Label>
                    <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="29.99" className="h-8 text-sm text-right" />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Fréquence</Label>
                    <Select value={frequency} onValueChange={setFrequency}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Mensuel</SelectItem>
                        <SelectItem value="yearly">Annuel</SelectItem>
                        <SelectItem value="one_time">Ponctuel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button size="sm" className="h-8 text-xs" onClick={handleAddCharge} disabled={saving || !name || !amount}>
                  <Plus className="h-3 w-3 mr-1" /> {saving ? "Ajout..." : "Ajouter"}
                </Button>
              </div>

              {/* Charges list */}
              <div className="space-y-1.5">
                {activeCharges.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">Aucun abonnement configuré</p>
                )}
                {activeCharges.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg border border-border p-3 group">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{c.name}</span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{freqLabels[c.frequency] || c.frequency}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium tabular-nums">{fmt(c.amount)}</span>
                      <button onClick={() => handleDeleteCharge(c.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive p-1">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}
