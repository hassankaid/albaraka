import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
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
import CheckoutHero from "./CheckoutHero";
import CheckoutBackground from "./CheckoutBackground";
import {
  GraduationCap,
  Users,
  Sparkles,
  Cpu,
  TrendingUp,
  Lock,
  ShieldCheck,
  Mail,
  User as UserIcon,
  MapPin,
  Globe,
  ArrowRight,
} from "lucide-react";

const TOTAL_EUR = 2500;

const BRAND = {
  gold: "#C9A04E",
  goldSoft: "rgba(201,160,78,0.28)",
  goldMuted: "rgba(201,160,78,0.03)",
  cream: "#F5F1E6",
  creamMuted: "rgba(245,241,230,0.65)",
  creamSoft: "rgba(245,241,230,0.9)",
  black: "#0A0A0A",
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
    return getCountries().slice().sort((a, b) => countryName(a).localeCompare(countryName(b), "fr"));
  } catch {
    return ["FR", "BE", "CH", "LU", "DZ", "MA", "TN", "SN", "CI", "CM", "US", "GB", "DE", "ES", "IT"];
  }
})();

interface CountrySelectProps {
  value: string;
  onChange: (iso: string) => void;
}

function CountrySearchSelect({ value, onChange }: CountrySelectProps) {
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
    return ALL_COUNTRIES.filter((iso) => {
      return countryName(iso).toLowerCase().includes(q) || iso.toLowerCase().includes(q);
    });
  }, [query]);

  const CurrentFlag = flags[value as keyof typeof flags];

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          background: "rgba(255,255,255,0.03)",
          border: `0.5px solid rgba(201,160,78,0.28)`,
          color: "#F5F1E6",
          padding: "11px 14px",
          borderRadius: 6,
          fontSize: 14,
          fontFamily: "inherit",
          display: "flex",
          alignItems: "center",
          gap: 10,
          cursor: "pointer",
          textAlign: "left",
          justifyContent: "space-between",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {CurrentFlag ? (
            <span style={{ width: 22, height: 16, display: "inline-block" }}>
              <CurrentFlag title={countryName(value)} />
            </span>
          ) : null}
          <span>{value ? countryName(value) : "Sélectionner un pays"}</span>
        </span>
        <svg width="10" height="6" viewBox="0 0 10 6" style={{ opacity: 0.6 }}>
          <path d="M1 1L5 5L9 1" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "#0A0A0A",
            border: `0.5px solid rgba(201,160,78,0.4)`,
            borderRadius: 6,
            zIndex: 20,
            maxHeight: 280,
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 10px 32px rgba(0,0,0,0.5)",
          }}
        >
          <input
            ref={inputRef}
            type="text"
            placeholder="Rechercher un pays…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "none",
              borderBottom: `0.5px solid rgba(201,160,78,0.2)`,
              color: "#F5F1E6",
              padding: "12px 14px",
              fontSize: 13,
              fontFamily: "inherit",
              outline: "none",
              width: "100%",
              boxSizing: "border-box",
            }}
          />
          <div style={{ overflowY: "auto", maxHeight: 220 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "14px 16px", fontSize: 13, color: "rgba(245,241,230,0.5)" }}>
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
                      color: "#F5F1E6",
                      padding: "10px 14px",
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
                    {Flag ? (
                      <span style={{ width: 22, height: 16, display: "inline-block", flexShrink: 0 }}>
                        <Flag title={countryName(iso)} />
                      </span>
                    ) : null}
                    <span>{countryName(iso)}</span>
                    <span style={{ marginLeft: "auto", color: "rgba(245,241,230,0.4)", fontSize: 11 }}>
                      {iso}
                    </span>
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

interface PhoneCountrySelectProps {
  value?: Country;
  onChange: (value?: Country) => void;
  options: Array<{ value?: Country; label: string; divider?: boolean }>;
  iconComponent: React.ComponentType<{
    country: Country;
    label: string;
    aspectRatio?: number;
  }>;
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
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
    }
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

  const currentDial = useMemo(() => {
    if (!value) return "";
    try {
      return getCountryCallingCode(value);
    } catch {
      return "";
    }
  }, [value]);

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <button
        type="button"
        disabled={disabled || readOnly}
        onClick={() => setOpen((v) => !v)}
        style={{
          background: "transparent",
          border: "none",
          color: "#F5F1E6",
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
          <span style={{ fontSize: 12, color: "rgba(245,241,230,0.5)" }}>🌐</span>
        )}
        <svg width="8" height="5" viewBox="0 0 10 6" style={{ opacity: 0.6, marginLeft: 2 }}>
          <path
            d="M1 1L5 5L9 1"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            minWidth: 300,
            background: "#0A0A0A",
            border: `0.5px solid rgba(201,160,78,0.4)`,
            borderRadius: 6,
            zIndex: 20,
            maxHeight: 280,
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 10px 32px rgba(0,0,0,0.5)",
          }}
        >
          <input
            ref={inputRef}
            type="text"
            placeholder="Rechercher un pays…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "none",
              borderBottom: `0.5px solid rgba(201,160,78,0.2)`,
              color: "#F5F1E6",
              padding: "12px 14px",
              fontSize: 13,
              fontFamily: "inherit",
              outline: "none",
              width: "100%",
              boxSizing: "border-box",
            }}
          />
          <div style={{ overflowY: "auto", maxHeight: 220 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "14px 16px", fontSize: 13, color: "rgba(245,241,230,0.5)" }}>
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
                      color: "#F5F1E6",
                      padding: "10px 14px",
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
                    <span style={{ color: "#C9A04E", fontSize: 12 }}>+{dial}</span>
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

type CouponState =
  | { status: "idle" }
  | { status: "validating" }
  | { status: "valid"; code: string; percent: number }
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

export default function Checkout() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const testMode = searchParams.get("test") === "1";

  const parsedInstallments = Number(params.installments);
  const installments =
    Number.isInteger(parsedInstallments) && parsedInstallments >= 1 && parsedInstallments <= 8
      ? parsedInstallments
      : 1;

  const missingKeyName = testMode
    ? "VITE_STRIPE_PUBLISHABLE_KEY_TEST"
    : "VITE_STRIPE_PUBLISHABLE_KEY";
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
  const discountPercent = coupon.status === "valid" ? coupon.percent : 0;
  const totalAfterDiscount = Math.round((TOTAL_EUR * (100 - discountPercent)) / 100 * 100) / 100;

  const elementsOptions = useMemo(
    () => ({
      mode: (installments === 1 ? "payment" : "subscription") as "payment" | "subscription",
      amount: Math.round(totalAfterDiscount * 100),
      currency: "eur",
      appearance: {
        theme: "night" as const,
        variables: {
          colorPrimary: BRAND.gold,
          colorBackground: "rgba(255,255,255,0.03)",
          colorText: BRAND.cream,
          colorDanger: "#e15a5a",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          borderRadius: "6px",
          fontSizeBase: "14px",
        },
        rules: {
          ".Input": {
            border: `0.5px solid ${BRAND.goldSoft}`,
            padding: "13px 14px",
          },
          ".Input:focus": {
            borderColor: BRAND.gold,
            boxShadow: "none",
          },
          ".Label": {
            color: "rgba(245,241,230,0.6)",
            fontSize: "11px",
            letterSpacing: "1px",
            textTransform: "uppercase" as const,
          },
        },
      },
    }),
    [installments, totalAfterDiscount],
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: BRAND.black,
        color: BRAND.cream,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
        padding: "3.5rem 1.5rem 3rem",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <CheckoutBackground />
      <div style={{ position: "relative", zIndex: 2, maxWidth: 560, margin: "0 auto" }}>
        <CheckoutHero
          eyebrow="FÉLICITATIONS"
          title="PASS AL BARAKA"
          subtitle="ÉCOSYSTÈME BY ETHICARENA"
        />
      </div>
      {stripeKeyMissing && (
        <div
          style={{
            maxWidth: 520,
            margin: "0 auto 1.5rem",
            padding: "14px 16px",
            background: "rgba(225, 90, 90, 0.12)",
            border: "1px solid rgba(225, 90, 90, 0.55)",
            borderRadius: 8,
            color: "#ff9999",
            fontSize: 12,
            letterSpacing: 0.3,
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          ⚠ Clé publique Stripe non configurée côté Vercel (<code>{missingKeyName}</code>).
          Le paiement ne fonctionnera pas tant qu'elle n'est pas ajoutée dans les variables
          d'environnement Vercel (puis redéploiement).
        </div>
      )}
      {testMode && (
        <div
          style={{
            maxWidth: 520,
            margin: "0 auto 1.5rem",
            padding: "12px 16px",
            background: "rgba(255, 180, 0, 0.1)",
            border: "1px solid rgba(255, 180, 0, 0.5)",
            borderRadius: 8,
            color: "#FFB400",
            fontSize: 12,
            letterSpacing: 1,
            textAlign: "center",
            fontFamily: "monospace",
          }}
        >
          ⚠ MODE TEST — utilise la carte 4242 4242 4242 4242, aucun débit réel
        </div>
      )}
      <Elements stripe={stripePromise} options={elementsOptions}>
        <CheckoutForm
          installments={installments}
          testMode={testMode}
          coupon={coupon}
          setCoupon={setCoupon}
          totalAfterDiscount={totalAfterDiscount}
        />
      </Elements>
    </div>
  );
}

interface FormProps {
  installments: number;
  testMode: boolean;
  coupon: CouponState;
  setCoupon: (c: CouponState) => void;
  totalAfterDiscount: number;
}

function CheckoutForm({ installments, testMode, coupon, setCoupon, totalAfterDiscount }: FormProps) {
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
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const discountPercent = coupon.status === "valid" ? coupon.percent : 0;
  const perInstallment = Math.round((totalAfterDiscount / installments) * 100) / 100;

  const planLabel = installments === 1 ? "Paiement en 1 fois" : `Paiement en ${installments} fois`;
  const perInstallmentLabel =
    installments === 1
      ? formatEur(totalAfterDiscount)
      : `${formatEur(perInstallment)} × ${installments}`;

  function onField<K extends keyof BillingFields>(k: K, v: string) {
    setBilling((b) => ({ ...b, [k]: v }));
  }

  async function onApplyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCoupon({ status: "validating" });
    const { data, error } = await supabase.rpc("validate_coupon", { p_code: code });
    if (error) {
      setCoupon({ status: "invalid", reason: "error" });
      toast.error("Erreur lors de la vérification du code");
      return;
    }
    const v = data as { valid: boolean; code?: string; discount_percent?: number; reason?: string };
    if (v?.valid && v.code && typeof v.discount_percent === "number") {
      setCoupon({ status: "valid", code: v.code, percent: v.discount_percent });
      toast.success(`Code ${v.code} appliqué — ${v.discount_percent}% de réduction`);
    } else {
      setCoupon({ status: "invalid", reason: v?.reason || "not_found" });
      toast.error("Code promo invalide");
    }
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
    if (!agreed) return "Tu dois confirmer ton inscription";
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
      // On success, Stripe redirects to returnUrl.
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue";
      toast.error(msg);
      setSubmitting(false);
    }
  }

  return (
    <form
      className="alb-checkout"
      onSubmit={onSubmit}
      style={{
        maxWidth: 560,
        margin: "0 auto",
        padding: "2.5rem 2rem",
        border: `0.5px solid rgba(201,160,78,0.22)`,
        borderRadius: 14,
        background: "rgba(10,10,10,0.55)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        boxShadow: "0 30px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(201,160,78,0.05)",
        position: "relative",
        zIndex: 2,
      }}
    >
      <style>{`
        .alb-checkout input[type="text"], .alb-checkout input[type="email"], .alb-checkout input[type="tel"] {
          background: rgba(255,255,255,0.03);
          border: 0.5px solid ${BRAND.goldSoft};
          color: ${BRAND.cream};
          padding: 13px 14px;
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
          box-sizing: border-box;
          width: 100%;
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
        }
        .alb-checkout .alb-input-wrap > input[type="text"],
        .alb-checkout .alb-input-wrap > input[type="email"],
        .alb-checkout .alb-input-wrap > input[type="tel"] {
          padding-left: 40px;
        }
        .alb-checkout input::placeholder { color: rgba(245,241,230,0.35); }
        .alb-checkout input:focus {
          outline: none;
          border-color: ${BRAND.gold};
          background: rgba(255,255,255,0.05);
          box-shadow: 0 0 0 3px rgba(201,160,78,0.15), 0 0 20px rgba(201,160,78,0.2);
        }
        .alb-checkout input[type="checkbox"] {
          accent-color: ${BRAND.gold};
          width: auto;
          padding: 0;
        }
        .alb-input-wrap { position: relative; }
        .alb-input-wrap .alb-input-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(201,160,78,0.6);
          pointer-events: none;
          transition: color 0.2s;
        }
        .alb-input-wrap:focus-within .alb-input-icon { color: ${BRAND.gold}; }
        /* react-phone-number-input overrides pour le thème noir/or */
        .alb-phone-wrapper .PhoneInput,
        .alb-phone-wrapper .PhoneInput--focus {
          display: flex;
          align-items: stretch;
          gap: 4px;
          background: rgba(255,255,255,0.03);
          border: 0.5px solid ${BRAND.goldSoft};
          border-radius: 6px;
          padding: 0 12px 0 10px;
          transition: border-color 0.2s, background 0.2s;
          box-shadow: none !important;
          outline: none !important;
        }
        .alb-phone-wrapper .PhoneInput:focus-within {
          border-color: ${BRAND.gold};
          background: rgba(255,255,255,0.05);
        }
        .alb-phone-wrapper .PhoneInput > * {
          box-shadow: none !important;
        }
        .alb-phone-wrapper .PhoneInputCountry {
          display: flex;
          align-items: center;
          border-right: 0.5px solid rgba(201,160,78,0.15);
          padding-right: 8px;
          margin-right: 4px;
        }
        .alb-phone-wrapper .PhoneInputInput,
        .alb-phone-wrapper input.PhoneInputInput {
          background: transparent !important;
          border: none !important;
          color: ${BRAND.cream} !important;
          font-size: 14px;
          font-family: inherit;
          padding: 13px 4px !important;
          width: 100%;
          outline: none !important;
          box-shadow: none !important;
          border-radius: 0 !important;
          min-width: 0;
          flex: 1;
        }
        .alb-phone-wrapper .PhoneInputInput::placeholder {
          color: rgba(245,241,230,0.35);
        }
        .alb-phone-wrapper .PhoneInputInput:focus {
          background: transparent !important;
          border-color: transparent !important;
        }
        .alb-btn {
          width: 100%;
          background: linear-gradient(135deg, #DDB968 0%, ${BRAND.gold} 50%, #A88238 100%);
          background-size: 200% 100%;
          background-position: 0% 50%;
          color: ${BRAND.black};
          border: none;
          border-radius: 10px;
          padding: 18px 22px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          letter-spacing: 3px;
          font-family: inherit;
          transition: background-position 0.4s ease, box-shadow 0.3s, transform 0.15s;
          box-shadow: 0 6px 18px rgba(201,160,78,0.25), 0 0 0 1px rgba(201,160,78,0.4);
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        .alb-btn:hover:not(:disabled) {
          background-position: 100% 50%;
          box-shadow: 0 10px 40px rgba(201,160,78,0.5), 0 0 0 1px rgba(255,220,140,0.6);
          transform: translateY(-1px);
        }
        .alb-btn:active:not(:disabled) { transform: translateY(0); }
        .alb-btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .alb-btn .alb-btn-arrow { transition: transform 0.3s; }
        .alb-btn:hover:not(:disabled) .alb-btn-arrow { transform: translateX(4px); }
        .alb-coupon-btn {
          background: transparent;
          border: 0.5px solid ${BRAND.gold};
          color: ${BRAND.gold};
          padding: 13px 18px;
          border-radius: 8px;
          font-size: 12px;
          letter-spacing: 2px;
          cursor: pointer;
          font-family: inherit;
          white-space: nowrap;
          transition: background 0.2s, box-shadow 0.2s;
        }
        .alb-coupon-btn:hover:not(:disabled) {
          background: ${BRAND.goldMuted};
          box-shadow: 0 0 18px rgba(201,160,78,0.2);
        }
        .alb-coupon-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        /* Card benefit */
        .alb-benefit {
          display: flex;
          gap: 12px;
          padding: 14px 14px;
          border: 0.5px solid rgba(201,160,78,0.22);
          border-radius: 10px;
          background: rgba(201,160,78,0.03);
          transition: border-color 0.25s, background 0.25s, transform 0.25s;
          align-items: flex-start;
        }
        .alb-benefit:hover {
          border-color: rgba(201,160,78,0.55);
          background: rgba(201,160,78,0.06);
          transform: translateY(-1px);
        }
        .alb-benefit-icon {
          width: 36px;
          height: 36px;
          min-width: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(201,160,78,0.2), rgba(201,160,78,0.05));
          border: 0.5px solid rgba(201,160,78,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${BRAND.gold};
        }
        /* Reassurance row */
        .alb-reassure {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: rgba(245,241,230,0.55);
          letter-spacing: 1px;
        }
      `}</style>

      {/* Bloc de bienvenue — le logo et le titre principal sont dans le hero au-dessus */}
      <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
        <p style={{ color: "rgba(245,241,230,0.85)", fontSize: 14.5, margin: 0, lineHeight: 1.85 }}>
          Bienvenue dans l'écosystème Al Baraka. Tu prends la bonne décision, qu'Allah te facilite ton cheminement. Nous serons avec toi jusqu'au bout.
        </p>
      </div>

      <div style={{ marginBottom: "2.5rem" }}>
        <h2
          style={{
            fontSize: 11,
            fontWeight: 500,
            margin: "0 0 18px 0",
            letterSpacing: 3,
            color: BRAND.gold,
            textAlign: "center",
          }}
        >
          CE QUE TU REJOINS
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
            gap: 10,
          }}
        >
          {[
            {
              Icon: GraduationCap,
              title: "Plusieurs programmes",
              body: "Des compétences variées et complémentaires",
            },
            {
              Icon: Users,
              title: "Coaching sur mesure",
              body: "Un accompagnement par nos coachs dédiés",
            },
            {
              Icon: Sparkles,
              title: "Communauté active",
              body: "Des frères et sœurs animés par les mêmes ambitions",
            },
            {
              Icon: Cpu,
              title: "Outils IA inclus",
              body: "Une suite d'intelligence artificielle intégrée",
            },
            {
              Icon: TrendingUp,
              title: "Perspectives claires",
              body: "Une évolution pas à pas, structurée et durable",
            },
          ].map(({ Icon, title, body }, i) => (
            <div key={i} className="alb-benefit">
              <div className="alb-benefit-icon">
                <Icon size={18} strokeWidth={1.5} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: BRAND.cream,
                    marginBottom: 3,
                    letterSpacing: 0.2,
                  }}
                >
                  {title}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: BRAND.creamMuted,
                    lineHeight: 1.5,
                  }}
                >
                  {body}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Récap paiement — ticket premium */}
      <div
        style={{
          marginBottom: "2.5rem",
          padding: "26px 24px 22px",
          border: `0.5px solid rgba(201,160,78,0.35)`,
          borderRadius: 14,
          background:
            "linear-gradient(145deg, rgba(201,160,78,0.08) 0%, rgba(201,160,78,0.02) 100%)",
          position: "relative",
          boxShadow: "inset 0 0 50px rgba(201,160,78,0.05), 0 8px 30px rgba(0,0,0,0.3)",
        }}
      >
        {/* Coin "wax seal" dorée en haut à droite */}
        <div
          style={{
            position: "absolute",
            top: -10,
            right: 18,
            background: BRAND.black,
            padding: "3px 12px",
            border: `0.5px solid ${BRAND.gold}`,
            borderRadius: 20,
            fontSize: 9,
            letterSpacing: 2.5,
            color: BRAND.gold,
            fontWeight: 600,
          }}
        >
          TA COMMANDE
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 12,
            color: "rgba(245,241,230,0.55)",
            marginBottom: 4,
            letterSpacing: 0.5,
          }}
        >
          <span>PROGRAMME</span>
        </div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 500,
            color: BRAND.cream,
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            letterSpacing: 2,
            marginBottom: 16,
          }}
        >
          PASS AL BARAKA
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "5px 0",
            fontSize: 13,
          }}
        >
          <span style={{ color: "rgba(245,241,230,0.6)" }}>Accès</span>
          <span style={{ fontWeight: 500, color: BRAND.cream }}>Immédiat après paiement</span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "5px 0",
            fontSize: 13,
          }}
        >
          <span style={{ color: "rgba(245,241,230,0.6)" }}>Modalité</span>
          <span style={{ fontWeight: 500, color: BRAND.cream }}>{planLabel}</span>
        </div>

        {discountPercent > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "8px 0",
              fontSize: 13,
              marginTop: 4,
            }}
          >
            <span style={{ color: "rgba(245,241,230,0.6)" }}>
              Prix initial
              <span
                style={{
                  marginLeft: 8,
                  fontSize: 10,
                  color: BRAND.gold,
                  background: "rgba(201,160,78,0.12)",
                  border: `0.5px solid ${BRAND.gold}`,
                  padding: "2px 8px",
                  borderRadius: 10,
                  letterSpacing: 1,
                  fontWeight: 600,
                }}
              >
                −{discountPercent}%
              </span>
            </span>
            <span style={{ color: "rgba(245,241,230,0.5)", textDecoration: "line-through" }}>
              {formatEur(TOTAL_EUR)}
            </span>
          </div>
        )}

        <div
          style={{
            borderTop: "0.5px solid rgba(201,160,78,0.3)",
            marginTop: 14,
            paddingTop: 16,
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: "rgba(245,241,230,0.55)",
              letterSpacing: 2.5,
              fontWeight: 500,
            }}
          >
            TOTAL
          </span>
          <div style={{ textAlign: "right" }}>
            {installments > 1 ? (
              <>
                <div
                  style={{
                    fontSize: "clamp(28px, 5vw, 36px)",
                    fontWeight: 500,
                    color: BRAND.gold,
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                    letterSpacing: 1,
                    lineHeight: 1,
                    textShadow: "0 0 24px rgba(201,160,78,0.3)",
                  }}
                >
                  {formatEur(perInstallment)}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "rgba(245,241,230,0.6)",
                    marginTop: 6,
                    letterSpacing: 0.5,
                  }}
                >
                  × {installments} versements · soit {formatEur(totalAfterDiscount)}
                </div>
              </>
            ) : (
              <div
                style={{
                  fontSize: "clamp(32px, 6vw, 44px)",
                  fontWeight: 500,
                  color: BRAND.gold,
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  letterSpacing: 1,
                  lineHeight: 1,
                  textShadow: "0 0 24px rgba(201,160,78,0.3)",
                }}
              >
                {formatEur(totalAfterDiscount)}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: 11, fontWeight: 500, margin: "0 0 12px 0", letterSpacing: 3, color: BRAND.gold }}>
          CODE PROMO
        </h2>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            placeholder="Entrer un code"
            value={couponInput}
            onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
            disabled={coupon.status === "valid"}
            style={{ textTransform: "uppercase" }}
          />
          {coupon.status === "valid" ? (
            <button
              type="button"
              className="alb-coupon-btn"
              onClick={() => {
                setCoupon({ status: "idle" });
                setCouponInput("");
              }}
            >
              RETIRER
            </button>
          ) : (
            <button
              type="button"
              className="alb-coupon-btn"
              onClick={onApplyCoupon}
              disabled={coupon.status === "validating" || !couponInput.trim()}
            >
              {coupon.status === "validating" ? "…" : "APPLIQUER"}
            </button>
          )}
        </div>
        {coupon.status === "valid" && (
          <p style={{ color: BRAND.gold, fontSize: 12, margin: "8px 0 0 0" }}>
            ✓ Code {coupon.code} appliqué — {coupon.percent}% de réduction
          </p>
        )}
      </div>

      <div style={{ marginBottom: "2.5rem" }}>
        <h2 style={{ fontSize: 11, fontWeight: 500, margin: "0 0 16px 0", letterSpacing: 3, color: BRAND.gold }}>
          INFORMATIONS DE FACTURATION
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div className="alb-input-wrap">
            <input
              type="text"
              placeholder="Prénom"
              value={billing.first_name}
              onChange={(e) => onField("first_name", e.target.value)}
              required
            />
            <UserIcon className="alb-input-icon" size={16} strokeWidth={1.5} />
          </div>
          <div className="alb-input-wrap">
            <input
              type="text"
              placeholder="Nom"
              value={billing.last_name}
              onChange={(e) => onField("last_name", e.target.value)}
              required
            />
            <UserIcon className="alb-input-icon" size={16} strokeWidth={1.5} />
          </div>
        </div>
        <div style={{ marginBottom: 10 }} className="alb-input-wrap">
          <input
            type="email"
            placeholder="Adresse e-mail"
            value={billing.email}
            onChange={(e) => onField("email", e.target.value)}
            required
          />
          <Mail className="alb-input-icon" size={16} strokeWidth={1.5} />
        </div>
        <div style={{ marginBottom: 10 }} className="alb-phone-wrapper">
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
        <div style={{ marginBottom: 10 }} className="alb-input-wrap">
          <input
            type="text"
            placeholder="Adresse postale"
            value={billing.address}
            onChange={(e) => onField("address", e.target.value)}
            required
          />
          <MapPin className="alb-input-icon" size={16} strokeWidth={1.5} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10, marginBottom: 10 }}>
          <div className="alb-input-wrap">
            <input
              type="text"
              placeholder="Code postal"
              value={billing.postal_code}
              onChange={(e) => onField("postal_code", e.target.value)}
              required
            />
            <MapPin className="alb-input-icon" size={16} strokeWidth={1.5} />
          </div>
          <div className="alb-input-wrap">
            <input
              type="text"
              placeholder="Ville"
              value={billing.city}
              onChange={(e) => onField("city", e.target.value)}
              required
            />
            <MapPin className="alb-input-icon" size={16} strokeWidth={1.5} />
          </div>
        </div>
        <div>
          <CountrySearchSelect
            value={billing.country}
            onChange={(iso) => onField("country", iso)}
          />
        </div>
      </div>

      <div style={{ marginBottom: "2.5rem" }}>
        <h2 style={{ fontSize: 11, fontWeight: 500, margin: "0 0 16px 0", letterSpacing: 3, color: BRAND.gold }}>
          INFORMATIONS DE PAIEMENT
        </h2>
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
      </div>

      <div
        style={{
          marginBottom: "1.75rem",
          padding: "16px 18px",
          border: `0.5px solid ${BRAND.goldSoft}`,
          borderRadius: 8,
          background: BRAND.goldMuted,
        }}
      >
        <label
          style={{
            display: "flex",
            gap: 10,
            fontSize: 13,
            cursor: "pointer",
            fontWeight: 500,
            marginBottom: 8,
            alignItems: "flex-start",
            color: BRAND.cream,
          }}
        >
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            style={{ marginTop: 3, flexShrink: 0 }}
          />
          <span>Je confirme mon inscription au PASS AL BARAKA.</span>
        </label>
        <ul
          style={{
            margin: "8px 0 0 28px",
            paddingLeft: 20,
            listStyle: "disc",
            color: "rgba(245,241,230,0.6)",
            fontSize: 12,
            lineHeight: 1.65,
          }}
        >
          <li style={{ marginBottom: 5 }}>Je souhaite accéder au contenu immédiatement.</li>
          <li style={{ marginBottom: 5 }}>
            S'agissant de produits numériques, je renonce à mon droit de rétractation de 14 jours (article L221-28 13° du Code de la consommation).
          </li>
          <li>En cas de paiement en plusieurs fois, je m'engage sur la totalité du paiement prévu.</li>
        </ul>
      </div>

      <button type="submit" className="alb-btn" disabled={submitting || !stripe}>
        {submitting ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                width: 14,
                height: 14,
                border: "2px solid rgba(10,10,10,0.3)",
                borderTopColor: BRAND.black,
                borderRadius: "50%",
                animation: "alb-spin 0.8s linear infinite",
              }}
            />
            PAIEMENT EN COURS…
          </span>
        ) : (
          <>
            <Lock size={15} strokeWidth={2.2} />
            <span>VALIDER MON PASS · {formatEur(totalAfterDiscount)}</span>
            <ArrowRight size={16} strokeWidth={2.2} className="alb-btn-arrow" />
          </>
        )}
      </button>
      <style>{`
        @keyframes alb-spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Bandeau de réassurance */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 22,
          marginTop: "1.5rem",
          flexWrap: "wrap",
          padding: "14px 0",
          borderTop: "0.5px solid rgba(201,160,78,0.2)",
          borderBottom: "0.5px solid rgba(201,160,78,0.2)",
        }}
      >
        <div className="alb-reassure">
          <Lock size={13} strokeWidth={1.6} style={{ color: BRAND.gold }} />
          <span>PAIEMENT STRIPE</span>
        </div>
        <div className="alb-reassure">
          <ShieldCheck size={13} strokeWidth={1.6} style={{ color: BRAND.gold }} />
          <span>SSL · 256 BITS</span>
        </div>
        <div className="alb-reassure">
          <Globe size={13} strokeWidth={1.6} style={{ color: BRAND.gold }} />
          <span>CONFORME RGPD</span>
        </div>
      </div>

      {/* Baseline Al Baraka */}
      <div
        style={{
          textAlign: "center",
          fontSize: 10,
          color: "rgba(245,241,230,0.45)",
          letterSpacing: 3,
          marginTop: "1.5rem",
          fontWeight: 500,
        }}
      >
        AL BARAKA · ÉCOSYSTÈME BY ETHICARENA
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: "0.75rem" }}>
        <div style={{ width: 40, height: 0.5, background: "rgba(201,160,78,0.3)" }} />
        <svg width="5" height="5" viewBox="0 0 8 8">
          <path d="M4 0L8 4L4 8L0 4Z" fill="rgba(201,160,78,0.5)" />
        </svg>
        <div style={{ width: 40, height: 0.5, background: "rgba(201,160,78,0.3)" }} />
      </div>
    </form>
  );
}
