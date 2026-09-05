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
import { useEffect, useState } from "react";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/client";
import { getAttribution } from "./source";
import { resolveVariant, type TunnelVariant } from "../variants";
import type { TunnelConfig } from "../config";

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
  etape: "landing" | "merci",
): Promise<AffectationAB | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/ab-visit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ code, visitor_id: visitorId(), tunnel: tunnelKey, src, etape }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.active && data?.variant ? { code: data.code, variant: data.variant } : null;
  } catch {
    return null;
  }
}

/** L'action d'aval que mesure le test, selon le tunnel. */
export type ActionAB = "groupe_whatsapp" | "rendez_vous";

/**
 * Enregistre la conversion : le visiteur a fait l'action qu'on mesurait.
 *
 * Dédoublonnée côté base — cliquer trois fois sur le bouton du groupe compte
 * une fois. Appel « au mieux » : on ne bloque ni n'attend, parce qu'il ne doit
 * jamais retarder l'ouverture de WhatsApp ni l'affichage d'une confirmation.
 */
export function enregistrerConversion(cfg: TunnelConfig, action: ActionAB): void {
  const code = getAttribution(cfg)?.abCode;
  if (!code) return; // hors test : rien à mesurer

  try {
    void fetch(`${SUPABASE_URL}/functions/v1/ab-convert`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ code, visitor_id: visitorId(), action }),
      keepalive: true, // survit à la navigation vers WhatsApp
    });
  } catch {
    /* silencieux : une mesure perdue vaut mieux qu'un bouton cassé */
  }
}

/**
 * La variante à afficher sur une page de remerciement.
 *
 * Trois sources, dans cet ordre :
 *
 *   1. un test de page de remerciement en cours — c'est lui qui décide ici ;
 *   2. la variante déjà tirée sur la landing, s'il y avait un test de landing —
 *      le visiteur reste dans le même parcours du début à la fin, exactement
 *      comme si `?v=` avait été dans son lien ;
 *   3. `?v=` — le fonctionnement d'origine, qui reste utile pour prévisualiser
 *      une variante à la main.
 *
 * L'exposition n'est comptée QUE dans le premier cas : c'est ici que la variante
 * de la page de remerciement se voit pour la première fois. Dans le deuxième,
 * elle a déjà été comptée à l'arrivée sur la landing.
 */
export function useVarianteAB(cfg: TunnelConfig, tunnelKey: "wa" | "vsl"): TunnelVariant {
  const parDefaut = resolveVariant(
    tunnelKey,
    (typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("v")
      : null) ?? varianteLandingRetenue(cfg),
  );
  const [variante, setVariante] = useState<TunnelVariant>(parDefaut);

  useEffect(() => {
    const a = getAttribution(cfg);
    if (!a?.abCode) return; // hors test : la variante par défaut suffit

    let annule = false;
    void resoudreTestAB(a.abCode, tunnelKey, a.src, "merci").then((r) => {
      if (!annule && r) setVariante(resolveVariant(tunnelKey, r.variant));
    });
    return () => { annule = true; };
  }, [cfg, tunnelKey]);

  return variante;
}

/**
 * Enregistre l'arrivée sur une landing testée, et retient la variante servie.
 *
 * Elle est mémorisée pour être envoyée avec l'inscription : c'est ce qui
 * permettra de dire quelle PAGE a produit quel inscrit. Sans test de landing en
 * cours, la fonction ne fait rien — aucun appel réseau pour le trafic ordinaire.
 *
 * Retourne la variante pour que la page puisse s'afficher en conséquence, le
 * jour où il y aura effectivement plusieurs versions de la landing. Aujourd'hui
 * elle n'en a qu'une : la mesure fonctionne, elle ne mesure simplement aucune
 * différence tant que le contenu ne varie pas.
 */
export async function exposerLanding(
  cfg: TunnelConfig,
  tunnelKey: "wa" | "vsl",
): Promise<string | null> {
  const a = getAttribution(cfg);
  if (!a?.abCode) return null;

  const r = await resoudreTestAB(a.abCode, tunnelKey, a.src, "landing");
  if (!r) return null;

  try {
    sessionStorage.setItem(`alb_ab_landing_${cfg.key}`, r.variant);
  } catch { /* mode privé : la variante vivra le temps de la page */ }
  return r.variant;
}

/** La variante de landing retenue pour ce tunnel, à joindre à l'inscription. */
export function varianteLandingRetenue(cfg: TunnelConfig): string | null {
  try {
    return sessionStorage.getItem(`alb_ab_landing_${cfg.key}`);
  } catch {
    return null;
  }
}
