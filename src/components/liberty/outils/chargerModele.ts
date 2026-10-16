/** Charge un modèle de Sidali (table liberty_modeles) en base64. */
import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, string>();

export async function chargerModele(code: string): Promise<string> {
  const deja = cache.get(code);
  if (deja) return deja;
  // table absente des types générés (migration 20261016170000)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).from("liberty_modeles").select("contenu_base64").eq("code", code).maybeSingle();
  if (error || !data?.contenu_base64) throw new Error("Modèle indisponible");
  cache.set(code, data.contenu_base64 as string);
  return data.contenu_base64 as string;
}
