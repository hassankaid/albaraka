import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Organic sources (level 1 = "Organique")
const ORGANIC_SOURCES = [
  "instagram_organic",
  "apporteur_facebook",
  "apporteur_whatsapp",
  "apporteur_instagram",
  "apporteur_linkedin",
  "apporteur_recommandation",
  "apporteur_telegram",
  "apporteur_tiktok",
  "apporteur_autre",
  "autre",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get a system user (CEO) for activity logging
    const { data: ceoProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "ceo")
      .limit(1)
      .single();

    const systemUserId = ceoProfile?.id;
    if (!systemUserId) {
      throw new Error("No CEO profile found for system logging");
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 14); // 2 weeks
    const cutoffISO = cutoffDate.toISOString();

    // ── Rule: Organic leads unassigned in non-terminal status, older than 2 weeks ──
    // Note: "pas_de_reponse" is now recycled instantly at save time (see ProcessLeadModal),
    // not via this cron. This job only handles organic leads that were never picked up.
    const { data: staleOrganic, error: err2 } = await supabase
      .from("leads")
      .select("id, assigned_to, status, source, apporteur_id, contact_id, created_at, recycled_at")
      .in("status", ["a_qualifier", "inscrit_conference"])
      .is("assigned_to", null)
      .is("recycled_at", null)
      .in("source", ORGANIC_SOURCES)
      .lt("created_at", cutoffISO);

    if (err2) throw new Error(`Fetch organic error: ${err2.message}`);

    const allLeadsMap = new Map<string, (typeof staleOrganic)[0]>();
    for (const lead of staleOrganic || []) {
      allLeadsMap.set(lead.id, lead);
    }

    // ── Protection: exclude leads whose contact has an active call or any sale ──
    const contactIds = [
      ...new Set(
        Array.from(allLeadsMap.values())
          .map((l) => l.contact_id)
          .filter(Boolean)
      ),
    ];

    const protectedContactIds = new Set<string>();

    if (contactIds.length > 0) {
      // Check for active calls (not annule, not no_show)
      const { data: callContacts } = await supabase
        .from("calls")
        .select("contact_id")
        .in("contact_id", contactIds)
        .not("status", "in", '("annule","no_show")');

      if (callContacts) {
        for (const c of callContacts) {
          if (c.contact_id) protectedContactIds.add(c.contact_id);
        }
      }

      // Check for sales
      const { data: saleContacts } = await supabase
        .from("sales")
        .select("contact_id")
        .in("contact_id", contactIds);

      if (saleContacts) {
        for (const c of saleContacts) {
          if (c.contact_id) protectedContactIds.add(c.contact_id);
        }
      }
    }

    // Filter out protected leads
    let skippedCount = 0;
    for (const [id, lead] of allLeadsMap) {
      if (lead.contact_id && protectedContactIds.has(lead.contact_id)) {
        allLeadsMap.delete(id);
        skippedCount++;
      }
    }

    const allLeads = Array.from(allLeadsMap.values());

    if (allLeads.length === 0) {
      return new Response(
        JSON.stringify({
          message: "No leads to recycle",
          rule_organic_unassigned: 0,
          total: 0,
          skipped_protected: skippedCount,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const leadIds = allLeads.map((l) => l.id);

    // Mark as recycled — status is PRESERVED, assigned_to is already NULL by query criteria
    const nowISO = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("leads")
      .update({
        recycled_at: nowISO,
        updated_at: nowISO,
      })
      .in("id", leadIds);

    if (updateError) {
      throw new Error(`Update error: ${updateError.message}`);
    }

    // Log one "recycled" activity per lead — the reason lives in the note
    const activities = allLeads.map((lead) => ({
      lead_id: lead.id,
      user_id: systemUserId,
      action: "recycled",
      note: "Recyclage automatique — lead organique non affecté depuis plus de 2 semaines",
    }));

    const { error: actError } = await supabase
      .from("lead_activities")
      .insert(activities);
    if (actError) {
      console.error("Activity logging error:", actError.message);
    }

    return new Response(
      JSON.stringify({
        message: `${allLeads.length} leads recycled`,
        rule_organic_unassigned: allLeads.length,
        total: allLeads.length,
        skipped_protected: skippedCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
