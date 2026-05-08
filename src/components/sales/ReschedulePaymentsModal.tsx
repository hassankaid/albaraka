import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  CalendarIcon, AlertTriangle, CheckCircle2, Loader2, ArrowRight, RotateCcw,
  CreditCard,
} from "lucide-react";
import { format, addMonths } from "date-fns";
import { fr } from "date-fns/locale";

interface PendingPayment {
  id: string;
  payment_number: number;
  amount: number;
  due_date: string;
  status: string;
  stripe_subscription_id: string | null;
}

interface ReschedulePaymentsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string;
  saleProduct: string;
  contactName: string;
  pendingPayments: PendingPayment[];
  paidCount: number;
  paidTotal: number;
  /** Si renseigné, la vente vient de Systeme.io et nécessite une annulation
   *  manuelle dans leur dashboard avant la replanification. */
  systemeIoOrderId?: string | null;
  onSuccess: () => void;
}

// ─── Calcul du nouveau plan ─────────────────────────────────────────
// Garantit que la somme des nouvelles mensualités = restant exact (au centime près).
// Stratégie : N-1 paiements ronds au montant cible, dernier paiement ajusté.
function computeNewPlan(remaining: number, targetAmount: number, startDate: Date): {
  payments: { amount: number; due_date: string }[];
  warnings: string[];
} {
  const warnings: string[] = [];
  if (targetAmount <= 0) return { payments: [], warnings: ["Montant invalide"] };
  if (remaining <= 0) return { payments: [], warnings: ["Aucun montant restant à étaler"] };

  // Arrondis BDD-friendly (2 décimales)
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const remCents = Math.round(remaining * 100);
  const tgtCents = Math.round(targetAmount * 100);

  if (tgtCents > remCents) {
    return {
      payments: [{ amount: round2(remaining), due_date: format(startDate, "yyyy-MM-dd") }],
      warnings: [`Le montant cible (${targetAmount} €) est supérieur au restant (${remaining.toFixed(2)} €). Plan réduit à 1 paiement de ${remaining.toFixed(2)} €.`],
    };
  }

  const fullCount = Math.floor(remCents / tgtCents);
  const adjustmentCents = remCents - fullCount * tgtCents;
  const payments: { amount: number; due_date: string }[] = [];

  for (let i = 0; i < fullCount; i++) {
    payments.push({
      amount: round2(targetAmount),
      due_date: format(addMonths(startDate, i), "yyyy-MM-dd"),
    });
  }

  if (adjustmentCents > 0) {
    payments.push({
      amount: round2(adjustmentCents / 100),
      due_date: format(addMonths(startDate, fullCount), "yyyy-MM-dd"),
    });
  }

  // Warning si le dernier paiement est très petit (< 10% du target)
  const lastAmt = payments[payments.length - 1]?.amount ?? 0;
  if (payments.length > 1 && lastAmt < targetAmount * 0.1) {
    warnings.push(
      `La dernière mensualité (${lastAmt.toFixed(2)} €) est très petite. Tu peux soit la fusionner avec l'avant-dernière, soit garder telle quelle.`
    );
  }

  return { payments, warnings };
}

export default function ReschedulePaymentsModal({
  open, onOpenChange, saleId, saleProduct, contactName,
  pendingPayments, paidCount, paidTotal, systemeIoOrderId, onSuccess,
}: ReschedulePaymentsModalProps) {
  const { toast } = useToast();

  const remaining = useMemo(
    () => pendingPayments.reduce((s, p) => s + Number(p.amount), 0),
    [pendingPayments]
  );

  // Détection de la source pour l'étape 1 (stop des prélèvements automatiques).
  // Systeme.io utilise Stripe en backend, donc même les ventes Systeme.io ont une
  // sub Stripe annulable via l'API (l'edge function fait le fallback automatique
  // par lookup email). On peut donc tout faire en 1 clic, peu importe la source.
  const stripeSubId = pendingPayments.find((p) => p.stripe_subscription_id)?.stripe_subscription_id ?? null;
  const hasStripeSubInDb = !!stripeSubId;
  const hasSystemeIo = !!systemeIoOrderId && !hasStripeSubInDb;
  const needsStopStep = hasStripeSubInDb || hasSystemeIo;

  // ── Inputs ──
  const [targetAmount, setTargetAmount] = useState<string>("");
  const [startDate, setStartDate] = useState<Date>(() => {
    // Default : la date du premier pending (ou 1 mois après aujourd'hui si aucun pending)
    const firstPending = [...pendingPayments].sort(
      (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    )[0];
    return firstPending ? new Date(firstPending.due_date) : addMonths(new Date(), 1);
  });
  const [saving, setSaving] = useState(false);

  // ── Reset à l'ouverture ──
  useEffect(() => {
    if (open) {
      setTargetAmount("");
      const firstPending = [...pendingPayments].sort(
        (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      )[0];
      setStartDate(firstPending ? new Date(firstPending.due_date) : addMonths(new Date(), 1));
    }
  }, [open, pendingPayments]);

  // ── Plan calculé ──
  const plan = useMemo(() => {
    const target = parseFloat(targetAmount.replace(",", "."));
    if (isNaN(target) || target <= 0) return { payments: [], warnings: [] };
    return computeNewPlan(remaining, target, startDate);
  }, [targetAmount, startDate, remaining]);

  const planTotal = plan.payments.reduce((s, p) => s + p.amount, 0);
  const planTotalRounded = Math.round(planTotal * 100) / 100;
  const remainingRounded = Math.round(remaining * 100) / 100;
  const totalsMatch = Math.abs(planTotalRounded - remainingRounded) < 0.01;
  const canConfirm = plan.payments.length > 0 && totalsMatch && !saving;

  // ── Soumission ──
  async function handleConfirm() {
    if (!canConfirm) return;
    setSaving(true);
    try {
      // ── ÉTAPE 1 : Stop des prélèvements auto ──
      // Stripe natif OU Systeme.io : l'edge function gère les 2 cas. Elle annule
      // la sub côté Stripe (avec fallback automatique par lookup email pour les
      // ventes Systeme.io qui n'ont pas de stripe_subscription_id en BDD), et
      // marque les pending comme 'lost'. Si pas de sub trouvée du tout (ex:
      // virement manuel pur), on continue : pas d'annulation à faire.
      if (needsStopStep) {
        const { data: cancelData, error: cancelError } = await supabase.functions.invoke(
          "cancel-stripe-subscription",
          { body: { sale_id: saleId } }
        );
        if (cancelError) throw new Error(`Stripe : ${cancelError.message}`);
        const result = cancelData as { ok?: boolean; error?: string; message?: string };
        // Tolérant : si la sub était déjà annulée OU jamais trouvée, on continue.
        const tolerableErrors = new Set(["no_pending_payments", "no_subscription"]);
        if (!result?.ok && (!result?.error || !tolerableErrors.has(result.error))) {
          throw new Error(`Stripe : ${result?.message || result?.error || "annulation échouée"}`);
        }
      }

      // 1. Récupère les commissions des paiements pending pour les recréer à l'identique
      const pendingIds = pendingPayments.map((p) => p.id);
      const { data: oldCommissions } = await supabase
        .from("commissions")
        .select("payment_id, beneficiary_user_id, beneficiary_external, percentage, role")
        .in("payment_id", pendingIds);

      // Modèle de commissions par beneficiary (extrait du 1er pending pour répliquer le pattern)
      const commissionTemplate = pendingIds.length > 0
        ? (oldCommissions || []).filter((c) => c.payment_id === pendingIds[0])
        : [];

      // 2. DELETE les commissions liées aux pending (CASCADE via payment delete suffirait, mais explicit pour clarity)
      if (pendingIds.length > 0) {
        await supabase.from("commissions").delete().in("payment_id", pendingIds);
        await supabase.from("payments").delete().in("id", pendingIds);
      }

      // 3. Recompute payment_number — on garde la numérotation des paid puis on continue
      const newTotal = paidCount + plan.payments.length;

      // 4. Update total_payments des paid
      await supabase.from("payments").update({ total_payments: newTotal }).eq("sale_id", saleId);

      // 5. INSERT les nouveaux paiements avec leurs commissions
      let nextPaymentNumber = paidCount + 1;
      for (const p of plan.payments) {
        const { data: inserted, error: insErr } = await supabase
          .from("payments")
          .insert({
            sale_id: saleId,
            amount: p.amount,
            due_date: p.due_date,
            status: "pending",
            payment_number: nextPaymentNumber,
            total_payments: newTotal,
          })
          .select("id")
          .single();
        if (insErr) throw insErr;

        // Recrée les commissions pour ce nouveau paiement (montant calculé sur le nouveau pourcentage)
        if (commissionTemplate.length > 0 && inserted) {
          const newCommissions = commissionTemplate.map((c) => ({
            sale_id: saleId,
            payment_id: inserted.id,
            beneficiary_user_id: c.beneficiary_user_id,
            beneficiary_external: c.beneficiary_external,
            percentage: c.percentage,
            role: c.role,
            // commission = montant × pourcentage / 100, arrondie à 2 décimales
            amount: Math.round(p.amount * Number(c.percentage)) / 100,
            status: "pending",
          }));
          await supabase.from("commissions").insert(newCommissions);
        }

        nextPaymentNumber++;
      }

      // 6. Le sale.payment_status a peut-être été mis à 'lost' par cancel-stripe-subscription.
      //    Comme on vient de créer de nouveaux pending, la vente repasse à 'in_progress'.
      await supabase.from("sales").update({ payment_status: "in_progress" }).eq("id", saleId);

      toast({
        title: "Plan replanifié ✓",
        description: `${plan.payments.length} nouvelle(s) mensualité(s) créée(s) pour un total de ${planTotalRounded.toLocaleString("fr-FR")} €.`,
      });
      onOpenChange(false);
      onSuccess();
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Erreur de replanification",
        description: e?.message || "Réessaie ou contacte le dev",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-primary" />
            Modifier le plan de paiement
          </DialogTitle>
          <DialogDescription>
            <strong>{saleProduct}</strong> — {contactName}
          </DialogDescription>
        </DialogHeader>

        {/* État actuel */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-2.5">
            <div className="text-[10px] uppercase tracking-wider text-emerald-400 font-medium">Encaissé</div>
            <div className="text-base font-bold text-emerald-300 mt-0.5">{paidTotal.toLocaleString("fr-FR")} €</div>
            <div className="text-[10px] text-muted-foreground">{paidCount} mensualité{paidCount > 1 ? "s" : ""}</div>
          </div>
          <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5 p-2.5">
            <div className="text-[10px] uppercase tracking-wider text-yellow-400 font-medium">À étaler</div>
            <div className="text-base font-bold text-yellow-300 mt-0.5">{remaining.toLocaleString("fr-FR")} €</div>
            <div className="text-[10px] text-muted-foreground">{pendingPayments.length} pending actuels</div>
          </div>
          <div className="rounded-md border border-border/50 bg-card/50 p-2.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total vente</div>
            <div className="text-base font-bold text-foreground mt-0.5">
              {(paidTotal + remaining).toLocaleString("fr-FR")} €
            </div>
            <div className="text-[10px] text-muted-foreground">acquis + restant</div>
          </div>
        </div>

        {/* ── ÉTAPE 1 : Stop des prélèvements automatiques ────────────── */}
        {needsStopStep && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">1</div>
              <h4 className="text-sm font-semibold text-foreground">Stopper les prélèvements automatiques</h4>
            </div>

            <div className="rounded-md border border-blue-500/30 bg-blue-500/5 p-3 space-y-1.5">
              <div className="flex items-start gap-2">
                <CreditCard className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                <div className="text-xs text-foreground/90">
                  {hasStripeSubInDb ? (
                    <>
                      <strong className="text-blue-300">Subscription Stripe</strong> · <code className="text-[10px] font-mono">{stripeSubId}</code>
                    </>
                  ) : (
                    <>
                      <strong className="text-blue-300">Vente Systeme.io</strong> · order <code className="text-[10px] font-mono">#{systemeIoOrderId}</code>
                      <span className="text-muted-foreground ml-1">(géré par Stripe en backend)</span>
                    </>
                  )}
                  <p className="mt-1 text-foreground/70">
                    La subscription Stripe sera <strong>automatiquement annulée</strong> au moment où tu confirmeras le nouveau plan ci-dessous.
                    Aucune action manuelle requise de ton côté
                    {!hasStripeSubInDb && " (l'annulation passe par l'API Stripe via lookup email, indépendamment de Systeme.io)"}.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* ── ÉTAPE 2 : Définir le nouveau plan ───────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">{needsStopStep ? "2" : "1"}</div>
            <h4 className="text-sm font-semibold text-foreground">Définir le nouveau plan de paiement</h4>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="target-amount" className="text-xs">Nouveau montant mensuel (€)</Label>
              <Input
                id="target-amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="ex : 150"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Date de la 1ère nouvelle échéance</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full h-9 justify-start text-xs">
                    <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                    {format(startDate, "dd MMMM yyyy", { locale: fr })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(d) => d && setStartDate(d)}
                    locale={fr}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Aperçu du nouveau plan */}
          {plan.payments.length > 0 && (
            <div className="rounded-md border border-border/50 bg-secondary/30 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <ArrowRight className="h-3.5 w-3.5 text-primary" />
                  Nouveau plan : {plan.payments.length} mensualité{plan.payments.length > 1 ? "s" : ""}
                </div>
                <Badge variant="outline" className={`text-[10px] ${totalsMatch ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-red-500/15 text-red-300 border-red-500/30"}`}>
                  {totalsMatch ? <><CheckCircle2 className="h-3 w-3 mr-1 inline" /> Total exact</> : "Écart de calcul"}
                </Badge>
              </div>

              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {plan.payments.map((p, i) => {
                  const newNumber = paidCount + i + 1;
                  const newTotal = paidCount + plan.payments.length;
                  const isAdjustment = i === plan.payments.length - 1 && p.amount !== parseFloat(targetAmount.replace(",", "."));
                  return (
                    <div key={i} className="flex items-center justify-between text-xs px-2 py-1.5 rounded bg-card/50">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground tabular-nums w-12 shrink-0">M{newNumber}/{newTotal}</span>
                        <span className="text-foreground/70">{format(new Date(p.due_date), "dd/MM/yyyy")}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold tabular-nums ${isAdjustment ? "text-amber-300" : "text-foreground"}`}>
                          {p.amount.toFixed(2)} €
                        </span>
                        {isAdjustment && (
                          <Badge variant="outline" className="text-[9px] bg-amber-500/15 text-amber-300 border-amber-500/30">
                            ajustement
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
                <span className="text-muted-foreground">Somme du nouveau plan</span>
                <span className="font-bold text-foreground tabular-nums">
                  {planTotalRounded.toLocaleString("fr-FR")} €
                </span>
              </div>
              {!totalsMatch && (
                <div className="text-[11px] text-red-400">
                  Écart : {(remainingRounded - planTotalRounded).toFixed(2)} € — vérifie le montant cible.
                </div>
              )}

              {plan.warnings.map((w, i) => (
                <div key={i} className="text-[11px] text-amber-300 flex items-start gap-1.5">
                  <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}

          {/* État vide */}
          {plan.payments.length === 0 && targetAmount && (
            <div className="text-xs text-muted-foreground italic">
              Saisis un montant valide pour voir l'aperçu du plan.
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="gap-2"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Replanifier {plan.payments.length > 0 ? `(${plan.payments.length} mensualité${plan.payments.length > 1 ? "s" : ""})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
