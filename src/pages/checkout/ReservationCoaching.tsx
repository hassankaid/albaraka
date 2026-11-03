// Après le paiement d'un coaching individuel (03/11/2026) : la page « merci »
// demande le lien de réservation à usage unique et y envoie l'élève.
//
// Le webhook Stripe peut enregistrer la vente quelques secondes après le retour
// sur cette page : tant qu'elle n'existe pas, on redemande toutes les 2 s, une
// minute au plus. Un lien de paiement qui n'est pas un coaching répond
// « not_found » : la page « merci » garde alors son contenu habituel.
import { useEffect, useState } from "react";
import { CalendarCheck, Loader2 } from "lucide-react";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/client";

const URL_FONCTION = `${SUPABASE_URL}/functions/v1/coaching-reservation`;

export type EtatReservation =
  | { etat: "aucun" }
  | { etat: "attente" }
  | { etat: "pret"; url: string }
  | { etat: "erreur" };

export function useReservationCoaching(token: string | null): EtatReservation {
  const [etat, setEtat] = useState<EtatReservation>(token ? { etat: "attente" } : { etat: "aucun" });

  useEffect(() => {
    if (!token) return;
    let arrete = false;
    let essais = 0;
    const demander = async () => {
      essais += 1;
      try {
        const r = await fetch(URL_FONCTION, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}` },
          body: JSON.stringify({ token }),
        });
        const d = await r.json().catch(() => ({}));
        if (arrete) return;
        if (r.status === 404 || d?.error === "not_found" || d?.error === "invalid_token") return setEtat({ etat: "aucun" });
        if (d?.statut === "pret" && d.url) return setEtat({ etat: "pret", url: d.url });
        if (d?.statut !== "en_attente") return setEtat({ etat: "erreur" });
      } catch {
        if (arrete) return;
      }
      if (essais >= 30) return setEtat({ etat: "erreur" });
      setTimeout(demander, 2000);
    };
    void demander();
    return () => {
      arrete = true;
    };
  }, [token]);

  // Prêt : on y va tout seul, le bouton reste là si le navigateur bloque.
  useEffect(() => {
    if (etat.etat !== "pret") return;
    const t = setTimeout(() => window.location.assign(etat.url), 1500);
    return () => clearTimeout(t);
  }, [etat]);

  return etat;
}

const OR = "#C9A04E";

export default function BlocReservationCoaching({ etat }: { etat: EtatReservation }) {
  return (
    <div
      className="alb-fade-3"
      style={{
        padding: "22px 20px",
        border: `1px solid ${OR}`,
        borderRadius: 12,
        background: "linear-gradient(180deg, rgba(201,160,78,0.08) 0%, rgba(201,160,78,0.02) 100%)",
        marginBottom: 32,
        textAlign: "center",
      }}
    >
      <CalendarCheck size={26} strokeWidth={1.5} color={OR} style={{ margin: "0 auto 10px" }} />
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Réserve maintenant ton coaching</div>
      {etat.etat === "pret" ? (
        <>
          <p style={{ fontSize: 13, color: "rgba(245,241,230,0.62)", lineHeight: 1.55, margin: "0 0 16px" }}>
            Tu vas être redirigé vers l'agenda. Choisis le créneau qui t'arrange : ce lien ne sert qu'une fois.
          </p>
          <a
            href={etat.url}
            style={{
              display: "inline-block",
              background: OR,
              color: "#0A0A0A",
              fontWeight: 700,
              fontSize: 14,
              padding: "12px 22px",
              borderRadius: 999,
              textDecoration: "none",
            }}
          >
            Choisir mon créneau
          </a>
        </>
      ) : etat.etat === "erreur" ? (
        <p style={{ fontSize: 13, color: "rgba(245,241,230,0.62)", lineHeight: 1.55, margin: 0 }}>
          Ton paiement est bien reçu, mais le lien de réservation n'a pas pu être préparé. Recharge la page dans une
          minute ; si ça persiste, écris-nous sur Discord avec ton e-mail : on te l'envoie.
        </p>
      ) : (
        <p style={{ fontSize: 13, color: "rgba(245,241,230,0.62)", lineHeight: 1.55, margin: 0, display: "flex", gap: 8, justifyContent: "center", alignItems: "center" }}>
          <Loader2 size={14} className="animate-spin" /> Confirmation du paiement…
        </p>
      )}
    </div>
  );
}
