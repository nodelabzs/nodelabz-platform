"use client";

import type { ChatMessage, ChatArtifact } from "@nodelabz/shared-types";
import { ChartMessage } from "./chart-message";
import { WorkflowPreview } from "./workflow-preview";
import { ToolCallIndicator } from "./tool-call-indicator";

export function MessageRenderer({
  message,
  onOpenWorkflowEditor,
}: {
  message: ChatMessage;
  onOpenWorkflowEditor?: (payload: ChatArtifact & { artifactType: "workflow" }) => void;
}) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[85%] space-y-1">
        {/* Tool calls */}
        {message.toolCalls && <ToolCallIndicator toolCalls={message.toolCalls} />}

        {/* Text content */}
        {message.content && (
          <div
            className={`rounded-lg px-3 py-2 text-[13px] leading-relaxed ${
              isUser ? "text-black" : "text-[#ccc]"
            }`}
            style={{
              backgroundColor: isUser ? "#3ecf8e" : "#2a2a2a",
            }}
          >
            {message.content}
          </div>
        )}

        {/* Artifacts */}
        {message.artifacts?.map((artifact, i) => {
          if (artifact.artifactType === "chart") {
            return <ChartMessage key={i} artifact={artifact.payload} />;
          }
          if (artifact.artifactType === "workflow") {
            return (
              <WorkflowPreview
                key={i}
                artifact={artifact.payload}
                onOpenEditor={
                  onOpenWorkflowEditor
                    ? () => onOpenWorkflowEditor(artifact as ChatArtifact & { artifactType: "workflow" })
                    : undefined
                }
              />
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}
