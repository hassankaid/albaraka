import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Star, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminCoachingCoachs() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editingType, setEditingType] = useState<any>(null);
  const [selectedCoaches, setSelectedCoaches] = useState<string[]>([]);
  const [primaryCoach, setPrimaryCoach] = useState<string | null>(null);

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
    queryKey: ["admin-coach-types-with-assignments"],
    queryFn: async () => {
      const { data: types, error: typesError } = await supabase
        .from("coach_types")
        .select("id, label, theme_color")
        .order("display_order");
      if (typesError) throw typesError;

      const typesWithAssignments = await Promise.all(
        (types || []).map(async (type) => {
          const { data: assignments } = await supabase
            .from("coach_type_assignments" as any)
            .select("id, is_primary, coach_id")
            .eq("coach_type_id", type.id);

          // Resolve coach profiles
          const enriched = await Promise.all(
            (assignments || []).map(async (a: any) => {
              const { data: coach } = await supabase
                .from("profiles")
                .select("id, full_name, email")
                .eq("id", a.coach_id)
                .maybeSingle();
              return { ...a, coach };
            })
          );

          return { ...type, assignments: enriched };
        })
      );

      return typesWithAssignments;
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

  const saveAssignments = useMutation({
    mutationFn: async ({
      typeId,
      coachIds,
      primaryId,
    }: {
      typeId: string;
      coachIds: string[];
      primaryId: string | null;
    }) => {
      // Delete old assignments
      await supabase
        .from("coach_type_assignments" as any)
        .delete()
        .eq("coach_type_id", typeId);

      // Insert new ones
      if (coachIds.length > 0) {
        const rows = coachIds.map((coachId) => ({
          coach_type_id: typeId,
          coach_id: coachId,
          is_primary: coachId === primaryId,
        }));

        const { error } = await supabase
          .from("coach_type_assignments" as any)
          .insert(rows);
        if (error) throw error;
      }

      // Also update the legacy assigned_coach_id field
      await supabase
        .from("coach_types")
        .update({ assigned_coach_id: primaryId })
        .eq("id", typeId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coach-types-with-assignments"] });
      toast({ title: "Assignations mises à jour" });
      setEditingType(null);
    },
  });

  const openEditDialog = (type: any) => {
    setEditingType(type);
    const currentCoachIds =
      type.assignments?.map((a: any) => a.coach?.id).filter(Boolean) || [];
    const currentPrimary =
      type.assignments?.find((a: any) => a.is_primary)?.coach?.id || null;
    setSelectedCoaches(currentCoachIds);
    setPrimaryCoach(currentPrimary);
  };

  const toggleCoachSelection = (coachId: string) => {
    setSelectedCoaches((prev) => {
      if (prev.includes(coachId)) {
        if (primaryCoach === coachId) setPrimaryCoach(null);
        return prev.filter((id) => id !== coachId);
      }
      return [...prev, coachId];
    });
  };

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
      {/* Assignments section */}
      <Card>
        <CardHeader>
          <CardTitle>Assignation aux types de coaching</CardTitle>
          <CardDescription>
            Assignez un ou plusieurs coachs à chaque type. Le coach principal est
            affiché en premier.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {coachTypes?.map((type) => (
              <div
                key={type.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-4 h-4 rounded-full mt-1 shrink-0"
                    style={{ backgroundColor: type.theme_color }}
                  />
                  <div>
                    <p className="font-medium">{type.label}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {type.assignments?.length > 0 ? (
                        type.assignments.map((a: any) => (
                          <Badge
                            key={a.id}
                            variant={a.is_primary ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {a.is_primary && (
                              <Star className="h-3 w-3 mr-1 fill-current" />
                            )}
                            {a.coach?.full_name || a.coach?.email}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Aucun coach assigné
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditDialog(type)}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Gérer
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Toggle coach status */}
      <Card>
        <CardHeader>
          <CardTitle>Désigner les coachs</CardTitle>
          <CardDescription>
            Activez le statut "Coach" pour permettre à un collaborateur de créer
            des sessions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
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

      {/* Edit dialog */}
      <Dialog
        open={!!editingType}
        onOpenChange={(open) => !open && setEditingType(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: editingType?.theme_color }}
              />
              Coachs pour {editingType?.label}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Sélectionnez les coachs et désignez un coach principal.
            </p>

            {coaches.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                Aucun coach disponible. Activez d'abord le statut coach.
              </p>
            ) : (
              <div className="space-y-2">
                {coaches.map((coach) => (
                  <div
                    key={coach.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedCoaches.includes(coach.id)}
                        onCheckedChange={() => toggleCoachSelection(coach.id)}
                      />
                      <span className="text-sm font-medium">
                        {coach.full_name || coach.email}
                      </span>
                    </div>
                    {selectedCoaches.includes(coach.id) && (
                      <Button
                        variant={
                          primaryCoach === coach.id ? "default" : "ghost"
                        }
                        size="sm"
                        onClick={() => setPrimaryCoach(coach.id)}
                      >
                        <Star
                          className={`h-3 w-3 mr-1 ${
                            primaryCoach === coach.id ? "fill-current" : ""
                          }`}
                        />
                        {primaryCoach === coach.id
                          ? "Principal"
                          : "Définir principal"}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingType(null)}>
              Annuler
            </Button>
            <Button
              onClick={() =>
                saveAssignments.mutate({
                  typeId: editingType.id,
                  coachIds: selectedCoaches,
                  primaryId: primaryCoach,
                })
              }
              disabled={saveAssignments.isPending}
            >
              {saveAssignments.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
