import { supabase } from "@/integrations/supabase/client";
import { isFormationCompleteForUser } from "./certificateEligibility";

/**
 * Marque automatiquement complétés les chapitres `redirect_formation` du parcours
 * qui référencent une formation entièrement validée par le user.
 *
 * Appelé après la validation du quiz final d'une formation : si tous les critères
 * de complétion (vidéos 100% + quiz de module + quiz final) sont remplis, on
 * débloque la suite du parcours AL BARAKA / LIBERTY.
 *
 * Idempotent : `onConflict: user_id,chapitre_id` dans parcours_chapitre_progress.
 */
export async function autoCompleteParcoursFormationChapter(
  userId: string,
  formationId: string,
): Promise<{ completed: number }> {
  // La formation doit être entièrement validée
  const ok = await isFormationCompleteForUser(userId, formationId);
  if (!ok) return { completed: 0 };

  // Cherche tous les chapitres parcours redirect_formation qui pointent sur cette formation
  const { data: chapters, error } = await supabase
    .from("parcours_chapitres")
    .select("id")
    .eq("type", "redirect_formation")
    .eq("formation_id", formationId)
    .eq("status", "published");

  if (error) throw error;
  if (!chapters || chapters.length === 0) return { completed: 0 };

  // Upsert progress pour chaque chapitre
  const rows = chapters.map((c) => ({ user_id: userId, chapitre_id: c.id }));
  const { error: pErr } = await supabase
    .from("parcours_chapitre_progress")
    .upsert(rows, { onConflict: "user_id,chapitre_id", ignoreDuplicates: true });
  if (pErr) throw pErr;

  return { completed: chapters.length };
}
