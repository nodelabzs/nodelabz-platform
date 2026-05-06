"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Clock } from "lucide-react";

export function DelayNode({ data, selected }: NodeProps) {
  const hours = (data as { delayHours?: string }).delayHours || (data as { delay?: string }).delay || "24";

  return (
    <div className={`rounded-xl border px-4 py-3 min-w-[160px] transition-all ${
      selected ? "border-[#06b6d4] shadow-[0_0_12px_rgba(6,182,212,0.25)]" : "border-[#06b6d4]/30"
    }`} style={{ backgroundColor: "#1a2528" }}>
      <Handle type="target" position={Position.Top} className="!bg-[#06b6d4] !w-2.5 !h-2.5 !border-2 !border-[#1a2528]" />
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-5 h-5 rounded-md bg-[#06b6d4]/20 flex items-center justify-center">
          <Clock size={11} className="text-[#06b6d4]" />
        </div>
        <span className="text-[10px] font-semibold text-[#06b6d4] uppercase tracking-wider">Espera</span>
      </div>
      <p className="text-[12px] text-[#ededed] font-medium">{(data as { label?: string }).label || `Esperar ${hours}h`}</p>
      {(data as { description?: string }).description && (
        <p className="text-[10px] text-[#888] mt-1 leading-relaxed">{(data as { description?: string }).description}</p>
      )}
      <div className="mt-2 flex items-center gap-1">
        <Clock size={9} className="text-[#06b6d4]/60" />
        <span className="text-[9px] text-[#06b6d4]/60">{hours} horas</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-[#06b6d4] !w-2.5 !h-2.5 !border-2 !border-[#1a2528]" />
    </div>
  );
}
