import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find leads with status 'pas_de_reponse' created over 30 days ago
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    const { data: staleLeads, error: fetchError } = await supabase
      .from("leads")
      .select("id, assigned_to, created_at")
      .eq("status", "pas_de_reponse")
      .not("assigned_to", "is", null)
      .lt("created_at", cutoffDate.toISOString());

    if (fetchError) {
      throw new Error(`Fetch error: ${fetchError.message}`);
    }

    if (!staleLeads || staleLeads.length === 0) {
      return new Response(
        JSON.stringify({ message: "No leads to recycle", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const leadIds = staleLeads.map((l) => l.id);

    // Update leads: unassign and set status to 'a_recycler'
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
    const activities = staleLeads.map((lead) => ({
      lead_id: lead.id,
      user_id: "00000000-0000-0000-0000-000000000000", // system
      action: "recycled",
      old_value: lead.assigned_to,
      new_value: null,
      note: "Recyclage automatique — pas de réponse depuis plus de 30 jours",
    }));

    await supabase.from("lead_activities").insert(activities);

    return new Response(
      JSON.stringify({ message: `${leadIds.length} leads recycled`, count: leadIds.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
