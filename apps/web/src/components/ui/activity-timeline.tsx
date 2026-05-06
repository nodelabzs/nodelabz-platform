"use client";

import React, { useState, lazy, Suspense } from "react";
import { trpc } from "@/lib/trpc";
import type { Block } from "@blocknote/core";
import {
  Mail,
  Phone,
  MessageSquare,
  FileText,
  Handshake,
  ArrowRight,
  Trophy,
  XCircle,
  Activity,
  Plus,
  Send,
  Type,
  AlignLeft,
} from "lucide-react";

// Lazy-load the rich text editor to avoid large initial bundle
const RichTextEditor = lazy(() =>
  import("./rich-text-editor").then((m) => ({ default: m.RichTextEditor }))
);
const RichTextDisplay = lazy(() =>
  import("./rich-text-editor").then((m) => ({ default: m.RichTextDisplay }))
);

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  email_sent: <Mail size={12} />,
  email_received: <Mail size={12} />,
  call: <Phone size={12} />,
  note: <FileText size={12} />,
  message: <MessageSquare size={12} />,
  deal_created: <Handshake size={12} />,
  deal_stage_changed: <ArrowRight size={12} />,
  deal_won: <Trophy size={12} />,
  deal_lost: <XCircle size={12} />,
};

const ACTIVITY_COLORS: Record<string, string> = {
  email_sent: "#3b82f6",
  email_received: "#3b82f6",
  call: "#22c55e",
  note: "#f59e0b",
  message: "#8b5cf6",
  deal_created: "#3ecf8e",
  deal_stage_changed: "#22d3ee",
  deal_won: "#3ecf8e",
  deal_lost: "#ef4444",
};

function timeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days}d`;
  return new Date(date).toLocaleDateString("es", { month: "short", day: "numeric" });
}

interface ActivityTimelineProps {
  contactId: string;
  activities: Array<{
    id: string;
    type: string;
    subject?: string | null;
    body?: string | null;
    metadata?: unknown;
    createdAt: Date;
    createdBy?: string | null;
  }>;
}

export function ActivityTimeline({ contactId, activities }: ActivityTimelineProps) {
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteType, setNoteType] = useState("note");
  const [useRichText, setUseRichText] = useState(false);
  const [richBlocks, setRichBlocks] = useState<Block[]>([]);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  const utils = trpc.useUtils();
  const createActivity = trpc.activities.create.useMutation({
    onSuccess: () => {
      utils.contacts.get.invalidate({ contactId });
      setNoteText("");
      setRichBlocks([]);
      setShowAddNote(false);
      setUseRichText(false);
    },
  });

  function handleSubmitNote() {
    if (useRichText) {
      if (richBlocks.length === 0) return;
      // Extract plain text for body (search/preview), store blocks in metadata
      const plainText = richBlocks
        .map((block) => {
          if (!block.content || !Array.isArray(block.content)) return "";
          return block.content
            .map((inline) => {
              if (typeof inline === "string") return inline;
              if (inline && "text" in inline) return (inline as { text: string }).text;
              return "";
            })
            .join("");
        })
        .filter(Boolean)
        .join("\n");

      createActivity.mutate({
        contactId,
        type: noteType,
        subject: noteType === "note" ? "Nota" : noteType === "call" ? "Llamada" : "Email",
        body: plainText || "Nota con formato",
        metadata: { richText: richBlocks },
      });
    } else {
      if (!noteText.trim()) return;
      createActivity.mutate({
        contactId,
        type: noteType,
        subject: noteType === "note" ? "Nota" : noteType === "call" ? "Llamada" : "Email",
        body: noteText.trim(),
      });
    }
  }

  function toggleExpanded(id: string) {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function getRichBlocks(metadata: unknown): Block[] | null {
    if (!metadata || typeof metadata !== "object") return null;
    const m = metadata as Record<string, unknown>;
    if (Array.isArray(m.richText) && m.richText.length > 0) {
      return m.richText as Block[];
    }
    return null;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-medium text-[#ededed]">
          Actividad ({activities.length})
        </h3>
        <button
          onClick={() => setShowAddNote(!showAddNote)}
          className="flex items-center gap-1 text-[11px] text-[#3ecf8e] hover:text-[#3ecf8e]/80 transition-colors"
        >
          <Plus size={12} /> Agregar
        </button>
      </div>

      {/* Add note form */}
      {showAddNote && (
        <div className="rounded-lg border border-[#2e2e2e] p-3 mb-3" style={{ backgroundColor: "#1e1e1e" }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex gap-2">
              {(["note", "call", "email_sent"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setNoteType(t)}
                  className="text-[11px] px-2 py-1 rounded transition-colors"
                  style={{
                    backgroundColor: noteType === t ? (ACTIVITY_COLORS[t] ?? "#3ecf8e") + "20" : "transparent",
                    color: noteType === t ? (ACTIVITY_COLORS[t] ?? "#3ecf8e") : "#888",
                    border: `1px solid ${noteType === t ? (ACTIVITY_COLORS[t] ?? "#3ecf8e") + "40" : "#333"}`,
                  }}
                >
                  {t === "note" ? "Nota" : t === "call" ? "Llamada" : "Email"}
                </button>
              ))}
            </div>
            {/* Toggle rich text */}
            <button
              onClick={() => setUseRichText(!useRichText)}
              className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded transition-colors"
              style={{
                color: useRichText ? "#3ecf8e" : "#888",
                border: `1px solid ${useRichText ? "#3ecf8e40" : "#333"}`,
                backgroundColor: useRichText ? "rgba(62,207,142,0.1)" : "transparent",
              }}
              title={useRichText ? "Cambiar a texto simple" : "Usar editor enriquecido"}
            >
              {useRichText ? <AlignLeft size={10} /> : <Type size={10} />}
              {useRichText ? "Rich" : "Plain"}
            </button>
          </div>

          {useRichText ? (
            <Suspense
              fallback={
                <div className="h-20 rounded bg-[#2a2a2a] animate-pulse" />
              }
            >
              <RichTextEditor
                onChange={(blocks) => setRichBlocks(blocks)}
                placeholder="Escribe una nota con formato..."
              />
            </Suspense>
          ) : (
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Escribe una nota..."
              className="w-full h-16 px-2.5 py-2 rounded border border-[#333] bg-[#222] text-[12px] text-[#ededed] placeholder:text-[#555] outline-none focus:border-[#3ecf8e]/50 resize-none"
            />
          )}

          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => { setShowAddNote(false); setUseRichText(false); }}
              className="text-[11px] text-[#888] px-2 py-1 rounded hover:bg-[#2a2a2a]"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmitNote}
              disabled={
                (useRichText ? richBlocks.length === 0 : !noteText.trim()) ||
                createActivity.isPending
              }
              className="flex items-center gap-1 text-[11px] text-black px-2.5 py-1 rounded font-medium disabled:opacity-50"
              style={{ backgroundColor: "#3ecf8e" }}
            >
              <Send size={10} /> {createActivity.isPending ? "..." : "Guardar"}
            </button>
          </div>
        </div>
      )}

      {/* Timeline */}
      {activities.length === 0 ? (
        <p className="text-[12px] text-[#555] text-center py-4">Sin actividad aun</p>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[11px] top-3 bottom-3 w-px bg-[#2e2e2e]" />

          <div className="space-y-0">
            {activities.map((a) => {
              const color = ACTIVITY_COLORS[a.type] ?? "#888";
              const icon = ACTIVITY_ICONS[a.type] ?? <Activity size={12} />;
              const blocks = getRichBlocks(a.metadata);
              const isExpanded = expandedNotes.has(a.id);

              return (
                <div key={a.id} className="flex gap-3 py-2 relative group">
                  {/* Icon dot */}
                  <div
                    className="w-[22px] h-[22px] rounded-full flex items-center justify-center flex-shrink-0 z-10"
                    style={{ backgroundColor: color + "20", color }}
                  >
                    {icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[11px] font-medium px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: color + "15", color }}
                      >
                        {a.type.replace(/_/g, " ")}
                      </span>
                      <span className="text-[10px] text-[#555]">{timeAgo(a.createdAt)}</span>
                      {blocks && (
                        <span className="text-[9px] px-1 py-0.5 rounded text-[#f59e0b] bg-[#f59e0b]/10">
                          rich
                        </span>
                      )}
                    </div>
                    {a.subject && (
                      <p className="text-[12px] text-[#ccc] mt-0.5 truncate">{a.subject}</p>
                    )}

                    {/* Rich text display */}
                    {blocks && isExpanded ? (
                      <div className="mt-1">
                        <Suspense
                          fallback={
                            <div className="h-8 rounded bg-[#2a2a2a] animate-pulse" />
                          }
                        >
                          <RichTextDisplay blocks={blocks} />
                        </Suspense>
                        <button
                          onClick={() => toggleExpanded(a.id)}
                          className="text-[10px] text-[#666] hover:text-[#888] mt-1"
                        >
                          Colapsar
                        </button>
                      </div>
                    ) : blocks ? (
                      <button
                        onClick={() => toggleExpanded(a.id)}
                        className="text-[11px] text-[#888] mt-0.5 hover:text-[#ccc] transition-colors"
                      >
                        {a.body ? a.body.slice(0, 60) + (a.body.length > 60 ? "..." : "") : "Ver nota"}
                      </button>
                    ) : a.body ? (
                      <p className="text-[11px] text-[#888] mt-0.5 line-clamp-2">{a.body}</p>
                    ) : null}

                    {a.type === "deal_stage_changed" && a.metadata != null && (
                      <p className="text-[11px] text-[#888] mt-0.5">
                        {(a.metadata as { from?: string }).from} → {(a.metadata as { to?: string }).to}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
