import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useFinancialData } from "@/hooks/useFinancialData";
import FinancialKPIs from "@/components/dashboard/FinancialKPIs";
import PaymentSplitCard from "@/components/dashboard/PaymentSplitCard";
import ImpayesSummaryCard from "@/components/dashboard/ImpayesSummaryCard";
import ImpayesListCard from "@/components/dashboard/ImpayesListCard";
import MRRChart from "@/components/dashboard/MRRChart";
import TreasuryCard from "@/components/dashboard/TreasuryCard";
import ChargesCard from "@/components/dashboard/ChargesCard";
import { Loader2 } from "lucide-react";

function FinancialTab() {
  const data = useFinancialData();

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
      <FinancialKPIs
        caGenere={data.caGenere}
        caCollecte={data.caCollecte}
        tauxCashCollecte={data.tauxCashCollecte}
        tauxImpayes={data.tauxImpayes}
        benefice={data.benefice}
        totalChargesMensuel={data.totalChargesMensuel}
        totalCommissions={data.totalCommissions}
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
          totalSalariesMensuel={data.totalSalariesMensuel}
          totalFixedChargesMensuel={data.totalFixedChargesMensuel}
        />
      </div>

      <ImpayesListCard
        salesLate={data.salesLate}
        salesLost={data.salesLost}
        contactMap={data.contactMap}
        payments={data.payments}
      />

      <MRRChart data={data.mrrData} payments={data.payments} contactMap={data.contactMap} sales={data.sales} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChargesCard
          fixedCharges={data.fixedCharges}
          activeSalaries={data.activeSalaries}
          totalFixedChargesMensuel={data.totalFixedChargesMensuel}
          totalSalariesMensuel={data.totalSalariesMensuel}
          commissionsPaid={data.commissionsPaid}
          commissionsDue={data.commissionsDue}
          salaryPeriods={data.salaryPeriods}
          profiles={data.profiles}
          onRefreshCharges={() => data.refetchCharges()}
          onRefreshSalaries={() => data.refetchSalaryPeriods()}
        />
        <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-2">
          <p className="text-sm font-semibold text-foreground">ROI Global</p>
          <p className="text-muted-foreground text-xs">L'intégration des dépenses publicitaires permettra de calculer le ROI automatiquement.</p>
          <p className="text-3xl font-bold text-muted-foreground">—</p>
        </div>
      </div>
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
