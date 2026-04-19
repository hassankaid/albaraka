// CEO-only : supprime entièrement un utilisateur (auth.users + public.profiles +
// nettoyage des references FK NO ACTION/RESTRICT + cascade sur les CASCADE).
// Préserve l'historique métier en désaffectant plutôt qu'en supprimant les
// liens sur leads / calls / sales / commissions / user_passes.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const bearer = authHeader.replace(/^Bearer\s+/i, "").trim();

    // Vérifie le caller
    const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: userData, error: userErr } = await callerClient.auth.getUser(bearer);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = userData.user.id;

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Caller must be CEO
    const { data: callerProfile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", callerId)
      .single();
    if (callerProfile?.role !== "ceo") {
      return new Response(JSON.stringify({ error: "CEO only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const targetId = String(body.user_id || "").trim();
    if (!targetId) {
      return new Response(JSON.stringify({ error: "user_id requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (targetId === callerId) {
      return new Response(
        JSON.stringify({ error: "Impossible de supprimer son propre compte" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Récupère le profile cible (pour loguer)
    const { data: target } = await admin
      .from("profiles")
      .select("id, email, full_name, role")
      .eq("id", targetId)
      .single();
    if (!target) {
      return new Response(JSON.stringify({ error: "Utilisateur introuvable" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (target.role === "ceo") {
      return new Response(
        JSON.stringify({ error: "Impossible de supprimer un CEO" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 1. RPC de nettoyage (désaffecte les liens + supprime le profile)
    const { error: cleanErr } = await admin.rpc("admin_cleanup_user", {
      p_user_id: targetId,
    });
    if (cleanErr) {
      console.error("[admin-delete-user] cleanup RPC error", cleanErr);
      return new Response(
        JSON.stringify({ error: cleanErr.message ?? "Nettoyage échoué" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 2. Suppression de l'entrée auth.users
    const { error: authErr } = await admin.auth.admin.deleteUser(targetId);
    if (authErr) {
      console.error("[admin-delete-user] auth delete error", authErr);
      // Le profile a déjà été supprimé ; on remonte l'erreur mais le user est
      // désormais "orphelin" côté auth (no profile, plus aucun droit applicatif).
      return new Response(
        JSON.stringify({
          error: `Profile supprimé mais auth.users non supprimé : ${authErr.message}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(
      `[admin-delete-user] ${target.email ?? targetId} (${target.role}) supprimé par ${callerId}`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        deleted: {
          id: target.id,
          email: target.email,
          full_name: target.full_name,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("[admin-delete-user] unexpected error", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message ?? "Erreur inattendue" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
