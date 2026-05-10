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
  CreditCard, Link2, Copy, Mail, MessageCircle, ExternalLink, Sparkles,
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
// Approche : N mensualités égales (montant baseCents). On regroupe TOUT le reste
// de la division (extraCents, max N-1 cents) sur la 1re mensualité — le client
// paie un peu plus aujourd'hui et toutes les suivantes sont identiques.
//
// Pourquoi sur la 1re et pas distribué : ça permet à Stripe Subscription de
// facturer un prix unitaire récurrent FIXE (= baseCents) + un ajustement
// one-shot (= extraCents) sur la 1re facture, pour un match au centime près
// avec la BDD. Distribuer les centimes (1 ou 2 mensualités à +1 cent au milieu)
// rendrait impossible un alignement Stripe ↔ BDD parfait.
//
// Exemple : 1666.66 € / 11 → baseCents=15151, extraCents=5
//   → 1re mensualité 151,56 € + 10 mensualités 151,51 € (somme = 1666,66 €)
function computeNewPlan(remaining: number, count: number, startDate: Date): {
  payments: { amount: number; due_date: string }[];
  warnings: string[];
} {
  const warnings: string[] = [];
  if (!Number.isInteger(count) || count <= 0) return { payments: [], warnings: ["Nombre de mensualités invalide"] };
  if (remaining <= 0) return { payments: [], warnings: ["Aucun montant restant à étaler"] };

  const totalCents = Math.round(remaining * 100);
  const baseCents = Math.floor(totalCents / count);
  const extraCents = totalCents - baseCents * count; // 0 à count-1

  if (baseCents === 0) {
    warnings.push(`Trop de mensualités (${count}) pour le montant restant (${remaining.toFixed(2)} €). Réduis le nombre.`);
    return { payments: [], warnings };
  }

  const payments: { amount: number; due_date: string }[] = [];
  for (let i = 0; i < count; i++) {
    // Tous les extras sur la 1re mensualité, le reste à baseCents fixe.
    const cents = i === 0 ? baseCents + extraCents : baseCents;
    payments.push({
      amount: cents / 100,
      due_date: format(addMonths(startDate, i), "yyyy-MM-dd"),
    });
  }

  return { payments, warnings };
}

// Pour l'affichage : groupe les paiements par montant identique consécutifs
function groupConsecutiveByAmount(
  payments: { amount: number; due_date: string }[]
): { amount: number; count: number }[] {
  const groups: { amount: number; count: number }[] = [];
  for (const p of payments) {
    const last = groups[groups.length - 1];
    if (last && last.amount === p.amount) last.count++;
    else groups.push({ amount: p.amount, count: 1 });
  }
  return groups;
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
  const [count, setCount] = useState<string>("");
  const [startDate, setStartDate] = useState<Date>(() => {
    const firstPending = [...pendingPayments].sort(
      (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    )[0];
    return firstPending ? new Date(firstPending.due_date) : addMonths(new Date(), 1);
  });
  const [saving, setSaving] = useState(false);

  // ── Étape 3 : Lien de re-paiement client ──
  type SuccessInfo = {
    rebillUrl: string;
    rebillToken: string;
    installments: number;
    todayCharge: number;
    monthlyAmount: number | null;
    payableTotal: number;
  };
  const [successInfo, setSuccessInfo] = useState<SuccessInfo | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [copied, setCopied] = useState(false);

  // ── Reset à l'ouverture ──
  useEffect(() => {
    if (open) {
      // Pré-remplit avec le nombre de pending actuels (utile : par défaut on garde le même nombre)
      setCount(pendingPayments.length > 0 ? String(pendingPayments.length) : "");
      const firstPending = [...pendingPayments].sort(
        (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      )[0];
      setStartDate(firstPending ? new Date(firstPending.due_date) : addMonths(new Date(), 1));
      // reset success state
      setSuccessInfo(null);
      setCopied(false);
    }
  }, [open, pendingPayments]);

  // ── Plan calculé ──
  const plan = useMemo(() => {
    const n = parseInt(count, 10);
    if (isNaN(n) || n <= 0) return { payments: [], warnings: [] };
    return computeNewPlan(remaining, n, startDate);
  }, [count, startDate, remaining]);

  // Aperçu groupé : "5 × 151,52 € + 6 × 151,51 €"
  const planGroups = useMemo(() => groupConsecutiveByAmount(plan.payments), [plan.payments]);

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
      // Récupère le contact_id de la vente — sera réutilisé sur tous les
      // nouveaux pending payments insérés ci-dessous, pour que /admin/payments
      // affiche correctement le nom/email/téléphone de l'acheteur (sans ce
      // rattachement explicite, payments.contact_id reste NULL et la jointure
      // côté UI ne trouve rien).
      const { data: saleRow, error: saleErr } = await supabase
        .from("sales")
        .select("contact_id")
        .eq("id", saleId)
        .single();
      if (saleErr || !saleRow?.contact_id) {
        throw new Error("Impossible de retrouver le contact lié à cette vente.");
      }
      const saleContactId = saleRow.contact_id;

      // ── ÉTAPE 1 : Stop des prélèvements auto ──
      // Stripe natif OU Systeme.io : l'edge function gère les 2 cas. Elle annule
      // la sub côté Stripe (avec fallback automatique par lookup email pour les
      // ventes Systeme.io qui n'ont pas de stripe_subscription_id en BDD), et
      // marque les pending comme 'lost'. Si pas de sub trouvée du tout (ex:
      // virement manuel pur), on continue : pas d'annulation à faire.
      //
      // Cas tolérés (la sub était déjà annulée précédemment ou jamais trouvée) :
      //   - no_pending_payments : tous les pending sont déjà 'lost' (re-replan)
      //   - no_subscription      : pas de sub côté Stripe ni Systeme.io
      // L'edge function renvoie ces cas en HTTP 4xx avec body JSON {error,message}.
      // supabase.functions.invoke met `error` (FunctionsHttpError) sur tout 4xx,
      // donc on lit le body via `error.context` (Response) pour extraire le code.
      if (needsStopStep) {
        const tolerableErrors = new Set(["no_pending_payments", "no_subscription"]);
        const { data: cancelData, error: cancelError } = await supabase.functions.invoke(
          "cancel-stripe-subscription",
          { body: { sale_id: saleId } }
        );

        let result: { ok?: boolean; error?: string; message?: string } | null = null;
        if (cancelError) {
          // Tente de récupérer le body JSON de la réponse 4xx
          const ctx = (cancelError as { context?: Response }).context;
          if (ctx && typeof ctx.json === "function") {
            try {
              result = await ctx.json();
            } catch {
              result = null;
            }
          }
          if (!result) {
            // Erreur réseau ou body non-JSON : on remonte l'erreur brute
            throw new Error(`Stripe : ${cancelError.message || "annulation échouée"}`);
          }
        } else {
          result = cancelData as { ok?: boolean; error?: string; message?: string };
        }

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
            contact_id: saleContactId,
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

      // 7. Génère (ou récupère) le rebill_token pour pouvoir transmettre un lien
      //    de re-paiement au client. L'edge function create-payment-intent
      //    s'appuie sur ce token pour reconstruire la subscription.
      setGeneratingLink(true);
      const { data: tokenData, error: tokenErr } = await supabase.rpc(
        "generate_rebill_token",
        { p_sale_id: saleId },
      );
      if (tokenErr || !tokenData) {
        // Le replan a réussi : on n'échoue PAS la transaction. On affiche un
        // toast d'erreur et on laisse le wizard ouvert avec un message
        // de fallback (le CEO pourra retenter via le bouton "Modifier le
        // plan" → le replan sera idempotent et générera le token).
        console.error("[rebill] generate_rebill_token failed", tokenErr);
        toast({
          title: "Plan replanifié ✓ (lien client à générer manuellement)",
          description:
            "Le plan est en place mais la génération du lien client a échoué. Réouvre le wizard pour réessayer.",
          variant: "destructive",
        });
        onOpenChange(false);
        onSuccess();
        return;
      }

      const rebillToken = String(tokenData);
      const rebillUrl = `${window.location.origin}/rebill/${rebillToken}`;

      // Calcule todayCharge et monthlyAmount pour l'affichage du panneau succès
      const firstAmount = plan.payments[0]?.amount ?? 0;
      const restAmounts = plan.payments.slice(1);
      const restAvg = restAmounts.length > 0
        ? Math.round((restAmounts.reduce((s, p) => s + p.amount, 0) / restAmounts.length) * 100) / 100
        : null;

      setSuccessInfo({
        rebillUrl,
        rebillToken,
        installments: plan.payments.length,
        todayCharge: firstAmount,
        monthlyAmount: restAvg,
        payableTotal: planTotalRounded,
      });

      toast({
        title: "Plan replanifié ✓",
        description: `${plan.payments.length} mensualité(s) — total ${planTotalRounded.toLocaleString("fr-FR")} €. Lien client prêt.`,
      });
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
      setGeneratingLink(false);
    }
  }

  // ── Helpers étape succès ──
  function handleCopyLink() {
    if (!successInfo) return;
    navigator.clipboard.writeText(successInfo.rebillUrl).then(
      () => {
        setCopied(true);
        toast({ title: "Lien copié", description: "Tu peux le coller dans WhatsApp, Telegram, SMS, email…" });
        setTimeout(() => setCopied(false), 2500);
      },
      () => {
        toast({
          title: "Copie impossible",
          description: "Sélectionne le lien manuellement et copie-le.",
          variant: "destructive",
        });
      }
    );
  }

  function handleEmailLink() {
    if (!successInfo) return;
    const subject = encodeURIComponent(
      `Lien de paiement ${saleProduct} — Solde restant`,
    );
    const body = encodeURIComponent(
      `Bonjour ${contactName},\n\n` +
        `Voici le lien sécurisé pour régler le solde de votre plan ${saleProduct} :\n\n` +
        `${successInfo.rebillUrl}\n\n` +
        `Solde total : ${successInfo.payableTotal.toLocaleString("fr-FR")} €` +
        (successInfo.installments > 1 && successInfo.monthlyAmount
          ? ` (${successInfo.installments} mensualités)`
          : "") +
        `.\n\n` +
        `Le paiement est sécurisé par Stripe (3D Secure).\n\n` +
        `Bien à vous,\nL'équipe AL BARAKA`,
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  }

  function handleWhatsAppLink() {
    if (!successInfo) return;
    const text = encodeURIComponent(
      `Bonjour ${contactName.split(" ")[0]} 👋\n\n` +
        `Voici votre lien de paiement sécurisé pour solder votre plan ${saleProduct} :\n\n` +
        `${successInfo.rebillUrl}\n\n` +
        `Total : ${successInfo.payableTotal.toLocaleString("fr-FR")} €` +
        (successInfo.installments > 1
          ? ` en ${successInfo.installments} mensualités`
          : ` en 1 fois`) +
        `.`,
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }

  // ── Vue succès : plan replanifié + lien rebill généré ──
  if (successInfo) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-400" />
              Plan replanifié — Lien client prêt
            </DialogTitle>
            <DialogDescription>
              Transmets ce lien à <strong>{contactName}</strong> pour qu'il puisse re-autoriser le paiement.
            </DialogDescription>
          </DialogHeader>

          {/* Récap du plan */}
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Solde à régler</span>
              <span className="font-bold text-emerald-300 tabular-nums">
                {successInfo.payableTotal.toLocaleString("fr-FR")} €
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Mensualités</span>
              <span className="font-medium text-foreground">
                {successInfo.installments === 1
                  ? "1 paiement (comptant)"
                  : `${successInfo.installments} mensualités`}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">À débiter aujourd'hui</span>
              <span className="font-medium text-foreground tabular-nums">
                {successInfo.todayCharge.toFixed(2).replace(".", ",")} €
              </span>
            </div>
            {successInfo.installments > 1 && successInfo.monthlyAmount && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Puis × {successInfo.installments - 1} mois</span>
                <span className="font-medium text-foreground tabular-nums">
                  {successInfo.monthlyAmount.toFixed(2).replace(".", ",")} €
                </span>
              </div>
            )}
          </div>

          {/* Lien à copier */}
          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5 text-primary" />
              Lien de paiement client
            </Label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={successInfo.rebillUrl}
                onClick={(e) => (e.currentTarget as HTMLInputElement).select()}
                className="text-xs font-mono h-9"
              />
              <Button
                size="sm"
                variant={copied ? "default" : "outline"}
                onClick={handleCopyLink}
                className="gap-1.5 shrink-0"
              >
                {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copié" : "Copier"}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Token <code className="font-mono">{successInfo.rebillToken}</code> — toujours valable, reflète le solde courant.
              Si tu refais une modification du plan, le même lien continue de fonctionner avec le nouveau solde.
            </p>
          </div>

          {/* Actions de partage */}
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" size="sm" onClick={handleEmailLink} className="gap-1.5 h-9 text-xs">
              <Mail className="h-3.5 w-3.5" />
              Email
            </Button>
            <Button variant="outline" size="sm" onClick={handleWhatsAppLink} className="gap-1.5 h-9 text-xs">
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(successInfo.rebillUrl, "_blank")}
              className="gap-1.5 h-9 text-xs"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Tester
            </Button>
          </div>

          <div className="rounded-md border border-blue-500/20 bg-blue-500/5 p-2.5 text-[11px] text-foreground/80">
            <strong className="text-blue-300">Étape suivante :</strong> dès que le client paiera via ce lien,
            la 1re mensualité sera marquée payée automatiquement et la nouvelle subscription Stripe sera attachée
            aux suivantes (relances mensuelles auto).
          </div>

          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
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
            <div className="text-[10px] text-muted-foreground">{pendingPayments.length} mensualité{pendingPayments.length > 1 ? "s" : ""} à reprogrammer</div>
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
              <Label htmlFor="count" className="text-xs">Nombre de mensualités</Label>
              <Input
                id="count"
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                placeholder="ex : 11"
                value={count}
                onChange={(e) => setCount(e.target.value)}
                className="h-9"
              />
              {plan.payments.length > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  Mensualités lissées : ~{(remainingRounded / plan.payments.length).toFixed(2)} € chacune
                </p>
              )}
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
              <p className="text-[10px] text-muted-foreground">
                Date estimée. Les vraies dates s'aligneront sur le jour où le client autorise sa carte via le lien.
              </p>
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

              {/* Résumé groupé : "5 × 151,52 € + 6 × 151,51 €" */}
              <div className="text-xs text-muted-foreground">
                {planGroups.map((g, i) => (
                  <span key={i}>
                    {i > 0 && " + "}
                    <span className="text-foreground font-medium">{g.count} × {g.amount.toFixed(2).replace(".", ",")} €</span>
                  </span>
                ))}
              </div>

              {/* Tableau détaillé */}
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {plan.payments.map((p, i) => {
                  const newNumber = paidCount + i + 1;
                  const newTotal = paidCount + plan.payments.length;
                  return (
                    <div key={i} className="flex items-center justify-between text-xs px-2 py-1.5 rounded bg-card/50">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground tabular-nums w-12 shrink-0">M{newNumber}/{newTotal}</span>
                        <span className="text-foreground/70">{format(new Date(p.due_date), "dd/MM/yyyy")}</span>
                      </div>
                      <span className="font-semibold tabular-nums text-foreground">
                        {p.amount.toFixed(2)} €
                      </span>
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
          {plan.payments.length === 0 && count && (
            <div className="text-xs text-muted-foreground italic">
              Saisis un nombre de mensualités valide pour voir l'aperçu du plan.
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
            {generatingLink
              ? "Génération du lien…"
              : `Replanifier${plan.payments.length > 0 ? ` (${plan.payments.length} mensualité${plan.payments.length > 1 ? "s" : ""})` : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
