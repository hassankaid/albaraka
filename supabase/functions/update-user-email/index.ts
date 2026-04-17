// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Input {
  user_id: string;
  new_email: string;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing authorization" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Vérifier caller via JWT
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: callerProfile } = await admin
      .from("profiles").select("role").eq("id", user.id).single();
    if (callerProfile?.role !== "ceo") {
      return json({ error: "Only CEO can change user emails" }, 403);
    }

    const body = (await req.json()) as Input;
    if (!body.user_id || !body.new_email) {
      return json({ error: "Missing user_id or new_email" }, 400);
    }

    const newEmail = body.new_email.trim().toLowerCase();
    if (!emailRegex.test(newEmail)) {
      return json({ error: "Format d'email invalide" }, 400);
    }

    // Récupérer ancien email
    const { data: currentProfile, error: pErr } = await admin
      .from("profiles")
      .select("email")
      .eq("id", body.user_id)
      .single();
    if (pErr || !currentProfile) {
      return json({ error: "Utilisateur introuvable" }, 404);
    }
    const oldEmail = currentProfile.email;

    if (oldEmail?.toLowerCase() === newEmail) {
      return json({ error: "Le nouvel email est identique à l'actuel" }, 400);
    }

    // Vérif unicité (profiles + auth.users)
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("email", newEmail)
      .neq("id", body.user_id)
      .maybeSingle();
    if (existingProfile) {
      return json({ error: "Cet email est déjà utilisé par un autre utilisateur" }, 409);
    }

    // Update auth.users (service-role)
    const { error: authErr } = await admin.auth.admin.updateUserById(body.user_id, {
      email: newEmail,
      email_confirm: true,
    });
    if (authErr) {
      return json({ error: `Auth update failed: ${authErr.message}` }, 500);
    }

    // Update profiles.email
    const { error: profileUpdateErr } = await admin
      .from("profiles")
      .update({ email: newEmail })
      .eq("id", body.user_id);
    if (profileUpdateErr) {
      return json({
        error: `Profile update failed (auth already updated, incohérence possible): ${profileUpdateErr.message}`,
        warning: "auth.users.email has been updated but profiles.email failed. Manual reconciliation needed.",
      }, 500);
    }

    // Audit log
    const { error: auditErr } = await admin
      .from("access_audit_log")
      .insert({
        user_id: body.user_id,
        action: "email_changed",
        details: { old_email: oldEmail, new_email: newEmail },
        performed_by: user.id,
      });
    if (auditErr) {
      console.warn("Audit log insert failed:", auditErr.message);
    }

    return json({
      success: true,
      old_email: oldEmail,
      new_email: newEmail,
    });
  } catch (err) {
    return json({ error: "Internal server error", details: String(err) }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
