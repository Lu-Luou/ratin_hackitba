import { useState } from "react";
import type { FieldProfile } from "@/types/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Send } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const mockResponses: Record<string, string> = {
  riesgo: "El análisis de riesgo de este campo muestra indicadores estables. El riesgo climático es el factor más controlado actualmente.",
  revenue: "La tendencia de revenue muestra un crecimiento sostenido en los últimos 3 meses, impulsado por mejores precios de commodities.",
  default: "Gracias por tu consulta. Estoy analizando los datos de este campo para darte una respuesta precisa. ¿Podrías ser más específico?",
};

export function FieldChatPanel({ field, onClose }: { field: FieldProfile; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: `Estás consultando sobre **${field.name}**. ¿En qué puedo ayudarte?` },
  ]);
  const [input, setInput] = useState("");

  const send = () => {
    if (!input.trim()) return;
    const userMsg = input.trim().toLowerCase();
    setMessages((prev) => [...prev, { role: "user", content: input.trim() }]);
    setInput("");

    setTimeout(() => {
      const response = userMsg.includes("riesgo")
        ? mockResponses.riesgo
        : userMsg.includes("revenue") || userMsg.includes("ingreso")
        ? mockResponses.revenue
        : mockResponses.default;
      setMessages((prev) => [...prev, { role: "assistant", content: response }]);
    }, 600);
  };

  return (
    <div className="fixed bottom-24 right-6 w-96 h-120 bg-card border rounded-xl shadow-xl flex flex-col z-50">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <span className="font-display font-semibold text-sm text-foreground">Chat — {field.name}</span>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
              msg.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground"
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Preguntá sobre este campo..."
          className="text-sm"
        />
        <Button size="icon" onClick={send}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
