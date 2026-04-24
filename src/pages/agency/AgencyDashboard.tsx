// AgencyDashboard — Dashboard dédié au rôle 'agence' (lecture seule)
//
// Composition :
//   1. MarketingTab (existant) — toutes les métriques marketing : budget ads,
//      leads, RDV, ventes, CPL/CPR/CAC, drill-downs. Filtre contrôlé depuis ici.
//   2. AgencyCommissionsBlock (nouveau) — synthèse des commissions de l'agence :
//      collectées / à venir / ROI. Drill-downs sur les lignes.
//
// Le filtre par conférence (dimanche) est partagé entre les 2 sections pour
// assurer la cohérence des chiffres.

import { useState } from "react";
import MarketingTab from "@/components/dashboard/marketing/MarketingTab";
import AgencyCommissionsBlock from "@/components/dashboard/agency/AgencyCommissionsBlock";
import {
  currentOrPrevSunday,
  type ConferenceFilter as ConferenceFilterValue,
} from "@/lib/marketing/conferenceFilter";

export default function AgencyDashboard() {
  const [filter, setFilter] = useState<ConferenceFilterValue>(() => ({
    mode: "single" as const,
    date: currentOrPrevSunday(new Date()),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-heading text-foreground">Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Vue synthétique de ton activité marketing et de tes commissions.
        </p>
      </div>

      {/* Section 1 : Marketing (budget ads, leads, RDV, ventes, CAC…) */}
      <MarketingTab filter={filter} onFilterChange={setFilter} />

      {/* Section 2 : Commissions (collectées, à venir, ROI) */}
      <AgencyCommissionsBlock filter={filter} />
    </div>
  );
}
