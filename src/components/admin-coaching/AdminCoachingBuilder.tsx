import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, Settings, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function AdminCoachingBuilder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [showNewTypeDialog, setShowNewTypeDialog] = useState(false);
  const [showNewStepDialog, setShowNewStepDialog] = useState(false);
  const [showEditTypeDialog, setShowEditTypeDialog] = useState(false);
  const [editingType, setEditingType] = useState<any>(null);
  const [newStepTypeId, setNewStepTypeId] = useState("");
  const [newTypeData, setNewTypeData] = useState({ label: "", theme_color: "#7C3AED" });
  const [newStepData, setNewStepData] = useState({ label: "", title: "" });

  const { data: types, isLoading } = useQuery({
    queryKey: ["admin-builder-types"],
    queryFn: async () => {
      const { data: typesData, error: typesError } = await supabase
        .from("coach_types")
        .select("*")
        .order("display_order");
      if (typesError) throw typesError;

      const typesWithSteps = await Promise.all(
        (typesData || []).map(async (type) => {
          const { data: steps } = await supabase
            .from("coach_steps")
            .select("id, label, title, is_active, display_order")
            .eq("coach_type_id", type.id)
            .order("display_order");

          const { data: assignments } = await supabase
            .from("coach_type_assignments" as any)
            .select("coach_id")
            .eq("coach_type_id", type.id);

          const coaches = await Promise.all(
            (assignments || []).map(async (a: any) => {
              const { data: coach } = await supabase
                .from("profiles")
                .select("full_name, email")
                .eq("id", a.coach_id)
                .maybeSingle();
              return coach;
            })
          );

          return { ...type, steps: steps || [], coaches: coaches.filter(Boolean) };
        })
      );

      return typesWithSteps;
    },
  });

  const createType = useMutation({
    mutationFn: async (data: { label: string; theme_color: string }) => {
      const { data: existingTypes } = await supabase
        .from("coach_types")
        .select("display_order")
        .order("display_order", { ascending: false })
        .limit(1);

      const nextOrder = (existingTypes?.[0]?.display_order || 0) + 1;
      const name = data.label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

      const { error } = await supabase.from("coach_types").insert({
        name,
        label: data.label,
        theme_color: data.theme_color,
        theme_bg: data.theme_color + "20",
        display_order: nextOrder,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-builder-types"] });
      toast({ title: "Type créé" });
      setShowNewTypeDialog(false);
      setNewTypeData({ label: "", theme_color: "#7C3AED" });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de créer le type", variant: "destructive" });
    },
  });

  const updateType = useMutation({
    mutationFn: async (data: { id: string; label: string; theme_color: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("coach_types")
        .update({
          label: data.label,
          theme_color: data.theme_color,
          theme_bg: data.theme_color + "20",
          is_active: data.is_active,
        })
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-builder-types"] });
      toast({ title: "Type mis à jour" });
      setShowEditTypeDialog(false);
      setEditingType(null);
    },
  });

  const createStep = useMutation({
    mutationFn: async (data: { typeId: string; label: string; title: string }) => {
      const { data: existingSteps } = await supabase
        .from("coach_steps")
        .select("display_order, step_number")
        .eq("coach_type_id", data.typeId)
        .order("display_order", { ascending: false })
        .limit(1);

      const nextOrder = (existingSteps?.[0]?.display_order || 0) + 1;
      const nextNumber = (existingSteps?.[0]?.step_number || 0) + 1;

      const { error } = await supabase.from("coach_steps").insert({
        coach_type_id: data.typeId,
        step_number: nextNumber,
        step_id: `s${nextNumber}`,
        label: data.label,
        title: data.title,
        display_order: nextOrder,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-builder-types"] });
      toast({ title: "Étape créée" });
      setShowNewStepDialog(false);
      setNewStepData({ label: "", title: "" });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de créer l'étape", variant: "destructive" });
    },
  });

  const openEditTypeDialog = (type: any) => {
    setEditingType({ ...type });
    setShowEditTypeDialog(true);
  };

  const openNewStepDialog = (typeId: string) => {
    setNewStepTypeId(typeId);
    setShowNewStepDialog(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const defaultTab = types?.[0]?.id || "";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Sélectionnez un type puis cliquez sur une étape pour la modifier.
        </p>
        <Button variant="outline" size="sm" onClick={() => setShowNewTypeDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau type
        </Button>
      </div>

      {/* Tabs by type */}
      {types && types.length > 0 && (
        <Tabs defaultValue={defaultTab} className="space-y-4">
          <TabsList>
            {types.map((type) => (
              <TabsTrigger key={type.id} value={type.id} className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: type.theme_color }}
                />
                {type.label}
                {!type.is_active && (
                  <Badge variant="secondary" className="text-[10px] px-1 py-0 ml-1">Off</Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {types.map((type) => (
            <TabsContent key={type.id} value={type.id}>
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {type.label}
                        <Badge variant="outline" className="text-xs font-normal">
                          {type.steps.length} étape{type.steps.length > 1 ? "s" : ""}
                        </Badge>
                      </CardTitle>
                      {type.coaches?.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Coach{type.coaches.length > 1 ? "s" : ""} :{" "}
                          {type.coaches.map((c: any) => c.full_name || c.email).join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openNewStepDialog(type.id)}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Ajouter une étape
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditTypeDialog(type)}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {type.steps.length > 0 ? (
                    <div className="space-y-1.5">
                      {type.steps.map((step: any) => (
                        <div
                          key={step.id}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-md border cursor-pointer transition-colors",
                            "hover:bg-accent/50",
                            !step.is_active && "opacity-50"
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: type.theme_color }}
                            />
                            <span className="text-sm font-medium">{step.label}</span>
                            <span className="text-sm text-muted-foreground truncate">
                              {step.title}
                            </span>
                            {!step.is_active && (
                              <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                Inactif
                              </Badge>
                            )}
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Aucune étape pour ce type. Cliquez sur "Ajouter une étape" pour commencer.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* New type dialog */}
      <Dialog open={showNewTypeDialog} onOpenChange={setShowNewTypeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau type de coaching</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nom du type</Label>
              <Input
                value={newTypeData.label}
                onChange={(e) => setNewTypeData({ ...newTypeData, label: e.target.value })}
                placeholder="Ex: Gestion des Objections"
              />
            </div>
            <div className="space-y-2">
              <Label>Couleur</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={newTypeData.theme_color}
                  onChange={(e) => setNewTypeData({ ...newTypeData, theme_color: e.target.value })}
                  className="w-20 h-10 p-1"
                />
                <Input
                  value={newTypeData.theme_color}
                  onChange={(e) => setNewTypeData({ ...newTypeData, theme_color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewTypeDialog(false)}>Annuler</Button>
            <Button
              onClick={() => createType.mutate(newTypeData)}
              disabled={!newTypeData.label || createType.isPending}
            >
              {createType.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit type dialog */}
      <Dialog open={showEditTypeDialog} onOpenChange={(open) => { if (!open) { setShowEditTypeDialog(false); setEditingType(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le type de coaching</DialogTitle>
          </DialogHeader>
          {editingType && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nom du type</Label>
                <Input
                  value={editingType.label}
                  onChange={(e) => setEditingType({ ...editingType, label: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Couleur</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={editingType.theme_color}
                    onChange={(e) => setEditingType({ ...editingType, theme_color: e.target.value })}
                    className="w-20 h-10 p-1"
                  />
                  <Input
                    value={editingType.theme_color}
                    onChange={(e) => setEditingType({ ...editingType, theme_color: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label>Actif</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingType({ ...editingType, is_active: !editingType.is_active })}
                >
                  {editingType.is_active ? "Actif" : "Inactif"}
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditTypeDialog(false); setEditingType(null); }}>Annuler</Button>
            <Button
              onClick={() => updateType.mutate(editingType)}
              disabled={updateType.isPending}
            >
              {updateType.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New step dialog */}
      <Dialog open={showNewStepDialog} onOpenChange={setShowNewStepDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle étape</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Label</Label>
              <Input
                value={newStepData.label}
                onChange={(e) => setNewStepData({ ...newStepData, label: e.target.value })}
                placeholder="Ex: Étape 07"
              />
            </div>
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input
                value={newStepData.title}
                onChange={(e) => setNewStepData({ ...newStepData, title: e.target.value })}
                placeholder="Ex: Gestion des relances"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewStepDialog(false)}>Annuler</Button>
            <Button
              onClick={() => createStep.mutate({ typeId: newStepTypeId, label: newStepData.label, title: newStepData.title })}
              disabled={!newStepData.label || !newStepData.title || createStep.isPending}
            >
              {createStep.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
