import { ALL_DAYS, DayName, TaskCategory, tachesDuParcours } from "./predefinedTasks";

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

/** Une tâche du parcours : sa durée, et ses jours préférés (aucun : répartie dans le temps déclaré). */
export interface TacheChoisie {
  dur: number;
  days: DayName[];
}
export type TachesChoisies = Record<string, TacheChoisie>;

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
  parcours?: string;
  taches_parcours?: TachesChoisies;
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

/** « 06:30 » → 390 : les horaires se comptent en minutes depuis minuit. */
function parseMinutes(s: string | null | undefined, fallback: number): number {
  const [h, m] = String(s ?? "").split(":").map(Number);
  return Number.isFinite(h) && s ? h * 60 + (Number.isFinite(m) ? m : 0) : fallback;
}

const estWeekEnd = (day: DayName) => day === "Samedi" || day === "Dimanche";

export function resolveDayWake(day: DayName, a: Answers): number {
  const fallback = estWeekEnd(day) ? 8 * 60 : 7 * 60;
  return parseMinutes(a.day_overrides?.[day]?.wake || (estWeekEnd(day) ? a.wake_weekend : a.wake_week), fallback);
}

/** Le coucher, après minuit si besoin : 00:30 → 1470, pour rester le dernier bloc de la journée. */
export function resolveDaySleep(day: DayName, a: Answers): number {
  const coucher = parseMinutes(a.day_overrides?.[day]?.sleep || (estWeekEnd(day) ? a.sleep_weekend : a.sleep_week), 23 * 60);
  return coucher <= resolveDayWake(day, a) ? coucher + 24 * 60 : coucher;
}

export function resolveDayWork(day: DayName, a: Answers): { start: number; end: number } | null {
  const ov = a.day_overrides?.[day]?.work;
  if (ov?.disabled) return null;
  const inWorkDays = (a.work_days || []).includes(day);
  const forced = ov?.forced === true;
  if (!inWorkDays && !forced) return null;
  return { start: parseMinutes(ov?.start || a.work_start, 8 * 60), end: parseMinutes(ov?.end || a.work_end, 17 * 60) };
}

export function resolveDayStudy(day: DayName, a: Answers): { start: number; end: number } | null {
  const ov = a.day_overrides?.[day]?.study;
  if (ov?.disabled) return null;
  const inStudyDays = (a.study_days || []).includes(day);
  const forced = ov?.forced === true;
  if (!inStudyDays && !forced) return null;
  return { start: parseMinutes(ov?.start || a.study_start, 8 * 60), end: parseMinutes(ov?.end || a.study_end, 16 * 60) };
}

/** Les tâches du parcours cochées d'office, en gardant ce que l'élève avait déjà réglé. */
export function tachesParDefaut(pack: "al_baraka" | "liberty", parcours?: string, existant?: TachesChoisies): TachesChoisies {
  const r: TachesChoisies = {};
  for (const t of tachesDuParcours(pack, parcours)) r[t.id] = existant?.[t.id] ?? { dur: t.dureeDefaut, days: [] };
  return r;
}

/** Un planning créé avant la refonte : ses tâches sont les anciennes. */
export const estPlanningAncien = (a: Answers) => !a.taches_parcours;

/** « 1h30 » → 90, « 5h+ » → 300 ; sans réponse, pas de plafond. */
function minutesDeclarees(v?: string): number {
  const m = /^(\d+)h(\d+)?/.exec(v ?? "");
  return m ? Number(m[1]) * 60 + Number(m[2] ?? 0) : Infinity;
}

const DEBUT_PIC: Record<string, number> = {
  "Tôt le matin (5h-8h)": 5,
  "Matinée (8h-12h)": 8,
  "Après-midi (13h-17h)": 13,
  "Soirée (18h-21h)": 18,
  "Nuit (21h+)": 21,
};

const JOURS_INDISPONIBLES: Record<string, DayName[]> = {
  Non: ["Samedi", "Dimanche"],
  Samedi: ["Dimanche"],
  Dimanche: ["Samedi"],
};

/**
 * Calcule la semaine type. Aucune IA, aucun rythme imposé : les tâches sont placées dans le
 * temps déclaré par l'élève, sur ses jours, et jamais sur un autre bloc. Seuls les prières et
 * le déjeuner peuvent tomber pendant le travail ou les cours, comme dans la vraie vie, et les
 * prières pendant un coaching : l'élève peut y aller (Sidali, 01/11/2026).
 */
export function generatePlanning(
  answers: Answers,
  pack: "al_baraka" | "liberty",
  coachings: CoachingSlot[]
): WeekPlan {
  const p = answers.profile || "Autre";
  const hasPrayers = answers.religious === "Oui, 5 prières";
  const restDay = answers.rest_day || "Aucun";
  const customTasks = answers.custom_tasks || [];
  const blockedSlots = answers.blocked_slots || [];
  const hasJob = !!answers.has_job && answers.has_job !== "Non";
  const budgetJour = minutesDeclarees(answers.daily_hours);
  const choix = answers.taches_parcours ?? tachesParDefaut(pack, answers.parcours);
  const taches = tachesDuParcours(pack, answers.parcours).filter((t) => choix[t.id]);
  const absents = JOURS_INDISPONIBLES[answers.weekend_work ?? ""] ?? [];

  const prayerTimes = [
    { name: "Fajr", h: 5, m: 0, dur: 25 },
    { name: "Dhuhr", h: 12, m: 30, dur: 15 },
    { name: "Asr", h: 15, m: 30, dur: 15 },
    { name: "Maghrib", h: 18, m: 15, dur: 15 },
    { name: "Isha", h: 20, m: 0, dur: 20 },
  ];

  function buildDay(dayName: DayName, indexJour: number): PlanSlot[] {
    const slots: PlanSlot[] = [];
    const occupes: { d: number; f: number }[] = [];
    const journeeDehors: { d: number; f: number }[] = [];

    const dWake = resolveDayWake(dayName, answers);
    const dSleep = resolveDaySleep(dayName, answers);
    const finJournee = Math.min(dSleep, 24 * 60);
    const workHours = (p === "Salarié(e)" || hasJob) ? resolveDayWork(dayName, answers) : null;
    const studyHours = p === "Étudiant(e)" ? resolveDayStudy(dayName, answers) : null;
    const isRestDay = restDay === dayName;

    const chevauche = (zones: { d: number; f: number }[], d: number, f: number) => zones.some((z) => d < z.f && f > z.d);
    const libre = (d: number, dur: number, dehorsPermis = false) =>
      !chevauche(occupes, d, d + dur) && (dehorsPermis || !chevauche(journeeDehors, d, d + dur));
    const poser = (d: number, dur: number, label: string, cat: TaskCategory) => {
      slots.push({ h: Math.floor(d / 60), m: d % 60, dur, label, cat });
      occupes.push({ d, f: d + dur });
    };
    /** Le premier créneau libre à partir de `debut`, à la demi-heure. */
    const chercher = (debut: number, dur: number, fin = finJournee) => {
      for (let c = Math.ceil(debut / 30) * 30; c + dur <= fin; c += 30) if (libre(c, dur)) return c;
      return null;
    };
    /** Le créneau libre le plus proche de l'heure habituelle (repas, temps libre). */
    const presDe = (pref: number, dur: number, dehorsPermis = false) => {
      for (let ecart = 0; ecart <= 180; ecart += 15) {
        for (const c of [pref + ecart, pref - ecart]) {
          if (c >= dWake && c + dur <= finJournee && libre(c, dur, dehorsPermis)) return c;
        }
      }
      return null;
    };
    const poserPres = (pref: number, dur: number, label: string, cat: TaskCategory, dehorsPermis = false) => {
      const c = presDe(pref, dur, dehorsPermis);
      if (c !== null) poser(c, dur, label, cat);
    };

    // 1. Ce qui ne bouge pas : créneaux bloqués, coachings, travail ou cours, enfants
    blockedSlots
      .filter((b) => (b.days || (b.day ? [b.day] : [])).includes(dayName))
      .forEach((b) => poser(b.h * 60 + (b.m || 0), b.dur, `🔒 ${b.label || "Créneau bloqué"}`, "blocked"));

    const coachingsDuJour = coachings.filter((c) => c.day === dayName);
    const zonesCoaching = new Set<{ d: number; f: number }>();
    coachingsDuJour.forEach((c) => {
      poser(c.h * 60 + c.m, c.dur, c.label, "coaching");
      zonesCoaching.add(occupes[occupes.length - 1]);
    });

    if (!isRestDay) {
      const journee = workHours ?? studyHours;
      if (journee) {
        slots.push({
          h: Math.floor(journee.start / 60),
          m: journee.start % 60,
          dur: journee.end - journee.start,
          label: workHours ? "💼 Emploi" : "📕 Cours",
          cat: "emploi",
        });
        journeeDehors.push({ d: journee.start, f: journee.end });
      }
      if (p === "Mère/Père au foyer" && answers.kids_school !== "Non, à la maison") {
        poserPres(8 * 60 + 30, 30, "Dépôt enfants", "perso");
        poserPres(16 * 60 + 30, 30, "Récup enfants", "perso");
      }
    }

    // 2. Réveil, coucher, prières (une prière qui tombe sur un coaching reste à son heure)
    if (libre(dWake, 30, true)) poser(dWake, 30, "Réveil + Routine", "perso");
    occupes.push({ d: finJournee, f: dSleep + 30 });
    slots.push({ h: Math.floor(dSleep / 60), m: dSleep % 60, dur: 30, label: "Coucher", cat: "perso" });
    if (hasPrayers) {
      prayerTimes.forEach((pt) => {
        let d = pt.h * 60 + pt.m;
        const blocSur = () => occupes.find((z) => !zonesCoaching.has(z) && d < z.f && d + pt.dur > z.d);
        for (let bloc = blocSur(); bloc; bloc = blocSur()) d = bloc.f;
        poser(d, pt.dur, pt.name, "religion");
      });
    }

    // 3. Repas et repos
    if (workHours && !isRestDay && libre(workHours.end + 60, 30)) poser(workHours.end + 60, 30, "Décompression", "perso");
    if (isRestDay) {
      poserPres(10 * 60, 120, "Temps libre / Famille", "repos");
      poserPres(12 * 60 + 30, 60, "Déjeuner", "perso");
      poserPres(14 * 60, 180, "Repos / Loisirs", "repos");
      poserPres(19 * 60, 60, "Dîner", "perso");
    } else {
      poserPres(12 * 60 + 30, 45, "Déjeuner", "perso", true);
      poserPres(19 * 60 + 30, 60, "Dîner + Temps libre", "perso");
    }

    // 4. Sport et tâches personnelles à heure fixe
    if (answers.sport && answers.sport !== "Non") {
      const sDays: DayName[] =
        answers.sport === "Tous les jours"
          ? [...ALL_DAYS]
          : answers.sport === "3-4x/sem"
          ? ["Lundi", "Mercredi", "Vendredi", "Dimanche"]
          : ["Mardi", "Jeudi"];
      if (sDays.includes(dayName)) {
        const sDur = answers.sport_duration === "30 min" ? 30 : answers.sport_duration === "1h" ? 60 : 90;
        const c = chercher(18 * 60, sDur) ?? chercher(dWake + 60, sDur);
        if (c !== null) poser(c, sDur, "🏋️ Sport", "sport");
      }
    }

    const persoDuJour = customTasks.filter((ct) => {
      if (!ct.name || !ct.dur) return false;
      const ctDays = ct.days && ct.days.length > 0
        ? ct.days
        : ct.freq === "Quotidien"
        ? [...ALL_DAYS]
        : ct.freq === "2-3x/semaine"
        ? (["Lundi", "Mercredi", "Vendredi"] as DayName[])
        : (["Lundi"] as DayName[]);
      return ctDays.includes(dayName);
    });
    persoDuJour.filter((ct) => ct.time).forEach((ct) => {
      const [th, tm] = ct.time!.split(":").map(Number);
      const c = chercher(th * 60 + (tm || 0), ct.dur);
      if (c !== null) poser(c, ct.dur, `🔹 ${ct.name}`, "custom");
    });

    // 5. Les tâches : d'abord celles dont l'élève a choisi ce jour, puis le reste tant qu'il
    // reste du temps déclaré. L'ordre tourne chaque jour pour que toutes aient leur place.
    let debutTaches = Math.max(dWake + 60, (DEBUT_PIC[answers.peak_energy ?? ""] ?? 0) * 60);
    if (workHours) debutTaches = workHours.end + 120;
    else if (studyHours) debutTaches = studyHours.end + 60;
    const trouver = (dur: number) => chercher(debutTaches, dur) ?? chercher(dWake + 60, dur);

    let reste = budgetJour - coachingsDuJour.reduce((n, c) => n + c.dur, 0);
    const placer = (dur: number, label: string, cat: TaskCategory) => {
      const c = trouver(dur);
      if (c === null) return;
      poser(c, dur, label, cat);
      reste -= dur;
    };

    taches.filter((t) => choix[t.id].days.includes(dayName)).forEach((t) => placer(choix[t.id].dur, t.label, t.cat));
    persoDuJour.filter((ct) => !ct.time).forEach((ct) => placer(ct.dur, `🔹 ${ct.name}`, "custom"));

    if (!isRestDay && !absents.includes(dayName)) {
      const sansJour = taches.filter((t) => choix[t.id].days.length === 0);
      sansJour
        .map((_, i) => sansJour[(i + indexJour) % sansJour.length])
        .forEach((t) => {
          if (choix[t.id].dur <= reste) placer(choix[t.id].dur, t.label, t.cat);
        });
    }

    return slots.sort((a, b) => a.h * 60 + a.m - (b.h * 60 + b.m));
  }

  const week: WeekPlan = {} as WeekPlan;
  ALL_DAYS.forEach((d, i) => {
    week[d] = buildDay(d, i);
  });
  return week;
}

/* ────────────────────────────────────────────────────────────
 * Le planning affiché. Il est figé, sauf les coachings : ils sont lus en direct depuis
 * l'admin, un changement d'horaire s'affiche partout sans que l'élève régénère.
 * ──────────────────────────────────────────────────────────── */
const estCoachingCopie = (s: PlanSlot) => s.cat === "coaching" || /Post-coaching/.test(s.label);

export function planAffiche(plan: WeekPlan, coachings: CoachingSlot[]): WeekPlan {
  const r = {} as WeekPlan;
  for (const jour of ALL_DAYS) {
    r[jour] = [
      ...(plan[jour] ?? []).filter((s) => !estCoachingCopie(s)),
      ...coachings
        .filter((c) => c.day === jour)
        .map((c): PlanSlot => ({ h: c.h, m: c.m, dur: c.dur, label: c.label, cat: "coaching" })),
    ].sort((a, b) => a.h * 60 + a.m - (b.h * 60 + b.m));
  }
  return r;
}

/** Une tâche se retrouve sur un coaching : l'admin a déplacé son horaire depuis le calcul. */
export function tacheSurCoaching(plan: WeekPlan): boolean {
  return ALL_DAYS.some((jour) => {
    const slots = plan[jour] ?? [];
    const coachingsDuJour = slots.filter((s) => s.cat === "coaching");
    return slots
      .filter((s) => s.cat === "business" || s.cat === "formation" || s.cat === "custom")
      .some((s) => coachingsDuJour.some((c) => {
        const d = s.h * 60 + s.m;
        const dc = c.h * 60 + c.m;
        return d < dc + c.dur && d + s.dur > dc;
      }));
  });
}

/** Les tâches qui n'ont pas trouvé de place le jour choisi par l'élève. */
export function tachesSansPlace(plan: WeekPlan, answers: Answers, pack: "al_baraka" | "liberty"): string[] {
  const choix = answers.taches_parcours;
  if (!choix) return [];
  const manquantes: string[] = [];
  for (const t of tachesDuParcours(pack, answers.parcours)) {
    for (const jour of choix[t.id]?.days ?? []) {
      if (!(plan[jour] ?? []).some((s) => s.label === t.label)) {
        manquantes.push(`${t.label.replace(/^\S+\s/, "")} (${jour.toLowerCase()})`);
      }
    }
  }
  return manquantes;
}

/* ────────────────────────────────────────────────────────────
 * Fuseau horaire : les coachings sont réglés à l'heure de Paris et affichés à celle de l'élève.
 * ──────────────────────────────────────────────────────────── */
export function decalageDepuisParis(fuseau: string, maintenant = new Date()): number {
  const heureDans = (tz: string) => new Date(maintenant.toLocaleString("en-US", { timeZone: tz })).getTime();
  return Math.round((heureDans(fuseau) - heureDans("Europe/Paris")) / 60000);
}

export function coachingDansLeFuseau(c: CoachingSlot, decalageMin: number): CoachingSlot {
  const semaine = 7 * 24 * 60;
  const total = (ALL_DAYS.indexOf(c.day) * 24 * 60 + c.h * 60 + c.m + decalageMin + semaine) % semaine;
  return { ...c, day: ALL_DAYS[Math.floor(total / (24 * 60))], h: Math.floor((total % (24 * 60)) / 60), m: total % 60 };
}
