"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { GitBranch } from "lucide-react";

export function ConditionNode({ data, selected }: NodeProps) {
  return (
    <div className={`rounded-xl border px-4 py-3 min-w-[160px] transition-all ${
      selected ? "border-[#f59e0b] shadow-[0_0_12px_rgba(245,158,11,0.25)]" : "border-[#f59e0b]/30"
    }`} style={{ backgroundColor: "#2a2517" }}>
      <Handle type="target" position={Position.Top} className="!bg-[#f59e0b] !w-2.5 !h-2.5 !border-2 !border-[#2a2517]" />
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-5 h-5 rounded-md bg-[#f59e0b]/20 flex items-center justify-center">
          <GitBranch size={11} className="text-[#f59e0b]" />
        </div>
        <span className="text-[10px] font-semibold text-[#f59e0b] uppercase tracking-wider">Condicion</span>
      </div>
      <p className="text-[12px] text-[#ededed] font-medium">{(data as { label?: string }).label}</p>
      {(data as { description?: string }).description && (
        <p className="text-[10px] text-[#888] mt-1 leading-relaxed">{(data as { description?: string }).description}</p>
      )}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#f59e0b]/15">
        <span className="text-[9px] text-[#3ecf8e]">Si</span>
        <span className="text-[9px] text-[#ef4444]">No</span>
      </div>
      <Handle type="source" position={Position.Bottom} id="yes" className="!bg-[#3ecf8e] !w-2.5 !h-2.5 !border-2 !border-[#2a2517] !left-[30%]" />
      <Handle type="source" position={Position.Bottom} id="no" className="!bg-[#ef4444] !w-2.5 !h-2.5 !border-2 !border-[#2a2517] !left-[70%]" />
    </div>
  );
}
