import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Check, Copy, ChevronDown, ChevronRight, ThumbsUp, ThumbsDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { SCRIPTS_CLOSING, VOIX_CONFIG, type Script, type ScriptCase } from "@/lib/scripts-data";

export default function ScriptsClosing() {
  const { toast } = useToast();
  const [selectedScript, setSelectedScript] = useState<Script>(SCRIPTS_CLOSING[0]);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [copiedLine, setCopiedLine] = useState<string | null>(null);
  const [openCases, setOpenCases] = useState<Record<string, boolean>>({});

  const currentPhase = selectedScript.phases[currentPhaseIndex];
  const voixConfig = VOIX_CONFIG[currentPhase.voix] || VOIX_CONFIG.raison;

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

  const toggleCase = (caseKey: string) => {
    setOpenCases((prev) => ({ ...prev, [caseKey]: !prev[caseKey] }));
  };

  const isInstruction = (line: string) => {
    return (
      line.startsWith("→") ||
      line.startsWith("Si ") ||
      line.startsWith("NOTER") ||
      line === "---" ||
      line.startsWith("Pause") ||
      line.startsWith("✅") ||
      line.startsWith("PILIER") ||
      line.startsWith("QUESTION") ||
      line.startsWith("RENFORCEMENT") ||
      (!line.startsWith("'") && !line.startsWith("[") && !line.startsWith("("))
    );
  };

  const isSeparator = (line: string) => line === "---";

  const renderLine = (line: string, index: number) => {
    if (isSeparator(line)) {
      return <Separator key={index} className="my-4" />;
    }

    const instruction = isInstruction(line);
    const isCopied = copiedLine === line;
    const isPilierHeader = line.startsWith("PILIER");

    return (
      <div
        key={index}
        className={cn(
          "group flex items-start gap-3 p-3 rounded-lg transition-colors",
          isPilierHeader
            ? "bg-primary/10 border-l-4 border-primary"
            : instruction
            ? "bg-muted/50"
            : "bg-card border hover:border-primary/50"
        )}
      >
        <div className="flex-1">
          <p
            className={cn(
              "text-sm",
              isPilierHeader
                ? "font-bold text-primary"
                : instruction
                ? "text-muted-foreground italic"
                : "text-foreground"
            )}
          >
            {line}
          </p>
        </div>
        {!instruction && !isPilierHeader && (
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

  const renderCases = (cases: ScriptCase[] | undefined, keyPrefix: string) => {
    if (!cases || cases.length === 0) return null;

    return (
      <div className="mt-4 space-y-2">
        {cases.map((caseItem, index) => {
          const caseKey = `${keyPrefix}-${caseItem.label}`;
          const isOpen = openCases[caseKey] ?? false;
          const isPositive = caseItem.type === "pos";

          return (
            <Collapsible key={index} open={isOpen} onOpenChange={() => toggleCase(caseKey)}>
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
        <h1 className="text-2xl font-bold">Scripts Closing</h1>
        <p className="text-muted-foreground">
          Scripts pour les appels découverte et le closing
        </p>
      </div>

      <Tabs
        value={selectedScript.id}
        onValueChange={(id) => {
          const script = SCRIPTS_CLOSING.find((s) => s.id === id);
          if (script) {
            setSelectedScript(script);
            setCurrentPhaseIndex(0);
            setOpenCases({});
          }
        }}
      >
        <TabsList className="grid w-full grid-cols-3">
          {SCRIPTS_CLOSING.map((script) => (
            <TabsTrigger key={script.id} value={script.id} className="gap-2 text-xs sm:text-sm">
              <span>{script.icon}</span>
              <span className="hidden sm:inline">{script.nom}</span>
              <span className="sm:hidden">{script.nom.split(" ")[0]}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Phases ({selectedScript.phases.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              <div className="p-3 space-y-1">
                {selectedScript.phases.map((phase, index) => {
                  const phaseVoix = VOIX_CONFIG[phase.voix] || VOIX_CONFIG.raison;
                  return (
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
                      <p className="font-medium line-clamp-2">{phase.label}</p>
                      <p
                        className={cn(
                          "text-xs mt-1",
                          currentPhaseIndex === index
                            ? "text-primary-foreground/80"
                            : "text-muted-foreground"
                        )}
                      >
                        {phaseVoix.label}
                      </p>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                  ← Préc.
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPhaseIndex === selectedScript.phases.length - 1}
                  onClick={() => setCurrentPhaseIndex((i) => i + 1)}
                >
                  Suiv. →
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-2">
                {currentPhase.lines.map((line, index) => renderLine(line, index))}
              </div>

              {renderCases(currentPhase.cases, "cases1")}

              {currentPhase.lines2 && currentPhase.lines2.length > 0 && (
                <>
                  <Separator className="my-6" />
                  <div className="space-y-2">
                    {currentPhase.lines2.map((line, index) => renderLine(line, index))}
                  </div>
                </>
              )}

              {renderCases(currentPhase.cases2, "cases2")}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
