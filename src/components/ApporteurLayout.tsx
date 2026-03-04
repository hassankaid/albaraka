import { Outlet, NavLink, useLocation } from "react-router-dom";
import logo from "@/assets/ethicarena-logo.png";
import { BarChart3, Users, BadgeEuro, Receipt, Settings, Sun, Moon, LogOut, Menu, X } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useTheme } from "@/components/ThemeProvider";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { title: "Dashboard", path: "/my-space", icon: BarChart3 },
  { title: "Mes Leads", path: "/my-space/leads", icon: Users },
  { title: "Mes Ventes", path: "/my-space/sales", icon: BadgeEuro },
  { title: "Commissions & Factures", path: "/my-space/commissions", icon: Receipt },
  { title: "Mon Profil", path: "/my-space/profile", icon: Settings },
];

const pageTitles: Record<string, string> = {
  "/my-space": "Dashboard",
  "/my-space/leads": "Mes Leads",
  "/my-space/sales": "Mes Ventes",
  "/my-space/commissions": "Commissions & Factures",
  "/my-space/profile": "Mon Profil",
};

export default function ApporteurLayout() {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { profile, signOut } = useAuth();

  const pageTitle = pageTitles[location.pathname] || "Mon espace";
  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <div className="min-h-screen flex bg-background">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-background/80 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

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

        <div className="p-3 border-t border-border">
          <button
            onClick={() => { setSidebarOpen(false); signOut(); }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-secondary transition-colors w-full"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </div>
      </aside>

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

            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8 text-xs">
                {profile?.avatar_url ? <AvatarImage src={profile.avatar_url} alt={profile.full_name} /> : null}
                <AvatarFallback className="gradient-primary text-primary-foreground text-xs font-bold">{initials}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-foreground hidden sm:block">
                {profile?.full_name || "Utilisateur"}
              </span>
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
