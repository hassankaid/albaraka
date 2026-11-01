import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { WeeklyAgenda } from "./WeeklyAgenda";

const coaching = { h: 18, m: 0, dur: 90, label: "Coaching", cat: "coaching" };
const priere = { h: 18, m: 15, dur: 15, label: "Maghrib", cat: "religion" };
const plan = (lundi: unknown[]) => ({ Lundi: lundi, Mardi: [], Mercredi: [], Jeudi: [], Vendredi: [], Samedi: [], Dimanche: [] }) as never;
const rendu = (p: never) => renderToStaticMarkup(<WeeklyAgenda plan={p} version={1} onOpenRefinement={() => {}} />);
const NOTE = "tu peux y aller pendant le coaching";

describe("note sur la prière pendant un coaching", () => {
  it("s'affiche sous le coaching quand le planning contient des prières", () => {
    expect(rendu(plan([coaching, priere]))).toContain(NOTE);
  });
  it("ne s'affiche pas sans prières", () => {
    expect(rendu(plan([coaching]))).not.toContain(NOTE);
  });
});
