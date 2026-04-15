import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BRAND = {
  name: "AL BARAKA",
  gold: "#D4AF37",
  black: "#0A0A0A",
  cream: "#F5F1E8",
  domain: "https://albarakaecosysteme.com",
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
<title>Bienvenue dans l'écosystème AL BARAKA</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.cream};font-family:Georgia, 'Times New Roman', serif;color:${BRAND.black};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${BRAND.cream};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background-color:#ffffff;border:1px solid rgba(212,175,55,0.3);border-radius:8px;overflow:hidden;">
          <tr>
            <td style="background-color:${BRAND.black};padding:40px 32px;text-align:center;">
              <h1 style="margin:0;font-family:Georgia, 'Times New Roman', serif;font-size:28px;color:${BRAND.gold};letter-spacing:4px;font-weight:normal;">AL BARAKA</h1>
              <p style="margin:8px 0 0 0;color:rgba(245,241,232,0.7);font-size:13px;letter-spacing:2px;text-transform:uppercase;">L'écosystème</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 32px 24px;">
              <h2 style="margin:0 0 16px 0;font-size:24px;color:${BRAND.black};font-weight:normal;">
                Bienvenue${firstName ? ` ${firstName}` : ""},
              </h2>
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#333333;">
                Félicitations d'avoir intégré <strong style="color:${BRAND.black};">l'écosystème AL BARAKA</strong> !
              </p>
              <p style="margin:0 0 24px 0;font-size:16px;line-height:1.6;color:#333333;">
                Ton compte est désormais prêt. Clique sur le bouton ci-dessous pour <strong>activer ton accès au Hub</strong> et définir ton mot de passe.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 32px 32px;">
              <a href="${actionLink}" style="display:inline-block;background-color:${BRAND.black};color:${BRAND.gold};text-decoration:none;padding:16px 40px;border-radius:4px;font-size:15px;letter-spacing:2px;text-transform:uppercase;font-family:Georgia, 'Times New Roman', serif;border:1px solid ${BRAND.gold};">
                Activer mon accès
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 24px;">
              <p style="margin:0;font-size:13px;line-height:1.6;color:#666666;">
                Ce lien est valable pendant 1 heure. Si le bouton ne fonctionne pas, copie-colle cette URL dans ton navigateur&nbsp;:
              </p>
              <p style="margin:8px 0 0 0;font-size:12px;word-break:break-all;color:${BRAND.gold};">
                <a href="${actionLink}" style="color:${BRAND.gold};text-decoration:underline;">${actionLink}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;border-top:1px solid rgba(212,175,55,0.2);background-color:${BRAND.cream};">
              <p style="margin:0;font-size:12px;color:#888888;text-align:center;line-height:1.5;">
                Si tu n'attendais pas cet email, ignore-le simplement.<br/>
                © AL BARAKA — <a href="${BRAND.domain}" style="color:${BRAND.gold};text-decoration:none;">albarakaecosysteme.com</a>
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

    // Extract bearer token
    const bearer = authHeader.replace(/^Bearer\s+/i, "").trim();
    const callerClient = createClient(supabaseUrl, anonKey);
    const { data: userData, error: userErr } = await callerClient.auth.getUser(bearer);
    const caller = userData?.user;
    if (userErr || !caller) {
      console.error("[send-access] getUser error:", userErr);
      return new Response(
        JSON.stringify({
          error: "Invalid token",
          detail: userErr?.message ?? "no user",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
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
