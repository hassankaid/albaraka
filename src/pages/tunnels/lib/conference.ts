// ─────────────────────────────────────────────────────────────────────────
// La conférence affichée par les funnels vient de la BASE, plus du code.
//
// `conference_courante()` renvoie la conférence sur laquelle il faut inscrire
// en ce moment : celle du dimanche à venir, et elle bascule d'elle-même sur le
// dimanche suivant à l'heure de début (11h00 par défaut, portée par la fiche).
// C'est ce qui permet au visiteur qui arrive pendant ou après la conférence
// d'être rattaché à la suivante — sans modification de code ni déploiement.
//
// La même fonction SQL sert de pivot au déclencheur qui remplit
// `leads.conference_date` : l'affichage et le rattachement ne peuvent donc pas
// diverger.
//
// ⚠️ `theme.ts` reste le filet de sécurité. Si l'appel échoue (réseau, RLS,
// fiche non renseignée), on retombe sur les valeurs en dur : mieux vaut une
// date d'une semaine en retard qu'un écran vide sur une page servie à du
// trafic publicitaire payant.
//
// Appel en fetch direct plutôt qu'avec le client Supabase : le module tunnels
// est volontairement autonome, et `api.ts` fait déjà exactement pareil.
// ─────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/client";
import { CONFERENCE } from "../theme";

const RPC_URL = `${SUPABASE_URL}/rest/v1/rpc/conference_courante`;

export interface ConferenceCourante {
  /** « Dimanche 6 septembre 2026 à 11h00 » */
  dateLabel: string;
  /** Lien d'invitation du groupe WhatsApp de cette conférence. */
  whatsappGroupUrl: string;
}

interface RpcRow {
  conference_date: string | null;
  starts_at_local: string | null;
  whatsapp_group_url: string | null;
}

/** « 2026-09-06 » + « 11:00:00 » → « Dimanche 6 septembre 2026 à 11h00 ». */
export function formatDateLabel(date: string, heure: string | null): string {
  // Midi UTC : la date reste la bonne quel que soit le fuseau du visiteur.
  const jour = new Date(`${date}T12:00:00Z`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const [h, m] = (heure ?? "11:00:00").split(":");
  return `${jour.charAt(0).toUpperCase()}${jour.slice(1)} à ${h}h${m}`;
}

export async function fetchConferenceCourante(signal?: AbortSignal): Promise<ConferenceCourante | null> {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: "{}",
    signal,
  });
  if (!res.ok) return null;

  const rows = (await res.json()) as RpcRow[] | null;
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row?.conference_date) return null;

  return {
    dateLabel: formatDateLabel(row.conference_date, row.starts_at_local),
    // Une fiche sans groupe renseigné ne doit pas produire de bouton mort.
    whatsappGroupUrl: row.whatsapp_group_url || CONFERENCE.whatsappGroupUrl,
  };
}

/**
 * Date et groupe WhatsApp de la conférence en cours d'inscription.
 * Rend d'abord les valeurs de `theme.ts`, puis celles de la base dès qu'elles
 * arrivent : la page ne montre jamais de trou pendant le chargement.
 */
export function useConference(): ConferenceCourante {
  const [conf, setConf] = useState<ConferenceCourante>({
    dateLabel: CONFERENCE.dateLabel,
    whatsappGroupUrl: CONFERENCE.whatsappGroupUrl,
  });

  useEffect(() => {
    const ctrl = new AbortController();
    fetchConferenceCourante(ctrl.signal)
      .then((c) => { if (c) setConf(c); })
      .catch(() => { /* on garde le filet de theme.ts */ });
    return () => ctrl.abort();
  }, []);

  return conf;
}
