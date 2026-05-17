// CatalogueTab — onglet "Liens existants" du admin payment-links.
//
// Affiche toutes les offres officielles classées en 3 catégories :
// AL BARAKA · Liberty · À la carte (formations).
//
// Pour AL BARAKA et Liberty :
//   - Sélecteur de mensualités (chips 1× à max_installments_count)
//   - Lien direct                → /checkout/N  ou  /liberty/N
//   - Lien différé (date picker) → idem + ?start=YYYY-MM-DD
//
// Pour les formations à la carte (one-shot 500€) :
//   - Pas de sélecteur de mensualités
//   - Lien direct                → /checkout/formation/<slug>
//   - Lien différé (date picker) → idem + ?start=YYYY-MM-DD
//
// Tous les liens héritent du toggle global ?test=1 (voir AdminPaymentLinks
// + payment-links-context). Une AlertDialog de confirmation s'ouvre à la
// PREMIÈRE copie en mode test pour éviter les erreurs (puis silencieuse
// pour le reste de la session, jusqu'au prochain toggle off).

import { useState } from "react";
import { useOffers, type Offer, type OfferCategory } from "@/hooks/useOffers";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getPublicAppOrigin } from "@/lib/impersonation";
import {
  Crown, Sparkles, GraduationCap, Copy, Calendar as CalendarIcon, Check, Loader2,
  FlaskConical, AlertTriangle, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePaymentLinksContext } from "./payment-links-context";

// ─── Formatters ──────────────────────────────────────────────────────────
const eur = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

const ymd = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

const formatDateShort = (d: Date) =>
  d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

// ─── URL builders ────────────────────────────────────────────────────────
type LinkVariant = "direct" | "deferred";

type LinkBuildOptions = {
  offer: Offer;
  installments: number;       // ignoré pour a_la_carte (toujours 1)
  testMode: boolean;
  startDate?: Date | null;    // si défini → variante "deferred"
};

function buildOfferPath(offer: Offer, installments: number): string {
  if (offer.category === "al_baraka") return `/checkout/${installments}`;
  if (offer.category === "liberty") return `/liberty/${installments}`;
  // a_la_carte → /checkout/formation/<slug>, paiement one-shot
  return `/checkout/formation/${offer.slug}`;
}

function buildUrl({ offer, installments, testMode, startDate }: LinkBuildOptions): string {
  const base = `${getPublicAppOrigin()}${buildOfferPath(offer, installments)}`;
  const params = new URLSearchParams();
  if (testMode) params.set("test", "1");
  if (startDate) params.set("start", ymd(startDate));
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

// ─── Métadonnées par catégorie ───────────────────────────────────────────
const CATEGORY_META: Record<OfferCategory, { label: string; icon: any; color: string; accent: string }> = {
  al_baraka:  { label: "AL BARAKA",  icon: Crown,         color: "text-amber-500",  accent: "from-amber-500/10 to-transparent" },
  liberty:    { label: "Liberty",    icon: Sparkles,      color: "text-amber-400",  accent: "from-amber-400/10 to-transparent" },
  a_la_carte: { label: "À la carte", icon: GraduationCap, color: "text-sky-400",    accent: "from-sky-400/10 to-transparent" },
};

const CATEGORY_ORDER: OfferCategory[] = ["al_baraka", "liberty", "a_la_carte"];

// ─── Composant principal ────────────────────────────────────────────────
export default function CatalogueTab() {
  const { data: offers, isLoading } = useOffers();
  const { toast } = useToast();
  const { testMode, testCopyConfirmedThisSession, markTestCopyConfirmed } = usePaymentLinksContext();

  // Quel lien attend confirmation pour être copié (null = pas en attente)
  const [pendingCopy, setPendingCopy] = useState<{ url: string; key: string } | null>(null);
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  async function performCopy(url: string, key: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
      toast({
        title: testMode ? "Lien TEST copié" : "Lien copié",
        description: testMode ? "Aucun paiement réel ne sera prélevé." : undefined,
      });
    } catch {
      toast({ title: "Copie impossible", variant: "destructive" });
    }
  }

  // Wrapper : si mode test et pas encore confirmé → ouvre la modale.
  // Sinon copie immédiatement.
  function requestCopy(url: string, key: string) {
    if (testMode && !testCopyConfirmedThisSession) {
      setPendingCopy({ url, key });
    } else {
      performCopy(url, key);
    }
  }

  function handleConfirmTestCopy() {
    if (!pendingCopy) return;
    if (dontAskAgain) markTestCopyConfirmed();
    performCopy(pendingCopy.url, pendingCopy.key);
    setPendingCopy(null);
    setDontAskAgain(false);
  }

  function handleCancelTestCopy() {
    setPendingCopy(null);
    setDontAskAgain(false);
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
        Choisis le nombre de mensualités (pour AL BARAKA et Liberty), puis
        copie le lien direct ou différé. Pour modifier un prix ou gérer les
        codes promo, va dans l'onglet «&nbsp;Codes promo & tarifs&nbsp;».
      </p>

      {CATEGORY_ORDER.map((cat) => {
        const list = offersByCategory[cat];
        if (list.length === 0) return null;
        const meta = CATEGORY_META[cat];
        const Icon = meta.icon;
        return (
          <Card key={cat} className="border-border/50 overflow-hidden relative">
            {/* Lueur discrète en haut, couleur de la catégorie */}
            <div className={cn("absolute inset-x-0 top-0 h-px bg-gradient-to-r", meta.accent)} />

            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <div className={cn("rounded-md bg-card/60 border border-border/60 p-1.5", meta.color)}>
                  <Icon className="h-4 w-4" />
                </div>
                <h2 className="font-heading text-lg text-foreground">{meta.label}</h2>
                <Badge variant="outline" className="ml-auto text-[10px]">
                  {list.length} offre{list.length > 1 ? "s" : ""}
                </Badge>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                {list.map((offer) => (
                  <OfferCard
                    key={offer.id}
                    offer={offer}
                    testMode={testMode}
                    copiedKey={copiedKey}
                    onRequestCopy={requestCopy}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* ─── Modale de confirmation mode test ─── */}
      <AlertDialog open={pendingCopy !== null} onOpenChange={(v) => !v && handleCancelTestCopy()}>
        <AlertDialogContent className="border-amber-500/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-300">
              <FlaskConical className="h-5 w-5" />
              Lien en MODE TEST
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-1">
              <span className="block text-foreground">
                Tu t'apprêtes à copier un lien qui utilise les clés Stripe de
                test. <strong className="text-amber-300">Aucun paiement réel ne sera prélevé.</strong>
              </span>
              <span className="block text-sm text-muted-foreground">
                Utilise ce lien uniquement pour tester le tunnel (carte
                <code className="mx-1 px-1 rounded bg-secondary/50 font-mono text-[11px]">4242 4242 4242 4242</code>
                par exemple). Ne l'envoie surtout pas à un vrai client : il
                penserait avoir payé sans qu'aucun débit n'ait lieu.
              </span>
              {pendingCopy && (
                <span className="block rounded-md border border-amber-500/30 bg-amber-500/[0.05] p-2 mt-2">
                  <code className="text-[11px] text-amber-200/90 font-mono break-all">
                    {pendingCopy.url}
                  </code>
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex items-center gap-2 px-1">
            <Checkbox
              id="dont-ask-again"
              checked={dontAskAgain}
              onCheckedChange={(v) => setDontAskAgain(v === true)}
            />
            <Label htmlFor="dont-ask-again" className="text-xs text-muted-foreground cursor-pointer">
              Ne plus me demander pour cette session
            </Label>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelTestCopy}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmTestCopy}
              className="bg-amber-500 hover:bg-amber-500/90 text-amber-950 gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              Oui, copier le lien test
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Carte par offre ────────────────────────────────────────────────────
function OfferCard({
  offer,
  testMode,
  copiedKey,
  onRequestCopy,
}: {
  offer: Offer;
  testMode: boolean;
  copiedKey: string | null;
  onRequestCopy: (url: string, key: string) => void;
}) {
  const hasInstallments = offer.max_installments_count > 1;

  // État local : mensualités sélectionnées + date différée + popover open
  const [installments, setInstallments] = useState<number>(
    hasInstallments ? offer.max_installments_count : 1,
  );
  const [deferredDate, setDeferredDate] = useState<Date | undefined>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d;
  });
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  const directUrl = buildUrl({ offer, installments, testMode, startDate: null });
  const deferredUrl = deferredDate
    ? buildUrl({ offer, installments, testMode, startDate: deferredDate })
    : null;

  // Clés pour distinguer les boutons (utiles pour l'animation Check)
  const directKey = `direct-${offer.id}-${installments}-${testMode ? "t" : "l"}`;
  const deferredKey = `deferred-${offer.id}-${installments}-${testMode ? "t" : "l"}-${
    deferredDate ? ymd(deferredDate) : "none"
  }`;

  // Pour l'affichage du sous-total quand mensualités
  const monthly = hasInstallments
    ? Math.round((offer.default_price_ht / installments) * 100) / 100
    : null;

  return (
    <div
      className={cn(
        "rounded-lg border p-3.5 space-y-3 transition-colors",
        "bg-card/50 hover:bg-card/70 border-border/60",
      )}
    >
      {/* En-tête : libellé + prix */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate">{offer.label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {eur(offer.default_price_ht)} HT
            {hasInstallments && (
              <> · {offer.min_installments_count}× à {offer.max_installments_count}×</>
            )}
            {!hasInstallments && offer.category === "a_la_carte" && <> · paiement unique</>}
          </p>
        </div>
        {testMode && (
          <Badge
            variant="outline"
            className="text-[9.5px] gap-1 border-amber-500/40 bg-amber-500/[0.06] text-amber-300 shrink-0"
          >
            <FlaskConical className="h-2.5 w-2.5" />
            TEST
          </Badge>
        )}
      </div>

      {/* Sélecteur de mensualités (uniquement si l'offre en a) */}
      {hasInstallments && (
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <Label className="text-[10.5px] uppercase tracking-wide text-muted-foreground">
              Mensualités
            </Label>
            {monthly && installments > 1 && (
              <span className="text-[10.5px] text-muted-foreground tabular-nums">
                ≈ {eur(monthly)} / mois
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {Array.from(
              { length: offer.max_installments_count - offer.min_installments_count + 1 },
              (_, i) => offer.min_installments_count + i,
            ).map((n) => {
              const selected = n === installments;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setInstallments(n)}
                  className={cn(
                    "h-7 min-w-[2.25rem] px-2 rounded-md text-xs font-medium tabular-nums",
                    "transition-all duration-150 border",
                    selected
                      ? "bg-primary text-primary-foreground border-primary shadow-sm scale-105"
                      : "bg-secondary/40 border-border/40 text-muted-foreground hover:text-foreground hover:border-border",
                  )}
                  aria-pressed={selected}
                >
                  {n}×
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Lien direct */}
      <LinkRow
        label="Lien direct"
        url={directUrl}
        copied={copiedKey === directKey}
        onCopy={() => onRequestCopy(directUrl, directKey)}
      />

      {/* Lien différé : date picker + bouton copier */}
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <Label className="text-[10.5px] uppercase tracking-wide text-muted-foreground">
            Lien différé
          </Label>
          <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="text-[10.5px] text-primary hover:text-primary/80 underline-offset-2 hover:underline flex items-center gap-1"
              >
                <CalendarIcon className="h-3 w-3" />
                {deferredDate ? formatDateShort(deferredDate) : "Choisir une date"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={deferredDate}
                onSelect={(d) => {
                  setDeferredDate(d);
                  setDatePopoverOpen(false);
                }}
                disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <LinkRow
          url={deferredUrl ?? ""}
          copied={copiedKey === deferredKey}
          onCopy={() => deferredUrl && onRequestCopy(deferredUrl, deferredKey)}
          disabled={!deferredUrl}
        />
      </div>
    </div>
  );
}

// ─── Ligne URL + bouton copier (réutilisé pour direct & différé) ─────────
function LinkRow({
  label,
  url,
  copied,
  onCopy,
  disabled = false,
}: {
  label?: string;
  url: string;
  copied: boolean;
  onCopy: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <Label className="text-[10.5px] uppercase tracking-wide text-muted-foreground">
          {label}
        </Label>
      )}
      <div
        className={cn(
          "group rounded-md border bg-background/60 p-1.5 flex items-center gap-1.5",
          disabled ? "border-border/30 opacity-50" : "border-border/60 hover:border-primary/30",
          "transition-colors",
        )}
      >
        <code
          className={cn(
            "flex-1 min-w-0 truncate text-[11px] font-mono text-muted-foreground px-1.5",
            !disabled && "group-hover:text-foreground transition-colors",
          )}
          title={url}
        >
          {url || "—"}
        </code>
        {/* Bouton "Ouvrir dans un nouvel onglet" pour preview rapide */}
        {!disabled && url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors shrink-0"
            title="Ouvrir dans un nouvel onglet"
            aria-label="Ouvrir le lien"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-6 px-2 text-[11px] gap-1 shrink-0",
            copied && "text-emerald-400",
          )}
          disabled={disabled}
          onClick={onCopy}
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" />
              Copié
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              Copier
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
