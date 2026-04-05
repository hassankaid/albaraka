import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute, PublicOnlyRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
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
import ScriptsSetting from "./pages/working/ScriptsSetting";
import ScriptsClosing from "./pages/working/ScriptsClosing";
import ContentGenerator from "./pages/working/ContentGenerator";
import MyContents from "./pages/working/MyContents";
import MyActivity from "./pages/working/MyActivity";
import AgentIA from "./pages/working/AgentIA";
import TrainingList from "./pages/training/TrainingList";

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
              <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
              <Route path="/reset-password" element={<ResetPassword />} />
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
                  <Route path="/training" element={<TrainingList />} />
                  <Route path="/training/scripts/setting" element={<ScriptsSetting />} />
                  <Route path="/training/scripts/closing" element={<ScriptsClosing />} />
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
