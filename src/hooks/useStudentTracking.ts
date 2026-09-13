import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// ─── Types ───────────────────────────────────────────────────

export interface StudentSummary {
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
  enrollments_count: number;
  formations: { id: string; slug: string; titre: string }[];
  total_chapters_done: number;
  total_chapters: number;
  global_progress_pct: number;
  quiz_attempted_count: number;
  quiz_validated_count: number;
  last_activity_at: string | null;
}

export interface StudentDetailFormation {
  id: string;
  slug: string;
  titre: string;
  couleur: string | null;
  enrollment_id: string;
  enrollment: {
    granted_at: string;
    granted_by: string | null;
    source: string | null;
    notes: string | null;
  };
  chapters_done: number;
  chapters_total: number;
  progress_pct: number;
  last_chapter_at: string | null;
}

export interface StudentDetailQuizAttempt {
  id: string;
  errors_count: number;
  total_questions: number;
  validated: boolean;
  completed_at: string;
  answers: any;
}

export interface StudentDetailQuiz {
  quiz_id: string;
  titre: string;
  max_errors: number;
  attempts: StudentDetailQuizAttempt[];
  latest: StudentDetailQuizAttempt | null;
  best_errors: number | null;
  total_attempts: number;
}

export interface StudentDetail {
  profile: {
    id: string;
    email: string;
    full_name: string | null;
    role: string;
    created_at: string | null;
  };
  formations: StudentDetailFormation[];
  quizzes: StudentDetailQuiz[];
  last_activity_at: string | null;
}

// ─── Lecture paginée ─────────────────────────────────────────

const PAGE = 1000;

/** Lit toutes les lignes d'une requête, page par page (plafond client : 1 000). */
async function chargerTout(page: (de: number, a: number) => any): Promise<any[]> {
  const lignes: any[] = [];
  for (let de = 0; ; de += PAGE) {
    const { data, error } = await page(de, de + PAGE - 1);
    if (error) throw error;
    lignes.push(...(data || []));
    if (!data || data.length < PAGE) return lignes;
  }
}

function grouperParUser(lignes: any[], garder: Set<string>): Map<string, any[]> {
  const parUser = new Map<string, any[]>();
  for (const l of lignes) {
    if (!garder.has(l.user_id)) continue;
    if (!parUser.has(l.user_id)) parUser.set(l.user_id, []);
    parUser.get(l.user_id)!.push(l);
  }
  return parUser;
}

// ─── List of all students with aggregates ──────────────────

export function useStudentsList() {
  return useQuery({
    queryKey: ["student-tracking", "list"],
    queryFn: async (): Promise<StudentSummary[]> => {
      // Toutes les lectures sont paginées : le client Supabase plafonne à
      // 1 000 lignes par requête. Sans pagination, la page ne lisait que
      // 1 000 des ~5 800 lignes de progression (septembre 2026) : avancement,
      // dernière activité et statut Actif/Inactif étaient faux pour la
      // plupart des élèves, sans aucune erreur visible.
      //
      // Les filtres par liste d'identifiants (`.in("user_id", [...])`) sont
      // évités pour la même raison d'échelle : 340 identifiants dans l'URL
      // approchent la limite de longueur des requêtes. On lit tout, puis on
      // filtre en mémoire.

      // 1. Active enrollments
      const enrollmentsList = await chargerTout((de, a) =>
        (supabase as any)
          .from("formation_enrollments")
          .select("id, user_id, formation_id, formations(id, slug, titre)")
          .is("revoked_at", null)
          .order("id", { ascending: true })
          .range(de, a),
      );
      if (enrollmentsList.length === 0) return [];

      const userIds = Array.from(new Set(enrollmentsList.map((e: any) => e.user_id))) as string[];
      const userIdSet = new Set(userIds);
      const formationIds = Array.from(new Set(enrollmentsList.map((e: any) => e.formation_id)));

      // 2. Profiles
      const profiles = (await chargerTout((de, a) =>
        (supabase as any)
          .from("profiles")
          .select("id, email, full_name, role")
          .order("id", { ascending: true })
          .range(de, a),
      )).filter((p: any) => userIdSet.has(p.id));

      // 3. Total chapters per formation
      const { data: allChapters, error: cErr } = await (supabase as any)
        .from("formation_chapitres")
        .select("id, status, formation_modules!inner(formation_id, status)")
        .in("formation_modules.formation_id", formationIds);
      if (cErr) throw cErr;

      const publishedChapters = (allChapters || []).filter(
        (c: any) =>
          c.status === "published" && c.formation_modules?.status === "published"
      );

      // Build chapter→formation map and total per formation
      const totalByFormation = new Map<string, number>();
      const chapterIdsByFormation = new Map<string, Set<string>>();
      publishedChapters.forEach((c: any) => {
        const fId = c.formation_modules.formation_id;
        totalByFormation.set(fId, (totalByFormation.get(fId) || 0) + 1);
        if (!chapterIdsByFormation.has(fId)) chapterIdsByFormation.set(fId, new Set());
        chapterIdsByFormation.get(fId)!.add(c.id);
      });

      // 4. Chapter progress (all rows, grouped by user)
      const progress = await chargerTout((de, a) =>
        (supabase as any)
          .from("chapitre_progress")
          .select("id, user_id, chapitre_id, completed_at")
          .order("id", { ascending: true })
          .range(de, a),
      );
      const progressByUser = grouperParUser(progress, userIdSet);

      // 5. Quiz attempts (most recent first per user)
      const attempts = await chargerTout((de, a) =>
        (supabase as any)
          .from("quiz_attempts")
          .select("id, user_id, quiz_id, validated, completed_at")
          .order("id", { ascending: true })
          .range(de, a),
      );
      const attemptsByUser = grouperParUser(attempts, userIdSet);
      attemptsByUser.forEach((liste) =>
        liste.sort((x: any, y: any) => String(y.completed_at).localeCompare(String(x.completed_at))),
      );
      const enrollmentsByUser = grouperParUser(enrollmentsList, userIdSet);

      // ─── Aggregate per user ──────
      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      const result: StudentSummary[] = userIds.map((uid: string) => {
        const userEnrolls = enrollmentsByUser.get(uid) || [];
        const formations = userEnrolls
          .map((e: any) => e.formations)
          .filter(Boolean)
          .map((f: any) => ({ id: f.id, slug: f.slug, titre: f.titre }));

        // Total chapters across enrolled formations
        let totalChapters = 0;
        const enrolledChapterIds = new Set<string>();
        userEnrolls.forEach((e: any) => {
          totalChapters += totalByFormation.get(e.formation_id) || 0;
          const ids = chapterIdsByFormation.get(e.formation_id);
          if (ids) ids.forEach((id) => enrolledChapterIds.add(id));
        });

        // Chapters done by user (only counting those in enrolled formations)
        const userProgress = (progressByUser.get(uid) || []).filter(
          (p: any) => enrolledChapterIds.has(p.chapitre_id)
        );
        const chaptersDone = userProgress.length;

        // Quiz stats - latest attempt per quiz
        const userAttempts = attemptsByUser.get(uid) || [];
        const latestPerQuiz = new Map<string, any>();
        userAttempts.forEach((a: any) => {
          if (!latestPerQuiz.has(a.quiz_id)) {
            latestPerQuiz.set(a.quiz_id, a);
          }
        });
        const quizAttemptedCount = latestPerQuiz.size;
        const quizValidatedCount = Array.from(latestPerQuiz.values()).filter(
          (a: any) => a.validated
        ).length;

        // Last activity
        const lastChapterAt = userProgress.reduce(
          (max: string | null, p: any) =>
            !max || p.completed_at > max ? p.completed_at : max,
          null as string | null
        );
        const lastQuizAt = userAttempts.reduce(
          (max: string | null, a: any) =>
            !max || a.completed_at > max ? a.completed_at : max,
          null as string | null
        );
        const lastActivity =
          !lastChapterAt && !lastQuizAt
            ? null
            : !lastChapterAt
            ? lastQuizAt
            : !lastQuizAt
            ? lastChapterAt
            : lastChapterAt > lastQuizAt
            ? lastChapterAt
            : lastQuizAt;

        const profile: any = profileMap.get(uid) || {};

        return {
          user_id: uid,
          email: profile.email || "",
          full_name: profile.full_name || null,
          role: profile.role || "",
          enrollments_count: userEnrolls.length,
          formations,
          total_chapters_done: chaptersDone,
          total_chapters: totalChapters,
          global_progress_pct:
            totalChapters > 0 ? Math.round((chaptersDone / totalChapters) * 100) : 0,
          quiz_attempted_count: quizAttemptedCount,
          quiz_validated_count: quizValidatedCount,
          last_activity_at: lastActivity,
        };
      });

      // Sort by last activity desc
      return result.sort((a, b) => {
        if (!a.last_activity_at && !b.last_activity_at) return 0;
        if (!a.last_activity_at) return 1;
        if (!b.last_activity_at) return -1;
        return b.last_activity_at.localeCompare(a.last_activity_at);
      });
    },
  });
}

// ─── Student detail ─────────────────────────────────────────

export function useStudentDetail(userId: string | null) {
  return useQuery({
    queryKey: ["student-tracking", "detail", userId],
    queryFn: async (): Promise<StudentDetail | null> => {
      if (!userId) return null;

      // 1. Profile
      const { data: profile, error: pErr } = await (supabase as any)
        .from("profiles")
        .select("id, email, full_name, role, created_at")
        .eq("id", userId)
        .single();
      if (pErr) throw pErr;

      // 2. Active enrollments + formations
      const { data: enrollments, error: eErr } = await (supabase as any)
        .from("formation_enrollments")
        .select("id, granted_at, granted_by, source, notes, formation_id, formations(id, slug, titre, couleur)")
        .eq("user_id", userId)
        .is("revoked_at", null);
      if (eErr) throw eErr;

      const formationIds = (enrollments || []).map((e: any) => e.formation_id);

      // 3. All published chapters of those formations
      let publishedChapters: any[] = [];
      if (formationIds.length > 0) {
        const { data: chapters, error: cErr } = await (supabase as any)
          .from("formation_chapitres")
          .select("id, status, formation_modules!inner(formation_id, status)")
          .in("formation_modules.formation_id", formationIds);
        if (cErr) throw cErr;
        publishedChapters = (chapters || []).filter(
          (c: any) =>
            c.status === "published" && c.formation_modules?.status === "published"
        );
      }

      // 4. User's progress on these chapters
      const allChapterIds = publishedChapters.map((c: any) => c.id);
      let userProgress: any[] = [];
      if (allChapterIds.length > 0) {
        const { data: progress, error: prErr } = await (supabase as any)
          .from("chapitre_progress")
          .select("chapitre_id, completed_at")
          .eq("user_id", userId)
          .in("chapitre_id", allChapterIds);
        if (prErr) throw prErr;
        userProgress = progress || [];
      }

      // 5. Quiz attempts
      const { data: attempts, error: qErr } = await (supabase as any)
        .from("quiz_attempts")
        .select("id, quiz_id, errors_count, total_questions, validated, completed_at, answers")
        .eq("user_id", userId)
        .order("completed_at", { ascending: false });
      if (qErr) throw qErr;

      // 6. Quiz titles
      const quizIds = Array.from(
        new Set((attempts || []).map((a: any) => a.quiz_id))
      );
      let quizzesData: any[] = [];
      if (quizIds.length > 0) {
        const { data: qz, error: qzErr } = await (supabase as any)
          .from("quizzes")
          .select("id, titre, max_errors")
          .in("id", quizIds);
        if (qzErr) throw qzErr;
        quizzesData = qz || [];
      }

      // ─── Build formations array ──────
      const formations: StudentDetailFormation[] = (enrollments || []).map((e: any) => {
        const f = e.formations;
        const fChapters = publishedChapters.filter(
          (c: any) => c.formation_modules.formation_id === e.formation_id
        );
        const fChapterIds = new Set(fChapters.map((c: any) => c.id));
        const fProgress = userProgress.filter((p: any) => fChapterIds.has(p.chapitre_id));
        const lastChapter = fProgress.reduce(
          (max: string | null, p: any) =>
            !max || p.completed_at > max ? p.completed_at : max,
          null as string | null
        );

        return {
          id: f?.id || e.formation_id,
          slug: f?.slug || "",
          titre: f?.titre || "Formation",
          couleur: f?.couleur || null,
          enrollment_id: e.id,
          enrollment: {
            granted_at: e.granted_at,
            granted_by: e.granted_by,
            source: e.source,
            notes: e.notes,
          },
          chapters_done: fProgress.length,
          chapters_total: fChapters.length,
          progress_pct:
            fChapters.length > 0
              ? Math.round((fProgress.length / fChapters.length) * 100)
              : 0,
          last_chapter_at: lastChapter,
        };
      });

      // ─── Build quizzes array ────────
      const quizMap = new Map(quizzesData.map((q: any) => [q.id, q]));
      const attemptsByQuiz = new Map<string, any[]>();
      (attempts || []).forEach((a: any) => {
        if (!attemptsByQuiz.has(a.quiz_id)) attemptsByQuiz.set(a.quiz_id, []);
        attemptsByQuiz.get(a.quiz_id)!.push(a);
      });

      const quizzes: StudentDetailQuiz[] = quizIds.map((qid: string) => {
        const q: any = quizMap.get(qid) || { titre: "Quiz", max_errors: 3 };
        const qAttempts = (attemptsByQuiz.get(qid) || []) as StudentDetailQuizAttempt[];
        const sorted = [...qAttempts].sort((a, b) =>
          b.completed_at.localeCompare(a.completed_at)
        );
        const latest = sorted[0] || null;
        const bestErrors =
          qAttempts.length > 0
            ? Math.min(...qAttempts.map((a: any) => a.errors_count))
            : null;

        return {
          quiz_id: qid,
          titre: q.titre,
          max_errors: q.max_errors,
          attempts: sorted,
          latest,
          best_errors: bestErrors,
          total_attempts: qAttempts.length,
        };
      });

      // Last activity
      const lastChapter = userProgress.reduce(
        (max: string | null, p: any) =>
          !max || p.completed_at > max ? p.completed_at : max,
        null as string | null
      );
      const lastQuiz = (attempts || []).reduce(
        (max: string | null, a: any) =>
          !max || a.completed_at > max ? a.completed_at : max,
        null as string | null
      );
      const lastActivity =
        !lastChapter && !lastQuiz
          ? null
          : !lastChapter
          ? lastQuiz
          : !lastQuiz
          ? lastChapter
          : lastChapter > lastQuiz
          ? lastChapter
          : lastQuiz;

      return {
        profile,
        formations,
        quizzes,
        last_activity_at: lastActivity,
      };
    },
    enabled: !!userId,
  });
}

// ─── Available formations not yet enrolled for a user ──────

export function useAvailableFormationsForUser(userId: string | null, currentFormationIds: string[]) {
  return useQuery({
    queryKey: ["student-tracking", "available-formations", userId, currentFormationIds],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await (supabase as any)
        .from("formations")
        .select("id, slug, titre, couleur, status")
        .eq("status", "published")
        .order("titre");
      if (error) throw error;
      return (data || []).filter((f: any) => !currentFormationIds.includes(f.id));
    },
    enabled: !!userId,
  });
}

// ─── Mutations: grant / revoke enrollment ──────────────────

export function useGrantEnrollment() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { user_id: string; formation_id: string; notes?: string }) => {
      const { data, error } = await (supabase as any)
        .from("formation_enrollments")
        .insert({
          user_id: input.user_id,
          formation_id: input.formation_id,
          granted_by: user?.id,
          source: "manual",
          notes: input.notes || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["student-tracking", "list"] });
      qc.invalidateQueries({ queryKey: ["student-tracking", "detail", variables.user_id] });
      qc.invalidateQueries({ queryKey: ["student-tracking", "available-formations", variables.user_id] });
    },
  });
}

export function useRevokeEnrollment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { enrollment_id: string; user_id: string }) => {
      const { data, error } = await (supabase as any)
        .from("formation_enrollments")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", input.enrollment_id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["student-tracking", "list"] });
      qc.invalidateQueries({ queryKey: ["student-tracking", "detail", variables.user_id] });
      qc.invalidateQueries({ queryKey: ["student-tracking", "available-formations", variables.user_id] });
    },
  });
}
