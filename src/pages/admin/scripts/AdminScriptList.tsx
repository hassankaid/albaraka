import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  useScripts,
  useObjectionCategories,
  useCreateScript,
  useUpdateScript,
  useDeleteScript,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useCreateObjection,
  useUpdateObjection,
  useDeleteObjection,
} from "@/hooks/useScripts";
import type { Script, ObjectionCategory, Objection } from "@/lib/scripts/types";
import { VOIX_CONFIG } from "@/lib/scripts/types";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Settings2,
  ScrollText,
  ShieldAlert,
  X,
} from "lucide-react";
import { toast } from "sonner";

// ─── Script Create/Edit Dialog ───

function ScriptDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: { nom: string; icon: string; couleur: string; cat: string; type: string; description: string };
  onSubmit: (data: { nom: string; icon: string; couleur: string; cat: string; type: string; description: string }) => void;
  isPending: boolean;
}) {
  const [nom, setNom] = useState(initial?.nom ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? "");
  const [couleur, setCouleur] = useState(initial?.couleur ?? "#d4a853");
  const [cat, setCat] = useState(initial?.cat ?? "calls");
  const [type, setType] = useState(initial?.type ?? "setting");
  const [description, setDescription] = useState(initial?.description ?? "");

  const isEdit = !!initial;

  const handleSubmit = () => {
    if (!nom.trim()) {
      toast.error("Le nom est requis");
      return;
    }
    onSubmit({ nom: nom.trim(), icon, couleur, cat, type, description: description.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading">
            {isEdit ? "Modifier le script" : "Nouveau script"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Nom</Label>
            <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Mon script" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Icone (emoji)</Label>
              <Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="📞" />
            </div>
            <div className="space-y-2">
              <Label>Couleur</Label>
              <Input type="color" value={couleur} onChange={(e) => setCouleur(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="setting">Setting</SelectItem>
                  <SelectItem value="closing">Closing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Categorie</Label>
              <Select value={cat} onValueChange={setCat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="calls">Appels</SelectItem>
                  <SelectItem value="messages">Messages</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description du script..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? "Enregistrer" : "Creer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Category Create/Edit Dialog ───

function CategoryDialog({
  open,
  onOpenChange,
  initial,
  categoryType,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: { label: string; icon: string };
  categoryType: "setting" | "closing";
  onSubmit: (data: { label: string; icon: string; type: string }) => void;
  isPending: boolean;
}) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? "");

  const isEdit = !!initial;

  const handleSubmit = () => {
    if (!label.trim()) {
      toast.error("Le libelle est requis");
      return;
    }
    onSubmit({ label: label.trim(), icon, type: categoryType });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-heading">
            {isEdit ? "Modifier la categorie" : "Nouvelle categorie"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Libelle</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ma categorie" />
          </div>
          <div className="space-y-2">
            <Label>Icone (emoji)</Label>
            <Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="🛡️" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? "Enregistrer" : "Creer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Objection Create/Edit Dialog ───

function AutoTextarea({ value, onChange, placeholder, className }: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0";
    el.style.height = el.scrollHeight + "px";
  }, [value]);
  return (
    <textarea ref={ref} value={value} onChange={(e) => onChange(e.target.value)}
      onInput={() => { const el = ref.current; if (el) { el.style.height = "0"; el.style.height = el.scrollHeight + "px"; } }}
      placeholder={placeholder} rows={1}
      className={`flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none overflow-hidden min-h-[38px] ${className || ""}`}
    />
  );
}

function ObjectionDialog({
  open,
  onOpenChange,
  initial,
  categoryId,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Objection;
  categoryId: string;
  onSubmit: (data: { category_id: string; situation: string; reponse: string; verbatim?: string; etapes?: string[] }) => void;
  isPending: boolean;
}) {
  const [situation, setSituation] = useState("");
  const [reponse, setReponse] = useState("");
  const [verbatim, setVerbatim] = useState("");
  const [etapesList, setEtapesList] = useState<string[]>([]);

  const isEdit = !!initial;

  // Init form when dialog opens
  React.useEffect(() => {
    if (!open) return;
    setSituation(initial?.situation ?? "");
    setReponse(initial?.reponse ?? "");
    setVerbatim(initial?.verbatim ?? "");
    setEtapesList(initial?.etapes ?? []);
  }, [open, initial]);

  const handleSubmit = () => {
    if (!situation.trim() || !reponse.trim()) {
      toast.error("La situation et la réponse sont requises");
      return;
    }
    const cleanEtapes = etapesList.filter(Boolean);
    onSubmit({
      category_id: categoryId,
      situation: situation.trim(),
      reponse: reponse.trim(),
      verbatim: verbatim.trim() || undefined,
      etapes: cleanEtapes.length > 0 ? cleanEtapes : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="font-heading">
            {isEdit ? "Modifier l'objection" : "Nouvelle objection"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Situation</Label>
              <AutoTextarea value={situation} onChange={setSituation} placeholder="Quand le prospect dit..." />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Réponse</Label>
                <AutoTextarea value={reponse} onChange={setReponse} placeholder="Explication tactique..." />
              </div>
              <div className="space-y-1.5">
                <Label>Verbatim (optionnel)</Label>
                <AutoTextarea value={verbatim} onChange={setVerbatim} placeholder="Texte mot à mot à copier..." />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Étapes (optionnel)</Label>
              <div className="space-y-2">
                {etapesList.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-xs text-muted-foreground mt-2.5 w-5 text-right shrink-0">{idx + 1}</span>
                    <AutoTextarea
                      value={step}
                      onChange={(v) => setEtapesList(etapesList.map((s, i) => i === idx ? v : s))}
                      placeholder="Étape..."
                      className="flex-1"
                    />
                    <Button type="button" variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-destructive h-9 w-9"
                      onClick={() => setEtapesList(etapesList.filter((_, i) => i !== idx))}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" className="gap-1.5"
                  onClick={() => setEtapesList([...etapesList, ""])}>
                  <Plus className="h-3.5 w-3.5" />
                  Ajouter une étape
                </Button>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Scripts Tab ───

function ScriptsTab() {
  const navigate = useNavigate();
  const { data: settingScripts, isLoading: loadingSetting } = useScripts("setting");
  const { data: closingScripts, isLoading: loadingClosing } = useScripts("closing");

  const createScript = useCreateScript();
  const deleteScript = useDeleteScript();

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const isLoading = loadingSetting || loadingClosing;

  const handleCreate = (data: any) => {
    createScript.mutate(data, {
      onSuccess: () => {
        toast.success("Script cree");
        setCreateOpen(false);
      },
      onError: () => toast.error("Erreur lors de la creation"),
    });
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteScript.mutate(deleteId, {
      onSuccess: () => {
        toast.success("Script supprime");
        setDeleteId(null);
      },
      onError: () => toast.error("Erreur lors de la suppression"),
    });
  };

  const renderSection = (title: string, scripts: Script[] | undefined) => (
    <div className="space-y-3">
      <h3 className="font-heading text-lg font-semibold text-foreground">{title}</h3>
      {!scripts || scripts.length === 0 ? (
        <p className="text-sm text-muted-foreground pl-2">Aucun script dans cette section.</p>
      ) : (
        <div className="space-y-2">
          {scripts.map((script) => (
            <Card key={script.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center gap-4">
                <span className="text-2xl shrink-0">{script.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground">{script.nom}</span>
                    <Badge variant="outline" className="text-xs">
                      {script.cat === "calls" ? "Appels" : "Messages"}
                    </Badge>
                  </div>
                  {script.description && (
                    <p className="text-sm text-muted-foreground mt-0.5 truncate">
                      {script.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {script.phases.length} phase{script.phases.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(`/admin/scripts/${script.id}`)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteId(script.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nouveau script
        </Button>
      </div>

      {renderSection("Setting", settingScripts)}
      {renderSection("Closing", closingScripts)}

      {createOpen && (
        <ScriptDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSubmit={handleCreate}
          isPending={createScript.isPending}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce script ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irreversible. Le script et toutes ses phases seront supprimes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteScript.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Objections Tab ───

function ObjectionsTab() {
  const { data: settingCats, isLoading: loadingSetting } = useObjectionCategories("setting");
  const { data: closingCats, isLoading: loadingClosing } = useObjectionCategories("closing");

  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const createObjection = useCreateObjection();
  const updateObjection = useUpdateObjection();
  const deleteObjection = useDeleteObjection();

  const [createCatOpen, setCreateCatOpen] = useState<"setting" | "closing" | null>(null);
  const [editCat, setEditCat] = useState<(ObjectionCategory & { type: "setting" | "closing" }) | null>(null);
  const [deleteCatId, setDeleteCatId] = useState<string | null>(null);

  const [createObjFor, setCreateObjFor] = useState<string | null>(null);
  const [editObj, setEditObj] = useState<(Objection & { categoryId: string }) | null>(null);
  const [deleteObjId, setDeleteObjId] = useState<string | null>(null);

  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  const isLoading = loadingSetting || loadingClosing;

  const toggleExpand = (id: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreateCategory = (data: { label: string; icon: string; type: string }) => {
    createCategory.mutate(data, {
      onSuccess: () => {
        toast.success("Categorie creee");
        setCreateCatOpen(null);
      },
      onError: () => toast.error("Erreur lors de la creation"),
    });
  };

  const handleUpdateCategory = (data: { label: string; icon: string; type: string }) => {
    if (!editCat) return;
    updateCategory.mutate(
      { id: editCat.id, label: data.label, icon: data.icon },
      {
        onSuccess: () => {
          toast.success("Categorie mise a jour");
          setEditCat(null);
        },
        onError: () => toast.error("Erreur lors de la mise a jour"),
      }
    );
  };

  const handleDeleteCategory = () => {
    if (!deleteCatId) return;
    deleteCategory.mutate(deleteCatId, {
      onSuccess: () => {
        toast.success("Categorie supprimee");
        setDeleteCatId(null);
      },
      onError: () => toast.error("Erreur lors de la suppression"),
    });
  };

  const handleCreateObjection = (data: any) => {
    createObjection.mutate(data, {
      onSuccess: () => {
        toast.success("Objection creee");
        setCreateObjFor(null);
      },
      onError: () => toast.error("Erreur lors de la creation"),
    });
  };

  const handleUpdateObjection = (data: any) => {
    if (!editObj) return;
    updateObjection.mutate(
      { id: editObj.id, ...data },
      {
        onSuccess: () => {
          toast.success("Objection mise a jour");
          setEditObj(null);
        },
        onError: () => toast.error("Erreur lors de la mise a jour"),
      }
    );
  };

  const handleDeleteObjection = () => {
    if (!deleteObjId) return;
    deleteObjection.mutate(deleteObjId, {
      onSuccess: () => {
        toast.success("Objection supprimee");
        setDeleteObjId(null);
      },
      onError: () => toast.error("Erreur lors de la suppression"),
    });
  };

  const renderSection = (title: string, type: "setting" | "closing", categories: ObjectionCategory[] | undefined) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-lg font-semibold text-foreground">{title}</h3>
        <Button variant="outline" size="sm" onClick={() => setCreateCatOpen(type)} className="gap-1">
          <Plus className="h-3.5 w-3.5" />
          Nouvelle categorie
        </Button>
      </div>

      {!categories || categories.length === 0 ? (
        <p className="text-sm text-muted-foreground pl-2">Aucune categorie dans cette section.</p>
      ) : (
        <div className="space-y-2">
          {categories.map((cat) => {
            const isOpen = expandedCats.has(cat.id);
            return (
              <Card key={cat.id}>
                <Collapsible open={isOpen} onOpenChange={() => toggleExpand(cat.id)}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <span className="text-xl shrink-0">{cat.icon}</span>
                        <CardTitle className="text-base font-medium flex-1">{cat.label}</CardTitle>
                        <Badge variant="secondary" className="text-xs">
                          {cat.objections.length} objection{cat.objections.length !== 1 ? "s" : ""}
                        </Badge>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setEditCat({ ...cat, type })}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteCatId(cat.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-4 px-4 space-y-2">
                      {cat.objections.length === 0 ? (
                        <p className="text-sm text-muted-foreground pl-8">Aucune objection.</p>
                      ) : (
                        cat.objections.map((obj) => (
                          <div
                            key={obj.id}
                            className="flex items-start gap-3 pl-8 py-2 border-l-2 border-muted ml-2"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground">{obj.situation}</p>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                {obj.reponse}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setEditObj({ ...obj, categoryId: cat.id })}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => setDeleteObjId(obj.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-8 mt-2 gap-1"
                        onClick={() => setCreateObjFor(cat.id)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Nouvelle objection
                      </Button>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {renderSection("Setting", "setting", settingCats)}
      {renderSection("Closing", "closing", closingCats)}

      {/* Create category dialog */}
      {createCatOpen && (
        <CategoryDialog
          open={!!createCatOpen}
          onOpenChange={(v) => !v && setCreateCatOpen(null)}
          categoryType={createCatOpen}
          onSubmit={handleCreateCategory}
          isPending={createCategory.isPending}
        />
      )}

      {/* Edit category dialog */}
      {editCat && (
        <CategoryDialog
          open={!!editCat}
          onOpenChange={(v) => !v && setEditCat(null)}
          initial={{ label: editCat.label, icon: editCat.icon }}
          categoryType={editCat.type}
          onSubmit={handleUpdateCategory}
          isPending={updateCategory.isPending}
        />
      )}

      {/* Delete category confirm */}
      <AlertDialog open={!!deleteCatId} onOpenChange={(v) => !v && setDeleteCatId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette categorie ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irreversible. La categorie et toutes ses objections seront supprimees.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCategory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteCategory.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create objection dialog */}
      {createObjFor && (
        <ObjectionDialog
          open={!!createObjFor}
          onOpenChange={(v) => !v && setCreateObjFor(null)}
          categoryId={createObjFor}
          onSubmit={handleCreateObjection}
          isPending={createObjection.isPending}
        />
      )}

      {/* Edit objection dialog */}
      {editObj && (
        <ObjectionDialog
          open={!!editObj}
          onOpenChange={(v) => !v && setEditObj(null)}
          initial={editObj}
          categoryId={editObj.categoryId}
          onSubmit={handleUpdateObjection}
          isPending={updateObjection.isPending}
        />
      )}

      {/* Delete objection confirm */}
      <AlertDialog open={!!deleteObjId} onOpenChange={(v) => !v && setDeleteObjId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette objection ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteObjection} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteObjection.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Main Page ───

export default function AdminScriptList() {
  const { profile, isLoading: authLoading } = useAuth();
  const isCeo = profile?.role === "ceo";

  if (!authLoading && !isCeo) {
    return <Navigate to="/working/scripts" replace />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <ScrollText className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold font-heading text-foreground">
            Gestion des scripts
          </h2>
          <p className="text-sm text-muted-foreground">
            Gere les scripts de vente et les objections
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="scripts">
        <TabsList>
          <TabsTrigger value="scripts" className="gap-1.5">
            <ScrollText className="h-4 w-4" />
            Scripts
          </TabsTrigger>
          <TabsTrigger value="objections" className="gap-1.5">
            <ShieldAlert className="h-4 w-4" />
            Objections
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scripts" className="mt-6">
          <ScriptsTab />
        </TabsContent>

        <TabsContent value="objections" className="mt-6">
          <ObjectionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
