"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { PlayCircle } from "lucide-react";

export function ActionNode({ data, selected }: NodeProps) {
  return (
    <div className={`rounded-xl border px-4 py-3 min-w-[160px] transition-all ${
      selected ? "border-[#6366f1] shadow-[0_0_12px_rgba(99,102,241,0.25)]" : "border-[#6366f1]/30"
    }`} style={{ backgroundColor: "#1a1a2d" }}>
      <Handle type="target" position={Position.Top} className="!bg-[#6366f1] !w-2.5 !h-2.5 !border-2 !border-[#1a1a2d]" />
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-5 h-5 rounded-md bg-[#6366f1]/20 flex items-center justify-center">
          <PlayCircle size={11} className="text-[#6366f1]" />
        </div>
        <span className="text-[10px] font-semibold text-[#6366f1] uppercase tracking-wider">Accion</span>
      </div>
      <p className="text-[12px] text-[#ededed] font-medium">{(data as { label?: string }).label}</p>
      {(data as { description?: string }).description && (
        <p className="text-[10px] text-[#888] mt-1 leading-relaxed">{(data as { description?: string }).description}</p>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-[#6366f1] !w-2.5 !h-2.5 !border-2 !border-[#1a1a2d]" />
    </div>
  );
}
