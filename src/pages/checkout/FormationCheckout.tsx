// FormationCheckout — page wrapper pour le checkout des formations a la carte.
//
// Strategie : on REUTILISE l'infra `/pay/<token>` deja en prod (page
// PaymentLinkCheckout, edge function custom_link, webhook ensureCustomLinkOrder)
// plutot que de dupliquer un checkout dedie.
//
// Flow (Sprint R, 17/05/2026) :
//   1. L'utilisateur arrive sur /checkout/formation/<slug> [?test=1] [?promo=X]
//      [?start=YYYY-MM-DD] [?n=1|2|3]
//   2. Au mount, on appelle `lookup_a_la_carte_offer(slug)` pour recuperer
//      le prix + min/max installments de l'offre.
//   3. Si un seul choix (min==max==1) OU si ?n=N est specifie : on
//      auto-cree le payment_link + redirect direct (comportement Sprint F).
//   4. Sinon : on AFFICHE un ecran de selection des mensualites (1x, 2x, 3x)
//      avec les montants formates. L'utilisateur clique → on cree le lien
//      avec p_installments=N → redirect /pay/<token>.
//
// Avantage : 1 seul tunnel a maintenir + UX choix mensualites pour le client.

import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertTriangle, GraduationCap, ChevronRight } from "lucide-react";
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

function formatEur(eur: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: eur % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(eur);
}

/**
 * Sprint R : montant par mensualite pour l'affichage. Utilise Math.floor
 * (= baseCents, cf. Sprint O dernière absorbe). La derniere mensualite
 * peut etre legerement plus elevee (max +N-1 centimes) mais on simplifie
 * l'UI en affichant le montant "le plus repandu".
 */
function monthlyEurLabel(totalEur: number, n: number): string {
  if (n <= 1) return formatEur(totalEur);
  const baseCents = Math.floor((totalEur * 100) / n);
  return formatEur(baseCents / 100);
}

export default function FormationCheckout() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const calledRef = useRef(false);

  const [offer, setOffer] = useState<OfferLookup | null>(null);
  const [lookupLoading, setLookupLoading] = useState(true);
  const [error, setError] = useState<ErrorState>(null);
  const [creating, setCreating] = useState(false);

  // Lookup au mount (toujours, pour avoir le prix + choix mensualites)
  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    if (!slug) {
      setError({ code: "slug_required", message: ERROR_MESSAGES.slug_required });
      setLookupLoading(false);
      return;
    }

    (async () => {
      try {
        const { data, error: rpcErr } = await supabase.rpc("lookup_a_la_carte_offer" as any, {
          p_slug: slug,
        });
        if (rpcErr) {
          console.error("[FormationCheckout] lookup RPC error:", rpcErr);
          setError({ code: "rpc_failed", message: ERROR_MESSAGES.rpc_failed });
          return;
        }
        const row = Array.isArray(data) && data.length > 0 ? (data[0] as OfferLookup) : null;
        if (!row || !row.is_valid) {
          const code = row?.reason || "offer_not_found";
          setError({ code, message: ERROR_MESSAGES[code] || `Erreur : ${code}` });
          return;
        }
        setOffer(row);
      } catch (e) {
        console.error("[FormationCheckout] unexpected lookup error:", e);
        setError({ code: "rpc_failed", message: ERROR_MESSAGES.rpc_failed });
      } finally {
        setLookupLoading(false);
      }
    })();
  }, [slug]);

  // Une fois l'offre lookup, decide :
  //   - Si 1 seul choix (min==max) OU ?n=N specifie → auto-creation
  //   - Sinon → on attend que l'utilisateur clique sur un bouton
  useEffect(() => {
    if (!offer || error) return;
    const onlyOneChoice = offer.min_installments_count === offer.max_installments_count;
    const urlN = Number(searchParams.get("n"));
    const validUrlN = Number.isInteger(urlN)
      && urlN >= offer.min_installments_count
      && urlN <= offer.max_installments_count
      ? urlN
      : null;

    if (onlyOneChoice) {
      void createAndRedirect(offer.min_installments_count);
    } else if (validUrlN) {
      void createAndRedirect(validUrlN);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offer, error]);

  async function createAndRedirect(installments: number) {
    if (!slug || !offer || creating) return;
    setCreating(true);
    const testMode = searchParams.get("test") === "1";
    const promoCode = searchParams.get("promo");
    const startDate = searchParams.get("start");

    try {
      const { data, error: rpcErr } = await supabase.rpc("create_formation_payment_link", {
        p_offer_slug: slug,
        p_installments: installments,
        p_deferred_start: startDate || null,
      });

      if (rpcErr) {
        console.error("[FormationCheckout] create RPC error:", rpcErr);
        setError({ code: "rpc_failed", message: ERROR_MESSAGES.rpc_failed });
        setCreating(false);
        return;
      }

      const result = data as { success?: boolean; token?: string; error?: string } | null;
      if (!result || result.error) {
        const code = result?.error || "rpc_failed";
        setError({ code, message: ERROR_MESSAGES[code] || `Erreur : ${code}` });
        setCreating(false);
        return;
      }

      if (!result.token) {
        setError({ code: "rpc_failed", message: ERROR_MESSAGES.rpc_failed });
        setCreating(false);
        return;
      }

      const targetParams = new URLSearchParams();
      if (testMode) targetParams.set("test", "1");
      if (promoCode) targetParams.set("promo", promoCode);
      const qs = targetParams.toString();
      const target = `/pay/${result.token}${qs ? `?${qs}` : ""}`;
      navigate(target, { replace: true });
    } catch (e) {
      console.error("[FormationCheckout] unexpected create error:", e);
      setError({ code: "rpc_failed", message: ERROR_MESSAGES.rpc_failed });
      setCreating(false);
    }
  }

  // ─── Rendering ────────────────────────────────────────────────────────
  const showChoice = !!offer && !error && !creating
    && offer.min_installments_count !== offer.max_installments_count
    && !searchParams.get("n");

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
      <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
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
        ) : showChoice && offer ? (
          // ── Ecran de selection des mensualites ──
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
                fontSize: 24,
                fontWeight: 600,
                color: THEME.cream,
                marginBottom: 6,
                fontFamily: "'Cormorant Garamond', serif",
              }}
            >
              {offer.label}
            </h1>
            <p
              style={{
                fontSize: 14,
                color: THEME.creamMuted,
                marginBottom: 28,
                lineHeight: 1.5,
              }}
            >
              Choisissez votre rythme de paiement :
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {Array.from(
                { length: offer.max_installments_count - offer.min_installments_count + 1 },
                (_, i) => offer.min_installments_count + i,
              ).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => createAndRedirect(n)}
                  style={{
                    background: "transparent",
                    border: `1px solid ${THEME.goldLine}`,
                    borderRadius: 12,
                    padding: "16px 18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    color: THEME.cream,
                    fontFamily: "inherit",
                    transition: "background 120ms ease, border-color 120ms ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(201,160,78,0.06)";
                    e.currentTarget.style.borderColor = THEME.gold;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.borderColor = THEME.goldLine;
                  }}
                >
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: THEME.cream, marginBottom: 2 }}>
                      {n === 1 ? "Paiement en 1 fois" : `Paiement en ${n} fois`}
                    </div>
                    <div style={{ fontSize: 13, color: THEME.creamMuted }}>
                      {n === 1
                        ? formatEur(offer.default_price_ht)
                        : `${n} × ${monthlyEurLabel(offer.default_price_ht, n)} (total ${formatEur(offer.default_price_ht)})`}
                    </div>
                  </div>
                  <ChevronRight size={18} color={THEME.gold} style={{ flexShrink: 0 }} />
                </button>
              ))}
            </div>
            <p style={{ fontSize: 11, color: THEME.creamDim, marginTop: 20, lineHeight: 1.5 }}>
              Paiement sécurisé par Stripe. Vous pourrez appliquer un code promo à l'étape suivante.
            </p>
          </div>
        ) : (
          // ── Loader (lookup en cours OU creation en cours OU 1x auto) ──
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
              {lookupLoading ? "Chargement de la formation…" : "Préparation du paiement…"}
            </h1>
            <p style={{ fontSize: 14, color: THEME.creamMuted }}>
              {lookupLoading
                ? "On récupère les options de paiement."
                : "Vous allez être redirigé vers le tunnel sécurisé dans un instant."}
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
