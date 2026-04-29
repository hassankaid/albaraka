// Modale "Toutes les mensualités" — ouverte depuis Payments.tsx (CEO uniquement).
//
// Vue détaillée d'une vente :
//   - Liste de toutes les mensualités triées par due_date
//   - Édition inline de chaque ligne (date d'échéance + montant)
//   - Suppression d'une mensualité (sauf si status='paid')
//   - Ajout d'une nouvelle mensualité
//   - Recalcul auto : redistribuer le restant en N mensualités
//   - Totaux : total vente / payé / restant
//   - Bandeau warning si la vente est gérée par Stripe (subscription)
//
// Toutes les modifs passent par les RPC SECURITY DEFINER (cascade commissions
// + audit log automatique côté DB).

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarIcon, Plus, Trash2, RefreshCw, AlertTriangle, Loader2, Save, X } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { formatDateOnly } from "@/lib/formatDate";
import { toast } from "@/hooks/use-toast";
import {
  useUpdatePaymentAdmin,
  useDeletePaymentAdmin,
  useAddPaymentAdmin,
  useRecalculatePayments,
} from "@/hooks/usePaymentAdmin";

interface SchedulePayment {
  id: string;
  payment_number: number;
  total_payments: number;
  amount: number;
  due_date: string;
  paid_at: string | null;
  status: string;
  notes: string | null;
  stripe_payment_intent_id: string | null;
  stripe_invoice_id: string | null;
}

interface ScheduleData {
  sale_id: string;
  total_amount_ht: number;
  stripe_subscription_id: string | null;
  payments: SchedulePayment[];
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  paid: { label: "Payé", className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  pending: { label: "En attente", className: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" },
  late: { label: "En retard", className: "bg-red-500/20 text-red-300 border-red-500/30" },
  lost: { label: "Perdu", className: "bg-zinc-700/50 text-zinc-400 border-zinc-600/30" },
  cancelled: { label: "Annulé", className: "bg-zinc-700/50 text-zinc-400 border-zinc-600/30" },
};

interface Props {
  open: boolean;
  onClose: () => void;
  saleId: string | null;
  contactName?: string | null;
}

export default function PaymentScheduleModal({ open, onClose, saleId, contactName }: Props) {
  const update = useUpdatePaymentAdmin();
  const del = useDeletePaymentAdmin();
  const add = useAddPaymentAdmin();
  const recalc = useRecalculatePayments();

  const [confirmDelete, setConfirmDelete] = useState<SchedulePayment | null>(null);
  const [confirmRecalc, setConfirmRecalc] = useState<{ count: number } | null>(null);
  const [recalcCount, setRecalcCount] = useState<number>(2);
  const [addingRow, setAddingRow] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["schedule", saleId],
    enabled: !!saleId && open,
    queryFn: async (): Promise<ScheduleData> => {
      const { data: sale, error: sErr } = await (supabase as any)
        .from("sales")
        .select("id, amount_ht")
        .eq("id", saleId)
        .single();
      if (sErr) throw sErr;

      const { data: pays, error: pErr } = await (supabase as any)
        .from("payments")
        .select(
          "id, payment_number, total_payments, amount, due_date, paid_at, status, notes, stripe_payment_intent_id, stripe_invoice_id, stripe_subscription_id",
        )
        .eq("sale_id", saleId)
        .order("due_date", { ascending: true });
      if (pErr) throw pErr;

      const subId = (pays ?? []).find((p: any) => p.stripe_subscription_id)?.stripe_subscription_id ?? null;

      return {
        sale_id: saleId!,
        total_amount_ht: Number(sale?.amount_ht ?? 0),
        stripe_subscription_id: subId,
        payments: (pays ?? []).map((p: any) => ({
          ...p,
          amount: Number(p.amount),
        })),
      };
    },
  });

  const totals = useMemo(() => {
    const all = data?.payments ?? [];
    const paid = all.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
    const pendingLate = all
      .filter((p) => p.status === "pending" || p.status === "late")
      .reduce((s, p) => s + p.amount, 0);
    const lost = all
      .filter((p) => p.status === "lost" || p.status === "cancelled")
      .reduce((s, p) => s + p.amount, 0);
    const totalPlanned = paid + pendingLate + lost;
    const remaining = (data?.total_amount_ht ?? 0) - paid;
    return { paid, pendingLate, lost, totalPlanned, remaining };
  }, [data]);

  // ─── Handlers ─────────────────────────────────────────────────────────
  async function handleUpdate(p: SchedulePayment, patch: Partial<{ due_date: string; amount: number }>) {
    try {
      await update.mutateAsync({
        payment_id: p.id,
        due_date: patch.due_date ?? null,
        amount: patch.amount ?? null,
      });
      toast({ title: "Mensualité mise à jour" });
      refetch();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  }

  async function handleDelete(p: SchedulePayment) {
    try {
      await del.mutateAsync(p.id);
      toast({ title: "Mensualité supprimée" });
      setConfirmDelete(null);
      refetch();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  }

  async function handleAdd(due_date: string, amount: number) {
    if (!saleId) return;
    try {
      await add.mutateAsync({ sale_id: saleId, due_date, amount });
      toast({ title: "Nouvelle mensualité ajoutée" });
      setAddingRow(false);
      refetch();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  }

  async function handleRecalc(count: number) {
    if (!saleId) return;
    try {
      await recalc.mutateAsync({ sale_id: saleId, new_count: count });
      toast({ title: `Plan recalculé en ${count} mensualités` });
      setConfirmRecalc(null);
      refetch();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  }

  if (!open) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-4xl max-h-[88vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Mensualités — {contactName ?? "Vente"}
              {data?.stripe_subscription_id && (
                <Badge variant="outline" className="text-[10px] bg-blue-500/10 border-blue-500/30 text-blue-300 ml-2">
                  Stripe sub
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Total vente : <strong>{(data?.total_amount_ht ?? 0).toLocaleString("fr-FR")} €</strong>
              {" · "}Payé : <strong className="text-emerald-400">{totals.paid.toLocaleString("fr-FR")} €</strong>
              {" · "}En attente : <strong className="text-yellow-400">{totals.pendingLate.toLocaleString("fr-FR")} €</strong>
              {totals.lost > 0 && (
                <>
                  {" · "}Perdu : <strong className="text-zinc-400">{totals.lost.toLocaleString("fr-FR")} €</strong>
                </>
              )}
              {" · "}Restant à planifier : <strong>{totals.remaining.toLocaleString("fr-FR")} €</strong>
            </DialogDescription>
          </DialogHeader>

          {/* Stripe warning */}
          {data?.stripe_subscription_id && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-blue-500/5 border border-blue-500/20 text-xs">
              <AlertTriangle className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
              <div className="text-foreground/80 leading-relaxed">
                Cette vente est gérée par <strong>Stripe</strong> ({data.stripe_subscription_id.slice(0, 18)}…).
                Les modifications de date d'échéance et de montant sur les mensualités <strong>futures</strong> ne sont
                <strong> pas synchronisées avec Stripe</strong>. Stripe continue à prélever selon son plan d'origine.
                Modifie les mensualités directement sur le dashboard Stripe si tu veux changer les prélèvements à venir.
              </div>
            </div>
          )}

          {/* Toolbar */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => setAddingRow(true)} className="gap-2">
              <Plus className="h-3.5 w-3.5" />
              Ajouter une mensualité
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Recalculer le restant en :</span>
              <Input
                type="number"
                min={1}
                max={24}
                value={recalcCount}
                onChange={(e) => setRecalcCount(Math.max(1, Math.min(24, Number(e.target.value) || 1)))}
                className="w-16 h-8 text-xs text-center"
              />
              <span className="text-xs text-muted-foreground">mensualités</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirmRecalc({ count: recalcCount })}
                disabled={totals.remaining <= 0 || recalc.isPending}
                className="gap-2"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${recalc.isPending ? "animate-spin" : ""}`} />
                Recalculer
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-auto flex-1 -mx-6 px-6">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">N°</TableHead>
                    <TableHead>Échéance</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Payé le</TableHead>
                    <TableHead className="w-[80px] text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.payments ?? []).map((p) => (
                    <ScheduleRow
                      key={p.id}
                      p={p}
                      onUpdate={handleUpdate}
                      onAskDelete={() => setConfirmDelete(p)}
                    />
                  ))}
                  {addingRow && (
                    <NewRow
                      onCancel={() => setAddingRow(false)}
                      onSave={handleAdd}
                      saving={add.isPending}
                    />
                  )}
                </TableBody>
              </Table>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={onClose}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <Dialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Supprimer cette mensualité ?</DialogTitle>
            <DialogDescription>
              Mensualité <strong>{confirmDelete?.payment_number}/{confirmDelete?.total_payments}</strong> du{" "}
              <strong>{confirmDelete?.due_date && formatDateOnly(confirmDelete.due_date)}</strong> —{" "}
              <strong>{confirmDelete?.amount.toLocaleString("fr-FR")} €</strong>.
              <br />
              Les commissions associées seront aussi supprimées. Les autres mensualités seront renumérotées.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Annuler</Button>
            <Button
              variant="destructive"
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
              disabled={del.isPending}
            >
              {del.isPending && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm recalc */}
      <Dialog open={!!confirmRecalc} onOpenChange={(v) => !v && setConfirmRecalc(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Recalculer le plan ?</DialogTitle>
            <DialogDescription>
              Toutes les mensualités <strong>non payées</strong> de cette vente seront <strong>supprimées</strong>{" "}
              (avec leurs commissions), puis remplacées par <strong>{confirmRecalc?.count} nouvelles mensualités</strong>{" "}
              de <strong>
                {confirmRecalc?.count
                  ? Math.round((totals.remaining / confirmRecalc.count) * 100) / 100
                  : 0}{" "}€
              </strong> chacune (réparties sur les {confirmRecalc?.count} mois suivants la dernière mensualité payée).
              <br /><br />
              <strong>Les mensualités déjà payées sont conservées intactes.</strong>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmRecalc(null)}>Annuler</Button>
            <Button
              onClick={() => confirmRecalc && handleRecalc(confirmRecalc.count)}
              disabled={recalc.isPending}
            >
              {recalc.isPending && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
              Recalculer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Row éditable ─────────────────────────────────────────────────────
function ScheduleRow({
  p,
  onUpdate,
  onAskDelete,
}: {
  p: SchedulePayment;
  onUpdate: (p: SchedulePayment, patch: Partial<{ due_date: string; amount: number }>) => Promise<void>;
  onAskDelete: () => void;
}) {
  const [editingDate, setEditingDate] = useState(false);
  const [editingAmount, setEditingAmount] = useState(false);
  const [amountValue, setAmountValue] = useState<string>(String(p.amount));
  const isPaid = p.status === "paid";
  const status = STATUS_BADGE[p.status] ?? { label: p.status, className: "bg-muted text-muted-foreground" };

  return (
    <TableRow className={isPaid ? "opacity-60" : ""}>
      <TableCell className="text-xs font-medium">
        {p.payment_number}/{p.total_payments}
      </TableCell>
      <TableCell>
        {isPaid ? (
          <span className="text-xs">{formatDateOnly(p.due_date)}</span>
        ) : (
          <Popover open={editingDate} onOpenChange={setEditingDate}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs gap-1.5 hover:bg-secondary">
                <CalendarIcon className="h-3 w-3 opacity-50" />
                {formatDateOnly(p.due_date)}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={new Date(p.due_date)}
                onSelect={(d) => {
                  if (d) {
                    onUpdate(p, { due_date: format(d, "yyyy-MM-dd") });
                    setEditingDate(false);
                  }
                }}
                locale={fr}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        )}
      </TableCell>
      <TableCell>
        {isPaid ? (
          <span className="text-sm font-semibold">{p.amount.toLocaleString("fr-FR")} €</span>
        ) : editingAmount ? (
          <div className="flex items-center gap-1">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={amountValue}
              onChange={(e) => setAmountValue(e.target.value)}
              className="h-7 w-24 text-xs"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const n = Number(amountValue);
                  if (n > 0 && n !== p.amount) onUpdate(p, { amount: n });
                  setEditingAmount(false);
                } else if (e.key === "Escape") {
                  setAmountValue(String(p.amount));
                  setEditingAmount(false);
                }
              }}
            />
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => {
                const n = Number(amountValue);
                if (n > 0 && n !== p.amount) onUpdate(p, { amount: n });
                setEditingAmount(false);
              }}
            >
              <Save className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => { setAmountValue(String(p.amount)); setEditingAmount(false); }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-auto px-2 py-1 text-sm font-semibold hover:bg-secondary"
            onClick={() => { setAmountValue(String(p.amount)); setEditingAmount(true); }}
          >
            {p.amount.toLocaleString("fr-FR")} €
          </Button>
        )}
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={`text-[10px] ${status.className}`}>
          {status.label}
        </Badge>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {p.paid_at ? formatDateOnly(p.paid_at) : "—"}
      </TableCell>
      <TableCell className="text-right">
        {!isPaid && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
            onClick={onAskDelete}
            title="Supprimer cette mensualité"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

// ─── Row d'ajout ──────────────────────────────────────────────────────
function NewRow({
  onCancel,
  onSave,
  saving,
}: {
  onCancel: () => void;
  onSave: (due_date: string, amount: number) => Promise<void>;
  saving: boolean;
}) {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [amount, setAmount] = useState<string>("");
  const canSave = !!date && Number(amount) > 0;

  return (
    <TableRow className="bg-emerald-500/5 border-emerald-500/20">
      <TableCell className="text-xs text-emerald-400 font-medium">+</TableCell>
      <TableCell>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1.5">
              <CalendarIcon className="h-3 w-3" />
              {date ? format(date, "dd/MM/yyyy") : "Date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={date} onSelect={setDate} locale={fr} initialFocus />
          </PopoverContent>
        </Popover>
      </TableCell>
      <TableCell>
        <Input
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="h-7 w-24 text-xs"
        />
      </TableCell>
      <TableCell colSpan={2}>
        <Badge variant="outline" className="text-[10px] bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
          En attente
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-emerald-400"
            disabled={!canSave || saving}
            onClick={() => date && onSave(format(date, "yyyy-MM-dd"), Number(amount))}
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onCancel}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
