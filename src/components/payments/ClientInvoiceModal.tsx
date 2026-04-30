// ClientInvoiceModal — gestion d'une facture client liée à un payment paid.
//
// Workflow CEO :
//   1. Si pas encore générée : "Générer la facture" → PDF créé côté front +
//      uploadé Storage + DB row inséré.
//   2. "Voir la facture" : ouvre le PDF dans un nouvel onglet (rendu natif).
//   3. "Tester sur mon email" : envoie l'email avec PJ PDF à l'adresse CEO
//      (sans toucher email_sent_at).
//   4. "Envoyer au client" : envoie l'email avec PJ PDF au vrai client +
//      marque email_sent_at.

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, Send, Eye, RefreshCw, Loader2, CheckCircle2, AlertTriangle, Mail } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatDateOnly } from "@/lib/formatDate";
import {
  useClientInvoiceForPayment,
  useGeneratePdfOnly,
  useSendClientInvoice,
  getInvoiceSignedUrl,
} from "@/hooks/useClientInvoice";

interface Props {
  open: boolean;
  onClose: () => void;
  paymentId: string | null;
  clientName: string | null;
  clientEmail: string | null;
  amount: number;
  paidAt: string | null;
}

export default function ClientInvoiceModal({
  open, onClose, paymentId, clientName, clientEmail, amount, paidAt,
}: Props) {
  const { profile } = useAuth();
  const { data: invoice, isLoading } = useClientInvoiceForPayment(paymentId);
  const generatePdf = useGeneratePdfOnly();
  const sendInvoice = useSendClientInvoice();

  const ceoEmail = profile?.email || "";
  const [testEmail, setTestEmail] = useState<string>(ceoEmail);
  const [previewLoading, setPreviewLoading] = useState(false);

  const hasInvoice = !!invoice;
  const hasPdf = !!invoice?.html_path;
  const wasSentToClient = !!invoice?.email_sent_at;

  // Reset testEmail à chaque ouverture
  useEffect(() => {
    if (open && ceoEmail) setTestEmail(ceoEmail);
  }, [open, ceoEmail]);

  // ─── Actions ────────────────────────────────────────────────────────
  async function handleGenerate() {
    if (!paymentId) return;
    try {
      const res = await generatePdf.mutateAsync({ payment_id: paymentId });
      toast({ title: "Facture générée", description: res?.invoice?.invoice_number });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message ?? String(e), variant: "destructive" });
    }
  }

  async function handleRegenerate() {
    if (!paymentId) return;
    try {
      await generatePdf.mutateAsync({ payment_id: paymentId, forceRegenerate: true });
      toast({ title: "PDF régénéré" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  }

  async function handleSendTest() {
    if (!paymentId || !testEmail) return;
    try {
      await sendInvoice.mutateAsync({ payment_id: paymentId, email_to_override: testEmail });
      toast({
        title: "Email de test envoyé",
        description: `Vérifie ${testEmail} (PDF en pièce jointe)`,
      });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  }

  async function handleSendToClient() {
    if (!paymentId) return;
    try {
      await sendInvoice.mutateAsync({ payment_id: paymentId });
      toast({
        title: "Facture envoyée au client",
        description: clientEmail || "",
      });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  }

  async function handlePreview() {
    if (!invoice?.html_path) return;
    setPreviewLoading(true);
    try {
      const url = await getInvoiceSignedUrl(invoice.html_path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setPreviewLoading(false);
    }
  }

  const busy = generatePdf.isPending || sendInvoice.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Facture client
          </DialogTitle>
          <DialogDescription>
            {clientName ?? "Client"} — {amount.toLocaleString("fr-FR")} €
            {paidAt && <> · payé le {formatDateOnly(paidAt)}</>}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !hasInvoice ? (
          // ─── Aucune facture encore générée ───
          <>
            <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-foreground/80">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  Aucune facture n'a encore été générée pour ce paiement.
                  La génération va créer un numéro <strong>FAC-YYYY-MM-XXXX</strong>,
                  produire le PDF et le stocker.
                </div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div><strong>Client :</strong> {clientName ?? "—"}</div>
              <div><strong>Email :</strong> {clientEmail ?? "—"}</div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={onClose} disabled={busy}>
                Annuler
              </Button>
              <Button onClick={handleGenerate} disabled={busy} className="gap-2">
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <FileText className="h-3.5 w-3.5" />
                Générer la facture
              </Button>
            </DialogFooter>
          </>
        ) : !hasPdf ? (
          // Cas étrange : row DB existe mais pas de PDF (interruption du flow)
          <>
            <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  Facture <strong>{invoice.invoice_number}</strong> créée mais le PDF n'a pas été
                  uploadé. Régénère pour produire le PDF.
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={onClose} disabled={busy}>Annuler</Button>
              <Button onClick={handleRegenerate} disabled={busy} className="gap-2">
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <RefreshCw className="h-3.5 w-3.5" />
                Générer le PDF
              </Button>
            </DialogFooter>
          </>
        ) : (
          // ─── Facture existe avec PDF ───
          <>
            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div className="font-mono font-semibold text-foreground">{invoice.invoice_number}</div>
                  <div className="text-muted-foreground mt-0.5">
                    Générée le {formatDateOnly(invoice.created_at.split("T")[0])}
                    {invoice.payment_number && invoice.total_payments && (
                      <> · Mensualité {invoice.payment_number}/{invoice.total_payments}</>
                    )}
                  </div>
                </div>
                {wasSentToClient ? (
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-300 border-emerald-500/30">
                    <Mail className="h-3 w-3 mr-1" /> Envoyée
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-300 border-amber-500/30">
                    Pas encore envoyée
                  </Badge>
                )}
              </div>
              {wasSentToClient && (
                <div className="mt-2 text-[11px] text-muted-foreground">
                  Envoyée à {invoice.email_sent_to} le {formatDateOnly(invoice.email_sent_at!.split("T")[0])}
                </div>
              )}
            </div>

            <Separator />

            {/* Aperçu PDF */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Aperçu</div>
              <Button variant="outline" size="sm" onClick={handlePreview} disabled={previewLoading} className="gap-2 w-full">
                {previewLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                Voir le PDF de la facture
              </Button>
            </div>

            <Separator />

            {/* Test email */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Tester l'email avant envoi
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="ton.email@exemple.com"
                  className="h-8 text-xs"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={handleSendTest}
                  disabled={!testEmail || busy}
                >
                  {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                  Test
                </Button>
              </div>
              <div className="text-[11px] text-muted-foreground">
                L'email part avec le PDF en pièce jointe. Le statut "Envoyée au client" reste inchangé.
              </div>
            </div>

            <Separator />

            {/* Envoi client */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {wasSentToClient ? "Renvoi au client" : "Envoi au client"}
              </div>
              <div className="text-xs text-foreground/80">
                Destinataire : <strong>{clientEmail ?? "—"}</strong>
              </div>
              <Button
                variant="default"
                size="sm"
                className="w-full gap-2"
                onClick={handleSendToClient}
                disabled={!clientEmail || busy}
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                {wasSentToClient ? "Renvoyer au client" : "Envoyer au client"}
              </Button>
            </div>

            <Separator />

            {/* Avancé : régénérer */}
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1.5 text-muted-foreground"
              onClick={handleRegenerate}
              disabled={busy}
            >
              <RefreshCw className="h-3 w-3" />
              Régénérer le PDF
            </Button>

            <DialogFooter>
              <Button variant="ghost" onClick={onClose}>Fermer</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
