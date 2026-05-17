// FormationCheckout — page wrapper pour le checkout des formations a la carte.
//
// Strategie : on REUTILISE l'infra `/pay/<token>` deja en prod (page
// PaymentLinkCheckout, edge function custom_link, webhook ensureCustomLinkOrder)
// plutot que de dupliquer un checkout dedie.
//
// Flow (Sprint S2, 17/05/2026) :
//   1. L'utilisateur arrive sur /checkout/formation/<slug>/<N> (N = 1, 2 ou 3)
//      [?test=1] [?promo=X] [?start=YYYY-MM-DD]
//   2. Cette page lit `installments` depuis l'URL (avec fallback default=1
//      si /checkout/formation/<slug> sans N pour retrocompat).
//   3. Lookup l'offre via `lookup_a_la_carte_offer(slug)` pour valider
//      min/max installments.
//   4. Auto-creation du payment_link via `create_formation_payment_link(slug, N)`
//      → redirect immediat vers /pay/<token>.
//
// PAS d'ecran de choix : Hassan veut que ce soit le LIEN qu'il envoie qui
// definit le nombre de mensualites (cf. Pass AL BARAKA /checkout/N et
// Liberty /liberty/N). Si N invalide → erreur claire.

import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertTriangle, GraduationCap } from "lucide-react";
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

const ERROR_MESSAGES: Record<string, string> = {
  offer_not_found: "Cette formation n'existe pas dans le catalogue.",
  offer_not_a_la_carte: "Cette offre n'est pas disponible à l'achat à la carte.",
  offer_not_active: "Cette formation n'est plus disponible à l'achat.",
  offer_no_formation_link: "Erreur de configuration : la formation n'est pas correctement liée au catalogue. Contacte le support.",
  deferred_start_must_be_future: "La date de démarrage différé doit être dans le futur.",
  deferred_start_too_far: "La date de démarrage ne peut pas être à plus de 6 mois.",
  invalid_installments: "Le nombre de mensualités demandé n'est pas autorisé pour cette formation.",
  installments_required_in_url: "Lien invalide : le nombre de mensualités doit être précisé dans l'URL (/checkout/formation/<slug>/1, /2 ou /3).",
  rpc_failed: "Impossible de préparer le paiement. Réessaie dans quelques instants.",
  slug_required: "URL invalide : la formation n'est pas précisée.",
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

export default function FormationCheckout() {
  const { slug, installments: installmentsParam } = useParams<{ slug: string; installments?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const calledRef = useRef(false);

  const [error, setError] = useState<ErrorState>(null);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    async function run() {
      if (!slug) {
        setError({ code: "slug_required", message: ERROR_MESSAGES.slug_required });
        return;
      }

      // Parse installments depuis l'URL. Si absent → default 1 (retrocompat).
      // Si present mais invalide (non-numerique, hors plage), on echoue
      // explicitement pour eviter qu'un lien casse passe en silence.
      let installments = 1;
      if (installmentsParam !== undefined) {
        const parsed = Number(installmentsParam);
        if (!Number.isInteger(parsed) || parsed < 1 || parsed > 12) {
          setError({
            code: "invalid_installments",
            message: `Le nombre de mensualités "${installmentsParam}" n'est pas valide.`,
          });
          return;
        }
        installments = parsed;
      }

      const testMode = searchParams.get("test") === "1";
      const promoCode = searchParams.get("promo");
      const startDate = searchParams.get("start");

      try {
        // Lookup l'offre pour valider que installments est dans [min..max]
        // AVANT de creer le lien. Permet une erreur claire au lieu d'un
        // generic "invalid_installments" cote RPC.
        const { data: offerData, error: lookupErr } = await supabase.rpc(
          "lookup_a_la_carte_offer" as any,
          { p_slug: slug },
        );
        if (lookupErr) {
          console.error("[FormationCheckout] lookup error:", lookupErr);
          setError({ code: "rpc_failed", message: ERROR_MESSAGES.rpc_failed });
          return;
        }
        const offer = Array.isArray(offerData) && offerData.length > 0 ? (offerData[0] as OfferLookup) : null;
        if (!offer || !offer.is_valid) {
          const code = offer?.reason || "offer_not_found";
          setError({ code, message: ERROR_MESSAGES[code] || `Erreur : ${code}` });
          return;
        }
        if (installments < offer.min_installments_count || installments > offer.max_installments_count) {
          setError({
            code: "invalid_installments",
            message: `Cette formation accepte ${offer.min_installments_count}× à ${offer.max_installments_count}× mensualités. Le lien demande ${installments}×.`,
          });
          return;
        }

        // Creation du lien
        const { data, error: rpcErr } = await supabase.rpc("create_formation_payment_link", {
          p_offer_slug: slug,
          p_installments: installments,
          p_deferred_start: startDate || null,
        });

        if (rpcErr) {
          console.error("[FormationCheckout] create RPC error:", rpcErr);
          setError({ code: "rpc_failed", message: ERROR_MESSAGES.rpc_failed });
          return;
        }

        const result = data as { success?: boolean; token?: string; error?: string } | null;
        if (!result || result.error) {
          const code = result?.error || "rpc_failed";
          setError({ code, message: ERROR_MESSAGES[code] || `Erreur inconnue : ${code}` });
          return;
        }

        if (!result.token) {
          setError({ code: "rpc_failed", message: ERROR_MESSAGES.rpc_failed });
          return;
        }

        const targetParams = new URLSearchParams();
        if (testMode) targetParams.set("test", "1");
        if (promoCode) targetParams.set("promo", promoCode);
        const qs = targetParams.toString();
        const target = `/pay/${result.token}${qs ? `?${qs}` : ""}`;
        navigate(target, { replace: true });
      } catch (e) {
        console.error("[FormationCheckout] unexpected error:", e);
        setError({ code: "rpc_failed", message: ERROR_MESSAGES.rpc_failed });
      }
    }

    run();
  }, [slug, installmentsParam, searchParams, navigate]);

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
              <GraduationCap size={26} color={THEME.gold} />
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
