// Appel de l'edge function publique `tunnel-lead-submit` (crée le lead CRM).
//
// Même pattern que le funnel quiz : POST JSON vers /functions/v1/<fn> avec la
// clé anon en `apikey` + `Authorization: Bearer` (le proxy Supabase l'exige
// même quand verify_jwt=false). URL + clé anon = constantes publiques du projet
// (partagées, pas de la logique métier funnel).
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/client";
import { getAttribution } from "./source";
import type { TunnelConfig } from "../config";

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/tunnel-lead-submit`;

export interface TunnelLeadInput {
  first_name: string;
  email: string;
  phone: string; // E.164
}

export interface TunnelLeadResult {
  ok: boolean;
  lead_id: string;
  contact_id: string;
}

export async function submitTunnelLead(input: TunnelLeadInput, cfg: TunnelConfig): Promise<TunnelLeadResult> {
  const a = getAttribution(cfg);
  const body = {
    first_name: input.first_name,
    email: input.email,
    phone: input.phone,
    source: a?.source ?? `${cfg.srcPrefix}_direct`,
    src: a?.src ?? null,
    utm_source: a?.utm_source ?? null,
    utm_medium: a?.utm_medium ?? null,
    utm_campaign: a?.utm_campaign ?? null,
    utm_content: a?.utm_content ?? null,
    utm_term: a?.utm_term ?? null,
    fbclid: a?.fbclid ?? null,
    referrer: a?.referrer ?? null,
  };

  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data: any;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Bad response (${res.status})`);
  }
  if (!res.ok) {
    throw new Error(String(data?.message ?? data?.error ?? `HTTP ${res.status}`));
  }
  return data as TunnelLeadResult;
}
