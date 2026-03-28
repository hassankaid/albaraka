import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Settings, Users, FileText, MessageSquare, Calendar, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function AdminCoaching() {
  const { profile } = useAuth();

  if (profile?.role !== "ceo") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Administration Coaching</h1>
        <p className="text-muted-foreground">Gérez les types, coachs, étapes et contenus de coaching.</p>
      </div>

      <Tabs defaultValue="types">
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="types" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Types
          </TabsTrigger>
          <TabsTrigger value="coachs" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Coachs
          </TabsTrigger>
          <TabsTrigger value="etapes" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Étapes
          </TabsTrigger>
          <TabsTrigger value="contenu" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Contenu
          </TabsTrigger>
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Sessions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="types" className="mt-6">
          <TypesTab />
        </TabsContent>
        <TabsContent value="coachs" className="mt-6">
          <CoachsTab />
        </TabsContent>
        <TabsContent value="etapes" className="mt-6">
          <EtapesTab />
        </TabsContent>
        <TabsContent value="contenu" className="mt-6">
          <ContenuTab />
        </TabsContent>
        <TabsContent value="sessions" className="mt-6">
          <SessionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ONGLET TYPES DE COACHING
// ═══════════════════════════════════════════════════════════════════

function TypesTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editingType, setEditingType] = useState<any>(null);

  const { data: types, isLoading } = useQuery({
    queryKey: ["admin-coach-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coach_types")
        .select(`
          *,
          assigned_coach:profiles!coach_types_assigned_coach_id_fkey(id, email, full_name)
        `)
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: allProfiles } = useQuery({
    queryKey: ["all-profiles-for-assign"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, is_coach")
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const updateType = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase
        .from("coach_types")
        .update(updates)
        .eq("id", editingType.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coach-types"] });
      toast({ title: "Type mis à jour" });
      setEditingType(null);
    },
  });

  if (isLoading) return <Loader2 className="h-6 w-6 animate-spin" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Types de coaching</CardTitle>
        <CardDescription>Gérez les 4 types de coaching et leurs coachs assignés.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Coach assigné</TableHead>
              <TableHead>Sous-modes</TableHead>
              <TableHead>Actif</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {types?.map((type) => (
              <TableRow key={type.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: type.theme_color }} />
                    <div>
                      <div className="font-medium">{type.label}</div>
                      <div className="text-xs text-muted-foreground">{type.name}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {type.assigned_coach?.full_name || type.assigned_coach?.email || (
                    <span className="text-muted-foreground">Non assigné</span>
                  )}
                </TableCell>
                <TableCell>
                  {type.sub_modes?.length > 0 ? (
                    <div className="flex gap-1 flex-wrap">
                      {type.sub_modes.map((mode: string) => (
                        <Badge key={mode} variant="secondary" className="text-xs">{mode}</Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={type.is_active ? "default" : "secondary"}>
                    {type.is_active ? "Actif" : "Inactif"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => setEditingType(type)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Dialog open={!!editingType} onOpenChange={(open) => !open && setEditingType(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier le type de coaching</DialogTitle>
            </DialogHeader>
            {editingType && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Label</Label>
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
                      className="w-20 h-10"
                    />
                    <Input
                      value={editingType.theme_color}
                      onChange={(e) => setEditingType({ ...editingType, theme_color: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Coach assigné</Label>
                  <Select
                    value={editingType.assigned_coach_id || "none"}
                    onValueChange={(value) => setEditingType({
                      ...editingType,
                      assigned_coach_id: value === "none" ? null : value,
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un coach" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun</SelectItem>
                      {allProfiles?.filter((p) => p.is_coach).map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.full_name || p.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <Label>Actif</Label>
                  <Switch
                    checked={editingType.is_active}
                    onCheckedChange={(checked) => setEditingType({ ...editingType, is_active: checked })}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingType(null)}>Annuler</Button>
              <Button
                onClick={() => updateType.mutate({
                  label: editingType.label,
                  theme_color: editingType.theme_color,
                  assigned_coach_id: editingType.assigned_coach_id,
                  is_active: editingType.is_active,
                })}
                disabled={updateType.isPending}
              >
                {updateType.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ONGLET COACHS
// ═══════════════════════════════════════════════════════════════════

function CoachsTab() {
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

  const toggleCoach = useMutation({
    mutationFn: async ({ id, is_coach }: { id: string; is_coach: boolean }) => {
      const { error } = await supabase.from("profiles").update({ is_coach }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-profiles-coach"] });
      toast({ title: "Statut mis à jour" });
    },
  });

  if (isLoading) return <Loader2 className="h-6 w-6 animate-spin" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Désigner les coachs</CardTitle>
        <CardDescription>
          Activez le statut "Coach" pour permettre à un collaborateur de créer des sessions de coaching.
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
                <TableCell className="font-medium">{p.full_name || "—"}</TableCell>
                <TableCell>{p.email}</TableCell>
                <TableCell><Badge variant="outline">{p.role}</Badge></TableCell>
                <TableCell>
                  <Switch
                    checked={p.is_coach ?? false}
                    onCheckedChange={(checked) => toggleCoach.mutate({ id: p.id, is_coach: checked })}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ONGLET ÉTAPES
// ═══════════════════════════════════════════════════════════════════

function EtapesTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<string>("");
  const [editingStep, setEditingStep] = useState<any>(null);

  const { data: types } = useQuery({
    queryKey: ["admin-coach-types-simple"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coach_types")
        .select("id, name, label, theme_color")
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: steps, isLoading } = useQuery({
    queryKey: ["admin-coach-steps", selectedType],
    queryFn: async () => {
      if (!selectedType) return [];
      const { data, error } = await supabase
        .from("coach_steps")
        .select("*")
        .eq("coach_type_id", selectedType)
        .order("display_order");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedType,
  });

  const updateStep = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase.from("coach_steps").update(updates).eq("id", editingStep.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coach-steps"] });
      toast({ title: "Étape mise à jour" });
      setEditingStep(null);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gérer les étapes</CardTitle>
        <CardDescription>Modifiez le titre, l'objectif et les tips de chaque étape.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Type de coaching</Label>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Sélectionner un type" />
            </SelectTrigger>
            <SelectContent>
              {types?.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.theme_color }} />
                    {type.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading && <Loader2 className="h-6 w-6 animate-spin" />}

        {steps && steps.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Étape</TableHead>
                <TableHead>Titre</TableHead>
                <TableHead>Actif</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {steps.map((step) => (
                <TableRow key={step.id}>
                  <TableCell className="font-medium">{step.label}</TableCell>
                  <TableCell>{step.title}</TableCell>
                  <TableCell>
                    <Badge variant={step.is_active ? "default" : "secondary"}>
                      {step.is_active ? "Actif" : "Inactif"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => setEditingStep(step)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Dialog open={!!editingStep} onOpenChange={(open) => !open && setEditingStep(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Modifier l'étape</DialogTitle>
            </DialogHeader>
            {editingStep && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Label</Label>
                    <Input
                      value={editingStep.label}
                      onChange={(e) => setEditingStep({ ...editingStep, label: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Titre</Label>
                    <Input
                      value={editingStep.title}
                      onChange={(e) => setEditingStep({ ...editingStep, title: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Objectif</Label>
                  <Textarea
                    value={editingStep.objective || ""}
                    onChange={(e) => setEditingStep({ ...editingStep, objective: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tips (un par ligne)</Label>
                  <Textarea
                    value={editingStep.tips?.join("\n") || ""}
                    onChange={(e) => setEditingStep({
                      ...editingStep,
                      tips: e.target.value.split("\n").filter((t: string) => t.trim()),
                    })}
                    rows={5}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Actif</Label>
                  <Switch
                    checked={editingStep.is_active}
                    onCheckedChange={(checked) => setEditingStep({ ...editingStep, is_active: checked })}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingStep(null)}>Annuler</Button>
              <Button
                onClick={() => updateStep.mutate({
                  label: editingStep.label,
                  title: editingStep.title,
                  objective: editingStep.objective,
                  tips: editingStep.tips,
                  is_active: editingStep.is_active,
                })}
                disabled={updateStep.isPending}
              >
                {updateStep.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ONGLET CONTENU (Critères, Scripts, Débriefs)
// ═══════════════════════════════════════════════════════════════════

function ContenuTab() {
  const [subTab, setSubTab] = useState<"criteres" | "scripts" | "debriefs">("criteres");

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button variant={subTab === "criteres" ? "default" : "outline"} onClick={() => setSubTab("criteres")}>
          Critères d'évaluation
        </Button>
        <Button variant={subTab === "scripts" ? "default" : "outline"} onClick={() => setSubTab("scripts")}>
          Scripts de référence
        </Button>
        <Button variant={subTab === "debriefs" ? "default" : "outline"} onClick={() => setSubTab("debriefs")}>
          Options de débrief
        </Button>
      </div>

      {subTab === "criteres" && <CriteresSection />}
      {subTab === "scripts" && <ScriptsSection />}
      {subTab === "debriefs" && <DebriefsSection />}
    </div>
  );
}

function CriteresSection() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedStep, setSelectedStep] = useState<string>("");
  const [editingCriteria, setEditingCriteria] = useState<any>(null);

  const { data: types } = useQuery({
    queryKey: ["admin-coach-types-simple"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coach_types")
        .select("id, name, label, theme_color")
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: steps } = useQuery({
    queryKey: ["admin-coach-steps-simple", selectedType],
    queryFn: async () => {
      if (!selectedType) return [];
      const { data, error } = await supabase
        .from("coach_steps")
        .select("id, label, title")
        .eq("coach_type_id", selectedType)
        .order("display_order");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedType,
  });

  const { data: criteria, isLoading } = useQuery({
    queryKey: ["admin-coach-criteria", selectedStep],
    queryFn: async () => {
      if (!selectedStep) return [];
      const { data, error } = await supabase
        .from("coach_criteria")
        .select("*")
        .eq("step_id", selectedStep)
        .order("display_order");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedStep,
  });

  const updateCriteria = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase.from("coach_criteria").update(updates).eq("id", editingCriteria.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coach-criteria"] });
      toast({ title: "Critère mis à jour" });
      setEditingCriteria(null);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Critères d'évaluation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <Select value={selectedType} onValueChange={(v) => { setSelectedType(v); setSelectedStep(""); }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              {types?.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedStep} onValueChange={setSelectedStep} disabled={!selectedType}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Étape" />
            </SelectTrigger>
            <SelectContent>
              {steps?.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading && <Loader2 className="h-6 w-6 animate-spin" />}

        {criteria && criteria.length > 0 && (
          <div className="space-y-2">
            {criteria.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-3 border rounded-lg">
                <p className="text-sm flex-1">{c.criteria_text}</p>
                <Button variant="ghost" size="sm" onClick={() => setEditingCriteria(c)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <Dialog open={!!editingCriteria} onOpenChange={(open) => !open && setEditingCriteria(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier le critère</DialogTitle>
            </DialogHeader>
            {editingCriteria && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Texte du critère</Label>
                  <Textarea
                    value={editingCriteria.criteria_text}
                    onChange={(e) => setEditingCriteria({ ...editingCriteria, criteria_text: e.target.value })}
                    rows={4}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Actif</Label>
                  <Switch
                    checked={editingCriteria.is_active}
                    onCheckedChange={(checked) => setEditingCriteria({ ...editingCriteria, is_active: checked })}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingCriteria(null)}>Annuler</Button>
              <Button
                onClick={() => updateCriteria.mutate({
                  criteria_text: editingCriteria.criteria_text,
                  is_active: editingCriteria.is_active,
                })}
                disabled={updateCriteria.isPending}
              >
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function ScriptsSection() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedStep, setSelectedStep] = useState<string>("");
  const [editingScript, setEditingScript] = useState<any>(null);

  const { data: types } = useQuery({
    queryKey: ["admin-coach-types-simple"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coach_types")
        .select("id, name, label, theme_color")
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: steps } = useQuery({
    queryKey: ["admin-coach-steps-simple", selectedType],
    queryFn: async () => {
      if (!selectedType) return [];
      const { data, error } = await supabase
        .from("coach_steps")
        .select("id, label, title")
        .eq("coach_type_id", selectedType)
        .order("display_order");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedType,
  });

  const { data: scripts, isLoading } = useQuery({
    queryKey: ["admin-coach-scripts", selectedStep],
    queryFn: async () => {
      if (!selectedStep) return [];
      const { data, error } = await supabase
        .from("coach_script_refs")
        .select("*")
        .eq("step_id", selectedStep)
        .order("display_order");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedStep,
  });

  const updateScript = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase.from("coach_script_refs").update(updates).eq("id", editingScript.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coach-scripts"] });
      toast({ title: "Script mis à jour" });
      setEditingScript(null);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scripts de référence</CardTitle>
        <CardDescription>Modifiez les scripts affichés aux coachs pendant les sessions.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <Select value={selectedType} onValueChange={(v) => { setSelectedType(v); setSelectedStep(""); }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              {types?.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedStep} onValueChange={setSelectedStep} disabled={!selectedType}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Étape" />
            </SelectTrigger>
            <SelectContent>
              {steps?.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading && <Loader2 className="h-6 w-6 animate-spin" />}

        {scripts && scripts.length > 0 && (
          <div className="space-y-3">
            {scripts.map((script) => (
              <div key={script.id} className="p-4 border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{script.sub_mode || "Par défaut"}</Badge>
                  <Button variant="ghost" size="sm" onClick={() => setEditingScript(script)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {script.script_lines?.slice(0, 3).map((line: string, i: number) => (
                    <li key={i}>• {line}</li>
                  ))}
                  {(script.script_lines?.length || 0) > 3 && (
                    <li className="text-xs">... +{(script.script_lines?.length || 0) - 3} lignes</li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        )}

        <Dialog open={!!editingScript} onOpenChange={(open) => !open && setEditingScript(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Modifier le script{editingScript?.sub_mode ? ` — ${editingScript.sub_mode}` : ""}</DialogTitle>
            </DialogHeader>
            {editingScript && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Lignes du script (une par ligne)</Label>
                  <Textarea
                    value={editingScript.script_lines?.join("\n") || ""}
                    onChange={(e) => setEditingScript({
                      ...editingScript,
                      script_lines: e.target.value.split("\n").filter((l: string) => l.trim()),
                    })}
                    rows={12}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingScript(null)}>Annuler</Button>
              <Button
                onClick={() => updateScript.mutate({ script_lines: editingScript.script_lines })}
                disabled={updateScript.isPending}
              >
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function DebriefsSection() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedStep, setSelectedStep] = useState<string>("");
  const [editingDebrief, setEditingDebrief] = useState<any>(null);

  const { data: types } = useQuery({
    queryKey: ["admin-coach-types-simple"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coach_types")
        .select("id, name, label, theme_color")
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: steps } = useQuery({
    queryKey: ["admin-coach-steps-simple", selectedType],
    queryFn: async () => {
      if (!selectedType) return [];
      const { data, error } = await supabase
        .from("coach_steps")
        .select("id, label, title")
        .eq("coach_type_id", selectedType)
        .order("display_order");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedType,
  });

  const { data: debriefs, isLoading } = useQuery({
    queryKey: ["admin-coach-debriefs", selectedStep],
    queryFn: async () => {
      if (!selectedStep) return [];
      const { data, error } = await supabase
        .from("coach_debrief_options")
        .select("*")
        .eq("step_id", selectedStep)
        .order("display_order");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedStep,
  });

  const updateDebrief = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase.from("coach_debrief_options").update(updates).eq("id", editingDebrief.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coach-debriefs"] });
      toast({ title: "Débrief mis à jour" });
      setEditingDebrief(null);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Options de débrief</CardTitle>
        <CardDescription>Modifiez les options de débrief que les coachs peuvent sélectionner.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <Select value={selectedType} onValueChange={(v) => { setSelectedType(v); setSelectedStep(""); }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              {types?.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedStep} onValueChange={setSelectedStep} disabled={!selectedType}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Étape" />
            </SelectTrigger>
            <SelectContent>
              {steps?.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading && <Loader2 className="h-6 w-6 animate-spin" />}

        {debriefs && debriefs.length > 0 && (
          <div className="space-y-3">
            {debriefs.map((d) => (
              <div key={d.id} className="p-4 border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">{d.debrief_label}</p>
                  <Button variant="ghost" size="sm" onClick={() => setEditingDebrief(d)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {d.options?.map((opt: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-xs">{opt}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={!!editingDebrief} onOpenChange={(open) => !open && setEditingDebrief(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier le débrief</DialogTitle>
            </DialogHeader>
            {editingDebrief && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Label</Label>
                  <Input
                    value={editingDebrief.debrief_label}
                    onChange={(e) => setEditingDebrief({ ...editingDebrief, debrief_label: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Options (une par ligne)</Label>
                  <Textarea
                    value={editingDebrief.options?.join("\n") || ""}
                    onChange={(e) => setEditingDebrief({
                      ...editingDebrief,
                      options: e.target.value.split("\n").filter((o: string) => o.trim()),
                    })}
                    rows={6}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingDebrief(null)}>Annuler</Button>
              <Button
                onClick={() => updateDebrief.mutate({
                  debrief_label: editingDebrief.debrief_label,
                  options: editingDebrief.options,
                })}
                disabled={updateDebrief.isPending}
              >
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ONGLET SESSIONS
// ═══════════════════════════════════════════════════════════════════

function SessionsTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["admin-all-sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coaching_sessions")
        .select(`
          *,
          coach_type:coach_types(id, label, theme_color),
          student:profiles!coaching_sessions_student_user_id_fkey(id, email, full_name),
          coach:profiles!coaching_sessions_coach_user_id_fkey(id, email, full_name)
        `)
        .order("session_date", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const deleteSession = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("coaching_scores").delete().eq("session_id", id);
      const { error } = await supabase.from("coaching_sessions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-sessions"] });
      toast({ title: "Session supprimée" });
    },
  });

  if (isLoading) return <Loader2 className="h-6 w-6 animate-spin" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Toutes les sessions</CardTitle>
        <CardDescription>Consultez et gérez toutes les sessions de coaching.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Élève</TableHead>
              <TableHead>Coach</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions?.map((session) => (
              <TableRow key={session.id}>
                <TableCell>
                  {format(new Date(session.session_date), "dd/MM/yyyy", { locale: fr })}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: session.coach_type?.theme_color }} />
                    {session.coach_type?.label}
                  </div>
                </TableCell>
                <TableCell>{session.student?.full_name || session.student?.email}</TableCell>
                <TableCell>{session.coach?.full_name || session.coach?.email}</TableCell>
                <TableCell>
                  {session.global_score ? `${Number(session.global_score).toFixed(1)}/5` : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={session.status === "completed" ? "default" : "secondary"}>
                    {session.status === "completed" ? "Terminée" : "Brouillon"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm("Supprimer cette session ?")) {
                        deleteSession.mutate(session.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
