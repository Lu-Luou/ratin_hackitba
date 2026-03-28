import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, User, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
}

const quickActions = ["Analizar riesgo general", "Resumen de revenue", "Comparar campos", "Reporte de rendimiento"];

const mockReply = (message: string): string => {
  const normalized = message.toLowerCase();

  if (normalized.includes("riesgo")) {
    return "El análisis general muestra que 2 de 5 campos tienen indicadores de riesgo elevado, principalmente por factores climáticos y de mercado. Recomiendo monitorear San Martín Sur y Campo El Trébol.";
  }

  if (normalized.includes("revenue") || normalized.includes("ingreso")) {
    return "El revenue consolidado muestra un crecimiento del 8.3% mensual promedio. Los Alamos Norte lidera con +22.8%, mientras que San Martín Sur presenta una caída del -12.5%.";
  }

  if (normalized.includes("comparar")) {
    return "Los Alamos Norte tiene el mejor score (91) y mayor revenue. Estancia La Aurora es el más estable. San Martín Sur requiere atención inmediata por sus indicadores negativos.";
  }

  return "Entendido. Estoy procesando tu consulta sobre los campos registrados. ¿Podrías darme más detalles sobre qué aspecto específico te interesa analizar?";
};

export default function AssistantView() {
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: "1",
      title: "Nueva conversación",
      messages: [{ role: "assistant", content: "Hola, soy tu asistente agrícola. ¿En qué puedo ayudarte hoy?" }],
    },
  ]);
  const [activeId, setActiveId] = useState("1");
  const [input, setInput] = useState("");

  const activeConversation = conversations.find((conversation) => conversation.id === activeId);

  if (!activeConversation) {
    return null;
  }

  const sendMessage = (text?: string) => {
    const nextMessage = text ?? input.trim();

    if (!nextMessage) {
      return;
    }

    setInput("");

    setConversations((previous) =>
      previous.map((conversation) =>
        conversation.id === activeId
          ? {
              ...conversation,
              title: conversation.messages.length === 1 ? nextMessage.slice(0, 30) : conversation.title,
              messages: [...conversation.messages, { role: "user", content: nextMessage }],
            }
          : conversation,
      ),
    );

    setTimeout(() => {
      setConversations((previous) =>
        previous.map((conversation) =>
          conversation.id === activeId
            ? {
                ...conversation,
                messages: [...conversation.messages, { role: "assistant", content: mockReply(nextMessage) }],
              }
            : conversation,
        ),
      );
    }, 700);
  };

  const createConversation = () => {
    const id = String(Date.now());

    setConversations((previous) => [
      ...previous,
      { id, title: "Nueva conversación", messages: [{ role: "assistant", content: "¿En qué puedo ayudarte?" }] },
    ]);

    setActiveId(id);
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <div className="w-64 border-r bg-muted/30 flex flex-col">
        <div className="p-3">
          <Button variant="outline" className="w-full justify-start gap-2" onClick={createConversation}>
            <Plus className="h-4 w-4" />
            Nueva conversación
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => setActiveId(conversation.id)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-md text-sm truncate transition-colors",
                conversation.id === activeId
                  ? "bg-accent text-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent/50",
              )}
            >
              {conversation.title}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 space-y-4 max-w-3xl mx-auto w-full">
          {activeConversation.messages.map((message, index) => (
            <div key={index} className={cn("flex gap-3", message.role === "user" ? "justify-end" : "justify-start")}>
              {message.role === "assistant" ? (
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-primary-foreground" />
                </div>
              ) : null}

              <div
                className={cn(
                  "max-w-[70%] rounded-xl px-4 py-3 text-sm",
                  message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                )}
              >
                {message.content}
              </div>

              {message.role === "user" ? (
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
              ) : null}
            </div>
          ))}
        </div>

        {activeConversation.messages.length <= 2 ? (
          <div className="flex gap-2 justify-center pb-3 px-6 flex-wrap">
            {quickActions.map((action) => (
              <Button key={action} variant="outline" size="sm" className="text-xs" onClick={() => sendMessage(action)}>
                {action}
              </Button>
            ))}
          </div>
        ) : null}

        <div className="p-4 border-t max-w-3xl mx-auto w-full">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && sendMessage()}
              placeholder="Escribí tu consulta..."
              className="flex-1"
            />
            <Button onClick={() => sendMessage()} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
