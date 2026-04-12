import { describe, it, expect } from "vitest";
import { detectSpace } from "./ApporteurLayout";

describe("ApporteurLayout.detectSpace", () => {
  it("default paths go to working", () => {
    expect(detectSpace("/my-space")).toBe("working");
    expect(detectSpace("/my-space/leads")).toBe("working");
    expect(detectSpace("/my-space/sales")).toBe("working");
    expect(detectSpace("/my-space/commissions")).toBe("working");
    expect(detectSpace("/my-space/profile")).toBe("working");
    expect(detectSpace("/working/activity")).toBe("working");
  });

  it("/training/* paths go to training", () => {
    expect(detectSpace("/training")).toBe("training");
    expect(detectSpace("/training/closing")).toBe("training");
    expect(detectSpace("/training/certificats")).toBe("training");
    expect(detectSpace("/training/closing/chapitre/abc")).toBe("training");
  });

  it("coaching paths go to coaching space", () => {
    expect(detectSpace("/mon-coaching")).toBe("coaching");
    expect(detectSpace("/mon-coaching/session/123")).toBe("coaching");
    expect(detectSpace("/my-space/coaching-calendar")).toBe("coaching");
  });
});
