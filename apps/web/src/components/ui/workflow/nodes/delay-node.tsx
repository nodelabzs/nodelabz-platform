"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Clock } from "lucide-react";

export function DelayNode({ data }: NodeProps) {
  return (
    <div className="rounded-lg border border-[#06b6d4]/40 px-3 py-2 min-w-[140px]" style={{ backgroundColor: "#1a2528" }}>
      <Handle type="target" position={Position.Top} className="!bg-[#06b6d4] !w-2 !h-2" />
      <div className="flex items-center gap-1.5 mb-1">
        <Clock size={12} className="text-[#06b6d4]" />
        <span className="text-[11px] font-medium text-[#06b6d4]">Espera</span>
      </div>
      <p className="text-[11px] text-[#ededed]">{(data as { label?: string }).label}</p>
      {(data as { description?: string }).description && (
        <p className="text-[9px] text-[#888] mt-0.5">{(data as { description?: string }).description}</p>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-[#06b6d4] !w-2 !h-2" />
    </div>
  );
}
