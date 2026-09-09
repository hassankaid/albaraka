/**
 * Le message qu'un membre de l'équipe verra quand il saisit deux fois la même
 * personne. Ce qui compte ici n'est pas qu'un message s'affiche, mais qu'on ne
 * masque JAMAIS une erreur qui dit autre chose : un refus de droits ou une
 * panne réseau doivent rester lisibles, sinon on cherche un doublon là où il y
 * a un problème d'accès.
 */

import { describe, it, expect } from "vitest";
import { estUnDoublon, messageErreurLead, MESSAGE_DOUBLON } from "./leadDoublon";

describe("reconnaissance du doublon", () => {
  it("reconnaît le code Postgres de violation d'unicité", () => {
    expect(estUnDoublon({ code: "23505", message: "duplicate key" })).toBe(true);
  });

  it("reconnaît l'index même sans le code", () => {
    // PostgREST ne renvoie pas toujours le code : le nom de l'index, si.
    expect(estUnDoublon({
      message: 'duplicate key value violates unique constraint "leads_un_par_contact_source_et_jour"',
    })).toBe(true);
  });

  it("ne confond pas avec une autre contrainte d'unicité", () => {
    // Volontaire : un autre 23505 EST un doublon de quelque chose, et le
    // message générique reste plus utile que le jargon Postgres.
    expect(estUnDoublon({ code: "23505", message: "contacts_email_key" })).toBe(true);
  });

  it("ne se déclenche pas sur autre chose", () => {
    expect(estUnDoublon({ code: "42501", message: "permission denied" })).toBe(false);
    expect(estUnDoublon(new Error("Failed to fetch"))).toBe(false);
    expect(estUnDoublon(null)).toBe(false);
    expect(estUnDoublon(undefined)).toBe(false);
    expect(estUnDoublon("une chaîne")).toBe(false);
  });
});

describe("message affiché", () => {
  it("explique le doublon en français, sans jargon", () => {
    const m = messageErreurLead({ code: "23505" });
    expect(m).toBe(MESSAGE_DOUBLON);
    expect(m).not.toMatch(/constraint|duplicate key|23505/);
  });

  it("laisse passer les autres erreurs telles quelles", () => {
    // Le point le plus important du fichier : masquer un refus de droits
    // derrière « doublon » enverrait chercher au mauvais endroit.
    expect(messageErreurLead({ code: "42501", message: "permission denied for table leads" }))
      .toBe("permission denied for table leads");
  });

  it("reste lisible quand l'erreur n'a pas de message", () => {
    expect(messageErreurLead({})).toBe("Une erreur inattendue est survenue.");
    expect(messageErreurLead(null)).toBe("Une erreur inattendue est survenue.");
  });
});
