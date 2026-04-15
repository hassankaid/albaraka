import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, MessageSquare, Bot, TrendingUp, ArrowRight, Users, Award, Rocket, Loader2 } from "lucide-react";
import { useAppSetting, useSetAppSetting } from "@/hooks/useAppSettings";
import { useToast } from "@/hooks/use-toast";

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
    description: "Certificats Al Baraka émis, export et révocation",
    icon: Award,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    path: "/admin/training/certificates",
  },
];

export default function AdminTrainingHub() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { data: comingSoonEnabled, isLoading: loadingSetting } =
    useAppSetting<boolean>("training_coming_soon_enabled");
  const setSetting = useSetAppSetting();
  const { toast } = useToast();

  if (profile?.role !== "ceo") {
    return <Navigate to="/training" replace />;
  }

  async function toggleComingSoon(checked: boolean) {
    try {
      await setSetting.mutateAsync({ key: "training_coming_soon_enabled", value: checked });
      toast({
        title: checked ? "Bannière activée" : "Bannière désactivée",
        description: checked
          ? "Les apprenants early access voient le message 'Formations bientôt'."
          : "Les apprenants early access voient les formations normalement.",
      });
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e.message ?? String(e),
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading">Gestion</h1>
        <p className="text-muted-foreground">
          Outils d'administration des contenus de formation
        </p>
      </div>

      {/* Réglage global : bannière "Formations bientôt" pour les early access */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="p-2 rounded-lg bg-amber-500/15 shrink-0">
            <Rocket className="h-5 w-5 text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium flex items-center gap-2 flex-wrap">
              Bannière « Formations bientôt » (accès anticipé)
              {loadingSetting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              ) : (
                <Badge variant={comingSoonEnabled ? "default" : "outline"}>
                  {comingSoonEnabled ? "ACTIVÉE" : "DÉSACTIVÉE"}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {comingSoonEnabled
                ? "Les apprenants invités en accès anticipé voient un message « Formations bientôt ». Décoche pour leur afficher les formations normalement."
                : "Les apprenants early access voient les formations comme les autres. Activé = message d'attente affiché."}
            </p>
          </div>
          <Switch
            checked={!!comingSoonEnabled}
            onCheckedChange={toggleComingSoon}
            disabled={loadingSetting || setSetting.isPending}
          />
        </CardContent>
      </Card>

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
