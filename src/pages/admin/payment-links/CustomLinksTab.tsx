// CustomLinksTab — onglet "Liens personnalisés" de l'admin payment-links.
//
// Outil CEO pour créer des liens de paiement sur mesure : produit, montant
// et échéancier libres → URL /pay/<token> au design AL BARAKA. Au paiement,
// le webhook crée la vente + le plan de paiement.
//
// Anciennement le composant principal AdminPaymentLinks ; extrait ici dans
// un onglet quand la page a été refondue en 3 onglets (catalogue / promos /
// liens personnalisés). La garde CEO est désormais portée par le parent.

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getPublicAppOrigin } from "@/lib/impersonation";
import {
  usePaymentLinks,
  useCreatePaymentLink,
  useUpdatePaymentLink,
  useCancelPaymentLink,
  type PaymentLink,
} from "@/hooks/usePaymentLinks";
import { useOffers, type Offer } from "@/hooks/useOffers";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  Crown,
  Sparkles,
  GraduationCap,
  KeyRound,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

// ─── Onglet "Liens personnalisés" ────────────────────────────────────────
// La garde CEO est portée par le parent (AdminPaymentLinks), pas besoin de
// la dupliquer ici. useAuth conservé uniquement pour les cas où on en aura
// besoin plus tard côté form.
export default function CustomLinksTab() {
  const { profile: _profile } = useAuth();
  const { toast } = useToast();
  const { data: links, isLoading } = usePaymentLinks();
  const { data: offers } = useOffers();
  const cancelLink = useCancelPaymentLink();

  // Index offer.id → label pour rendu des grants_offer_id (Pass).
  const offerById = useMemo(() => {
    const m = new Map<string, Offer>();
    for (const o of offers ?? []) m.set(o.id, o);
    return m;
  }, [offers]);

  // Index formation.id → label via offer.formation_id (les formations a la
  // carte sont liees 1-to-1 avec une offre). Pour les grants_formation_ids
  // sans offre correspondante (improbable), on affiche "Formation #ID".
  const formationLabelByFormationId = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of offers ?? []) {
      if (o.category === "a_la_carte" && o.formation_id) {
        m.set(o.formation_id, o.label);
      }
    }
    return m;
  }, [offers]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<PaymentLink | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

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
        <p className="text-sm text-muted-foreground">
          Crée des liens de paiement sur mesure (produit, montant et échéancier
          libres) au design AL BARAKA, à envoyer à n'importe quel client.
        </p>
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
                      <GrantsBadges
                        link={link}
                        offerById={offerById}
                        formationLabelByFormationId={formationLabelByFormationId}
                      />
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
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              title="Modifier le lien (date, destinataire, périmètre…)"
                              onClick={() => setEditingLink(link)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              title="Annuler le lien"
                              onClick={() => handleCancel(link)}
                            >
                              <Ban className="h-3.5 w-3.5" />
                            </Button>
                          </>
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
      <EditPaymentLinkModal
        link={editingLink}
        onOpenChange={(open) => !open && setEditingLink(null)}
      />
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

  // Charge le catalogue d'offres pour le perimetre d'acces (pass + formations a la carte)
  const offersQ = useOffers();
  const passOffers = useMemo(
    () => (offersQ.data ?? []).filter((o) => o.category === "al_baraka" || o.category === "liberty"),
    [offersQ.data],
  );
  const formationOffers = useMemo(
    () => (offersQ.data ?? []).filter((o) => o.category === "a_la_carte" && o.formation_id),
    [offersQ.data],
  );

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

  // Perimetre d'acces (Sprint H)
  // grantsPassOfferId : "none" | offer.id d'un Pass al_baraka ou liberty
  // grantsFormationIds : liste d'offer.id de formations a la carte cochees
  //   (on convertit en formation_ids au submit via offer.formation_id)
  const [grantsPassOfferId, setGrantsPassOfferId] = useState<string>("none");
  const [grantsCheckedFormationOfferIds, setGrantsCheckedFormationOfferIds] = useState<string[]>([]);

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
    setGrantsPassOfferId("none");
    setGrantsCheckedFormationOfferIds([]);
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
      // Resolution grants : on convertit les offer.id de formation a la
      // carte coches en formation_ids (UUID des formations a debloquer).
      const grantsFormationIds = grantsCheckedFormationOfferIds
        .map((offerId) => formationOffers.find((o) => o.id === offerId)?.formation_id)
        .filter((id): id is string => !!id);

      const res = await createLink.mutateAsync({
        productLabel: productLabel.trim(),
        totalAmount: total,
        installmentsCount: installments,
        deferredStartDate: hasDeferred ? deferredDate : null,
        prefilledFullName: recipientMode === "prefilled" ? fullName.trim() || null : null,
        prefilledEmail: recipientMode === "prefilled" ? email.trim() || null : null,
        prefilledPhone: recipientMode === "prefilled" ? phone.trim() || null : null,
        notes: notes.trim() || null,
        grantsOfferId: grantsPassOfferId !== "none" ? grantsPassOfferId : null,
        grantsFormationIds: grantsFormationIds.length > 0 ? grantsFormationIds : null,
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

  function toggleFormation(offerId: string) {
    setGrantsCheckedFormationOfferIds((prev) =>
      prev.includes(offerId) ? prev.filter((x) => x !== offerId) : [...prev, offerId],
    );
  }

  const grantsCount =
    (grantsPassOfferId !== "none" ? 1 : 0) + grantsCheckedFormationOfferIds.length;

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
      <DialogContent className="bg-card border-border sm:max-w-2xl max-h-[90vh] overflow-y-auto">
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

              {/* ─── Périmètre d'accès (grants) ─── */}
              <div className="space-y-2 rounded-md border border-primary/20 bg-primary/[0.03] p-3">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-3.5 w-3.5 text-primary" />
                  <Label className="text-xs font-medium">Périmètre d'accès après paiement</Label>
                  {grantsCount > 0 && (
                    <Badge variant="outline" className="ml-auto text-[10px] border-primary/40 text-primary">
                      {grantsCount} {grantsCount > 1 ? "éléments" : "élément"}
                    </Badge>
                  )}
                </div>
                <p className="text-[10.5px] text-muted-foreground leading-relaxed">
                  Définis ce que l'achat débloque pour le client.
                  <strong className="text-foreground"> Aucune coche</strong> = simple encaissement,
                  sans création de compte ni accès.
                </p>

                {/* Pass (radio exclusif, optionnel) */}
                <div className="space-y-1.5 pt-1">
                  <Label className="text-[10.5px] uppercase tracking-wide text-muted-foreground">
                    Pass (1 maximum)
                  </Label>
                  <RadioGroup
                    value={grantsPassOfferId}
                    onValueChange={setGrantsPassOfferId}
                    className="space-y-1"
                  >
                    <label className="flex items-center gap-2 py-1 px-2 rounded hover:bg-secondary/40 cursor-pointer">
                      <RadioGroupItem value="none" id="grant-pass-none" />
                      <span className="text-sm">Aucun pass</span>
                    </label>
                    {offersQ.isLoading ? (
                      <div className="flex items-center justify-center py-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      passOffers.map((o) => {
                        const Icon = o.category === "al_baraka" ? Crown : Sparkles;
                        const colorCls = o.category === "al_baraka" ? "text-amber-500" : "text-amber-400";
                        return (
                          <label
                            key={o.id}
                            className="flex items-center gap-2 py-1 px-2 rounded hover:bg-secondary/40 cursor-pointer"
                          >
                            <RadioGroupItem value={o.id} id={`grant-pass-${o.id}`} />
                            <Icon className={cn("h-3.5 w-3.5 shrink-0", colorCls)} />
                            <span className="text-sm">{o.label}</span>
                            <span className="text-[10px] text-muted-foreground ml-auto">
                              débloque le parcours
                            </span>
                          </label>
                        );
                      })
                    )}
                  </RadioGroup>
                </div>

                {/* Formations à la carte (checkbox multi-select) */}
                <div className="space-y-1.5 pt-2">
                  <Label className="text-[10.5px] uppercase tracking-wide text-muted-foreground">
                    Formations à la carte
                    {grantsCheckedFormationOfferIds.length > 0 && (
                      <span className="ml-2 text-primary normal-case tracking-normal">
                        ({grantsCheckedFormationOfferIds.length} sélectionnée
                        {grantsCheckedFormationOfferIds.length > 1 ? "s" : ""})
                      </span>
                    )}
                  </Label>
                  <div className="rounded border border-border/60 bg-background/40 max-h-40 overflow-y-auto p-1.5 space-y-0.5">
                    {offersQ.isLoading ? (
                      <div className="flex items-center justify-center py-3">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                      </div>
                    ) : formationOffers.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground italic py-2 px-1">
                        Aucune formation à la carte disponible.
                      </p>
                    ) : (
                      formationOffers.map((o) => (
                        <label
                          key={o.id}
                          className="flex items-center gap-2 py-1 px-2 rounded hover:bg-secondary/40 cursor-pointer"
                        >
                          <Checkbox
                            checked={grantsCheckedFormationOfferIds.includes(o.id)}
                            onCheckedChange={() => toggleFormation(o.id)}
                          />
                          <GraduationCap className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                          <span className="text-sm flex-1">{o.label}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </div>

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

// ─── Modale d'édition d'un lien existant ────────────────────────────────
// Permet de modifier les champs "soft" (date différée, destinataire, notes,
// périmètre d'accès) sans avoir à annuler + recréer le lien. Les champs
// immuables (product_label, total_amount, installments_count) sont affichés
// en read-only en haut de la modale pour rappeler le contexte.
function EditPaymentLinkModal({
  link,
  onOpenChange,
}: {
  link: PaymentLink | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const updateLink = useUpdatePaymentLink();
  const offersQ = useOffers();
  const passOffers = useMemo(
    () => (offersQ.data ?? []).filter((o) => o.category === "al_baraka" || o.category === "liberty"),
    [offersQ.data],
  );
  const formationOffers = useMemo(
    () => (offersQ.data ?? []).filter((o) => o.category === "a_la_carte" && o.formation_id),
    [offersQ.data],
  );
  // Index formation_id → offer.id (pour pré-cocher depuis grants_formation_ids)
  const offerIdByFormationId = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of formationOffers) if (o.formation_id) m.set(o.formation_id, o.id);
    return m;
  }, [formationOffers]);

  const [hasDeferred, setHasDeferred] = useState(false);
  const [deferredDate, setDeferredDate] = useState("");
  const [recipientMode, setRecipientMode] = useState<"generic" | "prefilled">("generic");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [grantsPassOfferId, setGrantsPassOfferId] = useState<string>("none");
  const [grantsCheckedFormationOfferIds, setGrantsCheckedFormationOfferIds] = useState<string[]>([]);

  // Pré-remplit quand un nouveau lien est passé
  useEffect(() => {
    if (!link) return;
    setHasDeferred(!!link.deferred_start_date);
    setDeferredDate(link.deferred_start_date || "");
    const hasRecipient =
      !!(link.prefilled_full_name || link.prefilled_email || link.prefilled_phone);
    setRecipientMode(hasRecipient ? "prefilled" : "generic");
    setFullName(link.prefilled_full_name || "");
    setEmail(link.prefilled_email || "");
    setPhone(link.prefilled_phone || "");
    setNotes(link.notes || "");
    setGrantsPassOfferId(link.grants_offer_id || "none");
    setGrantsCheckedFormationOfferIds(
      (link.grants_formation_ids || [])
        .map((fid) => offerIdByFormationId.get(fid))
        .filter((id): id is string => !!id),
    );
  }, [link, offerIdByFormationId]);

  const minDeferred = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, []);

  function toggleFormation(offerId: string) {
    setGrantsCheckedFormationOfferIds((prev) =>
      prev.includes(offerId) ? prev.filter((x) => x !== offerId) : [...prev, offerId],
    );
  }

  const errors: string[] = [];
  if (hasDeferred && (!deferredDate || deferredDate < minDeferred))
    errors.push("La date de démarrage différé doit être dans le futur.");
  if (recipientMode === "prefilled" && !fullName.trim() && !email.trim())
    errors.push("Renseigne au moins le nom ou l'email du destinataire.");
  const valid = errors.length === 0;

  const grantsCount =
    (grantsPassOfferId !== "none" ? 1 : 0) + grantsCheckedFormationOfferIds.length;

  async function handleSave() {
    if (!link || !valid) return;
    try {
      const grantsFormationIds = grantsCheckedFormationOfferIds
        .map((offerId) => formationOffers.find((o) => o.id === offerId)?.formation_id)
        .filter((id): id is string => !!id);

      await updateLink.mutateAsync({
        id: link.id,
        deferredStartDate: hasDeferred ? deferredDate : null,
        prefilledFullName: recipientMode === "prefilled" ? fullName.trim() || null : null,
        prefilledEmail: recipientMode === "prefilled" ? email.trim() || null : null,
        prefilledPhone: recipientMode === "prefilled" ? phone.trim() || null : null,
        notes: notes.trim() || null,
        grantsOfferId: grantsPassOfferId !== "none" ? grantsPassOfferId : null,
        grantsFormationIds: grantsFormationIds.length > 0 ? grantsFormationIds : null,
      });
      toast({ title: "Lien modifié" });
      onOpenChange(false);
    } catch (e: any) {
      toast({
        title: "Échec de la modification",
        description: e?.message || "Réessaie ou contacte le support.",
        variant: "destructive",
      });
    }
  }

  if (!link) return null;

  return (
    <Dialog open={!!link} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Pencil className="h-4 w-4 text-primary" />
            Modifier le lien
          </DialogTitle>
        </DialogHeader>

        {/* Read-only recap des champs immuables */}
        <div className="rounded-md border border-border/60 bg-background/40 p-3 space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Champs verrouillés (annuler + recréer pour les changer)
          </p>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
            <span className="font-medium text-foreground">{link.product_label}</span>
            <span className="text-muted-foreground">
              {formatEur(Number(link.total_amount))}
              {link.installments_count > 1 && ` · ${link.installments_count}× mensualités`}
            </span>
            <code className="text-[10px] text-muted-foreground font-mono">{link.token}</code>
          </div>
        </div>

        <div className="space-y-4 py-1">
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

          {/* Périmètre d'accès (identique à la modale Create) */}
          <div className="space-y-2 rounded-md border border-primary/20 bg-primary/[0.03] p-3">
            <div className="flex items-center gap-2">
              <KeyRound className="h-3.5 w-3.5 text-primary" />
              <Label className="text-xs font-medium">Périmètre d'accès après paiement</Label>
              {grantsCount > 0 && (
                <Badge variant="outline" className="ml-auto text-[10px] border-primary/40 text-primary">
                  {grantsCount} {grantsCount > 1 ? "éléments" : "élément"}
                </Badge>
              )}
            </div>

            <div className="space-y-1.5 pt-1">
              <Label className="text-[10.5px] uppercase tracking-wide text-muted-foreground">
                Pass (1 maximum)
              </Label>
              <RadioGroup
                value={grantsPassOfferId}
                onValueChange={setGrantsPassOfferId}
                className="space-y-1"
              >
                <label className="flex items-center gap-2 py-1 px-2 rounded hover:bg-secondary/40 cursor-pointer">
                  <RadioGroupItem value="none" id="edit-grant-pass-none" />
                  <span className="text-sm">Aucun pass</span>
                </label>
                {passOffers.map((o) => {
                  const Icon = o.category === "al_baraka" ? Crown : Sparkles;
                  const colorCls = o.category === "al_baraka" ? "text-amber-500" : "text-amber-400";
                  return (
                    <label
                      key={o.id}
                      className="flex items-center gap-2 py-1 px-2 rounded hover:bg-secondary/40 cursor-pointer"
                    >
                      <RadioGroupItem value={o.id} id={`edit-grant-pass-${o.id}`} />
                      <Icon className={cn("h-3.5 w-3.5 shrink-0", colorCls)} />
                      <span className="text-sm">{o.label}</span>
                    </label>
                  );
                })}
              </RadioGroup>
            </div>

            <div className="space-y-1.5 pt-2">
              <Label className="text-[10.5px] uppercase tracking-wide text-muted-foreground">
                Formations à la carte
                {grantsCheckedFormationOfferIds.length > 0 && (
                  <span className="ml-2 text-primary normal-case tracking-normal">
                    ({grantsCheckedFormationOfferIds.length} sélectionnée
                    {grantsCheckedFormationOfferIds.length > 1 ? "s" : ""})
                  </span>
                )}
              </Label>
              <div className="rounded border border-border/60 bg-background/40 max-h-40 overflow-y-auto p-1.5 space-y-0.5">
                {formationOffers.map((o) => (
                  <label
                    key={o.id}
                    className="flex items-center gap-2 py-1 px-2 rounded hover:bg-secondary/40 cursor-pointer"
                  >
                    <Checkbox
                      checked={grantsCheckedFormationOfferIds.includes(o.id)}
                      onCheckedChange={() => toggleFormation(o.id)}
                    />
                    <GraduationCap className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                    <span className="text-sm flex-1">{o.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Notes */}
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

          {errors.length > 0 && (
            <ul className="text-xs text-destructive space-y-0.5">
              {errors.map((err) => (
                <li key={err}>• {err}</li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updateLink.isPending}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            disabled={!valid || updateLink.isPending}
            className="gap-2"
          >
            {updateLink.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Badges "Périmètre d'accès" affichés sous chaque ligne de la table ────
function GrantsBadges({
  link,
  offerById,
  formationLabelByFormationId,
}: {
  link: PaymentLink;
  offerById: Map<string, Offer>;
  formationLabelByFormationId: Map<string, string>;
}) {
  const passOffer = link.grants_offer_id ? offerById.get(link.grants_offer_id) : null;
  const formationCount = link.grants_formation_ids?.length ?? 0;

  if (!passOffer && formationCount === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1 mt-1.5">
      {passOffer && (
        <Badge
          variant="outline"
          className={cn(
            "text-[9.5px] gap-1 border-amber-500/40",
            passOffer.category === "al_baraka"
              ? "bg-amber-500/[0.06] text-amber-300"
              : "bg-amber-400/[0.06] text-amber-300",
          )}
          title={`Donne accès au pass ${passOffer.label}`}
        >
          {passOffer.category === "al_baraka" ? (
            <Crown className="h-2.5 w-2.5" />
          ) : (
            <Sparkles className="h-2.5 w-2.5" />
          )}
          {passOffer.label}
        </Badge>
      )}
      {formationCount > 0 && (
        <Badge
          variant="outline"
          className="text-[9.5px] gap-1 border-sky-500/40 bg-sky-500/[0.06] text-sky-300"
          title={
            link.grants_formation_ids
              ?.map((fid) => formationLabelByFormationId.get(fid) || `Formation #${fid.slice(0, 8)}`)
              .join(" · ")
          }
        >
          <GraduationCap className="h-2.5 w-2.5" />
          {formationCount} formation{formationCount > 1 ? "s" : ""}
        </Badge>
      )}
    </div>
  );
}
