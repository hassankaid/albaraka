// ─────────────────────────────────────────────────────────────────────────
// Côté tunnel : identifier le visiteur, et lui demander sa variante.
//
// Le calcul de la variante n'est PAS fait ici — il l'est par `ab-visit`, qui
// fait foi. Ce module ne s'occupe que de deux choses : donner au visiteur un
// identifiant anonyme stable, et poser la question une seule fois par visite.
//
// RÈGLE ABSOLUE : un problème d'A/B testing ne doit jamais empêcher une landing
// de s'afficher. Chaque fonction ici échoue en silence et rend « pas de test »,
// ce qui ramène le tunnel à son comportement d'origine.
// ─────────────────────────────────────────────────────────────────────────
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/client";

const CLE_VISITEUR = "alb_visitor_id";

/**
 * Identifiant anonyme du navigateur.
 *
 * Aucune donnée personnelle : c'est un nombre aléatoire, qui ne sert qu'à ne
 * pas compter deux fois la même personne dans le dénominateur d'un test.
 *
 * En `localStorage` pour survivre à la fermeture de l'onglet — un visiteur qui
 * revient le lendemain doit revoir la même variante. S'il l'a effacé, il en
 * reçoit un nouveau : l'attribution étant déterministe, il aurait pu changer de
 * camp, mais il sera au moins compté comme un nouveau visiteur, ce qui est
 * honnête.
 */
export function visitorId(): string {
  try {
    const existant = localStorage.getItem(CLE_VISITEUR);
    if (existant) return existant;
    const nouveau = crypto.randomUUID?.() ?? `v${Date.now()}${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(CLE_VISITEUR, nouveau);
    return nouveau;
  } catch {
    // Navigation privée stricte : identifiant éphémère, valable le temps de la
    // page. Le visiteur sera compté, simplement pas reconnu s'il revient.
    return `tmp${Math.random().toString(36).slice(2)}`;
  }
}

export interface AffectationAB {
  code: string;
  variant: string;
}

/**
 * Demande au serveur la variante à servir, et enregistre l'exposition.
 *
 * Appelée UNIQUEMENT quand l'URL porte `?ab=` : sans test en cours, la landing
 * ne paie aucun aller-retour réseau.
 */
export async function resoudreTestAB(
  code: string,
  tunnelKey: string,
  src: string | null,
): Promise<AffectationAB | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/ab-visit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ code, visitor_id: visitorId(), tunnel: tunnelKey, src }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.active && data?.variant ? { code: data.code, variant: data.variant } : null;
  } catch {
    return null;
  }
}
