import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, Users, Wrench, Calendar, PlayCircle } from "lucide-react";
import AdminCoachingDashboard from "@/components/admin-coaching/AdminCoachingDashboard";
import AdminCoachingCoachs from "@/components/admin-coaching/AdminCoachingCoachs";
import AdminCoachingBuilder from "@/components/admin-coaching/AdminCoachingBuilder";
import AdminCoachingSessions from "@/components/admin-coaching/AdminCoachingSessions";
import AdminCoachingReplays from "@/components/admin-coaching/AdminCoachingReplays";

export default function AdminCoaching() {
  const { profile } = useAuth();

  if (profile?.role !== "ceo") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground">
          Administration Coaching
        </h1>
        <p className="text-muted-foreground mt-1">
          Supervisez l'activité et gérez le contenu de coaching.
        </p>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid grid-cols-5 w-full max-w-3xl">
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
          <TabsTrigger value="replays" className="flex items-center gap-2">
            <PlayCircle className="h-4 w-4" />
            Replays & Assiduité
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <AdminCoachingDashboard />
        </TabsContent>

        <TabsContent value="coachs">
          <AdminCoachingCoachs />
        </TabsContent>

        <TabsContent value="builder">
          <AdminCoachingBuilder />
        </TabsContent>

        <TabsContent value="sessions">
          <AdminCoachingSessions />
        </TabsContent>

        <TabsContent value="replays">
          <AdminCoachingReplays />
        </TabsContent>
      </Tabs>
    </div>
  );
}
