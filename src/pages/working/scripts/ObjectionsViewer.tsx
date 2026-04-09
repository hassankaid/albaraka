import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Check, Copy, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ObjectionCategory } from "@/lib/scripts/types";

interface ObjectionsViewerProps {
  categories: ObjectionCategory[];
  extra?: React.ReactNode;
}

export function ObjectionsViewer({ categories, extra }: ObjectionsViewerProps) {
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const [openObjections, setOpenObjections] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleCategory = (id: string) => {
    setOpenCategories((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleObjection = (id: string) => {
    setOpenObjections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyText = async (text: string, id: string) => {
    const clean = text.replace(/^[«»]/g, "").replace(/[«»]\s*$/g, "").trim();
    await navigator.clipboard.writeText(clean);
    setCopiedId(id);
    toast.success("Réponse copiée !");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const totalCount = categories.reduce((sum, cat) => sum + cat.objections.length, 0);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {totalCount} objections classées en {categories.length} catégories avec les réponses recommandées.
      </p>

      <div className="space-y-3">
        {categories.map((cat) => {
          const isOpen = openCategories[cat.id] ?? false;
          return (
            <Collapsible key={cat.id} open={isOpen} onOpenChange={() => toggleCategory(cat.id)}>
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center gap-3 p-4 rounded-xl bg-card border hover:border-primary/50 transition-colors text-left">
                  <span className="text-xl">{cat.icon}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{cat.label}</p>
                    <p className="text-xs text-muted-foreground">{cat.objections.length} objections</p>
                  </div>
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 ml-4 space-y-2">
                  {cat.objections.map((obj) => {
                    const isObjOpen = openObjections[obj.id] ?? false;
                    const isCopied = copiedId === obj.id;

                    return (
                      <Collapsible
                        key={obj.id}
                        open={isObjOpen}
                        onOpenChange={() => toggleObjection(obj.id)}
                      >
                        <CollapsibleTrigger asChild>
                          <button className="w-full flex items-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left">
                            <span className="flex-1 text-sm font-medium">{obj.situation}</span>
                            {isObjOpen ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                            )}
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="mt-2 ml-4 space-y-3 pb-2">
                            <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                              {obj.reponse}
                            </div>

                            {obj.etapes && obj.etapes.length > 0 && (
                              <div className="space-y-1.5">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                  Étapes
                                </p>
                                {obj.etapes.map((etape, i) => (
                                  <div
                                    key={i}
                                    className={cn(
                                      "text-sm p-2.5 rounded-lg",
                                      etape.startsWith("Fermer") || etape.startsWith("→")
                                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                        : "bg-card border"
                                    )}
                                  >
                                    {etape}
                                  </div>
                                ))}
                              </div>
                            )}

                            {obj.verbatim && (
                              <div className="bg-gold-400/10 border border-gold-400/30 rounded-xl p-3">
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-[10px] font-semibold text-gold-400 uppercase tracking-wider">
                                    💬 À envoyer au prospect
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      copyText(obj.verbatim!, obj.id);
                                    }}
                                  >
                                    {isCopied ? (
                                      <Check className="h-3 w-3 mr-1 text-green-500" />
                                    ) : (
                                      <Copy className="h-3 w-3 mr-1" />
                                    )}
                                    Copier
                                  </Button>
                                </div>
                                <p className="text-sm">{obj.verbatim}</p>
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>

      {extra}
    </div>
  );
}
