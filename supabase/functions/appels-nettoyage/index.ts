// Analyse d'appels : chaque nuit, efface l'audio des appels déposés il y a plus de 30 jours
// (décision 8A du cahier des charges). Le retour validé et la transcription restent.
// Les fichiers ne s'effacent que par l'API Storage, d'où cette fonction plutôt qu'une
// simple requête SQL planifiée.
//
// Appel : POST {} (cron appels_nettoyage, 3h45). Sans paramètre : elle ne fait qu'effacer
// ce qui a dépassé sa date d'expiration, l'appeler n'a pas d'autre effet.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const BUCKET = "appels";
const supabase = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");

serve(async () => {
  const { data: expires, error } = await supabase
    .from("appels_analyses")
    .select("id")
    .lt("audio_expire_le", new Date().toISOString())
    .is("audio_supprime_le", null)
    .neq("statut", "en_cours")
    .limit(200);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  let effaces = 0;
  const echecs: string[] = [];
  for (const a of expires ?? []) {
    try {
      const { data: fichiers, error: eL } = await supabase.storage.from(BUCKET).list(a.id, { limit: 100 });
      if (eL) throw eL;
      const chemins = (fichiers ?? []).filter((f) => f.id).map((f) => `${a.id}/${f.name}`);
      if (chemins.length) {
        const { error: eR } = await supabase.storage.from(BUCKET).remove(chemins);
        if (eR) throw eR;
      }
      const { error: eU } = await supabase
        .from("appels_analyses")
        .update({ audio_supprime_le: new Date().toISOString(), fichier_path: null, audio_path: null })
        .eq("id", a.id);
      if (eU) throw eU;
      effaces++;
    } catch (e) {
      echecs.push(`${a.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return new Response(JSON.stringify({ effaces, echecs }), { headers: { "Content-Type": "application/json" } });
});
