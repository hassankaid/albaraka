// backfill-utm-from-systeme-io
//
// Edge function de reprise d'historique : pour chaque lead avec un
// `systeme_io_id` mais sans UTM, appelle l'API Systeme.io pour récupérer
// le contact et son champ `sourceURL` (URL d'inscription complète avec
// les paramètres UTM en query string), puis met à jour le lead.
//
// Usage (POST avec auth CEO) :
//   { "limit": 100, "dry_run": false }
//
// - limit (défaut 100) : nombre max de leads à traiter dans cet appel
// - dry_run (défaut false) : simule sans écrire en base, retourne juste
//                            les UTM trouvés pour validation
//
// Throttle 200 ms entre chaque appel API → ~5 req/s, safe vs rate limit
// Systeme.io. 1360 leads => ~5 minutes par batch complet.
//
// Reco : appeler par batch de 100-200 pour éviter les timeouts (Edge
// Functions Supabase ont un timeout par défaut autour de 60s pour
// l'invocation synchrone, jusqu'à 5-10 min en background).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
type UtmKey = typeof UTM_KEYS[number];
type Utm = Partial<Record<UtmKey, string>>;

function parseUtmFromUrl(url: string | null | undefined): Utm {
  if (!url || typeof url !== "string") return {};
  try {
    const u = new URL(url);
    const out: Utm = {};
    for (const k of UTM_KEYS) {
      const v = u.searchParams.get(k);
      if (v) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ------------- AUTH : CEO via JWT, OU appel interne via X-Internal-Secret -------------
    // Le mode "Internal-Secret" permet de lancer le backfill depuis SQL via pg_net
    // sans avoir besoin d'un JWT CEO (utile pour les tests / scripts ponctuels).
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey);

    const internalSecret = req.headers.get("X-Internal-Secret");
    let isInternalCall = false;
    if (internalSecret) {
      const { data: row } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "internal_invoice_secret")
        .maybeSingle();
      const stored = row?.value;
      const expected = typeof stored === "string" ? stored : (stored ?? "");
      if (expected && internalSecret === expected) isInternalCall = true;
    }

    if (!isInternalCall) {
      const authHeader = req.headers.get("Authorization") ?? "";
      const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
      if (userErr || !userData?.user) {
        return new Response(JSON.stringify({ error: "Non authentifié" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userData.user.id)
        .single();
      if (profile?.role !== "ceo") {
        return new Response(JSON.stringify({ error: "Forbidden: CEO role required" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ------------- Paramètres -------------
    const body = await req.json().catch(() => ({}));
    const limit: number = Math.min(Math.max(parseInt(body.limit ?? "100", 10), 1), 500);
    const dryRun: boolean = body.dry_run === true;

    // ------------- Clé API Systeme.io depuis app_settings -------------
    const { data: keyRow, error: keyErr } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "systeme_io_api_key")
      .single();

    if (keyErr || !keyRow?.value) {
      return new Response(
        JSON.stringify({ error: "Clé API Systeme.io introuvable dans app_settings" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const apiKey: string = typeof keyRow.value === "string"
      ? keyRow.value
      : (keyRow.value as string);

    // ------------- Sélection des leads à traiter -------------
    // Critères : a un systeme_io_id, n'a aucun UTM rempli, n'est pas recyclé
    // (pour éviter de toucher du contenu volontairement nettoyé).
    const { data: leads, error: leadsErr } = await supabase
      .from("leads")
      .select("id, systeme_io_id, raw_email")
      .not("systeme_io_id", "is", null)
      .is("utm_source", null)
      .is("utm_medium", null)
      .is("utm_campaign", null)
      .is("utm_content", null)
      .is("utm_term", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (leadsErr) throw leadsErr;
    if (!leads || leads.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, message: "Aucun lead à traiter", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ------------- Boucle de backfill -------------
    let processed = 0;
    let updated = 0;
    let noUtm = 0;
    let apiErrors = 0;
    const samples: any[] = [];

    for (const lead of leads) {
      processed++;

      try {
        const apiResp = await fetch(`https://api.systeme.io/api/contacts/${lead.systeme_io_id}`, {
          method: "GET",
          headers: {
            "X-API-Key": apiKey,
            "accept": "application/json",
          },
        });

        if (!apiResp.ok) {
          apiErrors++;
          if (samples.length < 5) {
            samples.push({
              lead_id: lead.id,
              systeme_io_id: lead.systeme_io_id,
              status: apiResp.status,
              error: await apiResp.text().catch(() => ""),
            });
          }
          await sleep(200);
          continue;
        }

        const contact = await apiResp.json();
        const sourceUrl: string | null = contact?.sourceURL ?? contact?.sourceUrl ?? null;
        const utm = parseUtmFromUrl(sourceUrl);

        if (Object.keys(utm).length === 0) {
          noUtm++;
          if (samples.length < 5) {
            samples.push({
              lead_id: lead.id,
              systeme_io_id: lead.systeme_io_id,
              email: lead.raw_email,
              source_url: sourceUrl,
              note: "no UTM in sourceURL",
            });
          }
          await sleep(200);
          continue;
        }

        if (!dryRun) {
          const { error: updErr } = await supabase
            .from("leads")
            .update({
              utm_source:   utm.utm_source   ?? null,
              utm_medium:   utm.utm_medium   ?? null,
              utm_campaign: utm.utm_campaign ?? null,
              utm_content:  utm.utm_content  ?? null,
              utm_term:     utm.utm_term     ?? null,
              updated_at:   new Date().toISOString(),
            })
            .eq("id", lead.id);

          if (updErr) {
            apiErrors++;
            if (samples.length < 5) {
              samples.push({ lead_id: lead.id, db_error: updErr.message });
            }
            await sleep(200);
            continue;
          }
        }

        updated++;
        if (samples.length < 5) {
          samples.push({
            lead_id: lead.id,
            email: lead.raw_email,
            utm,
            source_url: sourceUrl?.slice(0, 120) + (sourceUrl && sourceUrl.length > 120 ? "..." : ""),
          });
        }
      } catch (loopErr: any) {
        apiErrors++;
        if (samples.length < 5) {
          samples.push({
            lead_id: lead.id,
            systeme_io_id: lead.systeme_io_id,
            exception: loopErr?.message ?? String(loopErr),
          });
        }
      }

      await sleep(200);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        dry_run: dryRun,
        limit,
        processed,
        updated,
        no_utm_found: noUtm,
        api_errors: apiErrors,
        samples,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("Erreur backfill:", e);
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
