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
        padding: "3rem 1.5rem",
      }}
    >
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
              phone: billing.phone.trim() || undefined,
              address: {
                line1: billing.address.trim(),
                postal_code: billing.postal_code.trim(),
                city: billing.city.trim(),
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
        maxWidth: 520,
        margin: "0 auto",
        padding: "3rem 2rem",
        border: `0.5px solid rgba(201,160,78,0.2)`,
        borderRadius: 12,
      }}
    >
      <style>{`
        .alb-checkout input[type="text"], .alb-checkout input[type="email"], .alb-checkout input[type="tel"] {
          background: rgba(255,255,255,0.03);
          border: 0.5px solid ${BRAND.goldSoft};
          color: ${BRAND.cream};
          padding: 13px 14px;
          border-radius: 6px;
          font-size: 14px;
          font-family: inherit;
          box-sizing: border-box;
          width: 100%;
          transition: border-color 0.2s;
        }
        .alb-checkout input::placeholder { color: rgba(245,241,230,0.35); }
        .alb-checkout input:focus { outline: none; border-color: ${BRAND.gold}; background: rgba(255,255,255,0.05); }
        .alb-checkout input[type="checkbox"] { accent-color: ${BRAND.gold}; width: auto; padding: 0; }
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
          background: ${BRAND.gold};
          color: ${BRAND.black};
          border: none;
          border-radius: 8px;
          padding: 17px 20px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          letter-spacing: 3px;
          font-family: inherit;
          transition: background 0.2s, opacity 0.2s;
        }
        .alb-btn:hover:not(:disabled) { background: #DDB968; }
        .alb-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .alb-coupon-btn {
          background: transparent;
          border: 0.5px solid ${BRAND.gold};
          color: ${BRAND.gold};
          padding: 13px 18px;
          border-radius: 6px;
          font-size: 12px;
          letter-spacing: 2px;
          cursor: pointer;
          font-family: inherit;
          white-space: nowrap;
          transition: background 0.2s;
        }
        .alb-coupon-btn:hover:not(:disabled) { background: ${BRAND.goldMuted}; }
        .alb-coupon-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>

      <div style={{ textAlign: "center", marginBottom: "2.25rem" }}>
        <div
          style={{
            width: 72,
            height: 72,
            margin: "0 auto 20px",
            background: BRAND.black,
            border: `1px solid ${BRAND.gold}`,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="40" height="40" viewBox="0 0 40 40">
            <text
              x="20"
              y="28"
              textAnchor="middle"
              fontFamily="Georgia, serif"
              fontSize="22"
              fontWeight="400"
              fill={BRAND.gold}
              letterSpacing="1.5"
            >
              AB
            </text>
          </svg>
        </div>
        <div style={{ fontSize: 17, fontWeight: 500, letterSpacing: 6, color: BRAND.cream, marginBottom: 6 }}>
          AL BARAKA
        </div>
        <div style={{ fontSize: 10, color: BRAND.gold, letterSpacing: 3 }}>
          ÉCOSYSTÈME BY ETHICARENA
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 22 }}>
          <div style={{ width: 70, height: 0.5, background: BRAND.gold }} />
          <svg width="8" height="8" viewBox="0 0 8 8">
            <path d="M4 0L8 4L4 8L0 4Z" fill={BRAND.gold} />
          </svg>
          <div style={{ width: 70, height: 0.5, background: BRAND.gold }} />
        </div>
      </div>

      <h1
        style={{
          fontSize: 24,
          fontWeight: 500,
          margin: "0 0 18px 0",
          letterSpacing: 2.5,
          textAlign: "center",
          fontFamily: "Georgia, serif",
          color: BRAND.cream,
        }}
      >
        PASS AL BARAKA
      </h1>

      <div style={{ textAlign: "center", marginBottom: "3rem" }}>
        <p style={{ color: "rgba(245,241,230,0.8)", fontSize: 14, margin: 0, lineHeight: 1.85 }}>
          Bienvenue dans l'écosystème Al Baraka. Tu prends la bonne décision, qu'Allah te facilite ton cheminement. Nous serons avec toi jusqu'au bout.
        </p>
        <p style={{ color: BRAND.gold, fontSize: 11, margin: "18px 0 0 0", fontWeight: 500, letterSpacing: 4 }}>
          — FÉLICITATIONS —
        </p>
      </div>

      <div style={{ marginBottom: "2.5rem" }}>
        <h2 style={{ fontSize: 11, fontWeight: 500, margin: "0 0 16px 0", letterSpacing: 3, color: BRAND.gold }}>
          CE QUE TU REJOINS
        </h2>
        <p style={{ color: BRAND.creamMuted, fontSize: 13, lineHeight: 1.75, margin: "0 0 18px 0" }}>
          Avec le PASS AL BARAKA, tu ne rejoins pas une simple formation — tu intègres un écosystème complet pensé pour t'accompagner dans la durée :
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          {[
            "Accès à plusieurs programmes pour développer des compétences variées et complémentaires",
            "Un accompagnement sur mesure par nos coachs dédiés",
            "Une communauté active de frères et sœurs animés par les mêmes ambitions",
            "Des outils d'intelligence artificielle inclus dans ton offre",
            "Des perspectives d'évolution claires pour progresser pas à pas",
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 11, fontSize: 13, lineHeight: 1.6, color: BRAND.creamSoft }}>
              <svg width="13" height="13" viewBox="0 0 14 14" style={{ flexShrink: 0, marginTop: 4 }}>
                <path
                  d="M2 7L5.5 10.5L12 4"
                  fill="none"
                  stroke={BRAND.gold}
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          marginBottom: "2.5rem",
          padding: "18px 20px",
          border: `0.5px solid ${BRAND.goldSoft}`,
          borderRadius: 8,
          background: BRAND.goldMuted,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13 }}>
          <span style={{ color: "rgba(245,241,230,0.6)" }}>Programme</span>
          <span style={{ fontWeight: 500, color: BRAND.cream }}>PASS AL BARAKA</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13 }}>
          <span style={{ color: "rgba(245,241,230,0.6)" }}>Accès</span>
          <span style={{ fontWeight: 500, color: BRAND.cream }}>Immédiat après paiement</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13 }}>
          <span style={{ color: "rgba(245,241,230,0.6)" }}>Modalité</span>
          <span style={{ fontWeight: 500, color: BRAND.cream }}>{planLabel}</span>
        </div>
        {discountPercent > 0 && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13 }}>
              <span style={{ color: "rgba(245,241,230,0.6)" }}>Montant initial</span>
              <span style={{ color: "rgba(245,241,230,0.5)", textDecoration: "line-through" }}>
                {formatEur(TOTAL_EUR)}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13 }}>
              <span style={{ color: "rgba(245,241,230,0.6)" }}>Réduction ({discountPercent}%)</span>
              <span style={{ fontWeight: 500, color: BRAND.gold }}>
                − {formatEur(TOTAL_EUR - totalAfterDiscount)}
              </span>
            </div>
          </>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "12px 0 2px 0",
            fontSize: 15,
            borderTop: "0.5px solid rgba(201,160,78,0.25)",
            marginTop: 8,
          }}
        >
          <span style={{ color: BRAND.cream }}>Montant</span>
          <span style={{ fontWeight: 500, color: BRAND.gold, letterSpacing: 1 }}>{perInstallmentLabel}</span>
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
          <input
            type="text"
            placeholder="Prénom"
            value={billing.first_name}
            onChange={(e) => onField("first_name", e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Nom"
            value={billing.last_name}
            onChange={(e) => onField("last_name", e.target.value)}
            required
          />
        </div>
        <div style={{ marginBottom: 10 }}>
          <input
            type="email"
            placeholder="Adresse e-mail"
            value={billing.email}
            onChange={(e) => onField("email", e.target.value)}
            required
          />
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
        <div style={{ marginBottom: 10 }}>
          <input
            type="text"
            placeholder="Adresse postale"
            value={billing.address}
            onChange={(e) => onField("address", e.target.value)}
            required
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10, marginBottom: 10 }}>
          <input
            type="text"
            placeholder="Code postal"
            value={billing.postal_code}
            onChange={(e) => onField("postal_code", e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Ville"
            value={billing.city}
            onChange={(e) => onField("city", e.target.value)}
            required
          />
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
                address: "never",
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
        <style>{`
          /* Masquer tout ce qui ressemble à Stripe Link / autofill prompts
             qui persisteraient malgré la désactivation des wallets + email collection. */
          iframe[name^="__privateStripeFrame"][title*="Link"],
          iframe[name^="__privateStripeFrame"][src*="link"],
          iframe[name^="__privateStripeFrame"][src*="LinkAutofill"],
          iframe[name^="__privateStripeFrame"][src*="linkModal"],
          [data-testid="linkAuthenticationElement"],
          [class*="Link"][class*="Popup"],
          [class*="LinkPaymentMethodPromoContent"],
          [id^="__privateStripeLink"] {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
          }
          /* Stripe's floating notification bar (Link welcome / save prompt) */
          div[aria-label*="Stripe"],
          div[data-stripe-element][style*="position: fixed"] {
            display: none !important;
          }
        `}</style>
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
        {submitting ? "PAIEMENT EN COURS…" : `VALIDER — ${formatEur(totalAfterDiscount)}`}
      </button>

      <div
        style={{
          textAlign: "center",
          marginTop: "1.25rem",
          fontSize: 11,
          color: "rgba(245,241,230,0.45)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          letterSpacing: 1,
        }}
      >
        <svg width="11" height="11" viewBox="0 0 14 14" style={{ flexShrink: 0 }}>
          <rect x="2.5" y="6" width="9" height="6.5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <path d="M4.5 6V4C4.5 2.5 5.5 1.5 7 1.5C8.5 1.5 9.5 2.5 9.5 4V6" fill="none" stroke="currentColor" strokeWidth="1.2" />
        </svg>
        <span>PAIEMENT SÉCURISÉ · STRIPE</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: "2rem" }}>
        <div style={{ width: 50, height: 0.5, background: "rgba(201,160,78,0.4)" }} />
        <svg width="6" height="6" viewBox="0 0 8 8">
          <path d="M4 0L8 4L4 8L0 4Z" fill="rgba(201,160,78,0.5)" />
        </svg>
        <div style={{ width: 50, height: 0.5, background: "rgba(201,160,78,0.4)" }} />
      </div>
    </form>
  );
}
