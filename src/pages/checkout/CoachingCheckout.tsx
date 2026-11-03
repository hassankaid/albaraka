// CoachingCheckout — /checkout/coaching : le lien public du coaching individuel
// (demande de Sidali, 03/11/2026), celui qui est posté sur Discord.
//
// Un lien de paiement ne sert qu'une fois : on en crée un pour chaque visiteur
// (RPC create_coaching_payment_link) et on l'envoie sur /pay/<token>, qui sait
// déjà encaisser. Après le paiement, la page « merci » lui donne son lien de
// réservation Calendly, à usage unique. L'agenda lui-même n'est jamais publié.
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const MESSAGES: Record<string, string> = {
  offer_not_found: "Ce coaching n'existe pas.",
  offer_not_active: "Ce coaching n'est plus proposé pour le moment.",
  rpc_failed: "Impossible de préparer le paiement. Réessaie dans quelques instants.",
};

export default function CoachingCheckout() {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let annule = false;
    (async () => {
      const { data, error } = await (supabase as any).rpc("create_coaching_payment_link", {
        p_slug: slug || "coaching-individuel",
      });
      if (annule) return;
      if (error || !data?.success || !data?.token) {
        if (error) console.error("[CoachingCheckout] RPC :", error);
        setErreur(MESSAGES[data?.error] ?? MESSAGES.rpc_failed);
        return;
      }
      navigate(`/pay/${data.token}`, { replace: true });
    })();
    return () => {
      annule = true;
    };
  }, [slug, navigate]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0A0A0A",
        color: "#F5F1E6",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        textAlign: "center",
      }}
    >
      {erreur ? (
        <p style={{ maxWidth: 360, color: "rgba(245,241,230,0.75)", lineHeight: 1.6 }}>{erreur}</p>
      ) : (
        <p style={{ display: "flex", gap: 10, alignItems: "center", color: "rgba(245,241,230,0.75)" }}>
          <Loader2 size={18} className="animate-spin" color="#C9A04E" /> Préparation de ton paiement…
        </p>
      )}
    </div>
  );
}
