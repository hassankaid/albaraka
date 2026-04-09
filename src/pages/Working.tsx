import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Bot } from "lucide-react";
import { useNavigate } from "react-router-dom";

const workingModules = [
  {
    id: "content-generator",
    title: "Générateur de Contenu",
    description: "Génère des idées de posts avec l'IA",
    icon: Sparkles,
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
    path: "/working/content",
  },
  {
    id: "agent",
    title: "Agent IA",
    description: "Aide à formuler des réponses DM pour tes prospects",
    icon: Bot,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    path: "/working/agent",
  },
];

export default function Working() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-heading text-foreground">Espace de travail</h2>
        <p className="text-muted-foreground mt-1">
          Scripts, générateur de contenu et outils IA pour ton activité
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {workingModules.map((module) => {
          const Icon = module.icon;
          return (
            <Card
              key={module.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(module.path)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-3 text-base">
                  <div className={`p-2 rounded-lg ${module.bgColor}`}>
                    <Icon className={`h-5 w-5 ${module.color}`} />
                  </div>
                  {module.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{module.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
