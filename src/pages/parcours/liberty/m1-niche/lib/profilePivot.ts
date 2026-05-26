/**
 * Push du profil pivot du M1 NICHE vers la table `liberty_user_profile`,
 * pour que les modules M2 → M18 puissent pré-remplir leurs champs sans que
 * l'élève n'ait à ressaisir son contexte.
 */

import { supabase } from "@/integrations/supabase/client";
import type { M1State, M1ProfilePivot } from "./types";

export async function pushM1ProfilePivot(userId: string, state: M1State): Promise<void> {
  const pivot: M1ProfilePivot & {
    branch: M1State["branch"];
    engagement_signe_par: string;
    engagement_signe_le: string | null;
  } = {
    m1_completed_at: new Date().toISOString(),
    branch: state.branch,
    archetype: state.bilan.archetype,
    marche: state.bilan.marche,
    sous_niche_2: { ...state.sous_niche_2 },
    avatar: {
      photo_url: state.avatar.photo_url,
      socio: { ...state.avatar.socio },
      psycho: { ...state.avatar.psycho },
    },
    engagement_signe_par: state.engagement.nom_complet,
    engagement_signe_le: state.engagement.date_signature,
  };

  // Lit le profil existant et merge.
  const { data: existing } = await supabase
    .from("liberty_user_profile" as never)
    .select("data")
    .eq("user_id", userId as never)
    .maybeSingle();

  const current = ((existing as any)?.data as Record<string, unknown>) ?? {};
  const merged = { ...current, ...pivot, _updated_at: new Date().toISOString() };

  const { error } = await supabase
    .from("liberty_user_profile" as never)
    .upsert(
      { user_id: userId, data: merged, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
  if (error) throw error;
}
