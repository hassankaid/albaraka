import { describe, expect, it } from "vitest";
import { calerSurLaVoix, coupeApres, enveloppe, IMAGE, niveau, passageAvant, surImage, type Enveloppe } from "./coupes";

/** Un son fictif : voix forte de 1,00 à 2,00 s, fin de mot douce de 2,00 à 2,30 s, silence, voix de 3,50 à 4,20 s. */
function sonFictif(): Enveloppe {
  const db = new Float32Array(600).fill(-70);
  db.fill(-20, 100, 200);
  db.fill(-38, 200, 230);
  db.fill(-20, 350, 420);
  return { db, pas: 0.01, bruit: -70, voix: -20 };
}

describe("loupe de coupe", () => {
  it("cale les temps sur les images (30 i/s)", () => {
    expect(surImage(1.01)).toBe(1);
    expect(surImage(1.02)).toBe(1.033);
    expect(IMAGE).toBeCloseTo(0.0333, 3);
  });

  it("affiche les temps au centième", async () => {
    const { minutagePrecis } = await import("./coupes");
    expect(minutagePrecis(72.434)).toBe("1:12,43");
    expect(minutagePrecis(5.995)).toBe("0:06,00");
  });

  it("mesure le son par tranches de 10 ms", () => {
    const e = new Float32Array(16000).fill(0);
    e.fill(0.5, 8000, 12000);
    const env = enveloppe(e, 16000);
    expect(env.db.length).toBe(100);
    expect(niveau(env, 0.6)).toBe(1);
    expect(niveau(env, 0.2)).toBe(0);
  });

  it("prolonge une fin de passage qui coupait la fin douce d'un mot", () => {
    // l'IA s'arrêtait à 2,15 s : la voix (douce) continue jusqu'à 2,30 s
    expect(calerSurLaVoix(sonFictif(), "fin", 2.15, 1, 3.5)).toBe(surImage(2.3 + 0.12));
  });

  it("raccourcit une fin de passage laissée dans le blanc", () => {
    expect(calerSurLaVoix(sonFictif(), "fin", 2.8, 1, 3.5)).toBe(surImage(2.3 + 0.12));
  });

  it("cale un début de passage juste avant la voix, sans dépasser le passage d'avant", () => {
    expect(calerSurLaVoix(sonFictif(), "debut", 3.2, 2.4, 4)).toBe(surImage(3.5 - 0.08));
    expect(calerSurLaVoix(sonFictif(), "debut", 3.6, 3.48, 4)).toBe(3.48);
  });

  it("ne bouge pas s'il n'y a pas de voix près du bord", () => {
    expect(calerSurLaVoix(sonFictif(), "fin", 5.5, 4.5, 6)).toBeNull();
  });

  it("retrouve la coupe entre deux passages, et celle du début de la vidéo", () => {
    const plages: [number, number][] = [[0.5, 2], [3, 4]];
    expect(coupeApres(plages, -1, 5)).toEqual([0, 0.5]);
    expect(coupeApres(plages, 0, 5)).toEqual([2, 3]);
    expect(coupeApres(plages, 1, 5)).toEqual([4, 5]);
    expect(passageAvant(plages, [2, 3])).toBe(0);
    expect(passageAvant(plages, [0, 0.5])).toBe(-1);
  });
});
