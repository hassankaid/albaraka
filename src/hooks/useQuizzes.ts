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
  titre: string;
  description: string;
  max_errors: number;
  status: string;
  questions?: QuizQuestion[];
}

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
    mutationFn: async (input: { module_id?: string | null; titre: string; description?: string; max_errors?: number }) => {
      const { data, error } = await (supabase as any)
        .from("quizzes")
        .insert({
          module_id: input.module_id || null,
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
