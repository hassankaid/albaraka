import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, Copy, ChevronDown, ChevronRight, ThumbsUp, ThumbsDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { SCRIPTS_SETTING, VOIX_CONFIG, type Script, type ScriptPhase } from "@/lib/scripts-data";

export default function ScriptsSetting() {
  const { toast } = useToast();
  const [selectedScript, setSelectedScript] = useState<Script>(SCRIPTS_SETTING[0]);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [copiedLine, setCopiedLine] = useState<string | null>(null);
  const [openCases, setOpenCases] = useState<Record<string, boolean>>({});

  const currentPhase = selectedScript.phases[currentPhaseIndex];
  const voixConfig = VOIX_CONFIG[currentPhase.voix];

  const copyToClipboard = async (text: string) => {
    const cleanText = text
      .replace(/^['"]|['"]$/g, "")
      .replace(/^\[.*?\]\s*:\s*/, "")
      .replace(/^→\s*/, "");

    await navigator.clipboard.writeText(cleanText);
    setCopiedLine(text);
    toast({ title: "Copié !", description: "Le texte a été copié dans le presse-papier" });
    setTimeout(() => setCopiedLine(null), 2000);
  };

  const toggleCase = (caseLabel: string) => {
    setOpenCases((prev) => ({ ...prev, [caseLabel]: !prev[caseLabel] }));
  };

  const isInstruction = (line: string) => {
    return line.startsWith("→") || line.startsWith("Si ") || !line.startsWith("'");
  };

  const renderLine = (line: string, index: number) => {
    const instruction = isInstruction(line);
    const isCopied = copiedLine === line;

    return (
      <div
        key={index}
        className={cn(
          "group flex items-start gap-3 p-3 rounded-lg transition-colors",
          instruction ? "bg-muted/50" : "bg-card border hover:border-primary/50"
        )}
      >
        <div className="flex-1">
          <p className={cn("text-sm", instruction ? "text-muted-foreground italic" : "text-foreground")}>
            {line}
          </p>
        </div>
        {!instruction && (
          <Button
            variant="ghost"
            size="sm"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => copyToClipboard(line)}
          >
            {isCopied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
    );
  };

  const renderCases = (cases: ScriptPhase["cases"]) => {
    if (!cases || cases.length === 0) return null;

    return (
      <div className="mt-4 space-y-2">
        {cases.map((caseItem, index) => {
          const isOpen = openCases[caseItem.label] ?? false;
          const isPositive = caseItem.type === "pos";

          return (
            <Collapsible key={index} open={isOpen} onOpenChange={() => toggleCase(caseItem.label)}>
              <CollapsibleTrigger asChild>
                <button
                  className={cn(
                    "w-full flex items-center gap-2 p-3 rounded-lg text-left transition-colors",
                    isPositive
                      ? "bg-green-500/10 hover:bg-green-500/20 text-green-700 dark:text-green-400"
                      : "bg-red-500/10 hover:bg-red-500/20 text-red-700 dark:text-red-400"
                  )}
                >
                  {isPositive ? (
                    <ThumbsUp className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <ThumbsDown className="h-4 w-4 flex-shrink-0" />
                  )}
                  <span className="flex-1 text-sm font-medium">{caseItem.label}</span>
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 flex-shrink-0" />
                  )}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 pl-6 space-y-2">
                  {caseItem.lines.map((line, lineIndex) => renderLine(line, lineIndex))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Scripts Setting</h1>
        <p className="text-muted-foreground">
          Scripts pour la prise de RDV et invitations conférence
        </p>
      </div>

      <Tabs
        value={selectedScript.id}
        onValueChange={(id) => {
          const script = SCRIPTS_SETTING.find((s) => s.id === id);
          if (script) {
            setSelectedScript(script);
            setCurrentPhaseIndex(0);
            setOpenCases({});
          }
        }}
      >
        <TabsList className="grid w-full grid-cols-2">
          {SCRIPTS_SETTING.map((script) => (
            <TabsTrigger key={script.id} value={script.id} className="gap-2">
              <span>{script.icon}</span>
              <span>{script.nom}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Phases</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <div className="p-3 space-y-1">
                {selectedScript.phases.map((phase, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentPhaseIndex(index)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg text-sm transition-colors",
                      currentPhaseIndex === index
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    )}
                  >
                    <p className="font-medium">{phase.label}</p>
                    <p
                      className={cn(
                        "text-xs mt-1",
                        currentPhaseIndex === index
                          ? "text-primary-foreground/80"
                          : "text-muted-foreground"
                      )}
                    >
                      {VOIX_CONFIG[phase.voix].label}
                    </p>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle>{currentPhase.label}</CardTitle>
                <Badge className={cn("mt-2", voixConfig.bgColor, voixConfig.color)}>
                  {voixConfig.label}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPhaseIndex === 0}
                  onClick={() => setCurrentPhaseIndex((i) => i - 1)}
                >
                  ← Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPhaseIndex === selectedScript.phases.length - 1}
                  onClick={() => setCurrentPhaseIndex((i) => i + 1)}
                >
                  Suivant →
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {currentPhase.lines.map((line, index) => renderLine(line, index))}
            </div>
            {renderCases(currentPhase.cases)}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
