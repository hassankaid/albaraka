import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import KpiVedette from "./KpiVedette";
import { calculerKpis } from "@/lib/marketing/perf";

const kpis = calculerKpis({ leads: 335, ventes: 3, ca: 6000, depense: 1952.73 });

describe("carte ROI", () => {
  it("dit jusqu'à quand les dépenses sont connues", () => {
    const html = renderToStaticMarkup(<KpiVedette kpis={kpis} mentionDepenses="dépenses connues jusqu'au 31/10" />);
    expect(html).toContain("investis, dépenses connues jusqu&#x27;au 31/10");
  });

  it("n'ajoute rien quand la période est couverte", () => {
    const html = renderToStaticMarkup(<KpiVedette kpis={kpis} />);
    expect(html).toContain("investis");
    expect(html).not.toContain("connues");
  });
});
