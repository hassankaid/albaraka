import { Outlet, NavLink, useLocation } from "react-router-dom";
import logo from "@/assets/ethicarena-logo.png";
import SpaceSwitcher from "./SpaceSwitcher";
import { BarChart3, Users, BadgeEuro, Receipt, Settings, Sun, Moon, LogOut, Menu, X, ArrowLeftRight, ChevronDown, User, BookOpen, TrendingUp } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useTheme } from "@/components/ThemeProvider";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

const trackingNavItems = [
  { title: "Dashboard", path: "/my-space", icon: BarChart3 },
  { title: "Mes Leads", path: "/my-space/leads", icon: Users },
  { title: "Mes Ventes", path: "/my-space/sales", icon: BadgeEuro },
  { title: "Commissions & Factures", path: "/my-space/commissions", icon: Receipt },
  { title: "Mon Profil", path: "/my-space/profile", icon: Settings },
];

const coachingNavItems = [
  { title: "Historique", path: "/mon-coaching", icon: BookOpen },
];

const workingNavItems = [
  { title: "Mon Activité", path: "/working/activity", icon: TrendingUp },
];

const pageTitles: Record<string, string> = {
  "/my-space": "Dashboard",
  "/my-space/leads": "Mes Leads",
  "/my-space/sales": "Mes Ventes",
  "/my-space/commissions": "Commissions & Factures",
  "/my-space/profile": "Mon Profil",
  "/mon-coaching": "Historique",
};

export default function ApporteurLayout() {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { profile, signOut } = useAuth();

  const isCoachingSpace = location.pathname.startsWith("/mon-coaching");
  const pageTitle = pageTitles[location.pathname] || "Mon espace";
  const navItems = isCoachingSpace ? coachingNavItems : trackingNavItems;
  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <div className="min-h-screen flex bg-background">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-background/80 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

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

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/my-space"}
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
          <div className="p-3 border-t border-border shrink-0">
            <NavLink
              to="/dashboard"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors w-full"
            >
              <ArrowLeftRight className="h-4 w-4" />
              Espace Collaborateur
            </NavLink>
          </div>
        )}
      </aside>

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
                      to="/my-space/profile"
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
