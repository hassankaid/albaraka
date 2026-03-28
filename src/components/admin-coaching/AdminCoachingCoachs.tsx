import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminCoachingCoachs() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["admin-profiles-coach"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, role, is_coach, is_active")
        .in("role", ["collaborateur", "ceo"])
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: coachTypes } = useQuery({
    queryKey: ["admin-coach-types-assign"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coach_types")
        .select("id, label, theme_color, assigned_coach_id")
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const toggleCoach = useMutation({
    mutationFn: async ({ id, is_coach }: { id: string; is_coach: boolean }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ is_coach })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-profiles-coach"] });
      queryClient.invalidateQueries({ queryKey: ["admin-coaching-active-coaches"] });
      toast({ title: "Statut mis à jour" });
    },
  });

  const assignCoach = useMutation({
    mutationFn: async ({ typeId, coachId }: { typeId: string; coachId: string | null }) => {
      const { error } = await supabase
        .from("coach_types")
        .update({ assigned_coach_id: coachId })
        .eq("id", typeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coach-types-assign"] });
      toast({ title: "Assignation mise à jour" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const coaches = profiles?.filter((p) => p.is_coach) || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Assignation aux types de coaching</CardTitle>
          <CardDescription>
            Chaque type de coaching peut être assigné à un coach principal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {coachTypes?.map((type) => (
              <div key={type.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: type.theme_color }}
                  />
                  <span className="font-medium">{type.label}</span>
                </div>
                <Select
                  value={type.assigned_coach_id || "none"}
                  onValueChange={(value) =>
                    assignCoach.mutate({
                      typeId: type.id,
                      coachId: value === "none" ? null : value,
                    })
                  }
                >
                  <SelectTrigger className="w-56">
                    <SelectValue placeholder="Non assigné" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Non assigné</SelectItem>
                    {coaches.map((coach) => (
                      <SelectItem key={coach.id} value={coach.id}>
                        {coach.full_name || coach.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Désigner les coachs</CardTitle>
          <CardDescription>
            Activez le statut "Coach" pour permettre à un collaborateur de créer des sessions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Peut coacher</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles?.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {p.full_name || "—"}
                  </TableCell>
                  <TableCell>{p.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{p.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={p.is_coach ?? false}
                      onCheckedChange={(checked) =>
                        toggleCoach.mutate({ id: p.id, is_coach: checked })
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
