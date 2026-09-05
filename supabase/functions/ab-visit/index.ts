// ─────────────────────────────────────────────────────────────────────────
// ab-visit — point d'entrée public de l'A/B testing des tunnels.
//
// Un visiteur arrive sur une page portant un test en cours. Cette fonction :
//   1. retrouve le test s'il est en cours et concerne bien ce tunnel
//   2. vérifie qu'il se joue bien SUR CETTE PAGE
//   3. lui attribue une variante, de façon déterministe
//   4. enregistre son exposition, une seule fois
//   5. rend la variante à afficher
//
// APPELÉE DES DEUX CÔTÉS — la landing et la page de remerciement — mais jamais
// pour le même test : chaque test déclare son `etape`, et l'appel qui ne
// correspond pas repart sans rien enregistrer. Sans ce contrôle, un visiteur
// serait compté deux fois, et le dénominateur inclurait des gens n'ayant rien
// vu de variable.
//
// Et seulement si un code de test a été capté : le trafic hors test ne paie
// aucun aller-retour réseau.
//
// POURQUOI L'ATTRIBUTION EST CALCULÉE ICI et pas dans le navigateur : elle fait
// foi. Un client pourrait annoncer la variante qui l'arrange ; le serveur, non.
// Et le visiteur n'a pas besoin de connaître les poids du test.
//
// verify_jwt=false : appelée par des visiteurs anonymes. Elle n'écrit que dans
// `ab_exposures`, ne lit que des tests, et ne rend jamais autre chose qu'un
// nom de variante. Aucune donnée personnelle n'y transite — `visitor_id` est un
// identifiant anonyme généré par le navigateur.
// ─────────────────────────────────────────────────────────────────────────

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

/**
 * Hachage FNV-1a 32 bits.
 *
 * COPIE VOLONTAIRE de `src/lib/abtest.ts` — une edge function Deno ne peut pas
 * importer depuis `src/`. Les deux doivent rendre le MÊME résultat : les tests
 * de vérité vivent dans `src/lib/abtest.test.ts`, et toute correction ici doit
 * y être reportée.
 */
function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** La variante d'un visiteur : déterministe, donc stable même sans mémoire locale. */
function attribuerVariante(visitorId: string, testCode: string, variants: string[], weights: number[]): string {
  const total = weights.reduce((a, b) => a + b, 0);
  const position = hash32(`${visitorId}:${testCode}`) % 10_000;
  const seuil = (position / 10_000) * total;
  let cumul = 0;
  for (let i = 0; i < variants.length; i++) {
    cumul += weights[i];
    if (seuil < cumul) return variants[i];
  }
  return variants[variants.length - 1];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const code = String(body?.code ?? "").trim().toUpperCase();
    const visitorId = String(body?.visitor_id ?? "").trim();
    const tunnel = String(body?.tunnel ?? "").trim();
    const src = body?.src ? String(body.src).slice(0, 40) : null;
    // D'où l'appel provient : la landing, ou la page de remerciement. Le serveur
    // vérifie que ça correspond au test — un test de landing ne doit rien
    // enregistrer depuis la page de remerciement, et inversement.
    const etape = String(body?.etape ?? "merci").trim();

    if (!code || !visitorId || !tunnel) return json({ active: false, raison: "params_manquants" });
    // Garde-fou sur la taille : `visitor_id` vient du client, on ne stocke pas
    // n'importe quoi sous prétexte qu'il l'a envoyé.
    if (visitorId.length > 64) return json({ active: false, raison: "visitor_id_invalide" });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: test } = await supabase
      .from("ab_tests")
      .select("id, code, tunnel, canal, variants, weights, statut, etape")
      .eq("code", code)
      .eq("statut", "running")
      .maybeSingle();

    // Test inconnu, terminé, ou lien recopié sur le mauvais tunnel : on ne
    // bloque rien, la page affichera simplement sa variante par défaut.
    if (!test) return json({ active: false, raison: "test_introuvable_ou_termine" });
    if (test.tunnel !== tunnel) return json({ active: false, raison: "mauvais_tunnel" });
    // Chaque page n'appelle que pour les tests qui s'y jouent. Sans ce contrôle,
    // un visiteur serait exposé deux fois — à l'arrivée puis au remerciement —
    // et le dénominateur compterait des gens n'ayant rien vu de variable.
    if (test.etape !== etape) return json({ active: false, raison: "mauvaise_etape" });
    // Un test ciblé sur un canal ne s'applique qu'à ce canal : sinon le trafic
    // d'une autre origine viendrait diluer un test conçu pour TikTok.
    if (test.canal && src !== test.canal) return json({ active: false, raison: "hors_canal" });

    const variant = attribuerVariante(visitorId, test.code, test.variants, test.weights);

    // `upsert` sur (test_id, visitor_id) : un visiteur qui revient dix fois
    // compte une fois. `ignoreDuplicates` garde la PREMIÈRE exposition — celle
    // qui a réellement eu lieu — plutôt que d'écraser avec la dernière.
    await supabase
      .from("ab_exposures")
      .upsert(
        { test_id: test.id, visitor_id: visitorId, variant, tunnel, src },
        { onConflict: "test_id,visitor_id", ignoreDuplicates: true },
      );

    return json({ active: true, variant, code: test.code });
  } catch (e) {
    // Une panne de l'A/B testing ne doit JAMAIS empêcher une page de
    // s'afficher : on répond « pas de test » et le tunnel suit son cours.
    console.error("[ab-visit]", e);
    return json({ active: false, raison: "erreur_interne" });
  }
});
