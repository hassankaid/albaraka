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
import RolePlay from "./pages/training/RolePlay";
import RolePlayAdmin from "./pages/admin/role-play/RolePlayAdmin";
import QuizList from "./pages/training/QuizList";
import QuizPage from "./pages/training/QuizPage";
import AdminQuizList from "./pages/admin/quizzes/AdminQuizList";
import AdminTrainingHub from "./pages/admin/training/AdminTrainingHub";
import AdminStudentTracking from "./pages/admin/training/AdminStudentTracking";
import StudentDetailPage from "./pages/admin/training/StudentDetailPage";
import MyCertificates from "./pages/training/MyCertificates";
import AdminCertificates from "./pages/admin/training/AdminCertificates";
import VerifyCertificate from "./pages/public/VerifyCertificate";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/verify/:number" element={<VerifyCertificate />} />
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
                  <Route path="/admin/data" element={<AdminData />} />
                  <Route path="/admin/create" element={<AdminCreateWizard />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/coaching" element={<Coaching />} />
                  <Route path="/coaching/session/:sessionId" element={<CoachingSession />} />
                  <Route path="/mon-coaching" element={<MonCoaching />} />
                  <Route path="/mon-coaching/session/:sessionId" element={<SessionDetail />} />
                  <Route path="/admin/coaching" element={<AdminCoaching />} />
                  <Route path="/working" element={<Navigate to="/working/activity" replace />} />
                  <Route path="/admin/training" element={<AdminTrainingList />} />
                  <Route path="/admin/training/:slug" element={<FormationEditor />} />
                  <Route path="/admin/training/:slug/chapitre/:chapitreId" element={<ChapitreEditor />} />
                  <Route path="/admin/scripts" element={<AdminScriptList />} />
                  <Route path="/admin/scripts/:id" element={<ScriptEditor />} />
                  <Route path="/training/role-play" element={<RolePlay />} />
                  <Route path="/admin/role-play" element={<RolePlayAdmin />} />
                  <Route path="/training/quiz" element={<QuizList />} />
                  <Route path="/training/quiz/:id" element={<QuizPage />} />
                  <Route path="/admin/quizzes" element={<AdminQuizList />} />
                  <Route path="/admin/training/manage" element={<AdminTrainingHub />} />
                  <Route path="/admin/training/students" element={<AdminStudentTracking />} />
                  <Route path="/admin/training/students/:userId" element={<StudentDetailPage />} />
                  <Route path="/admin/training/certificates" element={<AdminCertificates />} />
                  <Route path="/training" element={<TrainingList />} />
                  <Route path="/training/certificats" element={<MyCertificates />} />
                  <Route path="/training/:slug" element={<FormationDetail />} />
                  <Route path="/training/:slug/chapitre/:chapitreId" element={<ChapterViewer />} />
                  <Route path="/training/scripts" element={<Scripts />} />
                  <Route path="/training/scripts/setting" element={<Navigate to="/training/scripts" replace />} />
                  <Route path="/training/scripts/closing" element={<Navigate to="/training/scripts" replace />} />
                  <Route path="/working/content" element={<ContentGenerator />} />
                  <Route path="/working/contents" element={<MyContents />} />
                  <Route path="/working/agent" element={<AgentIA />} />
                  <Route path="/working/activity" element={<MyActivity />} />
                </Route>
                {/* Apporteur layout */}
                <Route element={<ApporteurLayout />}>
                  <Route path="/my-space" element={<ApporteurDashboard />} />
                  <Route path="/my-space/leads" element={<ApporteurLeads />} />
                  <Route path="/my-space/sales" element={<ApporteurSales />} />
                  <Route path="/my-space/commissions" element={<ApporteurCommissions />} />
                  <Route path="/my-space/profile" element={<ApporteurProfile />} />
                  <Route path="/working/activity" element={<MyActivity />} />
                  <Route path="/training" element={<TrainingList />} />
                  <Route path="/training/certificats" element={<MyCertificates />} />
                  <Route path="/training/:slug" element={<FormationDetail />} />
                  <Route path="/training/:slug/chapitre/:chapitreId" element={<ChapterViewer />} />
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
