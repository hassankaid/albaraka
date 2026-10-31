import { describe, expect, it } from "vitest";
import {
  coachingDansLeFuseau,
  decalageDepuisParis,
  generatePlanning,
  planAffiche,
  tacheSurCoaching,
  tachesParDefaut,
  tachesSansPlace,
  type Answers,
  type CoachingSlot,
  type PlanSlot,
} from "./generatePlanning";
import { ALL_DAYS, tachesDuParcours } from "./predefinedTasks";
import { BARAKA_QUESTIONS, LIBERTY_QUESTIONS } from "./questions";

const COACHINGS: CoachingSlot[] = [
  { id: "a", day: "Lundi", h: 18, m: 0, dur: 90, label: "🔒 Coaching Q/R" },
  { id: "b", day: "Mardi", h: 20, m: 30, dur: 90, label: "🔒 Coaching Setting" },
  { id: "c", day: "Jeudi", h: 20, m: 0, dur: 90, label: "🔒 Coaching Closing" },
  { id: "d", day: "Samedi", h: 18, m: 0, dur: 90, label: "🔒 Coaching Contenu" },
];

const salarie: Answers = {
  profile: "Salarié(e)",
  parcours: "Setter / Closer",
  work_days: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"],
  work_start: "09:00",
  work_end: "17:00",
  wake_week: "07:00",
  wake_weekend: "08:00",
  sleep_week: "23:00",
  sleep_weekend: "23:00",
  religious: "Oui, 5 prières",
  daily_hours: "2h",
  weekend_work: "Samedi et Dimanche",
};

const debut = (s: PlanSlot) => s.h * 60 + s.m;
const seChevauchent = (a: PlanSlot, b: PlanSlot) => debut(a) < debut(b) + b.dur && debut(a) + a.dur > debut(b);
const tachesDuJour = (slots: PlanSlot[]) => slots.filter((s) => s.cat === "business" || s.cat === "formation" || s.cat === "custom");

describe("les tâches selon le parcours", () => {
  it("donne 3 tâches par parcours, 5 pour les deux, et les tâches CM à LIBERTY", () => {
    const noms = (t: { label: string }[]) => t.map((x) => x.label.replace(/^\S+\s/, ""));
    expect(noms(tachesDuParcours("al_baraka", "Setter / Closer"))).toEqual(["Formation", "Roleplay", "Setting téléphonique"]);
    expect(noms(tachesDuParcours("al_baraka", "Community Management"))).toEqual(["Formation", "Création de contenu", "Prospection"]);
    expect(tachesDuParcours("al_baraka", "Les deux")).toHaveLength(5);
    expect(noms(tachesDuParcours("liberty"))).toEqual(["Formation", "Création de contenu", "Prospection"]);
  });

  it("garde les réglages de l'élève quand il change de parcours", () => {
    const r = tachesParDefaut("al_baraka", "Les deux", { task_formation: { dur: 120, days: ["Lundi"] } });
    expect(r.task_formation).toEqual({ dur: 120, days: ["Lundi"] });
    expect(Object.keys(r)).toHaveLength(5);
  });

  it("donne à LIBERTY le questionnaire de vie, sans question sur une activité ni parcours", () => {
    const ids = LIBERTY_QUESTIONS.map((q) => q.id);
    for (const retire of ["activity_type", "current_ca", "has_tunnel", "team", "coachings", "selected_tasks", "parcours"]) {
      expect(ids).not.toContain(retire);
    }
    expect(BARAKA_QUESTIONS[0].id).toBe("parcours");
    expect(ids).toContain("taches_parcours");
  });
});

describe("le placement", () => {
  it("ne met jamais une tâche sur un coaching, une prière ou un autre bloc", () => {
    const plan = generatePlanning({ ...salarie, daily_hours: "5h+" }, "al_baraka", COACHINGS);
    for (const jour of ALL_DAYS) {
      const slots = plan[jour];
      for (const t of tachesDuJour(slots)) {
        for (const autre of slots) {
          if (autre !== t) expect(seChevauchent(t, autre), `${jour} : ${t.label} / ${autre.label}`).toBe(false);
        }
      }
    }
  });

  it("place les 4 coachings dans tous les cas, même le jour de repos", () => {
    const plan = generatePlanning({ ...salarie, rest_day: "Samedi" }, "al_baraka", COACHINGS);
    expect(plan.Samedi.some((s) => s.label === "🔒 Coaching Contenu")).toBe(true);
    expect(ALL_DAYS.flatMap((j) => plan[j]).filter((s) => s.cat === "coaching")).toHaveLength(4);
  });

  it("déplace juste après le coaching la prière qui tombe dessus", () => {
    const plan = generatePlanning(salarie, "al_baraka", COACHINGS);
    expect(plan.Lundi.find((s) => s.label === "Maghrib")).toMatchObject({ h: 19, m: 30 });
    expect(plan.Mercredi.find((s) => s.label === "Maghrib")).toMatchObject({ h: 18, m: 15 });
  });

  it("respecte la durée et les jours choisis, sans en ajouter d'autres", () => {
    const plan = generatePlanning(
      { ...salarie, taches_parcours: { task_roleplay: { dur: 45, days: ["Mercredi", "Samedi"] } } },
      "al_baraka",
      COACHINGS,
    );
    const jours = ALL_DAYS.filter((j) => plan[j].some((s) => s.label.includes("Roleplay")));
    expect(jours).toEqual(["Mercredi", "Samedi"]);
    expect(plan.Mercredi.find((s) => s.label.includes("Roleplay"))?.dur).toBe(45);
    expect(ALL_DAYS.flatMap((j) => tachesDuJour(plan[j]))).toHaveLength(2);
  });

  it("n'impose aucun rythme : les tâches sans jour restent dans le temps déclaré", () => {
    const plan = generatePlanning({ ...salarie, daily_hours: "1h" }, "al_baraka", COACHINGS);
    for (const jour of ALL_DAYS) {
      const coaching = plan[jour].filter((s) => s.cat === "coaching").reduce((n, s) => n + s.dur, 0);
      const taches = tachesDuJour(plan[jour]).reduce((n, s) => n + s.dur, 0);
      if (coaching) expect(taches).toBe(0);
      else expect(taches).toBeLessThanOrEqual(60);
    }
  });

  it("fait tourner les tâches sans jour pour que chacune ait sa place dans la semaine", () => {
    const plan = generatePlanning({ ...salarie, daily_hours: "1h" }, "al_baraka", COACHINGS);
    const labels = new Set(ALL_DAYS.flatMap((j) => tachesDuJour(plan[j]).map((s) => s.label)));
    expect(labels.size).toBe(3);
  });

  it("ne place rien le week-end si l'élève n'est pas disponible, sauf jour choisi", () => {
    const sansChoix = generatePlanning({ ...salarie, weekend_work: "Non" }, "al_baraka", COACHINGS);
    expect(tachesDuJour(sansChoix.Dimanche)).toHaveLength(0);
    const avecChoix = generatePlanning(
      { ...salarie, weekend_work: "Non", taches_parcours: { task_formation: { dur: 60, days: ["Dimanche"] } } },
      "al_baraka",
      COACHINGS,
    );
    expect(tachesDuJour(avecChoix.Dimanche)).toHaveLength(1);
  });

  it("tient compte des créneaux bloqués", () => {
    const plan = generatePlanning(
      { ...salarie, blocked_slots: [{ label: "Enfants", days: ["Mercredi"], h: 18, m: 0, dur: 300 }] },
      "al_baraka",
      COACHINGS,
    );
    for (const t of tachesDuJour(plan.Mercredi)) expect(debut(t) + t.dur <= 18 * 60 || debut(t) >= 23 * 60).toBe(true);
  });

  it("signale une tâche qui n'a pas trouvé de place le jour choisi", () => {
    const a: Answers = {
      ...salarie,
      blocked_slots: [{ days: ["Mercredi"], h: 0, m: 0, dur: 24 * 60 }],
      taches_parcours: { task_roleplay: { dur: 45, days: ["Mercredi"] } },
    };
    expect(tachesSansPlace(generatePlanning(a, "al_baraka", COACHINGS), a, "al_baraka")).toEqual(["Roleplay (mercredi)"]);
  });

  it("ne dépend plus des anciennes réponses de tâches", () => {
    const plan = generatePlanning({ ...salarie, selected_tasks: { task_tournage: 60 } }, "al_baraka", COACHINGS);
    expect(ALL_DAYS.flatMap((j) => plan[j]).some((s) => s.label.includes("Tournage"))).toBe(false);
  });
});

describe("les coachings en direct", () => {
  it("remplace les coachings copiés par ceux de l'admin, sans toucher au reste", () => {
    const plan = generatePlanning(salarie, "al_baraka", COACHINGS);
    const deplace = COACHINGS.map((c) => (c.id === "a" ? { ...c, h: 19 } : c));
    const affiche = planAffiche(plan, deplace);
    expect(affiche.Lundi.find((s) => s.cat === "coaching")).toMatchObject({ h: 19, m: 0 });
    expect(affiche.Lundi.filter((s) => s.cat === "coaching")).toHaveLength(1);
    expect(tachesDuJour(affiche.Mercredi)).toEqual(tachesDuJour(plan.Mercredi));
  });

  it("retire aussi la prépa et le post-coaching des anciens plannings", () => {
    const ancien = {
      Lundi: [
        { h: 17, m: 40, dur: 20, label: "📝 Prépa coaching", cat: "coaching" },
        { h: 19, m: 30, dur: 30, label: "🚀 Post-coaching", cat: "formation" },
      ],
    } as never;
    expect(planAffiche(ancien, COACHINGS).Lundi.map((s) => s.label)).toEqual(["🔒 Coaching Q/R"]);
  });

  it("repère une tâche recouverte quand l'admin déplace un coaching", () => {
    const plan = generatePlanning(salarie, "al_baraka", COACHINGS);
    expect(tacheSurCoaching(planAffiche(plan, COACHINGS))).toBe(false);
    const t = tachesDuJour(plan.Mercredi)[0];
    const sur: CoachingSlot = { id: "x", day: "Mercredi", h: t.h, m: t.m, dur: 90, label: "🔒 Coaching" };
    expect(tacheSurCoaching(planAffiche(plan, [sur]))).toBe(true);
  });
});

describe("le fuseau de l'élève", () => {
  it("décale l'heure et passe au jour suivant ou précédent si besoin", () => {
    const mardi = COACHINGS[1];
    expect(coachingDansLeFuseau(mardi, 0)).toMatchObject({ day: "Mardi", h: 20, m: 30 });
    expect(coachingDansLeFuseau(mardi, 240)).toMatchObject({ day: "Mercredi", h: 0, m: 30 });
    expect(coachingDansLeFuseau(COACHINGS[0], -1140)).toMatchObject({ day: "Dimanche", h: 23, m: 0 });
  });

  it("calcule le décalage avec Paris, heure d'été ou d'hiver", () => {
    expect(decalageDepuisParis("Europe/Paris")).toBe(0);
    expect(decalageDepuisParis("Asia/Dubai", new Date("2026-01-15T12:00:00Z"))).toBe(180);
    expect(decalageDepuisParis("Asia/Dubai", new Date("2026-07-15T12:00:00Z"))).toBe(120);
  });
});
