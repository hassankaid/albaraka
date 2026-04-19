import { supabase } from "@/integrations/supabase/client";

export async function isFormationCompleteForUser(
  userId: string,
  formationId: string,
): Promise<boolean> {
  const { data: chapters } = await supabase
    .from("formation_chapitres")
    .select("id, status, formation_modules!inner(formation_id, status)")
    .eq("formation_modules.formation_id", formationId);

  const publishedChapters = (chapters || []).filter(
    (c: any) =>
      c.status === "published" && c.formation_modules?.status === "published",
  );
  if (publishedChapters.length === 0) return false;

  const chapterIds = publishedChapters.map((c: any) => c.id);
  const { data: progress } = await supabase
    .from("chapitre_progress")
    .select("chapitre_id")
    .eq("user_id", userId)
    .in("chapitre_id", chapterIds);

  const doneSet = new Set((progress || []).map((p: any) => p.chapitre_id));
  if (!chapterIds.every((id: string) => doneSet.has(id))) return false;

  const { data: modules } = await supabase
    .from("formation_modules")
    .select("id, status")
    .eq("formation_id", formationId)
    .eq("status", "published");

  const moduleIds = (modules || []).map((m: any) => m.id);
  if (moduleIds.length === 0) return true;

  // 1. Quiz de module (module_id IS NOT NULL) — tous doivent être validés
  const { data: moduleQuizzes } = await supabase
    .from("quizzes")
    .select("id, status")
    .in("module_id", moduleIds)
    .eq("status", "published");

  // 2. Quiz attachés à un chapitre (chapitre_id IS NOT NULL) — tous doivent être validés
  const { data: chapitreQuizzes } = await (supabase as any)
    .from("quizzes")
    .select("id, status")
    .in("chapitre_id", chapterIds)
    .eq("status", "published");

  // 3. Quiz de validation finale de la formation (formation_id = ...)
  const { data: finalQuiz } = await supabase
    .from("quizzes")
    .select("id, status")
    .eq("formation_id", formationId)
    .is("module_id", null)
    .eq("status", "published")
    .maybeSingle();

  const quizIds = [
    ...((moduleQuizzes || []).map((q: any) => q.id) as string[]),
    ...((chapitreQuizzes || []).map((q: any) => q.id) as string[]),
    ...(finalQuiz ? [finalQuiz.id] : []),
  ];
  if (quizIds.length === 0) return true;

  const { data: attempts } = await supabase
    .from("quiz_attempts")
    .select("quiz_id, validated")
    .eq("user_id", userId)
    .in("quiz_id", quizIds)
    .eq("validated", true);

  const validatedSet = new Set((attempts || []).map((a: any) => a.quiz_id));
  return quizIds.every((id: string) => validatedSet.has(id));
}
