// AgencyDashboard — Dashboard dédié au rôle 'agence' (lecture seule)
//
// Composition :
//   1. MarketingTab — performance par conférence et mensuelle, objectifs,
//      analyse par canal / tunnel / combinaison.
//   2. PerformanceSources — ventes par source jusqu'à la créa, profil des
//      acheteurs (dashboard Sales, lot 2 : sans nom de client ni commission).
//   3. AgencyCommissionsBlock — commissions de l'agence : collectées, à venir, ROI.
//
// La période n'est plus choisie ici : c'est l'onglet Marketing qui la remonte,
// pour que les commissions parlent toujours du même périmètre que le tableau
// affiché juste au-dessus. Un seul sélecteur à l'écran, donc.

import { useState } from "react";
import MarketingTab from "@/components/dashboard/marketing/MarketingTab";
import AgencyCommissionsBlock from "@/components/dashboard/agency/AgencyCommissionsBlock";
import PerformanceSources from "@/components/dashboard/sales/PerformanceSources";
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

      {/* Section 1 : Marketing — pilote aussi la période des commissions */}
      <MarketingTab onPeriodeChange={setFilter} />

      {/* Section 2 : Ventes par source, même période que le tableau Marketing */}
      <PerformanceSources
        filtre={filter}
        suffixeExport={filter.mode === "single" ? filter.date : filter.mode === "range" ? `${filter.from}_${filter.to}` : "tout"}
      />

      {/* Section 3 : Commissions (collectées, à venir, ROI) */}
      <AgencyCommissionsBlock filter={filter} />
    </div>
  );
}
