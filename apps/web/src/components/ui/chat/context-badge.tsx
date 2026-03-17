"use client";

import { SECTION_LABELS, SECTION_TOOLS } from "@nodelabz/shared-types";
import type { AiSection } from "@nodelabz/shared-types";
import { Cpu } from "lucide-react";

export function ContextBadge({ section }: { section: AiSection }) {
  const label = SECTION_LABELS[section] || "General";
  const tools = SECTION_TOOLS[section] || [];

  return (
    <div className="flex items-center gap-1.5">
      <Cpu size={12} className="text-[#3ecf8e]" />
      <span className="text-[10px] text-[#888]">
        {label}
      </span>
      <span className="text-[10px] text-[#555]">
        ({tools.length} {tools.length === 1 ? "tool" : "tools"})
      </span>
    </div>
  );
}
