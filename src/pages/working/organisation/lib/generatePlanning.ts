import { ALL_DAYS, DayName, PREDEFINED_TASKS, TaskCategory } from "./predefinedTasks";

export interface CoachingSlot {
  id: string;
  day: DayName;
  h: number;
  m: number;
  dur: number;
  label: string;
  desc?: string;
}

export interface BlockedSlot {
  label?: string;
  days?: DayName[];
  day?: DayName;
  h: number;
  m?: number;
  dur: number;
}

export interface CustomTask {
  name: string;
  dur: number;
  freq?: "Quotidien" | "2-3x/semaine" | "1x/semaine";
  days?: DayName[];
  time?: string;
}

/**
 * Surcharge ponctuelle des horaires d'un jour spécifique.
 * Si un champ est absent, on retombe sur la valeur globale de Answers.
 */
export interface DayOverride {
  wake?: string;  // "06:30"
  sleep?: string; // "23:30"
  work?: {
    /** L'élève ne travaille PAS ce jour (même s'il est dans work_days globalement). */
    disabled?: boolean;
    /** L'élève travaille ce jour (même s'il n'est pas dans work_days globalement). */
    forced?: boolean;
    start?: string; // "09:00"
    end?: string;   // "17:00"
  };
  study?: {
    disabled?: boolean;
    forced?: boolean;
    start?: string;
    end?: string;
  };
}

export type DayOverrides = Partial<Record<DayName, DayOverride>>;

export interface PlanSlot {
  h: number;
  m: number;
  dur: number;
  label: string;
  cat: TaskCategory;
}

export type WeekPlan = Record<DayName, PlanSlot[]>;

export interface Answers {
  profile?: string;
  wake_week?: string;
  wake_weekend?: string;
  sleep_week?: string;
  sleep_weekend?: string;
  religious?: string;
  work_days?: string[];
  study_days?: string[];
  work_start?: string;
  work_end?: string;
  study_start?: string;
  study_end?: string;
  rest_day?: string;
  weekend_work?: string;
  has_job?: string;
  commute?: string;
  kids_school?: string;
  sport?: string;
  sport_duration?: string;
  coachings?: string[];
  selected_tasks?: Record<string, number>;
  custom_tasks?: CustomTask[];
  blocked_slots?: BlockedSlot[];
  /** Exceptions d'horaires pour certains jours. Optionnel et rétrocompatible. */
  day_overrides?: DayOverrides;
  [key: string]: any;
}

/* ────────────────────────────────────────────────────────────
 * Helpers pour lire les horaires d'un jour en tenant compte
 * des day_overrides éventuels. Une valeur surchargée pour un
 * jour prime toujours sur la valeur globale.
 * ──────────────────────────────────────────────────────────── */

function parseHour(s?: string | null, fallback = 0): number {
  if (!s) return fallback;
  const h = parseInt(String(s).split(":")[0]);
  return Number.isFinite(h) ? h : fallback;
}

export function resolveDayWake(day: DayName, a: Answers, fallbackWake = 7, fallbackWakeWE = 8): number {
  const ov = a.day_overrides?.[day]?.wake;
  if (ov) return parseHour(ov, fallbackWake);
  const isWE = day === "Samedi" || day === "Dimanche";
  return parseHour(isWE ? a.wake_weekend : a.wake_week, isWE ? fallbackWakeWE : fallbackWake);
}

export function resolveDaySleep(day: DayName, a: Answers, fallbackSleep = 23, fallbackSleepWE = 23): number {
  const ov = a.day_overrides?.[day]?.sleep;
  if (ov) return parseHour(ov, fallbackSleep);
  const isWE = day === "Samedi" || day === "Dimanche";
  const raw = parseHour(isWE ? a.sleep_weekend : a.sleep_week, isWE ? fallbackSleepWE : fallbackSleep);
  return raw || (isWE ? 24 : 23);
}

export function resolveDayWork(day: DayName, a: Answers): { start: number; end: number } | null {
  const ov = a.day_overrides?.[day]?.work;
  if (ov?.disabled) return null;
  const inWorkDays = (a.work_days || []).includes(day);
  const forced = ov?.forced === true;
  if (!inWorkDays && !forced) return null;
  const start = parseHour(ov?.start || a.work_start, 8);
  const end = parseHour(ov?.end || a.work_end, 17);
  return { start, end };
}

export function resolveDayStudy(day: DayName, a: Answers): { start: number; end: number } | null {
  const ov = a.day_overrides?.[day]?.study;
  if (ov?.disabled) return null;
  const inStudyDays = (a.study_days || []).includes(day);
  const forced = ov?.forced === true;
  if (!inStudyDays && !forced) return null;
  const start = parseHour(ov?.start || a.study_start, 8);
  const end = parseHour(ov?.end || a.study_end, 16);
  return { start, end };
}

export function generatePlanning(
  answers: Answers,
  pack: "al_baraka" | "liberty",
  coachings: CoachingSlot[]
): WeekPlan {
  const p = answers.profile || (pack === "liberty" ? "Entrepreneur" : "Autre");
  const wakeH = parseInt((answers.wake_week || "07:00").split(":")[0]);
  const wakeWeH = parseInt((answers.wake_weekend || "08:00").split(":")[0]);
  const sleepH = parseInt((answers.sleep_week || "23:00").split(":")[0]);
  const sleepWeH = parseInt((answers.sleep_weekend || "23:00").split(":")[0]) || 24;
  const hasPrayers = answers.religious === "Oui, 5 prières";
  const restDay = answers.rest_day || "Aucun";
  const selectedCoachingIds = answers.coachings || [];
  const selectedTasks = answers.selected_tasks || {};
  const customTasks = answers.custom_tasks || [];
  const blockedSlots = answers.blocked_slots || [];
  const hasJob = pack === "liberty" && answers.has_job && answers.has_job !== "Non";

  const prayerTimes = [
    { name: "Fajr", h: 5, m: 0, dur: 25 },
    { name: "Dhuhr", h: 12, m: 30, dur: 15 },
    { name: "Asr", h: 15, m: 30, dur: 15 },
    { name: "Maghrib", h: 18, m: 15, dur: 15 },
    { name: "Isha", h: 20, m: 0, dur: 20 },
  ];

  const hasTask = (id: string) => id in selectedTasks;
  const getTaskDur = (id: string) => {
    const v = selectedTasks[id];
    if (v && v > 0) return v;
    const def = PREDEFINED_TASKS.find((t) => t.id === id);
    return def ? def.defaultDur : 30;
  };
  const getTask = (id: string) => PREDEFINED_TASKS.find((t) => t.id === id);

  const days3x: DayName[] = ["Lundi", "Mercredi", "Vendredi"];
  const days2x: DayName[] = ["Mardi", "Jeudi", "Samedi"];

  function isBlocked(dayName: DayName, h: number, m: number, dur: number) {
    const s = h * 60 + m;
    const e = s + dur;
    return blockedSlots.some((b) => {
      const bDays = (b.days || (b.day ? [b.day] : [])) as DayName[];
      if (!bDays.includes(dayName)) return false;
      const bs = b.h * 60 + (b.m || 0);
      return s < bs + b.dur && e > bs;
    });
  }

  function nextFree(dayName: DayName, startH: number, dur: number, maxH: number) {
    for (let c = startH * 60; c + dur <= maxH * 60; c += 30) {
      const h = Math.floor(c / 60);
      const m = c % 60;
      if (!isBlocked(dayName, h, m, dur)) return { h, m };
    }
    return null;
  }

  function buildDay(dayName: DayName): PlanSlot[] {
    const slots: PlanSlot[] = [];
    // Horaires résolus avec day_overrides éventuels — prime sur les globaux
    const dWake = resolveDayWake(dayName, answers, wakeH, wakeWeH);
    const dSleep = resolveDaySleep(dayName, answers, sleepH, sleepWeH);
    const workHours = resolveDayWork(dayName, answers);
    const studyHours = resolveDayStudy(dayName, answers);
    const isWorkDay = workHours !== null;
    const isStudyDay = studyHours !== null;
    const isRestDay = restDay === dayName;
    const isWE = dayName === "Samedi" || dayName === "Dimanche";

    blockedSlots
      .filter((b) => (b.days || (b.day ? [b.day] : [])).includes(dayName))
      .forEach((b) =>
        slots.push({
          h: b.h,
          m: b.m || 0,
          dur: b.dur,
          label: `🔒 ${b.label || "Créneau bloqué"}`,
          cat: "blocked",
        })
      );

    slots.push({ h: dWake, m: 0, dur: 30, label: "Réveil + Routine", cat: "perso" });
    if (hasPrayers) {
      prayerTimes.forEach((pt) =>
        slots.push({ h: pt.h, m: pt.m, dur: pt.dur, label: pt.name, cat: "religion" })
      );
    }

    if (isRestDay) {
      slots.push(
        { h: 10, m: 0, dur: 120, label: "Temps libre / Famille", cat: "repos" },
        { h: 12, m: 30, dur: 60, label: "Déjeuner", cat: "perso" },
        { h: 14, m: 0, dur: 180, label: "Repos / Loisirs", cat: "repos" },
        { h: 19, m: 0, dur: 60, label: "Dîner", cat: "perso" },
        { h: dSleep, m: 0, dur: 30, label: "Coucher", cat: "perso" }
      );
      selectedCoachingIds.forEach((cId) => {
        const c = coachings.find((x) => x.id === cId);
        if (c && c.day === dayName)
          slots.push({ h: c.h, m: c.m, dur: c.dur, label: c.label, cat: "coaching" });
      });
      return slots.sort((a, b) => a.h * 60 + a.m - (b.h * 60 + b.m));
    }

    selectedCoachingIds.forEach((cId) => {
      const c = coachings.find((x) => x.id === cId);
      if (c && c.day === dayName) {
        if (hasTask("task_prep_coaching")) {
          const pH = c.m >= 20 ? c.h : c.h - 1;
          slots.push({
            h: pH,
            m: c.m >= 20 ? c.m - 20 : 60 + c.m - 20,
            dur: 20,
            label: "📝 Prépa coaching",
            cat: "coaching",
          });
        }
        slots.push({ h: c.h, m: c.m, dur: c.dur, label: c.label, cat: "coaching" });
        if (hasTask("task_post_coaching")) {
          const eM = c.h * 60 + c.m + c.dur;
          slots.push({
            h: Math.floor(eM / 60),
            m: eM % 60,
            dur: 30,
            label: "🚀 Post-coaching",
            cat: "formation",
          });
        }
      }
    });

    if (((p === "Salarié(e)") || hasJob) && isWorkDay && workHours) {
      const leaveH = workHours.start - 1;
      if (dWake + 1 < leaveH) {
        const sl = nextFree(dayName, dWake + 1, 60, leaveH);
        if (sl) slots.push({ h: sl.h, m: sl.m, dur: 60, label: "🔥 Session matin", cat: "business" });
      }
      slots.push({
        h: workHours.start,
        m: 0,
        dur: (workHours.end - workHours.start) * 60,
        label: "💼 Emploi",
        cat: "emploi",
      });
      slots.push({ h: workHours.end + 1, m: 0, dur: 30, label: "Décompression", cat: "perso" });
    } else if (p === "Étudiant(e)" && isStudyDay && studyHours) {
      slots.push({
        h: studyHours.start,
        m: 0,
        dur: (studyHours.end - studyHours.start) * 60,
        label: "📕 Cours",
        cat: "emploi",
      });
    } else if (p === "Mère/Père au foyer" && answers.kids_school !== "Non, à la maison") {
      slots.push(
        { h: 8, m: 30, dur: 30, label: "Dépôt enfants", cat: "perso" },
        { h: 16, m: 30, dur: 30, label: "Récup enfants", cat: "perso" }
      );
    }

    let bizStartH: number;
    if (((p === "Salarié(e)") || hasJob) && isWorkDay && workHours) bizStartH = workHours.end + 2;
    else if (p === "Étudiant(e)" && isStudyDay && studyHours) bizStartH = studyHours.end + 1;
    else bizStartH = dWake + 1;

    let cursor = bizStartH * 60;

    const taskOrder =
      pack === "liberty"
        ? [
            "task_planif", "task_strategie", "task_formation_video", "task_creation_contenu",
            "task_tournage", "task_montage", "task_sourcing_videos", "task_sourcing_infopreneur",
            "task_setting_dm", "task_setting_tel", "task_closing", "task_pub", "task_tunnel",
            "task_email_seq", "task_engagement", "task_veille", "task_sav", "task_management",
            "task_comptabilite", "task_notes", "task_technique", "task_bilan",
          ]
        : [
            "task_planif", "task_formation_video", "task_creation_contenu", "task_tournage",
            "task_montage", "task_sourcing_videos", "task_sourcing_infopreneur", "task_setting_dm",
            "task_setting_tel", "task_closing", "task_engagement", "task_veille", "task_sav",
            "task_notes", "task_technique", "task_bilan",
          ];

    taskOrder.forEach((tid) => {
      if (!hasTask(tid)) return;
      const def = getTask(tid);
      if (!def) return;
      const dur = getTaskDur(tid);
      let shouldPlace = false;
      if (def.defaultFreq === "quotidien") shouldPlace = true;
      else if (def.defaultFreq === "3x/semaine") shouldPlace = days3x.includes(dayName);
      else if (def.defaultFreq === "2-3x/semaine") shouldPlace = days2x.includes(dayName);
      else if (def.defaultFreq === "1x/semaine")
        shouldPlace = dayName === "Dimanche" || dayName === "Lundi";
      if (!shouldPlace) return;
      const sl = nextFree(dayName, Math.floor(cursor / 60), dur, dSleep - 1);
      if (!sl || sl.h * 60 + sl.m + dur > dSleep * 60 - 60) return;
      slots.push({ h: sl.h, m: sl.m, dur, label: def.label, cat: def.cat });
      cursor = sl.h * 60 + sl.m + dur;
    });

    customTasks.forEach((ct) => {
      if (!ct.name || !ct.dur) return;
      const ctDays =
        ct.days && ct.days.length > 0
          ? ct.days
          : ct.freq === "Quotidien"
          ? [...ALL_DAYS]
          : ct.freq === "2-3x/semaine"
          ? days3x
          : (["Lundi"] as DayName[]);
      if (!ctDays.includes(dayName)) return;
      if (ct.time) {
        const [th, tm] = ct.time.split(":").map(Number);
        slots.push({ h: th, m: tm || 0, dur: ct.dur, label: `🔹 ${ct.name}`, cat: "custom" });
      } else {
        const sl = nextFree(dayName, Math.floor(cursor / 60), ct.dur, dSleep - 1);
        if (sl) {
          slots.push({ h: sl.h, m: sl.m, dur: ct.dur, label: `🔹 ${ct.name}`, cat: "custom" });
          cursor = sl.h * 60 + sl.m + ct.dur;
        }
      }
    });

    if (answers.sport && answers.sport !== "Non") {
      const sDays: DayName[] =
        answers.sport === "Tous les jours"
          ? [...ALL_DAYS]
          : answers.sport === "3-4x/sem"
          ? ["Lundi", "Mercredi", "Vendredi", "Dimanche"]
          : ["Mardi", "Jeudi"];
      if (sDays.includes(dayName)) {
        const sDur =
          answers.sport_duration === "30 min"
            ? 30
            : answers.sport_duration === "1h"
            ? 60
            : 90;
        const sl = nextFree(dayName, 18, sDur, dSleep);
        if (sl) slots.push({ h: sl.h, m: sl.m, dur: sDur, label: "🏋️ Sport", cat: "sport" });
      }
    }

    slots.push(
      { h: 12, m: 30, dur: 45, label: "Déjeuner", cat: "perso" },
      { h: 19, m: 30, dur: 60, label: "Dîner + Temps libre", cat: "perso" },
      { h: dSleep, m: 0, dur: 30, label: "Coucher", cat: "perso" }
    );
    return slots.sort((a, b) => a.h * 60 + a.m - (b.h * 60 + b.m));
  }

  const week: WeekPlan = {} as WeekPlan;
  ALL_DAYS.forEach((d) => {
    week[d] = buildDay(d);
  });
  return week;
}
