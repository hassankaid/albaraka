import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Save, BookOpen, MessageSquare, Info } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  useAgentKnowledgeList,
  useUpdateAgentKnowledge,
  type AgentKnowledgeEntry,
} from "@/hooks/useAgentKnowledge";

const categoryIcon: Record<AgentKnowledgeEntry["category"], React.ElementType> = {
  scripts: MessageSquare,
  objections: BookOpen,
  system: Info,
};

const categoryLabel: Record<AgentKnowledgeEntry["category"], string> = {
  scripts: "Scripts",
  objections: "Objections",
  system: "Système",
};

export default function AdminAgentKnowledge() {
  const { data: entries, isLoading } = useAgentKnowledgeList();
  const [activeTab, setActiveTab] = useState<string>("");

  useEffect(() => {
    if (entries && entries.length > 0 && !activeTab) {
      setActiveTab(entries[0].id);
    }
  }, [entries, activeTab]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Aucune entrée dans la base de connaissance.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold font-heading">Base de connaissance Agent IA</h1>
        <p className="text-muted-foreground text-sm">
          Les documents ci-dessous servent de base à l'Agent IA Setting. Toute modification est prise en compte
          dans les 60 secondes pour les nouvelles conversations.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto">
          {entries.map((entry) => {
            const Icon = categoryIcon[entry.category];
            return (
              <TabsTrigger key={entry.id} value={entry.id} className="gap-2">
                <Icon className="h-4 w-4" />
                {entry.title}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {entries.map((entry) => (
          <TabsContent key={entry.id} value={entry.id} className="mt-4">
            <KnowledgeEditor entry={entry} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function KnowledgeEditor({ entry }: { entry: AgentKnowledgeEntry }) {
  const [title, setTitle] = useState(entry.title);
  const [content, setContent] = useState(entry.content);
  const update = useUpdateAgentKnowledge();

  useEffect(() => {
    setTitle(entry.title);
    setContent(entry.content);
  }, [entry.id, entry.title, entry.content]);

  const isDirty = useMemo(
    () => title !== entry.title || content !== entry.content,
    [title, content, entry.title, entry.content]
  );

  const charCount = content.length;
  const approxTokens = Math.round(charCount / 4);

  const handleSave = async () => {
    if (!isDirty) return;
    try {
      await update.mutateAsync({
        id: entry.id,
        title: title !== entry.title ? title : undefined,
        content: content !== entry.content ? content : undefined,
      });
      toast.success("Enregistré");
    } catch (error: any) {
      toast.error("Erreur : " + (error?.message || "inconnue"));
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <CardTitle>
              <Badge variant="outline" className="mr-2">
                {categoryLabel[entry.category]}
              </Badge>
              {entry.slug}
            </CardTitle>
            <CardDescription>
              Dernière modification :{" "}
              {formatDistanceToNow(new Date(entry.updated_at), { addSuffix: true, locale: fr })}
            </CardDescription>
          </div>
          <Button onClick={handleSave} disabled={!isDirty || update.isPending}>
            {update.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            Enregistrer
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`title-${entry.id}`}>Titre</Label>
          <Input
            id={`title-${entry.id}`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor={`content-${entry.id}`}>Contenu (markdown)</Label>
            <span className="text-xs text-muted-foreground">
              {charCount.toLocaleString("fr")} caractères · ~{approxTokens.toLocaleString("fr")} tokens
            </span>
          </div>
          <Textarea
            id={`content-${entry.id}`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[600px] font-mono text-xs leading-relaxed"
          />
        </div>
      </CardContent>
    </Card>
  );
}
