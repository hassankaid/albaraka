import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Loader2, Sparkles, Copy, Check, Lightbulb, FileText, BookOpen, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { CONTENT_THEMES, CONTENT_FORMATS, GUIDE_STEPS } from "@/lib/content-data";
import { supabase } from "@/integrations/supabase/client";

interface ContentIdea {
  titre: string;
  accroche: string;
}

export default function ContentGenerator() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("ideas");
  const [selectedTheme, setSelectedTheme] = useState(CONTENT_THEMES[0].id);
  const [selectedFormat, setSelectedFormat] = useState(CONTENT_FORMATS[0].id);
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const callAI = async (prompt: string): Promise<string> => {
    const { data, error } = await supabase.functions.invoke("claude-content-generator", {
      body: { prompt },
    });
    if (error) throw error;
    return data?.response || "";
  };

  const generateIdeas = async () => {
    setLoading(true);
    setIdeas([]);
    setResult("");
    try {
      const themeName = CONTENT_THEMES.find((t) => t.id === selectedTheme)?.label || selectedTheme;
      const formatName = CONTENT_FORMATS.find((f) => f.id === selectedFormat)?.label || selectedFormat;
      const prompt = `Génère 5 idées de contenu vidéo sur le thème ${themeName} pour musulmans francophones souhaitant créer une activité digitale halal. Format ${formatName}. Pour chaque idée donne un TITRE accrocheur et une ACCROCHE de 1 phrase. Réponds UNIQUEMENT avec un JSON valide: [{"titre":"...","accroche":"..."}]`;
      const response = await callAI(prompt);
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        setIdeas(JSON.parse(jsonMatch[0]) as ContentIdea[]);
      } else {
        setResult(response);
      }
    } catch {
      toast({ title: "Erreur", description: "Impossible de générer les idées. Réessayez.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const generateScript = async () => {
    if (!topic.trim()) {
      toast({ title: "Thème requis", description: "Entre un thème pour générer le script." });
      return;
    }
    setLoading(true);
    setResult("");
    try {
      const prompt = selectedFormat === "brolls"
        ? `Script B-ROLLS pour une vidéo sur: ${topic}. Donne:\nHOOK (max 15 mots captivants)\nMOTS-CLES PEXELS (3 mots anglais pour trouver des vidéos stock)\nCTA (max 5 mots)\nMOTS-CLES PEXELS (3 mots anglais)\n\nTon sincère et fraternel, destiné à des musulmans francophones.`
        : `Script voix off 60-90 secondes pour une vidéo sur: ${topic}. Structure:\n\nHOOK (2-3 phrases accrocheuses)\nMOTS-CLES PEXELS (3 mots anglais)\nVALEUR (5-6 phrases sincères et utiles)\nMOTS-CLES PEXELS (3 mots anglais)\nCTA (1 phrase fraternelle)\nMOTS-CLES PEXELS (3 mots anglais)\n\nTon sincère, fraternel, pas commercial. Destiné à des musulmans francophones souhaitant créer une activité digitale halal.`;
      const response = await callAI(prompt);
      setResult(response);
    } catch {
      toast({ title: "Erreur", description: "Impossible de générer le script. Réessayez.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const generateDescription = async () => {
    setLoading(true);
    setResult("");
    try {
      const context = topic.trim() || "une activité digitale halal";
      const prompt = `Écris une description de publication Instagram/TikTok pour une vidéo sur: ${context}.\n\nStructure:\n- 1 phrase d'accroche sincère et captivante\n- 3-4 lignes de valeur concrète\n- 1 CTA naturel et fraternel\n- 5 hashtags pertinents\n\nMax 150 mots. Ton fraternel et authentique, destiné à des musulmans francophones.`;
      const response = await callAI(prompt);
      setResult(response);
    } catch {
      toast({ title: "Erreur", description: "Impossible de générer la description. Réessayez.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, index?: number) => {
    await navigator.clipboard.writeText(text);
    if (index !== undefined) {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
    toast({ title: "Copié !", description: "Le texte a été copié dans le presse-papier." });
  };

  const renderFormatSelector = () => (
    <div className="space-y-2">
      <Label>Format</Label>
      <div className="flex flex-wrap gap-2">
        {CONTENT_FORMATS.map((format) => (
          <Badge
            key={format.id}
            variant={selectedFormat === format.id ? "default" : "outline"}
            className="cursor-pointer text-sm py-1.5 px-3"
            onClick={() => setSelectedFormat(format.id)}
          >
            {format.label}
          </Badge>
        ))}
      </div>
    </div>
  );

  const renderLoadingState = () => (
    <Card className="mt-6">
      <CardContent className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary mr-3" />
        <p className="text-muted-foreground">Génération en cours...</p>
      </CardContent>
    </Card>
  );

  const renderIdeasResult = () => (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          {ideas.length} idées générées
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {ideas.map((idea, index) => (
          <div key={index} className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:border-primary/50 transition-colors">
            <div className="flex-1">
              <p className="font-medium text-foreground">{idea.titre}</p>
              <p className="text-sm text-muted-foreground mt-1">{idea.accroche}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => copyToClipboard(`${idea.titre}\n${idea.accroche}`, index)}>
              {copiedIndex === index ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );

  const renderTextResult = () => (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Résultat
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => copyToClipboard(result)}>
            <Copy className="h-4 w-4 mr-2" />
            Copier
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="whitespace-pre-wrap text-sm text-foreground bg-muted/50 p-4 rounded-lg">
          {result}
        </div>
      </CardContent>
    </Card>
  );

  const renderResult = () => {
    if (loading) return renderLoadingState();
    if (ideas.length > 0) return renderIdeasResult();
    if (result) return renderTextResult();
    return null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Générateur de Contenu</h1>
        <p className="text-muted-foreground">Scripts, idées et descriptions pour tes vidéos</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ideas" className="gap-2">
            <Lightbulb className="h-4 w-4" />
            <span className="hidden sm:inline">Idées</span>
          </TabsTrigger>
          <TabsTrigger value="script" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Script</span>
          </TabsTrigger>
          <TabsTrigger value="description" className="gap-2">
            <Wand2 className="h-4 w-4" />
            <span className="hidden sm:inline">Description</span>
          </TabsTrigger>
          <TabsTrigger value="guide" className="gap-2">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Guide</span>
          </TabsTrigger>
        </TabsList>

        {/* Onglet Idées */}
        <TabsContent value="ideas">
          <Card>
            <CardHeader>
              <CardTitle>💡 Idées de contenu</CardTitle>
              <CardDescription>Génère des idées de vidéos selon le thème et format choisis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {renderFormatSelector()}
              <div className="space-y-2">
                <Label>Thème</Label>
                <div className="flex flex-wrap gap-2">
                  {CONTENT_THEMES.map((theme) => (
                    <Badge
                      key={theme.id}
                      variant={selectedTheme === theme.id ? "default" : "outline"}
                      className="cursor-pointer text-sm py-1.5 px-3"
                      onClick={() => setSelectedTheme(theme.id)}
                    >
                      {theme.label}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button onClick={generateIdeas} disabled={loading} className="w-full">
                {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Génération...</> : <><Sparkles className="h-4 w-4 mr-2" />Générer des idées</>}
              </Button>
            </CardContent>
          </Card>
          {renderResult()}
        </TabsContent>

        {/* Onglet Script */}
        <TabsContent value="script">
          <Card>
            <CardHeader>
              <CardTitle>✍️ Script</CardTitle>
              <CardDescription>Génère un script complet pour ta vidéo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {renderFormatSelector()}
              <div className="space-y-2">
                <Label>Thème de la vidéo</Label>
                <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Ex: Comment j'ai quitté mon CDI grâce au digital" />
              </div>
              <Button onClick={generateScript} disabled={loading} className="w-full">
                {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Rédaction...</> : <><Sparkles className="h-4 w-4 mr-2" />Générer le script</>}
              </Button>
            </CardContent>
          </Card>
          {renderResult()}
        </TabsContent>

        {/* Onglet Description */}
        <TabsContent value="description">
          <Card>
            <CardHeader>
              <CardTitle>📄 Description</CardTitle>
              <CardDescription>Génère une description optimisée pour Instagram/TikTok</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Thème ou sujet de la vidéo (optionnel)</Label>
                <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Ex: Comment j'ai quitté mon CDI grâce au digital" />
              </div>
              <Button onClick={generateDescription} disabled={loading} className="w-full">
                {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Rédaction...</> : <><Sparkles className="h-4 w-4 mr-2" />Générer la description</>}
              </Button>
            </CardContent>
          </Card>
          {renderResult()}
        </TabsContent>

        {/* Onglet Guide */}
        <TabsContent value="guide">
          <Card>
            <CardHeader>
              <CardTitle>📱 Guide de création</CardTitle>
              <CardDescription>Les étapes clés pour créer du contenu de qualité</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {GUIDE_STEPS.map((step, index) => (
                  <div key={step.id}>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">{step.icon}</span>
                      <h3 className="text-lg font-semibold">{step.title}</h3>
                    </div>
                    <div className="pl-10 space-y-2">
                      {step.tips.map((tip, tipIndex) => (
                        <div key={tipIndex} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="text-primary mt-0.5">•</span>
                          <span>{tip}</span>
                        </div>
                      ))}
                    </div>
                    {index < GUIDE_STEPS.length - 1 && <Separator className="mt-6" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
