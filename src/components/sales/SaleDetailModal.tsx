import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Check, RefreshCw, Trash2, Plus, CalendarIcon, Pencil, X, Save } from "lucide-react";
import { formatDateOnly } from "@/lib/formatDate";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Payment {
  id: string;
  payment_number: number;
  total_payments: number;
  amount: number;
  due_date: string;
  paid_at: string | null;
  status: string;
  payment_method: string | null;
}

interface SaleDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string | null;
  saleProduct: string;
  saleAmountHt: number;
  contactName: string;
  onUpdated: () => void;
}

const getPaymentStatusInfo = (status: string, dueDate: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  if (status === "paid") return { label: "Payé", className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" };
  if (status === "cancelled" || status === "lost") return { label: "Perdu", className: "bg-red-500/20 text-red-300 border-red-500/30 line-through" };
  if (status === "late" || (status === "pending" && due < today)) return { label: "En retard", className: "bg-orange-500/20 text-orange-300 border-orange-500/30" };
  return { label: "En attente", className: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" };
};

const METHOD_LABELS: Record<string, string> = {
  virement: "Virement",
  carte: "Carte",
  especes: "Espèces",
  cheque: "Chèque",
};

export default function SaleDetailModal({
  open, onOpenChange, saleId, saleProduct, saleAmountHt, contactName, onUpdated,
}: SaleDetailModalProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const isCeo = profile?.role === "ceo";
  const userTz = profile?.timezone || "Europe/Paris";

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Payment>>({});
  const [addingNew, setAddingNew] = useState(false);
  const [newPayment, setNewPayment] = useState({ amount: "", dueDate: new Date(), status: "pending", paymentMethod: "" });

  const fetchPayments = useCallback(async () => {
    if (!saleId) return;
    setLoading(true);
    const { data } = await supabase
      .from("payments")
      .select("id, payment_number, total_payments, amount, due_date, paid_at, status, payment_method")
      .eq("sale_id", saleId)
      .order("payment_number", { ascending: true });
    setPayments(data || []);
    setLoading(false);
  }, [saleId]);

  useEffect(() => {
    if (open && saleId) {
      fetchPayments();
      setEditingId(null);
      setAddingNew(false);
    }
  }, [open, saleId, fetchPayments]);

  // --- MARK AS PAID ---
  const markAsPaid = async (paymentId: string, paidDate: Date) => {
    const dateStr = format(paidDate, "yyyy-MM-dd");
    const { error } = await supabase
      .from("payments")
      .update({ status: "paid", paid_at: dateStr })
      .eq("id", paymentId);
    if (error) {
      toast({ title: "Erreur", variant: "destructive" });
    } else {
      toast({ title: "Paiement marqué comme payé" });
      fetchPayments();
      onUpdated();
    }
  };

  // --- DELETE PAYMENT ---
  const deletePayment = async (paymentId: string) => {
    // Delete linked invoice_lines first to avoid FK constraint errors
    const { error: ilError } = await supabase.from("invoice_lines").delete().eq("payment_id", paymentId);
    if (ilError) {
      toast({ title: "Erreur de suppression", description: ilError.message, variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("payments").delete().eq("id", paymentId);
    if (error) {
      toast({ title: "Erreur de suppression", description: error.message, variant: "destructive" });
    } else {
      // Update total_payments on remaining payments
      if (saleId) {
        const { data: remaining } = await supabase.from("payments").select("id").eq("sale_id", saleId);
        const newTotal = remaining?.length || 0;
        if (newTotal > 0) {
          await supabase.from("payments").update({ total_payments: newTotal }).eq("sale_id", saleId);
        }
      }
      toast({ title: "Paiement supprimé" });
      fetchPayments();
      onUpdated();
    }
  };

  // --- START EDIT ---
  const startEdit = (p: Payment) => {
    setEditingId(p.id);
    setEditData({
      amount: p.amount,
      due_date: p.due_date,
      paid_at: p.paid_at,
      status: p.status,
      payment_method: p.payment_method,
    });
  };

  // --- SAVE EDIT ---
  const saveEdit = async () => {
    if (!editingId) return;
    const { error } = await supabase
      .from("payments")
      .update({
        amount: editData.amount,
        due_date: editData.due_date,
        paid_at: editData.paid_at || null,
        status: editData.status,
        payment_method: editData.payment_method || null,
      })
      .eq("id", editingId);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Paiement modifié" });
      setEditingId(null);
      fetchPayments();
      onUpdated();
    }
  };

  // --- ADD PAYMENT ---
  const addPayment = async () => {
    if (!saleId || !newPayment.amount || parseFloat(newPayment.amount) <= 0) {
      toast({ title: "Montant invalide", variant: "destructive" });
      return;
    }
    const maxNum = payments.length > 0 ? Math.max(...payments.map((p) => p.payment_number)) : 0;
    const newTotal = payments.length + 1;

    const { error } = await supabase.from("payments").insert({
      sale_id: saleId,
      amount: parseFloat(newPayment.amount),
      due_date: format(newPayment.dueDate, "yyyy-MM-dd"),
      status: newPayment.status,
      payment_method: newPayment.paymentMethod || null,
      payment_number: maxNum + 1,
      total_payments: newTotal,
    });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      // Update total_payments on all payments for this sale
      await supabase
        .from("payments")
        .update({ total_payments: newTotal })
        .eq("sale_id", saleId);
      toast({ title: "Paiement ajouté" });
      setAddingNew(false);
      setNewPayment({ amount: "", dueDate: new Date(), status: "pending", paymentMethod: "" });
      fetchPayments();
      onUpdated();
    }
  };

  const totalPaid = payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const totalPending = payments.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{saleProduct} — {contactName || "—"}</DialogTitle>
          <DialogDescription>
            Montant HT : {saleAmountHt.toLocaleString("fr-FR")} € · Encaissé : {totalPaid.toLocaleString("fr-FR")} € · Restant : {totalPending.toLocaleString("fr-FR")} €
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">Échéancier</h4>
            {isCeo && (
              <Button variant="outline" size="sm" onClick={() => setAddingNew(true)} disabled={addingNew}>
                <Plus className="h-4 w-4 mr-1" /> Ajouter
              </Button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : payments.length === 0 && !addingNew ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Aucun paiement enregistré pour cette vente.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>N°</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Échéance</TableHead>
                  <TableHead>Payé le</TableHead>
                  <TableHead>Méthode</TableHead>
                  <TableHead>Statut</TableHead>
                  {isCeo && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => {
                  const isEditing = editingId === p.id;
                  const statusInfo = getPaymentStatusInfo(p.status, p.due_date);

                  if (isEditing && isCeo) {
                    return (
                      <TableRow key={p.id} className="border-border bg-secondary/30">
                        <TableCell className="font-medium text-foreground">
                          {p.payment_number}/{p.total_payments}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="w-24 h-8 text-sm"
                            value={editData.amount ?? ""}
                            onChange={(e) => setEditData({ ...editData, amount: parseFloat(e.target.value) || 0 })}
                          />
                        </TableCell>
                        <TableCell>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="h-8 text-xs">
                                <CalendarIcon className="h-3 w-3 mr-1" />
                                {editData.due_date ? format(new Date(editData.due_date), "dd/MM/yy") : "—"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={editData.due_date ? new Date(editData.due_date) : undefined}
                                onSelect={(d) => d && setEditData({ ...editData, due_date: format(d, "yyyy-MM-dd") })}
                                locale={fr}
                                initialFocus
                                className="pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                        </TableCell>
                        <TableCell>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="h-8 text-xs">
                                <CalendarIcon className="h-3 w-3 mr-1" />
                                {editData.paid_at ? format(new Date(editData.paid_at), "dd/MM/yy") : "—"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={editData.paid_at ? new Date(editData.paid_at) : undefined}
                                onSelect={(d) => setEditData({ ...editData, paid_at: d ? format(d, "yyyy-MM-dd") : null })}
                                locale={fr}
                                initialFocus
                                className="pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                        </TableCell>
                        <TableCell>
                          <Select value={editData.payment_method || "none"} onValueChange={(v) => setEditData({ ...editData, payment_method: v === "none" ? null : v })}>
                            <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">—</SelectItem>
                              <SelectItem value="virement">Virement</SelectItem>
                              <SelectItem value="carte">Carte</SelectItem>
                              <SelectItem value="especes">Espèces</SelectItem>
                              <SelectItem value="cheque">Chèque</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select value={editData.status || "pending"} onValueChange={(v) => setEditData({ ...editData, status: v })}>
                            <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">En attente</SelectItem>
                              <SelectItem value="paid">Payé</SelectItem>
                              <SelectItem value="cancelled">Annulé</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={saveEdit}>
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  }

                  return (
                    <TableRow key={p.id} className="border-border">
                      <TableCell className="font-medium text-foreground">
                        {p.payment_number}/{p.total_payments}
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">
                        {p.amount.toLocaleString("fr-FR")} €
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDateOnly(p.due_date, userTz)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {p.paid_at ? formatDateOnly(p.paid_at, userTz) : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {p.payment_method ? (METHOD_LABELS[p.payment_method] || p.payment_method) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${statusInfo.className}`}>
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      {isCeo && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {p.status === "pending" && (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="ghost" size="sm" title="Marquer payé">
                                    <Check className="h-4 w-4" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="end">
                                  <Calendar
                                    mode="single"
                                    selected={new Date()}
                                    onSelect={(date) => { if (date) markAsPaid(p.id, date); }}
                                    locale={fr}
                                    initialFocus
                                    className="pointer-events-auto"
                                  />
                                </PopoverContent>
                              </Popover>
                            )}
                            <Button variant="ghost" size="sm" title="Modifier" onClick={() => startEdit(p)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" title="Supprimer">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Supprimer ce paiement ?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Paiement {p.payment_number}/{p.total_payments} de {p.amount.toLocaleString("fr-FR")} €. Cette action est irréversible.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deletePayment(p.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    Supprimer
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}

                {/* ADD NEW ROW */}
                {addingNew && isCeo && (
                  <TableRow className="border-border bg-secondary/30">
                    <TableCell className="font-medium text-muted-foreground">Nouveau</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        placeholder="0"
                        className="w-24 h-8 text-sm"
                        value={newPayment.amount}
                        onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 text-xs">
                            <CalendarIcon className="h-3 w-3 mr-1" />
                            {format(newPayment.dueDate, "dd/MM/yy")}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={newPayment.dueDate}
                            onSelect={(d) => d && setNewPayment({ ...newPayment, dueDate: d })}
                            locale={fr}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">—</TableCell>
                    <TableCell>
                      <Select value={newPayment.paymentMethod || "none"} onValueChange={(v) => setNewPayment({ ...newPayment, paymentMethod: v === "none" ? "" : v })}>
                        <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          <SelectItem value="virement">Virement</SelectItem>
                          <SelectItem value="carte">Carte</SelectItem>
                          <SelectItem value="especes">Espèces</SelectItem>
                          <SelectItem value="cheque">Chèque</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={newPayment.status} onValueChange={(v) => setNewPayment({ ...newPayment, status: v })}>
                        <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">En attente</SelectItem>
                          <SelectItem value="paid">Payé</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={addPayment}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setAddingNew(false)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
