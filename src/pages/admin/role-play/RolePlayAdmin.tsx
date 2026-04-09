import React, { useState, useEffect, useRef } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  useProspectProfiles,
  useProspectProfileWithScripts,
  useCreateProspectProfile,
  useUpdateProspectProfile,
  useDeleteProspectProfile,
  useUpsertProspectScript,
  type ProspectNiveau,
  type TypeAppel,
  type ProspectReplique,
} from "@/hooks/useRolePlay";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, X, Loader2, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Auto-resize Textarea ───

function AutoTextarea({ value, onChange, placeholder, className }: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0";
    el.style.height = el.scrollHeight + "px";
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onInput={() => { const el = ref.current; if (el) { el.style.height = "0"; el.style.height = el.scrollHeight + "px"; } }}
      placeholder={placeholder}
      rows={1}
      className={cn(
        "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none overflow-hidden min-h-[38px]",
        className
      )}
    />
  );
}

// ─── Repliques Editor ───

function RepliquesEditor({ repliques, onChange }: {
  repliques: ProspectReplique[];
  onChange: (repliques: ProspectReplique[]) => void;
}) {
  const add = () => onChange([...repliques, { cue: "", reponse: "" }]);
  const update = (idx: number, updates: Partial<ProspectReplique>) =>
    onChange(repliques.map((r, i) => (i === idx ? { ...r, ...updates } : r)));
  const remove = (idx: number) => onChange(repliques.filter((_, i) => i !== idx));

  return (
    <div className="space-y-3">
      {repliques.map((r, idx) => (
        <Card key={idx}>
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-8 text-right shrink-0">{idx + 1}.</span>
              <Input
                value={r.cue}
                onChange={(e) => update(idx, { cue: e.target.value })}
                placeholder="Situation (cue)..."
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-destructive h-9 w-9"
                onClick={() => remove(idx)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="pl-10">
              <AutoTextarea
                value={r.reponse}
                onChange={(v) => update(idx, { reponse: v })}
                placeholder="Réponse du prospect..."
              />
            </div>
          </CardContent>
        </Card>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add} className="gap-1.5">
        <Plus className="h-3.5 w-3.5" />
        Ajouter une réplique
      </Button>
    </div>
  );
}

// ─── Create/Edit Profile Dialog ───

function ProfileDialog({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: any;
}) {
  const isEdit = !!initial;
  const create = useCreateProspectProfile();
  const update = useUpdateProspectProfile();

  const [emoji, setEmoji] = useState("🎭");
  const [label, setLabel] = useState("");
  const [niveau, setNiveau] = useState<ProspectNiveau>("facile");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!open) return;
    setEmoji(initial?.emoji ?? "🎭");
    setLabel(initial?.label ?? "");
    setNiveau(initial?.niveau ?? "facile");
    setDescription(initial?.description ?? "");
  }, [open, initial]);

  const saving = create.isPending || update.isPending;

  const handleSave = async () => {
    if (!label.trim()) {
      toast.error("Le label est requis.");
      return;
    }
    try {
      if (isEdit) {
        await update.mutateAsync({ id: initial.id, emoji, label: label.trim(), niveau, description: description.trim() });
        toast.success("Profil mis à jour.");
      } else {
        await create.mutateAsync({ emoji, label: label.trim(), niveau, description: description.trim() });
        toast.success("Profil créé.");
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Erreur.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading">
            {isEdit ? "Modifier le profil" : "Nouveau profil prospect"}
          </DialogTitle>
          <DialogDescription>
            Définis un type de prospect pour les jeux de rôle d'entraînement.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1.5 col-span-1">
              <Label>Emoji</Label>
              <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} className="text-xl text-center" />
            </div>
            <div className="space-y-1.5 col-span-3">
              <Label>Label</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Le Coopératif" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Niveau</Label>
            <Select value={niveau} onValueChange={(v) => setNiveau(v as ProspectNiveau)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="facile">⭐ Facile</SelectItem>
                <SelectItem value="moyen">⭐⭐ Moyen</SelectItem>
                <SelectItem value="difficile">⭐⭐⭐ Difficile</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <AutoTextarea value={description} onChange={setDescription} placeholder="Comportement et particularités du prospect..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Script Editor Dialog ───

function ScriptDialog({
  open,
  onOpenChange,
  profileId,
  typeAppel,
  script,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profileId: string;
  typeAppel: TypeAppel;
  script?: any;
}) {
  const upsert = useUpsertProspectScript();

  const [titre, setTitre] = useState("");
  const [intro, setIntro] = useState("");
  const [repliques, setRepliques] = useState<ProspectReplique[]>([]);

  useEffect(() => {
    if (!open) return;
    const defaultTitre =
      typeAppel === "ads" ? "Appel Découverte Ads" :
      typeAppel === "organique" ? "Appel Découverte Organique" :
      "Appel de Transformation / Closing";
    setTitre(script?.titre ?? defaultTitre);
    setIntro(script?.intro ?? "");
    setRepliques(script?.repliques ?? []);
  }, [open, script, typeAppel]);

  const saving = upsert.isPending;

  const handleSave = async () => {
    if (!titre.trim()) {
      toast.error("Le titre est requis.");
      return;
    }
    try {
      await upsert.mutateAsync({
        id: script?.id,
        profile_id: profileId,
        type_appel: typeAppel,
        titre: titre.trim(),
        intro: intro.trim(),
        repliques: repliques.filter((r) => r.cue.trim() || r.reponse.trim()),
      });
      toast.success("Script enregistré.");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Erreur.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="font-heading">
            Script — {typeAppel === "ads" ? "📞 Ads" : typeAppel === "organique" ? "🌱 Organique" : "🔥 Closing"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Titre</Label>
              <Input value={titre} onChange={(e) => setTitre(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Intro / Contexte</Label>
              <AutoTextarea
                value={intro}
                onChange={setIntro}
                placeholder="Ex: Tu joues un prospect coopératif contacté via une pub Facebook..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Répliques du prospect</Label>
              <RepliquesEditor repliques={repliques} onChange={setRepliques} />
            </div>
          </div>
        </div>
        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───

export default function RolePlayAdmin() {
  const { profile } = useAuth();
  const { data: profiles, isLoading } = useProspectProfiles();

  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editProfile, setEditProfile] = useState<any>(null);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [scriptEdit, setScriptEdit] = useState<{ profileId: string; typeAppel: TypeAppel; script?: any } | null>(null);
  const [activeAppel, setActiveAppel] = useState<TypeAppel>("ads");

  const deleteProfile = useDeleteProspectProfile();
  const { data: detail } = useProspectProfileWithScripts(selectedProfileId);

  if (profile?.role !== "ceo") {
    return <Navigate to="/training" replace />;
  }

  const handleDeleteProfile = async () => {
    if (!deleteTarget) return;
    try {
      await deleteProfile.mutateAsync(deleteTarget.id);
      toast.success("Profil supprimé.");
      if (selectedProfileId === deleteTarget.id) setSelectedProfileId(null);
    } catch {
      toast.error("Erreur lors de la suppression.");
    }
    setDeleteTarget(null);
  };

  const currentScript = detail?.scripts.find((s) => s.type_appel === activeAppel);

  if (isLoading) {
    return <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading">Gestion Rôle-Play</h1>
          <p className="text-muted-foreground">
            Gère les profils de prospects et leurs scripts de jeu de rôle
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nouveau profil
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Liste des profils */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Profils ({profiles?.length || 0})
          </p>
          {profiles?.map((p) => (
            <Card
              key={p.id}
              className={cn(
                "cursor-pointer transition-colors group",
                selectedProfileId === p.id ? "border-primary bg-primary/5" : "hover:border-primary/30"
              )}
              onClick={() => setSelectedProfileId(p.id)}
            >
              <CardContent className="p-3 flex items-center gap-3">
                <span className="text-2xl">{p.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{p.label}</p>
                  <Badge variant="outline" className="text-[10px] mt-0.5">
                    {p.niveau}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditProfile(p);
                      setEditProfileOpen(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget({ id: p.id, label: p.label });
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Detail du profil selectionné */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedProfileId || !detail ? (
            <Card>
              <CardContent className="py-24 text-center text-muted-foreground">
                Sélectionne un profil pour voir et éditer ses scripts
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <span className="text-3xl">{detail.profile.emoji}</span>
                  <div className="flex-1">
                    <h2 className="font-bold text-lg font-heading">{detail.profile.label}</h2>
                    <p className="text-sm text-muted-foreground">{detail.profile.description}</p>
                  </div>
                </CardContent>
              </Card>

              <Tabs value={activeAppel} onValueChange={(v) => setActiveAppel(v as TypeAppel)}>
                <TabsList className="grid grid-cols-3">
                  <TabsTrigger value="ads">📞 Ads</TabsTrigger>
                  <TabsTrigger value="organique">🌱 Organique</TabsTrigger>
                  <TabsTrigger value="transformation">🔥 Closing</TabsTrigger>
                </TabsList>
              </Tabs>

              {currentScript ? (
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Intro</p>
                      <p className="text-sm text-foreground">{currentScript.intro || <em className="text-muted-foreground">Aucune intro</em>}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        Répliques ({currentScript.repliques.length})
                      </p>
                      <div className="space-y-1.5">
                        {currentScript.repliques.map((r, idx) => (
                          <div key={idx} className="text-sm bg-muted/50 rounded p-2">
                            <span className="font-medium text-muted-foreground">📍 {r.cue}</span>
                            <p className="mt-0.5 italic">« {r.reponse} »</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setScriptEdit({ profileId: selectedProfileId, typeAppel: activeAppel, script: currentScript })}
                      className="gap-2"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Éditer ce script
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground mb-4">Aucun script pour ce type d'appel.</p>
                    <Button
                      onClick={() => setScriptEdit({ profileId: selectedProfileId, typeAppel: activeAppel })}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Créer le script
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <ProfileDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ProfileDialog open={editProfileOpen} onOpenChange={setEditProfileOpen} initial={editProfile} />
      {scriptEdit && (
        <ScriptDialog
          open={!!scriptEdit}
          onOpenChange={(open) => !open && setScriptEdit(null)}
          profileId={scriptEdit.profileId}
          typeAppel={scriptEdit.typeAppel}
          script={scriptEdit.script}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce profil ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le profil « {deleteTarget?.label} » et tous ses scripts seront définitivement supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProfile} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
