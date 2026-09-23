// AlBaraka200Checkout — page d'entrée du paiement de l'offre « Al Baraka
// 200 €/mois » : /checkout/al-baraka-200/<N>.
//
// 2 400 € au total, en 12 mensualités de 200 € par défaut. Choisir moins de
// mensualités ne change pas le total : 6× = 400 €/mois. Ce n'est pas un
// abonnement — Stripe reçoit un `cancel_at` à N mois et s'arrête après la
// dernière échéance.
//
// Même stratégie que FormationCheckout : on ne construit pas un énième
// tunnel de paiement. On crée un payment_link à la volée et on renvoie sur
// /pay/<token>, qui sait déjà tout faire — échéancier, engagements, contrat,
// encaissement, et l'attribution du Pass AL BARAKA après paiement.
//
// Le nombre de mensualités vient de l'URL, pas d'un écran de choix : c'est le
// LIEN envoyé par le closer qui fixe la modalité (même règle que /checkout/N
// pour le Pass et /liberty/N). Sans N, on prend 12.
//
// Attention au chemin : surtout pas `/al-baraka-200/...`. Sur le domaine de
// l'app, ce préfixe est renvoyé vers introuvable.html par vercel.json — il
// n'existe que sur event.albarakaecosysteme.com, où vit le tunnel de vente.

import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertTriangle, Crown } from "lucide-react";
import logo from "@/assets/al-baraka-logo-v2.png";

type ErrorState = { code: string; message: string } | null;

interface OfferLookup {
  offer_id: string;
  label: string;
  default_price_ht: number;
  min_installments_count: number;
  max_installments_count: number;
  is_valid: boolean;
  reason: string | null;
}

/** Mensualités par défaut quand l'URL n'en précise pas : l'offre à 200 €/mois. */
const MENSUALITES_PAR_DEFAUT = 12;

const ERROR_MESSAGES: Record<string, string> = {
  offer_not_found: "Cette offre n'existe pas dans le catalogue.",
  offer_not_active: "Cette offre n'est plus disponible à l'achat.",
  offer_wrong_category: "Erreur de configuration de l'offre. Contacte le support.",
  invalid_installments: "Le nombre de mensualités demandé n'est pas autorisé pour cette offre.",
  deferred_start_must_be_future: "La date de démarrage différé doit être dans le futur.",
  deferred_start_too_far: "La date de démarrage ne peut pas être à plus de 6 mois.",
  rpc_failed: "Impossible de préparer le paiement. Réessaie dans quelques instants.",
};

const THEME = {
  bg: "#0A0A0A",
  cream: "#F5F1E6",
  creamMuted: "rgba(245,241,230,0.62)",
  creamDim: "rgba(245,241,230,0.38)",
  gold: "#C9A04E",
  goldDim: "rgba(201,160,78,0.10)",
  goldLine: "rgba(201,160,78,0.28)",
};

export default function AlBaraka200Checkout() {
  const { installments: installmentsParam } = useParams<{ installments?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const calledRef = useRef(false);

  const [error, setError] = useState<ErrorState>(null);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    async function run() {
      // Un N absent est légitime (lien court) ; un N présent mais illisible
      // ne l'est pas — mieux vaut une erreur nette qu'un montant surprise.
      let installments = MENSUALITES_PAR_DEFAUT;
      if (installmentsParam !== undefined) {
        const parsed = Number(installmentsParam);
        if (!Number.isInteger(parsed) || parsed < 1 || parsed > 12) {
          setError({
            code: "invalid_installments",
            message: `Le nombre de mensualités « ${installmentsParam} » n'est pas valide.`,
          });
          return;
        }
        installments = parsed;
      }

      const testMode = searchParams.get("test") === "1";
      const promoCode = searchParams.get("promo");
      const startDate = searchParams.get("start");

      try {
        // On valide la fourchette AVANT de créer quoi que ce soit : si Sidali
        // change le max dans l'admin, l'erreur reste compréhensible.
        const { data: offerData, error: lookupErr } = await supabase.rpc(
          "lookup_al_baraka_200_offer" as any,
        );
        if (lookupErr) {
          console.error("[AlBaraka200Checkout] lookup error:", lookupErr);
          setError({ code: "rpc_failed", message: ERROR_MESSAGES.rpc_failed });
          return;
        }
        const offer =
          Array.isArray(offerData) && offerData.length > 0 ? (offerData[0] as OfferLookup) : null;
        if (!offer || !offer.is_valid) {
          const code = offer?.reason || "offer_not_found";
          setError({ code, message: ERROR_MESSAGES[code] || `Erreur : ${code}` });
          return;
        }
        if (
          installments < offer.min_installments_count ||
          installments > offer.max_installments_count
        ) {
          setError({
            code: "invalid_installments",
            message: `Cette offre accepte ${offer.min_installments_count}× à ${offer.max_installments_count}× mensualités. Le lien demande ${installments}×.`,
          });
          return;
        }

        const { data, error: rpcErr } = await supabase.rpc(
          "create_al_baraka_200_payment_link" as any,
          { p_installments: installments, p_deferred_start: startDate || null },
        );
        if (rpcErr) {
          console.error("[AlBaraka200Checkout] create RPC error:", rpcErr);
          setError({ code: "rpc_failed", message: ERROR_MESSAGES.rpc_failed });
          return;
        }

        const result = data as { success?: boolean; token?: string; error?: string } | null;
        if (!result || result.error || !result.token) {
          const code = result?.error || "rpc_failed";
          setError({ code, message: ERROR_MESSAGES[code] || `Erreur inconnue : ${code}` });
          return;
        }

        const targetParams = new URLSearchParams();
        if (testMode) targetParams.set("test", "1");
        if (promoCode) targetParams.set("promo", promoCode);
        const qs = targetParams.toString();
        navigate(`/pay/${result.token}${qs ? `?${qs}` : ""}`, { replace: true });
      } catch (e) {
        console.error("[AlBaraka200Checkout] unexpected error:", e);
        setError({ code: "rpc_failed", message: ERROR_MESSAGES.rpc_failed });
      }
    }

    run();
  }, [installmentsParam, searchParams, navigate]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: THEME.bg,
        color: THEME.cream,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div style={{ maxWidth: 440, width: "100%", textAlign: "center" }}>
        <img
          src={logo}
          alt="AL BARAKA"
          style={{ width: 64, height: 64, margin: "0 auto 24px", opacity: 0.9 }}
        />

        {error ? (
          <div>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "rgba(245,158,11,0.12)",
                border: "1px solid rgba(245,158,11,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <AlertTriangle size={26} color="#FCD34D" />
            </div>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 600,
                color: THEME.cream,
                marginBottom: 8,
                fontFamily: "'Cormorant Garamond', serif",
              }}
            >
              Paiement indisponible
            </h1>
            <p style={{ fontSize: 14, color: THEME.creamMuted, lineHeight: 1.5 }}>
              {error.message}
            </p>
            <p style={{ fontSize: 11, color: THEME.creamDim, marginTop: 16 }}>
              Code : <code>{error.code}</code>
            </p>
          </div>
        ) : (
          <div>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: THEME.goldDim,
                border: `1px solid ${THEME.goldLine}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <Crown size={26} color={THEME.gold} />
            </div>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 600,
                color: THEME.cream,
                marginBottom: 8,
                fontFamily: "'Cormorant Garamond', serif",
              }}
            >
              Préparation du paiement…
            </h1>
            <p style={{ fontSize: 14, color: THEME.creamMuted }}>
              Vous allez être redirigé vers le tunnel sécurisé dans un instant.
            </p>
            <Loader2
              size={24}
              color={THEME.gold}
              style={{ marginTop: 24, animation: "spin 1s linear infinite" }}
            />
            <style>{`
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}
      </div>
    </div>
  );
}
