import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, BarChart3, GraduationCap, BookOpen, Check } from "lucide-react";
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
  return [
    {
      id: "tracking",
      label: "TRACKING",
      icon: BarChart3,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      path: isApporteur ? "/my-space" : "/dashboard",
      description: "Leads, Calls, Sales, Payments",
    },
    {
      id: "coaching",
      label: "COACHING",
      icon: GraduationCap,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      path: profile?.is_coach || profile?.role === "ceo" ? "/coaching" : "/mon-coaching",
      description: "Évaluations & Historique",
    },
  ];
};

export default function SpaceSwitcher() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const spaces = getSpaces(profile);

  const getCurrentSpace = (): Space => {
    if (location.pathname.startsWith("/coaching") || location.pathname.startsWith("/mon-coaching") || location.pathname === "/admin/coaching") {
      return spaces.find((s) => s.id === "coaching") || spaces[0];
    }
    return spaces[0];
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
            <p className="text-xs font-bold text-muted-foreground tracking-wider">ETHICARENA</p>
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
                "flex items-center gap-3 p-3 cursor-pointer",
                isActive && "bg-muted"
              )}
            >
              <div className={cn("p-1.5 rounded-lg", space.bgColor)}>
                <SpaceIcon className={cn("h-4 w-4", space.color)} />
              </div>
              <p className="text-sm font-semibold">{space.label}</p>
              {isActive && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
