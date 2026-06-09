import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Wand2, ArrowRight, Target } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ScriptViewer } from "./scripts/ScriptViewer";
import { ObjectionsViewer } from "./scripts/ObjectionsViewer";
import { useScripts, useObjectionCategories, useScriptExtras } from "@/hooks/useScripts";
import type { Script } from "@/lib/scripts/types";

export default function Scripts() {
  const [mainTab, setMainTab] = useState<"setting" | "closing">("setting");
  const [subTab, setSubTab] = useState<"script" | "objections">("script");
  const [selectedClosingId, setSelectedClosingId] = useState<string | null>(null);
  const [copiedTechnique, setCopiedTechnique] = useState<string | null>(null);

  const { data: settingScripts, isLoading: loadingSetting } = useScripts("setting");
  const { data: closingScripts, isLoading: loadingClosing } = useScripts("closing");
  const { data: settingObjCats, isLoading: loadingSettingObj } = useObjectionCategories("setting");
  const { data: closingObjCats, isLoading: loadingClosingObj } = useObjectionCategories("closing");
  const { data: extras } = useScriptExtras();

  const settingScript = settingScripts?.[0];
  const selectedClosingScript = closingScripts?.find((s) => s.id === selectedClosingId) || closingScripts?.[0];

  useEffect(() => {
    if (closingScripts?.length && !selectedClosingId) {
      setSelectedClosingId(closingScripts[0].id);
    }
  }, [closingScripts, selectedClosingId]);

  const handleMainTabChange = (value: string) => {
    setMainTab(value as "setting" | "closing");
    setSubTab("script");
  };

  const copyTechnique = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedTechnique(id);
    toast.success("Copié !");
    setTimeout(() => setCopiedTechnique(null), 2000);
  };

  const closingExtra = extras?.processEchelle || extras?.armesDernierRecours ? (
    <div className="space-y-4 mt-6">
      {extras.processEchelle && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
              <span className="text-lg">📊</span>
              {extras.processEchelle.label}
            </h3>
            <div className="space-y-2">
              {extras.processEchelle.etapes.map((etape, i) => (
                <div key={i} className="text-sm p-3 rounded-lg bg-muted/50 border-l-2 border-primary/50">
                  <span className="font-mono text-xs text-muted-foreground mr-2">{i + 1}.</span>
                  {etape}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {extras.armesDernierRecours && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
              <span className="text-lg">⚔️</span>
              {extras.armesDernierRecours.label}
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Quand plus rien n'a marché. Le prospect tourne en rond. Toutes les objections ont été traitées.
            </p>
            <div className="space-y-3">
              {extras.armesDernierRecours.techniques.map((tech) => (
                <div key={tech.nom} className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="text-amber-600 border-amber-500/50">
                      {tech.nom}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => copyTechnique(tech.texte, tech.nom)}
                    >
                      {copiedTechnique === tech.nom ? (
                        <Check className="h-3 w-3 mr-1 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3 mr-1" />
                      )}
                      Copier
                    </Button>
                  </div>
                  <p className="text-sm">{tech.texte}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  ) : null;

  const settingObjCount = settingObjCats?.reduce((s, c) => s + c.objections.length, 0) || 0;
  const closingObjCount = closingObjCats?.reduce((s, c) => s + c.objections.length, 0) || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading">Scripts</h1>
        <p className="text-muted-foreground">
          Scripts de vente et gestion des objections pour le setting et le closing
        </p>
      </div>

      <Link
        to="/training/script-forge"
        className="group flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 to-transparent p-4 transition-colors hover:border-amber-500/70"
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600">
            <Wand2 className="h-4.5 w-4.5" />
          </span>
          <div>
            <div className="font-semibold">Script Forge — génère ton script personnalisé</div>
            <p className="text-sm text-muted-foreground">
              Crée un script d'appel découverte ou closing sur mesure pour TON offre (prérempli depuis ton offre Liberty), exportable en PDF.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600">
          Ouvrir <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>

      <Link
        to="/working/plan-90"
        className="group flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 to-transparent p-4 transition-colors hover:border-amber-500/70"
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600">
            <Target className="h-4.5 w-4.5" />
          </span>
          <div>
            <div className="font-semibold">Mon Plan 90 jours — entraînement closing</div>
            <p className="text-sm text-muted-foreground">
              Suis tes role-plays (découverte + closing), tes ventes et ton état émotionnel sur 12 semaines. Recaps hebdo automatiques.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600">
          Ouvrir <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>

      <Tabs value={mainTab} onValueChange={handleMainTabChange}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="setting" className="gap-2">
            <span>💬</span>
            Setting (DM)
          </TabsTrigger>
          <TabsTrigger value="closing" className="gap-2">
            <span>📞</span>
            Closing (Appels)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="setting" className="mt-4 space-y-4">
          <Tabs value={subTab} onValueChange={(v) => setSubTab(v as "script" | "objections")}>
            <TabsList>
              <TabsTrigger value="script" className="gap-1.5">
                📝 Script DM
              </TabsTrigger>
              <TabsTrigger value="objections" className="gap-1.5">
                🛡️ Objections ({settingObjCount})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="script" className="mt-4">
              {loadingSetting ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : settingScript ? (
                <ScriptViewer script={settingScript} />
              ) : (
                <p className="text-muted-foreground text-center py-12">Aucun script setting disponible.</p>
              )}
            </TabsContent>

            <TabsContent value="objections" className="mt-4">
              {loadingSettingObj ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : settingObjCats?.length ? (
                <ObjectionsViewer categories={settingObjCats} />
              ) : (
                <p className="text-muted-foreground text-center py-12">Aucune objection setting disponible.</p>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="closing" className="mt-4 space-y-4">
          <Tabs value={subTab} onValueChange={(v) => setSubTab(v as "script" | "objections")}>
            <TabsList>
              <TabsTrigger value="script" className="gap-1.5">
                📝 Scripts
              </TabsTrigger>
              <TabsTrigger value="objections" className="gap-1.5">
                🛡️ Objections ({closingObjCount})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="script" className="mt-4 space-y-4">
              {loadingClosing ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : closingScripts?.length ? (
                <>
                  <Select
                    value={selectedClosingScript?.id}
                    onValueChange={setSelectedClosingId}
                  >
                    <SelectTrigger className="w-full max-w-md">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {closingScripts.map((script) => (
                        <SelectItem key={script.id} value={script.id}>
                          <span className="flex items-center gap-2">
                            <span>{script.icon}</span>
                            <span className="font-medium">{script.nom}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedClosingScript && (
                    <ScriptViewer key={selectedClosingScript.id} script={selectedClosingScript} />
                  )}
                </>
              ) : (
                <p className="text-muted-foreground text-center py-12">Aucun script closing disponible.</p>
              )}
            </TabsContent>

            <TabsContent value="objections" className="mt-4">
              {loadingClosingObj ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : closingObjCats?.length ? (
                <ObjectionsViewer categories={closingObjCats} extra={closingExtra} />
              ) : (
                <p className="text-muted-foreground text-center py-12">Aucune objection closing disponible.</p>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}
