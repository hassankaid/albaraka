// PaymentLinkCheckout — page de paiement pour un lien sur mesure (/pay/:token).
//
// Le lien est créé par le CEO depuis /admin/payment-links. Il porte tout le
// contenu de la commande : produit / montant total / échéancier / acompte /
// démarrage différé. Cette page :
//   1. résout le token via la RPC lookup_payment_link
//   2. affiche le récap + un formulaire de coordonnées (pré-rempli si le lien
//      a un destinataire défini, vide sinon)
//   3. appelle create-payment-intent en mode "custom_link"
//   4. confirme le PaymentIntent / SetupIntent côté client
//
// Design : strictement identique aux autres checkouts (CheckoutCanvas + thème
// noir/or). Code de présentation volontairement autonome — on ne touche pas
// aux fichiers de paiement existants (RebillCheckout, etc.).

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import PhoneInput, { isValidPhoneNumber, getCountries } from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import "react-phone-number-input/style.css";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/al-baraka-logo-v2.png";
import { Lock, ShieldCheck, ChevronDown, AlertTriangle, Loader2 } from "lucide-react";
import CheckoutCanvas from "./CheckoutCanvas";
import { ScheduleBlock, formatEur, formatFrDate, todayPlusISO } from "./ScheduleBlock";

const THEME = {
  bg: "#0A0A0A",
  gold: "#C9A04E",
  goldBright: "#E4C57A",
  goldDim: "rgba(201,160,78,0.18)",
  goldLine: "rgba(201,160,78,0.28)",
  cream: "#F5F1E6",
  creamMuted: "rgba(245,241,230,0.62)",
  creamDim: "rgba(245,241,230,0.38)",
};

// formatEur, todayPlusISO, ScheduleBlock sont importes depuis ./ScheduleBlock
// (partages entre tous les checkouts). formatFrDate reste local car utilise
// uniquement par l'ancien badge du lookup.

const COUNTRY_NAMES: Intl.DisplayNames | null = (() => {
  try {
    return new Intl.DisplayNames(["fr"], { type: "region" });
  } catch {
    return null;
  }
})();

function countryName(iso: string): string {
  try {
    return COUNTRY_NAMES?.of(iso) || iso;
  } catch {
    return iso;
  }
}

const ALL_COUNTRIES: string[] = (() => {
  try {
    return getCountries()
      .slice()
      .sort((a, b) => countryName(a).localeCompare(countryName(b), "fr"));
  } catch {
    return ["FR", "BE", "CH", "DZ", "MA", "TN"];
  }
})();

function CountrySelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (iso: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else setQuery("");
  }, [open]);

  const filtered = useMemo(() => {
    if (!query.trim()) return ALL_COUNTRIES;
    const q = query.trim().toLowerCase();
    return ALL_COUNTRIES.filter(
      (iso) => countryName(iso).toLowerCase().includes(q) || iso.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          background: "rgba(255,255,255,0.02)",
          border: `1px solid ${THEME.goldDim}`,
          color: THEME.cream,
          padding: "13px 14px",
          borderRadius: 10,
          fontSize: 14,
          fontFamily: "inherit",
          textAlign: "left",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span>{countryName(value)}</span>
        <ChevronDown size={16} style={{ color: THEME.gold }} />
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "#141414",
            border: `1px solid ${THEME.goldLine}`,
            borderRadius: 10,
            zIndex: 50,
            overflow: "hidden",
            boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
          }}
        >
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un pays…"
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.03)",
              border: "none",
              borderBottom: `1px solid ${THEME.goldDim}`,
              color: THEME.cream,
              padding: "13px 14px",
              fontSize: 13,
              fontFamily: "inherit",
              outline: "none",
            }}
          />
          <div style={{ overflowY: "auto", maxHeight: 220 }}>
            {filtered.map((iso) => (
              <button
                key={iso}
                type="button"
                onClick={() => {
                  onChange(iso);
                  setOpen(false);
                }}
                style={{
                  width: "100%",
                  background: iso === value ? "rgba(201,160,78,0.12)" : "transparent",
                  border: "none",
                  color: THEME.cream,
                  padding: "11px 14px",
                  fontSize: 13,
                  fontFamily: "inherit",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                {countryName(iso)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface BillingFields {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  postal_code: string;
  city: string;
  country: string;
}

interface PaymentLinkLookup {
  link_id: string;
  product_label: string;
  total_amount: number;
  installments_count: number;
  deposit_amount: number | null;
  deferred_start_date: string | null;
  prefilled_full_name: string | null;
  prefilled_email: string | null;
  prefilled_phone: string | null;
  is_valid: boolean;
  reason: string | null;
  /** Sprint P : category attendue pour les coupons applicables a ce lien.
   *  - 'al_baraka' / 'liberty' pour les Pass differes
   *  - 'a_la_carte' pour les formations a la carte
   *  - null pour les liens custom CEO classiques (aucun coupon n'est applique) */
  expected_coupon_category: string | null;
}

// ─── Calcul de l'échéancier (logique unique, doit rester alignée avec
//     l'edge function create-payment-intent mode custom_link) ───
interface Schedule {
  /** Montant prélevé / autorisé aujourd'hui (0 si démarrage différé). */
  todayAmount: number;
  /** Montant des mensualités récurrentes (= 1re si tout égal). */
  monthly: number;
  /** Montant de la 1re mensualité (absorbe les centimes restants). */
  firstMonthly: number;
  /** Nombre total de prélèvements. */
  installments: number;
  isDeferred: boolean;
}

function computeSchedule(l: PaymentLinkLookup, discountEur: number = 0): Schedule {
  // Total net = total brut - discount (coupon promo applique). Si pas de coupon,
  // discountEur = 0 et le comportement est inchange.
  const total = Math.max(0.01, Number(l.total_amount) - discountEur);
  const isDeferred = !!l.deferred_start_date;
  const installments = l.installments_count;

  // Répartition égale, la 1re mensualité absorbe les centimes restants.
  const baseCents = Math.floor(Math.round(total * 100) / installments);
  const extraCents = Math.round(total * 100) - baseCents * installments;
  const monthly = baseCents / 100;
  const firstMonthly = (baseCents + extraCents) / 100;

  // Montant aujourd'hui :
  //  - différé → 0 (juste autorisation de la carte)
  //  - paiement unique → le total
  //  - échéancier immédiat → la 1re mensualité
  const todayAmount = isDeferred
    ? 0
    : installments === 1
      ? total
      : firstMonthly;

  return { todayAmount, monthly, firstMonthly, installments, isDeferred };
}

// Note : formatEur, formatFrDateShort, computeInstallmentDates et todayPlusISO
// sont maintenant exportés depuis ./ScheduleBlock.tsx (partagés entre les
// 3 checkouts). On garde uniquement formatFrDate ci-dessous car il est
// utilisé en interne pour le rendu condensé du lookup.

// Coupon state (Phase 1 : auto-applique depuis ?promo=, affichage discount UI)
type CouponState =
  | { status: "none" }
  | { status: "validating" }
  | { status: "applied"; code: string; discountType: "percent"; percent: number; discountEur: number }
  | { status: "applied"; code: string; discountType: "fixed_eur"; amountEur: number; discountEur: number }
  | { status: "invalid"; code: string; reason: string };

// ─── Page principale ────────────────────────────────────────────────────────
export default function PaymentLinkCheckout() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const testMode = searchParams.get("test") === "1";
  const urlPromoCode = searchParams.get("promo")?.trim().toUpperCase() || null;
  const token = (params.token || "").trim().toUpperCase();

  const [lookup, setLookup] = useState<PaymentLinkLookup | null>(null);
  const [lookupLoading, setLookupLoading] = useState(true);
  const [coupon, setCoupon] = useState<CouponState>({ status: "none" });

  useEffect(() => {
    if (!token) {
      setLookupLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.rpc("lookup_payment_link" as any, {
          p_token: token,
        });
        if (cancelled) return;
        if (error) {
          console.error("lookup_payment_link failed:", error);
          setLookup(null);
        } else if (Array.isArray(data) && data.length > 0) {
          setLookup(data[0] as PaymentLinkLookup);
        } else {
          setLookup(null);
        }
      } finally {
        if (!cancelled) setLookupLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // ── Validation du code promo (?promo=XXX) ──
  // Phase 1 : validation silencieuse cote client puis affichage du discount.
  // Source de verite finale = serveur (l'edge function reapplique la
  // validation et le targeting au moment du paiement).
  //
  // Sprint P (17/05/2026) : passe expected_coupon_category du lien pour que
  // la RPC verifie cote SQL que le coupon est applicable a ce produit. Si le
  // lien n'a pas de category attendue (lien CEO custom classique), on ne tente
  // meme pas de valider (aucun coupon ne s'applique sur ce type de lien).
  useEffect(() => {
    if (!urlPromoCode || !lookup || !lookup.is_valid) return;
    if (!lookup.expected_coupon_category) {
      // Lien custom CEO classique : pas de coupon applicable
      setCoupon({ status: "invalid", code: urlPromoCode, reason: "not_applicable_to_link" });
      return;
    }
    let cancelled = false;
    (async () => {
      setCoupon({ status: "validating" });
      try {
        const { data, error } = await supabase.rpc("validate_coupon" as any, {
          p_code: urlPromoCode,
          p_expected_category: lookup.expected_coupon_category,
        });
        if (cancelled) return;
        if (error || !data || !data.valid) {
          setCoupon({
            status: "invalid",
            code: urlPromoCode,
            reason: data?.reason || error?.message || "unknown",
          });
          return;
        }
        const total = Number(lookup.total_amount);
        if (data.discount_type === "percent") {
          const percent = Number(data.discount_percent) || 0;
          const discountEur = Math.round((total * percent) / 100 * 100) / 100;
          setCoupon({
            status: "applied",
            code: String(data.code),
            discountType: "percent",
            percent,
            discountEur,
          });
        } else if (data.discount_type === "fixed_eur") {
          const amountEur = Number(data.discount_amount_eur) || 0;
          // Cap au total - 0.01 pour rester > 0
          const discountEur = Math.min(amountEur, Math.max(0.01, total - 0.01));
          setCoupon({
            status: "applied",
            code: String(data.code),
            discountType: "fixed_eur",
            amountEur,
            discountEur,
          });
        }
      } catch (e) {
        if (cancelled) return;
        console.error("[PaymentLinkCheckout] coupon validation error:", e);
        setCoupon({ status: "invalid", code: urlPromoCode, reason: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [urlPromoCode, lookup]);

  // Discount applique (0 si pas de coupon ou coupon invalide)
  const discountEur = coupon.status === "applied" ? coupon.discountEur : 0;

  // ── Date de démarrage choisie par le client (mode différé uniquement) ──
  // Pré-remplie avec la date du lien (deferred_start_date) au chargement.
  // Le client peut la modifier dans une fenêtre [demain, today+180j].
  const [clientChosenStartDate, setClientChosenStartDate] = useState<string | null>(null);
  useEffect(() => {
    if (lookup?.is_valid && lookup.deferred_start_date) {
      // Pré-remplit avec la date du lien si pas encore défini par le client
      setClientChosenStartDate((prev) => prev ?? lookup.deferred_start_date);
    }
  }, [lookup]);

  // Date effective utilisée pour calculer le calendrier des prélèvements
  const effectiveStartDateIso =
    lookup?.deferred_start_date
      ? clientChosenStartDate || lookup.deferred_start_date
      : null;

  const minStartDate = useMemo(() => todayPlusISO(1), []);
  const maxStartDate = useMemo(() => todayPlusISO(180), []);

  const publishableKey = testMode
    ? import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_TEST
    : import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  const stripeKeyMissing = !publishableKey;

  const stripePromise = useMemo<Promise<Stripe | null>>(() => {
    if (!publishableKey) return Promise.resolve(null);
    return loadStripe(publishableKey);
  }, [publishableKey]);

  const schedule = lookup && lookup.is_valid ? computeSchedule(lookup, discountEur) : null;

  const elementsOptions = useMemo(() => {
    if (!lookup || !schedule) {
      return { mode: "payment" as const, amount: 100, currency: "eur" };
    }
    // Différé → SetupIntent (autorisation sans débit).
    // 1 paiement unique → "payment". N mensualités → "subscription".
    const mode = schedule.isDeferred
      ? ("setup" as const)
      : lookup.installments_count === 1
        ? ("payment" as const)
        : ("subscription" as const);
    return {
      mode,
      ...(mode === "setup"
        ? {}
        : { amount: Math.max(Math.round(schedule.todayAmount * 100), 100) }),
      currency: "eur",
      paymentMethodTypes: ["card"] as string[],
      appearance: {
        theme: "night" as const,
        variables: {
          colorPrimary: THEME.gold,
          colorBackground: "rgba(255,255,255,0.02)",
          colorText: THEME.cream,
          colorDanger: "#e15a5a",
          fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
          borderRadius: "10px",
          fontSizeBase: "14px",
          spacingUnit: "4px",
        },
        rules: {
          ".Input": {
            border: `1px solid ${THEME.goldDim}`,
            padding: "13px 14px",
            transition: "border-color 0.15s, box-shadow 0.15s",
          },
          ".Input:focus": {
            borderColor: THEME.gold,
            boxShadow: `0 0 0 3px rgba(201,160,78,0.15)`,
          },
          ".Label": {
            color: "rgba(245,241,230,0.55)",
            fontSize: "11px",
            letterSpacing: "0.12em",
            textTransform: "uppercase" as const,
            fontWeight: "500",
          },
          ".Tab": { border: `1px solid ${THEME.goldDim}`, padding: "13px 14px" },
          ".Tab--selected": { borderColor: THEME.gold, boxShadow: `0 0 0 1px ${THEME.gold}` },
        },
      },
    };
  }, [lookup, schedule]);

  // ─── États d'erreur ───
  if (stripeKeyMissing) {
    return (
      <ErrorScreen
        title="Configuration paiement manquante"
        message="Clé publique Stripe non configurée. Contactez le support."
      />
    );
  }

  if (lookupLoading) {
    return (
      <FullScreen>
        <Loader2 size={28} style={{ color: THEME.gold }} className="animate-spin" />
        <p style={{ color: THEME.creamMuted, fontSize: 13, marginTop: 14 }}>
          Vérification de votre lien…
        </p>
      </FullScreen>
    );
  }

  if (!lookup || !lookup.is_valid) {
    let title = "Lien invalide";
    let message =
      "Ce lien de paiement n'est plus valide. Contactez la personne qui vous l'a envoyé.";
    if (lookup?.reason === "already_paid") {
      title = "Paiement déjà effectué";
      message = "Ce lien a déjà été réglé. Aucune action supplémentaire n'est nécessaire.";
    } else if (lookup?.reason === "cancelled") {
      title = "Lien annulé";
      message = "Ce lien de paiement a été annulé. Contactez la personne qui vous l'a envoyé.";
    } else if (lookup?.reason === "not_found") {
      title = "Lien introuvable";
      message =
        "Le code de ce lien ne correspond à aucun paiement. Vérifiez que vous avez utilisé le bon lien.";
    }
    return <ErrorScreen title={title} message={message} />;
  }

  // ─── Affichage OK ───
  return (
    <div
      style={{
        minHeight: "100vh",
        background: THEME.bg,
        color: THEME.cream,
        position: "relative",
        overflow: "hidden",
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      <CheckoutCanvas />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          maxWidth: 480,
          margin: "0 auto",
          padding: "32px 20px 60px",
        }}
      >
        {/* Logo + en-tête */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <img
            src={logo}
            alt="AL BARAKA"
            style={{
              width: 80,
              height: 80,
              objectFit: "contain",
              marginBottom: 16,
              marginInline: "auto",
              display: "block",
              filter: "drop-shadow(0 0 20px rgba(201,160,78,0.18))",
            }}
          />
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: THEME.gold,
              marginBottom: 6,
            }}
          >
            {lookup.product_label}
          </div>
          {coupon.status === "applied" ? (
            <div>
              <div
                style={{
                  fontSize: 16,
                  color: THEME.creamDim,
                  textDecoration: "line-through",
                  marginBottom: 4,
                }}
              >
                {formatEur(Number(lookup.total_amount))}
              </div>
              <h1 style={{ fontSize: 30, fontWeight: 600, margin: 0, color: THEME.cream }}>
                {formatEur(Number(lookup.total_amount) - discountEur)}
              </h1>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 8,
                  padding: "5px 11px",
                  borderRadius: 999,
                  background: "rgba(74,222,128,0.1)",
                  border: "1px solid rgba(74,222,128,0.3)",
                  color: "#86efac",
                  fontSize: 11.5,
                  fontWeight: 500,
                  letterSpacing: "0.03em",
                }}
              >
                ✓ Code {coupon.code} appliqué : −{
                  coupon.discountType === "percent"
                    ? `${coupon.percent}%`
                    : formatEur(coupon.amountEur)
                }
              </div>
            </div>
          ) : (
            <h1 style={{ fontSize: 28, fontWeight: 600, margin: 0, color: THEME.cream }}>
              {formatEur(Number(lookup.total_amount))}
            </h1>
          )}
          {coupon.status === "invalid" && (
            <div
              style={{
                marginTop: 8,
                display: "inline-block",
                padding: "4px 10px",
                borderRadius: 999,
                background: "rgba(248,113,113,0.08)",
                border: "1px solid rgba(248,113,113,0.25)",
                color: "#fca5a5",
                fontSize: 10.5,
              }}
              title={`Reason: ${coupon.reason}`}
            >
              Code {coupon.code} invalide
            </div>
          )}
          <p
            style={{
              fontSize: 13,
              color: THEME.creamMuted,
              marginTop: 8,
              maxWidth: 380,
              marginInline: "auto",
              lineHeight: 1.5,
            }}
          >
            {schedule!.isDeferred
              ? lookup.installments_count === 1
                ? "Aucun prélèvement aujourd'hui. Votre carte est autorisée maintenant ; le débit aura lieu à la date ci-dessous."
                : `Aucun prélèvement aujourd'hui. Votre carte est autorisée maintenant ; ${lookup.installments_count} mensualités seront prélevées aux dates ci-dessous.`
              : lookup.installments_count === 1
                ? "Paiement en 1 fois aujourd'hui."
                : `Réglez en ${lookup.installments_count} mensualités à partir d'aujourd'hui.`}
          </p>
        </div>

        {/* ─── Calendrier de prélèvement (clair et précis) ─── */}
        <ScheduleBlock
          totalEur={Number(lookup.total_amount) - discountEur}
          installments={lookup.installments_count}
          isDeferred={schedule!.isDeferred}
          effectiveStartDateIso={effectiveStartDateIso}
          clientChosenStartDate={clientChosenStartDate}
          setClientChosenStartDate={setClientChosenStartDate}
          minStartDate={minStartDate}
          maxStartDate={maxStartDate}
        />

        <Elements stripe={stripePromise} options={elementsOptions}>
          <PaymentLinkForm
            token={token}
            testMode={testMode}
            lookup={lookup}
            schedule={schedule!}
            couponCode={coupon.status === "applied" ? coupon.code : null}
            clientChosenStartDate={
              // On ne passe la date au server QUE si elle a été modifiée
              // par le client (différente de celle du lien). Sinon null →
              // le server fallback sur link.deferred_start_date naturellement.
              lookup.deferred_start_date && clientChosenStartDate &&
              clientChosenStartDate !== lookup.deferred_start_date
                ? clientChosenStartDate
                : null
            }
          />
        </Elements>

        {/* Footer trust badges */}
        <div
          style={{
            marginTop: 24,
            display: "flex",
            justifyContent: "center",
            gap: 16,
            flexWrap: "wrap",
            color: THEME.creamDim,
            fontSize: 11,
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Lock size={11} /> Paiement sécurisé Stripe
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <ShieldCheck size={11} /> 3D Secure activé
          </span>
        </div>
      </div>
    </div>
  );
}

function FullScreen({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: THEME.bg,
        color: THEME.cream,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      {children}
    </div>
  );
}

function ErrorScreen({ title, message }: { title: string; message: string }) {
  return (
    <FullScreen>
      <AlertTriangle size={32} style={{ color: THEME.gold, marginBottom: 14 }} />
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12, textAlign: "center" }}>
        {title}
      </h1>
      <p
        style={{
          color: THEME.creamMuted,
          fontSize: 14,
          textAlign: "center",
          maxWidth: 440,
          lineHeight: 1.5,
        }}
      >
        {message}
      </p>
    </FullScreen>
  );
}

// Le composant ScheduleBlock est maintenant importe depuis ./ScheduleBlock.tsx
// (partage avec Checkout AL BARAKA et LibertyCheckout). Voir le fichier
// shared pour la logique d'affichage du calendrier + date picker.

// ─── Formulaire ─────────────────────────────────────────────────────────────
function PaymentLinkForm({
  token,
  testMode,
  lookup,
  schedule,
  couponCode,
  clientChosenStartDate,
}: {
  token: string;
  testMode: boolean;
  lookup: PaymentLinkLookup;
  schedule: Schedule;
  couponCode: string | null;
  clientChosenStartDate: string | null;
}) {
  const stripe = useStripe();
  const elements = useElements();

  // Pré-remplissage depuis le lien (si destinataire défini)
  const initialFirst = (lookup.prefilled_full_name || "").trim().split(/\s+/)[0] || "";
  const initialLast = (lookup.prefilled_full_name || "").trim().split(/\s+/).slice(1).join(" ");

  const [billing, setBilling] = useState<BillingFields>({
    first_name: initialFirst,
    last_name: initialLast,
    email: lookup.prefilled_email || "",
    phone: lookup.prefilled_phone || "",
    address: "",
    postal_code: "",
    city: "",
    country: "FR",
  });
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function onField<K extends keyof BillingFields>(k: K, v: string) {
    setBilling((b) => ({ ...b, [k]: v }));
  }

  function validateForm(): string | null {
    if (!billing.first_name.trim()) return "Prénom requis";
    if (!billing.last_name.trim()) return "Nom requis";
    if (!billing.email.trim() || !billing.email.includes("@")) return "Email invalide";
    if (!billing.phone.trim()) return "Téléphone requis";
    if (!isValidPhoneNumber(billing.phone)) return "Numéro de téléphone invalide";
    if (!billing.address.trim()) return "Adresse requise";
    if (!billing.postal_code.trim()) return "Code postal requis";
    if (!billing.city.trim()) return "Ville requise";
    if (!billing.country.trim()) return "Pays requis";
    if (!agreed) return "Vous devez confirmer votre paiement";
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) {
      toast.error("Stripe pas encore chargé, réessayez dans une seconde");
      return;
    }
    const err = validateForm();
    if (err) {
      toast.error(err);
      return;
    }

    setSubmitting(true);
    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        toast.error(submitError.message || "Erreur de validation du paiement");
        setSubmitting(false);
        return;
      }

      const fullName = `${billing.first_name.trim()} ${billing.last_name.trim()}`.trim();
      const { data, error: invokeError } = await supabase.functions.invoke<{
        client_secret: string;
        intent_id: string;
        intent_type: "payment" | "subscription" | "setup";
        amount_cents: number;
        error?: string;
      }>("create-payment-intent", {
        body: {
          product_type: "custom_link",
          payment_link_token: token,
          test_mode: testMode,
          coupon_code: couponCode || undefined,
          client_chosen_start_at: clientChosenStartDate || undefined,
          customer: {
            email: billing.email.trim().toLowerCase(),
            full_name: fullName,
            phone: billing.phone.trim(),
            address: billing.address.trim(),
            postal_code: billing.postal_code.trim(),
            city: billing.city.trim(),
            country: billing.country.trim(),
          },
        },
      });

      let result = data ?? null;
      if (invokeError) {
        const ctx = (invokeError as { context?: Response }).context;
        if (ctx && typeof ctx.json === "function") {
          try {
            result = await ctx.json();
          } catch {
            /* keep null */
          }
        }
      }
      if (!result?.client_secret) {
        const msg = result?.error || invokeError?.message || "Impossible de créer le paiement";
        toast.error(msg);
        setSubmitting(false);
        return;
      }

      const returnUrl = `${window.location.origin}/merci?pl=1${testMode ? "&test=1" : ""}`;

      const billingDetails = {
        name: fullName,
        email: billing.email.trim().toLowerCase(),
        phone: billing.phone.trim(),
        address: {
          line1: billing.address.trim(),
          line2: "",
          postal_code: billing.postal_code.trim(),
          city: billing.city.trim(),
          state: "",
          country: billing.country.trim(),
        },
      };

      const confirmRes =
        result.intent_type === "setup"
          ? await stripe.confirmSetup({
              elements,
              clientSecret: result.client_secret,
              confirmParams: {
                return_url: returnUrl,
                payment_method_data: { billing_details: billingDetails },
              },
            })
          : await stripe.confirmPayment({
              elements,
              clientSecret: result.client_secret,
              confirmParams: {
                return_url: returnUrl,
                payment_method_data: { billing_details: billingDetails },
              },
            });

      if (confirmRes.error) {
        toast.error(confirmRes.error.message || "Paiement refusé");
        setSubmitting(false);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur inconnue");
      setSubmitting(false);
    }
  }

  const labelStyle: React.CSSProperties = {
    color: "rgba(245,241,230,0.55)",
    fontSize: 11,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    fontWeight: 500,
    display: "block",
    marginBottom: 8,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "rgba(255,255,255,0.02)",
    border: `1px solid ${THEME.goldDim}`,
    color: THEME.cream,
    padding: "13px 14px",
    borderRadius: 10,
    fontSize: 14,
    fontFamily: "inherit",
    boxSizing: "border-box",
    outline: "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
  };

  // ── Sync : la date affichee dans le form (label submit + phrase "1er
  //         prelevement le X") doit suivre le client_chosen_start_date si
  //         le user a modifie la date dans le picker ScheduleBlock. Sinon
  //         retombe sur la date d'origine du lien.
  const effectiveStartDateForDisplay = clientChosenStartDate || lookup.deferred_start_date;
  const startDateFormatted = effectiveStartDateForDisplay
    ? formatFrDate(effectiveStartDateForDisplay)
    : null;
  const ctaLabel = submitting
    ? "Traitement…"
    : schedule.isDeferred
      ? "Autoriser ma carte"
      : `Payer ${formatEur(schedule.todayAmount)}`;

  return (
    <form
      onSubmit={onSubmit}
      style={{
        background: "rgba(20,20,20,0.6)",
        border: `1px solid ${THEME.goldLine}`,
        borderRadius: 16,
        padding: 24,
        backdropFilter: "blur(20px)",
        boxShadow: "0 30px 60px rgba(0,0,0,0.4)",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Récap */}
        <div
          style={{
            background: "rgba(201,160,78,0.06)",
            border: `1px solid ${THEME.goldDim}`,
            borderRadius: 12,
            padding: 14,
            fontSize: 13,
            color: THEME.cream,
            lineHeight: 1.6,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ color: THEME.creamMuted }}>Montant total</span>
            <strong style={{ color: THEME.goldBright }}>
              {formatEur(Number(lookup.total_amount))}
            </strong>
          </div>

          {schedule.isDeferred ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: THEME.creamMuted }}>Aujourd'hui</span>
                <strong style={{ color: "#7CD992" }}>0,00 €</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: THEME.creamMuted }}>
                  1er prélèvement le {startDateFormatted}
                </span>
                <strong>{formatEur(schedule.firstMonthly)}</strong>
              </div>
              {lookup.installments_count > 1 && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: THEME.creamMuted }}>
                    Puis {lookup.installments_count - 1} × tous les mois
                  </span>
                  <strong>{formatEur(schedule.monthly)}</strong>
                </div>
              )}
            </>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: THEME.creamMuted }}>Aujourd'hui</span>
                <strong>{formatEur(schedule.todayAmount)}</strong>
              </div>
              {lookup.installments_count > 1 && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: THEME.creamMuted }}>
                    Puis {lookup.installments_count - 1} × tous les mois
                  </span>
                  <strong>{formatEur(schedule.monthly)}</strong>
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}>Prénom</label>
            <input
              style={inputStyle}
              value={billing.first_name}
              onChange={(e) => onField("first_name", e.target.value)}
              autoComplete="given-name"
            />
          </div>
          <div>
            <label style={labelStyle}>Nom</label>
            <input
              style={inputStyle}
              value={billing.last_name}
              onChange={(e) => onField("last_name", e.target.value)}
              autoComplete="family-name"
            />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Email</label>
          <input
            style={inputStyle}
            type="email"
            value={billing.email}
            onChange={(e) => onField("email", e.target.value)}
            autoComplete="email"
          />
        </div>

        <div>
          <label style={labelStyle}>Téléphone</label>
          <PhoneInput
            international
            defaultCountry="FR"
            value={billing.phone}
            onChange={(v) => onField("phone", String(v ?? ""))}
            flags={flags}
            style={{ ...inputStyle, padding: "8px 12px", gap: 10 }}
            numberInputProps={{
              style: {
                background: "transparent",
                border: "none",
                color: THEME.cream,
                fontSize: 14,
                fontFamily: "inherit",
                outline: "none",
                width: "100%",
              },
            }}
          />
        </div>

        <div>
          <label style={labelStyle}>Adresse</label>
          <input
            style={inputStyle}
            value={billing.address}
            onChange={(e) => onField("address", e.target.value)}
            autoComplete="street-address"
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}>Code postal</label>
            <input
              style={inputStyle}
              value={billing.postal_code}
              onChange={(e) => onField("postal_code", e.target.value)}
              autoComplete="postal-code"
            />
          </div>
          <div>
            <label style={labelStyle}>Ville</label>
            <input
              style={inputStyle}
              value={billing.city}
              onChange={(e) => onField("city", e.target.value)}
              autoComplete="address-level2"
            />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Pays</label>
          <CountrySelect value={billing.country} onChange={(v) => onField("country", v)} />
        </div>

        <div style={{ height: 1, background: THEME.goldLine, margin: "8px 0" }} />

        <div>
          <label style={labelStyle}>Carte bancaire</label>
          <PaymentElement
            options={{ layout: "tabs", wallets: { applePay: "never", googlePay: "never" } }}
          />
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            fontSize: 12,
            color: THEME.creamMuted,
            cursor: "pointer",
            marginTop: 4,
          }}
        >
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            style={{ marginTop: 2, accentColor: THEME.gold }}
          />
          <span>
            {schedule.isDeferred ? (
              <>
                J'autorise l'enregistrement de ma carte aujourd'hui sans prélèvement immédiat. Le
                1er prélèvement aura lieu le{" "}
                <strong style={{ color: THEME.goldBright }}>{startDateFormatted}</strong> pour «&nbsp;
                {lookup.product_label}&nbsp;».
              </>
            ) : lookup.installments_count === 1 ? (
              <>
                J'autorise le débit unique de{" "}
                <strong style={{ color: THEME.goldBright }}>
                  {formatEur(schedule.todayAmount)}
                </strong>{" "}
                pour «&nbsp;{lookup.product_label}&nbsp;».
              </>
            ) : (
              <>
                J'autorise le débit immédiat de{" "}
                <strong style={{ color: THEME.goldBright }}>
                  {formatEur(schedule.todayAmount)}
                </strong>{" "}
                puis {lookup.installments_count - 1} prélèvement
                {lookup.installments_count > 2 ? "s" : ""} mensuel
                {lookup.installments_count > 2 ? "s" : ""} de{" "}
                <strong style={{ color: THEME.goldBright }}>{formatEur(schedule.monthly)}</strong>{" "}
                pour «&nbsp;{lookup.product_label}&nbsp;».
              </>
            )}
          </span>
        </label>

        <button
          type="submit"
          disabled={submitting}
          style={{
            background: `linear-gradient(135deg, ${THEME.gold}, ${THEME.goldBright})`,
            color: "#0A0A0A",
            border: "none",
            padding: "16px 24px",
            borderRadius: 12,
            fontSize: 15,
            fontWeight: 600,
            fontFamily: "inherit",
            cursor: submitting ? "not-allowed" : "pointer",
            opacity: submitting ? 0.6 : 1,
            transition: "transform 0.1s",
            boxShadow: "0 10px 25px rgba(201,160,78,0.25)",
          }}
        >
          {ctaLabel}
        </button>
      </div>
    </form>
  );
}
