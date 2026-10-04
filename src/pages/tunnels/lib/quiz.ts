// ─────────────────────────────────────────────────────────────────────────
// Lead scoring des tunnels WhatsApp et VSL (04/10/2026).
//
// Même système que du temps de Systeme.io, demandé tel quel par Hassan :
// quiz OBLIGATOIRE de 7 questions entre l'inscription et la page de
// remerciement, même barème (src/lib/leadScoring.ts), même enregistrement
// (submit-scoring-quiz), même affichage dans le CRM.
//
// Une seule différence : le jeton qui rattache les réponses au lead est créé
// à l'inscription (tunnel-lead-submit), au lieu d'un rapprochement par
// adresse IP. Il voyage dans la session, par tunnel.
//
// RÈGLE : le quiz ne bloque jamais un inscrit. Sans jeton (inscription
// rejouée, page rouverte, jeton non créé) ou si l'envoi échoue, on va à la
// page de remerciement.
// ─────────────────────────────────────────────────────────────────────────
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/client";
import type { TunnelConfig } from "../config";

const cle = (cfg: TunnelConfig) => `alb_tunnel_quiz_${cfg.key}`;

export function memoriserJetonQuiz(cfg: TunnelConfig, jeton: string | null | undefined): boolean {
  if (!cfg.quiz || !jeton) return false;
  try {
    sessionStorage.setItem(cle(cfg), jeton);
    return true;
  } catch {
    return false; // stockage bloqué : pas de quiz, l'inscrit va droit au remerciement
  }
}

export function lireJetonQuiz(cfg: TunnelConfig): string | null {
  try {
    return sessionStorage.getItem(cle(cfg));
  } catch {
    return null;
  }
}

export function oublierJetonQuiz(cfg: TunnelConfig): void {
  try {
    sessionStorage.removeItem(cle(cfg));
  } catch {
    /* rien à faire */
  }
}

/** Adresse de la page suivante, en gardant la variante vidéo `?v=`. */
export function avecVariante(chemin: string, variant: string | null | undefined): string {
  return variant ? `${chemin}?v=${encodeURIComponent(variant)}` : chemin;
}

/** Enregistre les réponses. Lève une erreur si le serveur ne confirme pas. */
export async function envoyerQuiz(cfg: TunnelConfig, jeton: string, answers: Record<string, string>): Promise<void> {
  if (!cfg.quiz) throw new Error("tunnel sans quiz");
  const res = await fetch(`${SUPABASE_URL}/functions/v1/submit-scoring-quiz`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ funnel: cfg.quiz.slug, token: jeton, answers }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.ok) throw new Error(String(data?.message ?? data?.error ?? `HTTP ${res.status}`));
}
