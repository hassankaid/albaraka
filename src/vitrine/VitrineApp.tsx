// ─────────────────────────────────────────────────────────────────────────
// Le site vitrine AL BARAKA Écosystème — application à part entière.
//
// Servi par `vitrine.html`, sa propre porte d'entrée : ni CRM, ni connexion,
// ni client Supabase, ni Tailwind. Un visiteur du site de marque ne télécharge
// rien de la plateforme — c'est ce qui rend l'objectif Lighthouse ≥ 90 sur
// mobile atteignable (cahier §8.3).
//
// Où il vit :
//   - en production, à la racine de `albarakaecosysteme.com` (et `www.`) ;
//   - ailleurs (local, aperçus Vercel), sous `/site-vitrine`, parce que la
//     racine de ces domaines appartient à la plateforme.
//
// Aucun pixel : aucune publicité ne mène ici (décision de Hassan le
// 28/09/2026). Le bandeau cookies est tout de même monté, pour que le lien
// « Gérer les cookies » du pied de page fasse ce que la politique de
// confidentialité (§9) annonce.
// ─────────────────────────────────────────────────────────────────────────
import { lazy, Suspense, useEffect, useLayoutEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import BandeauCookies from "@/components/legal/BandeauCookies";
import { MENTIONS_LEGALES, POLITIQUE_CONFIDENTIALITE, CGV } from "@/pages/legal/textes";
import { PRIMARY_APP_HOST } from "@/lib/impersonation";
import { isVitrineHost, VITRINE_PREFIXE } from "@/lib/hosts";
import Menu from "./composants/Menu";
import PiedDePage from "./composants/PiedDePage";
import Accueil, { chargerFormulaire } from "./pages/Accueil";
import Merci from "./pages/Merci";
import { capterAttribution } from "./api";

const PageLegale = lazy(() => import("@/pages/legal/PageLegale"));

/**
 * À chaque changement de page : haut de page, ou la section visée par
 * l'ancre (« Revoir les témoignages » mène à `/#retours`). Le navigateur ne
 * le fait pas seul, la section n'existant pas encore quand il lit l'adresse.
 */
function Defilement() {
  const { pathname, hash } = useLocation();
  useLayoutEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }
    const id = decodeURIComponent(hash.slice(1));
    const t = window.setTimeout(() => document.getElementById(id)?.scrollIntoView(), 0);
    return () => window.clearTimeout(t);
  }, [pathname, hash]);
  return null;
}

/**
 * Chemin inconnu sur le domaine du site : c'est presque toujours un ancien
 * lien vers la plateforme, du temps où ce domaine la désignait — les emails
 * de notification des apporteurs pointent par exemple vers
 * `albarakaecosysteme.com/my-space/leads`. On l'y renvoie, chemin conservé,
 * plutôt que de montrer une page d'erreur.
 */
function VersPlateforme() {
  const { pathname, search, hash } = useLocation();
  useEffect(() => {
    if (isVitrineHost()) {
      window.location.replace(`https://${PRIMARY_APP_HOST}${pathname}${search}${hash}`);
    }
  }, [pathname, search, hash]);
  if (isVitrineHost()) return <div style={{ minHeight: "100vh" }} aria-busy="true" />;
  return (
    <main id="contenu" className="v-merci">
      <div className="v-merci-contenu">
        <h1 className="v-h2">Page introuvable</h1>
      </div>
    </main>
  );
}

function Cadre({ children }: { children: React.ReactNode }) {
  return (
    <div className="v-page">
      <a href="#contenu" className="v-lien-evitement">
        Aller au contenu
      </a>
      <Menu />
      {children}
      <PiedDePage />
    </div>
  );
}

export default function VitrineApp() {
  useEffect(() => {
    capterAttribution();
    // Préchargement du formulaire une fois la page affichée et au repos.
    const w = window as Window & { requestIdleCallback?: (f: () => void) => number };
    const precharger = () => void chargerFormulaire();
    if (w.requestIdleCallback) w.requestIdleCallback(precharger);
    else window.setTimeout(precharger, 1500);
  }, []);

  const legale = (texte: typeof MENTIONS_LEGALES) => (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#080808" }} aria-hidden />}>
      <div className="v-page">
        <PageLegale texte={texte} />
        <PiedDePage />
      </div>
    </Suspense>
  );

  return (
    <BrowserRouter basename={isVitrineHost() ? undefined : VITRINE_PREFIXE}>
      <Defilement />
      <Routes>
        <Route path="/" element={<Cadre><Accueil /></Cadre>} />
        <Route path="/merci" element={<Cadre><Merci /></Cadre>} />
        <Route path={MENTIONS_LEGALES.chemin} element={legale(MENTIONS_LEGALES)} />
        <Route path={POLITIQUE_CONFIDENTIALITE.chemin} element={legale(POLITIQUE_CONFIDENTIALITE)} />
        <Route path={CGV.chemin} element={legale(CGV)} />
        <Route path="*" element={<VersPlateforme />} />
      </Routes>
      <BandeauCookies />
    </BrowserRouter>
  );
}
