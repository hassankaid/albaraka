// Filet de sécurité du paiement (panne du 01/11/2026) : la page de la banque peut rester bloquée
// sur le téléphone du client alors que le paiement est déjà encaissé. Stripe ne nous rend alors
// jamais la main, et le client, sans confirmation, risque de payer une seconde fois.
// Pendant la validation, on demande donc à Stripe où en est le paiement : dès qu'il est passé,
// le client part sur la page de confirmation, comme après une validation normale.

type Intention = { id: string; status: string; client_secret?: string | null };

export interface StripeLecture {
  retrievePaymentIntent(clientSecret: string): Promise<{ paymentIntent?: Intention | null }>;
  retrieveSetupIntent(clientSecret: string): Promise<{ setupIntent?: Intention | null }>;
}

interface Options {
  clientSecret: string;
  returnUrl: string;
  /** « setup » : carte autorisée sans débit (démarrage différé) */
  type?: "payment" | "setup";
  intervalleMs?: number;
  dureeMaxMs?: number;
  rediriger?: (url: string) => void;
}

/** La même adresse que celle construite par Stripe après une validation normale. */
export function adresseDeRetour(returnUrl: string, type: "payment" | "setup", clientSecret: string, id: string): string {
  const url = new URL(returnUrl);
  const cle = type === "setup" ? "setup_intent" : "payment_intent";
  url.searchParams.set(cle, id);
  url.searchParams.set(`${cle}_client_secret`, clientSecret);
  url.searchParams.set("redirect_status", "succeeded");
  return url.toString();
}

export async function confirmerAvecFilet<R extends { error?: { message?: string } }>(
  stripe: StripeLecture,
  {
    clientSecret,
    returnUrl,
    type = "payment",
    intervalleMs = 3000,
    dureeMaxMs = 15 * 60 * 1000,
    rediriger = (url) => window.location.assign(url),
  }: Options,
  confirmer: () => Promise<R>,
): Promise<R | { error?: undefined }> {
  let redirige = false;
  let enCours = false;

  const verifier = async () => {
    if (redirige || enCours) return redirige;
    enCours = true;
    try {
      const reponse =
        type === "setup"
          ? (await stripe.retrieveSetupIntent(clientSecret)).setupIntent
          : (await stripe.retrievePaymentIntent(clientSecret)).paymentIntent;
      if (reponse?.status === "succeeded" && !redirige) {
        redirige = true;
        rediriger(adresseDeRetour(returnUrl, type, clientSecret, reponse.id));
      }
    } catch {
      // Une lecture ratée ne doit pas gêner le paiement : on réessaie au tour suivant.
    } finally {
      enCours = false;
    }
    return redirige;
  };

  const debut = Date.now();
  const minuteur = setInterval(() => {
    if (Date.now() - debut > dureeMaxMs) clearInterval(minuteur);
    else void verifier();
  }, intervalleMs);

  try {
    const resultat = await confirmer();
    clearInterval(minuteur);
    // Fenêtre fermée ou erreur affichée alors que le paiement est peut-être passé : on vérifie
    // avant d'annoncer un refus au client.
    if (resultat.error && (await verifier())) return {};
    return redirige ? {} : resultat;
  } catch (e) {
    clearInterval(minuteur);
    if (await verifier()) return {};
    throw e;
  }
}
