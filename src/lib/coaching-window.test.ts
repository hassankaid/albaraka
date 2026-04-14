import { describe, it, expect } from "vitest";
import { computeJoinPhase, windowOpensAt, JOIN_EARLY_MINUTES, JOIN_GRACE_MINUTES } from "./coaching-window";

function session(overrides: Partial<{
  scheduled_at: string;
  duration_minutes: number;
  meeting_url: string | null;
  status: string;
}> = {}) {
  return {
    scheduled_at: "2026-04-15T10:00:00Z",
    duration_minutes: 60,
    meeting_url: "https://zoom.us/j/demo",
    status: "scheduled",
    ...overrides,
  };
}

const START = new Date("2026-04-15T10:00:00Z");
const END = new Date("2026-04-15T11:00:00Z");

describe("computeJoinPhase", () => {
  it("returns 'no_link' when meeting_url is missing", () => {
    expect(computeJoinPhase(session({ meeting_url: null }), new Date(START.getTime() - 5 * 60_000)))
      .toBe("no_link");
  });

  it("returns 'cancelled' when status is cancelled (even with a link)", () => {
    expect(computeJoinPhase(session({ status: "cancelled" }), START)).toBe("cancelled");
  });

  it("returns 'too_early' when more than 15min before the start", () => {
    const now = new Date(START.getTime() - (JOIN_EARLY_MINUTES + 1) * 60_000);
    expect(computeJoinPhase(session(), now)).toBe("too_early");
  });

  it("returns 'open' exactly at T - 15min", () => {
    const now = new Date(START.getTime() - JOIN_EARLY_MINUTES * 60_000);
    expect(computeJoinPhase(session(), now)).toBe("open");
  });

  it("returns 'open' during the session", () => {
    const now = new Date(START.getTime() + 30 * 60_000);
    expect(computeJoinPhase(session(), now)).toBe("open");
  });

  it("returns 'open' exactly at end", () => {
    const now = new Date(END.getTime() + JOIN_GRACE_MINUTES * 60_000);
    expect(computeJoinPhase(session(), now)).toBe("open");
  });

  it("returns 'ended' right after end", () => {
    const now = new Date(END.getTime() + (JOIN_GRACE_MINUTES + 1) * 60_000);
    expect(computeJoinPhase(session(), now)).toBe("ended");
  });
});

describe("windowOpensAt", () => {
  it("returns start minus 15min", () => {
    const opens = windowOpensAt({ scheduled_at: START.toISOString() });
    expect(opens.getTime()).toBe(START.getTime() - JOIN_EARLY_MINUTES * 60_000);
  });
});
