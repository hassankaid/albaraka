// CouponsAndPricingTab — onglet "Codes promo & tarifs" de l'admin
// payment-links.
//
// Deux sections :
//   1. Tarifs des offres : prix HT éditable inline pour chaque offre du
//      catalogue (offers.default_price_ht).
//   2. Codes promo : CRUD complet (création, édition, activation /
//      désactivation, suppression) sur public.coupons. Chaque code peut être
//      en % ou en € fixes, ciblé sur des offres précises ou des catégories.

import { useEffect, useMemo, useState } from "react";
import { useOffers, useUpdateOffer, type Offer, type OfferCategory } from "@/hooks/useOffers";
import {
  useCoupons, useCreateCoupon, useUpdateCoupon, useDeleteCoupon,
  type Coupon, type CouponDiscountType,
} from "@/hooks/useCoupons";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Pencil, Trash2, Loader2, BadgePercent, Tag, Check, X, Save,
} from "lucide-react";

// ─── Helpers UI ─────────────────────────────────────────────────────────
const eur = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

const CATEGORY_LABEL: Record<OfferCategory, string> = {
  al_baraka: "AL BARAKA",
  liberty: "Liberty",
  a_la_carte: "À la carte",
};

// ─── Composant principal ────────────────────────────────────────────────
export default function CouponsAndPricingTab() {
  const offersQ = useOffers();
  const couponsQ = useCoupons();

  if (offersQ.isLoading || couponsQ.isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section Tarifs */}
      <PricingSection offers={offersQ.data ?? []} />
      {/* Section Codes promo */}
      <CouponsSection coupons={couponsQ.data ?? []} offers={offersQ.data ?? []} />
    </div>
  );
}

// ─── Section Tarifs ─────────────────────────────────────────────────────
function PricingSection({ offers }: { offers: Offer[] }) {
  const updateOffer = useUpdateOffer();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftPrice, setDraftPrice] = useState<string>("");

  function startEdit(o: Offer) {
    setEditingId(o.id);
    setDraftPrice(String(o.default_price_ht));
  }

  async function save(o: Offer) {
    const v = Number(draftPrice);
    if (!Number.isFinite(v) || v <= 0) {
      toast({ title: "Prix invalide", variant: "destructive" });
      return;
    }
    if (v === Number(o.default_price_ht)) {
      setEditingId(null);
      return;
    }
    try {
      await updateOffer.mutateAsync({ id: o.id, default_price_ht: v });
      toast({ title: "Prix mis à jour" });
      setEditingId(null);
    } catch (e: any) {
      toast({ title: "Échec", description: e?.message, variant: "destructive" });
    }
  }

  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-primary" />
          <h2 className="font-heading text-base text-foreground">Tarifs des offres</h2>
          <Badge variant="outline" className="ml-auto text-[10px]">{offers.length} offres</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Modifier le prix d'une offre la met à jour pour tous les nouveaux paiements.
          Les ventes déjà conclues ne sont pas affectées.
        </p>
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Offre</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead className="text-right">Prix HT</TableHead>
                <TableHead className="w-[120px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {offers.map((o) => (
                <TableRow key={o.id} className="border-border">
                  <TableCell className="font-medium text-foreground">{o.label}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">{CATEGORY_LABEL[o.category]}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {editingId === o.id ? (
                      <div className="flex items-center justify-end gap-1">
                        <Input
                          type="number"
                          value={draftPrice}
                          onChange={(e) => setDraftPrice(e.target.value)}
                          className="h-7 w-28 text-right text-sm tabular-nums"
                          autoFocus
                        />
                        <span className="text-xs text-muted-foreground">€</span>
                      </div>
                    ) : (
                      <span className="font-bold tabular-nums">{eur(Number(o.default_price_ht))}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {editingId === o.id ? (
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingId(null)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" className="h-7 px-2 gap-1" onClick={() => save(o)} disabled={updateOffer.isPending}>
                          {updateOffer.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" className="h-7 px-2 gap-1.5 text-xs" onClick={() => startEdit(o)}>
                        <Pencil className="h-3.5 w-3.5" />
                        Modifier
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Section Codes promo ────────────────────────────────────────────────
function CouponsSection({ coupons, offers }: { coupons: Coupon[]; offers: Offer[] }) {
  const updateCoupon = useUpdateCoupon();
  const deleteCoupon = useDeleteCoupon();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [editCoupon, setEditCoupon] = useState<Coupon | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Coupon | null>(null);

  const offerById = useMemo(() => {
    const m = new Map<string, Offer>();
    for (const o of offers) m.set(o.id, o);
    return m;
  }, [offers]);

  function couponTargetsLabel(c: Coupon): string {
    if (c.applies_to_offer_ids && c.applies_to_offer_ids.length > 0) {
      const names = c.applies_to_offer_ids
        .map((id) => offerById.get(id)?.label ?? "(?)")
        .join(" · ");
      return names;
    }
    if (c.applies_to_categories && c.applies_to_categories.length > 0) {
      return c.applies_to_categories.map((c) => CATEGORY_LABEL[c as OfferCategory] ?? c).join(" · ");
    }
    return "Toutes les offres";
  }

  function couponValueLabel(c: Coupon): string {
    if (c.discount_type === "percent") return `-${c.discount_percent}%`;
    return `-${eur(Number(c.discount_amount_eur ?? 0))}`;
  }

  async function toggleActive(c: Coupon) {
    try {
      await updateCoupon.mutateAsync({ id: c.id, active: !c.active });
      toast({ title: c.active ? "Code désactivé" : "Code activé" });
    } catch (e: any) {
      toast({ title: "Échec", description: e?.message, variant: "destructive" });
    }
  }

  async function doDelete() {
    if (!confirmDelete) return;
    try {
      await deleteCoupon.mutateAsync(confirmDelete.id);
      toast({ title: "Code supprimé" });
      setConfirmDelete(null);
    } catch (e: any) {
      toast({ title: "Échec", description: e?.message, variant: "destructive" });
    }
  }

  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <BadgePercent className="h-4 w-4 text-primary" />
          <h2 className="font-heading text-base text-foreground">Codes promo</h2>
          <Badge variant="outline" className="ml-auto text-[10px]">{coupons.length}</Badge>
          <Button size="sm" className="gap-1.5 ml-2 shrink-0" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Nouveau code
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Crée un code promo en pourcentage (-20%) ou en montant fixe (-1000 €).
          Tu peux le cibler sur des offres précises ou des catégories entières.
        </p>
        {coupons.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Aucun code promo pour l'instant.
          </p>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Code</TableHead>
                  <TableHead>Réduction</TableHead>
                  <TableHead>Applicable à</TableHead>
                  <TableHead className="text-center">Utilisations</TableHead>
                  <TableHead className="text-center">Actif</TableHead>
                  <TableHead className="text-right w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((c) => (
                  <TableRow key={c.id} className="border-border">
                    <TableCell>
                      <code className="text-sm font-mono font-bold text-foreground">{c.code}</code>
                    </TableCell>
                    <TableCell className="font-medium tabular-nums">{couponValueLabel(c)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{couponTargetsLabel(c)}</TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground">
                      {c.times_redeemed}
                      {c.max_redemptions ? ` / ${c.max_redemptions}` : ""}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch checked={c.active} onCheckedChange={() => toggleActive(c)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditCoupon(c)} title="Modifier">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setConfirmDelete(c)}
                          title="Supprimer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Modale création/édition */}
      <CouponFormDialog
        open={createOpen || !!editCoupon}
        onOpenChange={(v) => { if (!v) { setCreateOpen(false); setEditCoupon(null); } }}
        editing={editCoupon}
        offers={offers}
      />

      {/* Confirmation suppression */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce code promo ?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{confirmDelete?.code}</strong> sera supprimé définitivement.
              Les ventes déjà conclues avec ce code ne sont pas affectées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} className="bg-destructive text-destructive-foreground">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// ─── Modale création / édition d'un code promo ──────────────────────────
function CouponFormDialog({
  open,
  onOpenChange,
  editing,
  offers,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Coupon | null;
  offers: Offer[];
}) {
  const createCoupon = useCreateCoupon();
  const updateCoupon = useUpdateCoupon();
  const { toast } = useToast();
  const isEdit = !!editing;

  const [code, setCode] = useState("");
  const [type, setType] = useState<CouponDiscountType>("percent");
  const [percent, setPercent] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [selectedOfferIds, setSelectedOfferIds] = useState<string[]>([]);
  const [scope, setScope] = useState<"all" | "offers">("all");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Reset le form à chaque ouverture / changement de coupon édité
  useEffect(() => {
    if (editing) {
      setCode(editing.code);
      setType(editing.discount_type);
      setPercent(editing.discount_percent !== null ? String(editing.discount_percent) : "");
      setAmount(editing.discount_amount_eur !== null ? String(editing.discount_amount_eur) : "");
      setSelectedOfferIds(editing.applies_to_offer_ids ?? []);
      setScope(editing.applies_to_offer_ids && editing.applies_to_offer_ids.length > 0 ? "offers" : "all");
      setActive(editing.active);
    } else if (open) {
      setCode("");
      setType("percent");
      setPercent("");
      setAmount("");
      setSelectedOfferIds([]);
      setScope("all");
      setActive(true);
    }
  }, [open, editing]);

  function toggleOffer(id: string) {
    setSelectedOfferIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleSave() {
    if (!code.trim()) {
      toast({ title: "Code requis", variant: "destructive" });
      return;
    }
    if (type === "percent" && (!percent || Number(percent) <= 0 || Number(percent) > 100)) {
      toast({ title: "Pourcentage invalide (1-100)", variant: "destructive" });
      return;
    }
    if (type === "fixed_eur" && (!amount || Number(amount) <= 0)) {
      toast({ title: "Montant invalide", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        code: code.trim().toUpperCase(),
        discount_type: type,
        discount_percent: type === "percent" ? Number(percent) : null,
        discount_amount_eur: type === "fixed_eur" ? Number(amount) : null,
        applies_to_offer_ids: scope === "offers" && selectedOfferIds.length > 0 ? selectedOfferIds : null,
        applies_to_categories: null,
        active,
      } as const;
      if (isEdit && editing) {
        await updateCoupon.mutateAsync({ id: editing.id, ...payload });
        toast({ title: "Code modifié" });
      } else {
        await createCoupon.mutateAsync(payload);
        toast({ title: "Code créé" });
      }
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Échec", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier le code promo" : "Nouveau code promo"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Code</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="EX : AB1000"
              className="font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Type de réduction</Label>
            <Select value={type} onValueChange={(v) => setType(v as CouponDiscountType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">Pourcentage (-X%)</SelectItem>
                <SelectItem value="fixed_eur">Montant fixe (-X €)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === "percent" ? (
            <div className="space-y-1.5">
              <Label className="text-xs">Pourcentage</Label>
              <div className="flex items-center gap-2">
                <Input type="number" value={percent} onChange={(e) => setPercent(e.target.value)} placeholder="20" min="1" max="100" />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs">Montant fixe</Label>
              <div className="flex items-center gap-2">
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1000" min="1" />
                <span className="text-sm text-muted-foreground">€</span>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Applicable à</Label>
            <Select value={scope} onValueChange={(v) => setScope(v as "all" | "offers")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les offres</SelectItem>
                <SelectItem value="offers">Offres spécifiques</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {scope === "offers" && (
            <div className="space-y-1.5 max-h-48 overflow-y-auto rounded border border-border p-2">
              {offers.map((o) => (
                <label key={o.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-secondary/40 px-2 rounded">
                  <Checkbox checked={selectedOfferIds.includes(o.id)} onCheckedChange={() => toggleOffer(o.id)} />
                  <span className="text-sm">{o.label}</span>
                  <Badge variant="outline" className="ml-auto text-[10px]">{CATEGORY_LABEL[o.category]}</Badge>
                </label>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <Switch checked={active} onCheckedChange={setActive} />
            <span className="text-sm">Actif</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <Check className="h-3.5 w-3.5" />
            {isEdit ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

