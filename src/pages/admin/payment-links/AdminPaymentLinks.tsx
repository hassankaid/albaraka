// AdminPaymentLinks — page admin "Liens de paiement" en 3 onglets :
//   1. Liens existants  → catalogue des offres officielles + liens prêts
//   2. Codes promo & tarifs → CRUD des coupons + édition des prix des offres
//   3. Liens personnalisés → outil libre (sur-mesure) — l'historique avant refonte
//
// Accès CEO uniquement (Navigate vers /dashboard sinon).
//
// État partagé : un toggle global MODE TEST (en haut à droite du header) qui
// teinte tout l'admin en ambré + ajoute ?test=1 à TOUS les liens copiés
// depuis cette page. Voir payment-links-context.tsx pour le mécanisme.

import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Link2, Library, BadgePercent, Sparkles, FlaskConical, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import CatalogueTab from "./CatalogueTab";
import CouponsAndPricingTab from "./CouponsAndPricingTab";
import CustomLinksTab from "./CustomLinksTab";
import { PaymentLinksProvider, usePaymentLinksContext } from "./payment-links-context";

export default function AdminPaymentLinks() {
  const { profile } = useAuth();

  if (profile && profile.role !== "ceo") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <PaymentLinksProvider>
      <AdminPaymentLinksInner />
    </PaymentLinksProvider>
  );
}

// ─── Inner (a besoin du context pour le bandeau test) ───────────────────
function AdminPaymentLinksInner() {
  const { testMode } = usePaymentLinksContext();

  return (
    <div className={cn("relative space-y-4", testMode && "pt-2")}>
      {/* Bandeau ambré pleine largeur quand le mode test est actif. Visible
          de loin, impossible de l'oublier. */}
      {testMode && (
        <div className="absolute inset-x-0 -top-2 h-1 bg-gradient-to-r from-amber-500/0 via-amber-500 to-amber-500/0 rounded-full" />
      )}

      {/* Header : titre + intro à gauche, switch test/live à droite. */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold font-heading text-foreground flex items-center gap-2">
            <Link2 className="h-6 w-6 text-primary" />
            Liens de paiement
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gère le catalogue d'offres, les codes promo, et crée des liens
            sur mesure pour les cas particuliers.
          </p>
        </div>

        <TestModeSwitch />
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

// ─── Switch global TEST / LIVE ──────────────────────────────────────────
function TestModeSwitch() {
  const { testMode, setTestMode } = usePaymentLinksContext();

  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2 flex items-center gap-3 shrink-0 transition-colors",
        testMode
          ? "border-amber-500/50 bg-amber-500/[0.08] shadow-[0_0_0_1px_rgba(245,158,11,0.15)]"
          : "border-border/60 bg-card/40",
      )}
    >
      {/* Pictogramme + label LIVE (gauche) */}
      <div
        className={cn(
          "flex items-center gap-1.5 text-xs font-medium transition-colors",
          !testMode ? "text-emerald-400" : "text-muted-foreground",
        )}
      >
        <Zap className="h-3.5 w-3.5" />
        <span>LIVE</span>
      </div>

      <Switch
        checked={testMode}
        onCheckedChange={setTestMode}
        className={cn(
          "data-[state=checked]:bg-amber-500 data-[state=unchecked]:bg-emerald-500/60",
        )}
        aria-label="Activer le mode test"
      />

      {/* Pictogramme + label TEST (droite) */}
      <div
        className={cn(
          "flex items-center gap-1.5 text-xs font-medium transition-colors",
          testMode ? "text-amber-400" : "text-muted-foreground",
        )}
      >
        <FlaskConical className="h-3.5 w-3.5" />
        <span>TEST</span>
      </div>

      {/* Hint contextuel — visible seulement en mode test */}
      {testMode && (
        <span className="hidden md:inline text-[10.5px] text-amber-300/80 border-l border-amber-500/30 pl-3 max-w-[200px]">
          Tous les liens copiés utiliseront Stripe test (aucun paiement réel).
        </span>
      )}
    </div>
  );
}
