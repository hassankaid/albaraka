import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"; // dashboard
import { useAuth } from "@/hooks/useAuth";
import { useFinancialData, type FinancialDateRange } from "@/hooks/useFinancialData";
import FinancialKPIs from "@/components/dashboard/FinancialKPIs";
import PaymentSplitCard from "@/components/dashboard/PaymentSplitCard";
import ImpayesSummaryCard from "@/components/dashboard/ImpayesSummaryCard";
import ImpayesListCard from "@/components/dashboard/ImpayesListCard";
import MRRChart from "@/components/dashboard/MRRChart";
import TreasuryCard from "@/components/dashboard/TreasuryCard";
import ChargesCard from "@/components/dashboard/ChargesCard";
import PeriodSalesCard from "@/components/dashboard/PeriodSalesCard";
import PeriodFilter, { type DateRange } from "@/components/dashboard/PeriodFilter";
import { Loader2 } from "lucide-react";

function FinancialTab() {
  const now = new Date();
  const [dateRange, setDateRange] = useState<DateRange | null>({
    from: new Date(now.getFullYear(), now.getMonth(), 1),
    to: new Date(now.getFullYear(), now.getMonth() + 1, 0),
  });

  // Convert to FinancialDateRange for the hook
  const financialRange: FinancialDateRange | null = dateRange
    ? { from: dateRange.from, to: dateRange.to }
    : null;

  const data = useFinancialData(financialRange);

  if (data.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const lateCA = data.salesLate.reduce((sum, s) => sum + s.amount_ht, 0);
  const lostCA = data.salesLost.reduce((sum, s) => sum + s.amount_ht, 0);

  return (
    <div className="space-y-4">
      <PeriodFilter value={dateRange} onChange={setDateRange} />

      <FinancialKPIs
        caGenere={data.caGenere}
        caCollecte={data.caCollecte}
        tauxCashCollecte={data.tauxCashCollecte}
        tauxImpayes={data.tauxImpayes}
        benefice={data.benefice}
        totalChargesCumul={data.totalChargesCumul}
        totalCommissions={data.totalCommissions}
        isFiltered={dateRange !== null}
        sales={data.sales}
        payments={data.payments}
        contactMap={data.contactMap}
        commissions={data.commissions}
        profiles={data.profiles}
        totalSalariesCumul={data.totalSalariesCumul}
        totalFixedChargesCumul={data.totalFixedChargesCumul}
        commissionsPaid={data.commissionsPaid}
        activeSalaries={data.activeSalaries}
        activeCharges={data.activeCharges}
        allPayments={data.allPayments}
        allSales={data.allSales}
        totalAdsCumul={data.totalAdsCumul}
        roi={data.roi}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <PaymentSplitCard
          oneShotPct={data.oneShotPct}
          multiPct={data.multiPct}
          oneShotCA={data.oneShotCA}
          multiCA={data.multiCA}
          oneShotCount={data.salesOneShot.length}
          multiCount={data.salesMulti.length}
        />
        <ImpayesSummaryCard
          tauxImpayes={data.tauxImpayes}
          salesLateCount={data.salesLate.length}
          salesLostCount={data.salesLost.length}
          salesPaidCount={data.salesPaid.length}
          salesInProgressCount={data.salesInProgress.length}
          lateCA={lateCA}
          lostCA={lostCA}
        />
        <TreasuryCard
          tresoIn={data.tresoIn}
          tresoOut={data.tresoOut}
          tresoRemaining={data.tresoRemaining}
          commissionsPaid={data.commissionsPaid}
          totalSalariesCumul={data.totalSalariesCumul}
          totalFixedChargesCumul={data.totalFixedChargesCumul}
          totalAdsCumul={data.totalAdsCumul}
        />
      </div>

      <PeriodSalesCard
        sales={data.sales}
        payments={data.allPayments}
        contactMap={data.contactMap}
      />

      <ImpayesListCard
        salesLate={data.allSalesLate}
        salesLost={data.allSalesLost}
        contactMap={data.contactMap}
        payments={data.allPayments}
      />

      <MRRChart data={data.mrrData} payments={data.allPayments} contactMap={data.contactMap} sales={data.allSales} />

      <ChargesCard
        fixedCharges={data.fixedCharges}
        activeSalaries={data.activeSalaries}
        totalFixedChargesMensuel={data.totalFixedChargesMensuel}
        totalSalariesMensuel={data.totalSalariesMensuel}
        totalAdsCumul={data.totalAdsCumul}
        commissionsPaid={data.commissionsPaid}
        commissionsDue={data.commissionsDue}
        salaryPeriods={data.salaryPeriods}
        profiles={data.profiles}
        onRefreshCharges={() => data.refetchCharges()}
        onRefreshSalaries={() => data.refetchSalaryPeriods()}
      />
    </div>
  );
}

const Dashboard = () => {
  const { profile } = useAuth();
  const isCeo = profile?.role === "ceo";

  if (!isCeo) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
        <p className="text-muted-foreground mt-2">Vue d'ensemble de votre activité</p>
      </div>
    );
  }

  return (
    <Tabs defaultValue="financier" className="space-y-4">
      <TabsList>
        <TabsTrigger value="financier">💰 Financier</TabsTrigger>
        <TabsTrigger value="marketing" disabled>📣 Marketing</TabsTrigger>
        <TabsTrigger value="sales" disabled>🎯 Sales</TabsTrigger>
      </TabsList>

      <TabsContent value="financier">
        <FinancialTab />
      </TabsContent>
      <TabsContent value="marketing">
        <p className="text-muted-foreground text-sm py-10 text-center">Pôle Marketing — À venir</p>
      </TabsContent>
      <TabsContent value="sales">
        <p className="text-muted-foreground text-sm py-10 text-center">Pôle Sales — À venir</p>
      </TabsContent>
    </Tabs>
  );
};

export default Dashboard;
