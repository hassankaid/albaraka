// Studio vidéo : chaque nuit, efface les montages de plus de 30 jours (fichiers
// puis ligne). Les fichiers ne s'effacent que par l'API Storage, d'où cette
// fonction plutôt qu'une simple requête SQL planifiée.
//
// Appel : POST {} (cron studio_nettoyage, 3h30). Sans paramètre : elle ne fait
// qu'effacer ce qui a dépassé sa date d'expiration, l'appeler n'a pas d'autre effet.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const BUCKET = "studio-videos";
const supabase = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");

async function fichiersDe(dossier: string): Promise<string[]> {
  const chemins: string[] = [];
  const { data, error } = await supabase.storage.from(BUCKET).list(dossier, { limit: 1000 });
  if (error) throw error;
  for (const f of data ?? []) {
    const chemin = `${dossier}/${f.name}`;
    // un « fichier » sans id est un sous-dossier (travail/)
    if (f.id) chemins.push(chemin);
    else chemins.push(...(await fichiersDe(chemin)));
  }
  return chemins;
}

serve(async () => {
  const { data: expires, error } = await supabase
    .from("studio_montages")
    .select("id, user_id")
    .lt("expire_le", new Date().toISOString())
    .limit(200);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  let effaces = 0;
  const echecs: string[] = [];
  for (const m of expires ?? []) {
    try {
      const chemins = await fichiersDe(`${m.user_id}/${m.id}`);
      if (chemins.length) {
        const { error: e } = await supabase.storage.from(BUCKET).remove(chemins);
        if (e) throw e;
      }
      const { error: e2 } = await supabase.from("studio_montages").delete().eq("id", m.id);
      if (e2) throw e2;
      effaces++;
    } catch (e) {
      echecs.push(`${m.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return new Response(JSON.stringify({ effaces, echecs }), { headers: { "Content-Type": "application/json" } });
});
