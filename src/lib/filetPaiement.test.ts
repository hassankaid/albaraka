import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { adresseDeRetour, confirmerAvecFilet } from "./filetPaiement";

const SECRET = "pi_123_secret_abc";
const RETOUR = "https://plateforme.test/merci?pl=1";

function fauxStripe(statuts: string[], type: "payment" | "setup" = "payment") {
  const lire = vi.fn(async () => {
    const status = statuts.length > 1 ? statuts.shift()! : statuts[0];
    const intention = { id: type === "setup" ? "seti_1" : "pi_123", status };
    return type === "setup" ? { setupIntent: intention } : { paymentIntent: intention };
  });
  return { retrievePaymentIntent: lire, retrieveSetupIntent: lire } as never;
}

describe("le filet de sécurité du paiement", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("redirige dès que le paiement est encaissé, même si la fenêtre de la banque reste bloquée", async () => {
    const rediriger = vi.fn();
    void confirmerAvecFilet(fauxStripe(["requires_action", "succeeded"]), { clientSecret: SECRET, returnUrl: RETOUR, rediriger }, () => new Promise(() => {}));
    await vi.advanceTimersByTimeAsync(3000);
    expect(rediriger).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(3000);
    expect(rediriger).toHaveBeenCalledTimes(1);
    const url = new URL(rediriger.mock.calls[0][0]);
    expect(url.pathname).toBe("/merci");
    expect(url.searchParams.get("pl")).toBe("1");
    expect(url.searchParams.get("payment_intent")).toBe("pi_123");
    expect(url.searchParams.get("redirect_status")).toBe("succeeded");
    await vi.advanceTimersByTimeAsync(10000);
    expect(rediriger).toHaveBeenCalledTimes(1);
  });

  it("ne redirige jamais tant que le paiement n'est pas encaissé", async () => {
    const rediriger = vi.fn();
    void confirmerAvecFilet(fauxStripe(["processing"]), { clientSecret: SECRET, returnUrl: RETOUR, rediriger, dureeMaxMs: 20000 }, () => new Promise(() => {}));
    await vi.advanceTimersByTimeAsync(60000);
    expect(rediriger).not.toHaveBeenCalled();
  });

  it("laisse afficher le refus quand la carte est vraiment refusée", async () => {
    const rediriger = vi.fn();
    const refus = { error: { message: "Carte refusée" } };
    const r = await confirmerAvecFilet(fauxStripe(["requires_payment_method"]), { clientSecret: SECRET, returnUrl: RETOUR, rediriger }, async () => refus);
    expect(r).toEqual(refus);
    expect(rediriger).not.toHaveBeenCalled();
  });

  it("n'annonce pas de refus si le client ferme la fenêtre alors que le paiement est passé", async () => {
    const rediriger = vi.fn();
    const r = await confirmerAvecFilet(fauxStripe(["succeeded"]), { clientSecret: SECRET, returnUrl: RETOUR, rediriger }, async () => ({ error: { message: "Fenêtre fermée" } }));
    expect(r).toEqual({});
    expect(rediriger).toHaveBeenCalledTimes(1);
  });

  it("gère une carte autorisée sans débit (démarrage différé)", async () => {
    const rediriger = vi.fn();
    void confirmerAvecFilet(fauxStripe(["succeeded"], "setup"), { clientSecret: SECRET, returnUrl: RETOUR, type: "setup", rediriger }, () => new Promise(() => {}));
    await vi.advanceTimersByTimeAsync(3000);
    expect(new URL(rediriger.mock.calls[0][0]).searchParams.get("setup_intent")).toBe("seti_1");
  });

  it("continue si une lecture échoue, et cesse de lire une fois la confirmation terminée", async () => {
    const rediriger = vi.fn();
    const lire = vi.fn().mockRejectedValueOnce(new Error("réseau")).mockResolvedValue({ paymentIntent: { id: "pi_123", status: "succeeded" } });
    const stripe = { retrievePaymentIntent: lire, retrieveSetupIntent: lire } as never;
    void confirmerAvecFilet(stripe, { clientSecret: SECRET, returnUrl: RETOUR, rediriger }, () => new Promise(() => {}));
    await vi.advanceTimersByTimeAsync(6000);
    expect(rediriger).toHaveBeenCalledTimes(1);

    const lire2 = vi.fn().mockResolvedValue({ paymentIntent: { id: "pi_123", status: "requires_action" } });
    await confirmerAvecFilet({ retrievePaymentIntent: lire2, retrieveSetupIntent: lire2 } as never, { clientSecret: SECRET, returnUrl: RETOUR, rediriger: vi.fn() }, async () => ({}));
    await vi.advanceTimersByTimeAsync(30000);
    expect(lire2).not.toHaveBeenCalled();
  });

  it("construit la même adresse que Stripe", () => {
    expect(adresseDeRetour("https://x.test/merci?test=1", "payment", "s", "pi_9")).toBe(
      "https://x.test/merci?test=1&payment_intent=pi_9&payment_intent_client_secret=s&redirect_status=succeeded",
    );
  });
});
