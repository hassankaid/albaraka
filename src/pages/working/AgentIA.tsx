import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Send, Plus, Copy, Bot, User } from "lucide-react";
import { toast } from "sonner";
import {
  AGENT_CONTEXTS,
  AGENT_SHORTCUTS,
  parseAgentResponse,
  extractTitleFromMessage,
  type AgentContextType,
} from "./agent/constants";
import {
  useCreateAgentConversation,
  useAppendAgentMessage,
  useAgentConversation,
  callAgentProspect,
} from "@/hooks/useAgentConversation";

export default function AgentIA() {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [contextType, setContextType] = useState<AgentContextType>("setting_rdv");
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [localMessages, setLocalMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const createConversation = useCreateAgentConversation();
  const appendMessage = useAppendAgentMessage();
  const { data: conversationData } = useAgentConversation(activeConversationId);

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

  const handleShortcut = (prompt: string) => {
    setInput(prompt);
  };

  const handleCopyResponse = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Réponse copiée !");
  };

  const isFirstMessage = localMessages.length === 0;

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-10rem)]">
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
                    <span className="text-muted-foreground text-xs">— {ctx.description}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!isFirstMessage && (
            <p className="text-xs text-muted-foreground">
              Le contexte est verrouillé pour cette conversation. Crée-en une nouvelle pour changer.
            </p>
          )}
        </div>

        <Button variant="outline" size="sm" onClick={handleNewConversation}>
          <Plus className="h-4 w-4 mr-1" />
          Nouvelle
        </Button>
      </div>

      {/* Messages */}
      <Card className="flex-1 overflow-hidden">
        <CardContent className="p-4 h-full overflow-y-auto space-y-4">
          {isFirstMessage && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md space-y-4">
                <Bot className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <div>
                  <h3 className="text-lg font-semibold">Agent IA Ethicarena</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Colle un message de prospect ou pose une question. L'agent t'aide à formuler
                    la meilleure réponse dans la méthodologie Ethicarena.
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
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-muted-foreground">Ctrl/Cmd + Enter pour envoyer</p>
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
  );
}

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

  if (parsed.isThreeBlocks) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[90%] space-y-2 w-full">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
            <div className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider mb-1">
              🧠 Ce qui se cache derrière
            </div>
            <p className="text-sm text-foreground leading-relaxed">{parsed.blocks.psychology}</p>
          </div>

          <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-3">
            <div className="flex items-center justify-between mb-1">
              <div className="text-[10px] font-semibold text-purple-500 uppercase tracking-wider">
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
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {parsed.blocks.response}
            </p>
          </div>

          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
            <div className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider mb-1">
              ✅ Pourquoi cette réponse
            </div>
            <p className="text-sm text-foreground leading-relaxed">{parsed.blocks.why}</p>
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
          <p className="text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">
            {parsed.blocks.direct}
          </p>
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
