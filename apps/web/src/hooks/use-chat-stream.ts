import { useCallback, useRef } from "react";
import { useChatStore } from "@/stores/chat-store";
import type { AiSection } from "@nodelabz/shared-types";
import { SECTION_TOOLS } from "@nodelabz/shared-types";

export function useChatStream() {
  const abortRef = useRef<AbortController | null>(null);

  const {
    conversationId,
    activeSection,
    plan,
    addUserMessage,
    startStreaming,
    appendToken,
    addToolCall,
    addArtifact,
    finishStreaming,
    setStreamError,
  } = useChatStore();

  const sendMessage = useCallback(
    async (message: string) => {
      addUserMessage(message);
      startStreaming();

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            conversationId,
            section: activeSection,
            mcpServers: SECTION_TOOLS[activeSection as AiSection] || [],
            plan,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const err = await res.text();
          setStreamError(
            `Error: ${res.status === 401 ? "No autorizado" : "No se pudo conectar con la IA"}`
          );
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
          setStreamError("Error al conectar con el servicio de IA.");
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (!data || data === "[DONE]") continue;

            try {
              const event = JSON.parse(data);

              switch (event.type) {
                case "token":
                  appendToken(event.content);
                  break;
                case "tool_call":
                  addToolCall(event.name, event.status, event.result);
                  break;
                case "artifact":
                  addArtifact({
                    artifactType: event.artifactType,
                    payload: event.payload,
                  });
                  break;
                case "done":
                  finishStreaming(event.messageId, event.conversationId);
                  return;
                case "error":
                  setStreamError(event.message);
                  return;
              }
            } catch {
              // Skip malformed JSON lines
            }
          }
        }

        // If stream ended without a done event, finish with what we have
        const state = useChatStore.getState();
        if (state.isStreaming) {
          finishStreaming(crypto.randomUUID(), conversationId || crypto.randomUUID());
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setStreamError("Error de conexion. Intenta de nuevo.");
      }
    },
    [
      conversationId,
      activeSection,
      plan,
      addUserMessage,
      startStreaming,
      appendToken,
      addToolCall,
      addArtifact,
      finishStreaming,
      setStreamError,
    ]
  );

  const abort = useCallback(() => {
    abortRef.current?.abort();
    const state = useChatStore.getState();
    if (state.isStreaming) {
      finishStreaming(crypto.randomUUID(), conversationId || crypto.randomUUID());
    }
  }, [conversationId, finishStreaming]);

  return { sendMessage, abort };
}
