import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute, PublicOnlyRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Checkout from "./pages/checkout/Checkout";
import MerciPage from "./pages/checkout/MerciPage";
import AcompteCheckout from "./pages/checkout/AcompteCheckout";
import MerciAcomptePage from "./pages/checkout/MerciAcomptePage";
import LibertyCheckout from "./pages/checkout/LibertyCheckout";
import MerciLibertyPage from "./pages/checkout/MerciLibertyPage";
import RebillCheckout from "./pages/checkout/RebillCheckout";
import PaymentLinkCheckout from "./pages/checkout/PaymentLinkCheckout";
import FormationCheckout from "./pages/checkout/FormationCheckout";
import DashboardLayout from "./components/DashboardLayout";
import ApporteurLayout from "./components/ApporteurLayout";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import Calls from "./pages/Calls";
import Contacts from "./pages/Contacts";
import Sales from "./pages/Sales";
import Payments from "./pages/Payments";
import MyCommissions from "./pages/MyCommissions";
import Profile from "./pages/Profile";
import AdminInvoices from "./pages/AdminInvoices";
import AdminCommissions from "./pages/AdminCommissions";
import AdminData from "./pages/AdminData";
import AdminCreateWizard from "./pages/AdminCreateWizard";
import AdminTeam from "./pages/AdminTeam";
import NotFound from "./pages/NotFound";
import AdminCoaching from "./pages/AdminCoaching";
// Coaching, CoachingSession, MonCoaching, SessionDetail : « Évaluations » et
// « Historique » masqués le 20/05/2026 (demande CEO). Pages conservées sur
// disque mais retirées du routing — leurs routes redirigent vers le calendrier.
import ApporteurDashboard from "./pages/apporteur/ApporteurDashboard";
import ApporteurLeads from "./pages/apporteur/ApporteurLeads";
import ApporteurSales from "./pages/apporteur/ApporteurSales";
import ApporteurCommissions from "./pages/apporteur/ApporteurCommissions";
import ApporteurProfile from "./pages/apporteur/ApporteurProfile";
import ApporteurOnboarding from "./pages/apporteur/ApporteurOnboarding";
import Scripts from "./pages/working/Scripts";
import MyActivity from "./pages/working/MyActivity";
import AgentIA from "./pages/working/AgentIA";
import TrainingList from "./pages/training/TrainingList";
import FormationDetail from "./pages/training/FormationDetail";
import ChapterViewer from "./pages/training/ChapterViewer";
import AdminTrainingList from "./pages/training/admin/AdminTrainingList";
import FormationEditor from "./pages/training/admin/FormationEditor";
import ChapitreEditor from "./pages/training/admin/ChapitreEditor";
import AdminScriptList from "./pages/admin/scripts/AdminScriptList";
import ScriptEditor from "./pages/admin/scripts/ScriptEditor";
import AdminAgentKnowledge from "./pages/admin/agent-knowledge/AdminAgentKnowledge";
import RolePlay from "./pages/training/RolePlay";
import RolePlayAdmin from "./pages/admin/role-play/RolePlayAdmin";
import QuizList from "./pages/training/QuizList";
import QuizPage from "./pages/training/QuizPage";
import AdminQuizList from "./pages/admin/quizzes/AdminQuizList";
import AdminTrainingHub from "./pages/admin/training/AdminTrainingHub";
import AdminStudentTracking from "./pages/admin/training/AdminStudentTracking";
import AdminTrainingAccess from "./pages/admin/training/AdminTrainingAccess";
import StudentDetailPage from "./pages/admin/training/StudentDetailPage";
import MyCertificates from "./pages/training/MyCertificates";
import AdminCertificates from "./pages/admin/training/AdminCertificates";
import VerifyCertificate from "./pages/public/VerifyCertificate";
import LeadQuiz from "./pages/public/lead-quiz/LeadQuiz";
import Echo from "./pages/public/Echo";
import ScoringStart from "./pages/public/scoring/ScoringStart";
import ScoringQuiz from "./pages/public/scoring/ScoringQuiz";
import AdminLeadScoring from "./pages/admin/lead-scoring/AdminLeadScoring";
import RedifConference from "./pages/public/redif/RedifConference";
import AdminConferences from "./pages/admin/conferences/AdminConferences";
import RdvIntro from "./pages/public/rdv/RdvIntro";
import RdvCoordonnees from "./pages/public/rdv/RdvCoordonnees";
import RdvQuestions from "./pages/public/rdv/RdvQuestions";
import RdvDisqualification from "./pages/public/rdv/RdvDisqualification";
import RdvCalendly from "./pages/public/rdv/RdvCalendly";
import CoachingCalendar from "./pages/coaching/CoachingCalendar";
import { PassGuard } from "./components/PassGuard";
import { FeatureGate } from "./components/FeatureGate";
import SharedLayout from "./components/SharedLayout";
import ParcoursView from "./pages/parcours/ParcoursView";
import ParcoursChapitreDetail from "./pages/parcours/ParcoursChapitreDetail";
import OrganisationPage from "./pages/working/organisation/OrganisationPage";
import PersonalBrandPage from "./pages/working/personal-brand/PersonalBrandPage";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import AdminAnnouncements from "./pages/admin/announcements/AdminAnnouncements";
import AdminCalendlyWebhooks from "./pages/admin/webhooks/AdminCalendlyWebhooks";
import AdminPaymentLinks from "./pages/admin/payment-links/AdminPaymentLinks";
import CampaignTracking from "./pages/admin/invitations/CampaignTracking";
import AdminParcoursList from "./pages/admin/parcours/AdminParcoursList";
import ParcoursEditor from "./pages/admin/parcours/ParcoursEditor";
import ParcoursChapitreEditor from "./pages/admin/parcours/ParcoursChapitreEditor";
import AnnouncementDetail from "./pages/announcements/AnnouncementDetail";
import AdminQuizLead from "./pages/admin/quiz-lead/AdminQuizLead";
import ContractPreview from "./pages/admin/contracts/ContractPreview";
import AdminContracts from "./pages/admin/contracts/AdminContracts";
import MyContract from "./pages/contract/MyContract";
import ContractLandingPage from "./pages/contract/ContractLandingPage";
import StudioHome from "./pages/studio/StudioHome";
import StudioProject from "./pages/studio/StudioProject";
import { StudioGate } from "./components/StudioGate";
import DiscordCallback from "./pages/discord/DiscordCallback";
import AdminDiscord from "./pages/admin/discord/AdminDiscord";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <ImpersonationBanner />
            <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/verify/:number" element={<VerifyCertificate />} />
              <Route path="/quiz/:slug" element={<LeadQuiz />} />
              <Route path="/echo" element={<Echo />} />
              <Route path="/scoring/start" element={<ScoringStart />} />
              <Route path="/scoring/quiz" element={<ScoringQuiz />} />
              <Route path="/rdv" element={<RdvIntro />} />
              <Route path="/rdv/coordonnees" element={<RdvCoordonnees />} />
              <Route path="/rdv/questions" element={<RdvQuestions />} />
              <Route path="/rdv/disqualification/:slug" element={<RdvDisqualification />} />
              <Route path="/rdv/calendly" element={<RdvCalendly />} />
              <Route path="/redif/:token" element={<RedifConference />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/checkout/:installments" element={<Checkout />} />
              <Route path="/merci" element={<MerciPage />} />
              <Route path="/acompte/:montant" element={<AcompteCheckout />} />
              <Route path="/merci-acompte" element={<MerciAcomptePage />} />
              <Route path="/liberty" element={<LibertyCheckout />} />
              <Route path="/liberty/:installments" element={<LibertyCheckout />} />
              <Route path="/merci-liberty" element={<MerciLibertyPage />} />
              <Route path="/rebill/:token" element={<RebillCheckout />} />
              <Route path="/pay/:token" element={<PaymentLinkCheckout />} />
              <Route path="/checkout/formation/:slug" element={<FormationCheckout />} />
              <Route path="/checkout/formation/:slug/:installments" element={<FormationCheckout />} />
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
                  <Route path="/admin/invoices" element={<AdminInvoices />} />
                  <Route path="/admin/commissions" element={<AdminCommissions />} />
                  <Route path="/admin/payment-links" element={<AdminPaymentLinks />} />
                  <Route path="/admin/conferences" element={<AdminConferences />} />
                  <Route path="/admin/team" element={<AdminTeam />} />
                  <Route path="/admin/announcements" element={<AdminAnnouncements />} />
                  <Route path="/admin/quiz-lead" element={<AdminQuizLead />} />
                  <Route path="/admin/contracts" element={<AdminContracts />} />
                  <Route path="/admin/contracts/preview" element={<ContractPreview />} />
                  <Route path="/admin/contracts/preview/:templateKey" element={<ContractPreview />} />
                  <Route path="/admin/lead-scoring" element={<AdminLeadScoring />} />
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
                  <Route path="/working" element={<Navigate to="/working/activity" replace />} />
                  <Route path="/admin/training" element={<AdminTrainingList />} />
                  <Route path="/admin/training/:slug" element={<FormationEditor />} />
                  <Route path="/admin/training/:slug/chapitre/:chapitreId" element={<ChapitreEditor />} />
                  <Route path="/admin/scripts" element={<AdminScriptList />} />
                  <Route path="/admin/scripts/:id" element={<ScriptEditor />} />
                  <Route path="/admin/agent-knowledge" element={<AdminAgentKnowledge />} />
                  <Route path="/admin/role-play" element={<RolePlayAdmin />} />
                  <Route path="/admin/quizzes" element={<AdminQuizList />} />
                  <Route path="/admin/training/manage" element={<AdminTrainingHub />} />
                  <Route path="/admin/training/students" element={<AdminStudentTracking />} />
                  <Route path="/admin/training/access" element={<AdminTrainingAccess />} />
                  <Route path="/admin/training/students/:userId" element={<StudentDetailPage />} />
                  <Route path="/admin/training/certificates" element={<AdminCertificates />} />
                  <Route path="/training/scripts/setting" element={<Navigate to="/training/scripts" replace />} />
                  <Route path="/training/scripts/closing" element={<Navigate to="/training/scripts" replace />} />
                </Route>
                {/* Apporteur layout (only /my-space/* lives here exclusively) */}
                <Route element={<ApporteurLayout />}>
                  <Route path="/my-space" element={<ApporteurDashboard />} />
                  <Route path="/my-space/leads" element={<ApporteurLeads />} />
                  <Route path="/my-space/sales" element={<ApporteurSales />} />
                  <Route path="/my-space/commissions" element={<ApporteurCommissions />} />
                  <Route path="/my-space/profile" element={<ApporteurProfile />} />
                  <Route path="/my-space/coaching-calendar" element={<PassGuard allowStaff={false}><CoachingCalendar /></PassGuard>} />
                </Route>
                {/* Shared routes: layout chosen by role at runtime (pure apporteur → ApporteurLayout, else DashboardLayout) */}
                <Route element={<SharedLayout />}>
                  <Route path="/announcements/:id" element={<AnnouncementDetail />} />
                  <Route path="/contract" element={<ContractLandingPage />} />
                  <Route path="/contracts" element={<ContractLandingPage />} />
                  <Route path="/contract/:contractId" element={<MyContract />} />
                  <Route path="/training" element={<TrainingList />} />
                  <Route path="/training/certificats" element={<MyCertificates />} />
                  {/* Scripts / Rôle-Play / Quiz : ouverts à CEO/collab toujours,
                      et aux apporteurs disposant d'un pass AL BARAKA ou Liberty.
                      PassGuard avec allowCollab pour ne pas bloquer les collab simples. */}
                  <Route path="/training/scripts" element={<PassGuard allowCollab><Scripts /></PassGuard>} />
                  <Route path="/training/role-play" element={<PassGuard allowCollab><RolePlay /></PassGuard>} />
                  <Route path="/training/quiz" element={<PassGuard allowCollab><QuizList /></PassGuard>} />
                  <Route path="/training/quiz/:id" element={<PassGuard allowCollab><QuizPage /></PassGuard>} />
                  <Route path="/training/:slug" element={<FormationDetail />} />
                  <Route path="/training/:slug/chapitre/:chapitreId" element={<ChapterViewer />} />
                  {/* « Historique » masqué (20/05/2026) — redirige vers le calendrier */}
                  <Route path="/mon-coaching" element={<Navigate to="/coaching/calendar" replace />} />
                  <Route path="/mon-coaching/session/:sessionId" element={<Navigate to="/coaching/calendar" replace />} />
                  <Route path="/coaching/calendar" element={<PassGuard><CoachingCalendar /></PassGuard>} />
                  <Route path="/parcours/:slug" element={<PassGuard><ParcoursView /></PassGuard>} />
                  <Route path="/parcours/:slug/chapitre/:chapitreId" element={<PassGuard><ParcoursChapitreDetail /></PassGuard>} />
                  <Route path="/working/activity" element={<FeatureGate feature="working_activity"><MyActivity /></FeatureGate>} />
                  <Route path="/working/organisation" element={<FeatureGate feature="quiz_organisation"><OrganisationPage /></FeatureGate>} />
                  <Route path="/working/personal-brand" element={<PassGuard><PersonalBrandPage /></PassGuard>} />
                  <Route path="/working/agent" element={<PassGuard><AgentIA /></PassGuard>} />
                  {/* Studio Albaraka (B1 du 20/05/2026) — gaté à CEO + Sidali Test */}
                  <Route path="/studio" element={<StudioGate><StudioHome /></StudioGate>} />
                  <Route path="/studio/projects/:projectId" element={<StudioGate><StudioProject /></StudioGate>} />
                </Route>
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
