import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { suivrePageGtm } from "./pages/tunnels/lib/gtm";
import PiedDePageLegal from "./components/legal/PiedDePageLegal";
import { isTunnelHost } from "./lib/hosts";
import { routesLegales, tunnelRoutes, TunnelFallback, TunnelNotFound } from "./routesPartagees";

// La plateforme n'est téléchargée que hors du domaine des tunnels.
const FullApp = lazy(() => import("./FullApp"));

// Sur le domaine des tunnels : application MINIMALE. Ni AuthProvider, ni thème
// CRM, ni la moindre route de la plateforme — rien à quoi se connecter.
/**
 * Prévient Google Tag Manager à chaque changement de page. Sans effet hors du
 * tunnel Al Baraka classique (voir tunnels/lib/gtm.ts pour le périmètre).
 */
function SuiviGtm() {
  const { pathname } = useLocation();
  useEffect(() => {
    suivrePageGtm(pathname);
  }, [pathname]);
  return null;
}

const TunnelOnlyApp = () => (
  <BrowserRouter>
    <SuiviGtm />
    <Routes>
      {tunnelRoutes}
      {routesLegales}
      <Route path="*" element={<Suspense fallback={<TunnelFallback />}><TunnelNotFound /></Suspense>} />
    </Routes>
    {/* Sur CHAQUE page, sans exception — y compris les pages de vente
        épurées. C'est ce pied de page que Meta cherche quand il refuse
        une publicité : identité de l'annonceur, non-affiliation, et un
        accès à la politique de confidentialité sans connexion. */}
    <PiedDePageLegal />
    {/* Bandeau cookies retiré le 30/09/2026 (décision de Hassan) : il
        empêchait le pixel Meta de voir les visiteurs qui ne cliquaient pas
        sur « Accepter ». Le pixel se charge désormais sans condition. */}
  </BrowserRouter>
);

// Le domaine des tunnels ne monte jamais l'application. 2e barrière derrière
// les règles serveur de `vercel.json`.
const App = () =>
  isTunnelHost() ? (
    <TunnelOnlyApp />
  ) : (
    <Suspense fallback={<div style={{ minHeight: "100vh" }} aria-hidden />}>
      <FullApp />
    </Suspense>
  );

export default App;
