import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Briefcase, GraduationCap, BookOpenCheck, Check, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Space {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  path: string;
  description: string;
}

const getSpaces = (profile: any): Space[] => {
  const isApporteur = profile?.role === "apporteur";
  const isCeo = profile?.role === "ceo";

  const spaces: Space[] = [
    {
      id: "working",
      label: "WORKING",
      icon: Briefcase,
      color: "text-gold-400",
      bgColor: "bg-gold-400/10",
      path: isCeo ? "/dashboard" : "/working/activity",
      description: "Suivi commercial & Outils",
    },
    {
      id: "training",
      label: "TRAINING",
      icon: BookOpenCheck,
      color: "text-amber-400",
      bgColor: "bg-amber-400/10",
      path: "/training",
      description: "Formation, Scripts & Objections",
    },
    {
      id: "coaching",
      label: "COACHING",
      icon: GraduationCap,
      color: "text-teal-400",
      bgColor: "bg-teal-400/10",
      path: profile?.is_coach || isCeo ? "/coaching" : "/mon-coaching",
      description: "Évaluations & Historique",
    },
  ];

  // Admin space — CEO only
  if (isCeo) {
    spaces.push({
      id: "admin",
      label: "ADMIN",
      icon: Settings2,
      color: "text-red-400",
      bgColor: "bg-red-400/10",
      path: "/admin/team",
      description: "Gestion & Administration",
    });
  }

  // Apporteurs purs n'ont pas accès au training
  if (isApporteur && !profile?.is_also_apporteur) {
    return spaces.filter((s) => s.id !== "training");
  }

  return spaces;
};

export default function SpaceSwitcher() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const spaces = getSpaces(profile);

  const getCurrentSpace = (): Space => {
    if (location.pathname.startsWith("/training")) {
      return spaces.find((s) => s.id === "training") || spaces[0];
    }
    if (location.pathname.startsWith("/coaching") || location.pathname.startsWith("/mon-coaching")) {
      return spaces.find((s) => s.id === "coaching") || spaces[0];
    }
    // Admin routes (except /admin/coaching and /admin/training which belong to their respective spaces)
    if (location.pathname.startsWith("/admin/training") || location.pathname.startsWith("/admin/scripts") || location.pathname.startsWith("/admin/role-play") || location.pathname.startsWith("/admin/quizzes")) {
      return spaces.find((s) => s.id === "training") || spaces[0];
    }
    if (location.pathname.startsWith("/admin/") && location.pathname !== "/admin/coaching") {
      return spaces.find((s) => s.id === "admin") || spaces[0];
    }
    return spaces[0]; // WORKING is default
  };

  const currentSpace = getCurrentSpace();
  const Icon = currentSpace.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors text-left">
          <div className={cn("p-1.5 rounded-lg", currentSpace.bgColor)}>
            <Icon className={cn("h-4 w-4", currentSpace.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-muted-foreground tracking-wider font-heading">ESPACE</p>
            <p className={cn("text-sm font-semibold", currentSpace.color)}>
              {currentSpace.label}
            </p>
          </div>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {spaces.map((space) => {
          const SpaceIcon = space.icon;
          const isActive = space.id === currentSpace.id;

          return (
            <DropdownMenuItem
              key={space.id}
              onClick={() => navigate(space.path)}
              className={cn(
                "flex items-center gap-3 p-2.5 cursor-pointer",
                isActive && "bg-muted"
              )}
            >
              <div className={cn("p-1.5 rounded-lg", space.bgColor)}>
                <SpaceIcon className={cn("h-4 w-4", space.color)} />
              </div>
              <p className="flex-1 text-sm font-semibold">{space.label}</p>
              {isActive && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}