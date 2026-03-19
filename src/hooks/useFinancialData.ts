import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/fetchAllRows";

interface Sale {
  id: string;
  amount_ht: number;
  mensualites: number | null;
  payment_status: string | null;
  contact_id: string;
  product: string;
  sold_at: string | null;
  closed_by: string | null;
  lead_id: string | null;
}

interface Contact {
  id: string;
  full_name: string | null;
  email: string | null;
  phone_normalized: string | null;
}

interface Payment {
  id: string;
  amount: number;
  status: string;
  due_date: string;
  paid_at: string | null;
  sale_id: string | null;
  payment_number: number;
  total_payments: number;
}

interface Commission {
  id: string;
  amount: number | null;
  status: string | null;
  role: string;
  beneficiary_user_id: string | null;
  beneficiary_external: string | null;
  sale_id: string;
  paid_at: string | null;
}

interface Profile {
  id: string;
  full_name: string;
  role: string;
  is_active: boolean;
}

interface SalaryPeriod {
  id: string;
  profile_id: string;
  amount: number;
  start_date: string;
  end_date: string | null;
}

interface FixedCharge {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  category: string;
  is_active: boolean;
  start_date: string;
  end_date: string | null;
  notes: string | null;
}

export function useFinancialData() {
  const salesQuery = useQuery({
    queryKey: ["financial-sales"],
    queryFn: () => fetchAllRows<Sale>("sales", "id, amount_ht, mensualites, payment_status, contact_id, product, sold_at, closed_by, lead_id"),
  });

  const paymentsQuery = useQuery({
    queryKey: ["financial-payments"],
    queryFn: () => fetchAllRows<Payment>("payments", "id, amount, status, due_date, paid_at, sale_id, payment_number, total_payments"),
  });

  const commissionsQuery = useQuery({
    queryKey: ["financial-commissions"],
    queryFn: () => fetchAllRows<Commission>("commissions", "id, amount, status, role, beneficiary_user_id, beneficiary_external, sale_id, paid_at"),
  });

  const profilesQuery = useQuery({
    queryKey: ["financial-profiles"],
    queryFn: () => fetchAllRows<Profile>("profiles", "id, full_name, role, is_active"),
  });

  const salaryPeriodsQuery = useQuery({
    queryKey: ["financial-salary-periods"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("salary_periods" as any)
        .select("*")
        .order("start_date", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as SalaryPeriod[];
    },
  });

  const contactsQuery = useQuery({
    queryKey: ["financial-contacts"],
    queryFn: () => fetchAllRows<Contact>("contacts", "id, full_name, email, phone_normalized"),
  });

  const fixedChargesQuery = useQuery({
    queryKey: ["financial-fixed-charges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fixed_charges" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as FixedCharge[];
    },
  });

  const sales = salesQuery.data || [];
  const payments = paymentsQuery.data || [];
  const commissions = commissionsQuery.data || [];
  const profiles = profilesQuery.data || [];
  const contacts = contactsQuery.data || [];
  const fixedCharges = fixedChargesQuery.data || [];
  const salaryPeriods = salaryPeriodsQuery.data || [];

  // Build contact map for quick lookup
  const contactMap = new Map(contacts.map((c) => [c.id, c]));

  // KPI: CA Généré
  const caGenere = sales.reduce((sum, s) => sum + (s.amount_ht || 0), 0);

  // KPI: CA Collecté (paid payments only)
  const caCollecte = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  // KPI: Taux de cash collecté
  const tauxCashCollecte = caGenere > 0 ? (caCollecte / caGenere) * 100 : 0;

  // KPI: One-shot vs Multi
  const salesOneShot = sales.filter((s) => (s.mensualites || 1) === 1);
  const salesMulti = sales.filter((s) => (s.mensualites || 1) > 1);
  const totalSalesCount = sales.length;
  const oneShotPct = totalSalesCount > 0 ? (salesOneShot.length / totalSalesCount) * 100 : 0;
  const multiPct = totalSalesCount > 0 ? (salesMulti.length / totalSalesCount) * 100 : 0;
  const oneShotCA = salesOneShot.reduce((s, sale) => s + sale.amount_ht, 0);
  const multiCA = salesMulti.reduce((s, sale) => s + sale.amount_ht, 0);

  // KPI: Taux d'impayés
  const salesWithStatus = sales.filter((s) => s.payment_status);
  const salesLate = salesWithStatus.filter((s) => s.payment_status === "late");
  const salesLost = salesWithStatus.filter((s) => s.payment_status === "lost");
  const salesPaid = salesWithStatus.filter((s) => s.payment_status === "paid");
  const salesInProgress = salesWithStatus.filter((s) => s.payment_status === "in_progress");
  const impayesCount = salesLate.length + salesLost.length;
  const payesCount = salesPaid.length + salesInProgress.length;
  const tauxImpayes = salesWithStatus.length > 0 ? (impayesCount / salesWithStatus.length) * 100 : 0;

  // KPI: Commissions (due + paid = réellement engagées)
  const commissionsEngagees = commissions.filter((c) => c.status === "due" || c.status === "paid" || c.status === "invoiced");
  const totalCommissions = commissionsEngagees.reduce((sum, c) => sum + (c.amount || 0), 0);
  const commissionsPaid = commissions.filter((c) => c.status === "paid").reduce((sum, c) => sum + (c.amount || 0), 0);
  const commissionsDue = commissions.filter((c) => c.status === "due" || c.status === "invoiced").reduce((sum, c) => sum + (c.amount || 0), 0);

  // Charges: Salaires fixes mensuels
  const activeSalaries = profiles.filter((p) => p.fixed_salary_active && p.fixed_salary && p.fixed_salary > 0);
  const totalSalariesMensuel = activeSalaries.reduce((sum, p) => sum + (p.fixed_salary || 0), 0);

  // Charges: Fixed charges (monthly equivalent)
  const activeCharges = fixedCharges.filter((c) => c.is_active);
  const totalFixedChargesMensuel = activeCharges.reduce((sum, c) => {
    if (c.frequency === "yearly") return sum + c.amount / 12;
    if (c.frequency === "one_time") return sum; // not recurring
    return sum + c.amount; // monthly
  }, 0);

  // Total charges mensuelles
  const totalChargesMensuel = totalSalariesMensuel + totalFixedChargesMensuel;

  // Bénéfice = CA collecté - commissions payées - charges (estimation)
  const benefice = caCollecte - commissionsPaid;

  // MRR: group non-lost payments by month
  const mrrByMonth: Record<string, number> = {};
  payments
    .filter((p) => p.status !== "lost" && p.total_payments > 1)
    .forEach((p) => {
      const month = p.due_date.substring(0, 7); // YYYY-MM
      mrrByMonth[month] = (mrrByMonth[month] || 0) + p.amount;
    });

  const mrrData = Object.entries(mrrByMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, amount]) => ({ month, amount }));

  // Treasury: In / Out / Remaining
  const tresoIn = caCollecte;
  const tresoOut = commissionsPaid + totalSalariesMensuel + totalFixedChargesMensuel;
  const tresoRemaining = tresoIn - tresoOut;

  // Impayés list (sales with late or lost)
  const impayesList = [...salesLate, ...salesLost];

  const isLoading = salesQuery.isLoading || paymentsQuery.isLoading || commissionsQuery.isLoading || profilesQuery.isLoading || fixedChargesQuery.isLoading || contactsQuery.isLoading;

  return {
    isLoading,
    caGenere,
    caCollecte,
    tauxCashCollecte,
    oneShotPct,
    multiPct,
    oneShotCA,
    multiCA,
    salesOneShot,
    salesMulti,
    totalSalesCount,
    mrrData,
    tauxImpayes,
    impayesCount,
    payesCount,
    salesLate,
    salesLost,
    salesPaid,
    salesInProgress,
    impayesList,
    totalCommissions,
    commissionsPaid,
    commissionsDue,
    benefice,
    totalSalariesMensuel,
    totalFixedChargesMensuel,
    totalChargesMensuel,
    activeSalaries,
    activeCharges,
    fixedCharges,
    profiles,
    contacts,
    contactMap,
    tresoIn,
    tresoOut,
    tresoRemaining,
    sales,
    payments,
    refetchCharges: fixedChargesQuery.refetch,
  };
}
