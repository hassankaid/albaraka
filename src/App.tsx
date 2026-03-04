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
import DashboardLayout from "./components/DashboardLayout";
import ApporteurLayout from "./components/ApporteurLayout";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import Calls from "./pages/Calls";
import Contacts from "./pages/Contacts";
import Sales from "./pages/Sales";
import Payments from "./pages/Payments";
import Profile from "./pages/Profile";
import AdminInvoices from "./pages/AdminInvoices";
import NotFound from "./pages/NotFound";
import ApporteurDashboard from "./pages/apporteur/ApporteurDashboard";
import ApporteurLeads from "./pages/apporteur/ApporteurLeads";
import ApporteurSales from "./pages/apporteur/ApporteurSales";
import ApporteurCommissions from "./pages/apporteur/ApporteurCommissions";
import ApporteurProfile from "./pages/apporteur/ApporteurProfile";

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
              <Route element={<ProtectedRoute />}>
                {/* Team layout (CEO + Collaborateur) */}
                <Route element={<DashboardLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/leads" element={<Leads />} />
                  <Route path="/calls" element={<Calls />} />
                  <Route path="/contacts" element={<Contacts />} />
                  <Route path="/sales" element={<Sales />} />
                  <Route path="/payments" element={<Payments />} />
                  <Route path="/admin/invoices" element={<AdminInvoices />} />
                  <Route path="/profile" element={<Profile />} />
                </Route>
                {/* Apporteur layout */}
                <Route element={<ApporteurLayout />}>
                  <Route path="/my-space" element={<ApporteurDashboard />} />
                  <Route path="/my-space/leads" element={<ApporteurLeads />} />
                  <Route path="/my-space/sales" element={<ApporteurSales />} />
                  <Route path="/my-space/commissions" element={<ApporteurCommissions />} />
                  <Route path="/my-space/profile" element={<ApporteurProfile />} />
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
