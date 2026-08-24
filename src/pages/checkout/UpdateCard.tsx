// UpdateCard — page publique /update-card/:token
//
// Process "Changer de carte" : le client saisit sa NOUVELLE carte (SetupIntent,
// PCI-safe — jamais côté nous). Le back (webhook setup_intent.succeeded, source
// "card_update") la met par défaut (customer + abo) puis rejoue immédiatement
// l'échéance ouverte. Même abonnement, zéro friction.
//
// Réutilise le socle checkout : thème noir/or, CheckoutCanvas, Stripe Elements
// en mode "setup". Formulaire minimal (nom pré-rempli + carte).

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
// `/pure` et non l'entrée par défaut : importer `@stripe/stripe-js` INJECTE
// le script Stripe dans la page, au simple import. Les pages de paiement
// étant importées en dur dans App.tsx, Stripe se chargeait sur TOUTES les
// pages — y compris les tunnels publicitaires, qui n'encaissent rien
// (mesuré : 238 Ko + une iframe invisible). Avec `/pure`, le script n'est
// chargé qu'au premier appel de `loadStripe()`, donc ici seulement.
import { loadStripe, type Stripe } from "@stripe/stripe-js/pure";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/al-baraka-logo-v2.png";
import { Lock, ShieldCheck, AlertTriangle, Loader2, CreditCard } from "lucide-react";
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

interface CardUpdateLookup {
  full_name: string | null;
  email: string | null;
  product: string | null;
  is_valid: boolean;
  reason: string | null;
}

export default function UpdateCard() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const testMode = searchParams.get("test") === "1";
  const token = (params.token || "").trim().toUpperCase();

  const [lookup, setLookup] = useState<CardUpdateLookup | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.rpc("lookup_card_update_token", { p_token: token });
        if (cancelled) return;
        if (error) {
          console.error("lookup_card_update_token failed:", error);
          setLookup(null);
        } else if (Array.isArray(data) && data.length > 0) {
          setLookup(data[0] as CardUpdateLookup);
        } else {
          setLookup(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const publishableKey = testMode
    ? import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_TEST
    : import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

  const stripePromise = useMemo<Promise<Stripe | null>>(() => {
    if (!publishableKey) return Promise.resolve(null);
    return loadStripe(publishableKey);
  }, [publishableKey]);

  const elementsOptions = useMemo(
    () => ({
      mode: "setup" as const,
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
          ".Input": { border: `1px solid ${THEME.goldDim}`, padding: "13px 14px" },
          ".Input:focus": { borderColor: THEME.gold, boxShadow: `0 0 0 3px rgba(201,160,78,0.15)` },
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
    }),
    [],
  );

  if (!publishableKey) {
    return <ErrorScreen title="Configuration paiement manquante" message="Clé publique Stripe non configurée. Contactez le support." />;
  }

  if (loading) {
    return (
      <FullScreen>
        <Loader2 size={28} style={{ color: THEME.gold }} className="animate-spin" />
        <p style={{ color: THEME.creamMuted, fontSize: 13, marginTop: 14 }}>Vérification de ton lien…</p>
      </FullScreen>
    );
  }

  if (!lookup || !lookup.is_valid) {
    let title = "Lien invalide";
    let message = "Ce lien de mise à jour de carte n'est plus valide. Contactez le support pour un nouveau lien.";
    if (lookup?.reason === "used") {
      title = "Lien déjà utilisé";
      message = "Ta carte a déjà été mise à jour avec ce lien. Si besoin, demande un nouveau lien.";
    } else if (lookup?.reason === "expired") {
      title = "Lien expiré";
      message = "Ce lien a expiré. Demande un nouveau lien pour mettre à jour ta carte.";
    } else if (lookup?.reason === "not_found") {
      title = "Lien introuvable";
      message = "Le code de ce lien ne correspond à rien. Vérifie que tu utilises le lien le plus récent.";
    }
    return <ErrorScreen title={title} message={message} />;
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
      <div style={{ position: "relative", zIndex: 2, maxWidth: 460, margin: "0 auto", padding: "36px 20px 60px" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <img
            src={logo}
            alt="AL BARAKA"
            style={{ width: 76, height: 76, objectFit: "contain", marginBottom: 16, marginInline: "auto", display: "block", filter: "drop-shadow(0 0 20px rgba(201,160,78,0.18))" }}
          />
          <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: THEME.gold, marginBottom: 6 }}>
            {lookup.product || "AL BARAKA"}
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 600, margin: 0, color: THEME.cream }}>Mets à jour ta carte</h1>
          <p style={{ fontSize: 13, color: THEME.creamMuted, marginTop: 8, maxWidth: 380, marginInline: "auto", lineHeight: 1.5 }}>
            Saisis ta nouvelle carte ci-dessous. Ton abonnement reste le même — l'échéance en attente sera prélevée
            immédiatement sur cette carte.
          </p>
        </div>

        <Elements stripe={stripePromise} options={elementsOptions}>
          <UpdateCardForm token={token} testMode={testMode} lookup={lookup} />
        </Elements>

        <div style={{ marginTop: 24, display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap", color: THEME.creamDim, fontSize: 11 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Lock size={11} /> Paiement sécurisé Stripe</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><ShieldCheck size={11} /> 3D Secure activé</span>
        </div>
      </div>
    </div>
  );
}

function UpdateCardForm({ token, testMode, lookup }: { token: string; testMode: boolean; lookup: CardUpdateLookup }) {
  const stripe = useStripe();
  const elements = useElements();
  const [name, setName] = useState(lookup.full_name || "");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) {
      toast.error("Stripe pas encore chargé, réessaie dans une seconde");
      return;
    }
    if (!name.trim()) {
      toast.error("Nom requis");
      return;
    }
    setSubmitting(true);
    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        toast.error(submitError.message || "Erreur de validation de la carte");
        setSubmitting(false);
        return;
      }

      const { data, error: invokeError } = await supabase.functions.invoke<{
        client_secret: string;
        intent_id: string;
        intent_type: string;
        error?: string;
      }>("update-card", { body: { token, test_mode: testMode } });

      let result = data ?? null;
      if (invokeError) {
        const ctx = (invokeError as { context?: Response }).context;
        if (ctx && typeof ctx.json === "function") {
          try { result = await ctx.json(); } catch { /* keep null */ }
        }
      }
      if (!result?.client_secret) {
        toast.error(result?.error || invokeError?.message || "Impossible de préparer la mise à jour");
        setSubmitting(false);
        return;
      }

      const returnUrl = `${window.location.origin}/update-card/merci${testMode ? "?test=1" : ""}`;
      const confirmRes = await stripe.confirmSetup({
        elements,
        clientSecret: result.client_secret,
        confirmParams: {
          return_url: returnUrl,
          payment_method_data: {
            billing_details: { name: name.trim(), email: lookup.email || undefined },
          },
        },
      });
      if (confirmRes.error) {
        toast.error(confirmRes.error.message || "Carte refusée");
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
        <div>
          <label style={labelStyle}>Nom sur la carte</label>
          <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} autoComplete="cc-name" />
        </div>
        <div>
          <label style={labelStyle}>Nouvelle carte bancaire</label>
          <PaymentElement options={{ layout: "tabs", wallets: { applePay: "never", googlePay: "never" } }} />
        </div>
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
            boxShadow: "0 10px 25px rgba(201,160,78,0.25)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <CreditCard size={16} />
          {submitting ? "Traitement…" : "Enregistrer ma carte"}
        </button>
      </div>
    </form>
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
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12, textAlign: "center" }}>{title}</h1>
      <p style={{ color: THEME.creamMuted, fontSize: 14, textAlign: "center", maxWidth: 440, lineHeight: 1.5 }}>{message}</p>
    </FullScreen>
  );
}
