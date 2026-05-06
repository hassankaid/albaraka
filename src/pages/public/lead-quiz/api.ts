import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/client";
import type { AnswersMap, ProfileKey, QuizConfig, QuizOwner, Scores } from "./types";

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/submit-quiz-lead`;

async function callFn<T = unknown>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // L'edge function a verify_jwt=false, mais certains proxies exigent quand même
      // une apikey pour router la requête : on passe la publishable key (anon).
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
    const message = data?.message ?? data?.error ?? `HTTP ${res.status}`;
    throw new Error(String(message));
  }
  return data as T;
}

export async function resolveQuiz(slug: string): Promise<{ owner: QuizOwner; config: QuizConfig }> {
  return callFn({ action: "resolve", slug });
}

export async function pingView(slug: string): Promise<void> {
  try {
    await callFn({ action: "view", slug });
  } catch {
    // silencieux, on ne bloque pas le chargement pour un ping
  }
}

export async function submitEmailCapture(params: {
  slug: string;
  first_name: string;
  last_name: string;
  email: string;
  /** Phone facultatif côté API (rétrocompat). Le nouveau flow l'envoie
   *  systématiquement et l'edge function créera le lead CRM directement. */
  phone?: string | null;
  referrer?: string | null;
}): Promise<{ submission_id: string; lead_id?: string; contact_id?: string }> {
  return callFn({ action: "email_captured", ...params });
}

export async function submitQuizProgress(params: {
  submission_id: string;
  answers?: AnswersMap;
  last_question_reached?: string;
}): Promise<void> {
  await callFn({ action: "quiz_progress", ...params });
}

export async function submitQuizCompleted(params: {
  submission_id: string;
  profile: ProfileKey;
  scores: Scores;
  orientation_choice: ProfileKey;
  answers?: AnswersMap;
}): Promise<void> {
  await callFn({ action: "quiz_completed", ...params });
}

export async function submitPhoneCapture(params: {
  submission_id: string;
  phone: string;
}): Promise<{ lead_id: string; contact_id: string }> {
  return callFn({ action: "phone_captured", ...params });
}

export async function submitWhatsAppClicked(submission_id: string): Promise<void> {
  try {
    await callFn({ action: "whatsapp_clicked", submission_id });
  } catch {
    // silencieux, on ne veut pas bloquer l'utilisateur qui clique
  }
}
