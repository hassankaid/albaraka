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

    // Caller must be CEO
    const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: userData, error: userErr } = await callerClient.auth.getUser(bearer);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: callerProfile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .single();
    if (callerProfile?.role !== "ceo") {
      return new Response(JSON.stringify({ error: "CEO only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const firstName = String(body.first_name || "").trim();
    const lastName = String(body.last_name || "").trim();
    const fullName = `${firstName} ${lastName}`.trim();

    if (!email || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "email requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!fullName) {
      return new Response(JSON.stringify({ error: "prénom + nom requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Find or create auth user
    let profileId: string | null = null;
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingProfile) {
      profileId = existingProfile.id;
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (created?.user?.id) {
        profileId = created.user.id;
      } else {
        const msg = String(createErr?.message || "").toLowerCase();
        const already = msg.includes("already") || msg.includes("exist") || msg.includes("registered");
        if (!already) {
          return new Response(
            JSON.stringify({ error: "createUser failed", detail: createErr?.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const existingAuth = list?.users?.find(
          (u: { email?: string | null }) => (u.email || "").toLowerCase() === email,
        );
        if (!existingAuth?.id) {
          return new Response(
            JSON.stringify({ error: "auth user not found after conflict" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        profileId = existingAuth.id;
      }
    }

    // 2. Upsert profile row (same flow as bon_commande: origin=bon_commande triggers Discord gate)
    await admin
      .from("profiles")
      .upsert(
        {
          id: profileId,
          email,
          full_name: fullName,
          role: "apporteur",
          origin: "bon_commande",
          onboarding_completed: false,
        },
        { onConflict: "id" },
      );

    // 3. Find or create contact (via RPC)
    const { data: _contactId } = await admin.rpc("find_or_create_contact", {
      p_email: email,
      p_phone: "",
      p_full_name: fullName || null,
    });

    // 4. Grant PASS AL BARAKA (idempotent)
    try {
      const { data: existingPass } = await admin
        .from("user_passes")
        .select("id")
        .eq("user_id", profileId!)
        .eq("pass_type", "al_baraka")
        .is("revoked_at", null)
        .limit(1);
      if (!existingPass || existingPass.length === 0) {
        await admin.from("user_passes").insert({
          user_id: profileId,
          pass_type: "al_baraka",
          granted_by: userData.user.id,
          notes: "manual invitation via admin",
        });
      }
    } catch (e) {
      console.error("[admin-create-student] grant pass failed:", e);
    }

    // 5. Send access email (reuses send-apporteur-access-email with service role bypass)
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-apporteur-access-email`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_ids: [profileId] }),
      });
      if (!res.ok) {
        const text = await res.text();
        console.error(`[admin-create-student] email failed ${res.status}: ${text}`);
      }
    } catch (e) {
      console.error("[admin-create-student] email invoke failed:", e);
    }

    return new Response(
      JSON.stringify({ user_id: profileId, email, full_name: fullName }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("admin-create-student error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
