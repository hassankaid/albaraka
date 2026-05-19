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
  // Sprint T (18/05/2026) : URL Discord exposee dans l'email pour les clients
  // qui ont un Pass (AL BARAKA ou Liberty). Les formations a la carte n'y ont
  // pas acces.
  discordInviteUrl: "https://discord.gg/k9aV7DJJgR",
};

type PassType = "al_baraka" | "liberty";

function buildHtml(
  fullName: string,
  actionLink: string,
  passType: PassType = "al_baraka",
  includeDiscordButton: boolean = false,
): string {
  const firstName = (fullName || "").split(" ")[0] || "";
  const isLiberty = passType === "liberty";
  const productLabel = isLiberty ? "PASS LIBERTY" : "AL BARAKA";
  const ecosystemLabel = isLiberty ? "Bienvenue dans le PASS LIBERTY" : "Félicitations d'avoir intégré <strong style=\"color:" + BRAND.gold + ";font-weight:normal;\">l'écosystème AL BARAKA</strong>";
  const headerSubtitle = isLiberty ? "Pass Liberty" : "L'écosystème";
  const preheader = isLiberty
    ? "Ton compte est prêt. Active ton accès au PASS LIBERTY."
    : "Ton compte est prêt. Active ton accès à la plateforme AL BARAKA.";
  const titleHeading = isLiberty
    ? "PASS LIBERTY"
    : "AL BARAKA";
  // Structure validée mobile : double wrapper table + bgcolor partout.
  // Basé sur les conventions MJML/Litmus pour forcer un fond noir sur
  // Gmail iOS/Android + Apple Mail + Outlook mobile, même en mode clair.
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "https://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="https://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="color-scheme" content="dark only" />
<meta name="supported-color-schemes" content="dark only" />
<title>${isLiberty ? "Bienvenue dans le PASS LIBERTY" : "Bienvenue dans l'écosystème AL BARAKA"}</title>
<!--[if mso]>
<xml>
  <o:OfficeDocumentSettings>
    <o:AllowPNG/>
    <o:PixelsPerInch>96</o:PixelsPerInch>
  </o:OfficeDocumentSettings>
</xml>
<![endif]-->
<style type="text/css">
  :root { color-scheme: dark only; supported-color-schemes: dark only; }
  html, body { margin:0 !important; padding:0 !important; width:100% !important; height:100% !important; background-color:${BRAND.black} !important; }
  body, table, td, div, p, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; border-collapse:collapse !important; }
  img { border:0; line-height:100%; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }
  .bg-black { background-color:${BRAND.black} !important; }
  .bg-card { background-color:${BRAND.cardBg} !important; }
  @media (prefers-color-scheme: light) {
    html, body, .bg-black, [data-bg="black"] { background-color:${BRAND.black} !important; }
    .bg-card, [data-bg="card"] { background-color:${BRAND.cardBg} !important; }
  }
  @media screen and (max-width: 600px) {
    .container { width:100% !important; max-width:100% !important; }
    .px-mobile { padding-left:24px !important; padding-right:24px !important; }
  }
</style>
</head>
<body class="bg-black" bgcolor="${BRAND.black}" style="margin:0;padding:0;width:100%;height:100%;background-color:${BRAND.black};font-family:Georgia,'Times New Roman',serif;color:${BRAND.textMain};">
  <!-- Hidden preheader -->
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:${BRAND.black};opacity:0;">
    ${preheader}
  </div>
  <!-- 100% width background wrapper -->
  <table role="presentation" class="bg-black" data-bg="black" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${BRAND.black}" style="background-color:${BRAND.black};width:100%;border-collapse:collapse;">
    <tr>
      <td class="bg-black" data-bg="black" bgcolor="${BRAND.black}" align="center" valign="top" style="background-color:${BRAND.black};padding:40px 16px;">
        <!--[if mso | IE]>
        <table role="presentation" width="600" align="center" cellspacing="0" cellpadding="0" border="0" bgcolor="${BRAND.cardBg}"><tr><td>
        <![endif]-->
        <table role="presentation" class="container bg-card" data-bg="card" width="600" cellspacing="0" cellpadding="0" border="0" bgcolor="${BRAND.cardBg}" style="width:600px;max-width:600px;background-color:${BRAND.cardBg};border:1px solid ${BRAND.goldSoft};border-radius:12px;">
          <tr>
            <td class="bg-card px-mobile" data-bg="card" bgcolor="${BRAND.cardBg}" align="center" style="background-color:${BRAND.cardBg};padding:48px 32px 16px;">
              <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:32px;color:${BRAND.gold};letter-spacing:6px;font-weight:normal;">${titleHeading}</h1>
              <p style="margin:10px 0 0 0;color:${BRAND.textSecondary};font-size:11px;letter-spacing:3px;text-transform:uppercase;">${headerSubtitle}</p>
              <div style="width:60px;height:1px;background-color:${BRAND.gold};margin:24px auto 0 auto;line-height:1px;font-size:1px;">&nbsp;</div>
            </td>
          </tr>
          <tr>
            <td class="bg-card px-mobile" data-bg="card" bgcolor="${BRAND.cardBg}" style="background-color:${BRAND.cardBg};padding:32px 40px 8px;">
              <h2 style="margin:0 0 20px 0;font-size:22px;color:${BRAND.textMain};font-weight:normal;">
                Bienvenue${firstName ? ` ${firstName}` : ""},
              </h2>
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.7;color:${BRAND.textMain};">
                ${ecosystemLabel}.
              </p>
              <p style="margin:0 0 ${includeDiscordButton ? "16" : "28"}px 0;font-size:16px;line-height:1.7;color:${BRAND.textMain};">
                Ton compte est désormais prêt. Clique sur le bouton ci-dessous pour activer ton accès${isLiberty ? " au " + productLabel : " à la plateforme"} et définir ton mot de passe.
              </p>
              ${includeDiscordButton ? `
              <p style="margin:0 0 28px 0;font-size:16px;line-height:1.7;color:${BRAND.textMain};">
                <strong style="color:${BRAND.gold};font-weight:normal;">Rejoins également notre communauté Discord</strong> pour échanger avec les autres membres et accéder aux ressources exclusives.
              </p>` : ""}
            </td>
          </tr>
          <tr>
            <td class="bg-card px-mobile" data-bg="card" bgcolor="${BRAND.cardBg}" align="center" style="background-color:${BRAND.cardBg};padding:12px 32px 48px;">
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${actionLink}" style="height:52px;v-text-anchor:middle;width:320px;" arcsize="8%" stroke="f" fillcolor="${BRAND.gold}">
                <w:anchorlock/>
                <center style="color:${BRAND.black};font-family:Georgia,serif;font-size:14px;font-weight:bold;letter-spacing:2.5px;">Activer mon accès à la plateforme</center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-- -->
              <a href="${actionLink}" target="_blank" style="display:inline-block;background-color:${BRAND.gold};color:${BRAND.black};text-decoration:none;padding:16px 36px;border-radius:4px;font-size:14px;letter-spacing:2.5px;text-transform:uppercase;font-family:Georgia,'Times New Roman',serif;font-weight:bold;mso-hide:all;">
                Activer mon accès à la plateforme
              </a>
              <!--<![endif]-->
            </td>
          </tr>
          ${includeDiscordButton ? `
          <tr>
            <td class="bg-card px-mobile" data-bg="card" bgcolor="${BRAND.cardBg}" align="center" style="background-color:${BRAND.cardBg};padding:0 32px 40px;">
              <p style="margin:0 0 14px 0;font-size:12px;color:${BRAND.textSecondary};letter-spacing:0.5px;text-transform:uppercase;">— Et —</p>
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${BRAND.discordInviteUrl}" style="height:48px;v-text-anchor:middle;width:280px;" arcsize="8%" strokecolor="${BRAND.gold}" fillcolor="${BRAND.cardBg}">
                <w:anchorlock/>
                <center style="color:${BRAND.gold};font-family:Georgia,serif;font-size:13px;letter-spacing:2px;">Rejoindre l'espace Discord</center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-- -->
              <a href="${BRAND.discordInviteUrl}" target="_blank" style="display:inline-block;background-color:transparent;color:${BRAND.gold};text-decoration:none;padding:14px 32px;border:1px solid ${BRAND.gold};border-radius:4px;font-size:13px;letter-spacing:2px;text-transform:uppercase;font-family:Georgia,'Times New Roman',serif;mso-hide:all;">
                Rejoindre l'espace Discord
              </a>
              <!--<![endif]-->
            </td>
          </tr>` : ""}
          <tr>
            <td class="bg-card" data-bg="card" bgcolor="${BRAND.cardBg}" align="center" style="background-color:${BRAND.cardBg};padding:20px 32px;border-top:1px solid ${BRAND.goldSoft};">
              <p style="margin:0;font-size:11px;color:${BRAND.textSecondary};letter-spacing:0.5px;">
                © AL BARAKA — <a href="${BRAND.domain}" style="color:${BRAND.gold};text-decoration:none;">${BRAND.domainLabel}</a>
              </p>
            </td>
          </tr>
        </table>
        <!--[if mso | IE]>
        </td></tr></table>
        <![endif]-->
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
    const isServiceRoleCall = bearer === supabaseServiceKey;

    if (!isServiceRoleCall) {
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

      const adminClientForCheck = createClient(supabaseUrl, supabaseServiceKey);
      const { data: callerProfile } = await adminClientForCheck
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
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const userIds: string[] = Array.isArray(body.user_ids) ? body.user_ids : [];
    const testMode: boolean = !!body.test_mode;
    // pass_type : "al_baraka" (défaut) ou "liberty" — adapte le wording du mail
    const passType: PassType = body.pass_type === "liberty" ? "liberty" : "al_baraka";
    // Sprint T : flag pour inclure le bouton "Rejoindre l'espace Discord" dans
    // l'email. Defaut = false (formations a la carte). Le webhook l'envoie a
    // true pour les Pass AL BARAKA + Pass Liberty.
    const includeDiscordButton: boolean = !!body.include_discord_button;
    // Phase 6 (19/05/2026) : la signature du contrat est désormais intégrée
    // dans le wizard /onboarding (étape 1/2). On n'envoie plus de CTA
    // "Signer mon contrat" dans cet email — un seul CTA "Activer mon compte".
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

        const html = buildHtml(profile.full_name || "", actionLink, passType, includeDiscordButton);
        const toEmail = testMode ? BRAND.testEmail : profile.email;
        const subject = passType === "liberty"
          ? "Bienvenue dans le PASS LIBERTY"
          : "Bienvenue dans l'écosystème AL BARAKA";

        console.log(`[send-access] to=${toEmail} (real=${profile.email}) testMode=${testMode} serviceRole=${isServiceRoleCall}`);
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
