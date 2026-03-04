import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")!;

    // Verify the calling user
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_id, file_path } = await req.json();

    // Security: users can only extract their own RIB
    if (user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download the file from storage using service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from("ribs")
      .download(file_path);

    if (downloadError || !fileData) {
      return new Response(
        JSON.stringify({ error: "Could not download file", details: downloadError?.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Convert to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // Determine media type
    const ext = file_path.split(".").pop()?.toLowerCase();
    let mediaType = "application/pdf";
    if (ext === "jpg" || ext === "jpeg") mediaType = "image/jpeg";
    else if (ext === "png") mediaType = "image/png";
    else if (ext === "webp") mediaType = "image/webp";

    const isPdf = mediaType === "application/pdf";

    // Call Anthropic Claude to extract bank details
    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: isPdf ? "document" : "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: base64,
                },
                ...(isPdf ? { cache_control: { type: "ephemeral" } } : {}),
              },
              {
                type: "text",
                text: `Extrais les informations bancaires de ce document RIB. Retourne UNIQUEMENT un objet JSON valide avec ces champs :
{
  "account_holder": "NOM PRÉNOM du titulaire",
  "iban": "IBAN complet sans espaces",
  "bic": "Code BIC/SWIFT",
  "bank_name": "Nom de la banque"
}

Si un champ n'est pas trouvé, mets une chaîne vide. Ne retourne RIEN d'autre que le JSON.`,
              },
            ],
          },
        ],
      }),
    });

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      console.error("Anthropic API error:", errorText);
      return new Response(
        JSON.stringify({ error: "AI extraction failed", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const anthropicData = await anthropicResponse.json();
    const textContent = anthropicData.content?.[0]?.text || "";

    // Parse the JSON from Claude's response
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(
        JSON.stringify({ error: "Could not parse AI response", raw: textContent }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const bankDetails = JSON.parse(jsonMatch[0]);
    const cleanedDetails = {
      type: "iban",
      account_holder: (bankDetails.account_holder || "").toUpperCase().trim(),
      iban: (bankDetails.iban || "").replace(/\s/g, "").toUpperCase().trim(),
      bic: (bankDetails.bic || "").toUpperCase().trim(),
      bank_name: (bankDetails.bank_name || "").trim(),
    };

    // Save to profile
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ bank_details: cleanedDetails })
      .eq("id", user_id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: "Failed to save bank details", details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, bank_details: cleanedDetails }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
