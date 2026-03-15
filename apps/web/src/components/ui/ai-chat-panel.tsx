"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, Sparkles } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function AiChatPanel({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hola! Soy tu asistente de datos con IA. Preguntame sobre tus metricas, campanas, leads, o cualquier dato de tu negocio.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    // TODO: Call AI service endpoint
    await new Promise((r) => setTimeout(r, 1500));

    const aiMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "Esta funcionalidad esta en desarrollo. Pronto podras consultar tus datos en tiempo real con IA.",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, aiMsg]);
    setLoading(false);
  };

  return (
    <div className="w-[360px] h-full border-l border-[#2e2e2e] flex flex-col flex-shrink-0" style={{ backgroundColor: '#1c1c1c' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2e2e2e]">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[#f59e0b]" />
          <span className="text-[14px] font-medium text-[#ededed]">Chat IA</span>
          <span className="text-[10px] px-1.5 py-[1px] rounded border border-[#f59e0b]/30 text-[#f59e0b] font-medium uppercase">Beta</span>
        </div>
        <button onClick={onClose} className="text-[#666] hover:text-[#999] transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-[13px] leading-relaxed ${
                msg.role === "user"
                  ? "text-white"
                  : "text-[#ccc]"
              }`}
              style={{
                backgroundColor: msg.role === "user" ? '#3ecf8e' : '#2a2a2a',
                color: msg.role === "user" ? '#000' : '#ccc',
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-lg px-3 py-2 text-[13px]" style={{ backgroundColor: '#2a2a2a' }}>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#666] animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-[#666] animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-[#666] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-[#2e2e2e]">
        <div className="flex items-center gap-2 h-[38px] px-3 rounded-lg border border-[#333]" style={{ backgroundColor: '#222' }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Pregunta sobre tus datos..."
            className="flex-1 bg-transparent text-[13px] text-[#ededed] placeholder:text-[#555] outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="text-[#666] hover:text-[#3ecf8e] disabled:opacity-30 transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
        <p className="text-[10px] text-[#444] mt-1.5 text-center">
          IA puede cometer errores. Verifica la informacion importante.
        </p>
      </div>
    </div>
  );
}
