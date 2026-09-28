/**
 * L'encart « Pour aller plus loin ».
 *
 * Ce qui compte : un renvoi accessible mène au bon chapitre ET à la bonne
 * vidéo ; un renvoi vers une formation que l'élève n'a pas est visible mais
 * n'est PAS un lien (choix de Hassan : montré verrouillé) ; la formation n'est
 * nommée que lorsqu'elle change.
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Renvois, { cheminCible } from "./Renvois";
import { lienRenvoi, type Renvoi } from "@/hooks/useRenvois";

afterEach(cleanup);

const base: Renvoi = {
  id: "r1",
  video_id: null,
  message: null,
  ordre: 1,
  cible_chapitre_id: "chap-cible",
  cible_video_id: null,
  cible_chapitre_titre: "Traiter les objections",
  cible_video_titre: null,
  cible_module_titre: "Module 3",
  cible_formation_slug: "closing",
  cible_formation_titre: "Closing",
  meme_formation: false,
  accessible: true,
  cible_publiee: true,
};

const afficher = (renvois: Renvoi[]) =>
  render(
    <MemoryRouter>
      <Renvois renvois={renvois} />
    </MemoryRouter>,
  );

describe("renvois vers d'autres chapitres", () => {
  it("mène au chapitre, et à la vidéo précise quand il y en a une", () => {
    expect(lienRenvoi(base)).toBe("/training/closing/chapitre/chap-cible");
    expect(lienRenvoi({ ...base, cible_video_id: "vid-2" })).toBe("/training/closing/chapitre/chap-cible?video=vid-2");
    afficher([{ ...base, cible_video_id: "vid-2", cible_video_titre: "Le prix", message: "Si tu veux approfondir, va ici." }]);
    const lien = screen.getByRole("link");
    expect(lien.getAttribute("href")).toBe("/training/closing/chapitre/chap-cible?video=vid-2");
    expect(lien.textContent).toContain("Si tu veux approfondir, va ici.");
    expect(lien.textContent).toContain("Closing › Traiter les objections · Le prix");
  });

  it("ne nomme pas la formation quand le renvoi reste dans la même", () => {
    expect(cheminCible({ ...base, meme_formation: true })).toBe("Traiter les objections");
    expect(cheminCible(base)).toBe("Closing › Traiter les objections");
  });

  it("montre verrouillé, et SANS lien, un renvoi vers une formation que l'élève n'a pas", () => {
    afficher([{ ...base, accessible: false }]);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Disponible avec la formation Closing")).toBeTruthy();
    expect(screen.getByText("Closing › Traiter les objections")).toBeTruthy();
  });

  it("signale au CEO une cible en brouillon, que les élèves ne voient pas", () => {
    afficher([{ ...base, cible_publiee: false }]);
    expect(screen.getByText(/Cible en brouillon/)).toBeTruthy();
  });

  it("n'affiche rien quand il n'y a aucun renvoi", () => {
    const { container } = afficher([]);
    expect(container.textContent).toBe("");
  });
});
