import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, Users, Wrench, Calendar } from "lucide-react";
import AdminCoachingDashboard from "@/components/admin-coaching/AdminCoachingDashboard";

export default function AdminCoaching() {
  const { profile } = useAuth();

  if (profile?.role !== "ceo") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Administration Coaching
        </h1>
        <p className="text-muted-foreground mt-1">
          Supervisez l'activité et gérez le contenu de coaching.
        </p>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-xl">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="coachs" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Coachs
          </TabsTrigger>
          <TabsTrigger value="builder" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Builder
          </TabsTrigger>
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Sessions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <AdminCoachingDashboard />
        </TabsContent>

        <TabsContent value="coachs">
          <p className="text-muted-foreground">Coachs - prompt suivant</p>
        </TabsContent>

        <TabsContent value="builder">
          <p className="text-muted-foreground">Builder - prompt suivant</p>
        </TabsContent>

        <TabsContent value="sessions">
          <p className="text-muted-foreground">Sessions - prompt suivant</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
