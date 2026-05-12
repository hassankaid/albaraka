import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, AlertTriangle, CheckCircle2, Calculator } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PendingPayment {
  id: string;
  payment_number: number;
  amount: number;
  status: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string;
  saleProduct: string;
  currentTotalHt: number;
  payments: Array<PendingPayment & { status: string }>;
  onSuccess: () => void;
}

export default function AdjustTotalAmountModal({
  open,
  onOpenChange,
  saleId,
  saleProduct,
  currentTotalHt,
  payments,
  onSuccess,
}: Props) {
  const { toast } = useToast();
  const [newTotalStr, setNewTotalStr] = useState<string>(String(currentTotalHt));
  const [submitting, setSubmitting] = useState(false);

  // Reset à l'ouverture pour partir des bonnes valeurs
  // (sans utiliser useEffect avec open dans deps, le state initial est OK)
  // → on reset au close
  const handleOpenChange = (v: boolean) => {
    if (!v && !submitting) {
      setNewTotalStr(String(currentTotalHt));
    }
    onOpenChange(v);
  };

  const paidPayments = payments.filter((p) => p.status === "paid");
  const pendingPayments = payments.filter((p) => p.status === "pending");
  const totalPaid = paidPayments.reduce((s, p) => s + Number(p.amount), 0);
  const totalPending = pendingPayments.reduce((s, p) => s + Number(p.amount), 0);

  const newTotal = useMemo(() => {
    const n = parseFloat(newTotalStr.replace(",", "."));
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [newTotalStr]);

  const calculation = useMemo(() => {
    if (newTotal == null) return null;
    const newTotalCents = Math.round(newTotal * 100);
    const paidCents = Math.round(totalPaid * 100);
    const remainingCents = newTotalCents - paidCents;
    if (remainingCents <= 0) {
      return {
        invalid: true,
        reason: `Le nouveau total (${newTotal.toFixed(2)} €) est inférieur ou égal au déjà payé (${totalPaid.toFixed(2)} €). Le client serait en sur-paiement.`,
      };
    }
    if (pendingPayments.length === 0) {
      return {
        invalid: true,
        reason: "Aucune mensualité pending à ajuster.",
      };
    }
    const nbPending = pendingPayments.length;
    const baseCents = Math.floor(remainingCents / nbPending);
    const extraCents = remainingCents - baseCents * nbPending;
    return {
      invalid: false,
      newTotal,
      newTotalCents,
      remainingCents,
      baseCents,
      extraCents,
      newAmounts: pendingPayments.map((_, i) => (i === 0 ? baseCents + extraCents : baseCents) / 100),
    };
  }, [newTotal, totalPaid, pendingPayments]);

  const isSameAsCurrent =
    newTotal != null && Math.abs(newTotal - currentTotalHt) < 0.005;

  async function handleSubmit() {
    if (!calculation || calculation.invalid || isSameAsCurrent || newTotal == null) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke<{
        ok?: boolean;
        error?: string;
        message?: string;
        stripe_updated?: boolean;
        stripe_sub_id?: string | null;
      }>("adjust-stripe-subscription-amount", {
        body: { sale_id: saleId, new_total_amount: newTotal },
      });

      // Lecture défensive du body JSON en cas de 4xx (FunctionsHttpError)
      let result = data ?? null;
      if (error) {
        const ctx = (error as { context?: Response }).context;
        if (ctx && typeof ctx.json === "function") {
          try { result = await ctx.json(); } catch { /* keep null */ }
        }
      }
      if (!result?.ok) {
        throw new Error(result?.message || result?.error || "Mise à jour échouée");
      }

      toast({
        title: "Plan ajusté ✓",
        description: result.stripe_updated
          ? `Stripe et BDD synchronisés. Prochaine mensualité au nouveau montant.`
          : `BDD mise à jour. Pas de subscription Stripe à modifier (vente Systeme.io ou virement).`,
      });
      onSuccess();
      onOpenChange(false);
    } catch (e: any) {
      toast({
        title: "Ajustement échoué",
        description: e?.message || "Réessaie ou contacte le support",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Ajuster le montant total
          </DialogTitle>
          <DialogDescription>
            Modifie le total HT de cette vente <strong>sans annuler</strong> la
            subscription Stripe. Les futures mensualités s'ajustent
            automatiquement, le client n'a rien à refaire.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Récap actuel */}
          <div className="rounded-md border border-border/50 bg-secondary/30 p-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Produit</span>
              <span className="font-medium">{saleProduct}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total actuel</span>
              <span className="font-medium tabular-nums">{currentTotalHt.toFixed(2)} €</span>
            </div>
            <Separator className="my-1.5" />
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Déjà payé ({paidPayments.length})</span>
              <span className="text-emerald-400 tabular-nums">{totalPaid.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Pending actuels ({pendingPayments.length})</span>
              <span className="tabular-nums">{totalPending.toFixed(2)} €</span>
            </div>
          </div>

          {/* Input nouveau total */}
          <div className="space-y-2">
            <Label htmlFor="new-total" className="text-xs">
              Nouveau total HT
            </Label>
            <div className="relative">
              <Input
                id="new-total"
                type="text"
                inputMode="decimal"
                value={newTotalStr}
                onChange={(e) => setNewTotalStr(e.target.value)}
                disabled={submitting}
                placeholder="Ex : 2000"
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                €
              </span>
            </div>
          </div>

          {/* Calcul live */}
          {calculation && (
            <>
              {calculation.invalid ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/[0.05] p-3 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-xs text-destructive">{calculation.reason}</p>
                </div>
              ) : isSameAsCurrent ? (
                <div className="rounded-md border border-border/50 bg-muted/20 p-3 text-xs text-muted-foreground">
                  Le nouveau total est identique à l'actuel — rien à mettre à jour.
                </div>
              ) : (
                <div className="rounded-md border border-primary/30 bg-primary/[0.05] p-3 space-y-2 text-sm">
                  <div className="flex items-center gap-1.5 text-primary">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-medium">Impact</span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Reste à payer (nouveau)</span>
                      <span className="font-medium tabular-nums">
                        {(calculation.remainingCents! / 100).toFixed(2)} €
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Sur {pendingPayments.length} mensualités
                      </span>
                      <span className="font-bold text-primary tabular-nums">
                        ≈ {(calculation.baseCents! / 100).toFixed(2)} € / mois
                      </span>
                    </div>
                    {calculation.extraCents! > 0 && (
                      <div className="flex justify-between text-[10px] text-muted-foreground italic">
                        <span>1re mensualité absorbe {calculation.extraCents} cent{calculation.extraCents! > 1 ? "s" : ""}</span>
                        <span>{calculation.newAmounts![0].toFixed(2)} €</span>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground italic pt-1 border-t border-border/50">
                    Stripe sera mis à jour. La prochaine invoice (M{pendingPayments[0]?.payment_number ?? "?"})
                    sera facturée au nouveau montant. Pas de 3DS pour le client.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)} disabled={submitting}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              submitting ||
              !calculation ||
              calculation.invalid ||
              isSameAsCurrent
            }
            className="gap-2"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Appliquer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
