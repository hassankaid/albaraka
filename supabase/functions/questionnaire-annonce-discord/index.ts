// ─────────────────────────────────────────────────────────────────────────
// Annonce Discord du questionnaire clients (chapitre 9 du cahier des charges).
//
// Appel : POST { dry_run?: true, salon?: "annonce" }
//
// Publie le message de l'annexe D dans « annonces-importantes », mentionne
// @everyone, puis ÉPINGLE le message pour qu'il reste visible pendant toute
// la collecte. Les deux permissions nécessaires ont été accordées au bot le
// 22/09/2026 et vérifiées.
//
// Le lien est GÉNÉRIQUE, pas personnalisé : Discord ne permet pas un lien par
// élève. Il mène à /questionnaire, qui demande l'adresse et renvoie le lien
// personnel par e-mail — le lien n'est jamais affiché, et la réponse est la
// même que l'adresse soit connue ou non.
//
// ⚠️ `dry_run` rend le message exact sans rien publier. À utiliser d'abord :
// une annonce @everyone ne se rattrape pas.
// ─────────────────────────────────────────────────────────────────────────

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const LIEN_GENERIQUE = "https://plateforme.albarakaecosysteme.com/questionnaire";

const MESSAGE = `📢 **ANNONCE IMPORTANTE**

Salam la famille @everyone,

J'ai besoin de votre aide pour continuer à améliorer AL BARAKA.

Je viens de vous envoyer un email avec un questionnaire de 5 minutes : votre profil, où vous en êtes, ce qui vous freine, et ce qu'on peut améliorer dans l'accompagnement.

👉 Si vous n'avez pas encore reçu l'email ou que vous voulez répondre directement d'ici : ${LIEN_GENERIQUE}

C'est confidentiel, ça prend 5 minutes, et chaque réponse est lue. Sois franc(he), c'est comme ça qu'on avance ensemble.

Merci d'avance à tous, Barakallahou fik.

Sidali
*Gagne ta liberté. C'est ça la vraie baraka.*`;

async function dapi(chemin: string, token: string, init?: RequestInit) {
  const r = await fetch(`https://discord.com/api/v10${chemin}`, {
    ...init,
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!r.ok) throw new Error(`${chemin} → ${r.status} ${await r.text()}`);
  return r.status === 204 ? null : r.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok");
  try {
    const token = Deno.env.get("DISCORD_BOT_TOKEN");
    const guildId = Deno.env.get("DISCORD_GUILD_ID");
    if (!token || !guildId) {
      return Response.json({ error: "discord_non_configure" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({} as any));
    const recherche = String(body?.salon ?? "annonce").toLowerCase();

    const salons = await dapi(`/guilds/${guildId}/channels`, token);
    const salon = (salons as any[]).find(
      (c) => c.type === 0 && String(c.name ?? "").toLowerCase().includes(recherche),
    );
    if (!salon) {
      return Response.json({
        error: "salon_introuvable",
        recherche,
        salons: (salons as any[]).filter((c) => c.type === 0).map((c) => c.name),
      }, { status: 404 });
    }

    if (body?.dry_run === true) {
      return Response.json({
        dry_run: true,
        salon: salon.name,
        lien: LIEN_GENERIQUE,
        message: MESSAGE,
      });
    }

    const msg = await dapi(`/channels/${salon.id}/messages`, token, {
      method: "POST",
      body: JSON.stringify({
        content: MESSAGE,
        // Sans cette autorisation explicite, Discord affiche « @everyone »
        // comme du texte et ne notifie personne.
        allowed_mentions: { parse: ["everyone"] },
      }),
    });

    // L'épinglage est une requête à part, et elle peut échouer seule : mieux
    // vaut une annonce publiée mais non épinglée qu'un appel en erreur qui
    // laisse croire que rien n'est parti.
    let epingle = true;
    let erreurEpinglage: string | null = null;
    try {
      await dapi(`/channels/${salon.id}/pins/${msg.id}`, token, { method: "PUT" });
    } catch (e) {
      epingle = false;
      erreurEpinglage = String(e);
    }

    return Response.json({
      ok: true,
      salon: salon.name,
      message_id: msg.id,
      epingle,
      erreur_epinglage: erreurEpinglage,
      lien: LIEN_GENERIQUE,
    });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
});
