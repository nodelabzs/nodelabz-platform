"use client";

import React from "react";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import type { Block } from "@blocknote/core";
import "@blocknote/mantine/style.css";

/* ================================================================== */
/*  Rich Text Editor — Lightweight BlockNote wrapper                   */
/* ================================================================== */

interface RichTextEditorProps {
  /** Initial content as BlockNote JSON blocks */
  initialContent?: Block[];
  /** Called on every change with the blocks JSON */
  onChange?: (blocks: Block[]) => void;
  /** If true, renders read-only (no editing) */
  editable?: boolean;
  /** Placeholder text */
  placeholder?: string;
}

export function RichTextEditor({
  initialContent,
  onChange,
  editable = true,
  placeholder = "Escribe algo...",
}: RichTextEditorProps) {
  const editor = useCreateBlockNote({
    initialContent: initialContent && initialContent.length > 0 ? initialContent : undefined,
    domAttributes: {
      editor: {
        "data-placeholder": placeholder,
      },
    },
  });

  return (
    <div
      className="rich-text-editor rounded-lg border overflow-hidden"
      style={{
        backgroundColor: "var(--nl-bg-tertiary, #222)",
        borderColor: "var(--nl-border, #2e2e2e)",
      }}
    >
      <BlockNoteView
        editor={editor}
        editable={editable}
        onChange={() => {
          onChange?.(editor.document);
        }}
        theme="dark"
      />
      <style>{`
        .rich-text-editor .bn-container {
          font-size: 13px;
          --bn-colors-editor-background: var(--nl-bg-tertiary, #222);
          --bn-colors-editor-text: var(--nl-text-primary, #ededed);
          --bn-colors-menu-background: var(--nl-bg-primary, #1a1a1a);
          --bn-colors-menu-text: var(--nl-text-primary, #ededed);
          --bn-colors-tooltip-background: var(--nl-bg-primary, #1a1a1a);
          --bn-colors-tooltip-text: var(--nl-text-primary, #ededed);
          --bn-colors-hovered-background: var(--nl-bg-elevated, #2a2a2a);
          --bn-colors-selected-background: var(--nl-accent-subtle, rgba(62, 207, 142, 0.15));
          --bn-colors-disabled-background: var(--nl-bg-secondary, #1e1e1e);
          --bn-colors-disabled-text: var(--nl-text-faint, #666);
          --bn-colors-border: var(--nl-border, #2e2e2e);
          --bn-border-radius: 8px;
        }
        .rich-text-editor .bn-editor {
          padding: 8px 12px;
          min-height: ${editable ? "80px" : "auto"};
        }
        .rich-text-editor .bn-inline-content[data-content-type="paragraph"]:empty::before {
          color: var(--nl-text-placeholder, #555);
        }
      `}</style>
    </div>
  );
}

/* ================================================================== */
/*  Rich Text Display — Read-only renderer for stored blocks           */
/* ================================================================== */

interface RichTextDisplayProps {
  blocks: Block[];
}

export function RichTextDisplay({ blocks }: RichTextDisplayProps) {
  if (!blocks || blocks.length === 0) return null;
  return <RichTextEditor initialContent={blocks} editable={false} />;
}

/* ================================================================== */
/*  Utilities                                                          */
/* ================================================================== */

/** Extract plain text from BlockNote blocks for search/preview */
export function blocksToPlainText(blocks: Block[]): string {
  if (!blocks) return "";
  return blocks
    .map((block) => {
      if (!block.content) return "";
      if (Array.isArray(block.content)) {
        return block.content
          .map((inline) => {
            if (typeof inline === "string") return inline;
            if ("text" in inline) return (inline as { text: string }).text;
            return "";
          })
          .join("");
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");
}
