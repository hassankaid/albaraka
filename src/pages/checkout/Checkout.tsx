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
import logo from "@/assets/al-baraka-logo-v2.png";
import { Lock, ShieldCheck, CheckCircle2, Tag, X, ArrowRight, ChevronDown } from "lucide-react";

const TOTAL_EUR = 2500;

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
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: "clamp(28px, 5vw, 36px)",
          fontWeight: 500,
          color: THEME.cream,
          margin: 0,
          letterSpacing: "0.12em",
          lineHeight: 1.1,
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
    [installments, totalAfterDiscount],
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: THEME.bg,
        color: THEME.cream,
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: "4rem 1.25rem 3rem",
      }}
    >
      <style>{`
        @keyframes alb-fade-up {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes alb-spin { to { transform: rotate(360deg); } }

        .alb-fade { animation: alb-fade-up 0.7s ease-out both; }
        .alb-fade-2 { animation: alb-fade-up 0.7s ease-out 0.1s both; }

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
          transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
          outline: none;
        }
        .alb-field::placeholder { color: ${THEME.creamDim}; }
        .alb-field:hover { border-color: ${THEME.goldLine}; }
        .alb-field:focus {
          border-color: ${THEME.gold};
          background: rgba(255,255,255,0.04);
          box-shadow: 0 0 0 3px rgba(201,160,78,0.12);
        }

        /* Section label */
        .alb-section-label {
          display: block;
          font-size: 10.5px;
          font-weight: 600;
          letter-spacing: 0.2em;
          color: ${THEME.gold};
          text-transform: uppercase;
          margin-bottom: 14px;
        }

        /* Checkbox */
        .alb-checkbox { accent-color: ${THEME.gold}; }

        /* Bouton primaire */
        .alb-submit {
          width: 100%;
          background: linear-gradient(180deg, #DDB968 0%, ${THEME.gold} 100%);
          color: #1a1200;
          border: none;
          border-radius: 12px;
          padding: 17px 20px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          letter-spacing: 0.12em;
          font-family: inherit;
          transition: transform 0.15s, box-shadow 0.25s, filter 0.15s;
          box-shadow: 0 1px 0 rgba(255,255,255,0.2) inset, 0 0 0 1px ${THEME.gold}, 0 8px 24px rgba(201,160,78,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        .alb-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          filter: brightness(1.06);
          box-shadow: 0 1px 0 rgba(255,255,255,0.25) inset, 0 0 0 1px ${THEME.goldBright}, 0 14px 40px rgba(201,160,78,0.45);
        }
        .alb-submit:active:not(:disabled) { transform: translateY(0); }
        .alb-submit:disabled { opacity: 0.5; cursor: not-allowed; }
        .alb-submit .alb-arrow { transition: transform 0.25s; }
        .alb-submit:hover:not(:disabled) .alb-arrow { transform: translateX(4px); }

        /* Bouton secondaire (code promo) */
        .alb-btn-ghost {
          background: transparent;
          border: 1px solid ${THEME.goldLine};
          color: ${THEME.gold};
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 12px;
          letter-spacing: 0.12em;
          font-weight: 500;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.15s, border-color 0.15s;
          white-space: nowrap;
        }
        .alb-btn-ghost:hover:not(:disabled) {
          background: rgba(201,160,78,0.06);
          border-color: ${THEME.gold};
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
          transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
        }
        .alb-phone .PhoneInput:focus-within {
          border-color: ${THEME.gold};
          background: rgba(255,255,255,0.04);
          box-shadow: 0 0 0 3px rgba(201,160,78,0.12);
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
          letter-spacing: 0.08em;
        }
      `}</style>

      <div style={{ maxWidth: 440, margin: "0 auto" }}>
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
  const [couponOpen, setCouponOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const discountPercent = coupon.status === "valid" ? coupon.percent : 0;
  const perInstallment = Math.round((totalAfterDiscount / installments) * 100) / 100;

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
                  <span style={{ color: THEME.gold }}>−{coupon.percent}%</span>
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

      {/* Résumé prix — ligne très nette */}
      <section
        style={{
          padding: "20px 20px",
          border: `1px solid ${THEME.goldLine}`,
          borderRadius: 14,
          background:
            "linear-gradient(180deg, rgba(201,160,78,0.04) 0%, rgba(201,160,78,0.01) 100%)",
        }}
      >
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
            {installments === 1 ? "Total" : "Aujourd'hui"}
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
            {formatEur(installments === 1 ? totalAfterDiscount : perInstallment)}
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
            puis {installments - 1} × {formatEur(perInstallment)} / mois · total {formatEur(totalAfterDiscount)}
          </div>
        )}
      </section>

      {/* CGV — compact */}
      <section>
        <label
          style={{
            display: "flex",
            gap: 10,
            fontSize: 12.5,
            cursor: "pointer",
            alignItems: "flex-start",
            color: THEME.cream,
            lineHeight: 1.55,
          }}
        >
          <input
            type="checkbox"
            className="alb-checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            style={{ marginTop: 3, flexShrink: 0, width: 16, height: 16 }}
          />
          <span>
            Je confirme mon inscription au PASS AL BARAKA. Je souhaite accéder au contenu immédiatement et renonce à mon droit de rétractation de 14 jours (article L221-28 13° du Code de la consommation).
            {installments > 1 && " Je m'engage sur la totalité du paiement échelonné."}
          </span>
        </label>
      </section>

      {/* Bouton */}
      <button type="submit" className="alb-submit" disabled={submitting || !stripe}>
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
