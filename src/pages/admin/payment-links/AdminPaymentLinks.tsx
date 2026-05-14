// AdminPaymentLinks — outil CEO pour créer des liens de paiement sur mesure.
//
// Un lien = une commande définie de zéro (produit / montant / échéancier
// libres) → URL /pay/<token> au design AL BARAKA. Au paiement, le webhook
// crée la vente + le plan de paiement (cf. sprint 4).

import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getPublicAppOrigin } from "@/lib/impersonation";
import {
  usePaymentLinks,
  useCreatePaymentLink,
  useCancelPaymentLink,
  type PaymentLink,
} from "@/hooks/usePaymentLinks";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Link2,
  Plus,
  Copy,
  Check,
  Loader2,
  ExternalLink,
  Ban,
  CheckCircle2,
} from "lucide-react";

// ─── Helpers ────────────────────────────────────────────────────────────────
function formatEur(n: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function buildPayUrl(token: string): string {
  return `${getPublicAppOrigin()}/pay/${token}`;
}

/**
 * Répartition de l'échéancier — logique unique (aperçu admin, page client
 * et edge function doivent rester alignés) : `installments` prélèvements de
 * total/installments, la 1re absorbe les centimes restants.
 */
function computeSchedule(
  total: number,
  installments: number,
): { monthly: number; firstMonthly: number; count: number } {
  const totalCents = Math.round(total * 100);
  const per = Math.floor(totalCents / installments);
  const extra = totalCents - per * installments;
  return {
    monthly: per / 100,
    firstMonthly: (per + extra) / 100,
    count: installments,
  };
}

const STATUS_BADGE: Record<PaymentLink["status"], { label: string; cls: string }> = {
  active: { label: "Actif", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  paid: { label: "Payé", cls: "bg-primary/15 text-primary border-primary/30" },
  cancelled: { label: "Annulé", cls: "bg-muted text-muted-foreground border-border" },
};

// ─── Page ───────────────────────────────────────────────────────────────────
export default function AdminPaymentLinks() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { data: links, isLoading } = usePaymentLinks();
  const cancelLink = useCancelPaymentLink();

  const [createOpen, setCreateOpen] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  if (profile && profile.role !== "ceo") {
    return <Navigate to="/dashboard" replace />;
  }

  async function copyLink(token: string) {
    try {
      await navigator.clipboard.writeText(buildPayUrl(token));
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
      toast({ title: "Lien copié" });
    } catch {
      toast({ title: "Copie impossible", variant: "destructive" });
    }
  }

  async function handleCancel(link: PaymentLink) {
    if (link.status !== "active") return;
    try {
      await cancelLink.mutateAsync(link.id);
      toast({ title: "Lien annulé" });
    } catch (e: any) {
      toast({ title: "Échec de l'annulation", description: e?.message, variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground flex items-center gap-2">
            <Link2 className="h-6 w-6 text-primary" />
            Liens de paiement
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Crée des liens de paiement sur mesure (produit, montant et échéancier
            libres) au design AL BARAKA, à envoyer à n'importe quel client.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Nouveau lien
        </Button>
      </div>

      {/* Liste des liens */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !links || links.length === 0 ? (
        <Card className="border-border/50 border-dashed">
          <CardContent className="p-10 text-center">
            <Link2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-foreground font-medium">Aucun lien de paiement pour l'instant</p>
            <p className="text-sm text-muted-foreground mt-1">
              Crée ton premier lien sur mesure avec le bouton « Nouveau lien ».
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Produit</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Échéancier</TableHead>
                <TableHead>Destinataire</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Créé le</TableHead>
                <TableHead className="text-right">Lien</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.map((link) => {
                const sched = computeSchedule(
                  Number(link.total_amount),
                  link.installments_count,
                );
                return (
                  <TableRow key={link.id} className="border-border">
                    <TableCell>
                      <p className="font-medium text-foreground">{link.product_label}</p>
                      <code className="text-[10px] text-muted-foreground font-mono">{link.token}</code>
                    </TableCell>
                    <TableCell className="font-medium tabular-nums">
                      {formatEur(Number(link.total_amount))}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {link.installments_count === 1 ? (
                        <span>Paiement unique</span>
                      ) : (
                        <span>
                          {sched.count}× {formatEur(sched.monthly)}
                          {sched.firstMonthly !== sched.monthly && " (1re ajustée)"}
                        </span>
                      )}
                      {link.deferred_start_date && (
                        <div className="text-amber-400">
                          Début {new Date(link.deferred_start_date).toLocaleDateString("fr-FR")}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {link.prefilled_full_name ? (
                        <div>
                          <p className="text-foreground">{link.prefilled_full_name}</p>
                          <p className="text-muted-foreground">{link.prefilled_email}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">Générique</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${STATUS_BADGE[link.status].cls}`}>
                        {STATUS_BADGE[link.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(link.created_at).toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title="Copier le lien"
                          onClick={() => copyLink(link.token)}
                        >
                          {copiedToken === link.token ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title="Ouvrir le lien"
                          asChild
                        >
                          <a href={buildPayUrl(link.token)} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                        {link.status === "active" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            title="Annuler le lien"
                            onClick={() => handleCancel(link)}
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <CreatePaymentLinkModal open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

// ─── Modale de création ─────────────────────────────────────────────────────
function CreatePaymentLinkModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { toast } = useToast();
  const createLink = useCreatePaymentLink();

  // Champs
  const [productLabel, setProductLabel] = useState("");
  const [totalStr, setTotalStr] = useState("");
  const [paymentType, setPaymentType] = useState<"once" | "installments">("once");
  const [installmentsStr, setInstallmentsStr] = useState("3");
  const [hasDeferred, setHasDeferred] = useState(false);
  const [deferredDate, setDeferredDate] = useState("");
  const [recipientMode, setRecipientMode] = useState<"generic" | "prefilled">("generic");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  // Résultat après création
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const total = parseFloat(totalStr.replace(",", ".")) || 0;
  const installments =
    paymentType === "once" ? 1 : Math.max(1, parseInt(installmentsStr, 10) || 0);

  const minDeferred = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, []);

  // Validation
  const errors: string[] = [];
  if (!productLabel.trim()) errors.push("Le libellé du produit est obligatoire.");
  if (total <= 0) errors.push("Le montant total doit être supérieur à 0.");
  if (paymentType === "installments" && (installments < 2 || installments > 24))
    errors.push("Le nombre de mensualités doit être entre 2 et 24.");
  if (hasDeferred && (!deferredDate || deferredDate < minDeferred))
    errors.push("La date de démarrage différé doit être dans le futur.");
  if (recipientMode === "prefilled" && !fullName.trim() && !email.trim())
    errors.push("Renseigne au moins le nom ou l'email du destinataire.");
  const valid = errors.length === 0;

  // Aperçu échéancier
  const schedule = useMemo(() => {
    if (total <= 0) return null;
    return computeSchedule(total, installments);
  }, [total, installments]);

  function resetForm() {
    setProductLabel("");
    setTotalStr("");
    setPaymentType("once");
    setInstallmentsStr("3");
    setHasDeferred(false);
    setDeferredDate("");
    setRecipientMode("generic");
    setFullName("");
    setEmail("");
    setPhone("");
    setNotes("");
    setCreatedToken(null);
    setCopied(false);
  }

  function handleClose(v: boolean) {
    if (!v) resetForm();
    onOpenChange(v);
  }

  async function handleCreate() {
    if (!valid) return;
    try {
      const res = await createLink.mutateAsync({
        productLabel: productLabel.trim(),
        totalAmount: total,
        installmentsCount: installments,
        deferredStartDate: hasDeferred ? deferredDate : null,
        prefilledFullName: recipientMode === "prefilled" ? fullName.trim() || null : null,
        prefilledEmail: recipientMode === "prefilled" ? email.trim() || null : null,
        prefilledPhone: recipientMode === "prefilled" ? phone.trim() || null : null,
        notes: notes.trim() || null,
      });
      setCreatedToken(res.token);
    } catch (e: any) {
      toast({
        title: "Échec de la création",
        description: e?.message || "Réessaie ou contacte le support.",
        variant: "destructive",
      });
    }
  }

  async function copyCreated() {
    if (!createdToken) return;
    try {
      await navigator.clipboard.writeText(buildPayUrl(createdToken));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Copie impossible", variant: "destructive" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {/* ─── Écran "lien créé" ─── */}
        {createdToken ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-foreground flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                Lien créé
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Envoie ce lien à ton client. Il pourra payer directement, et la
                vente sera créée automatiquement après le paiement.
              </p>
              <div className="rounded-md border border-primary/30 bg-primary/[0.05] p-3 flex items-center gap-2">
                <code className="text-xs text-foreground font-mono break-all flex-1">
                  {buildPayUrl(createdToken)}
                </code>
                <Button size="sm" variant="outline" onClick={copyCreated} className="gap-1.5 shrink-0">
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copied ? "Copié" : "Copier"}
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)}>
                Fermer
              </Button>
              <Button onClick={resetForm}>Créer un autre lien</Button>
            </DialogFooter>
          </>
        ) : (
          /* ─── Formulaire de création ─── */
          <>
            <DialogHeader>
              <DialogTitle className="text-foreground">Nouveau lien de paiement</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-1">
              {/* Produit */}
              <div className="space-y-1.5">
                <Label className="text-xs">Libellé du produit *</Label>
                <Input
                  value={productLabel}
                  onChange={(e) => setProductLabel(e.target.value)}
                  placeholder="Ex : Coaching VIP 3 mois"
                  className="bg-background"
                />
              </div>

              {/* Montant total */}
              <div className="space-y-1.5">
                <Label className="text-xs">Montant total (€) *</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={totalStr}
                  onChange={(e) => setTotalStr(e.target.value)}
                  placeholder="Ex : 1500"
                  className="bg-background"
                />
              </div>

              {/* Type de paiement */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Type de paiement</Label>
                  <Select
                    value={paymentType}
                    onValueChange={(v) => setPaymentType(v as "once" | "installments")}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="once">Paiement unique (1×)</SelectItem>
                      <SelectItem value="installments">Échéancier (N×)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {paymentType === "installments" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nombre de mensualités</Label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={2}
                      max={24}
                      value={installmentsStr}
                      onChange={(e) => setInstallmentsStr(e.target.value)}
                      className="bg-background"
                    />
                  </div>
                )}
              </div>

              {/* Démarrage différé */}
              <div className="rounded-md border border-border/60 bg-secondary/30 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Démarrage différé</Label>
                  <Switch checked={hasDeferred} onCheckedChange={setHasDeferred} />
                </div>
                {hasDeferred && (
                  <>
                    <Input
                      type="date"
                      min={minDeferred}
                      value={deferredDate}
                      onChange={(e) => setDeferredDate(e.target.value)}
                      className="bg-background"
                    />
                    <p className="text-[10.5px] text-muted-foreground">
                      Le client autorise sa carte aujourd'hui ; le 1er prélèvement
                      a lieu à cette date.
                    </p>
                  </>
                )}
              </div>

              {/* Destinataire */}
              <div className="space-y-1.5">
                <Label className="text-xs">Destinataire</Label>
                <Select
                  value={recipientMode}
                  onValueChange={(v) => setRecipientMode(v as "generic" | "prefilled")}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="generic">Lien générique (le client saisit ses infos)</SelectItem>
                    <SelectItem value="prefilled">Pré-rempli pour un client précis</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {recipientMode === "prefilled" && (
                <div className="space-y-2 rounded-md border border-border/60 bg-secondary/30 p-3">
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nom complet"
                    className="bg-background"
                  />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    className="bg-background"
                  />
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Téléphone"
                    className="bg-background"
                  />
                </div>
              )}

              {/* Notes internes */}
              <div className="space-y-1.5">
                <Label className="text-xs">Notes internes (optionnel)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contexte, référence... (non visible par le client)"
                  className="bg-background"
                  rows={2}
                />
              </div>

              {/* Aperçu échéancier */}
              {schedule && (
                <div className="rounded-md border border-primary/30 bg-primary/[0.05] p-3 text-xs space-y-1">
                  <p className="font-medium text-primary">Aperçu</p>
                  {installments === 1 ? (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Paiement unique</span>
                      <span className="tabular-nums">{formatEur(total)}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {schedule.count} mensualités
                      </span>
                      <span className="tabular-nums">
                        {schedule.firstMonthly !== schedule.monthly
                          ? `${formatEur(schedule.firstMonthly)} puis ${formatEur(schedule.monthly)}`
                          : `${formatEur(schedule.monthly)} / mois`}
                      </span>
                    </div>
                  )}
                  {hasDeferred && deferredDate && (
                    <div className="flex justify-between text-amber-400">
                      <span>1er prélèvement</span>
                      <span>{new Date(`${deferredDate}T12:00:00`).toLocaleDateString("fr-FR")}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-border/50 pt-1 font-medium">
                    <span>Total</span>
                    <span className="tabular-nums">{formatEur(total)}</span>
                  </div>
                </div>
              )}

              {errors.length > 0 && (
                <ul className="text-xs text-destructive space-y-0.5">
                  {errors.map((err) => (
                    <li key={err}>• {err}</li>
                  ))}
                </ul>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)} disabled={createLink.isPending}>
                Annuler
              </Button>
              <Button onClick={handleCreate} disabled={!valid || createLink.isPending} className="gap-2">
                {createLink.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Créer le lien
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
