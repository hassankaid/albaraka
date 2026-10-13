// Taux de conversion de l'élève (Sidali, 13/10/2026) : prise de RDV, présence
// et closing, sur la semaine ou le mois en cours. Le closing se calcule sur les
// présents (RDV − no-show), pas sur les RDV obtenus.
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Percent } from "lucide-react";
import { calculerTaux, formaterTaux, type SaisieActivite } from "@/lib/activiteTaux";

interface Props {
  semaine: SaisieActivite[];
  mois: SaisieActivite[];
}

export function TauxConversion({ semaine, mois }: Props) {
  const [periode, setPeriode] = useState<"semaine" | "mois">("semaine");
  const t = calculerTaux(periode === "semaine" ? semaine : mois);

  const taux = [
    {
      titre: "Prise de RDV (setting)",
      valeur: t.tauxPriseRdv,
      calcul: `${t.rdv} RDV ÷ ${t.conversations} conversations`,
    },
    {
      titre: "Présence en RDV",
      valeur: t.tauxPresence,
      calcul: `${t.presents} présents ÷ ${t.rdv} RDV`,
    },
    {
      titre: "Conversion closing",
      valeur: t.tauxClosing,
      calcul: `${t.ventes} ventes ÷ ${t.presents} présents`,
    },
  ];

  return (
    <Card data-testid="taux-conversion">
      <CardHeader className="pb-3 flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Percent className="h-4 w-4" />
          Mes taux de conversion
        </CardTitle>
        <Tabs value={periode} onValueChange={(v) => setPeriode(v as "semaine" | "mois")}>
          <TabsList className="h-8">
            <TabsTrigger value="semaine" className="text-xs">Semaine</TabsTrigger>
            <TabsTrigger value="mois" className="text-xs">Mois</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {taux.map(({ titre, valeur, calcul }) => (
            <div key={titre} className="rounded-lg border bg-muted/30 p-3">
              <div className="text-xs text-muted-foreground">{titre}</div>
              <div className="text-2xl font-bold mt-1">{formaterTaux(valeur)}</div>
              <div className="text-[11px] text-muted-foreground mt-1">{calcul}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Présents = RDV obtenus − no-show ({t.rdv} − {t.noShows} = {t.presents}). Les conversations sont tes réponses reçues.
        </p>
      </CardContent>
    </Card>
  );
}
