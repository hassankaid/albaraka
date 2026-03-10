import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";
import { formatDateOnly } from "@/lib/formatDate";

interface CommissionDetail {
  id: string;
  role: string;
  percentage: number;
  amount: number | null;
  status: string | null;
  payment_number: number;
  total_payments: number;
  payment_amount: number;
  payment_due_date: string;
  payment_paid_at: string | null;
  sale_product: string;
  sale_amount_ht: number;
  contact_name: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  beneficiaryUserId: string | null;
  beneficiaryName: string;
  periodEndDate: string; // ISO date string for filtering
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  due: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30",
  invoiced: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  paid: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  cancelled: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  due: "À payer",
  invoiced: "Facturée",
  paid: "Payée",
  cancelled: "Annulée",
};

const ROLE_LABELS: Record<string, string> = {
  apporteur: "Apporteur",
  setter: "Setter",
  closer: "Closer",
  agence_marketing: "Agence",
  collaborateur: "Collaborateur",
};

export default function CommissionDetailModal({ open, onOpenChange, beneficiaryUserId, beneficiaryName, periodEndDate }: Props) {
  const [loading, setLoading] = useState(false);
  const [commissions, setCommissions] = useState<CommissionDetail[]>([]);

  useEffect(() => {
    if (!open || !beneficiaryUserId) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("commissions")
        .select(`
          id, role, percentage, amount, status,
          payments!commissions_payment_id_fkey(payment_number, total_payments, amount, due_date, paid_at),
          sales!commissions_sale_id_fkey(
            product, amount_ht,
            contacts!sales_contact_id_fkey(full_name)
          )
        `)
        .eq("beneficiary_user_id", beneficiaryUserId)
        .eq("status", "due")
        .not("payment_id", "is", null);

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      const filtered = (data || [])
        .filter((c: any) => {
          const paidAt = c.payments?.paid_at;
          return paidAt && paidAt < periodEndDate;
        })
        .map((c: any) => ({
          id: c.id,
          role: c.role,
          percentage: c.percentage,
          amount: c.amount,
          status: c.status,
          payment_number: c.payments?.payment_number || 0,
          total_payments: c.payments?.total_payments || 0,
          payment_amount: c.payments?.amount || 0,
          payment_due_date: c.payments?.due_date || "",
          payment_paid_at: c.payments?.paid_at || null,
          sale_product: c.sales?.product || "—",
          sale_amount_ht: c.sales?.amount_ht || 0,
          contact_name: c.sales?.contacts?.full_name || null,
        }))
        .sort((a: CommissionDetail, b: CommissionDetail) => {
          const dateA = a.payment_due_date || "";
          const dateB = b.payment_due_date || "";
          return dateA.localeCompare(dateB);
        });

      setCommissions(filtered);
      setLoading(false);
    })();
  }, [open, beneficiaryUserId, periodEndDate]);

  const totalAmount = commissions.reduce((s, c) => s + (c.amount || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Commissions — {beneficiaryName}</DialogTitle>
          <DialogDescription>
            {commissions.length} commission{commissions.length > 1 ? "s" : ""} • Total : {totalAmount.toLocaleString("fr-FR")} €
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : commissions.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-16">Aucune commission trouvée.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Client</TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead className="text-center">Échéance</TableHead>
                  <TableHead className="text-center">Payé client</TableHead>
                  <TableHead className="text-right">Montant paiement</TableHead>
                  <TableHead className="text-center">%</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-foreground text-sm">{c.contact_name || "—"}</TableCell>
                    <TableCell className="text-sm">
                      <span>{c.sale_product}</span>
                      <span className="text-xs text-muted-foreground ml-1">
                        ({c.payment_number}/{c.total_payments})
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {ROLE_LABELS[c.role] || c.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground">
                      {c.payment_due_date ? formatDateOnly(c.payment_due_date, "Europe/Paris") : "—"}
                    </TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground">
                      {c.payment_paid_at ? formatDateOnly(c.payment_paid_at, "Europe/Paris") : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {c.payment_amount.toLocaleString("fr-FR")} €
                    </TableCell>
                    <TableCell className="text-center text-sm tabular-nums">{c.percentage}%</TableCell>
                    <TableCell className="text-right font-semibold text-sm tabular-nums">
                      {c.amount != null ? `${c.amount.toLocaleString("fr-FR")} €` : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${STATUS_COLORS[c.status || "pending"] || ""}`}>
                        {STATUS_LABELS[c.status || "pending"] || c.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
