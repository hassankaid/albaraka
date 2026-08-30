// ─────────────────────────────────────────────────────────────────────────
// Onglet Marketing — V2.
//
// Deux lectures, et une seule source de chiffres derrière les deux :
//   • par conférence — la maille naturelle de l'acquisition ici,
//   • par mois — la maille de pilotage, avec M-1, objectif et écart.
//
// L'analyse « meilleur / pire » par canal, par tunnel et par combinaison est
// rattachée à chacune des deux : c'est la même question posée sur deux
// périmètres, pas deux écrans différents.
//
// Le troisième onglet garde l'ancien tableau de bord. Il couvre des choses que
// la V2 ne reprend pas encore — le suivi des RDV, les drill-downs par campagne.
// Il disparaîtra quand ces écrans auront été repris ou déclarés inutiles.
// ─────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ConferenceFilter } from "@/lib/marketing/conferenceFilter";
import VueConference from "./VueConference";
import VueMensuelle from "./VueMensuelle";
import MarketingTabLegacy from "./MarketingTabLegacy";

export interface MarketingTabProps {
  /**
   * Remonte la période affichée, pour que d'autres blocs de la page (les
   * commissions de l'agence) parlent de la même chose que le tableau.
   */
  onPeriodeChange?: (f: ConferenceFilter) => void;
}

type Vue = "conference" | "mensuel" | "ancien";

export default function MarketingTab({ onPeriodeChange }: MarketingTabProps = {}) {
  const [vue, setVue] = useState<Vue>("conference");
  const [periode, setPeriode] = useState<ConferenceFilter | null>(null);

  useEffect(() => {
    if (periode && onPeriodeChange) onPeriodeChange(periode);
  }, [periode, onPeriodeChange]);

  return (
    <Tabs value={vue} onValueChange={(v) => setVue(v as Vue)} className="space-y-4">
      <TabsList>
        <TabsTrigger value="conference">Par conférence</TabsTrigger>
        <TabsTrigger value="mensuel">Mensuel</TabsTrigger>
        <TabsTrigger value="ancien" className="text-muted-foreground">Détail (ancien)</TabsTrigger>
      </TabsList>

      <TabsContent value="conference" className="mt-0">
        <VueConference onPeriodeChange={setPeriode} />
      </TabsContent>

      <TabsContent value="mensuel" className="mt-0">
        <VueMensuelle onPeriodeChange={setPeriode} />
      </TabsContent>

      <TabsContent value="ancien" className="mt-0">
        <MarketingTabLegacy />
      </TabsContent>
    </Tabs>
  );
}
