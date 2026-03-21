import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Trash2, Building2, Users, CreditCard, Receipt, Settings2, Wallet, ChevronRight, CalendarClock, RotateCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ── Types ──
interface FixedCharge {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  category: string;
  is_active: boolean;
  start_date: string;
  end_date: string | null;
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

interface Ad {
  id: string;
  date: string;
  campaign_name: string;
  amount_spent: number;
  channel: string | null;
}

interface DateRange {
  from: Date;
  to: Date;
}

interface Props {
  fixedCharges: FixedCharge[];
  activeSalaries: SalaryProfile[];
  totalFixedChargesMensuel: number;
  totalSalariesMensuel: number;
  totalAdsCumul: number;
  commissionsPaid: number;
  commissionsDue: number;
  salaryPeriods: SalaryPeriod[];
  profiles: Profile[];
  ads: Ad[];
  onRefreshCharges: () => void;
  onRefreshSalaries: () => void;
  dateRange?: DateRange | null;
}

// ── Helpers ──
function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

function lastDayOfMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function toStartDate(month: number, year: number) {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

function toEndDate(month: number, year: number) {
  const last = lastDayOfMonth(year, month);
  return `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
}

function parseMonth(dateStr: string): { month: number; year: number } {
  const d = new Date(dateStr);
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}

function formatMonthYear(dateStr: string) {
  const { month, year } = parseMonth(dateStr);
  return `${MONTHS[month - 1]} ${year}`;
}

function buildYears() {
  const cur = new Date().getFullYear();
  return Array.from({ length: 12 }, (_, i) => cur - 3 + i);
}

// ── Month/Year picker component ──
function MonthYearSelect({ value, onChange, label, placeholder }: {
  value: { month: number; year: number } | null;
  onChange: (v: { month: number; year: number }) => void;
  label: string;
  placeholder?: string;
}) {
  const currentYear = new Date().getFullYear();
  const years = buildYears();

  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground font-medium">{label}</Label>
      <div className="flex gap-1.5">
        <Select
          value={value ? String(value.month) : ""}
          onValueChange={(v) => onChange({ month: Number(v), year: value?.year || currentYear })}
        >
          <SelectTrigger className="h-8 text-xs flex-1">
            <SelectValue placeholder={placeholder || "Mois"} />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => (
              <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={value ? String(value.year) : ""}
          onValueChange={(v) => onChange({ month: value?.month || 1, year: Number(v) })}
        >
          <SelectTrigger className="h-8 text-xs w-20">
            <SelectValue placeholder="Année" />
          </SelectTrigger>
          <SelectContent>
            {years.map(y => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// ── Main component ──
export default function ChargesCard({
  fixedCharges,
  activeSalaries,
  totalFixedChargesMensuel,
  totalSalariesMensuel,
  totalAdsCumul,
  commissionsPaid,
  commissionsDue,
  salaryPeriods,
  profiles,
  ads,
  onRefreshCharges,
  onRefreshSalaries,
  dateRange,
}: Props) {
  const [manageOpen, setManageOpen] = useState(false);

  // ── Salary form state ──
  const [salaryProfileId, setSalaryProfileId] = useState("");
  const [salaryAmount, setSalaryAmount] = useState("");
  const [salaryStart, setSalaryStart] = useState<{ month: number; year: number } | null>(null);
  const [salaryEnd, setSalaryEnd] = useState<{ month: number; year: number } | null>(null);
  const [savingSalary, setSavingSalary] = useState(false);

  // ── Charge form state ──
  const [chargeName, setChargeName] = useState("");
  const [chargeAmount, setChargeAmount] = useState("");
  const [chargeFrequency, setChargeFrequency] = useState("monthly");
  const [chargeStart, setChargeStart] = useState<{ month: number; year: number } | null>(null);
  const [chargeEnd, setChargeEnd] = useState<{ month: number; year: number } | null>(null);
  const [savingCharge, setSavingCharge] = useState(false);

  // ── One-time charge form state ──
  const [otcName, setOtcName] = useState("");
  const [otcAmount, setOtcAmount] = useState("");
  const [otcMonth, setOtcMonth] = useState<{ month: number; year: number } | null>(null);
  const [savingOtc, setSavingOtc] = useState(false);

   const today = new Date().toISOString().slice(0, 10);

  // ── Period filtering helpers ──
  const rangeFromStr = dateRange ? dateRange.from.toISOString().slice(0, 10) : null;
  const rangeToStr = dateRange ? dateRange.to.toISOString().slice(0, 10) : null;
  const isFiltered = !!dateRange;

  // Check if a recurring charge (monthly) is active during the period
  function isActiveInPeriod(startDate: string, endDate: string | null): boolean {
    if (!rangeFromStr || !rangeToStr) return true;
    const start = startDate.slice(0, 10);
    const end = endDate ? endDate.slice(0, 10) : "9999-12-31";
    return start <= rangeToStr && end >= rangeFromStr;
  }

  // Check if a yearly charge has a billing anniversary in the period
  function hasYearlyBillingInPeriod(startDate: string, endDate: string | null): boolean {
    if (!dateRange) return true;
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date("9999-12-31");
    const billingMonth = start.getMonth();
    const billingDay = start.getDate();
    // Check each year that could overlap
    const startYear = dateRange.from.getFullYear();
    const endYear = dateRange.to.getFullYear();
    for (let y = startYear; y <= endYear; y++) {
      const hit = new Date(y, billingMonth, billingDay);
      if (hit >= dateRange.from && hit <= dateRange.to && hit >= start && hit <= end) return true;
    }
    return false;
  }

  // Check if a one-time charge falls in the period
  function isOneTimeInPeriod(startDate: string): boolean {
    if (!rangeFromStr || !rangeToStr) return true;
    const d = startDate.slice(0, 10);
    return d >= rangeFromStr && d <= rangeToStr;
  }

  // ── Computed ──
  const activeSalaryProfileIds = new Set(salaryPeriods.filter(sp => !sp.end_date || sp.end_date >= today).map(sp => sp.profile_id));
  const eligibleProfiles = profiles.filter(p => ["collaborateur", "agence"].includes(p.role) && p.is_active && !activeSalaryProfileIds.has(p.id));

  const allSalaryPeriods = salaryPeriods.map(sp => {
    const profile = profiles.find(p => p.id === sp.profile_id);
    return { ...sp, full_name: profile?.full_name || "Inconnu" };
  }).sort((a, b) => {
    const aActive = !a.end_date || a.end_date >= today;
    const bActive = !b.end_date || b.end_date >= today;
    if (aActive !== bActive) return aActive ? -1 : 1;
    return a.full_name.localeCompare(b.full_name);
  });

  // Filter salaries by period
  const filteredSalaryPeriods = isFiltered
    ? allSalaryPeriods.filter(sp => isActiveInPeriod(sp.start_date, sp.end_date))
    : allSalaryPeriods;

  const allYearlyCharges = fixedCharges.filter(c => c.is_active && c.frequency === "yearly");
  const allMonthlyCharges = fixedCharges.filter(c => c.is_active && c.frequency === "monthly");
  const allOneTimeCharges = fixedCharges.filter(c => c.is_active && c.frequency === "one_time");

  // Apply period filters
  const yearlyCharges = isFiltered
    ? allYearlyCharges.filter(c => hasYearlyBillingInPeriod(c.start_date, c.end_date))
    : allYearlyCharges;
  const monthlyCharges = isFiltered
    ? allMonthlyCharges.filter(c => isActiveInPeriod(c.start_date, c.end_date))
    : allMonthlyCharges;
  const oneTimeCharges = isFiltered
    ? allOneTimeCharges.filter(c => isOneTimeInPeriod(c.start_date))
    : allOneTimeCharges;

  // Also filter activeSalaries for the collapsible display
  const filteredActiveSalaries = isFiltered
    ? activeSalaries.filter(s => isActiveInPeriod(s.start_date, s.end_date))
    : activeSalaries;

  const totalOneTimeCharges = oneTimeCharges.reduce((sum, c) => sum + c.amount, 0);
  const totalMonthlyCharges = monthlyCharges.reduce((sum, c) => sum + c.amount, 0);
  const totalYearlyCharges = yearlyCharges.reduce((sum, c) => sum + c.amount, 0);

  // Compute next billing date for yearly charges
  function nextYearlyBilling(startDate: string): string {
    const start = new Date(startDate);
    const now = new Date();
    const billingMonth = start.getMonth();
    const billingDay = start.getDate();
    let year = now.getFullYear();
    let next = new Date(year, billingMonth, billingDay);
    if (next <= now) next = new Date(year + 1, billingMonth, billingDay);
    return next.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  }

  // ── Actions ──
  const handleAddSalary = async () => {
    if (!salaryProfileId || !salaryAmount || !salaryStart) return;
    setSavingSalary(true);
    const payload: any = {
      profile_id: salaryProfileId,
      amount: parseFloat(salaryAmount),
      start_date: toStartDate(salaryStart.month, salaryStart.year),
    };
    if (salaryEnd) payload.end_date = toEndDate(salaryEnd.month, salaryEnd.year);
    const { error } = await (supabase.from("salary_periods" as any) as any).insert(payload);
    setSavingSalary(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Salaire ajouté" });
      setSalaryProfileId(""); setSalaryAmount(""); setSalaryStart(null); setSalaryEnd(null);
      onRefreshSalaries();
    }
  };

  const handleUpdateSalaryDates = async (id: string, start: { month: number; year: number }, end: { month: number; year: number } | null) => {
    const payload: any = { start_date: toStartDate(start.month, start.year) };
    if (end) {
      payload.end_date = toEndDate(end.month, end.year);
    } else {
      payload.end_date = null;
    }
    const { error } = await (supabase.from("salary_periods" as any) as any).update(payload).eq("id", id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else onRefreshSalaries();
  };

  const handleUpdateSalaryAmount = async (id: string, newAmount: number) => {
    const { error } = await (supabase.from("salary_periods" as any) as any).update({ amount: newAmount }).eq("id", id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else onRefreshSalaries();
  };

  const handleEndSalary = async (id: string) => {
    const now = new Date();
    const endDate = toEndDate(now.getMonth() + 1, now.getFullYear());
    const { error } = await (supabase.from("salary_periods" as any) as any).update({ end_date: endDate }).eq("id", id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { toast({ title: "Salaire clôturé" }); onRefreshSalaries(); }
  };

  const handleDeleteSalary = async (id: string) => {
    const { error } = await (supabase.from("salary_periods" as any) as any).delete().eq("id", id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { toast({ title: "Période supprimée" }); onRefreshSalaries(); }
  };

  const handleAddCharge = async () => {
    if (!chargeName || !chargeAmount || !chargeStart) return;
    setSavingCharge(true);
    const payload: any = {
      name: chargeName,
      amount: parseFloat(chargeAmount),
      frequency: chargeFrequency,
      start_date: toStartDate(chargeStart.month, chargeStart.year),
    };
    if (chargeEnd) payload.end_date = toEndDate(chargeEnd.month, chargeEnd.year);
    const { error } = await (supabase.from("fixed_charges" as any) as any).insert(payload);
    setSavingCharge(false);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { toast({ title: "Abonnement ajouté" }); setChargeName(""); setChargeAmount(""); setChargeStart(null); setChargeEnd(null); onRefreshCharges(); }
  };

  const handleAddOtc = async () => {
    if (!otcName || !otcAmount || !otcMonth) return;
    setSavingOtc(true);
    const date = toStartDate(otcMonth.month, otcMonth.year);
    const { error } = await (supabase.from("fixed_charges" as any) as any).insert({
      name: otcName, amount: parseFloat(otcAmount), frequency: "one_time",
      start_date: date, end_date: toEndDate(otcMonth.month, otcMonth.year),
    });
    setSavingOtc(false);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { toast({ title: "Charge ajoutée" }); setOtcName(""); setOtcAmount(""); setOtcMonth(null); onRefreshCharges(); }
  };

  const handleDeleteCharge = async (id: string) => {
    await (supabase.from("fixed_charges" as any) as any).delete().eq("id", id);
    onRefreshCharges();
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
        <CardContent className="space-y-1">
          {/* Abonnements annuels — collapsible */}
          <Collapsible>
            <CollapsibleTrigger className="flex items-center justify-between text-sm w-full py-1 group hover:bg-muted/50 rounded-md px-1 -mx-1 transition-colors">
              <div className="flex items-center gap-2">
                <ChevronRight className="h-3 w-3 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
                <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Abonnements annuels</span>
              </div>
              <span className="font-medium">{fmt(totalYearlyCharges)}/an</span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="ml-8 mt-1 mb-2 space-y-1.5">
                {yearlyCharges.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Aucun abonnement annuel{isFiltered ? " sur cette période" : ""}</p>
                ) : (
                  yearlyCharges.map(c => (
                    <div key={c.id} className="flex items-center justify-between text-xs py-0.5">
                      <div className="flex flex-col min-w-0 mr-2">
                        <span className="text-foreground font-medium truncate">{c.name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          Prochaine éch. : {nextYearlyBilling(c.start_date)}
                        </span>
                      </div>
                      <span className="font-bold text-foreground whitespace-nowrap">{fmt(c.amount)}</span>
                    </div>
                  ))
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Abonnements mensuels — collapsible */}
          <Collapsible>
            <CollapsibleTrigger className="flex items-center justify-between text-sm w-full py-1 group hover:bg-muted/50 rounded-md px-1 -mx-1 transition-colors">
              <div className="flex items-center gap-2">
                <ChevronRight className="h-3 w-3 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
                <RotateCw className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Abonnements mensuels</span>
              </div>
              <span className="font-medium">{fmt(totalMonthlyCharges)}/mois</span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="ml-8 mt-1 mb-2 space-y-1.5">
                {monthlyCharges.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Aucun abonnement mensuel{isFiltered ? " sur cette période" : ""}</p>
                ) : (
                  monthlyCharges.map(c => (
                    <div key={c.id} className="flex items-center justify-between text-xs py-0.5">
                      <div className="flex flex-col min-w-0 mr-2">
                        <span className="text-foreground font-medium truncate">{c.name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          Depuis {formatMonthYear(c.start_date)}{c.end_date ? ` → ${formatMonthYear(c.end_date)}` : ""}
                        </span>
                      </div>
                      <span className="font-bold text-foreground whitespace-nowrap">{fmt(c.amount)}</span>
                    </div>
                  ))
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Salaires — collapsible */}
          <Collapsible>
            <CollapsibleTrigger className="flex items-center justify-between text-sm w-full py-1 group hover:bg-muted/50 rounded-md px-1 -mx-1 transition-colors">
              <div className="flex items-center gap-2">
                <ChevronRight className="h-3 w-3 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Salaires fixes</span>
              </div>
              <span className="font-medium">{fmt(totalSalariesMensuel)}/mois</span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="ml-8 mt-1 mb-2 space-y-1.5">
                {filteredActiveSalaries.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Aucun salaire actif{isFiltered ? " sur cette période" : ""}</p>
                ) : (
                  filteredActiveSalaries.map(s => (
                    <div key={s.id} className="flex items-center justify-between text-xs py-0.5">
                      <div className="flex flex-col min-w-0 mr-2">
                        <span className="text-foreground font-medium truncate">{s.full_name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {s.end_date
                            ? `${formatMonthYear(s.start_date)} → ${formatMonthYear(s.end_date)}`
                            : `Depuis ${formatMonthYear(s.start_date)}`}
                        </span>
                      </div>
                      <span className="font-bold text-foreground whitespace-nowrap">{fmt(s.amount)}/mois</span>
                    </div>
                  ))
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Autres charges — collapsible */}
          <Collapsible>
            <CollapsibleTrigger className="flex items-center justify-between text-sm w-full py-1 group hover:bg-muted/50 rounded-md px-1 -mx-1 transition-colors">
              <div className="flex items-center gap-2">
                <ChevronRight className="h-3 w-3 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
                <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Autres charges</span>
              </div>
              <span className="font-medium">{totalOneTimeCharges > 0 ? fmt(totalOneTimeCharges) : <span className="text-muted-foreground text-xs italic">—</span>}</span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="ml-8 mt-1 mb-2 space-y-1.5">
                {oneTimeCharges.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Aucune charge ponctuelle{isFiltered ? " sur cette période" : ""}</p>
                ) : (
                  [...oneTimeCharges].sort((a, b) => b.start_date.localeCompare(a.start_date)).map(c => (
                    <div key={c.id} className="flex items-center justify-between text-xs py-0.5">
                      <div className="flex flex-col min-w-0 mr-2">
                        <span className="text-foreground font-medium truncate">{c.name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(c.start_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                        </span>
                      </div>
                      <span className="font-bold text-foreground whitespace-nowrap">{fmt(c.amount)}</span>
                    </div>
                  ))
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Publicité — collapsible with campaign breakdown */}
          <Collapsible>
            <CollapsibleTrigger className="flex items-center justify-between text-sm w-full py-1 group hover:bg-muted/50 rounded-md px-1 -mx-1 transition-colors">
              <div className="flex items-center gap-2">
                <ChevronRight className="h-3 w-3 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
                <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Publicité (période)</span>
              </div>
              <span className="font-medium">{fmt(totalAdsCumul)}</span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="ml-8 mt-1 mb-2 space-y-1.5">
                {(() => {
                  // Aggregate ads by campaign
                  const byCampaign = new Map<string, { name: string; channel: string | null; total: number; count: number }>();
                  ads.forEach(a => {
                    const existing = byCampaign.get(a.campaign_name);
                    if (existing) {
                      existing.total += a.amount_spent;
                      existing.count++;
                    } else {
                      byCampaign.set(a.campaign_name, { name: a.campaign_name, channel: a.channel, total: a.amount_spent, count: 1 });
                    }
                  });
                  const campaigns = Array.from(byCampaign.values()).sort((a, b) => b.total - a.total);
                  if (campaigns.length === 0) {
                    return <p className="text-xs text-muted-foreground italic">Aucune dépense publicitaire</p>;
                  }
                  return campaigns.map(c => (
                    <div key={c.name} className="flex items-center justify-between text-xs py-0.5">
                      <div className="flex flex-col min-w-0 mr-2">
                        <span className="text-foreground font-medium truncate">{c.name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {c.channel ? `${c.channel} · ` : ""}{c.count} jour{c.count > 1 ? "s" : ""} de diffusion
                        </span>
                      </div>
                      <span className="font-bold text-foreground whitespace-nowrap">{fmt(c.total)}</span>
                    </div>
                  ));
                })()}
              </div>
            </CollapsibleContent>
          </Collapsible>
          <div className="flex items-center justify-between text-sm py-1 px-1 -mx-1">
            <div className="flex items-center gap-2 ml-5">
              <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Frais transaction</span>
            </div>
            <span className="text-muted-foreground text-xs italic">À venir</span>
          </div>
          <div className="border-t border-border pt-2 mt-2 space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Receipt className="h-3.5 w-3.5 text-[hsl(var(--kpi-paid))]" />
                <span className="text-muted-foreground">Commissions payées</span>
              </div>
              <span className="font-medium text-[hsl(var(--kpi-paid))]">{fmt(commissionsPaid)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Receipt className="h-3.5 w-3.5 text-[hsl(var(--kpi-late))]" />
                <span className="text-muted-foreground">Commissions dues</span>
              </div>
              <span className="font-medium text-[hsl(var(--kpi-late))]">{fmt(commissionsDue)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── MANAGE MODAL ── */}
      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col gap-0 p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
            <DialogTitle className="text-lg">Gestion des charges</DialogTitle>
            <DialogDescription className="text-xs">Gérez vos coûts opérationnels : salaires, abonnements et charges ponctuelles.</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="salaries" className="flex-1 min-h-0 flex flex-col">
            <TabsList className="mx-6 mt-4 mb-0 self-start bg-muted/50 h-9">
              <TabsTrigger value="salaries" className="gap-1.5 text-xs data-[state=active]:shadow-sm">
                <Users className="h-3.5 w-3.5" /> Salaires fixes
              </TabsTrigger>
              <TabsTrigger value="subscriptions" className="gap-1.5 text-xs data-[state=active]:shadow-sm">
                <Building2 className="h-3.5 w-3.5" /> Abonnements
              </TabsTrigger>
              <TabsTrigger value="other" className="gap-1.5 text-xs data-[state=active]:shadow-sm">
                <Wallet className="h-3.5 w-3.5" /> Autres charges
              </TabsTrigger>
            </TabsList>

            {/* ──────────── SALAIRES ──────────── */}
            <TabsContent value="salaries" className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 mt-4 space-y-4">
              {/* Add form */}
              {eligibleProfiles.length > 0 && (
                <div className="rounded-xl bg-muted/30 border border-border p-4 space-y-3">
                  <p className="text-xs font-semibold text-foreground">Nouveau salaire fixe</p>
                  <div className="grid grid-cols-[1fr_100px] gap-3">
                    <Select value={salaryProfileId} onValueChange={setSalaryProfileId}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Sélectionner un collaborateur..." /></SelectTrigger>
                      <SelectContent>
                        {eligibleProfiles.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input type="number" placeholder="€/mois" value={salaryAmount} onChange={e => setSalaryAmount(e.target.value)} className="h-9 text-sm text-right" />
                  </div>
                  <div className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end">
                    <MonthYearSelect label="Mois de début" value={salaryStart} onChange={setSalaryStart} />
                    <MonthYearSelect label="Mois de fin (optionnel)" value={salaryEnd} onChange={setSalaryEnd} placeholder="Indéterminé" />
                    <Button className="h-9 text-xs px-4" onClick={handleAddSalary} disabled={savingSalary || !salaryProfileId || !salaryAmount || !salaryStart}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter
                    </Button>
                  </div>
                </div>
              )}

              {/* List */}
              {filteredSalaryPeriods.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Aucun salaire fixe{isFiltered ? " sur cette période" : " configuré"}</p>
              ) : (
                <div className="space-y-2">
                  {filteredSalaryPeriods.map(sp => {
                    const isActive = !sp.end_date || sp.end_date >= today;
                    const startParsed = parseMonth(sp.start_date);
                    const endParsed = sp.end_date ? parseMonth(sp.end_date) : null;

                    return (
                      <div key={sp.id} className={cn(
                        "rounded-xl border p-4 transition-all group",
                        isActive
                          ? "border-border bg-card shadow-sm"
                          : "border-border/40 bg-muted/20 opacity-70"
                      )}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-semibold text-foreground">{sp.full_name}</span>
                              {isActive ? (
                                <Badge className="text-[10px] px-1.5 py-0 bg-[hsl(var(--kpi-paid)/0.12)] text-[hsl(var(--kpi-paid))] border-[hsl(var(--kpi-paid)/0.25)] border">Actif</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Terminé</Badge>
                              )}
                            </div>

                            {/* Editable dates */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[11px] text-muted-foreground">De</span>
                              <Select value={String(startParsed.month)} onValueChange={v => handleUpdateSalaryDates(sp.id, { month: Number(v), year: startParsed.year }, endParsed)}>
                                <SelectTrigger className="h-7 text-[11px] w-[110px]"><SelectValue /></SelectTrigger>
                                <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
                              </Select>
                              <Select value={String(startParsed.year)} onValueChange={v => handleUpdateSalaryDates(sp.id, { month: startParsed.month, year: Number(v) }, endParsed)}>
                                <SelectTrigger className="h-7 text-[11px] w-[72px]"><SelectValue /></SelectTrigger>
                                <SelectContent>{buildYears().map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                              </Select>
                              <span className="text-[11px] text-muted-foreground">→</span>
                              {endParsed ? (
                                <>
                                  <Select value={String(endParsed.month)} onValueChange={v => handleUpdateSalaryDates(sp.id, startParsed, { month: Number(v), year: endParsed.year })}>
                                    <SelectTrigger className="h-7 text-[11px] w-[110px]"><SelectValue /></SelectTrigger>
                                    <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
                                  </Select>
                                  <Select value={String(endParsed.year)} onValueChange={v => handleUpdateSalaryDates(sp.id, startParsed, { month: endParsed.month, year: Number(v) })}>
                                    <SelectTrigger className="h-7 text-[11px] w-[72px]"><SelectValue /></SelectTrigger>
                                    <SelectContent>{buildYears().map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                                  </Select>
                                </>
                              ) : (
                                <span className="text-[11px] text-muted-foreground italic">en cours</span>
                              )}
                            </div>
                          </div>

                          {/* Amount + actions */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Input
                              type="number"
                              defaultValue={sp.amount}
                              onBlur={(e) => {
                                const v = parseFloat(e.target.value);
                                if (v > 0 && v !== sp.amount) handleUpdateSalaryAmount(sp.id, v);
                              }}
                              onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                              className="w-20 h-8 text-sm text-right tabular-nums font-semibold"
                            />
                            <span className="text-xs text-muted-foreground whitespace-nowrap">€/mois</span>
                            {isActive && (
                              <Button size="sm" variant="outline" className="h-8 text-[11px] px-2.5 whitespace-nowrap" onClick={() => handleEndSalary(sp.id)}>
                                Clôturer
                              </Button>
                            )}
                            <button onClick={() => handleDeleteSalary(sp.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive p-1 rounded hover:bg-destructive/10">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* ──────────── ABONNEMENTS ──────────── */}
            <TabsContent value="subscriptions" className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 mt-4 space-y-4">
              {/* Add form */}
              <div className="rounded-xl bg-muted/30 border border-border p-4 space-y-3">
                <p className="text-xs font-semibold text-foreground">Nouvel abonnement</p>
                <div className="grid grid-cols-[1fr_100px_120px] gap-3">
                  <div>
                    <Label className="text-[11px] text-muted-foreground font-medium">Nom</Label>
                    <Input value={chargeName} onChange={e => setChargeName(e.target.value)} placeholder="Calendly, Supabase..." className="h-9 text-sm" />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground font-medium">Montant (€)</Label>
                    <Input type="number" value={chargeAmount} onChange={e => setChargeAmount(e.target.value)} placeholder="29.99" className="h-9 text-sm text-right" />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground font-medium">Fréquence</Label>
                    <Select value={chargeFrequency} onValueChange={setChargeFrequency}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Mensuel</SelectItem>
                        <SelectItem value="yearly">Annuel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end">
                  <MonthYearSelect label="Début" value={chargeStart} onChange={setChargeStart} />
                  <MonthYearSelect label="Fin (optionnel)" value={chargeEnd} onChange={setChargeEnd} placeholder="Indéterminé" />
                  <Button className="h-9 text-xs px-4" onClick={handleAddCharge} disabled={savingCharge || !chargeName || !chargeAmount || !chargeStart}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter
                  </Button>
                </div>
              </div>

              {/* List */}
              {[...monthlyCharges, ...yearlyCharges].length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Aucun abonnement{isFiltered ? " sur cette période" : " configuré"}</p>
              ) : (
                <div className="space-y-2">
                  {[...monthlyCharges, ...yearlyCharges].map(c => (
                    <div key={c.id} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between group shadow-sm">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{c.name}</span>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{c.frequency === "yearly" ? "Annuel" : "Mensuel"}</Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {formatMonthYear(c.start_date)}
                          {c.end_date ? ` → ${formatMonthYear(c.end_date)}` : " → en cours"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold tabular-nums">{fmt(c.amount)}</span>
                        <button onClick={() => handleDeleteCharge(c.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive p-1 rounded hover:bg-destructive/10">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ──────────── AUTRES CHARGES ──────────── */}
            <TabsContent value="other" className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 mt-4 space-y-4">
              {/* Add form */}
              <div className="rounded-xl bg-muted/30 border border-border p-4 space-y-3">
                <p className="text-xs font-semibold text-foreground">Nouvelle charge ponctuelle</p>
                <div className="grid grid-cols-[1fr_100px] gap-3">
                  <div>
                    <Label className="text-[11px] text-muted-foreground font-medium">Description</Label>
                    <Input value={otcName} onChange={e => setOtcName(e.target.value)} placeholder="Matériel, licence..." className="h-9 text-sm" />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground font-medium">Montant (€)</Label>
                    <Input type="number" value={otcAmount} onChange={e => setOtcAmount(e.target.value)} placeholder="0" className="h-9 text-sm text-right" />
                  </div>
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
                  <MonthYearSelect label="Mois de la charge" value={otcMonth} onChange={setOtcMonth} />
                  <Button className="h-9 text-xs px-4" onClick={handleAddOtc} disabled={savingOtc || !otcName || !otcAmount || !otcMonth}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter
                  </Button>
                </div>
              </div>

              {/* List */}
              {oneTimeCharges.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Aucune charge ponctuelle{isFiltered ? " sur cette période" : ""}</p>
              ) : (
                <div className="space-y-2">
                  {oneTimeCharges.map(c => (
                    <div key={c.id} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between group shadow-sm">
                      <div>
                        <span className="text-sm font-semibold text-foreground">{c.name}</span>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{formatMonthYear(c.start_date)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold tabular-nums">{fmt(c.amount)}</span>
                        <button onClick={() => handleDeleteCharge(c.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive p-1 rounded hover:bg-destructive/10">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}
