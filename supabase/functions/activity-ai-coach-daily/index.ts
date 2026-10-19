import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { appelerIA, utilisateurDe } from "../_shared/ia.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type DayKpis = {
  entry_date: string;
  videos_published: number;
  messages_sent: number;
  replies_received: number;
  appointments: number;
  sales_made: number;
};

type Payload = {
  today: DayKpis;
  yesterday: DayKpis | null;
  last7: Array<DayKpis | null>;
  objectives_daily: {
    videos: number;
    messages: number;
    replies: number;
    appointments: number;
    sales: number;
  };
};

function formatDay(d: DayKpis | null): string {
  if (!d) return "aucune saisie";
  return `vidéos ${d.videos_published}, messages ${d.messages_sent}, réponses ${d.replies_received}, RDV ${d.appointments}, ventes ${d.sales_made}`;
}

function summarize7Days(last7: Array<DayKpis | null>) {
  const filled = last7.filter(Boolean) as DayKpis[];
  const totals = filled.reduce(
    (acc, d) => ({
      videos: acc.videos + d.videos_published,
      messages: acc.messages + d.messages_sent,
      replies: acc.replies + d.replies_received,
      appointments: acc.appointments + d.appointments,
      sales: acc.sales + d.sales_made,
    }),
    { videos: 0, messages: 0, replies: 0, appointments: 0, sales: 0 }
  );
  return {
    days_filled: filled.length,
    days_missed: 7 - filled.length,
    totals,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const payload = (await req.json()) as Payload;
    const { today, yesterday, last7, objectives_daily } = payload;

    const week = summarize7Days(last7 || []);

    const prompt = `Tu es un coach bienveillant mais lucide pour des apporteurs d'affaires d'Ethicarena.

CONTEXTE DU MÉTIER (très important) :
L'apporteur est un setter. Ses 3 actions de fond sont :
1. PUBLIER des vidéos (Insta, TikTok, YouTube) pour générer du flux entrant
2. ENVOYER des messages (DM, WhatsApp) pour démarcher en sortant
3. OBTENIR des rendez-vous (qualifier un prospect et le booker pour le closer)

Les "réponses reçues" et les "ventes" sont des conséquences indirectes de ces 3 actions.
L'apporteur N'ANIME PAS les RDV, il N'ASSISTE PAS aux RDV, il NE PRÉPARE PAS les RDV : son job s'arrête une fois le RDV booké, c'est le closer qui prend le relais.
Ne lui dis JAMAIS de "préparer son rendez-vous", "se préparer pour son call", "réviser son pitch de vente", "soigner sa présentation" — ce n'est pas son rôle.
Ses leviers d'amélioration sont uniquement : publier plus / mieux, envoyer plus de messages, mieux qualifier les prospects, mieux relancer les non-réponses.

DONNÉES DE LA JOURNÉE (${today.entry_date}) :
- Vidéos publiées : ${today.videos_published} (cible : ${objectives_daily?.videos ?? 1})
- Messages envoyés : ${today.messages_sent} (cible : ${objectives_daily?.messages ?? 72})
- Réponses reçues : ${today.replies_received} (cible : ${objectives_daily?.replies ?? 2})
- RDV obtenus : ${today.appointments} (cible : ${objectives_daily?.appointments ?? 2})
- Ventes : ${today.sales_made} (cible : ${objectives_daily?.sales ?? 1})

Hier : ${formatDay(yesterday)}

Tendance 7 derniers jours : ${week.days_filled}/7 jours saisis (${week.days_missed} manqués), totaux : vidéos ${week.totals.videos}, messages ${week.totals.messages}, réponses ${week.totals.replies}, RDV ${week.totals.appointments}, ventes ${week.totals.sales}.

Génère 2 à 3 phrases courtes, contextuelles et concrètes :
1. Une comparaison explicite avec hier (mieux / moins bien / stable / pas saisi hier)
2. Un point fort de la journée
3. Un encouragement actionnable EN LIEN avec les 3 actions du setter (publier, démarcher, qualifier/booker)

Pas de liste, pas d'emoji excessif, français naturel, ton chaleureux mais factuel.`;

    // via OpenRouter, noté au journal de consommation IA ; en cas d'échec, pas de message (comme avant)
    let feedback: string | null = null;
    try {
      feedback = (await appelerIA({
        fonctionnalite: "coach_activite",
        userId: await utilisateurDe(req),
        maxTokens: 250,
        messages: [{ role: "user", content: prompt }],
        reference: today.entry_date,
      })) || null;
    } catch (e) {
      console.error("IA error:", (e as Error).message);
    }

    return new Response(JSON.stringify({ feedback }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("activity-ai-coach-daily error:", e);
    return new Response(
      JSON.stringify({ feedback: null, error: (e as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
