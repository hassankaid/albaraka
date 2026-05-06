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
import Coaching from "./pages/Coaching";
import AdminCoaching from "./pages/AdminCoaching";
import CoachingSession from "./pages/CoachingSession";
import MonCoaching from "./pages/MonCoaching";
import SessionDetail from "./pages/SessionDetail";
import ApporteurDashboard from "./pages/apporteur/ApporteurDashboard";
import ApporteurLeads from "./pages/apporteur/ApporteurLeads";
import ApporteurSales from "./pages/apporteur/ApporteurSales";
import ApporteurCommissions from "./pages/apporteur/ApporteurCommissions";
import ApporteurProfile from "./pages/apporteur/ApporteurProfile";
import ApporteurOnboarding from "./pages/apporteur/ApporteurOnboarding";
import Working from "./pages/Working";
import Scripts from "./pages/working/Scripts";
import ContentGenerator from "./pages/working/ContentGenerator";
import MyContents from "./pages/working/MyContents";
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
import QuizFunnel from "./pages/public/quiz-funnel/QuizFunnel";
import CoachingCalendar from "./pages/coaching/CoachingCalendar";
import { PassGuard } from "./components/PassGuard";
import { FeatureGate } from "./components/FeatureGate";
import SharedLayout from "./components/SharedLayout";
import ParcoursView from "./pages/parcours/ParcoursView";
import ParcoursChapitreDetail from "./pages/parcours/ParcoursChapitreDetail";
import OrganisationPage from "./pages/working/organisation/OrganisationPage";
import ContentStudio from "./pages/working/ContentStudio";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import AdminAnnouncements from "./pages/admin/announcements/AdminAnnouncements";
import AdminCalendlyWebhooks from "./pages/admin/webhooks/AdminCalendlyWebhooks";
import CampaignTracking from "./pages/admin/invitations/CampaignTracking";
import AdminParcoursList from "./pages/admin/parcours/AdminParcoursList";
import ParcoursEditor from "./pages/admin/parcours/ParcoursEditor";
import ParcoursChapitreEditor from "./pages/admin/parcours/ParcoursChapitreEditor";
import AnnouncementDetail from "./pages/announcements/AnnouncementDetail";
import AdminQuizLead from "./pages/admin/quiz-lead/AdminQuizLead";
import AdminQuizFunnels from "./pages/admin/quiz-funnels/AdminQuizFunnels";

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
              <Route path="/quiz-funnel" element={<QuizFunnel />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/checkout/:installments" element={<Checkout />} />
              <Route path="/merci" element={<MerciPage />} />
              <Route path="/acompte/:montant" element={<AcompteCheckout />} />
              <Route path="/merci-acompte" element={<MerciAcomptePage />} />
              <Route path="/liberty" element={<LibertyCheckout />} />
              <Route path="/liberty/:installments" element={<LibertyCheckout />} />
              <Route path="/merci-liberty" element={<MerciLibertyPage />} />
              <Route element={<ProtectedRoute />}>
                {/* Onboarding (no layout) */}
                <Route path="/onboarding" element={<ApporteurOnboarding />} />
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
                  <Route path="/admin/team" element={<AdminTeam />} />
                  <Route path="/admin/announcements" element={<AdminAnnouncements />} />
                  <Route path="/admin/quiz-lead" element={<AdminQuizLead />} />
                  <Route path="/admin/quiz-funnels" element={<AdminQuizFunnels />} />
                  <Route path="/admin/invitations" element={<Navigate to="/admin/training/access" replace />} />
                  <Route path="/admin/invitations/campaign" element={<CampaignTracking />} />
                  <Route path="/admin/webhooks/calendly" element={<AdminCalendlyWebhooks />} />
                  <Route path="/admin/parcours" element={<AdminParcoursList />} />
                  <Route path="/admin/parcours/:slug" element={<ParcoursEditor />} />
                  <Route path="/admin/parcours/:slug/chapitre/:chapitreId" element={<ParcoursChapitreEditor />} />
                  <Route path="/admin/data" element={<AdminData />} />
                  <Route path="/admin/create" element={<AdminCreateWizard />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/coaching" element={<Coaching />} />
                  <Route path="/coaching/session/:sessionId" element={<CoachingSession />} />
                  <Route path="/admin/coaching" element={<AdminCoaching />} />
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
                  <Route path="/mon-coaching" element={<MonCoaching />} />
                  <Route path="/mon-coaching/session/:sessionId" element={<SessionDetail />} />
                  <Route path="/coaching/calendar" element={<PassGuard><CoachingCalendar /></PassGuard>} />
                  <Route path="/parcours/:slug" element={<PassGuard><ParcoursView /></PassGuard>} />
                  <Route path="/parcours/:slug/chapitre/:chapitreId" element={<PassGuard><ParcoursChapitreDetail /></PassGuard>} />
                  <Route path="/working/activity" element={<FeatureGate feature="working_activity"><MyActivity /></FeatureGate>} />
                  <Route path="/working/organisation" element={<FeatureGate feature="quiz_organisation"><OrganisationPage /></FeatureGate>} />
                  <Route path="/working/personal-brand" element={<Navigate to="/working/content?tab=personal-brand" replace />} />
                  <Route path="/working/content" element={<PassGuard><ContentStudio /></PassGuard>} />
                  <Route path="/working/contents" element={<PassGuard><MyContents /></PassGuard>} />
                  <Route path="/working/agent" element={<PassGuard><AgentIA /></PassGuard>} />
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
