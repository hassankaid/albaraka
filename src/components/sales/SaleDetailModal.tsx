import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Check, RefreshCw } from "lucide-react";
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
  if (status === "cancelled") return { label: "Annulé", className: "bg-muted text-muted-foreground border-border" };
  if (status === "pending" && due < today) return { label: "En retard", className: "bg-red-500/20 text-red-300 border-red-500/30" };
  return { label: "En attente", className: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" };
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
    if (open && saleId) fetchPayments();
  }, [open, saleId, fetchPayments]);

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

  const totalPaid = payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const totalPending = payments.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{saleProduct} — {contactName || "—"}</DialogTitle>
          <DialogDescription>
            Montant HT : {saleAmountHt.toLocaleString("fr-FR")} € · Encaissé : {totalPaid.toLocaleString("fr-FR")} € · Restant : {totalPending.toLocaleString("fr-FR")} €
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Échéancier</h4>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : payments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Aucun paiement enregistré pour cette vente.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>N°</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Échéance</TableHead>
                  <TableHead>Payé le</TableHead>
                  <TableHead>Statut</TableHead>
                  {isCeo && <TableHead>Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => {
                  const statusInfo = getPaymentStatusInfo(p.status, p.due_date);
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
                        {isCeo && p.paid_at ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-auto p-0 font-normal text-muted-foreground hover:text-foreground">
                                {formatDateOnly(p.paid_at, userTz)}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={new Date(p.paid_at)}
                                onSelect={(date) => { if (date) markAsPaid(p.id, date); }}
                                locale={fr}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        ) : (
                          p.paid_at ? formatDateOnly(p.paid_at, userTz) : "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${statusInfo.className}`}>
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      {isCeo && (
                        <TableCell>
                          {p.status === "pending" && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Check className="h-4 w-4 mr-1" /> Payé
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="end">
                                <Calendar
                                  mode="single"
                                  selected={new Date()}
                                  onSelect={(date) => { if (date) markAsPaid(p.id, date); }}
                                  locale={fr}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
