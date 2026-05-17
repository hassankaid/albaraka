// CatalogueTab — onglet "Liens existants" du admin payment-links.
//
// Affiche toutes les offres officielles classées en 3 catégories :
// AL BARAKA · Liberty · À la carte (formations).
//
// Pour chaque offre, deux liens prêts à copier :
//   - Lien direct          → /checkout ou /liberty ou /checkout/formation/<slug>
//   - Lien différé (date)  → idem + ?start=YYYY-MM-DD (recycle le mécanisme
//     rebill : carte enregistrée maintenant, prélèvement + accès à la date)
//
// Le prix affiché est en lecture seule ici (édition dans l'onglet 2).

import { useState } from "react";
import { useOffers, type Offer, type OfferCategory } from "@/hooks/useOffers";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { getPublicAppOrigin } from "@/lib/impersonation";
import {
  Crown, Sparkles, GraduationCap, Copy, Calendar as CalendarIcon, Check, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Formatters ──────────────────────────────────────────────────────────
const eur = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

const ymd = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

// ─── URL builders ────────────────────────────────────────────────────────
function buildOfferPath(offer: Offer): string {
  if (offer.category === "al_baraka") return "/checkout";
  if (offer.category === "liberty") return "/liberty";
  // a_la_carte → /checkout/formation/<slug>
  return `/checkout/formation/${offer.slug}`;
}

function buildDirectUrl(offer: Offer): string {
  return `${getPublicAppOrigin()}${buildOfferPath(offer)}`;
}

function buildDeferredUrl(offer: Offer, startDate: Date): string {
  return `${getPublicAppOrigin()}${buildOfferPath(offer)}?start=${ymd(startDate)}`;
}

// ─── Métadonnées par catégorie ───────────────────────────────────────────
const CATEGORY_META: Record<OfferCategory, { label: string; icon: any; color: string }> = {
  al_baraka:  { label: "AL BARAKA",  icon: Crown,         color: "text-amber-500" },
  liberty:    { label: "Liberty",    icon: Sparkles,      color: "text-amber-400" },
  a_la_carte: { label: "À la carte", icon: GraduationCap, color: "text-blue-400" },
};

const CATEGORY_ORDER: OfferCategory[] = ["al_baraka", "liberty", "a_la_carte"];

// ─── Composant principal ────────────────────────────────────────────────
export default function CatalogueTab() {
  const { data: offers, isLoading } = useOffers();
  const { toast } = useToast();

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  async function copy(url: string, key: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
      toast({ title: "Lien copié" });
    } catch {
      toast({ title: "Copie impossible", variant: "destructive" });
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const offersByCategory: Record<OfferCategory, Offer[]> = {
    al_baraka: (offers ?? []).filter((o) => o.category === "al_baraka"),
    liberty: (offers ?? []).filter((o) => o.category === "liberty"),
    a_la_carte: (offers ?? []).filter((o) => o.category === "a_la_carte"),
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Liens prêts à copier pour les offres officielles. Pour modifier un prix
        ou gérer les codes promo, va dans l'onglet « Codes promo & tarifs ».
      </p>

      {CATEGORY_ORDER.map((cat) => {
        const list = offersByCategory[cat];
        if (list.length === 0) return null;
        const meta = CATEGORY_META[cat];
        const Icon = meta.icon;
        return (
          <Card key={cat} className="border-border/50">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Icon className={cn("h-5 w-5", meta.color)} />
                <h2 className="font-heading text-lg text-foreground">{meta.label}</h2>
                <Badge variant="outline" className="ml-auto text-[10px]">
                  {list.length} offre{list.length > 1 ? "s" : ""}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {list.map((offer) => (
                  <OfferRow
                    key={offer.id}
                    offer={offer}
                    copiedKey={copiedKey}
                    onCopy={copy}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ─── Carte par offre ────────────────────────────────────────────────────
function OfferRow({
  offer,
  copiedKey,
  onCopy,
}: {
  offer: Offer;
  copiedKey: string | null;
  onCopy: (url: string, key: string) => void;
}) {
  // Date par défaut = aujourd'hui + 30 jours (raisonnable pour un différé)
  const [deferredDate, setDeferredDate] = useState<Date | undefined>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d;
  });
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  const directUrl = buildDirectUrl(offer);
  const deferredUrl = deferredDate ? buildDeferredUrl(offer, deferredDate) : null;

  const directKey = `direct-${offer.id}`;
  const deferredKey = `deferred-${offer.id}`;

  // Les formations à la carte n'ont pas encore de page checkout dédiée
  // (à venir). En attendant, l'admin doit créer un lien personnalisé via
  // l'onglet "Liens personnalisés" avec le montant 500€.
  const aLaCarteNotReady = offer.category === "a_la_carte";

  return (
    <div className="rounded-lg border border-border/60 p-3 space-y-2 bg-card/50">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{offer.label}</p>
          <p className="text-xs text-muted-foreground">
            {eur(offer.default_price_ht)} HT
            {offer.max_installments_count > 1 && (
              <> · {offer.min_installments_count}× à {offer.max_installments_count}×</>
            )}
          </p>
        </div>
      </div>

      {aLaCarteNotReady ? (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/[0.04] p-2.5 text-[11px] text-amber-300 leading-relaxed">
          ⏳ Page checkout à la carte en cours de construction. En attendant,
          créer un <strong>lien personnalisé</strong> à 500 € via l'onglet
          dédié.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {/* Lien direct */}
          <Button
            variant="outline"
            size="sm"
            className="justify-start gap-2 text-xs h-8"
            onClick={() => onCopy(directUrl, directKey)}
          >
            {copiedKey === directKey ? (
              <Check className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            Copier le lien direct
          </Button>

          {/* Lien différé */}
          <div className="flex gap-2">
            <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8 shrink-0">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {deferredDate ? deferredDate.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={deferredDate}
                  onSelect={(d) => { setDeferredDate(d); setDatePopoverOpen(false); }}
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Button
              variant="outline"
              size="sm"
              className="justify-start gap-2 text-xs h-8 flex-1"
              disabled={!deferredUrl}
              onClick={() => deferredUrl && onCopy(deferredUrl, deferredKey)}
            >
              {copiedKey === deferredKey ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              Copier le lien différé
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
