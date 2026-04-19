import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question: string;
  contexte: string;
  options: string[];
  correct_index: number;
  explication: string;
  ordre: number;
}

export interface Quiz {
  id: string;
  module_id: string | null;
  formation_id: string | null;
  chapitre_id: string | null;
  titre: string;
  description: string;
  max_errors: number;
  status: string;
  questions?: QuizQuestion[];
}

export type QuizAttachment =
  | { kind: "training" }
  | { kind: "module"; module_id: string }
  | { kind: "chapitre"; chapitre_id: string }
  | { kind: "formation_final"; formation_id: string };

export interface QuizAttempt {
  id: string;
  user_id: string;
  quiz_id: string;
  errors_count: number;
  total_questions: number;
  answers: { question_id: string; selected: number; correct: boolean }[];
  validated: boolean;
  completed_at: string;
}

// ─── READ HOOKS ───

/**
 * Liste TOUS les quiz (usage admin).
 * Pour la page utilisateur /training/quiz, utilise useTrainingQuizzes().
 */
export function useQuizzes() {
  return useQuery({
    queryKey: ["quizzes"],
    queryFn: async (): Promise<Quiz[]> => {
      const { data, error } = await (supabase as any)
        .from("quizzes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

/**
 * Liste des formations avec leurs modules — pour le sélecteur de rattachement admin.
 */
export interface FormationWithModules {
  id: string;
  titre: string;
  slug: string;
  ordre: number;
  modules: { id: string; titre: string; ordre: number }[];
}

export function useFormationsWithModules() {
  return useQuery({
    queryKey: ["formations-with-modules"],
    queryFn: async (): Promise<FormationWithModules[]> => {
      const { data: formations, error: fErr } = await (supabase as any)
        .from("formations")
        .select("id, titre, slug, ordre")
        .neq("status", "archived")
        .order("ordre", { ascending: true });
      if (fErr) throw fErr;
      const ids = (formations || []).map((f: any) => f.id);
      if (ids.length === 0) return [];
      const { data: modules, error: mErr } = await (supabase as any)
        .from("formation_modules")
        .select("id, titre, ordre, formation_id")
        .in("formation_id", ids)
        .neq("status", "archived")
        .order("ordre", { ascending: true });
      if (mErr) throw mErr;
      const byFormation = new Map<string, any[]>();
      for (const m of modules || []) {
        if (!byFormation.has(m.formation_id)) byFormation.set(m.formation_id, []);
        byFormation.get(m.formation_id)!.push({ id: m.id, titre: m.titre, ordre: m.ordre });
      }
      return (formations || []).map((f: any) => ({
        ...f,
        modules: byFormation.get(f.id) ?? [],
      }));
    },
  });
}

/**
 * Liste UNIQUEMENT les quiz d'entraînement libre (module_id IS NULL AND formation_id IS NULL).
 * Destiné à la page /training/quiz — exclut les quiz par module et les quiz de validation finale.
 * Enrichit chaque quiz avec le nombre de questions (question_count).
 */
export function useTrainingQuizzes() {
  return useQuery({
    queryKey: ["quizzes", "training"],
    queryFn: async (): Promise<(Quiz & { question_count: number })[]> => {
      const { data, error } = await (supabase as any)
        .from("quizzes")
        .select("*")
        .is("module_id", null)
        .is("formation_id", null)
        .is("chapitre_id", null)
        .eq("status", "published")
        .order("titre", { ascending: true });
      if (error) throw error;
      const quizzes = data || [];
      if (quizzes.length === 0) return [];
      const ids = quizzes.map((q: any) => q.id);
      const { data: counts } = await (supabase as any)
        .from("quiz_questions")
        .select("quiz_id")
        .in("quiz_id", ids);
      const byQuiz = new Map<string, number>();
      for (const r of counts || []) {
        byQuiz.set(r.quiz_id, (byQuiz.get(r.quiz_id) ?? 0) + 1);
      }
      return quizzes.map((q: any) => ({ ...q, question_count: byQuiz.get(q.id) ?? 0 }));
    },
  });
}

export function useQuizByModule(moduleId: string | null) {
  return useQuery({
    queryKey: ["quiz", "by-module", moduleId],
    queryFn: async (): Promise<Quiz | null> => {
      if (!moduleId) return null;
      const { data, error } = await (supabase as any)
        .from("quizzes")
        .select("*")
        .eq("module_id", moduleId)
        .eq("status", "published")
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const { data: questions, error: qErr } = await (supabase as any)
        .from("quiz_questions")
        .select("*")
        .eq("quiz_id", data.id)
        .order("ordre");
      if (qErr) throw qErr;
      return { ...data, questions: questions || [] };
    },
    enabled: !!moduleId,
  });
}

/**
 * Récupère le quiz de validation finale d'une formation (formation_id set, module_id NULL).
 */
export function useQuizByFormation(formationId: string | null) {
  return useQuery({
    queryKey: ["quiz", "by-formation", formationId],
    queryFn: async (): Promise<Quiz | null> => {
      if (!formationId) return null;
      const { data, error } = await (supabase as any)
        .from("quizzes")
        .select("*")
        .eq("formation_id", formationId)
        .is("module_id", null)
        .eq("status", "published")
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const { data: questions, error: qErr } = await (supabase as any)
        .from("quiz_questions")
        .select("*")
        .eq("quiz_id", data.id)
        .order("ordre");
      if (qErr) throw qErr;
      return { ...data, questions: questions || [] };
    },
    enabled: !!formationId,
  });
}

/**
 * Récupère le quiz attaché à un chapitre précis (chapitre_id set).
 * Utilisé par ChapterViewer pour afficher le quiz de bloc sous la vidéo.
 */
export function useQuizByChapitre(chapitreId: string | null) {
  return useQuery({
    queryKey: ["quiz", "by-chapitre", chapitreId],
    queryFn: async (): Promise<Quiz | null> => {
      if (!chapitreId) return null;
      const { data, error } = await (supabase as any)
        .from("quizzes")
        .select("*")
        .eq("chapitre_id", chapitreId)
        .eq("status", "published")
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const { data: questions, error: qErr } = await (supabase as any)
        .from("quiz_questions")
        .select("*")
        .eq("quiz_id", data.id)
        .order("ordre");
      if (qErr) throw qErr;
      return { ...data, questions: questions || [] };
    },
    enabled: !!chapitreId,
  });
}

/**
 * Liste les chapitres verrouillés pour un utilisateur dans une formation donnée.
 * Gate universelle : un chapitre est verrouillé s'il existe un quiz en amont
 * (attaché chapitre ou module) non validé par l'utilisateur, ET que l'utilisateur
 * n'a pas encore démarré ce chapitre (grandfathering).
 */
export interface LockedChapitre {
  chapitre_id: string;
  blocker_quiz_id: string;
  blocker_quiz_titre: string;
}

export function useLockedChapitres(formationId: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["training", "locked-chapitres", formationId, user?.id],
    enabled: !!formationId && !!user?.id,
    queryFn: async (): Promise<LockedChapitre[]> => {
      const { data, error } = await (supabase as any).rpc("get_locked_chapitres", {
        p_user_id: user!.id,
        p_formation_id: formationId!,
      });
      if (error) throw error;
      return (data ?? []) as LockedChapitre[];
    },
  });
}

export function useQuizWithQuestions(quizId: string | null) {
  return useQuery({
    queryKey: ["quiz", "detail", quizId],
    queryFn: async (): Promise<Quiz | null> => {
      if (!quizId) return null;
      const { data, error } = await (supabase as any)
        .from("quizzes")
        .select("*")
        .eq("id", quizId)
        .single();
      if (error) throw error;
      const { data: questions, error: qErr } = await (supabase as any)
        .from("quiz_questions")
        .select("*")
        .eq("quiz_id", quizId)
        .order("ordre");
      if (qErr) throw qErr;
      return { ...data, questions: questions || [] };
    },
    enabled: !!quizId,
  });
}

export function useLatestQuizAttempt(quizId: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["quiz-attempt", "latest", quizId, user?.id],
    queryFn: async (): Promise<QuizAttempt | null> => {
      if (!quizId || !user?.id) return null;
      const { data, error } = await (supabase as any)
        .from("quiz_attempts")
        .select("*")
        .eq("quiz_id", quizId)
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!quizId && !!user?.id,
  });
}

// ─── MUTATIONS ───

export function useCreateQuizAttempt() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      quiz_id: string;
      errors_count: number;
      total_questions: number;
      answers: { question_id: string; selected: number; correct: boolean }[];
      validated: boolean;
    }) => {
      if (!user?.id) throw new Error("Non connecté");
      const { data, error } = await (supabase as any)
        .from("quiz_attempts")
        .insert({ ...input, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["quiz-attempt", "latest", data.quiz_id] });
    },
  });
}

export function useCreateQuiz() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      module_id?: string | null;
      formation_id?: string | null;
      titre: string;
      description?: string;
      max_errors?: number;
    }) => {
      // CHECK constraint : module_id OU formation_id, pas les deux
      const moduleId = input.module_id || null;
      const formationId = input.formation_id || null;
      if (moduleId && formationId) {
        throw new Error("Un quiz ne peut pas être attaché à la fois à un module et à une formation");
      }
      const { data, error } = await (supabase as any)
        .from("quizzes")
        .insert({
          module_id: moduleId,
          formation_id: formationId,
          titre: input.titre,
          description: input.description || "",
          max_errors: input.max_errors ?? 3,
          status: "published",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quizzes"] }),
  });
}

export function useUpdateQuiz() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      // CHECK constraint : module_id OU formation_id, pas les deux.
      // Si les 2 sont fournis, on favorise module_id et on force formation_id à null.
      if ("module_id" in updates && "formation_id" in updates) {
        if (updates.module_id && updates.formation_id) {
          updates.formation_id = null;
        }
      }
      const { data, error } = await (supabase as any)
        .from("quizzes")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quizzes"] }),
  });
}

export function useDeleteQuiz() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("quizzes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quizzes"] }),
  });
}

export function useCreateQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      quiz_id: string;
      question: string;
      contexte?: string;
      options: string[];
      correct_index: number;
      explication?: string;
    }) => {
      const { data: maxOrdre } = await (supabase as any)
        .from("quiz_questions")
        .select("ordre")
        .eq("quiz_id", input.quiz_id)
        .order("ordre", { ascending: false })
        .limit(1)
        .single();
      const { data, error } = await (supabase as any)
        .from("quiz_questions")
        .insert({
          ...input,
          contexte: input.contexte || "",
          explication: input.explication || "",
          ordre: (maxOrdre?.ordre ?? -1) + 1,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["quiz", "detail", data.quiz_id] });
    },
  });
}

export function useUpdateQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; quiz_id: string; [key: string]: any }) => {
      const { data, error } = await (supabase as any)
        .from("quiz_questions")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["quiz", "detail", data.quiz_id] });
    },
  });
}

export function useDeleteQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, quiz_id }: { id: string; quiz_id: string }) => {
      const { error } = await (supabase as any).from("quiz_questions").delete().eq("id", id);
      if (error) throw error;
      return { quiz_id };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["quiz", "detail", data.quiz_id] });
    },
  });
}

export function useReorderQuestions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ quiz_id, question_ids }: { quiz_id: string; question_ids: string[] }) => {
      const { error } = await (supabase as any).rpc("reorder_quiz_questions", {
        p_quiz_id: quiz_id,
        p_question_ids: question_ids,
      });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["quiz", "detail", variables.quiz_id] });
    },
  });
}
