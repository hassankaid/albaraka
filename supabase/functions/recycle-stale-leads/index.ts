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

    // ── Rule 1: "Pas de réponse" leads older than 2 weeks ──
    const { data: staleNoResponse, error: err1 } = await supabase
      .from("leads")
      .select("id, assigned_to, status, source, apporteur_id, created_at")
      .eq("status", "pas_de_reponse")
      .lt("created_at", cutoffISO);

    if (err1) throw new Error(`Fetch pas_de_reponse error: ${err1.message}`);

    // ── Rule 2: Organic leads in "a_qualifier" with no setter, older than 2 weeks ──
    const { data: staleOrganic, error: err2 } = await supabase
      .from("leads")
      .select("id, assigned_to, status, source, apporteur_id, created_at")
      .eq("status", "a_qualifier")
      .is("assigned_to", null)
      .in("source", ORGANIC_SOURCES)
      .lt("created_at", cutoffISO);

    if (err2) throw new Error(`Fetch organic error: ${err2.message}`);

    // Merge and deduplicate
    const allLeadsMap = new Map<string, typeof staleNoResponse[0]>();
    for (const lead of [...(staleNoResponse || []), ...(staleOrganic || [])]) {
      allLeadsMap.set(lead.id, lead);
    }
    const allLeads = Array.from(allLeadsMap.values());

    if (allLeads.length === 0) {
      return new Response(
        JSON.stringify({ message: "No leads to recycle", rule1: 0, rule2: 0, total: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const leadIds = allLeads.map((l) => l.id);

    // Update leads: unassign setter, set status to 'a_recycler', KEEP apporteur_id
    const { error: updateError } = await supabase
      .from("leads")
      .update({
        status: "a_recycler",
        assigned_to: null,
        assigned_at: null,
        updated_at: new Date().toISOString(),
      })
      .in("id", leadIds);

    if (updateError) {
      throw new Error(`Update error: ${updateError.message}`);
    }

    // Log activity for each recycled lead
    const activities = allLeads.flatMap((lead) => {
      const entries = [
        {
          lead_id: lead.id,
          user_id: systemUserId,
          action: "status_change",
          old_value: lead.status,
          new_value: "a_recycler",
          note:
            lead.status === "pas_de_reponse"
              ? "Recyclage automatique — pas de réponse depuis plus de 2 semaines"
              : "Recyclage automatique — lead organique non affecté depuis plus de 2 semaines",
        },
      ];

      // Only log unassign if there was a setter
      if (lead.assigned_to) {
        entries.push({
          lead_id: lead.id,
          user_id: systemUserId,
          action: "unassigned",
          old_value: lead.assigned_to,
          new_value: null as any,
          note: "Désassigné par recyclage automatique",
        });
      }

      return entries;
    });

    const { error: actError } = await supabase
      .from("lead_activities")
      .insert(activities);
    if (actError) {
      console.error("Activity logging error:", actError.message);
    }

    const rule1Count = (staleNoResponse || []).length;
    const rule2Count = (staleOrganic || []).filter(
      (l) => !staleNoResponse?.some((r) => r.id === l.id)
    ).length;

    return new Response(
      JSON.stringify({
        message: `${allLeads.length} leads recycled`,
        rule1_pas_de_reponse: rule1Count,
        rule2_organic_unassigned: rule2Count,
        total: allLeads.length,
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
