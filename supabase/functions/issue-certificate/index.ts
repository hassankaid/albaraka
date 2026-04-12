// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface IssueInput {
  user_id: string;
  formation_id: string;
  source: "auto" | "manual";
}

async function isFormationComplete(
  admin: any,
  userId: string,
  formationId: string,
): Promise<boolean> {
  // All published chapters of published modules of this formation
  const { data: chapters, error: cErr } = await admin
    .from("formation_chapitres")
    .select("id, status, formation_modules!inner(formation_id, status)")
    .eq("formation_modules.formation_id", formationId);
  if (cErr) throw cErr;

  const publishedChapters = (chapters || []).filter(
    (c: any) =>
      c.status === "published" && c.formation_modules?.status === "published",
  );
  if (publishedChapters.length === 0) return false;

  const chapterIds = publishedChapters.map((c: any) => c.id);
  const { data: progress, error: pErr } = await admin
    .from("chapitre_progress")
    .select("chapitre_id")
    .eq("user_id", userId)
    .in("chapitre_id", chapterIds);
  if (pErr) throw pErr;

  const doneSet = new Set((progress || []).map((p: any) => p.chapitre_id));
  const allChaptersDone = chapterIds.every((id: string) => doneSet.has(id));
  if (!allChaptersDone) return false;

  // All published quizzes of published modules of this formation
  const { data: modules, error: mErr } = await admin
    .from("formation_modules")
    .select("id, status")
    .eq("formation_id", formationId)
    .eq("status", "published");
  if (mErr) throw mErr;

  const moduleIds = (modules || []).map((m: any) => m.id);
  if (moduleIds.length === 0) return allChaptersDone;

  const { data: quizzes, error: qErr } = await admin
    .from("quizzes")
    .select("id, status")
    .in("module_id", moduleIds)
    .eq("status", "published");
  if (qErr) throw qErr;

  const quizIds = (quizzes || []).map((q: any) => q.id);
  if (quizIds.length === 0) return true; // No quizzes required

  // Any validated attempt per quiz is enough
  const { data: attempts, error: aErr } = await admin
    .from("quiz_attempts")
    .select("quiz_id, validated")
    .eq("user_id", userId)
    .in("quiz_id", quizIds)
    .eq("validated", true);
  if (aErr) throw aErr;

  const validatedSet = new Set((attempts || []).map((a: any) => a.quiz_id));
  return quizIds.every((id: string) => validatedSet.has(id));
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
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const body = (await req.json()) as IssueInput;
    if (!body.user_id || !body.formation_id || !body.source) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authorization: user can only issue for themselves (auto); CEO can issue for anyone (manual)
    const { data: callerProfile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const isCeo = callerProfile?.role === "ceo";

    if (body.source === "manual" && !isCeo) {
      return new Response(JSON.stringify({ error: "Only CEO can issue manually" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (body.source === "auto" && body.user_id !== user.id && !isCeo) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check enrollment (defense in depth)
    const { data: enrollment } = await admin
      .from("formation_enrollments")
      .select("id")
      .eq("user_id", body.user_id)
      .eq("formation_id", body.formation_id)
      .is("revoked_at", null)
      .maybeSingle();
    if (!enrollment) {
      return new Response(JSON.stringify({ error: "L'élève n'est pas inscrit à cette formation" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotence: existing active cert?
    const { data: existing } = await admin
      .from("formation_certificates")
      .select("id, certificate_number, pdf_storage_path")
      .eq("user_id", body.user_id)
      .eq("formation_id", body.formation_id)
      .is("revoked_at", null)
      .maybeSingle();
    if (existing) {
      return new Response(
        JSON.stringify({
          already_issued: true,
          certificate_id: existing.id,
          certificate_number: existing.certificate_number,
          pdf_storage_path: existing.pdf_storage_path,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Eligibility
    const eligible = await isFormationComplete(admin, body.user_id, body.formation_id);
    if (!eligible) {
      return new Response(
        JSON.stringify({ error: "Formation non complétée à 100%" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Generate number via sequence using a direct SQL call
    const year = new Date().getFullYear();
    const { data: seqRes, error: seqErr } = await admin.rpc("nextval_certificate_seq");
    let next: number;
    if (seqErr || seqRes === null || seqRes === undefined) {
      // Fallback using a COUNT + 1 (not ideal but functional)
      const { count } = await admin
        .from("formation_certificates")
        .select("id", { count: "exact", head: true });
      next = (count || 0) + 1;
    } else {
      next = Number(seqRes);
    }
    const userHex6 = body.user_id.replace(/-/g, "").slice(0, 6).toUpperCase();
    const certificateNumber = `ABT-${year}-${userHex6}-${String(next).padStart(4, "0")}`;

    // Insert
    const { data: cert, error: insErr } = await admin
      .from("formation_certificates")
      .insert({
        certificate_number: certificateNumber,
        user_id: body.user_id,
        formation_id: body.formation_id,
        issue_source: body.source,
        issued_by: isCeo ? user.id : null,
      })
      .select("id, certificate_number")
      .single();
    if (insErr || !cert) {
      return new Response(
        JSON.stringify({ error: insErr?.message || "Insertion échouée" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        certificate_id: cert.id,
        certificate_number: cert.certificate_number,
        already_issued: false,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
