"use client";

import { useRef, useEffect, useState } from "react";
import { X, Send, Sparkles, Plus, Loader2 } from "lucide-react";
import { useChatStore } from "@/stores/chat-store";
import { useChatStream } from "@/hooks/use-chat-stream";
import type { AiSection, ChatArtifact, PlanName } from "@nodelabz/shared-types";
import { ContextBadge } from "./chat/context-badge";
import { SuggestionChips } from "./chat/suggestion-chips";
import { ToolCallIndicator } from "./chat/tool-call-indicator";
import { MessageRenderer } from "./chat/message-renderer";

interface AiChatPanelProps {
  onClose: () => void;
  activeSection: AiSection;
  plan?: PlanName;
  onOpenWorkflowEditor?: (payload: ChatArtifact & { artifactType: "workflow" }) => void;
}

export function AiChatPanel({
  onClose,
  activeSection,
  plan,
  onOpenWorkflowEditor,
}: AiChatPanelProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    messages,
    isStreaming,
    streamingContent,
    streamingToolCalls,
    streamingArtifacts,
    setActiveSection,
    setPlan,
    autonomy,
    clearChat,
  } = useChatStore();

  const { sendMessage } = useChatStream();

  // Sync section from parent
  useEffect(() => {
    setActiveSection(activeSection);
  }, [activeSection, setActiveSection]);

  // Sync plan from parent
  useEffect(() => {
    if (plan) setPlan(plan);
  }, [plan, setPlan]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // Auto-focus
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;
    const msg = input.trim();
    setInput("");
    await sendMessage(msg);
  };

  const handleSuggestion = (text: string) => {
    if (isStreaming) return;
    sendMessage(text);
  };

  const showSuggestions = messages.length <= 1 && !isStreaming;

  return (
    <div
      className="w-[380px] h-full border-l border-[#2e2e2e] flex flex-col flex-shrink-0"
      style={{ backgroundColor: "#1c1c1c" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2e2e2e]">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[#f59e0b]" />
          <span className="text-[14px] font-medium text-[#ededed]">
            Chat IA
          </span>
          <span className="text-[10px] px-1.5 py-[1px] rounded border border-[#f59e0b]/30 text-[#f59e0b] font-medium uppercase">
            Beta
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={clearChat}
            className="text-[#666] hover:text-[#999] transition-colors p-1"
            title="Nueva conversacion"
          >
            <Plus size={14} />
          </button>
          <button
            onClick={onClose}
            className="text-[#666] hover:text-[#999] transition-colors p-1"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Context badge */}
      <div className="px-4 py-1.5 border-b border-[#2e2e2e]">
        <ContextBadge section={activeSection} />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg) => (
          <MessageRenderer
            key={msg.id}
            message={msg}
            onOpenWorkflowEditor={
              autonomy.canSaveWorkflows ? onOpenWorkflowEditor : undefined
            }
          />
        ))}

        {/* Streaming state */}
        {isStreaming && (
          <div className="flex justify-start">
            <div className="max-w-[85%] space-y-1">
              {streamingToolCalls && streamingToolCalls.length > 0 && (
                <ToolCallIndicator toolCalls={streamingToolCalls} />
              )}
              {streamingContent ? (
                <div
                  className="rounded-lg px-3 py-2 text-[13px] leading-relaxed text-[#ccc]"
                  style={{ backgroundColor: "#2a2a2a" }}
                >
                  {streamingContent}
                  <span className="inline-block w-1.5 h-3.5 bg-[#3ecf8e] animate-pulse ml-0.5 align-middle" />
                </div>
              ) : (
                <div
                  className="rounded-lg px-3 py-2 text-[13px]"
                  style={{ backgroundColor: "#2a2a2a" }}
                >
                  <div className="flex items-center gap-1">
                    <div
                      className="w-1.5 h-1.5 rounded-full bg-[#666] animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <div
                      className="w-1.5 h-1.5 rounded-full bg-[#666] animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <div
                      className="w-1.5 h-1.5 rounded-full bg-[#666] animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {showSuggestions && (
        <SuggestionChips
          section={activeSection}
          onSelect={handleSuggestion}
          disabled={isStreaming}
        />
      )}

      {/* Input */}
      <div className="px-3 py-3 border-t border-[#2e2e2e]">
        <div
          className="flex items-center gap-2 h-[38px] px-3 rounded-lg border border-[#333]"
          style={{ backgroundColor: "#222" }}
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Pregunta sobre tus datos..."
            className="flex-1 bg-transparent text-[13px] text-[#ededed] placeholder:text-[#555] outline-none"
            disabled={isStreaming}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="text-[#666] hover:text-[#3ecf8e] disabled:opacity-30 transition-colors"
          >
            {isStreaming ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>
        <p className="text-[10px] text-[#444] mt-1.5 text-center">
          IA puede cometer errores. Verifica la informacion importante.
        </p>
      </div>
    </div>
  );
}
