// AdminPaymentLinks — page admin "Liens de paiement" en 3 onglets :
//   1. Liens existants  → catalogue des offres officielles + liens prêts
//   2. Codes promo & tarifs → CRUD des coupons + édition des prix des offres
//   3. Liens personnalisés → outil libre (sur-mesure) — l'historique avant refonte
//
// Accès CEO uniquement (Navigate vers /dashboard sinon).

import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link2, Library, BadgePercent, Sparkles } from "lucide-react";
import CatalogueTab from "./CatalogueTab";
import CouponsAndPricingTab from "./CouponsAndPricingTab";
import CustomLinksTab from "./CustomLinksTab";

export default function AdminPaymentLinks() {
  const { profile } = useAuth();

  if (profile && profile.role !== "ceo") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground flex items-center gap-2">
          <Link2 className="h-6 w-6 text-primary" />
          Liens de paiement
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gère le catalogue d'offres, les codes promo, et crée des liens
          sur mesure pour les cas particuliers.
        </p>
      </div>

      <Tabs defaultValue="catalogue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="catalogue" className="gap-2">
            <Library className="h-3.5 w-3.5" />
            Liens existants
          </TabsTrigger>
          <TabsTrigger value="coupons" className="gap-2">
            <BadgePercent className="h-3.5 w-3.5" />
            Codes promo & tarifs
          </TabsTrigger>
          <TabsTrigger value="custom" className="gap-2">
            <Sparkles className="h-3.5 w-3.5" />
            Liens personnalisés
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catalogue">
          <CatalogueTab />
        </TabsContent>
        <TabsContent value="coupons">
          <CouponsAndPricingTab />
        </TabsContent>
        <TabsContent value="custom">
          <CustomLinksTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
