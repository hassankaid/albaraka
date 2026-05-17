// PaymentLinksContext — état partagé entre les 3 onglets de l'admin
// /admin/payment-links.
//
// Ce qui transite ici :
//   - testMode (boolean) : si true, tous les liens copiés depuis l'admin
//     incluent `?test=1` → la page checkout bascule sur les clés Stripe test
//     et l'edge function create-payment-intent utilise STRIPE_SECRET_KEY_TEST.
//     ⚠️ Aucun paiement réel n'est prélevé en mode test.
//
//   - testCopyConfirmedThisSession (boolean) : flag qui mémorise la
//     confirmation utilisateur quand il copie un premier lien en mode test.
//     Évite de spammer la modale de confirmation à chaque copie. La session
//     est volatile (React state) : recharger la page la reset.
//
// Pas de localStorage ni de cookie : on veut que le testMode soit explicite
// et redemandé à chaque ouverture de la page admin (sécurité par défaut).

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type PaymentLinksContextValue = {
  testMode: boolean;
  setTestMode: (v: boolean) => void;
  testCopyConfirmedThisSession: boolean;
  markTestCopyConfirmed: () => void;
};

const PaymentLinksContext = createContext<PaymentLinksContextValue | null>(null);

export function PaymentLinksProvider({ children }: { children: ReactNode }) {
  const [testMode, setTestModeRaw] = useState<boolean>(false);
  const [testCopyConfirmedThisSession, setConfirmed] = useState<boolean>(false);

  // Toggle off ⇒ on reset la confirmation pour redemander la prochaine fois.
  const setTestMode = useCallback((v: boolean) => {
    setTestModeRaw(v);
    if (!v) setConfirmed(false);
  }, []);

  const markTestCopyConfirmed = useCallback(() => setConfirmed(true), []);

  return (
    <PaymentLinksContext.Provider
      value={{ testMode, setTestMode, testCopyConfirmedThisSession, markTestCopyConfirmed }}
    >
      {children}
    </PaymentLinksContext.Provider>
  );
}

export function usePaymentLinksContext(): PaymentLinksContextValue {
  const ctx = useContext(PaymentLinksContext);
  if (!ctx) {
    throw new Error(
      "usePaymentLinksContext doit être appelé à l'intérieur d'un <PaymentLinksProvider>",
    );
  }
  return ctx;
}
