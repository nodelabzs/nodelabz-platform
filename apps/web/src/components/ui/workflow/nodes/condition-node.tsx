"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { GitBranch } from "lucide-react";

export function ConditionNode({ data }: NodeProps) {
  return (
    <div className="rounded-lg border border-[#f59e0b]/40 px-3 py-2 min-w-[140px]" style={{ backgroundColor: "#2a2517" }}>
      <Handle type="target" position={Position.Top} className="!bg-[#f59e0b] !w-2 !h-2" />
      <div className="flex items-center gap-1.5 mb-1">
        <GitBranch size={12} className="text-[#f59e0b]" />
        <span className="text-[11px] font-medium text-[#f59e0b]">Condicion</span>
      </div>
      <p className="text-[11px] text-[#ededed]">{(data as { label?: string }).label}</p>
      {(data as { description?: string }).description && (
        <p className="text-[9px] text-[#888] mt-0.5">{(data as { description?: string }).description}</p>
      )}
      <Handle type="source" position={Position.Bottom} id="yes" className="!bg-[#3ecf8e] !w-2 !h-2 !left-[30%]" />
      <Handle type="source" position={Position.Bottom} id="no" className="!bg-[#ef4444] !w-2 !h-2 !left-[70%]" />
    </div>
  );
}
