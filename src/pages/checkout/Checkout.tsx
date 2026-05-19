import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import PhoneInput, {
  isValidPhoneNumber,
  getCountries,
  getCountryCallingCode,
} from "react-phone-number-input";
import type { Country } from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import "react-phone-number-input/style.css";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/al-baraka-logo-v2.png";
import { Lock, ShieldCheck, CheckCircle2, Tag, X, ArrowRight, ChevronDown } from "lucide-react";
import CheckoutCanvas from "./CheckoutCanvas";
import { EngagementChecklist } from "@/components/checkout/EngagementChecklist";
import { initAgreements, allAgreed, type AgreementItem } from "@/lib/checkout-agreements";

// Prix officiel Pass AL BARAKA (table public.offers, slug 'al-baraka').
// Modifiable depuis l'admin /admin/payment-links → onglet "Codes promo
// & tarifs" → édition inline du prix. La constante ici reste source de
// vérité de la page (la page ne lit pas la BDD pour rester légère et
// sécurisée), à synchroniser manuellement si Sidali modifie le prix BDD.
const TOTAL_EUR = 3000;

const THEME = {
  bg: "#0A0A0A",
  bgSoft: "#111111",
  gold: "#C9A04E",
  goldBright: "#E4C57A",
  goldDim: "rgba(201,160,78,0.18)",
  goldLine: "rgba(201,160,78,0.28)",
  cream: "#F5F1E6",
  creamMuted: "rgba(245,241,230,0.62)",
  creamDim: "rgba(245,241,230,0.38)",
};

function formatEur(n: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n);
}

const COUNTRY_NAMES: Intl.DisplayNames | null = (() => {
  try {
    return new Intl.DisplayNames(["fr"], { type: "region" });
  } catch {
    return null;
  }
})();

function countryName(iso: string): string {
  try {
    const n = COUNTRY_NAMES?.of(iso);
    return n || iso;
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
    return ["FR", "BE", "CH", "LU", "DZ", "MA", "TN", "SN", "CI", "CM", "US", "GB", "DE", "ES", "IT"];
  }
})();

/* ------------------------------------------------------------------
 * Sélecteur pays facturation (adresse)
 * ------------------------------------------------------------------ */
function CountrySearchSelect({
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
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
    }
  }, [open]);

  const filtered = useMemo(() => {
    if (!query.trim()) return ALL_COUNTRIES;
    const q = query.trim().toLowerCase();
    return ALL_COUNTRIES.filter(
      (iso) => countryName(iso).toLowerCase().includes(q) || iso.toLowerCase().includes(q),
    );
  }, [query]);

  const CurrentFlag = flags[value as keyof typeof flags];

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <button
        type="button"
        className="alb-field"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {CurrentFlag && (
            <span style={{ width: 22, height: 16, display: "inline-block" }}>
              <CurrentFlag title={countryName(value)} />
            </span>
          )}
          <span>{value ? countryName(value) : "Sélectionner un pays"}</span>
        </span>
        <ChevronDown size={14} style={{ opacity: 0.6 }} />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: THEME.bgSoft,
            border: `1px solid ${THEME.goldLine}`,
            borderRadius: 10,
            zIndex: 30,
            maxHeight: 300,
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 20px 50px rgba(0,0,0,0.6), 0 0 30px rgba(201,160,78,0.08)",
            overflow: "hidden",
          }}
        >
          <input
            ref={inputRef}
            type="text"
            placeholder="Rechercher un pays…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "none",
              borderBottom: `1px solid ${THEME.goldDim}`,
              color: THEME.cream,
              padding: "13px 14px",
              fontSize: 13,
              fontFamily: "inherit",
              outline: "none",
              width: "100%",
              boxSizing: "border-box",
            }}
          />
          <div style={{ overflowY: "auto", maxHeight: 240 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "14px 16px", fontSize: 13, color: THEME.creamDim }}>
                Aucun résultat
              </div>
            ) : (
              filtered.map((iso) => {
                const Flag = flags[iso as keyof typeof flags];
                const selected = iso === value;
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => {
                      onChange(iso);
                      setOpen(false);
                    }}
                    style={{
                      width: "100%",
                      background: selected ? "rgba(201,160,78,0.12)" : "transparent",
                      border: "none",
                      color: THEME.cream,
                      padding: "11px 14px",
                      fontSize: 13,
                      fontFamily: "inherit",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={(e) => {
                      if (!selected) e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                    }}
                    onMouseLeave={(e) => {
                      if (!selected) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    {Flag && (
                      <span style={{ width: 22, height: 16, display: "inline-block", flexShrink: 0 }}>
                        <Flag title={countryName(iso)} />
                      </span>
                    )}
                    <span>{countryName(iso)}</span>
                    <span style={{ marginLeft: "auto", color: THEME.creamDim, fontSize: 11 }}>{iso}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------
 * Sélecteur pays téléphone (indicatif)
 * ------------------------------------------------------------------ */
interface PhoneCountrySelectProps {
  value?: Country;
  onChange: (value?: Country) => void;
  options: Array<{ value?: Country; label: string; divider?: boolean }>;
  iconComponent: React.ComponentType<{ country: Country; label: string; aspectRatio?: number }>;
  disabled?: boolean;
  readOnly?: boolean;
}

function PhoneCountrySelect({
  value,
  onChange,
  options,
  iconComponent: Icon,
  disabled,
  readOnly,
}: PhoneCountrySelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else setQuery("");
  }, [open]);

  const filtered = useMemo(() => {
    const list = options.filter((o) => !o.divider && o.value);
    if (!query.trim()) return list;
    const q = query.trim().toLowerCase();
    return list.filter((o) => {
      const name = countryName(o.value as string);
      let dial = "";
      try {
        dial = getCountryCallingCode(o.value as Country);
      } catch {
        dial = "";
      }
      return (
        name.toLowerCase().includes(q) ||
        (o.value as string).toLowerCase().includes(q) ||
        dial.includes(q.replace(/\+/g, ""))
      );
    });
  }, [query, options]);

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <button
        type="button"
        disabled={disabled || readOnly}
        onClick={() => setOpen((v) => !v)}
        style={{
          background: "transparent",
          border: "none",
          color: THEME.cream,
          padding: "4px 8px 4px 0",
          cursor: disabled || readOnly ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 14,
          fontFamily: "inherit",
          minHeight: 36,
        }}
      >
        {value ? (
          <span style={{ width: 22, height: 16, display: "inline-block" }}>
            <Icon country={value} label={countryName(value)} />
          </span>
        ) : (
          <span style={{ fontSize: 12, color: THEME.creamDim }}>🌐</span>
        )}
        <ChevronDown size={12} style={{ opacity: 0.6 }} />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            minWidth: 300,
            background: THEME.bgSoft,
            border: `1px solid ${THEME.goldLine}`,
            borderRadius: 10,
            zIndex: 30,
            maxHeight: 300,
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 20px 50px rgba(0,0,0,0.6), 0 0 30px rgba(201,160,78,0.08)",
            overflow: "hidden",
          }}
        >
          <input
            ref={inputRef}
            type="text"
            placeholder="Rechercher un pays…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "none",
              borderBottom: `1px solid ${THEME.goldDim}`,
              color: THEME.cream,
              padding: "13px 14px",
              fontSize: 13,
              fontFamily: "inherit",
              outline: "none",
              width: "100%",
              boxSizing: "border-box",
            }}
          />
          <div style={{ overflowY: "auto", maxHeight: 240 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "14px 16px", fontSize: 13, color: THEME.creamDim }}>
                Aucun résultat
              </div>
            ) : (
              filtered.map((o) => {
                const iso = o.value as Country;
                const selected = iso === value;
                let dial = "";
                try {
                  dial = getCountryCallingCode(iso);
                } catch {
                  dial = "";
                }
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => {
                      onChange(iso);
                      setOpen(false);
                    }}
                    style={{
                      width: "100%",
                      background: selected ? "rgba(201,160,78,0.12)" : "transparent",
                      border: "none",
                      color: THEME.cream,
                      padding: "11px 14px",
                      fontSize: 13,
                      fontFamily: "inherit",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => {
                      if (!selected) e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                    }}
                    onMouseLeave={(e) => {
                      if (!selected) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <span style={{ width: 22, height: 16, display: "inline-block", flexShrink: 0 }}>
                      <Icon country={iso} label={countryName(iso)} />
                    </span>
                    <span style={{ flex: 1 }}>{countryName(iso)}</span>
                    <span style={{ color: THEME.gold, fontSize: 12 }}>+{dial}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------
 * Types
 * ------------------------------------------------------------------ */
// Support des deux types de réduction :
//   - 'percent'   → discount_percent (ex. -20%)
//   - 'fixed_eur' → discount_amount_eur (ex. -1000€, cas du code AB1000)
type CouponState =
  | { status: "idle" }
  | { status: "validating" }
  | { status: "valid"; code: string; discountType: "percent"; percent: number }
  | { status: "valid"; code: string; discountType: "fixed_eur"; amountEur: number }
  | { status: "invalid"; reason: string };

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

/* ------------------------------------------------------------------
 * Header — logo + titre, épuré
 * ------------------------------------------------------------------ */
function PaymentHeader({ installments }: { installments: number }) {
  const planLabel =
    installments === 1 ? "Paiement comptant" : `Paiement en ${installments} fois`;

  return (
    <div style={{ textAlign: "center", marginBottom: 40, position: "relative" }}>
      {/* Halo doré derrière le logo, discret et statique (pas d'animation bruyante) */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: -20,
          left: "50%",
          transform: "translateX(-50%)",
          width: 260,
          height: 260,
          background: "radial-gradient(circle, rgba(201,160,78,0.14) 0%, transparent 60%)",
          filter: "blur(20px)",
          pointerEvents: "none",
        }}
      />

      <div
        className="alb-logo-ring"
        style={{
          width: 72,
          height: 72,
          margin: "0 auto 22px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(201,160,78,0.12) 0%, rgba(10,10,10,0.9) 72%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <img
          src={logo}
          alt="Al Baraka"
          style={{
            width: 58,
            height: 58,
            objectFit: "contain",
            filter: "drop-shadow(0 0 10px rgba(201,160,78,0.4))",
          }}
        />
      </div>

      <h1
        className="alb-title-gradient"
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: "clamp(30px, 5.5vw, 38px)",
          fontWeight: 500,
          margin: 0,
          letterSpacing: "0.14em",
          lineHeight: 1.1,
          filter: "drop-shadow(0 2px 12px rgba(201,160,78,0.3))",
        }}
      >
        PASS AL BARAKA
      </h1>

      <div
        style={{
          marginTop: 10,
          fontSize: 10.5,
          color: THEME.gold,
          letterSpacing: "0.32em",
          fontWeight: 500,
        }}
      >
        ÉCOSYSTÈME · BY ETHICARENA
      </div>

      <div
        style={{
          marginTop: 18,
          fontSize: 12,
          color: THEME.creamMuted,
          letterSpacing: "0.08em",
        }}
      >
        {planLabel}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
 * Checkout — wrapper Stripe Elements
 * ------------------------------------------------------------------ */
export default function Checkout() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const testMode = searchParams.get("test") === "1";

  const parsedInstallments = Number(params.installments);
  const installments =
    Number.isInteger(parsedInstallments) && parsedInstallments >= 1 && parsedInstallments <= 8
      ? parsedInstallments
      : 1;

  // ── Mode différé (Sprint L) ─────────────────────────────────────────────
  // Si l'URL contient ?start=YYYY-MM-DD, on bascule sur le flow /pay/<token>
  // (qui supporte parfaitement le mode différé via Sprint K) via la RPC
  // create_pass_payment_link. Cela évite de dupliquer toute la logique
  // différée dans Checkout.tsx (gros refactor edge function + webhook).
  //
  // Le client voit brièvement un loader puis arrive sur /pay/<token> avec
  // le calendrier complet (toutes les dates) + date picker éditable.
  const navigate = useNavigate();
  const startParam = searchParams.get("start");
  const isDeferredRequest =
    !!startParam && /^\d{4}-\d{2}-\d{2}$/.test(startParam);
  const deferredRedirectRef = useRef(false);
  const [deferredRedirecting, setDeferredRedirecting] = useState(isDeferredRequest);
  const [deferredError, setDeferredError] = useState<string | null>(null);

  useEffect(() => {
    if (!isDeferredRequest || deferredRedirectRef.current) return;
    deferredRedirectRef.current = true;
    (async () => {
      try {
        const { data, error: rpcErr } = await supabase.rpc(
          "create_pass_payment_link" as any,
          {
            p_pass_slug: "al-baraka",
            p_installments: installments,
            p_deferred_start: startParam,
          },
        );
        if (rpcErr) throw rpcErr;
        const result = data as { success?: boolean; token?: string; error?: string };
        if (result?.success && result.token) {
          const target = `/pay/${result.token}${testMode ? "?test=1" : ""}`;
          navigate(target, { replace: true });
        } else {
          console.error("[checkout-defer] RPC error:", result);
          setDeferredError(result?.error || "rpc_failed");
          setDeferredRedirecting(false);
        }
      } catch (e: any) {
        console.error("[checkout-defer] fatal:", e);
        setDeferredError(e?.message || "unexpected_error");
        setDeferredRedirecting(false);
      }
    })();
  }, [isDeferredRequest, installments, startParam, testMode, navigate]);

  // Lookup payment_code (acompte déjà versé) si le lien personnalisé contient
  // ?code=ALB-XXXXXX. On affiche un bandeau "Acompte déjà versé" et on déduit
  // automatiquement le montant des acomptes du solde à régler.
  const paymentCode = (searchParams.get("code") || "").trim().toUpperCase() || null;
  const [acompteLookup, setAcompteLookup] = useState<{
    contact_id: string | null;
    email: string | null;
    full_name: string | null;
    phone: string | null;
    acompte_total: number;
    acompte_count: number;
  } | null>(null);
  const [lookupLoading, setLookupLoading] = useState(!!paymentCode);

  useEffect(() => {
    if (!paymentCode) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.rpc("lookup_payment_code", { p_code: paymentCode });
        if (cancelled) return;
        if (Array.isArray(data) && data.length > 0) {
          const row = data[0] as {
            contact_id: string;
            email: string | null;
            full_name: string | null;
            phone: string | null;
            acompte_total: number;
            acompte_count: number;
          };
          setAcompteLookup({
            contact_id: row.contact_id,
            email: row.email,
            full_name: row.full_name,
            phone: row.phone,
            acompte_total: Number(row.acompte_total ?? 0),
            acompte_count: Number(row.acompte_count ?? 0),
          });
        }
      } catch (e) {
        console.error("lookup_payment_code failed:", e);
      } finally {
        if (!cancelled) setLookupLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [paymentCode]);

  const acompteTotal = acompteLookup?.acompte_total ?? 0;

  const missingKeyName = testMode ? "VITE_STRIPE_PUBLISHABLE_KEY_TEST" : "VITE_STRIPE_PUBLISHABLE_KEY";
  const publishableKey = testMode
    ? import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_TEST
    : import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  const stripeKeyMissing = !publishableKey;

  const stripePromise = useMemo<Promise<Stripe | null>>(() => {
    if (!publishableKey) {
      console.error(`Clé publique Stripe manquante (${missingKeyName})`);
      return Promise.resolve(null);
    }
    return loadStripe(publishableKey);
  }, [publishableKey, missingKeyName]);

  const [coupon, setCoupon] = useState<CouponState>({ status: "idle" });
  // Calcul du discount selon le type (percent ou fixed_eur)
  const totalAfterDiscount = (() => {
    if (coupon.status !== "valid") return TOTAL_EUR;
    if (coupon.discountType === "percent") {
      return Math.round((TOTAL_EUR * (100 - coupon.percent)) / 100 * 100) / 100;
    }
    // fixed_eur : on déduit le montant en € (jamais en dessous de 0)
    return Math.max(0, Math.round((TOTAL_EUR - coupon.amountEur) * 100) / 100);
  })();
  // Compat affichage : pourcentage équivalent (utilisé par le panneau de prix)
  const discountPercent = coupon.status === "valid" && coupon.discountType === "percent" ? coupon.percent : 0;
  // Solde réel à payer après déduction des acomptes
  const payableTotal = Math.max(totalAfterDiscount - acompteTotal, 0);

  const elementsOptions = useMemo(
    () => ({
      mode: (installments === 1 ? "payment" : "subscription") as "payment" | "subscription",
      amount: Math.round(payableTotal * 100),
      currency: "eur",
      // ⚠ IMPORTANT : doit matcher payment_method_types côté backend
      // (create-payment-intent → "payment_method_types[0]": "card").
      //
      // Sans cette ligne, Elements démarre en mode "automatic" et propose les
      // méthodes activées sur le dashboard Stripe (Link, Klarna, SEPA…),
      // ce qui crée un mismatch au confirm avec le PaymentIntent forcé sur
      // "card" et déclenche l'erreur :
      //   "Payment details were collected through Stripe elements using
      //    automatic payment methods and cannot be confirmed through the
      //    API configured with payment method types..."
      //
      // Bug observé en LIVE uniquement (TEST n'a souvent que card activé).
      // Apple Pay / Google Pay sont déjà désactivés via wallets:never sur
      // le PaymentElement (lignes ~1204).
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
          ".Tab": {
            border: `1px solid ${THEME.goldDim}`,
            padding: "13px 14px",
          },
          ".Tab--selected": {
            borderColor: THEME.gold,
            boxShadow: `0 0 0 1px ${THEME.gold}`,
          },
        },
      },
    }),
    [installments, payableTotal],
  );

  // ── Mode différé : si redirect en cours, on affiche un loader propre ────
  // (early return APRÈS tous les hooks, pour respecter les règles React)
  if (deferredRedirecting) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: THEME.bg,
          color: THEME.cream,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          padding: 24,
          fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
        }}
      >
        <img src={logo} alt="AL BARAKA" style={{ width: 64, height: 64, marginBottom: 20, opacity: 0.9 }} />
        <div style={{ fontSize: 14, color: THEME.creamMuted, marginBottom: 8, letterSpacing: "0.1em" }}>
          Pass AL BARAKA — {installments} mensualités
        </div>
        <div style={{ fontSize: 22, color: THEME.cream, fontFamily: "'Cormorant Garamond', serif", marginBottom: 14 }}>
          Préparation du paiement différé…
        </div>
        <div style={{ fontSize: 13, color: THEME.creamMuted }}>
          Redirection vers le tunnel sécurisé dans un instant.
        </div>
      </div>
    );
  }
  if (deferredError) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: THEME.bg,
          color: THEME.cream,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          padding: 24,
          textAlign: "center",
          fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
        }}
      >
        <div style={{ fontSize: 22, color: "#fca5a5", marginBottom: 14, fontFamily: "'Cormorant Garamond', serif" }}>
          Impossible de préparer le paiement différé
        </div>
        <div style={{ fontSize: 13, color: THEME.creamMuted, marginBottom: 8 }}>
          Code d'erreur : <code style={{ color: "#fcd34d" }}>{deferredError}</code>
        </div>
        <div style={{ fontSize: 12, color: THEME.creamDim }}>
          Contactez le support ou utilisez le lien sans la date différée.
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: THEME.bg,
        color: THEME.cream,
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: "4rem 1.25rem 3rem",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes alb-fade-up {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes alb-spin { to { transform: rotate(360deg); } }
        @keyframes alb-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes alb-shine-sweep {
          0% { transform: translateX(-120%) skewX(-20deg); }
          100% { transform: translateX(220%) skewX(-20deg); }
        }
        @keyframes alb-border-glow {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }

        .alb-fade { animation: alb-fade-up 0.7s ease-out both; }
        .alb-fade-2 { animation: alb-fade-up 0.7s ease-out 0.1s both; }

        /* Titre gradient or */
        .alb-title-gradient {
          background: linear-gradient(180deg, #F5F1E6 0%, #E4C57A 50%, #C9A04E 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
          text-shadow: none;
        }

        /* Field = style unifié pour tous les inputs et selects */
        .alb-field {
          background: rgba(255,255,255,0.025);
          border: 1px solid ${THEME.goldDim};
          color: ${THEME.cream};
          padding: 13px 14px;
          border-radius: 10px;
          font-size: 14px;
          font-family: inherit;
          box-sizing: border-box;
          width: 100%;
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
          outline: none;
        }
        .alb-field::placeholder { color: ${THEME.creamDim}; }
        .alb-field:hover { border-color: ${THEME.goldLine}; }
        .alb-field:focus {
          border-color: ${THEME.gold};
          background: linear-gradient(180deg, rgba(201,160,78,0.04) 0%, rgba(201,160,78,0.01) 100%);
          box-shadow:
            0 0 0 3px rgba(201,160,78,0.14),
            0 0 20px rgba(201,160,78,0.12);
        }

        /* Section label */
        .alb-section-label {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 10.5px;
          font-weight: 600;
          letter-spacing: 0.22em;
          color: ${THEME.gold};
          text-transform: uppercase;
          margin-bottom: 14px;
        }
        .alb-section-label::after {
          content: "";
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, ${THEME.goldDim}, transparent);
        }

        /* Checkbox */
        .alb-checkbox { accent-color: ${THEME.gold}; }

        /* Card prix : bordure shimmer subtile */
        .alb-price-card {
          position: relative;
          padding: 22px 22px;
          border-radius: 14px;
          background:
            linear-gradient(180deg, rgba(201,160,78,0.07) 0%, rgba(201,160,78,0.015) 100%),
            ${THEME.bg};
          overflow: hidden;
          box-shadow:
            inset 0 1px 0 rgba(228,197,122,0.12),
            0 10px 30px rgba(0,0,0,0.35),
            0 0 0 1px rgba(201,160,78,0.22);
        }
        /* Bordure supérieure animée */
        .alb-price-card::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: 14px;
          padding: 1px;
          background: linear-gradient(
            110deg,
            transparent 20%,
            rgba(228,197,122,0.7) 45%,
            rgba(228,197,122,0.95) 50%,
            rgba(228,197,122,0.7) 55%,
            transparent 80%
          );
          background-size: 200% 100%;
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          opacity: 0.65;
          animation: alb-shimmer 6s linear infinite;
          pointer-events: none;
        }
        /* Coins discrets (4 micro-L dorés) */
        .alb-price-card-corner {
          position: absolute;
          width: 10px;
          height: 10px;
          border: 1px solid ${THEME.gold};
          opacity: 0.6;
          pointer-events: none;
        }

        /* Bouton primaire — gradient + shine sweep + glow respirant */
        .alb-submit {
          position: relative;
          width: 100%;
          background: linear-gradient(180deg, #E8C47A 0%, ${THEME.gold} 50%, #B28840 100%);
          color: #1a1200;
          border: none;
          border-radius: 12px;
          padding: 18px 22px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          letter-spacing: 0.14em;
          font-family: inherit;
          transition: transform 0.18s, box-shadow 0.3s, filter 0.18s;
          box-shadow:
            0 1px 0 rgba(255,255,255,0.3) inset,
            0 -1px 0 rgba(0,0,0,0.15) inset,
            0 0 0 1px ${THEME.gold},
            0 8px 24px rgba(201,160,78,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          overflow: hidden;
          isolation: isolate;
        }
        /* Shine sweep au hover */
        .alb-submit::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 60%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255,255,255,0.5) 50%,
            transparent 100%
          );
          transform: translateX(-120%) skewX(-20deg);
          pointer-events: none;
          z-index: 1;
        }
        .alb-submit:hover:not(:disabled)::before {
          animation: alb-shine-sweep 0.9s ease-out;
        }
        .alb-submit > * { position: relative; z-index: 2; }
        .alb-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          filter: brightness(1.05);
          box-shadow:
            0 1px 0 rgba(255,255,255,0.35) inset,
            0 -1px 0 rgba(0,0,0,0.12) inset,
            0 0 0 1px ${THEME.goldBright},
            0 16px 48px rgba(201,160,78,0.55);
        }
        .alb-submit:active:not(:disabled) { transform: translateY(0); }
        .alb-submit:disabled { opacity: 0.5; cursor: not-allowed; }
        .alb-submit .alb-arrow { transition: transform 0.3s; }
        .alb-submit:hover:not(:disabled) .alb-arrow { transform: translateX(5px); }

        /* Bouton secondaire (code promo) */
        .alb-btn-ghost {
          background: transparent;
          border: 1px solid ${THEME.goldLine};
          color: ${THEME.gold};
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 12px;
          letter-spacing: 0.14em;
          font-weight: 500;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
          white-space: nowrap;
        }
        .alb-btn-ghost:hover:not(:disabled) {
          background: rgba(201,160,78,0.08);
          border-color: ${THEME.gold};
          box-shadow: 0 0 16px rgba(201,160,78,0.15);
        }
        .alb-btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }

        /* react-phone-number-input override */
        .alb-phone .PhoneInput {
          display: flex;
          align-items: stretch;
          gap: 4px;
          background: rgba(255,255,255,0.025);
          border: 1px solid ${THEME.goldDim};
          border-radius: 10px;
          padding: 0 14px 0 12px;
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
        }
        .alb-phone .PhoneInput:focus-within {
          border-color: ${THEME.gold};
          background: linear-gradient(180deg, rgba(201,160,78,0.04) 0%, rgba(201,160,78,0.01) 100%);
          box-shadow:
            0 0 0 3px rgba(201,160,78,0.14),
            0 0 20px rgba(201,160,78,0.12);
        }
        .alb-phone .PhoneInputCountry {
          display: flex;
          align-items: center;
          border-right: 1px solid ${THEME.goldDim};
          padding-right: 10px;
          margin-right: 6px;
        }
        .alb-phone .PhoneInputInput {
          background: transparent !important;
          border: none !important;
          color: ${THEME.cream} !important;
          font-size: 14px;
          font-family: inherit;
          padding: 13px 0 !important;
          width: 100%;
          outline: none !important;
          box-shadow: none !important;
          min-width: 0;
          flex: 1;
        }
        .alb-phone .PhoneInputInput::placeholder { color: ${THEME.creamDim}; }

        /* Trust badges */
        .alb-trust {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: ${THEME.creamMuted};
          letter-spacing: 0.1em;
        }
      `}</style>
      <CheckoutCanvas />

      <div style={{ maxWidth: 440, margin: "0 auto", position: "relative", zIndex: 2 }}>
        {stripeKeyMissing && (
          <div
            style={{
              marginBottom: 24,
              padding: "14px 16px",
              background: "rgba(225, 90, 90, 0.1)",
              border: "1px solid rgba(225, 90, 90, 0.5)",
              borderRadius: 10,
              color: "#ff9999",
              fontSize: 12,
              textAlign: "center",
            }}
          >
            ⚠ Clé publique Stripe non configurée côté Vercel (<code>{missingKeyName}</code>).
          </div>
        )}
        {testMode && (
          <div
            style={{
              marginBottom: 24,
              padding: "12px 16px",
              background: "rgba(255, 180, 0, 0.08)",
              border: "1px solid rgba(255, 180, 0, 0.4)",
              borderRadius: 10,
              color: "#FFB400",
              fontSize: 11.5,
              textAlign: "center",
              fontFamily: "monospace",
              letterSpacing: "0.05em",
            }}
          >
            ⚠ MODE TEST — carte 4242 4242 4242 4242, aucun débit réel
          </div>
        )}

        <div className="alb-fade">
          <PaymentHeader installments={installments} />
        </div>

        <div className="alb-fade-2">
          <Elements stripe={stripePromise} options={elementsOptions}>
            <CheckoutForm
              installments={installments}
              testMode={testMode}
              coupon={coupon}
              setCoupon={setCoupon}
              totalAfterDiscount={totalAfterDiscount}
              paymentCode={paymentCode}
              acompteTotal={acompteTotal}
              acompteCount={acompteLookup?.acompte_count ?? 0}
              prefilledEmail={acompteLookup?.email ?? null}
              prefilledFullName={acompteLookup?.full_name ?? null}
              prefilledPhone={acompteLookup?.phone ?? null}
              lookupLoading={lookupLoading}
              urlPromoCode={(searchParams.get("promo") || "").trim().toUpperCase() || null}
            />
          </Elements>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
 * Le vrai formulaire
 * ------------------------------------------------------------------ */
interface FormProps {
  installments: number;
  testMode: boolean;
  coupon: CouponState;
  setCoupon: (c: CouponState) => void;
  totalAfterDiscount: number;
  paymentCode?: string | null;
  acompteTotal?: number;
  acompteCount?: number;
  prefilledEmail?: string | null;
  prefilledFullName?: string | null;
  prefilledPhone?: string | null;
  lookupLoading?: boolean;
  /** Code promo passé via l'URL `?promo=AB1000` — auto-appliqué au mount */
  urlPromoCode?: string | null;
}

function CheckoutForm({
  installments,
  testMode,
  coupon,
  setCoupon,
  totalAfterDiscount,
  paymentCode = null,
  acompteTotal = 0,
  acompteCount = 0,
  prefilledEmail = null,
  prefilledFullName = null,
  prefilledPhone = null,
  lookupLoading = false,
  urlPromoCode = null,
}: FormProps) {
  const stripe = useStripe();
  const elements = useElements();

  const [billing, setBilling] = useState<BillingFields>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    address: "",
    postal_code: "",
    city: "",
    country: "FR",
  });

  const [couponInput, setCouponInput] = useState("");
  const [couponOpen, setCouponOpen] = useState(false);
  // Refonte Sidali 19/05/2026 : 5 cases d'engagement (cf. CONSIGNES_IMPLEMENTATION).
  // Le bouton « Payer » est désactivé tant qu'elles ne sont pas TOUTES cochées.
  // Le snapshot horodaté est transmis au backend pour traçabilité juridique.
  const [agreements, setAgreements] = useState<AgreementItem[]>(() => initAgreements("PASS AL BARAKA"));
  const [submitting, setSubmitting] = useState(false);

  const discountPercent = coupon.status === "valid" ? coupon.percent : 0;
  // Solde à régler : prix après remise − acompte déjà versé
  const payableTotal = Math.max(totalAfterDiscount - acompteTotal, 0);
  const perInstallment = Math.round((payableTotal / installments) * 100) / 100;

  // Pré-remplissage des champs depuis le lookup payment_code (acompte existant)
  // Effectué une seule fois quand les données arrivent (ne pas écraser une saisie utilisateur).
  useEffect(() => {
    if (!prefilledEmail && !prefilledFullName && !prefilledPhone) return;
    setBilling((b) => {
      const next = { ...b };
      if (prefilledEmail && !b.email) next.email = prefilledEmail;
      if (prefilledFullName && !b.first_name && !b.last_name) {
        const parts = prefilledFullName.trim().split(/\s+/);
        next.first_name = parts[0] || "";
        next.last_name = parts.slice(1).join(" ");
      }
      if (prefilledPhone && !b.phone) next.phone = prefilledPhone;
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefilledEmail, prefilledFullName, prefilledPhone]);

  function onField<K extends keyof BillingFields>(k: K, v: string) {
    setBilling((b) => ({ ...b, [k]: v }));
  }

  // Auto-application du code promo passé via l'URL (?promo=AB1000).
  // S'exécute une seule fois si urlPromoCode est défini et qu'aucun code
  // n'a déjà été appliqué. Ouvre la section coupon pour visibilité.
  useEffect(() => {
    if (!urlPromoCode) return;
    if (coupon.status !== "idle") return;
    setCouponInput(urlPromoCode);
    setCouponOpen(true);
    void applyCouponCode(urlPromoCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlPromoCode]);

  async function applyCouponCode(rawCode: string) {
    const code = rawCode.trim().toUpperCase();
    if (!code) return;
    setCoupon({ status: "validating" });
    // Sprint P (17/05/2026) : passe p_expected_category='al_baraka' pour
    // que la RPC verifie cote SQL que le coupon cible bien AL BARAKA.
    // Si targeting mismatch → retourne {valid:false, reason:'targeting_mismatch'}.
    const { data, error } = await supabase.rpc("validate_coupon", {
      p_code: code,
      p_expected_category: "al_baraka",
    });
    if (error) {
      setCoupon({ status: "invalid", reason: "error" });
      toast.error("Erreur lors de la vérification du code");
      return;
    }
    const v = data as {
      valid: boolean;
      code?: string;
      discount_type?: "percent" | "fixed_eur";
      discount_percent?: number | null;
      discount_amount_eur?: number | null;
      reason?: string;
    };
    if (v?.valid && v.code) {
      if (v.discount_type === "fixed_eur" && typeof v.discount_amount_eur === "number") {
        setCoupon({ status: "valid", code: v.code, discountType: "fixed_eur", amountEur: v.discount_amount_eur });
        toast.success(`Code ${v.code} appliqué — −${v.discount_amount_eur}€`);
        return;
      }
      // Par défaut / legacy : pourcentage
      if (typeof v.discount_percent === "number" && v.discount_percent > 0) {
        setCoupon({ status: "valid", code: v.code, discountType: "percent", percent: v.discount_percent });
        toast.success(`Code ${v.code} appliqué — −${v.discount_percent}%`);
        return;
      }
    }
    setCoupon({ status: "invalid", reason: v?.reason || "not_found" });
    if (v?.reason === "targeting_mismatch") {
      toast.error("Ce code promo n'est pas applicable au PASS AL BARAKA");
    } else {
      toast.error("Code promo invalide");
    }
  }

  // Handler du bouton "Appliquer" du formulaire (utilise le couponInput courant)
  async function onApplyCoupon() {
    await applyCouponCode(couponInput);
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
    if (!allAgreed(agreements)) return "Tu dois cocher les 5 engagements avant de continuer";
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) {
      toast.error("Stripe pas encore chargé, réessaie dans une seconde");
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
        intent_type: "payment" | "subscription";
        error?: string;
      }>("create-payment-intent", {
        body: {
          installments,
          test_mode: testMode,
          coupon_code: coupon.status === "valid" ? coupon.code : undefined,
          payment_code: paymentCode || undefined,
          // Snapshot des 5 engagements (Sidali 19/05/2026) — transmis pour traçabilité
          // jusqu'à la row `client_contracts.agreements_snapshot` côté webhook.
          agreements_snapshot: agreements,
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

      if (invokeError || !data?.client_secret) {
        const msg = data?.error || invokeError?.message || "Impossible de créer le paiement";
        toast.error(msg);
        setSubmitting(false);
        return;
      }

      const returnUrl = `${window.location.origin}/merci${testMode ? "?test=1" : ""}`;
      const { error: confirmErr } = await stripe.confirmPayment({
        elements,
        clientSecret: data.client_secret,
        confirmParams: {
          return_url: returnUrl,
          payment_method_data: {
            billing_details: {
              name: fullName,
              email: billing.email.trim().toLowerCase(),
              phone: billing.phone.trim() || "",
              address: {
                line1: billing.address.trim(),
                line2: "",
                postal_code: billing.postal_code.trim(),
                city: billing.city.trim(),
                state: "",
                country: billing.country.trim(),
              },
            },
          },
        },
      });

      if (confirmErr) {
        toast.error(confirmErr.message || "Paiement refusé");
        setSubmitting(false);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue";
      toast.error(msg);
      setSubmitting(false);
    }
  }

  const buttonLabel =
    installments === 1
      ? `Payer ${formatEur(totalAfterDiscount)}`
      : `Payer ${formatEur(perInstallment)} aujourd'hui`;

  return (
    <form
      onSubmit={onSubmit}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 32,
      }}
    >
      {/* Bandeau "Acompte versé" — visible si le client est arrivé via un
          lien personnalisé ?code=ALB-XXXXXX et a déjà versé un acompte */}
      {paymentCode && (lookupLoading || acompteTotal > 0) && (
        <div
          style={{
            background: "rgba(201,160,78,0.08)",
            border: `1px solid ${THEME.goldLine}`,
            borderRadius: 12,
            padding: "14px 16px",
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <CheckCircle2 size={18} style={{ color: THEME.gold, flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 13, color: THEME.cream, lineHeight: 1.5 }}>
            {lookupLoading ? (
              <span style={{ color: THEME.creamMuted }}>Vérification de votre acompte…</span>
            ) : (
              <>
                <strong>Bienvenue !</strong> Vous avez déjà versé{" "}
                <span style={{ color: THEME.goldBright, fontWeight: 600 }}>
                  {formatEur(acompteTotal)}
                </span>{" "}
                d'acompte. Ce montant a été automatiquement déduit de votre solde à régler.
              </>
            )}
          </div>
        </div>
      )}

      {/* Facturation */}
      <section>
        <span className="alb-section-label">Tes coordonnées</span>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <input
            type="text"
            className="alb-field"
            placeholder="Prénom"
            value={billing.first_name}
            onChange={(e) => onField("first_name", e.target.value)}
            autoComplete="given-name"
            required
          />
          <input
            type="text"
            className="alb-field"
            placeholder="Nom"
            value={billing.last_name}
            onChange={(e) => onField("last_name", e.target.value)}
            autoComplete="family-name"
            required
          />
        </div>
        <input
          type="email"
          className="alb-field"
          placeholder="Adresse e-mail"
          value={billing.email}
          onChange={(e) => onField("email", e.target.value)}
          autoComplete="email"
          required
          style={{ marginBottom: 10 }}
        />
        <div className="alb-phone" style={{ marginBottom: 10 }}>
          <PhoneInput
            international
            defaultCountry="FR"
            placeholder="Numéro de téléphone"
            value={billing.phone}
            onChange={(v) => onField("phone", v || "")}
            countryCallingCodeEditable={false}
            flags={flags}
            countrySelectComponent={PhoneCountrySelect}
          />
        </div>
        <input
          type="text"
          className="alb-field"
          placeholder="Adresse postale"
          value={billing.address}
          onChange={(e) => onField("address", e.target.value)}
          autoComplete="street-address"
          required
          style={{ marginBottom: 10 }}
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10, marginBottom: 10 }}>
          <input
            type="text"
            className="alb-field"
            placeholder="Code postal"
            value={billing.postal_code}
            onChange={(e) => onField("postal_code", e.target.value)}
            autoComplete="postal-code"
            required
          />
          <input
            type="text"
            className="alb-field"
            placeholder="Ville"
            value={billing.city}
            onChange={(e) => onField("city", e.target.value)}
            autoComplete="address-level2"
            required
          />
        </div>
        <CountrySearchSelect value={billing.country} onChange={(iso) => onField("country", iso)} />
      </section>

      {/* Paiement */}
      <section>
        <span className="alb-section-label">Paiement</span>
        <PaymentElement
          options={{
            layout: "tabs",
            wallets: { applePay: "never", googlePay: "never" },
            fields: {
              billingDetails: {
                name: "never",
                email: "never",
                phone: "never",
                address: {
                  country: "never",
                  postalCode: "never",
                  line1: "never",
                  line2: "never",
                  city: "never",
                  state: "never",
                },
              },
            },
            terms: {
              card: "never",
              sepaDebit: "never",
              ideal: "never",
              bancontact: "never",
              sofort: "never",
              auBecsDebit: "never",
              usBankAccount: "never",
            },
          }}
        />
      </section>

      {/* Code promo — collapsed par défaut pour alléger visuellement */}
      <section>
        {!couponOpen && coupon.status !== "valid" ? (
          <button
            type="button"
            onClick={() => setCouponOpen(true)}
            style={{
              background: "transparent",
              border: "none",
              color: THEME.creamMuted,
              fontSize: 12.5,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: 0,
              fontFamily: "inherit",
            }}
          >
            <Tag size={13} style={{ opacity: 0.7 }} />
            J'ai un code promo
          </button>
        ) : (
          <div>
            <span className="alb-section-label">Code promo</span>
            {coupon.status === "valid" ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  background: "rgba(201,160,78,0.08)",
                  border: `1px solid ${THEME.gold}`,
                  borderRadius: 10,
                }}
              >
                <span style={{ fontSize: 13, color: THEME.cream, display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <CheckCircle2 size={15} style={{ color: THEME.gold }} />
                  <strong style={{ fontWeight: 600 }}>{coupon.code}</strong>
                  <span style={{ color: THEME.gold }}>
                    {coupon.discountType === "percent" ? `−${coupon.percent}%` : `−${coupon.amountEur}€`}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCoupon({ status: "idle" });
                    setCouponInput("");
                    setCouponOpen(false);
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: THEME.creamMuted,
                    cursor: "pointer",
                    display: "flex",
                    padding: 4,
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  className="alb-field"
                  placeholder="Entre ton code"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  style={{ textTransform: "uppercase" }}
                />
                <button
                  type="button"
                  className="alb-btn-ghost"
                  onClick={onApplyCoupon}
                  disabled={coupon.status === "validating" || !couponInput.trim()}
                >
                  {coupon.status === "validating" ? "…" : "APPLIQUER"}
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Résumé prix — card premium avec bordure shimmer + coins accent */}
      <section className="alb-price-card">
        {/* 4 coins accent (L dorés fins) */}
        <span className="alb-price-card-corner" style={{ top: 10, left: 10, borderRight: "none", borderBottom: "none" }} />
        <span className="alb-price-card-corner" style={{ top: 10, right: 10, borderLeft: "none", borderBottom: "none" }} />
        <span className="alb-price-card-corner" style={{ bottom: 10, left: 10, borderRight: "none", borderTop: "none" }} />
        <span className="alb-price-card-corner" style={{ bottom: 10, right: 10, borderLeft: "none", borderTop: "none" }} />

        {discountPercent > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12.5,
              marginBottom: 10,
              color: THEME.creamMuted,
            }}
          >
            <span>
              Prix initial{" "}
              <span
                style={{
                  marginLeft: 4,
                  fontSize: 10,
                  color: THEME.gold,
                  background: "rgba(201,160,78,0.1)",
                  border: `1px solid ${THEME.goldLine}`,
                  padding: "1px 6px",
                  borderRadius: 10,
                  letterSpacing: 1,
                  fontWeight: 600,
                }}
              >
                −{discountPercent}%
              </span>
            </span>
            <span style={{ textDecoration: "line-through" }}>{formatEur(TOTAL_EUR)}</span>
          </div>
        )}

        {/* Acompte déjà versé (lien personnalisé via ?code=ALB-XXXXXX) */}
        {acompteTotal > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12.5,
              marginBottom: 10,
              color: THEME.creamMuted,
            }}
          >
            <span>
              Acompte déjà versé
              {acompteCount > 1 ? (
                <span style={{ marginLeft: 6, color: THEME.creamDim, fontSize: 11 }}>
                  ({acompteCount} versements)
                </span>
              ) : null}
            </span>
            <span style={{ color: THEME.goldBright }}>−{formatEur(acompteTotal)}</span>
          </div>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <span
            style={{
              fontSize: 10.5,
              color: THEME.creamMuted,
              letterSpacing: "0.22em",
              fontWeight: 500,
              textTransform: "uppercase",
            }}
          >
            {installments === 1
              ? acompteTotal > 0
                ? "Solde à régler"
                : "Total"
              : "Aujourd'hui"}
          </span>
          <span
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: "clamp(30px, 5vw, 38px)",
              fontWeight: 500,
              color: THEME.gold,
              letterSpacing: 0.5,
              lineHeight: 1,
            }}
          >
            {formatEur(installments === 1 ? payableTotal : perInstallment)}
          </span>
        </div>
        {installments > 1 && (
          <div
            style={{
              marginTop: 10,
              fontSize: 11.5,
              color: THEME.creamMuted,
              textAlign: "right",
              letterSpacing: 0.2,
            }}
          >
            puis {installments - 1} × {formatEur(perInstallment)} / mois · total {formatEur(payableTotal)}
          </div>
        )}
      </section>

      {/* 5 engagements obligatoires (Sidali 19/05/2026 — CONSIGNES_IMPLEMENTATION) */}
      <EngagementChecklist
        agreements={agreements}
        onChange={setAgreements}
        theme={{ gold: THEME.gold, goldBright: THEME.goldBright, cream: THEME.cream, creamMuted: THEME.creamMuted }}
        title="Avant de continuer — coche les 5 engagements"
      />

      {/* Bouton */}
      <button
        type="submit"
        className="alb-submit"
        disabled={submitting || !stripe || !allAgreed(agreements)}
      >
        {submitting ? (
          <>
            <span
              style={{
                width: 14,
                height: 14,
                border: "2px solid rgba(26,18,0,0.3)",
                borderTopColor: "#1a1200",
                borderRadius: "50%",
                animation: "alb-spin 0.8s linear infinite",
              }}
            />
            <span>Paiement en cours…</span>
          </>
        ) : (
          <>
            <Lock size={14} strokeWidth={2.2} />
            <span>{buttonLabel}</span>
            <ArrowRight size={15} strokeWidth={2.2} className="alb-arrow" />
          </>
        )}
      </button>

      {/* Trust badges — ultra discret */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
          flexWrap: "wrap",
          paddingTop: 8,
          borderTop: `1px solid ${THEME.goldDim}`,
          marginTop: -12,
        }}
      >
        <span className="alb-trust" style={{ paddingTop: 16 }}>
          <ShieldCheck size={12} strokeWidth={1.8} style={{ color: THEME.gold }} />
          Paiement sécurisé
        </span>
        <span className="alb-trust" style={{ paddingTop: 16 }}>
          <Lock size={11} strokeWidth={1.8} style={{ color: THEME.gold }} />
          Stripe · SSL
        </span>
        <span className="alb-trust" style={{ paddingTop: 16 }}>
          <CheckCircle2 size={12} strokeWidth={1.8} style={{ color: THEME.gold }} />
          RGPD
        </span>
      </div>
    </form>
  );
}
