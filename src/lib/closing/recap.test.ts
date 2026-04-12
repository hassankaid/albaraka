import { describe, it, expect } from "vitest";
import { buildWeekRecap, computeWeekStats } from "./recap";
import { getCurrentPlanWeek } from "./dates";
import { getPhaseForWeek } from "./phases";

const emptyDay = () => ({ rp_d: 0, rp_c: 0, ventes: 0, emotions: [] as string[] });

describe("computeWeekStats", () => {
  it("returns zeros when no data", () => {
    const s = computeWeekStats(Array.from({ length: 7 }, emptyDay));
    expect(s.rpD).toBe(0);
    expect(s.rpC).toBe(0);
    expect(s.act).toBe(0);
    expect(s.hitB).toBe(false);
    expect(s.avgEnergy).toBeNull();
  });

  it("hitB when both RP targets reached", () => {
    const days = Array.from({ length: 7 }, emptyDay);
    days[0].rp_d = 4;
    days[1].rp_c = 3;
    const s = computeWeekStats(days);
    expect(s.hitD).toBe(true);
    expect(s.hitC).toBe(true);
    expect(s.hitB).toBe(true);
  });

  it("counts active days (any field set)", () => {
    const days = Array.from({ length: 7 }, emptyDay);
    days[0].rp_d = 1;
    days[1].emotions = ["motive"];
    days[2].ventes = 1;
    const s = computeWeekStats(days);
    expect(s.act).toBe(3);
  });

  it("computes top emotions and energy average", () => {
    const days = Array.from({ length: 7 }, emptyDay);
    days[0].emotions = ["motive", "motive"];
    days[1].emotions = ["stresse"];
    const s = computeWeekStats(days);
    expect(s.topEmotions[0][0]).toBe("motive");
    expect(s.topEmotions[0][1]).toBe(2);
    expect(s.posCount).toBe(2);
    expect(s.negCount).toBe(1);
    expect(s.avgEnergy).not.toBeNull();
  });
});

describe("buildWeekRecap", () => {
  it("returns null on inactive week", () => {
    const r = buildWeekRecap(Array.from({ length: 7 }, emptyDay), [], 1);
    expect(r).toBeNull();
  });

  it("picks exceptional headline when hitB and sales > 0", () => {
    const days = Array.from({ length: 7 }, emptyDay);
    days[0].rp_d = 4;
    days[0].rp_c = 3;
    days[0].ventes = 2;
    const r = buildWeekRecap(days, [], 2);
    expect(r?.headline).toMatch(/exception|feu|parfaite|guerre/i);
  });

  it("uses foundations tip for weeks 1-4 without low energy", () => {
    const days = Array.from({ length: 7 }, emptyDay);
    days[0].emotions = ["confiant"];
    days[0].rp_d = 2;
    const r = buildWeekRecap(days, [], 3);
    expect(r?.tip).toMatch(/Fondations/);
  });

  it("filters empty learnings", () => {
    const days = Array.from({ length: 7 }, emptyDay);
    days[0].rp_d = 1;
    const r = buildWeekRecap(days, ["", "   ", "Ne pas se précipiter"], 2);
    expect(r?.learnings).toEqual(["Ne pas se précipiter"]);
  });
});

describe("getPhaseForWeek", () => {
  it("maps weeks to correct phase", () => {
    expect(getPhaseForWeek(1).id).toBe(1);
    expect(getPhaseForWeek(4).id).toBe(1);
    expect(getPhaseForWeek(5).id).toBe(2);
    expect(getPhaseForWeek(8).id).toBe(2);
    expect(getPhaseForWeek(9).id).toBe(3);
    expect(getPhaseForWeek(12).id).toBe(3);
  });
});

describe("getCurrentPlanWeek", () => {
  it("returns 1 on start date", () => {
    const started = new Date("2026-04-06");
    expect(getCurrentPlanWeek(started, started)).toBe(1);
  });

  it("returns correct week after N days", () => {
    const started = new Date("2026-04-06");
    const plus7 = new Date("2026-04-13");
    const plus21 = new Date("2026-04-27");
    expect(getCurrentPlanWeek(started, plus7)).toBe(2);
    expect(getCurrentPlanWeek(started, plus21)).toBe(4);
  });

  it("caps at 12 weeks", () => {
    const started = new Date("2026-01-01");
    const far = new Date("2027-01-01");
    expect(getCurrentPlanWeek(started, far)).toBe(12);
  });
});
