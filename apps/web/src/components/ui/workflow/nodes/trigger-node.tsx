"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Zap } from "lucide-react";

export function TriggerNode({ data }: NodeProps) {
  return (
    <div className="rounded-lg border border-[#3ecf8e]/40 px-3 py-2 min-w-[140px]" style={{ backgroundColor: "#1e2a22" }}>
      <div className="flex items-center gap-1.5 mb-1">
        <Zap size={12} className="text-[#3ecf8e]" />
        <span className="text-[11px] font-medium text-[#3ecf8e]">Trigger</span>
      </div>
      <p className="text-[11px] text-[#ededed]">{(data as { label?: string }).label}</p>
      {(data as { description?: string }).description && (
        <p className="text-[9px] text-[#888] mt-0.5">{(data as { description?: string }).description}</p>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-[#3ecf8e] !w-2 !h-2" />
    </div>
  );
}
