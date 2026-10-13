// « Scripts en ligne » : le script DM AL BARAKA et les réponses aux objections du
// setting, à copier en un clic. Ouvert depuis la section Setting de la page Ressources.
// Le closing n'a plus de version en ligne (Sidali, 13/10/2026) : les élèves ouvrent
// les scripts d'appel téléchargés depuis Ressources → Closing.
import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScriptViewer } from "./scripts/ScriptViewer";
import { ObjectionsViewer } from "./scripts/ObjectionsViewer";
import { useScripts, useObjectionCategories } from "@/hooks/useScripts";

export default function Scripts() {
  const [subTab, setSubTab] = useState<"script" | "objections">("script");
  const { data: settingScripts, isLoading: loadingSetting } = useScripts("setting");
  const { data: settingObjCats, isLoading: loadingSettingObj } = useObjectionCategories("setting");

  const settingScript = settingScripts?.[0];
  const settingObjCount = settingObjCats?.reduce((s, c) => s + c.objections.length, 0) || 0;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/training/ressources" className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Ressources
        </Link>
        <h1 className="text-2xl font-bold font-heading">Script DM et objections setting</h1>
        <p className="text-muted-foreground">Le script DM AL BARAKA et les réponses aux objections, à copier en un clic.</p>
      </div>

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
    </div>
  );
}
