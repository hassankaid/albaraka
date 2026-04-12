import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Wand2 } from "lucide-react";
import ContentGenerator from "./ContentGenerator";
import PersonalBrandPage from "./personal-brand/PersonalBrandPage";

type TabValue = "personal-brand" | "universal";

export default function ContentStudio() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab: TabValue =
    searchParams.get("tab") === "universal" ? "universal" : "personal-brand";

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", value);
    setSearchParams(params, { replace: true });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Générateur de Contenu</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Définis d'abord ton personal brand pour obtenir un prompt sur mesure,
          puis génère du contenu universel par idée.
        </p>
      </div>

      <Tabs value={initialTab} onValueChange={handleChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-xl">
          <TabsTrigger value="personal-brand" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Mon Personal Brand
          </TabsTrigger>
          <TabsTrigger value="universal" className="gap-2">
            <Wand2 className="h-4 w-4" />
            Générer par idée
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal-brand" className="mt-6">
          <PersonalBrandPage />
        </TabsContent>

        <TabsContent value="universal" className="mt-6">
          <ContentGenerator />
        </TabsContent>
      </Tabs>
    </div>
  );
}
