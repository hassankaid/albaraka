// Routes partagées entre l'application des tunnels (event.) et la plateforme :
// pages des tunnels (chargées à la demande) et pages légales. Sorties de
// App.tsx le 11/11/2026 pour que le domaine des tunnels ne télécharge plus
// la plateforme (audit performance).
import { Suspense } from "react";
import { lazyPage } from "@/lib/lazyPage";
import { Route } from "react-router-dom";
import { MENTIONS_LEGALES, POLITIQUE_CONFIDENTIALITE, CGV } from "./pages/legal/textes";
import { WA_TUNNEL, VSL_TUNNEL } from "./pages/tunnels/config";

// ── Module « tunnels » (funnels natifs) — chargé en lazy pour que le trafic
// froid des pubs ne télécharge PAS tout le bundle CRM/coaching. ──
const TunnelLanding = lazyPage(() => import("./pages/tunnels/components/TunnelLanding"));
const WebinaireMerci = lazyPage(() => import("./pages/tunnels/whatsapp/WebinaireMerci"));
const VslMerci = lazyPage(() => import("./pages/tunnels/vsl/VslMerci"));
const VslConfirmation = lazyPage(() => import("./pages/tunnels/vsl/VslConfirmation"));
// Page indépendante de réservation d'appel (partagée pendant/après la conf).
const AppelConference = lazyPage(() => import("./pages/tunnels/appel/AppelConference"));
const AppelConfirmation = lazyPage(() => import("./pages/tunnels/appel/AppelConfirmation"));
// Page indépendante de témoignages (preuve sociale → CTA Calendly).
const Temoignages = lazyPage(() => import("./pages/tunnels/temoignages/Temoignages"));
const NurturingVideo = lazyPage(() => import("./pages/tunnels/nurturing/NurturingVideo"));
// Pages légales : servies sur LES DEUX domaines. Le pied de page des tunnels
// y renvoie, et un lien qui sort du domaine au milieu d'un tunnel publicitaire
// est exactement ce qu'un examen Meta sanctionne.
const PageLegale = lazyPage(() => import("./pages/legal/PageLegale"));
const AlBaraka200 = lazyPage(() => import("./pages/tunnels/albaraka200/AlBaraka200"));
const AlBaraka200Confirmation = lazyPage(() => import("./pages/tunnels/albaraka200/AlBaraka200Confirmation"));
const LibertyLanding = lazyPage(() => import("./pages/tunnels/liberty/LibertyLanding"));
const LibertyMerci = lazyPage(() => import("./pages/tunnels/liberty/LibertyMerci"));
const LibertyConfirmation = lazyPage(() => import("./pages/tunnels/liberty/LibertyConfirmation"));
export const TunnelNotFound = lazyPage(() => import("./pages/tunnels/components/TunnelNotFound"));
const TunnelQuiz = lazyPage(() => import("./pages/tunnels/components/TunnelQuiz"));
export const TunnelFallback = () => (
  <div style={{ minHeight: "100vh", background: "#060504" }} aria-hidden />
);

// ── Segmentation par sous-domaine (voir src/lib/hosts.ts) ────────────────
// Les routes des tunnels, isolées pour pouvoir être servies SEULES (sur
// event.albarakaecosysteme.com) ou RETIRÉES (sur les domaines de l'app).
/**
 * Les trois pages légales. Déclarées une fois, montées dans les DEUX
 * applications : le cahier des charges les veut accessibles sans connexion,
 * et le pied de page y renvoie depuis n'importe quelle page, tunnel compris.
 */
export const routesLegales = (
  <>
    <Route path={MENTIONS_LEGALES.chemin} element={<Suspense fallback={<TunnelFallback />}><PageLegale texte={MENTIONS_LEGALES} /></Suspense>} />
    <Route path={POLITIQUE_CONFIDENTIALITE.chemin} element={<Suspense fallback={<TunnelFallback />}><PageLegale texte={POLITIQUE_CONFIDENTIALITE} /></Suspense>} />
    <Route path={CGV.chemin} element={<Suspense fallback={<TunnelFallback />}><PageLegale texte={CGV} /></Suspense>} />
  </>
);

export const tunnelRoutes = (
  <>
    {/* Tunnel WhatsApp */}
    <Route path="/webinaire" element={<Suspense fallback={<TunnelFallback />}><TunnelLanding tunnel={WA_TUNNEL} /></Suspense>} />
    {/* Quiz de lead scoring, obligatoire entre l'inscription et le remerciement (04/10/2026) */}
    <Route path="/webinaire/quiz" element={<Suspense fallback={<TunnelFallback />}><TunnelQuiz tunnel={WA_TUNNEL} /></Suspense>} />
    <Route path="/webinaire/merci" element={<Suspense fallback={<TunnelFallback />}><WebinaireMerci /></Suspense>} />
    {/* Tunnel VSL (même landing) */}
    <Route path="/vsl" element={<Suspense fallback={<TunnelFallback />}><TunnelLanding tunnel={VSL_TUNNEL} /></Suspense>} />
    <Route path="/vsl/quiz" element={<Suspense fallback={<TunnelFallback />}><TunnelQuiz tunnel={VSL_TUNNEL} /></Suspense>} />
    <Route path="/vsl/merci" element={<Suspense fallback={<TunnelFallback />}><VslMerci /></Suspense>} />
    <Route path="/vsl/confirmation" element={<Suspense fallback={<TunnelFallback />}><VslConfirmation /></Suspense>} />
    {/* Page indépendante : réservation d'appel (lien partagé pendant/après la conf) */}
    <Route path="/appel-conference" element={<Suspense fallback={<TunnelFallback />}><AppelConference /></Suspense>} />
    <Route path="/appel-conference/confirmation" element={<Suspense fallback={<TunnelFallback />}><AppelConfirmation /></Suspense>} />
    {/* Tunnel Liberty : landing (copy propre) → VSL + agenda → confirmation.
        ⚠️ `/liberty` désigne DEUX pages selon le domaine : ce tunnel sur
        event.albarakaecosysteme.com, et la page de PAIEMENT Liberty sur la
        plateforme (plus bas dans ce fichier). C'est pour ça que `liberty` est
        absent des règles « introuvable » de vercel.json, contrairement aux
        autres tunnels — l'y ajouter remplacerait la page de paiement par une
        page d'erreur. Verrouillé par liberty/routage.test.ts (vercel.json
        n'accepte aucun commentaire, la note vit donc ici). */}
    <Route path="/liberty" element={<Suspense fallback={<TunnelFallback />}><LibertyLanding /></Suspense>} />
    <Route path="/liberty/merci" element={<Suspense fallback={<TunnelFallback />}><LibertyMerci /></Suspense>} />
    <Route path="/liberty/confirmation" element={<Suspense fallback={<TunnelFallback />}><LibertyConfirmation /></Suspense>} />
    {/* Page indépendante : témoignages (preuve sociale) */}
    <Route path="/temoignages" element={<Suspense fallback={<TunnelFallback />}><Temoignages /></Suspense>} />
    {/* Tunnel « Al Baraka 200 €/mois » : page unique, prise d'appel directe
        (ni opt-in ni page de remerciement — la réservation se fait sur place). */}
    <Route path="/al-baraka-200" element={<Suspense fallback={<TunnelFallback />}><AlBaraka200 /></Suspense>} />
    <Route path="/al-baraka-200/confirmation" element={<Suspense fallback={<TunnelFallback />}><AlBaraka200Confirmation /></Suspense>} />
    {/* Vidéos de nurturing d'avant-conférence, liées depuis les mails J-5,
        J-3 et J-2 (séquences 21, 23 et 24 de send-conference-mail).
        Chemins courts et stables : une fois le mail parti, on ne les
        renomme plus. */}
    <Route path="/video-1" element={<Suspense fallback={<TunnelFallback />}><NurturingVideo numero={1} /></Suspense>} />
    <Route path="/video-2" element={<Suspense fallback={<TunnelFallback />}><NurturingVideo numero={2} /></Suspense>} />
    <Route path="/video-3" element={<Suspense fallback={<TunnelFallback />}><NurturingVideo numero={3} /></Suspense>} />
  </>
);
