import { describe, it, expect } from "vitest";
import { abonnementStripeEnCours, estNonReglee } from "./abonnementStripe";

describe("abonnementStripeEnCours", () => {
  it("voit l'abonnement d'une mensualité en retard — le cas qui échappait au bouton", () => {
    // OMAR SGHIR OUARDI au 07/09/2026 : 4 payées, la 5e en retard, la 6e en attente.
    const echeances = [
      { status: "paid", stripe_subscription_id: "sub_ancien" },
      { status: "paid", stripe_subscription_id: "sub_actuel" },
      { status: "late", stripe_subscription_id: "sub_actuel" },
    ];
    expect(abonnementStripeEnCours(echeances)).toBe("sub_actuel");
  });

  it("voit l'abonnement d'une mensualité en attente", () => {
    expect(abonnementStripeEnCours([{ status: "pending", stripe_subscription_id: "sub_1" }])).toBe("sub_1");
  });

  it("ignore l'abonnement porté par les mensualités payées ou perdues", () => {
    // Après un replan, les mensualités payées gardent l'ancien abonnement :
    // il ne faut pas le prendre pour celui qui prélève.
    const echeances = [
      { status: "paid", stripe_subscription_id: "sub_ancien" },
      { status: "lost", stripe_subscription_id: "sub_ancien" },
      { status: "pending", stripe_subscription_id: null },
    ];
    expect(abonnementStripeEnCours(echeances)).toBeNull();
  });

  it("ne voit rien quand plus rien n'est dû", () => {
    expect(abonnementStripeEnCours([])).toBeNull();
    expect(abonnementStripeEnCours([{ status: "paid", stripe_subscription_id: "sub_1" }])).toBeNull();
  });
});

describe("estNonReglee", () => {
  it.each([
    ["pending", true],
    ["late", true],
    ["paid", false],
    ["lost", false],
    ["cancelled", false],
    [null, false],
  ])("« %s » → %s", (status, attendu) => {
    expect(estNonReglee({ status })).toBe(attendu);
  });
});
