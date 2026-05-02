// AcompteCheckout — page de paiement d'acompte (50, 100 ou 150 €).
//
// Route : /acompte/:montant (50, 100 ou 150)
//
// Différences avec le Checkout principal :
//   - Montant fixe (pas de plan de paiement)
//   - Pas de coupon promo
//   - Paiement one-shot (PaymentIntent uniquement)
//   - Redirection vers /merci-acompte après paiement
//
// Design : reprend exactement le même thème noir/or que le Checkout principal,
// avec le CheckoutCanvas en fond et le logo AL BARAKA.

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import PhoneInput, { isValidPhoneNumber, getCountries, getCountryCallingCode } from "react-phone-number-input";
import type { Country } from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import "react-phone-number-input/style.css";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/al-baraka-logo-v2.png";
import { Lock, ShieldCheck, ChevronDown } from "lucide-react";
import CheckoutCanvas from "./CheckoutCanvas";

const ACOMPTE_VALID = [50, 100, 150];

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

function CountrySelect({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
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
        <span>{value ? countryName(value) : "Sélectionner un pays"}</span>
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
            maxHeight: 280,
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
            overflow: "hidden",
          }}
        >
          <input
            ref={inputRef}
            type="text"
            placeholder="Rechercher…"
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

export default function AcompteCheckout() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const testMode = searchParams.get("test") === "1";

  const acompteAmount = Number(params.montant);
  const isValidAmount = ACOMPTE_VALID.includes(acompteAmount);

  const publishableKey = testMode
    ? import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_TEST
    : import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  const stripeKeyMissing = !publishableKey;

  const stripePromise = useMemo<Promise<Stripe | null>>(() => {
    if (!publishableKey) return Promise.resolve(null);
    return loadStripe(publishableKey);
  }, [publishableKey]);

  const elementsOptions = useMemo(
    () => ({
      mode: "payment" as const,
      amount: acompteAmount * 100,
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
        },
      },
    }),
    [acompteAmount],
  );

  if (!isValidAmount) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: THEME.bg,
          color: THEME.cream,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 440 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>
            Lien d'acompte invalide
          </h1>
          <p style={{ color: THEME.creamMuted, fontSize: 14 }}>
            Le montant doit être 50, 100 ou 150 €. Reçu : {params.montant}.
          </p>
        </div>
      </div>
    );
  }

  if (stripeKeyMissing) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: THEME.bg,
          color: THEME.cream,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <p>Clé publique Stripe manquante. Contactez le support.</p>
      </div>
    );
  }

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
            Acompte AL BARAKA
          </div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 600,
              margin: 0,
              color: THEME.cream,
            }}
          >
            {formatEur(acompteAmount)}
          </h1>
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
            Versement sécurisé. Vous recevrez votre facture par email avec un code
            personnel pour finaliser votre PASS AL BARAKA.
          </p>
        </div>

        <Elements stripe={stripePromise} options={elementsOptions}>
          <AcompteForm acompteAmount={acompteAmount} testMode={testMode} />
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

function AcompteForm({
  acompteAmount,
  testMode,
}: {
  acompteAmount: number;
  testMode: boolean;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();

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
    if (!agreed) return "Tu dois accepter les conditions";
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
        intent_id: string;
        error?: string;
      }>("create-payment-intent", {
        body: {
          product_type: "acompte",
          acompte_amount: acompteAmount,
          test_mode: testMode,
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

      const returnUrl = `${window.location.origin}/merci-acompte${testMode ? "?test=1" : ""}`;
      const { error: confirmErr } = await stripe.confirmPayment({
        elements,
        clientSecret: data.client_secret,
        confirmParams: {
          return_url: returnUrl,
          payment_method_data: {
            billing_details: {
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
            },
          },
        },
      });

      if (confirmErr) {
        toast.error(confirmErr.message || "Paiement refusé");
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
            style={{
              ...inputStyle,
              padding: "8px 12px",
              gap: 10,
            }}
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

        <div
          style={{
            height: 1,
            background: THEME.goldLine,
            margin: "8px 0",
          }}
        />

        <div>
          <label style={labelStyle}>Carte bancaire</label>
          <PaymentElement options={{ layout: "tabs", wallets: { applePay: "never", googlePay: "never" } }} />
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
            J'accepte de verser cet acompte de {formatEur(acompteAmount)} pour réserver mon PASS AL BARAKA.
            Je recevrai par email ma facture et un code personnel à utiliser lors de mon paiement final.
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
          {submitting ? "Traitement…" : `Payer ${formatEur(acompteAmount)}`}
        </button>
      </div>
    </form>
  );
}
