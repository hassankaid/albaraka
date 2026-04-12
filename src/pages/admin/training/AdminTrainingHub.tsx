import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, MessageSquare, Bot, TrendingUp, ArrowRight, Users, Award } from "lucide-react";

const adminModules = [
  {
    id: "formations",
    title: "Formations",
    description: "Modules, chapitres, vidéos Vimeo et ressources PDF",
    icon: GraduationCap,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    path: "/admin/training",
  },
  {
    id: "scripts",
    title: "Scripts & Objections",
    description: "Setting, closing et 56 objections catégorisées",
    icon: MessageSquare,
    color: "text-teal-500",
    bgColor: "bg-teal-500/10",
    path: "/admin/scripts",
  },
  {
    id: "role-play",
    title: "Rôle-Play",
    description: "Catalogue de 10 profils prospects et 30 scripts",
    icon: Bot,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    path: "/admin/role-play",
  },
  {
    id: "quizzes",
    title: "Quiz",
    description: "4 quiz thématiques, 462 questions — max 3 erreurs",
    icon: TrendingUp,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    path: "/admin/quizzes",
  },
  {
    id: "students",
    title: "Suivi élèves",
    description: "Progression, quiz, enrôlements par élève",
    icon: Users,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    path: "/admin/training/students",
  },
  {
    id: "certificates",
    title: "Certificats",
    description: "Certificats El Baraka émis, export et révocation",
    icon: Award,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    path: "/admin/training/certificates",
  },
];

export default function AdminTrainingHub() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  if (profile?.role !== "ceo") {
    return <Navigate to="/training" replace />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading">Gestion</h1>
        <p className="text-muted-foreground">
          Outils d'administration des contenus de formation
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {adminModules.map((mod) => {
          const Icon = mod.icon;
          return (
            <Card
              key={mod.id}
              className="cursor-pointer hover:shadow-md hover:border-primary/40 transition-all group"
              onClick={() => navigate(mod.path)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-3 text-base">
                  <div className={`p-2 rounded-lg ${mod.bgColor}`}>
                    <Icon className={`h-5 w-5 ${mod.color}`} />
                  </div>
                  {mod.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{mod.description}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 -ml-2 group-hover:text-primary"
                >
                  Gérer
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
