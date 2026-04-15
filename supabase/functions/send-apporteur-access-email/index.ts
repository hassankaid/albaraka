import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BRAND = {
  name: "AL BARAKA",
  gold: "#D4AF37",
  goldSoft: "rgba(212,175,55,0.25)",
  black: "#0A0A0A",
  cardBg: "#141414",
  textMain: "#EDEDED",
  textSecondary: "#9A9A9A",
  domain: "https://plateforme.albarakaecosysteme.com",
  domainLabel: "plateforme.albarakaecosysteme.com",
  redirectPath: "/reset-password",
  testEmail: "contact@hassankaid.com",
  fromEmail: Deno.env.get("RESEND_FROM_EMAIL") || "AL BARAKA <noreply@albarakaecosysteme.com>",
};

function buildHtml(fullName: string, actionLink: string): string {
  const firstName = (fullName || "").split(" ")[0] || "";
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="color-scheme" content="dark only" />
<meta name="supported-color-schemes" content="dark only" />
<title>Bienvenue dans l'écosystème AL BARAKA</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.black};font-family:Georgia,'Times New Roman',serif;color:${BRAND.textMain};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${BRAND.black};padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background-color:${BRAND.cardBg};border:1px solid ${BRAND.goldSoft};border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:48px 32px 16px;text-align:center;">
              <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:32px;color:${BRAND.gold};letter-spacing:6px;font-weight:normal;">AL BARAKA</h1>
              <p style="margin:10px 0 0 0;color:${BRAND.textSecondary};font-size:11px;letter-spacing:3px;text-transform:uppercase;">L'écosystème</p>
              <div style="width:60px;height:1px;background-color:${BRAND.gold};margin:24px auto 0 auto;"></div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px 8px;">
              <h2 style="margin:0 0 20px 0;font-size:22px;color:${BRAND.textMain};font-weight:normal;">
                Bienvenue${firstName ? ` ${firstName}` : ""},
              </h2>
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.7;color:${BRAND.textMain};">
                Félicitations d'avoir intégré <strong style="color:${BRAND.gold};font-weight:normal;">l'écosystème AL BARAKA</strong>.
              </p>
              <p style="margin:0 0 28px 0;font-size:16px;line-height:1.7;color:${BRAND.textMain};">
                Ton compte est désormais prêt. Clique sur le bouton ci-dessous pour activer ton accès à la plateforme et définir ton mot de passe.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:12px 32px 48px;">
              <a href="${actionLink}" style="display:inline-block;background-color:${BRAND.gold};color:${BRAND.black};text-decoration:none;padding:16px 36px;border-radius:4px;font-size:14px;letter-spacing:2.5px;text-transform:uppercase;font-family:Georgia,'Times New Roman',serif;font-weight:bold;">
                Activer mon accès à la plateforme
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;border-top:1px solid ${BRAND.goldSoft};text-align:center;">
              <p style="margin:0;font-size:11px;color:${BRAND.textSecondary};letter-spacing:0.5px;">
                © AL BARAKA — <a href="${BRAND.domain}" style="color:${BRAND.gold};text-decoration:none;">${BRAND.domainLabel}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendResend(to: string, subject: string, html: string, apiKey: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: BRAND.fromEmail,
      to: [to],
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend ${res.status}: ${body}`);
  }
  return await res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bearer = authHeader.replace(/^Bearer\s+/i, "").trim();
    const callerClient = createClient(supabaseUrl, anonKey);
    const { data: userData, error: userErr } = await callerClient.auth.getUser(bearer);
    const caller = userData?.user;
    if (userErr || !caller) {
      console.error("[send-access] getUser error:", userErr);
      return new Response(
        JSON.stringify({ error: "Invalid token", detail: userErr?.message ?? "no user" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();
    if (callerProfile?.role !== "ceo") {
      return new Response(JSON.stringify({ error: "CEO only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const userIds: string[] = Array.isArray(body.user_ids) ? body.user_ids : [];
    const testMode: boolean = !!body.test_mode;
    if (userIds.length === 0) {
      return new Response(JSON.stringify({ error: "user_ids empty" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sent: string[] = [];
    const failed: Array<{ user_id: string; error: string }> = [];

    for (const userId of userIds) {
      try {
        const { data: profile } = await adminClient
          .from("profiles")
          .select("id, email, full_name, role, access_opened_at, access_sent_count")
          .eq("id", userId)
          .single();
        if (!profile || !profile.email) {
          failed.push({ user_id: userId, error: "Profile or email missing" });
          continue;
        }
        if (!["apporteur", "collaborateur"].includes(profile.role)) {
          failed.push({ user_id: userId, error: `Role ${profile.role} non éligible` });
          continue;
        }

        const redirectTo = `${BRAND.domain}${BRAND.redirectPath}`;
        const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
          type: "recovery",
          email: profile.email,
          options: { redirectTo },
        });
        if (linkErr || !linkData?.properties?.action_link) {
          failed.push({ user_id: userId, error: `generateLink: ${linkErr?.message || "no action_link"}` });
          continue;
        }
        const parsed = new URL(linkData.properties.action_link);
        parsed.searchParams.set("redirect_to", redirectTo);
        const actionLink = parsed.toString();

        const html = buildHtml(profile.full_name || "", actionLink);
        const toEmail = testMode ? BRAND.testEmail : profile.email;
        const subject = "Bienvenue dans l'écosystème AL BARAKA";

        console.log(`[send-access] to=${toEmail} (real=${profile.email}) testMode=${testMode}`);
        await sendResend(toEmail, subject, html, resendKey);

        await adminClient
          .from("profiles")
          .update({
            access_opened_at: profile.access_opened_at ?? new Date().toISOString(),
            last_access_sent_at: new Date().toISOString(),
            access_sent_count: (profile.access_sent_count ?? 0) + 1,
          })
          .eq("id", profile.id);

        sent.push(userId);
      } catch (e: any) {
        console.error("Send error for user", userId, e);
        failed.push({ user_id: userId, error: e.message ?? String(e) });
      }
    }

    return new Response(
      JSON.stringify({ sent, failed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("send-apporteur-access-email error:", err);
    return new Response(
      JSON.stringify({ error: err.message ?? "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
