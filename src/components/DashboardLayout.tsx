import { Outlet, NavLink, useLocation, Navigate } from "react-router-dom";
import logo from "@/assets/ethicarena-logo.png";
import { Home, Users, Phone, BookUser, BadgeEuro, CreditCard, User, Sun, Moon, LogOut, ChevronDown, Menu, X, FileText, Percent, Database, PlusCircle, ArrowLeftRight } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useTheme } from "@/components/ThemeProvider";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

const allNavItems = [
  { title: "Dashboard", path: "/dashboard", icon: Home, roles: ["ceo", "collaborateur", "apporteur"] },
  { title: "Leads", path: "/leads", icon: Users, roles: ["ceo", "collaborateur"] },
  { title: "Calls", path: "/calls", icon: Phone, roles: ["ceo", "collaborateur"] },
  { title: "Contacts", path: "/contacts", icon: BookUser, roles: ["ceo", "collaborateur"] },
  { title: "Ventes", path: "/sales", icon: BadgeEuro, roles: ["ceo", "collaborateur", "apporteur"] },
  { title: "Paiements", path: "/payments", icon: CreditCard, roles: ["ceo", "collaborateur"] },
  { title: "Commissions", path: "/admin/commissions", icon: Percent, roles: ["ceo"] },
  { title: "Factures", path: "/admin/invoices", icon: FileText, roles: ["ceo"] },
  { title: "Données", path: "/admin/data", icon: Database, roles: ["ceo"] },
  { title: "Créer", path: "/admin/create", icon: PlusCircle, roles: ["ceo"] },
  { title: "Mon profil", path: "/profile", icon: User, roles: ["agence"] },
  
];

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/leads": "Leads",
  "/calls": "Calls",
  "/contacts": "Contacts",
  "/sales": "Ventes",
  "/payments": "Paiements",
  "/admin/invoices": "Factures Apporteurs",
  "/admin/commissions": "Commissions",
  "/admin/data": "Gestion des données",
  "/admin/create": "Création complète",
  "/my-space": "Mon espace",
  "/profile": "Mon profil",
};

export default function DashboardLayout() {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { profile, signOut } = useAuth();

  // Redirect pure apporteurs to their dedicated space
  if (profile?.role === "apporteur" && !profile?.is_also_apporteur) {
    return <Navigate to="/my-space" replace />;
  }

  // Redirect agence to profile if they land on dashboard
  if (profile?.role === "agence" && location.pathname === "/dashboard") {
    return <Navigate to="/profile" replace />;
  }

  const pageTitle = pageTitles[location.pathname] || "Dashboard";
  const userRole = profile?.role || "apporteur";
  const navItems = allNavItems.filter((item) => {
    if (item.path === "/my-space") {
      return userRole === "apporteur" || profile?.is_also_apporteur;
    }
    return item.roles.includes(userRole);
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
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-16 flex items-center gap-3 px-6 border-b border-border">
          <img src={logo} alt="Ethicarena" className="w-9 h-9 object-contain" />
          <span className="font-bold text-foreground">Ethicarena</span>
          <button className="ml-auto lg:hidden text-muted-foreground" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
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
      <div className="flex-1 flex flex-col min-w-0">
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
