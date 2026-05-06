"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Zap } from "lucide-react";

export function TriggerNode({ data, selected }: NodeProps) {
  return (
    <div className={`rounded-xl border px-4 py-3 min-w-[160px] transition-all ${
      selected ? "border-[#3ecf8e] shadow-[0_0_12px_rgba(62,207,142,0.25)]" : "border-[#3ecf8e]/30"
    }`} style={{ backgroundColor: "#1a2d22" }}>
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-5 h-5 rounded-md bg-[#3ecf8e]/20 flex items-center justify-center">
          <Zap size={11} className="text-[#3ecf8e]" />
        </div>
        <span className="text-[10px] font-semibold text-[#3ecf8e] uppercase tracking-wider">Trigger</span>
      </div>
      <p className="text-[12px] text-[#ededed] font-medium">{(data as { label?: string }).label}</p>
      {(data as { description?: string }).description && (
        <p className="text-[10px] text-[#888] mt-1 leading-relaxed">{(data as { description?: string }).description}</p>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-[#3ecf8e] !w-2.5 !h-2.5 !border-2 !border-[#1a2d22]" />
    </div>
  );
}
