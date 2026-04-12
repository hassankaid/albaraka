import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserPass } from "@/hooks/useUserPass";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Briefcase, GraduationCap, BookOpenCheck, Check, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Space {
  id: "working" | "training" | "coaching" | "admin";
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  path: string;
  description: string;
}

interface ProfileInput {
  role?: string | null;
  is_coach?: boolean | null;
  is_also_apporteur?: boolean | null;
  is_active?: boolean | null;
}

/**
 * Compute the set of spaces for a given profile and pass level.
 * Exposed for unit tests.
 */
export function getSpaces(profile: ProfileInput | null, hasAnyPass: boolean): Space[] {
  if (!profile) return [];

  const isCeo = profile.role === "ceo";
  const isApporteurPath = profile.role === "apporteur"
    || (profile.role === "collaborateur" && profile.is_active === false && profile.is_also_apporteur);

  const workingPath = isApporteurPath
    ? "/my-space"
    : isCeo
      ? "/dashboard"
      : "/working/activity";

  const coachingPath = (profile.is_coach || isCeo)
    ? "/coaching"
    : hasAnyPass
      ? (isApporteurPath ? "/my-space/coaching-calendar" : "/coaching/calendar")
      : "/mon-coaching";

  const spaces: Space[] = [
    {
      id: "working",
      label: "WORKING",
      icon: Briefcase,
      color: "text-gold-400",
      bgColor: "bg-gold-400/10",
      path: workingPath,
      description: "Suivi commercial & Outils",
    },
    {
      id: "training",
      label: "TRAINING",
      icon: BookOpenCheck,
      color: "text-amber-400",
      bgColor: "bg-amber-400/10",
      path: "/training",
      description: "Formation & Ressources",
    },
    {
      id: "coaching",
      label: "COACHING",
      icon: GraduationCap,
      color: "text-teal-400",
      bgColor: "bg-teal-400/10",
      path: coachingPath,
      description: "Calendrier & Historique",
    },
  ];

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

  return spaces;
}

/**
 * Identify the current space id from the pathname.
 * Exposed for unit tests.
 */
export function detectCurrentSpaceId(pathname: string): Space["id"] {
  if (pathname.startsWith("/training")) return "training";
  if (
    pathname.startsWith("/coaching") ||
    pathname.startsWith("/mon-coaching") ||
    pathname === "/my-space/coaching-calendar"
  ) {
    return "coaching";
  }
  if (pathname.startsWith("/admin/training") || pathname.startsWith("/admin/scripts") ||
      pathname.startsWith("/admin/role-play") || pathname.startsWith("/admin/quizzes")) {
    return "training";
  }
  if (pathname === "/admin/coaching") return "coaching";
  if (pathname.startsWith("/admin/")) return "admin";
  return "working";
}

export default function SpaceSwitcher() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { hasAnyPass } = useUserPass();

  const spaces = getSpaces(profile, hasAnyPass);
  if (spaces.length === 0) return null;

  const currentId = detectCurrentSpaceId(location.pathname);
  const currentSpace = spaces.find((s) => s.id === currentId) ?? spaces[0];
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
