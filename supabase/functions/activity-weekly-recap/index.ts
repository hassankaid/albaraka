import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const WEEKLY_TARGETS = {
  videos: 7,
  messages: 500,
  replies: 10,
  appointments: 10,
  sales: 3,
};

type DailyKpi = {
  entry_date: string;
  videos_published: number;
  messages_sent: number;
  replies_received: number;
  appointments: number;
  sales_made: number;
};

type WeeklyTotals = {
  videos: number;
  messages: number;
  replies: number;
  appointments: number;
  sales: number;
};

function emptyTotals(): WeeklyTotals {
  return { videos: 0, messages: 0, replies: 0, appointments: 0, sales: 0 };
}

function sumDays(days: DailyKpi[]): WeeklyTotals {
  return days.reduce(
    (acc, d) => ({
      videos: acc.videos + d.videos_published,
      messages: acc.messages + d.messages_sent,
      replies: acc.replies + d.replies_received,
      appointments: acc.appointments + d.appointments,
      sales: acc.sales + d.sales_made,
    }),
    emptyTotals()
  );
}

function formatTotals(t: WeeklyTotals) {
  return `vidéos ${t.videos}/${WEEKLY_TARGETS.videos}, messages ${t.messages}/${WEEKLY_TARGETS.messages}, réponses ${t.replies}/${WEEKLY_TARGETS.replies}, RDV ${t.appointments}/${WEEKLY_TARGETS.appointments}, ventes ${t.sales}/${WEEKLY_TARGETS.sales}`;
}

function listAllDays(weekStart: string): string[] {
  const days: string[] = [];
  const start = new Date(weekStart + "T00:00:00Z");
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

async function generateRecap(
  apiKey: string,
  args: {
    userName: string;
    weekStart: string;
    weekEnd: string;
    daysFilled: number;
    daysMissed: string[];
    totals: WeeklyTotals;
    prevTotals: WeeklyTotals;
    prev2Totals: WeeklyTotals;
  }
): Promise<string | null> {
  const prompt = `Tu es le coach IA d'Ethicarena. Voici le bilan hebdomadaire d'un apporteur d'affaires (${args.userName}).

CONTEXTE DU MÉTIER (très important) :
L'apporteur est un setter. Ses 3 actions de fond sont :
1. PUBLIER des vidéos (Insta, TikTok, YouTube) pour générer du flux entrant
2. ENVOYER des messages (DM, WhatsApp) pour démarcher en sortant
3. OBTENIR des rendez-vous (qualifier un prospect et le booker pour le closer)

Les "réponses reçues" et les "ventes" sont des conséquences indirectes de ces 3 actions.
L'apporteur N'ANIME PAS les RDV, il N'ASSISTE PAS aux RDV, il NE PRÉPARE PAS les RDV : son job s'arrête une fois le RDV booké, c'est le closer qui prend le relais.
Ne lui dis JAMAIS de "préparer son rendez-vous", "se préparer pour son call", "réviser son pitch de vente", "soigner sa présentation" — ce n'est pas son rôle.
Ses leviers d'amélioration sont uniquement : publier plus / mieux, envoyer plus de messages, mieux qualifier les prospects, mieux relancer les non-réponses.

DONNÉES — Semaine du ${args.weekStart} au ${args.weekEnd} :
- Jours saisis : ${args.daysFilled}/7  (manquants : ${args.daysMissed.length > 0 ? args.daysMissed.join(", ") : "aucun"})
- ${formatTotals(args.totals)}

Semaine précédente : ${formatTotals(args.prevTotals)}
Semaine -2 : ${formatTotals(args.prev2Totals)}

Rédige un bilan en 4 à 6 phrases :
1. Un point fort chiffré de la semaine
2. Progression ou recul vs semaine précédente (chiffré)
3. Discipline de saisie (${args.daysFilled}/7 jours) — encourager si <7
4. Un point à améliorer concret EN LIEN avec les 3 actions du setter (publier, démarcher, qualifier/booker)
5. Un objectif réaliste pour la semaine qui commence, formulé en nombre de publications, messages ou RDV

Ton bienveillant, factuel, chiffré. Pas de flagornerie, pas d'anglicismes, pas de listes, français naturel.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Anthropic error:", response.status, errText);
    return null;
  }

  const data = await response.json();
  return data.content?.[0]?.text || null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not set");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ── Calcul des bornes : la semaine écoulée (lundi → dimanche) ──
    // L'edge function tourne le lundi à 7h UTC. La semaine écoulée commence
    // 7 jours avant le lundi le plus proche dans le passé.
    const now = new Date();
    const dayOfWeek = now.getUTCDay(); // 0 = dimanche, 1 = lundi
    const daysSinceMonday = (dayOfWeek + 6) % 7;
    const thisMonday = new Date(now);
    thisMonday.setUTCDate(now.getUTCDate() - daysSinceMonday);
    thisMonday.setUTCHours(0, 0, 0, 0);

    const prevMonday = new Date(thisMonday);
    prevMonday.setUTCDate(thisMonday.getUTCDate() - 7);
    const prevSunday = new Date(thisMonday);
    prevSunday.setUTCDate(thisMonday.getUTCDate() - 1);

    const prev2Monday = new Date(prevMonday);
    prev2Monday.setUTCDate(prevMonday.getUTCDate() - 7);
    const prev3Monday = new Date(prev2Monday);
    prev3Monday.setUTCDate(prev2Monday.getUTCDate() - 7);

    const prevMondayStr = prevMonday.toISOString().slice(0, 10);
    const prevSundayStr = prevSunday.toISOString().slice(0, 10);
    const prev2MondayStr = prev2Monday.toISOString().slice(0, 10);
    const prev3MondayStr = prev3Monday.toISOString().slice(0, 10);

    // ── Récupération des profils éligibles (collaborateurs + CEO) ──
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .in("role", ["collaborateur", "ceo"]);

    if (profilesError) throw new Error(`Fetch profiles: ${profilesError.message}`);
    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, message: "No eligible profiles" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let processed = 0;
    const errors: string[] = [];

    for (const profile of profiles) {
      try {
        // Saisies de la semaine écoulée
        const { data: weekDays, error: dailyError } = await supabase
          .from("activity_daily_kpis")
          .select("entry_date, videos_published, messages_sent, replies_received, appointments, sales_made")
          .eq("user_id", profile.id)
          .gte("entry_date", prevMondayStr)
          .lte("entry_date", prevSundayStr);

        if (dailyError) throw new Error(`Fetch daily for ${profile.id}: ${dailyError.message}`);

        // Totaux semaine -1 et -2 via la vue
        const { data: prevWeeks, error: prevError } = await supabase
          .from("activity_weekly_totals")
          .select("week_start, videos_published, messages_sent, replies_received, appointments, sales_made")
          .eq("user_id", profile.id)
          .in("week_start", [prev2MondayStr, prev3MondayStr]);

        if (prevError) throw new Error(`Fetch prev weeks for ${profile.id}: ${prevError.message}`);

        const days = (weekDays || []) as DailyKpi[];
        const allDays = listAllDays(prevMondayStr);
        const filledDates = new Set(days.map((d) => d.entry_date));
        const daysMissed = allDays.filter((d) => !filledDates.has(d));
        const totals = sumDays(days);

        const prevRow = (prevWeeks || []).find((w: any) => w.week_start === prev2MondayStr);
        const prev2Row = (prevWeeks || []).find((w: any) => w.week_start === prev3MondayStr);

        const prevTotals: WeeklyTotals = prevRow
          ? {
              videos: prevRow.videos_published,
              messages: prevRow.messages_sent,
              replies: prevRow.replies_received,
              appointments: prevRow.appointments,
              sales: prevRow.sales_made,
            }
          : emptyTotals();

        const prev2Totals: WeeklyTotals = prev2Row
          ? {
              videos: prev2Row.videos_published,
              messages: prev2Row.messages_sent,
              replies: prev2Row.replies_received,
              appointments: prev2Row.appointments,
              sales: prev2Row.sales_made,
            }
          : emptyTotals();

        // Skip silently si l'utilisateur n'a rien saisi de toute la semaine ET
        // n'a aucun historique des deux semaines précédentes — pas de bilan utile.
        if (
          days.length === 0 &&
          prevTotals.videos === 0 &&
          prevTotals.messages === 0 &&
          prev2Totals.videos === 0 &&
          prev2Totals.messages === 0
        ) {
          continue;
        }

        const recap = await generateRecap(ANTHROPIC_API_KEY, {
          userName: profile.full_name || "collaborateur",
          weekStart: prevMondayStr,
          weekEnd: prevSundayStr,
          daysFilled: days.length,
          daysMissed,
          totals,
          prevTotals,
          prev2Totals,
        });

        if (!recap) {
          errors.push(`AI generation failed for ${profile.id}`);
          continue;
        }

        const { error: upsertError } = await supabase
          .from("activity_weekly_recaps")
          .upsert(
            {
              user_id: profile.id,
              week_start: prevMondayStr,
              recap_text: recap,
              stats: {
                days_filled: days.length,
                days_missed: daysMissed,
                totals,
                prev_totals: prevTotals,
                prev2_totals: prev2Totals,
              },
              dismissed_at: null,
            },
            { onConflict: "user_id,week_start" }
          );

        if (upsertError) {
          errors.push(`Upsert failed for ${profile.id}: ${upsertError.message}`);
          continue;
        }

        processed++;
      } catch (e) {
        errors.push(`${profile.id}: ${(e as Error).message}`);
      }
    }

    return new Response(
      JSON.stringify({
        processed,
        eligible: profiles.length,
        week_start: prevMondayStr,
        week_end: prevSundayStr,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("activity-weekly-recap error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
