/**
 * Quiz de lead scoring des tunnels WhatsApp et VSL (04/10/2026).
 *
 * Ce qui doit tenir, et qu'aucun écran ne montrerait en cas de régression :
 *  • l'inscrit passe OBLIGATOIREMENT par le quiz (WhatsApp, VSL ; pas Liberty) ;
 *  • les réponses partent avec le bon tunnel et le bon jeton ;
 *  • le quiz ne bloque jamais : sans jeton, ou après deux échecs d'envoi,
 *    l'inscrit arrive quand même sur la page de remerciement ;
 *  • la variante vidéo `?v=` survit au détour par le quiz ;
 *  • le barème est le même des deux côtés (site et fonction serveur).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import TunnelQuiz from "./TunnelQuiz";
import { WA_TUNNEL, VSL_TUNNEL, LIBERTY_TUNNEL } from "../config";
import { memoriserJetonQuiz, lireJetonQuiz, avecVariante } from "../lib/quiz";
import { QUIZ_QUESTIONS } from "@/lib/leadScoring";
import { estPageGtm, tunnelDe } from "../lib/gtm";

vi.setConfig({ testTimeout: 20_000 });

function Ici() {
  const l = useLocation();
  return <div data-testid="ici">{l.pathname + l.search}</div>;
}

function monter(entree: string) {
  return render(
    <MemoryRouter initialEntries={[entree]}>
      <Routes>
        <Route path="/webinaire/quiz" element={<TunnelQuiz tunnel={WA_TUNNEL} />} />
        <Route path="*" element={<Ici />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Répond à toutes les questions par la première option. */
async function repondreATout() {
  for (let i = 0; i < QUIZ_QUESTIONS.length; i++) {
    const q = QUIZ_QUESTIONS[i];
    await screen.findByText(q.prompt);
    expect(screen.getByText(`Question ${i + 1} sur ${QUIZ_QUESTIONS.length}`)).toBeTruthy();
    fireEvent.click(screen.getByText(q.options[0].label));
  }
}

beforeEach(() => {
  sessionStorage.clear();
  vi.useRealTimers();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("le quiz dans le parcours", () => {
  it("existe sur WhatsApp et VSL, pas sur Liberty", () => {
    expect(WA_TUNNEL.quiz).toEqual({ path: "/webinaire/quiz", slug: "tunnel-wa" });
    expect(VSL_TUNNEL.quiz).toEqual({ path: "/vsl/quiz", slug: "tunnel-vsl" });
    expect(LIBERTY_TUNNEL.quiz).toBeUndefined();
    expect(memoriserJetonQuiz(LIBERTY_TUNNEL, "x")).toBe(false);
  });

  it("le formulaire envoie au quiz quand un jeton est reçu, sinon au remerciement", () => {
    const modal = readFileSync(resolve(process.cwd(), "src/pages/tunnels/components/OptInModal.tsx"), "utf-8");
    expect(modal).toContain("tunnel.quiz && memoriserJetonQuiz(tunnel, lead.scoring_token) ? tunnel.quiz.path : tunnel.merciPath");
  });

  it("est dans le périmètre GTM : le Lead qui y part va bien aux régies", () => {
    expect(estPageGtm("/webinaire/quiz")).toBe(true);
    expect(estPageGtm("/vsl/quiz")).toBe(true);
    expect(tunnelDe("/vsl/quiz")).toBe("vsl");
  });

  it("garde la variante vidéo", () => {
    expect(avecVariante("/vsl/merci", "4")).toBe("/vsl/merci?v=4");
    expect(avecVariante("/vsl/merci", null)).toBe("/vsl/merci");
  });

  it("le serveur crée le jeton pour WhatsApp et VSL seulement, et ne bloque jamais l'inscription", () => {
    const fn = readFileSync(resolve(process.cwd(), "supabase/functions/tunnel-lead-submit/index.ts"), "utf-8");
    expect(fn).toContain('["webi_wa_", "tunnel-wa"]');
    expect(fn).toContain('["webi_vsl_", "tunnel-vsl"]');
    expect(fn).not.toContain('["liberty_"');
    // Déjà « consommé » : le rapprochement par IP ne doit jamais le proposer.
    expect(fn).toMatch(/consumed: true/);
    expect(fn).toContain("jeton du quiz non cree (non bloquant)");
    expect(fn.match(/scoring_token \}\)/g)).toHaveLength(2); // lead neuf ET doublon fusionné
  });

  it("la migration déclare les deux tunnels du quiz", () => {
    const sql = readFileSync(resolve(process.cwd(), "supabase/migrations/20261004140000_quiz_scoring_tunnels_natifs.sql"), "utf-8");
    expect(sql).toContain("'tunnel-wa'");
    expect(sql).toContain("'tunnel-vsl'");
  });
});

describe("la page du quiz", () => {
  it("sans jeton, envoie directement au remerciement (variante gardée)", async () => {
    monter("/webinaire/quiz?v=3");
    expect((await screen.findByTestId("ici")).textContent).toBe("/webinaire/merci?v=3");
  });

  it("pose les 7 questions, envoie les réponses avec le jeton, puis va au remerciement", async () => {
    memoriserJetonQuiz(WA_TUNNEL, "jeton-123");
    const appels: Array<{ url: string; body: { funnel: string; token: string; answers: Record<string, string> } }> = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
      appels.push({ url, body: JSON.parse(String(init.body)) });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }));

    monter("/webinaire/quiz?v=2");
    expect(screen.getByText("Diagnostic personnalisé")).toBeTruthy();
    await repondreATout();

    await screen.findByText("Diagnostic enregistré ✓");
    expect(appels).toHaveLength(1);
    expect(appels[0].url).toMatch(/\/functions\/v1\/submit-scoring-quiz$/);
    expect(appels[0].body.funnel).toBe("tunnel-wa");
    expect(appels[0].body.token).toBe("jeton-123");
    expect(Object.keys(appels[0].body.answers)).toEqual(QUIZ_QUESTIONS.map((q) => q.id));
    expect(lireJetonQuiz(WA_TUNNEL)).toBeNull();
    await waitFor(() => expect(screen.getByTestId("ici").textContent).toBe("/webinaire/merci?v=2"), { timeout: 3000 });
  });

  it("après deux échecs d'envoi, ne bloque pas : l'inscrit arrive au remerciement", async () => {
    memoriserJetonQuiz(WA_TUNNEL, "jeton-123");
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ error: "internal" }), { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);

    monter("/webinaire/quiz");
    await repondreATout();
    expect((await screen.findByTestId("ici", {}, { timeout: 3000 })).textContent).toBe("/webinaire/merci");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("le barème", () => {
  it("est identique sur le site et dans la fonction qui calcule le score", () => {
    const serveur = readFileSync(resolve(process.cwd(), "supabase/functions/submit-scoring-quiz/scoring.ts"), "utf-8");
    for (const q of QUIZ_QUESTIONS) {
      for (const o of q.options) {
        const ligne = new RegExp(`code:\\s*"${o.code}"[^}]*score:\\s*${o.score}\\b`);
        expect(serveur, `${q.id}/${o.code}`).toMatch(ligne);
      }
    }
  });
});
