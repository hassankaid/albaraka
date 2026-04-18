// Audit historique Calendly v2 — fix du bug de matching .in() qui renvoyait
// tous les events comme manquants à cause de la longueur d'URL.
// On fetch maintenant tous les calendly_event_id de la période en une fois
// puis on diff côté JS.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function calendlyFetch(url: string, token: string): Promise<any> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Calendly ${res.status}: ${JSON.stringify(body)}`);
  return body;
}

async function getCurrentUser(token: string): Promise<{ uri: string; current_organization: string }> {
  const data = await calendlyFetch("https://api.calendly.com/users/me", token);
  return { uri: data.resource.uri, current_organization: data.resource.current_organization };
}

async function listScheduledEvents(orgUri: string, minStart: string, maxStart: string, token: string): Promise<any[]> {
  const events: any[] = [];
  let url: string | null = `https://api.calendly.com/scheduled_events?organization=${encodeURIComponent(orgUri)}&min_start_time=${encodeURIComponent(minStart)}&max_start_time=${encodeURIComponent(maxStart)}&count=100&status=active`;
  while (url) {
    const page = await calendlyFetch(url, token);
    events.push(...(page.collection || []));
    url = page.pagination?.next_page || null;
  }
  return events;
}

async function listInvitees(eventUri: string, token: string): Promise<any[]> {
  const url = `${eventUri}/invitees?count=100`;
  const page = await calendlyFetch(url, token);
  return page.collection || [];
}

/** Récupère tous les calendly_event_id (non null) de la période — pas de IN sur de longues URIs. */
async function fetchAllCalendlyIds(admin: any, minStart: string): Promise<Set<string>> {
  const all = new Set<string>();
  const PAGE = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await admin
      .from("calls")
      .select("calendly_event_id")
      .not("calendly_event_id", "is", null)
      .gte("scheduled_at", minStart)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`Fetch existing calls: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const r of data) {
      if (r.calendly_event_id) all.add(String(r.calendly_event_id).trim());
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const calendlyToken = Deno.env.get("CALENDLY_API_TOKEN");
    if (!calendlyToken) return json({ error: "CALENDLY_API_TOKEN non configuré dans les secrets Supabase" }, 500);

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: callerProfile } = await admin.from("profiles").select("role").eq("id", user.id).single();
    if (callerProfile?.role !== "ceo") return json({ error: "CEO only" }, 403);

    const body = await req.json().catch(() => ({}));
    const days = Math.max(1, Math.min(365, Number(body.days) || 30));
    const importMissing: boolean = !!body.import_missing;

    const now = new Date();
    const minStart = new Date(now.getTime() - days * 24 * 3600 * 1000).toISOString();
    const maxStart = new Date(now.getTime() + 365 * 24 * 3600 * 1000).toISOString();

    const me = await getCurrentUser(calendlyToken);
    const events = await listScheduledEvents(me.current_organization, minStart, maxStart, calendlyToken);

    const eventsWithInvitees: { event: any; invitee: any }[] = [];
    for (const ev of events) {
      try {
        const invitees = await listInvitees(ev.uri, calendlyToken);
        for (const inv of invitees) eventsWithInvitees.push({ event: ev, invitee: inv });
      } catch (e) {
        console.warn("listInvitees failed for", ev.uri, e);
      }
    }

    const existingIds = await fetchAllCalendlyIds(admin, minStart);
    const missing = eventsWithInvitees.filter((x) => !existingIds.has(String(x.event.uri).trim()));

    const importResults: any[] = [];
    if (importMissing && missing.length > 0) {
      const webhookUrl = `${supabaseUrl}/functions/v1/webhook-calendly`;
      for (const item of missing) {
        const fakePayload = {
          event: "invitee.created",
          payload: {
            email: item.invitee.email,
            first_name: item.invitee.first_name,
            last_name: item.invitee.last_name,
            questions_and_answers: item.invitee.questions_and_answers || [],
            cancellation: null,
            scheduled_event: item.event,
          },
        };
        try {
          const res = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(fakePayload),
          });
          const respBody = await res.json().catch(() => ({}));
          importResults.push({ event_uri: item.event.uri, invitee_email: item.invitee.email, status: res.status, ok: res.ok, response: respBody });
        } catch (e: any) {
          importResults.push({ event_uri: item.event.uri, invitee_email: item.invitee.email, ok: false, error: e?.message || String(e) });
        }
      }
    }

    return json({
      success: true,
      window: { days, min_start: minStart, max_start: maxStart },
      stats: {
        total_calendly_events: events.length,
        total_invitees: eventsWithInvitees.length,
        in_db: existingIds.size,
        missing: missing.length,
      },
      missing: missing.map((x) => ({
        event_uri: x.event.uri,
        invitee_email: x.invitee.email,
        invitee_name: [x.invitee.first_name, x.invitee.last_name].filter(Boolean).join(" "),
        scheduled_at: x.event.start_time,
        host_email: x.event.event_memberships?.[0]?.user_email,
        event_name: x.event.name,
      })),
      import_results: importResults,
    });
  } catch (err: any) {
    return json({ error: err?.message || "Internal error", stack: err?.stack }, 500);
  }
});
