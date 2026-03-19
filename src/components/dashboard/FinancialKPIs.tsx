import { TrendingUp, TrendingDown, Wallet, CreditCard, Percent, AlertTriangle, PiggyBank, BarChart3 } from "lucide-react";

interface Props {
  caGenere: number;
  caCollecte: number;
  tauxCashCollecte: number;
  tauxImpayes: number;
  benefice: number;
  totalChargesCumul: number;
  totalCommissions: number;
}

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export default function FinancialKPIs({ caGenere, caCollecte, tauxCashCollecte, tauxImpayes, benefice, totalChargesCumul, totalCommissions }: Props) {
  const kpis = [
    { label: "CA Généré", value: fmt(caGenere), icon: TrendingUp, color: "text-primary" },
    { label: "CA Collecté", value: fmt(caCollecte), icon: Wallet, color: "text-emerald-500" },
    { label: "Taux encaissé", value: `${tauxCashCollecte.toFixed(1)}%`, icon: Percent, color: "text-blue-500" },
    { label: "Taux d'impayés", value: `${tauxImpayes.toFixed(1)}%`, icon: AlertTriangle, color: tauxImpayes > 10 ? "text-destructive" : "text-amber-500" },
    { label: "Commissions", value: fmt(totalCommissions), icon: CreditCard, color: "text-orange-500" },
    { label: "Charges", value: fmt(totalChargesCumul), icon: BarChart3, color: "text-muted-foreground" },
    { label: "Bénéfice", value: fmt(benefice), icon: PiggyBank, color: benefice >= 0 ? "text-emerald-500" : "text-destructive" },
    { label: "ROI Ads", value: "—", icon: TrendingDown, color: "text-muted-foreground" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      {kpis.map((k) => (
        <div key={k.label} className="bg-card border border-border rounded-xl p-3 flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <k.icon className={`h-3.5 w-3.5 ${k.color}`} />
            <span className="text-[11px] text-muted-foreground font-medium truncate">{k.label}</span>
          </div>
          <span className="text-sm font-bold text-foreground">{k.value}</span>
        </div>
      ))}
    </div>
  );
}
