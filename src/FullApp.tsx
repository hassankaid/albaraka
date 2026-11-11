// La plateforme (CRM, espace élève, admin…). Chargée À LA DEMANDE depuis
// App.tsx : le domaine des tunnels ne la télécharge jamais. Chaque page est
// elle-même chargée au moment où on l'ouvre (audit performance, 11/11/2026 :
// tout tenait avant dans un seul fichier de 2,4 Mo compressé).
import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { NouvelleVersion } from "@/components/NouvelleVersion";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute, PublicOnlyRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import PiedDePageLegal from "./components/legal/PiedDePageLegal";
import PiedDePageLegalApplication from "./components/legal/PiedDePageLegalApplication";
import { MENTIONS_LEGALES, POLITIQUE_CONFIDENTIALITE, CGV } from "./pages/legal/textes";
import DashboardLayout from "./components/DashboardLayout";
import ApporteurLayout from "./components/ApporteurLayout";
// Coaching, CoachingSession, MonCoaching, SessionDetail : « Évaluations » et
// « Historique » masqués le 20/05/2026 (demande CEO). Pages conservées sur
// disque mais retirées du routing — leurs routes redirigent vers le calendrier.
import { PassGuard } from "./components/PassGuard";
import { FeatureGate } from "./components/FeatureGate";
import SharedLayout from "./components/SharedLayout";
import { LibertyModuleFrame } from "./components/parcours/LibertyModuleFrame";
import { DestinationsNicheContext, DESTINATIONS_NOUVEAU_PARCOURS } from "./pages/parcours/liberty/m1-niche/lib/destinations";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { isAppHost } from "./lib/hosts";
import { routesLegales, tunnelRoutes } from "./routesPartagees";
import { ChargementPage } from "@/components/ChargementPage";

const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Checkout = lazy(() => import("./pages/checkout/Checkout"));
const MerciPage = lazy(() => import("./pages/checkout/MerciPage"));
const AcompteCheckout = lazy(() => import("./pages/checkout/AcompteCheckout"));
const MerciAcomptePage = lazy(() => import("./pages/checkout/MerciAcomptePage"));
const LibertyCheckout = lazy(() => import("./pages/checkout/LibertyCheckout"));
const MerciLibertyPage = lazy(() => import("./pages/checkout/MerciLibertyPage"));
const RebillCheckout = lazy(() => import("./pages/checkout/RebillCheckout"));
const UpdateCard = lazy(() => import("./pages/checkout/UpdateCard"));
const UpdateCardMerci = lazy(() => import("./pages/checkout/UpdateCardMerci"));
const PaymentLinkCheckout = lazy(() => import("./pages/checkout/PaymentLinkCheckout"));
const CoachingCheckout = lazy(() => import("./pages/checkout/CoachingCheckout"));
const CoachingConfirmation = lazy(() => import("./pages/checkout/CoachingConfirmation"));
const FormationCheckout = lazy(() => import("./pages/checkout/FormationCheckout"));
const AlBaraka200Checkout = lazy(() => import("./pages/checkout/AlBaraka200Checkout"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Leads = lazy(() => import("./pages/Leads"));
const Calls = lazy(() => import("./pages/Calls"));
const Contacts = lazy(() => import("./pages/Contacts"));
const Sales = lazy(() => import("./pages/Sales"));
const Payments = lazy(() => import("./pages/Payments"));
const MyCommissions = lazy(() => import("./pages/MyCommissions"));
const Profile = lazy(() => import("./pages/Profile"));
const AdminInvoices = lazy(() => import("./pages/AdminInvoices"));
const AbTests = lazy(() => import("./pages/AbTests"));
const AdminCommissions = lazy(() => import("./pages/AdminCommissions"));
const AdminData = lazy(() => import("./pages/AdminData"));
const AdminCreateWizard = lazy(() => import("./pages/AdminCreateWizard"));
const AdminTeam = lazy(() => import("./pages/AdminTeam"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminCoaching = lazy(() => import("./pages/AdminCoaching"));
const ApporteurDashboard = lazy(() => import("./pages/apporteur/ApporteurDashboard"));
const MonTunnel = lazy(() => import("./pages/apporteur/MonTunnel"));
const ApporteurLeads = lazy(() => import("./pages/apporteur/ApporteurLeads"));
const ApporteurSales = lazy(() => import("./pages/apporteur/ApporteurSales"));
const ApporteurCommissions = lazy(() => import("./pages/apporteur/ApporteurCommissions"));
const ApporteurProfile = lazy(() => import("./pages/apporteur/ApporteurProfile"));
const ApporteurOnboarding = lazy(() => import("./pages/apporteur/ApporteurOnboarding"));
const Scripts = lazy(() => import("./pages/working/Scripts"));
const Ressources = lazy(() => import("./pages/training/Ressources"));
const ScriptAppelPage = lazy(() => import("./pages/training/script-appel/ScriptAppelPage"));
const OutilLibertyPage = lazy(() => import("./pages/liberty/OutilLibertyPage"));
const Plan90Page = lazy(() => import("./pages/working/plan90/Plan90Page"));
const MyActivity = lazy(() => import("./pages/working/MyActivity"));
const AgentIA = lazy(() => import("./pages/working/AgentIA"));
const TrainingList = lazy(() => import("./pages/training/TrainingList"));
const FormationDetail = lazy(() => import("./pages/training/FormationDetail"));
const ChapterViewer = lazy(() => import("./pages/training/ChapterViewer"));
const AdminTrainingList = lazy(() => import("./pages/training/admin/AdminTrainingList"));
const FormationEditor = lazy(() => import("./pages/training/admin/FormationEditor"));
const ChapitreEditor = lazy(() => import("./pages/training/admin/ChapitreEditor"));
const AdminScriptList = lazy(() => import("./pages/admin/scripts/AdminScriptList"));
const ScriptEditor = lazy(() => import("./pages/admin/scripts/ScriptEditor"));
const AdminAgentKnowledge = lazy(() => import("./pages/admin/agent-knowledge/AdminAgentKnowledge"));
const AdminConsommationIA = lazy(() => import("./pages/admin/ia/AdminConsommationIA"));
const RolePlay = lazy(() => import("./pages/training/RolePlay"));
const RolePlayAdmin = lazy(() => import("./pages/admin/role-play/RolePlayAdmin"));
const QuizList = lazy(() => import("./pages/training/QuizList"));
const QuizPage = lazy(() => import("./pages/training/QuizPage"));
const AdminQuizList = lazy(() => import("./pages/admin/quizzes/AdminQuizList"));
const AdminTrainingHub = lazy(() => import("./pages/admin/training/AdminTrainingHub"));
const AdminStudentTracking = lazy(() => import("./pages/admin/training/AdminStudentTracking"));
const AdminTrainingAccess = lazy(() => import("./pages/admin/training/AdminTrainingAccess"));
const StudentDetailPage = lazy(() => import("./pages/admin/training/StudentDetailPage"));
const MyCertificates = lazy(() => import("./pages/training/MyCertificates"));
const AdminCertificates = lazy(() => import("./pages/admin/training/AdminCertificates"));
const VerifyCertificate = lazy(() => import("./pages/public/VerifyCertificate"));
const LeadQuiz = lazy(() => import("./pages/public/lead-quiz/LeadQuiz"));
const Echo = lazy(() => import("./pages/public/Echo"));
const ScoringStart = lazy(() => import("./pages/public/scoring/ScoringStart"));
const ScoringQuiz = lazy(() => import("./pages/public/scoring/ScoringQuiz"));
const AdminLeadScoring = lazy(() => import("./pages/admin/lead-scoring/AdminLeadScoring"));
const AdminQuestionnaire = lazy(() => import("./pages/admin/questionnaire/AdminQuestionnaire"));
const RedifConference = lazy(() => import("./pages/public/redif/RedifConference"));
const AdminConferences = lazy(() => import("./pages/admin/conferences/AdminConferences"));
const Questionnaire = lazy(() => import("./pages/public/questionnaire/Questionnaire"));
const QuestionnaireEntree = lazy(() => import("./pages/public/questionnaire/QuestionnaireEntree"));
const RdvIntro = lazy(() => import("./pages/public/rdv/RdvIntro"));
const RdvCoordonnees = lazy(() => import("./pages/public/rdv/RdvCoordonnees"));
const RdvQuestions = lazy(() => import("./pages/public/rdv/RdvQuestions"));
const RdvDisqualification = lazy(() => import("./pages/public/rdv/RdvDisqualification"));
const RdvCalendly = lazy(() => import("./pages/public/rdv/RdvCalendly"));
const CoachingCalendar = lazy(() => import("./pages/coaching/CoachingCalendar"));
const ParcoursView = lazy(() => import("./pages/parcours/ParcoursView"));
const ParcoursChapitreDetail = lazy(() => import("./pages/parcours/ParcoursChapitreDetail"));
const M1NichePage = lazy(() => import("./pages/parcours/liberty/m1-niche/M1NichePage"));
const M2PsychologiePage = lazy(() => import("./pages/parcours/liberty/m2-psychologie/M2PsychologiePage"));
const M3AnatomiePage = lazy(() => import("./pages/parcours/liberty/m3-anatomie/M3AnatomiePage"));
const M4ValueLadderPage = lazy(() => import("./pages/parcours/liberty/m4-value-ladder/M4ValueLadderPage"));
const M5HighTicketPage = lazy(() => import("./pages/parcours/liberty/m5-high-ticket/M5HighTicketPage"));
const M6PricingPage = lazy(() => import("./pages/parcours/liberty/m6-pricing/M6PricingPage"));
const M7GarantiePage = lazy(() => import("./pages/parcours/liberty/m7-garantie/M7GarantiePage"));
const M8PreuveSocialePage = lazy(() => import("./pages/parcours/liberty/m8-preuve-sociale/M8PreuveSocialePage"));
const M11ConcevoirProgrammePage = lazy(() => import("./pages/parcours/liberty/m11-concevoir-programme/M11ConcevoirProgrammePage"));
const M12NamingPage = lazy(() => import("./pages/parcours/liberty/m12-naming/M12NamingPage"));
const M13BilanPage = lazy(() => import("./pages/parcours/liberty/m13-bilan/M13BilanPage"));
const M14MiddleTicketPage = lazy(() => import("./pages/parcours/liberty/m14-middle-ticket/M14MiddleTicketPage"));
const M16LowTicketPage = lazy(() => import("./pages/parcours/liberty/m16-low-ticket/M16LowTicketPage"));
const M18ValueLadderPage = lazy(() => import("./pages/parcours/liberty/m18-value-ladder/M18ValueLadderPage"));
const OrganisationPage = lazy(() => import("./pages/working/organisation/OrganisationPage"));
const AdminAnnouncements = lazy(() => import("./pages/admin/announcements/AdminAnnouncements"));
const AdminCalendlyWebhooks = lazy(() => import("./pages/admin/webhooks/AdminCalendlyWebhooks"));
const AdminPaymentLinks = lazy(() => import("./pages/admin/payment-links/AdminPaymentLinks"));
const LienDePaiement = lazy(() => import("./pages/working/LienDePaiement"));
const CampaignTracking = lazy(() => import("./pages/admin/invitations/CampaignTracking"));
const AdminParcoursList = lazy(() => import("./pages/admin/parcours/AdminParcoursList"));
const ParcoursEditor = lazy(() => import("./pages/admin/parcours/ParcoursEditor"));
const ParcoursChapitreEditor = lazy(() => import("./pages/admin/parcours/ParcoursChapitreEditor"));
const AnnouncementDetail = lazy(() => import("./pages/announcements/AnnouncementDetail"));
const AdminQuizLead = lazy(() => import("./pages/admin/quiz-lead/AdminQuizLead"));
const ContractPreview = lazy(() => import("./pages/admin/contracts/ContractPreview"));
const AdminContracts = lazy(() => import("./pages/admin/contracts/AdminContracts"));
const MyContract = lazy(() => import("./pages/contract/MyContract"));
const ContractLandingPage = lazy(() => import("./pages/contract/ContractLandingPage"));
const DiscordCallback = lazy(() => import("./pages/discord/DiscordCallback"));
const AdminDiscord = lazy(() => import("./pages/admin/discord/AdminDiscord"));
const AdminSiteVitrine = lazy(() => import("./pages/admin/site-vitrine/AdminSiteVitrine"));
const StudioGate = lazy(() => import("./pages/studio/StudioGate"));
const StudioAccueil = lazy(() => import("./pages/studio/StudioAccueil"));
const StudioFaceCamera = lazy(() => import("./pages/studio/StudioFaceCamera"));
const StudioMontage = lazy(() => import("./pages/studio/StudioMontage"));
const StudioBanque = lazy(() => import("./pages/studio/StudioBanque"));
const StudioVoixOff = lazy(() => import("./pages/studio/StudioVoixOff"));
const StudioScripts = lazy(() => import("./pages/studio/StudioScripts"));
const StudioScriptsGerer = lazy(() => import("./pages/studio/StudioScriptsGerer"));
const StudioAbonnement = lazy(() => import("./pages/studio/StudioAbonnement"));
const AnalyseAppels = lazy(() => import("./pages/coaching/AnalyseAppels"));
const AnalyseAppel = lazy(() => import("./pages/coaching/AnalyseAppel"));
const AdminEmailCampaign = lazy(() => import("./pages/admin/email-campaigns/AdminEmailCampaign"));
const AdminSmsCampaign = lazy(() => import("./pages/admin/email-campaigns/AdminSmsCampaign"));

// Réglages par défaut des requêtes : une donnée lue il y a moins de 30 s est
// réutilisée telle quelle (navigation entre pages instantanée), et une erreur
// n'est retentée qu'une fois au lieu de trois. Les écrans qui modifient des
// données invalident déjà leurs requêtes.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

const FullApp = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <NouvelleVersion />
        <BrowserRouter>
          <AuthProvider>
            <ImpersonationBanner />
            <Suspense fallback={<ChargementPage />}>
            <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/verify/:number" element={<VerifyCertificate />} />
              <Route path="/quiz/:slug" element={<LeadQuiz />} />
              <Route path="/echo" element={<Echo />} />
              <Route path="/scoring/start" element={<ScoringStart />} />
              <Route path="/scoring/quiz" element={<ScoringQuiz />} />
              {/* Questionnaire clients : le jeton du lien identifie la personne,
                  aucune connexion n'est demandée. */}
              <Route path="/questionnaire/:token" element={<Questionnaire />} />
              {/* Sans jeton : l'annonce Discord ne peut pas en porter un.
                  On renvoie le lien personnel par e-mail. */}
              <Route path="/questionnaire" element={<QuestionnaireEntree />} />
              <Route path="/rdv" element={<RdvIntro />} />
              <Route path="/rdv/coordonnees" element={<RdvCoordonnees />} />
              <Route path="/rdv/questions" element={<RdvQuestions />} />
              <Route path="/rdv/disqualification/:slug" element={<RdvDisqualification />} />
              <Route path="/rdv/calendly" element={<RdvCalendly />} />
              {/* Même funnel, autre issue : /rdv-rediffusion accompagne les pages
                  de rediffusion et débouche sur l'événement Calendly dédié. */}
              <Route path="/rdv-rediffusion" element={<RdvIntro />} />
              <Route path="/rdv-rediffusion/coordonnees" element={<RdvCoordonnees />} />
              <Route path="/rdv-rediffusion/questions" element={<RdvQuestions />} />
              <Route path="/rdv-rediffusion/disqualification/:slug" element={<RdvDisqualification />} />
              <Route path="/rdv-rediffusion/calendly" element={<RdvCalendly />} />
              <Route path="/redif/:token" element={<RedifConference />} />
              {/* ── Tunnels natifs (remplacent Systeme.io) ──
                  Servis ici uniquement hors domaines de l'app (local, preview).
                  En prod ils vivent sur event.albarakaecosysteme.com. */}
              {isAppHost() ? null : tunnelRoutes}
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/checkout/:installments" element={<Checkout />} />
              <Route path="/merci" element={<MerciPage />} />
              <Route path="/acompte/:montant" element={<AcompteCheckout />} />
              <Route path="/merci-acompte" element={<MerciAcomptePage />} />
              <Route path="/liberty" element={<LibertyCheckout />} />
              <Route path="/liberty/:installments" element={<LibertyCheckout />} />
              <Route path="/merci-liberty" element={<MerciLibertyPage />} />
              <Route path="/rebill/:token" element={<RebillCheckout />} />
              <Route path="/update-card/merci" element={<UpdateCardMerci />} />
              <Route path="/update-card/:token" element={<UpdateCard />} />
              <Route path="/pay/:token" element={<PaymentLinkCheckout />} />
              <Route path="/checkout/formation/:slug" element={<FormationCheckout />} />
              <Route path="/checkout/formation/:slug/:installments" element={<FormationCheckout />} />
              {/* Offre « Al Baraka 200 €/mois » — 2 400 € en 1× à 12× (12 par
                  défaut). Le chemin passe par /checkout/ et non /al-baraka-200/ :
                  ce dernier préfixe est renvoyé vers introuvable.html sur le
                  domaine de l'app (vercel.json), il n'existe que sur event. */}
              {/* Coaching individuel payant (03/11/2026) : le lien posté sur Discord. */}
              <Route path="/checkout/coaching" element={<CoachingCheckout />} />
              <Route path="/checkout/coaching/:slug" element={<CoachingCheckout />} />
              <Route path="/coaching/confirmation" element={<CoachingConfirmation />} />
              <Route path="/checkout/al-baraka-200" element={<AlBaraka200Checkout />} />
              <Route path="/checkout/al-baraka-200/:installments" element={<AlBaraka200Checkout />} />
              <Route element={<ProtectedRoute />}>
                {/* Onboarding (no layout) */}
                <Route path="/onboarding" element={<ApporteurOnboarding />} />
                {/* Discord OAuth callback (no layout — page transitoire) */}
                <Route path="/discord/callback" element={<DiscordCallback />} />
                {/* Team layout (CEO + Collaborateur) */}
                <Route element={<DashboardLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/leads" element={<Leads />} />
                  <Route path="/calls" element={<Calls />} />
                  <Route path="/contacts" element={<Contacts />} />
                  <Route path="/sales" element={<Sales />} />
                  <Route path="/payments" element={<Payments />} />
                  <Route path="/my-commissions" element={<MyCommissions />} />
                  <Route path="/ab-tests" element={<AbTests />} />
                  <Route path="/admin/invoices" element={<AdminInvoices />} />
                  <Route path="/admin/commissions" element={<AdminCommissions />} />
                  <Route path="/admin/payment-links" element={<AdminPaymentLinks />} />
                  <Route path="/admin/conferences" element={<AdminConferences />} />
                  <Route path="/admin/site-vitrine" element={<AdminSiteVitrine />} />
                  {/* Studio : banque de vidéos et gestion des scripts, CEO uniquement */}
                  <Route path="/studio/banque" element={<StudioGate ceo><StudioBanque /></StudioGate>} />
                  <Route path="/studio/scripts/gerer" element={<StudioGate ceo><StudioScriptsGerer /></StudioGate>} />
                  <Route path="/admin/team" element={<AdminTeam />} />
                  <Route path="/admin/announcements" element={<AdminAnnouncements />} />
                  <Route path="/admin/quiz-lead" element={<AdminQuizLead />} />
                  <Route path="/admin/contracts" element={<AdminContracts />} />
                  <Route path="/admin/contracts/preview" element={<ContractPreview />} />
                  <Route path="/admin/contracts/preview/:templateKey" element={<ContractPreview />} />
                  <Route path="/admin/lead-scoring" element={<AdminLeadScoring />} />
                  <Route path="/admin/questionnaire" element={<AdminQuestionnaire />} />
                  <Route path="/admin/invitations" element={<Navigate to="/admin/training/access" replace />} />
                  <Route path="/admin/invitations/campaign" element={<CampaignTracking />} />
                  <Route path="/admin/webhooks/calendly" element={<AdminCalendlyWebhooks />} />
                  <Route path="/admin/parcours" element={<AdminParcoursList />} />
                  <Route path="/admin/parcours/:slug" element={<ParcoursEditor />} />
                  <Route path="/admin/parcours/:slug/chapitre/:chapitreId" element={<ParcoursChapitreEditor />} />
                  <Route path="/admin/data" element={<AdminData />} />
                  <Route path="/admin/create" element={<AdminCreateWizard />} />
                  <Route path="/profile" element={<Profile />} />
                  {/* « Évaluations » masqué (20/05/2026) — redirige vers le calendrier */}
                  <Route path="/coaching" element={<Navigate to="/coaching/calendar" replace />} />
                  <Route path="/coaching/session/:sessionId" element={<Navigate to="/coaching/calendar" replace />} />
                  <Route path="/admin/coaching" element={<AdminCoaching />} />
                  <Route path="/admin/discord" element={<AdminDiscord />} />
                  <Route path="/admin/email-campaign" element={<AdminEmailCampaign />} />
                  <Route path="/admin/sms-campaign" element={<AdminSmsCampaign />} />
                  <Route path="/working" element={<Navigate to="/working/activity" replace />} />
                  <Route path="/admin/training" element={<AdminTrainingList />} />
                  <Route path="/admin/training/:slug" element={<FormationEditor />} />
                  <Route path="/admin/training/:slug/chapitre/:chapitreId" element={<ChapitreEditor />} />
                  <Route path="/admin/scripts" element={<AdminScriptList />} />
                  <Route path="/admin/scripts/:id" element={<ScriptEditor />} />
                  <Route path="/admin/agent-knowledge" element={<AdminAgentKnowledge />} />
                  <Route path="/admin/ia" element={<AdminConsommationIA />} />
                  <Route path="/admin/role-play" element={<RolePlayAdmin />} />
                  <Route path="/admin/quizzes" element={<AdminQuizList />} />
                  <Route path="/admin/training/manage" element={<AdminTrainingHub />} />
                  <Route path="/admin/training/students" element={<AdminStudentTracking />} />
                  <Route path="/admin/training/access" element={<AdminTrainingAccess />} />
                  <Route path="/admin/training/students/:userId" element={<StudentDetailPage />} />
                  <Route path="/admin/training/certificates" element={<AdminCertificates />} />
                  <Route path="/training/scripts/setting" element={<Navigate to="/training/ressources" replace />} />
                  <Route path="/training/scripts/closing" element={<Navigate to="/training/ressources" replace />} />
                </Route>
                {/* Apporteur layout (only /my-space/* lives here exclusively) */}
                <Route element={<ApporteurLayout />}>
                  <Route path="/my-space" element={<ApporteurDashboard />} />
                  <Route path="/my-space/tunnel" element={<MonTunnel />} />
                  <Route path="/my-space/leads" element={<ApporteurLeads />} />
                  <Route path="/my-space/sales" element={<ApporteurSales />} />
                  <Route path="/my-space/commissions" element={<ApporteurCommissions />} />
                  <Route path="/my-space/profile" element={<ApporteurProfile />} />
                  <Route path="/my-space/coaching-calendar" element={<PassGuard allowStaff={false}><CoachingCalendar /></PassGuard>} />
                </Route>
                {/* Shared routes: layout chosen by role at runtime (pure apporteur → ApporteurLayout, else DashboardLayout) */}
                <Route element={<SharedLayout />}>
                  {/* Studio vidéo : élèves du Pass AL BARAKA et Liberty (Sidali, 13/10/2026), la base décide (studio_ouvert) */}
                  <Route path="/studio" element={<StudioGate><StudioAccueil /></StudioGate>} />
                  <Route path="/studio/face-camera" element={<StudioGate><StudioFaceCamera /></StudioGate>} />
                  <Route path="/studio/montage/:id" element={<StudioGate><StudioMontage /></StudioGate>} />
                  <Route path="/studio/hybride" element={<StudioGate><StudioFaceCamera outil="hybride" /></StudioGate>} />
                  <Route path="/studio/voix-off" element={<StudioGate><StudioVoixOff /></StudioGate>} />
                  <Route path="/studio/scripts" element={<StudioGate><StudioScripts /></StudioGate>} />
                  <Route path="/studio/abonnement" element={<StudioGate><StudioAbonnement /></StudioGate>} />
                  <Route path="/announcements/:id" element={<AnnouncementDetail />} />
                  <Route path="/contract" element={<ContractLandingPage />} />
                  <Route path="/contracts" element={<ContractLandingPage />} />
                  <Route path="/contract/:contractId" element={<MyContract />} />
                  <Route path="/training" element={<TrainingList />} />
                  <Route path="/training/certificats" element={<MyCertificates />} />
                  {/* Scripts / Rôle-Play / Quiz : ouverts à CEO/collab toujours,
                      et aux apporteurs disposant d'un pass AL BARAKA ou Liberty.
                      PassGuard avec allowCollab pour ne pas bloquer les collab simples. */}
                  {/* « Scripts » devient « Ressources » (Sidali, 13/10/2026) ; les scripts en ligne restent accessibles depuis Setting et Closing. */}
                  <Route path="/training/scripts" element={<Navigate to="/training/ressources" replace />} />
                  <Route path="/training/ressources" element={<PassGuard allowCollab><Ressources /></PassGuard>} />
                  <Route path="/training/scripts-en-ligne" element={<PassGuard allowCollab><Scripts /></PassGuard>} />
                  {/* Script Forge retiré (Sidali, 13/10/2026) : doublon de « Construire mon script d'appel ». */}
                  <Route path="/training/script-forge" element={<Navigate to="/training/ressources" replace />} />
                  <Route path="/training/script-appel" element={<PassGuard allowCollab><ScriptAppelPage /></PassGuard>} />
                  {/* Outils du Parcours Liberty (cahier des charges de Sidali du 15/10/2026) */}
                  <Route path="/training/parcours-liberty/outil/:code" element={<PassGuard><OutilLibertyPage /></PassGuard>} />
                  {/* « Je n'ai pas encore d'idée d'offre » (Sidali, 19/10/2026) : l'ancien outil Niche, renvoyant au nouveau parcours */}
                  <Route path="/training/parcours-liberty/trouver-mon-offre" element={<PassGuard><DestinationsNicheContext.Provider value={DESTINATIONS_NOUVEAU_PARCOURS}><M1NichePage /></DestinationsNicheContext.Provider></PassGuard>} />
                  <Route path="/working/plan-90" element={<PassGuard allowCollab><Plan90Page /></PassGuard>} />
                  <Route path="/training/role-play" element={<PassGuard allowCollab><RolePlay /></PassGuard>} />
                  <Route path="/training/quiz" element={<PassGuard allowCollab><QuizList /></PassGuard>} />
                  <Route path="/training/quiz/:id" element={<PassGuard allowCollab><QuizPage /></PassGuard>} />
                  <Route path="/training/:slug" element={<FormationDetail />} />
                  <Route path="/training/:slug/chapitre/:chapitreId" element={<ChapterViewer />} />
                  {/* « Historique » masqué (20/05/2026) — redirige vers le calendrier */}
                  <Route path="/mon-coaching" element={<Navigate to="/coaching/calendar" replace />} />
                  <Route path="/mon-coaching/session/:sessionId" element={<Navigate to="/coaching/calendar" replace />} />
                  <Route path="/coaching/calendar" element={<PassGuard><CoachingCalendar /></PassGuard>} />
                  {/* Analyse d'appels (V1 coach, 25/10/2026) : réservé aux coachs et au CEO, vérifié dans les pages */}
                  <Route path="/coaching/analyse-appels" element={<AnalyseAppels />} />
                  <Route path="/coaching/analyse-appels/:id" element={<AnalyseAppel />} />
                  <Route path="/parcours/:slug" element={<PassGuard><ParcoursView /></PassGuard>} />
                  <Route path="/parcours/:slug/chapitre/:chapitreId" element={<PassGuard><ParcoursChapitreDetail /></PassGuard>} />
                  {/* Outils interactifs Liberty (M1 → M18) */}
                  <Route path="/parcours/liberty/m1" element={<PassGuard><LibertyModuleFrame><M1NichePage /></LibertyModuleFrame></PassGuard>} />
                  <Route path="/parcours/liberty/m2" element={<PassGuard><LibertyModuleFrame><M2PsychologiePage /></LibertyModuleFrame></PassGuard>} />
                  <Route path="/parcours/liberty/m3" element={<PassGuard><LibertyModuleFrame><M3AnatomiePage /></LibertyModuleFrame></PassGuard>} />
                  <Route path="/parcours/liberty/m4" element={<PassGuard><LibertyModuleFrame><M4ValueLadderPage /></LibertyModuleFrame></PassGuard>} />
                  <Route path="/parcours/liberty/m5" element={<PassGuard><LibertyModuleFrame><M5HighTicketPage /></LibertyModuleFrame></PassGuard>} />
                  <Route path="/parcours/liberty/m6" element={<PassGuard><LibertyModuleFrame><M6PricingPage /></LibertyModuleFrame></PassGuard>} />
                  <Route path="/parcours/liberty/m7" element={<PassGuard><LibertyModuleFrame><M7GarantiePage /></LibertyModuleFrame></PassGuard>} />
                  <Route path="/parcours/liberty/m8" element={<PassGuard><LibertyModuleFrame><M8PreuveSocialePage /></LibertyModuleFrame></PassGuard>} />
                  <Route path="/parcours/liberty/m11" element={<PassGuard><LibertyModuleFrame><M11ConcevoirProgrammePage /></LibertyModuleFrame></PassGuard>} />
                  <Route path="/parcours/liberty/m12" element={<PassGuard><LibertyModuleFrame><M12NamingPage /></LibertyModuleFrame></PassGuard>} />
                  <Route path="/parcours/liberty/m13" element={<PassGuard><LibertyModuleFrame><M13BilanPage /></LibertyModuleFrame></PassGuard>} />
                  <Route path="/parcours/liberty/m14" element={<PassGuard><LibertyModuleFrame><M14MiddleTicketPage /></LibertyModuleFrame></PassGuard>} />
                  <Route path="/parcours/liberty/m16" element={<PassGuard><LibertyModuleFrame><M16LowTicketPage /></LibertyModuleFrame></PassGuard>} />
                  <Route path="/parcours/liberty/m18" element={<PassGuard><LibertyModuleFrame><M18ValueLadderPage /></LibertyModuleFrame></PassGuard>} />
                  <Route path="/working/activity" element={<FeatureGate feature="working_activity" lockedDescription="Termine la partie SETTING de ton parcours Setting/Closing pour débloquer cette section." unlockRoute="/training/parcours-setter-closer"><MyActivity /></FeatureGate>} />
                  <Route path="/working/organisation" element={<FeatureGate feature="quiz_organisation"><OrganisationPage /></FeatureGate>} />
                  {/* Personal Brand désactivé pour tout le monde (Sidali, 13/10/2026) ; données conservées. */}
                  <Route path="/working/personal-brand" element={<Navigate to="/my-space" replace />} />
                  <Route path="/working/agent" element={<FeatureGate feature="working_activity" lockedTitle="Agent IA Setting verrouillé" lockedDescription="Termine la partie SETTING de ton parcours Setting/Closing pour débloquer l'Agent IA Setting." unlockCtaLabel="Ouvrir mon parcours" unlockRoute="/training/parcours-setter-closer"><AgentIA /></FeatureGate>} />
                  <Route path="/working/lien-de-paiement" element={<LienDePaiement />} />
                </Route>
              </Route>
              {routesLegales}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
            {/* Sur l'application, uniquement sur les pages PUBLIQUES : le
                back-office n'en a pas besoin, mais /checkout, /pay, /rdv,
                /quiz et les pages légales, si. */}
            <PiedDePageLegalApplication />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default FullApp;
