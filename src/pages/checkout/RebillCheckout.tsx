// RebillCheckout — page de paiement pour un solde restant après modification
// du plan de paiement.
//
// Route : /checkout/rebill/:token
//
// Flow :
//   1. Le CEO modifie un plan de paiement dans /sales (wizard ReschedulePayments).
//   2. Le CEO génère un lien rebill ALB-RB-XXXXXXXX et l'envoie au client.
//   3. Le client ouvre ce lien, voit son solde restant + nombre de mensualités,
//      saisit ses coordonnées + carte bancaire.
//   4. Stripe crée une nouvelle subscription (Nx) ou un PaymentIntent (1x).
//   5. Le webhook attache le sub_id aux pending existants et marque la 1re paid.
//
// Design : reprend exactement le même thème noir/or que les autres checkouts
// (Acompte, Liberty, principal) — homogénéité maximale UX client.

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

interface RebillLookup {
  sale_id: string;
  contact_id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  product: string | null;
  payable_total: number;
  installments_count: number;
  monthly_amount: number;
  is_valid: boolean;
  reason: string | null;
}

export default function RebillCheckout() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const testMode = searchParams.get("test") === "1";
  const token = (params.token || "").trim().toUpperCase();

  const [lookup, setLookup] = useState<RebillLookup | null>(null);
  const [lookupLoading, setLookupLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLookupLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.rpc("lookup_rebill_token", {
          p_token: token,
        });
        if (cancelled) return;
        if (error) {
          console.error("lookup_rebill_token failed:", error);
          setLookup(null);
        } else if (Array.isArray(data) && data.length > 0) {
          setLookup(data[0] as RebillLookup);
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

  const publishableKey = testMode
    ? import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_TEST
    : import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  const stripeKeyMissing = !publishableKey;

  const stripePromise = useMemo<Promise<Stripe | null>>(() => {
    if (!publishableKey) return Promise.resolve(null);
    return loadStripe(publishableKey);
  }, [publishableKey]);

  const installmentsCount = lookup?.installments_count ?? 1;
  const payableTotal = lookup?.payable_total ?? 0;

  const elementsOptions = useMemo(
    () => ({
      mode: (installmentsCount === 1 ? "payment" : "subscription") as "payment" | "subscription",
      amount: Math.max(Math.round(payableTotal * 100), 100),
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
    [installmentsCount, payableTotal],
  );

  // ─── Erreurs ────────────────────────────────────────────────────────
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
      "Ce lien de paiement n'est plus valide. Contactez le support pour obtenir un nouveau lien.";
    if (lookup?.reason === "sale_closed") {
      title = "Plan déjà soldé";
      message = "Ce plan de paiement est déjà clôturé — aucun montant restant à régler.";
    } else if (lookup?.reason === "no_pending_payments") {
      title = "Plus rien à payer";
      message = "Toutes les mensualités de ce plan ont déjà été payées.";
    } else if (lookup?.reason === "not_found") {
      title = "Lien introuvable";
      message =
        "Le code de ce lien ne correspond à aucun plan de paiement. Vérifiez que vous avez utilisé le lien le plus récent reçu.";
    }
    return <ErrorScreen title={title} message={message} />;
  }

  // ─── OK : affichage ─────────────────────────────────────────────────
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
            {lookup.product || "AL BARAKA"} — Solde restant
          </div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 600,
              margin: 0,
              color: THEME.cream,
            }}
          >
            {formatEur(payableTotal)}
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
            {installmentsCount === 1
              ? "Paiement en 1 fois pour solder votre plan."
              : `${installmentsCount} mensualités pour solder votre plan.`}
          </p>
        </div>

        <Elements stripe={stripePromise} options={elementsOptions}>
          <RebillForm
            token={token}
            testMode={testMode}
            lookup={lookup}
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
      <p style={{ color: THEME.creamMuted, fontSize: 14, textAlign: "center", maxWidth: 440, lineHeight: 1.5 }}>
        {message}
      </p>
    </FullScreen>
  );
}

function RebillForm({
  token,
  testMode,
  lookup,
}: {
  token: string;
  testMode: boolean;
  lookup: RebillLookup;
}) {
  const stripe = useStripe();
  const elements = useElements();

  // Pré-remplissage depuis les données du contact
  const initialFirst = (() => {
    const parts = (lookup.full_name || "").trim().split(/\s+/);
    return parts[0] || "";
  })();
  const initialLast = (() => {
    const parts = (lookup.full_name || "").trim().split(/\s+/);
    return parts.slice(1).join(" ");
  })();

  const [billing, setBilling] = useState<BillingFields>({
    first_name: initialFirst,
    last_name: initialLast,
    email: lookup.email || "",
    phone: lookup.phone || "",
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
    if (!agreed) return "Tu dois confirmer ton paiement";
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
        intent_type: "payment" | "subscription";
        amount_cents: number;
        installments: number;
        error?: string;
      }>("create-payment-intent", {
        body: {
          product_type: "rebill",
          rebill_token: token,
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

      const returnUrl = `${window.location.origin}/merci${testMode ? "?test=1&rebill=1" : "?rebill=1"}`;
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

  const installmentsCount = lookup.installments_count;
  const monthlyAmount = lookup.monthly_amount;

  // Bouton : montant à débiter aujourd'hui (1re mensualité ou solde 1x)
  const todayCharge =
    installmentsCount === 1
      ? lookup.payable_total
      : (() => {
          // Reproduit le calcul backend : 1re mensualité = baseCents + extraCents
          const totalCents = Math.round(lookup.payable_total * 100);
          const baseCents = Math.floor(totalCents / installmentsCount);
          const extraCents = totalCents - baseCents * installmentsCount;
          return (baseCents + extraCents) / 100;
        })();

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
        {/* Récap plan */}
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
            <span style={{ color: THEME.creamMuted }}>Solde total</span>
            <strong style={{ color: THEME.goldBright }}>{formatEur(lookup.payable_total)}</strong>
          </div>
          {installmentsCount > 1 && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: THEME.creamMuted }}>Aujourd'hui</span>
                <strong>{formatEur(todayCharge)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: THEME.creamMuted }}>
                  Puis {installmentsCount - 1} × tous les mois
                </span>
                <strong>{formatEur(monthlyAmount)}</strong>
              </div>
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
            {installmentsCount === 1 ? (
              <>
                J'autorise le débit unique de{" "}
                <strong style={{ color: THEME.goldBright }}>{formatEur(todayCharge)}</strong> pour
                solder mon plan {lookup.product || "AL BARAKA"}.
              </>
            ) : (
              <>
                J'autorise le débit immédiat de{" "}
                <strong style={{ color: THEME.goldBright }}>{formatEur(todayCharge)}</strong> puis{" "}
                {installmentsCount - 1} prélèvements mensuels de{" "}
                <strong style={{ color: THEME.goldBright }}>{formatEur(monthlyAmount)}</strong>{" "}
                pour solder mon plan {lookup.product || "AL BARAKA"}.
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
          {submitting ? "Traitement…" : `Payer ${formatEur(todayCharge)}`}
        </button>
      </div>
    </form>
  );
}
