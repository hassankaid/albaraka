import { Outlet, NavLink, useLocation, Navigate } from "react-router-dom";
import logo from "@/assets/ethicarena-logo.png";
import SpaceSwitcher from "./SpaceSwitcher";
import { Home, Users, Phone, BookUser, BadgeEuro, CreditCard, User, Sun, Moon, LogOut, ChevronDown, Menu, X, FileText, Percent, Database, PlusCircle, ArrowLeftRight, Receipt, UsersRound, GraduationCap, BookOpen, Settings2, Briefcase, MessageSquare, Sparkles, Bot, TrendingUp } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useTheme } from "@/components/ThemeProvider";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

const trackingNavItems = [
  { title: "Mon Dashboard", path: "/dashboard", icon: Home, roles: ["ceo", "collaborateur", "apporteur"] },
  { title: "Leads", path: "/leads", icon: Users, roles: ["ceo", "collaborateur"] },
  { title: "Mes Calls", path: "/calls", icon: Phone, roles: ["ceo", "collaborateur"] },
  { title: "Contacts", path: "/contacts", icon: BookUser, roles: ["ceo"] },
  { title: "Mes Ventes", path: "/sales", icon: BadgeEuro, roles: ["ceo", "collaborateur", "apporteur"] },
  { title: "Mes Paiements", path: "/payments", icon: CreditCard, roles: ["ceo", "collaborateur"] },
  { title: "Mes Commissions", path: "/my-commissions", icon: Receipt, roles: ["ceo", "collaborateur"] },
  { title: "Équipe", path: "/admin/team", icon: UsersRound, roles: ["ceo"] },
  { title: "Commissions", path: "/admin/commissions", icon: Percent, roles: ["ceo"] },
  { title: "Factures", path: "/admin/invoices", icon: FileText, roles: ["ceo"] },
  { title: "Données", path: "/admin/data", icon: Database, roles: ["ceo"] },
  { title: "Créer", path: "/admin/create", icon: PlusCircle, roles: ["ceo"] },
  { title: "Mon profil", path: "/profile", icon: User, roles: ["agence"] },
];

const coachingNavItems = [
  { title: "Évaluations", path: "/coaching", icon: GraduationCap, roles: ["ceo", "collaborateur"], coachOnly: true },
  { title: "Historique", path: "/mon-coaching", icon: BookOpen, roles: ["ceo", "collaborateur", "apporteur"] },
  { title: "Administration", path: "/admin/coaching", icon: Settings2, roles: ["ceo"] },
];

const workingNavItems = [
  { title: "Mon Activité", path: "/working/activity", icon: TrendingUp, roles: ["ceo", "collaborateur", "apporteur"], apporteurOnly: true },
  
  { title: "Scripts Setting", path: "/working/scripts/setting", icon: MessageSquare, roles: ["ceo", "collaborateur"] },
  { title: "Scripts Closing", path: "/working/scripts/closing", icon: Phone, roles: ["ceo", "collaborateur"] },
  { title: "Générateur Contenu", path: "/working/content", icon: Sparkles, roles: ["ceo", "collaborateur"] },
  { title: "Agent IA", path: "/working/agent", icon: Bot, roles: ["ceo", "collaborateur"] },
];

const pageTitles: Record<string, string> = {
  "/dashboard": "Mon Dashboard",
  "/leads": "Leads",
  "/calls": "Mes Calls",
  "/contacts": "Contacts",
  "/sales": "Mes Ventes",
  "/payments": "Mes Paiements",
  "/my-commissions": "Mes Commissions",
  "/admin/team": "Équipe",
  "/admin/invoices": "Factures Apporteurs",
  "/admin/commissions": "Commissions",
  "/admin/data": "Gestion des données",
  "/admin/create": "Création complète",
  "/my-space": "Mon espace",
  "/profile": "Mon profil",
  "/coaching": "Évaluations",
  "/mon-coaching": "Historique",
  "/admin/coaching": "Administration Coaching",
  "/working/activity": "Mon Activité",
  "/working": "Espace de travail",
  "/working/scripts/setting": "Scripts Setting",
  "/working/scripts/closing": "Scripts Closing",
  "/working/content": "Générateur de Contenu",
  "/working/agent": "Agent IA",
};

export default function DashboardLayout() {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { profile, signOut } = useAuth();

  // Redirect pure apporteurs to their dedicated space (except coaching routes)
  const isCoachingRoute = location.pathname.startsWith("/coaching") || location.pathname.startsWith("/mon-coaching");
  if (profile?.role === "apporteur" && !profile?.is_also_apporteur && !isCoachingRoute) {
    return <Navigate to="/my-space" replace />;
  }

  // Inactive collaborateurs who are also apporteurs go to apporteur space
  if (profile?.role === "collaborateur" && profile?.is_active === false && profile?.is_also_apporteur) {
    return <Navigate to="/my-space" replace />;
  }

  // Redirect agence to profile if they land on dashboard
  if (profile?.role === "agence" && location.pathname === "/dashboard") {
    return <Navigate to="/profile" replace />;
  }

  const userRole = profile?.role || "apporteur";
  const isCoachingSpace = location.pathname.startsWith("/coaching") || location.pathname.startsWith("/mon-coaching") || location.pathname === "/admin/coaching";
  const isWorkingSpace = location.pathname.startsWith("/working");
  const pageTitle = pageTitles[location.pathname] || "Dashboard";

  let currentNavItems;
  if (isWorkingSpace) {
    currentNavItems = workingNavItems;
  } else if (isCoachingSpace) {
    currentNavItems = coachingNavItems;
  } else {
    currentNavItems = trackingNavItems;
  }

  const isApporteurLike = profile?.role === "apporteur" || profile?.is_also_apporteur;
  const navItems = currentNavItems.filter((item) => {
    if (!item.roles.includes(userRole)) return false;
    if ('coachOnly' in item && item.coachOnly) return profile?.is_coach || profile?.role === "ceo";
    if ('apporteurOnly' in item && item.apporteurOnly) return isApporteurLike || profile?.role === "ceo";
    return true;
  });
  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <div className="min-h-screen flex bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-background/80 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-border">
          <div className="h-14 flex items-center gap-3 px-6">
            <img src={logo} alt="Ethicarena" className="w-8 h-8 object-contain" />
            <button className="ml-auto lg:hidden text-muted-foreground" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>
          <SpaceSwitcher />
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "gradient-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </NavLink>
          ))}
        </nav>

        {profile?.is_also_apporteur && (
          <div className="p-3 border-t border-border">
            <NavLink
              to="/my-space"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors w-full"
            >
              <ArrowLeftRight className="h-4 w-4" />
              Espace Apporteur
            </NavLink>
          </div>
        )}
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-card/50 backdrop-blur-sm sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button className="lg:hidden text-muted-foreground" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-bold text-foreground">{pageTitle}</h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-secondary transition-colors"
              >
                <Avatar className="h-8 w-8 text-xs">
                  {profile?.avatar_url ? <AvatarImage src={profile.avatar_url} alt={profile.full_name} /> : null}
                  <AvatarFallback className="gradient-primary text-primary-foreground text-xs font-bold">{initials}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-foreground hidden sm:block">
                  {profile?.full_name || "Utilisateur"}
                </span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>

              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-xl shadow-lg z-50 py-1">
                    <NavLink
                      to="/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-secondary flex items-center gap-2"
                    >
                      <User className="h-4 w-4" /> Mon profil
                    </NavLink>
                    <button
                      onClick={() => { setDropdownOpen(false); signOut(); }}
                      className="w-full px-4 py-2 text-left text-sm text-destructive hover:bg-secondary flex items-center gap-2"
                    >
                      <LogOut className="h-4 w-4" /> Déconnexion
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>



        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
