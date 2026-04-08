import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  Send,
  Plus,
  Copy,
  Bot,
  User,
  History,
  MessageSquare,
  Flame,
  ChevronDown,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AGENT_CONTEXTS,
  AGENT_SHORTCUTS,
  parseAgentResponse,
  extractTitleFromMessage,
  type AgentContextType,
} from "./agent/constants";
import { OBJECTIONS_SETTING, OBJECTIONS_CLOSING } from "./agent/objections";
import { ObjectionCard } from "./agent/ObjectionCard";
import {
  useCreateAgentConversation,
  useAppendAgentMessage,
  useAgentConversation,
  useAgentConversationsList,
  useRenameAgentConversation,
  callAgentProspect,
} from "@/hooks/useAgentConversation";

export default function AgentIA() {
  const [mainTab, setMainTab] = useState<"ia" | "setting" | "closing">("ia");
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [contextType, setContextType] = useState<AgentContextType>("setting_rdv");
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [localMessages, setLocalMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const createConversation = useCreateAgentConversation();
  const appendMessage = useAppendAgentMessage();
  const renameConversation = useRenameAgentConversation();
  const { data: conversationData } = useAgentConversation(activeConversationId);
  const { data: recentConversations } = useAgentConversationsList(20);

  useEffect(() => {
    if (conversationData?.messages) {
      setLocalMessages(
        conversationData.messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }))
      );
      setContextType(conversationData.conversation.context_type);
    }
  }, [conversationData]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages, isGenerating]);

  const handleSend = async () => {
    if (!input.trim() || isGenerating) return;

    const userMessage = input.trim();
    setInput("");

    let conversationId = activeConversationId;
    if (!conversationId) {
      try {
        const newConv = await createConversation.mutateAsync({
          title: extractTitleFromMessage(userMessage),
          context_type: contextType,
        });
        conversationId = newConv.id;
        setActiveConversationId(conversationId);
      } catch (error: any) {
        toast.error("Erreur : " + (error?.message || "création conversation"));
        return;
      }
    }

    const newUserMessage = { role: "user" as const, content: userMessage };
    const newMessagesState = [...localMessages, newUserMessage];
    setLocalMessages(newMessagesState);

    try {
      await appendMessage.mutateAsync({
        conversation_id: conversationId!,
        role: "user",
        content: userMessage,
      });
    } catch (error: any) {
      toast.error("Erreur sauvegarde : " + (error?.message || "inconnue"));
    }

    setIsGenerating(true);
    try {
      const response = await callAgentProspect(newMessagesState, contextType);
      const assistantMessage = { role: "assistant" as const, content: response };
      setLocalMessages([...newMessagesState, assistantMessage]);

      await appendMessage.mutateAsync({
        conversation_id: conversationId!,
        role: "assistant",
        content: response,
      });
    } catch (error: any) {
      toast.error("Erreur Claude : " + (error?.message || "inconnue"));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNewConversation = () => {
    setActiveConversationId(null);
    setLocalMessages([]);
    setInput("");
  };

  const handleLoadConversation = (id: string) => {
    setActiveConversationId(id);
  };

  const handleOpenRename = () => {
    if (!conversationData?.conversation) return;
    setRenameValue(conversationData.conversation.title || "");
    setRenameDialogOpen(true);
  };

  const handleConfirmRename = async () => {
    if (!activeConversationId || !renameValue.trim()) return;
    try {
      await renameConversation.mutateAsync({
        id: activeConversationId,
        title: renameValue.trim(),
      });
      setRenameDialogOpen(false);
      toast.success("Conversation renommée");
    } catch (error: any) {
      toast.error("Erreur : " + (error?.message || "inconnue"));
    }
  };

  const handleShortcut = (prompt: string) => {
    setInput(prompt);
  };

  const handleCopyResponse = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Réponse copiée !");
  };

  const isFirstMessage = localMessages.length === 0;
  const hasHistory = (recentConversations?.length || 0) > 0;

  return (
    <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as any)} className="space-y-4">
      <TabsList>
        <TabsTrigger value="ia" className="gap-1.5">
          <Bot className="h-4 w-4" />
          Agent IA
        </TabsTrigger>
        <TabsTrigger value="setting" className="gap-1.5">
          <MessageSquare className="h-4 w-4" />
          Objections Setting ({OBJECTIONS_SETTING.length})
        </TabsTrigger>
        <TabsTrigger value="closing" className="gap-1.5">
          <Flame className="h-4 w-4" />
          Objections Closing ({OBJECTIONS_CLOSING.length})
        </TabsTrigger>
      </TabsList>

      {/* ─── ONGLET 1 : AGENT IA CHAT ─── */}
      <TabsContent value="ia" className="mt-0">
        <div className="flex flex-col gap-4 h-[calc(100vh-14rem)]">
          {/* Header */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px] space-y-1">
              <Select
                value={contextType}
                onValueChange={(v) => setContextType(v as AgentContextType)}
                disabled={!isFirstMessage}
              >
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AGENT_CONTEXTS.map((ctx) => (
                    <SelectItem key={ctx.id} value={ctx.id}>
                      <span className="flex items-center gap-2">
                        <span>{ctx.emoji}</span>
                        <span className="font-medium">{ctx.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!isFirstMessage && (
                <p className="text-xs text-muted-foreground">
                  Contexte verrouillé pour cette conversation.
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {hasHistory && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <History className="h-4 w-4 mr-1" />
                      Historique
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-72">
                    <DropdownMenuLabel>Conversations récentes</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {recentConversations?.map((conv) => {
                      const ctx = AGENT_CONTEXTS.find((c) => c.id === conv.context_type);
                      return (
                        <DropdownMenuItem
                          key={conv.id}
                          onClick={() => handleLoadConversation(conv.id)}
                          className="flex-col items-start gap-0.5 py-2"
                        >
                          <div className="flex items-center gap-1.5 text-sm">
                            {ctx && <span>{ctx.emoji}</span>}
                            <span className="font-medium truncate max-w-[200px]">
                              {conv.title || "Sans titre"}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(conv.updated_at), {
                              addSuffix: true,
                              locale: fr,
                            })}
                          </span>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {activeConversationId && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleOpenRename} title="Renommer">
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleNewConversation}>
                <Plus className="h-4 w-4 mr-1" />
                Nouvelle
              </Button>
            </div>
          </div>

          {/* Messages */}
          <Card className="flex-1 overflow-hidden">
            <CardContent className="p-4 h-full overflow-y-auto space-y-4">
              {isFirstMessage && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center max-w-md space-y-4">
                    <Bot className="h-12 w-12 mx-auto text-muted-foreground/50" />
                    <div>
                      <h3 className="text-lg font-semibold">Agent IA Al Baraka</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Colle un message de prospect ou pose une question. L'agent t'aide à formuler
                        la meilleure réponse dans la méthodologie Al Baraka.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {AGENT_SHORTCUTS.slice(0, 6).map((s, i) => (
                        <button
                          key={i}
                          onClick={() => handleShortcut(s.prompt)}
                          className="text-xs px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {localMessages.map((msg, idx) => (
                <MessageBubble key={idx} message={msg} onCopyResponse={handleCopyResponse} />
              ))}

              {isGenerating && (
                <div className="flex items-center gap-2 text-muted-foreground text-sm px-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  L'agent réfléchit…
                </div>
              )}

              <div ref={messagesEndRef} />
            </CardContent>
          </Card>

          {/* Input */}
          <Card>
            <CardContent className="p-3">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Colle le message du prospect ou pose ta question…"
                rows={3}
                className="resize-none border-0 focus-visible:ring-0 shadow-none p-0"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted-foreground">
                  Entrée pour envoyer · Maj+Entrée pour aller à la ligne
                </p>
                <Button size="sm" onClick={handleSend} disabled={!input.trim() || isGenerating}>
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-1" />
                      Envoyer
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* ─── ONGLET 2 : OBJECTIONS SETTING ─── */}
      <TabsContent value="setting" className="mt-0 space-y-3">
        <p className="text-sm text-muted-foreground">
          7 objections classiques en setting avec erreurs fréquentes et bonnes réponses.
        </p>
        <div className="space-y-2">
          {OBJECTIONS_SETTING.map((obj) => (
            <ObjectionCard key={obj.id} objection={obj} />
          ))}
        </div>
      </TabsContent>

      {/* ─── ONGLET 3 : OBJECTIONS CLOSING ─── */}
      <TabsContent value="closing" className="mt-0 space-y-3">
        <p className="text-sm text-muted-foreground">
          8 objections classiques en closing avec erreurs fréquentes et bonnes réponses.
        </p>
        <div className="space-y-2">
          {OBJECTIONS_CLOSING.map((obj) => (
            <ObjectionCard key={obj.id} objection={obj} />
          ))}
        </div>
      </TabsContent>

      {/* Dialog de renommage */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renommer la conversation</DialogTitle>
            <DialogDescription>
              Donne un nom parlant à cette conversation pour la retrouver facilement.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="rename-input">Titre</Label>
            <Input
              id="rename-input"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Ex: Prospect Karim objection budget"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleConfirmRename();
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleConfirmRename} disabled={renameConversation.isPending}>
              {renameConversation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              )}
              Renommer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}

// ─── MessageBubble ───
function MessageBubble({
  message,
  onCopyResponse,
}: {
  message: { role: "user" | "assistant"; content: string };
  onCopyResponse: (text: string) => void;
}) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2.5">
          <div className="flex items-start gap-2">
            <User className="h-3.5 w-3.5 mt-1 shrink-0 opacity-70" />
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          </div>
        </div>
      </div>
    );
  }

  const parsed = parseAgentResponse(message.content);

  const mdClass = "prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-headings:my-2 text-foreground";

  if (parsed.isThreeBlocks) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[90%] space-y-2 w-full">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
            <div className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider mb-1">
              🧠 Ce qui se cache derrière
            </div>
            <div className={mdClass}>
              <ReactMarkdown>{parsed.blocks.psychology || ""}</ReactMarkdown>
            </div>
          </div>

          <div className="rounded-xl border border-gold-400/30 bg-gold-400/5 p-3">
            <div className="flex items-center justify-between mb-1">
              <div className="text-[10px] font-semibold text-gold-400 uppercase tracking-wider">
                💬 Réponse à copier-coller
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => onCopyResponse(parsed.blocks.response || "")}
              >
                <Copy className="h-3 w-3 mr-1" />
                Copier
              </Button>
            </div>
            <div className={mdClass}>
              <ReactMarkdown>{parsed.blocks.response || ""}</ReactMarkdown>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
            <div className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider mb-1">
              ✅ Pourquoi cette réponse
            </div>
            <div className={mdClass}>
              <ReactMarkdown>{parsed.blocks.why || ""}</ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] bg-secondary rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex items-start gap-2">
          <Bot className="h-3.5 w-3.5 mt-1 shrink-0 opacity-70" />
          <div className={mdClass}>
            <ReactMarkdown>{parsed.blocks.direct || ""}</ReactMarkdown>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs mt-2"
          onClick={() => onCopyResponse(parsed.blocks.direct || "")}
        >
          <Copy className="h-3 w-3 mr-1" />
          Copier
        </Button>
      </div>
    </div>
  );
}
