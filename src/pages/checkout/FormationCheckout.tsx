// FormationCheckout — page wrapper pour le checkout des formations a la carte.
//
// Strategie : on REUTILISE l'infra `/pay/<token>` deja en prod (page
// PaymentLinkCheckout, edge function custom_link, webhook ensureCustomLinkOrder)
// plutot que de dupliquer un checkout dedie.
//
// Flow :
//   1. L'utilisateur arrive sur /checkout/formation/<slug> [?test=1] [?promo=X]
//      [?start=YYYY-MM-DD]
//   2. Cette page appelle la RPC publique `create_formation_payment_link` qui
//      cree un payment_link auto-genere (auto_generated=true → invisible dans
//      l'admin CustomLinksTab) avec grants_formation_ids=[formation_id] pour
//      que le webhook cree l'enrollment apres paiement.
//   3. La page redirige vers /pay/<token> en preservant ?test et ?promo dans
//      l'URL → le tunnel de paiement existant prend le relais.
//
// Avantage : 1 seul tunnel a maintenir (rebill, custom_link, formations a la
// carte → tout passe par /pay/<token>). Risque de divergence visuelle nul.

import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertTriangle, GraduationCap } from "lucide-react";
import logo from "@/assets/al-baraka-logo-v2.png";

type ErrorState = { code: string; message: string } | null;

const ERROR_MESSAGES: Record<string, string> = {
  offer_not_found: "Cette formation n'existe pas dans le catalogue.",
  offer_not_a_la_carte: "Cette offre n'est pas disponible à l'achat à la carte.",
  offer_not_active: "Cette formation n'est plus disponible à l'achat.",
  offer_no_formation_link: "Erreur de configuration : la formation n'est pas correctement liée au catalogue. Contacte le support.",
  deferred_start_must_be_future: "La date de démarrage différé doit être dans le futur.",
  rpc_failed: "Impossible de préparer le paiement. Réessaie dans quelques instants.",
};

export default function FormationCheckout() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const calledRef = useRef(false); // garde contre double-appel en mode StrictMode

  const [error, setError] = useState<ErrorState>(null);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    async function run() {
      if (!slug) {
        setError({ code: "offer_not_found", message: ERROR_MESSAGES.offer_not_found });
        return;
      }

      // Params transmis a la page /pay/<token>
      const testMode = searchParams.get("test") === "1";
      const promoCode = searchParams.get("promo");
      const startDate = searchParams.get("start"); // YYYY-MM-DD ou null

      try {
        const { data, error: rpcErr } = await supabase.rpc("create_formation_payment_link", {
          p_offer_slug: slug,
          p_deferred_start: startDate || null,
        });

        if (rpcErr) {
          console.error("[FormationCheckout] RPC error:", rpcErr);
          setError({ code: "rpc_failed", message: ERROR_MESSAGES.rpc_failed });
          return;
        }

        const result = data as { success?: boolean; token?: string; error?: string } | null;
        if (!result || result.error) {
          const code = result?.error || "rpc_failed";
          setError({
            code,
            message: ERROR_MESSAGES[code] || `Erreur inconnue : ${code}`,
          });
          return;
        }

        if (!result.token) {
          setError({ code: "rpc_failed", message: ERROR_MESSAGES.rpc_failed });
          return;
        }

        // Construit l'URL /pay/<token> avec les query params utiles preserves
        const targetParams = new URLSearchParams();
        if (testMode) targetParams.set("test", "1");
        if (promoCode) targetParams.set("promo", promoCode);
        const qs = targetParams.toString();
        const target = `/pay/${result.token}${qs ? `?${qs}` : ""}`;

        // replace:true pour que le bouton "back" du navigateur ne ramene pas
        // ici (sinon on regenererait un nouveau payment_link a chaque retour).
        navigate(target, { replace: true });
      } catch (e) {
        console.error("[FormationCheckout] unexpected error:", e);
        setError({ code: "rpc_failed", message: ERROR_MESSAGES.rpc_failed });
      }
    }

    run();
  }, [slug, searchParams, navigate]);

  // ─── Render : loader pendant la creation du lien, ou erreur ──────────
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0A0A0A",
        color: "#F5F1E6",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
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
                color: "#F5F1E6",
                marginBottom: 8,
                fontFamily: "'Cormorant Garamond', serif",
              }}
            >
              Paiement indisponible
            </h1>
            <p style={{ fontSize: 14, color: "rgba(245,241,230,0.7)", lineHeight: 1.5 }}>
              {error.message}
            </p>
            <p style={{ fontSize: 11, color: "rgba(245,241,230,0.38)", marginTop: 16 }}>
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
                background: "rgba(201,160,78,0.1)",
                border: "1px solid rgba(201,160,78,0.28)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <GraduationCap size={26} color="#C9A04E" />
            </div>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 600,
                color: "#F5F1E6",
                marginBottom: 8,
                fontFamily: "'Cormorant Garamond', serif",
              }}
            >
              Préparation du paiement…
            </h1>
            <p style={{ fontSize: 14, color: "rgba(245,241,230,0.62)" }}>
              Tu vas être redirigé vers le tunnel sécurisé dans un instant.
            </p>
            <Loader2
              size={24}
              color="#C9A04E"
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
