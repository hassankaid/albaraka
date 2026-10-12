import { describe, expect, it } from "vitest";
import { chrono, compterMots, dbfs, dureeLecture, formatEnregistrement, niveauMicro, verifierAudio } from "./voixoff";

describe("voix off", () => {
  it("estime la durée de lecture d'un script (150 mots par minute)", () => {
    expect(compterMots("  un deux   trois ")).toBe(3);
    expect(dureeLecture("")).toBe("0 s");
    expect(dureeLecture(Array(75).fill("mot").join(" "))).toBe("30 s");
    expect(dureeLecture(Array(200).fill("mot").join(" "))).toBe("1 min 20");
    expect(dureeLecture(Array(300).fill("mot").join(" "))).toBe("2 min");
  });

  it("classe le niveau du micro : trop loin, bon, trop fort", () => {
    expect(niveauMicro(-70)).toBe("silence");
    expect(niveauMicro(-45)).toBe("faible");
    expect(niveauMicro(-20)).toBe("bon");
    expect(niveauMicro(-1)).toBe("fort");
    expect(dbfs([1, -1, 1, -1])).toBeCloseTo(0);
    expect(dbfs([0, 0])).toBe(-100);
    expect(Math.round(dbfs([0.1, -0.1]))).toBe(-20);
  });

  it("choisit WebM/Opus, sinon MP4 (Safari)", () => {
    expect(formatEnregistrement((t) => t.startsWith("audio/webm"))).toBe("audio/webm;codecs=opus");
    expect(formatEnregistrement((t) => t === "audio/mp4")).toBe("audio/mp4");
    expect(formatEnregistrement(() => false)).toBe("");
  });

  it("accepte les fichiers audio courants", () => {
    expect(verifierAudio({ name: "voix.M4A", size: 10 })).toBeNull();
    expect(verifierAudio({ name: "voix.flac", size: 10 })).toMatch(/Format/);
    expect(chrono(65)).toBe("1:05");
  });
});
