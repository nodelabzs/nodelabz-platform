"use client";

import { useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { WorkflowArtifact } from "@nodelabz/shared-types";
import { Maximize2, Save, Check, Loader2, X, Zap } from "lucide-react";
import { TriggerNode } from "@/components/ui/workflow/nodes/trigger-node";
import { ActionNode } from "@/components/ui/workflow/nodes/action-node";
import { ConditionNode } from "@/components/ui/workflow/nodes/condition-node";
import { DelayNode } from "@/components/ui/workflow/nodes/delay-node";
import { trpc } from "@/lib/trpc";

const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  delay: DelayNode,
};

function buildFlowData(artifact: WorkflowArtifact["payload"]) {
  const nodes: Node[] = artifact.nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: n.data,
  }));
  const edges: Edge[] = artifact.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle,
    label: e.label,
    style: { stroke: "#555", strokeWidth: 2 },
    labelStyle: { fill: "#888", fontSize: 10 },
    labelBgStyle: { fill: "#1a1a1a" },
    labelBgPadding: [4, 2] as [number, number],
    labelBgBorderRadius: 4,
  }));
  return { nodes, edges };
}

/* ================================================================== */
/*  Full-screen workflow inspector modal                               */
/* ================================================================== */

function WorkflowModal({
  artifact,
  onClose,
  onSave,
  onOpenEditor,
  saved,
  saving,
}: {
  artifact: WorkflowArtifact["payload"];
  onClose: () => void;
  onSave: () => void;
  onOpenEditor?: () => void;
  saved: boolean;
  saving: boolean;
}) {
  const { nodes, edges } = buildFlowData(artifact);
  const nodeCount = artifact.nodes.length;
  const triggerNode = artifact.nodes.find((n) => n.type === "trigger");
  const actionCount = artifact.nodes.filter((n) => n.type === "action").length;
  const conditionCount = artifact.nodes.filter((n) => n.type === "condition").length;
  const delayCount = artifact.nodes.filter((n) => n.type === "delay").length;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-[90vw] max-w-5xl rounded-2xl border border-[#2e2e2e] overflow-hidden flex flex-col"
        style={{ backgroundColor: "#1a1a1a", height: "80vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#2e2e2e]" style={{ backgroundColor: "#222" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#3ecf8e]/15 flex items-center justify-center">
              <Zap size={16} className="text-[#3ecf8e]" />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold text-[#ededed]">{artifact.name}</h2>
              {artifact.description && (
                <p className="text-[11px] text-[#888]">{artifact.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saved ? (
              <span className="flex items-center gap-1.5 text-[12px] text-[#3ecf8e] px-3 py-1.5">
                <Check size={14} /> Guardado en workflows
              </span>
            ) : (
              <button
                onClick={onSave}
                disabled={saving}
                className="flex items-center gap-1.5 text-[12px] text-black px-4 py-2 rounded-lg font-medium"
                style={{ backgroundColor: "#3ecf8e" }}
              >
                {saving ? (
                  <><Loader2 size={14} className="animate-spin" /> Guardando...</>
                ) : (
                  <><Save size={14} /> Guardar workflow</>
                )}
              </button>
            )}
            {onOpenEditor && (
              <button
                onClick={() => { onClose(); onOpenEditor(); }}
                className="flex items-center gap-1.5 text-[12px] text-[#ccc] px-3 py-2 rounded-lg border border-[#333] hover:border-[#555] transition-colors"
              >
                <Maximize2 size={14} /> Abrir en editor
              </button>
            )}
            <button onClick={onClose} className="text-[#666] hover:text-[#ccc] transition-colors ml-2">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body: canvas + sidebar */}
        <div className="flex flex-1 overflow-hidden">
          {/* Canvas */}
          <div className="flex-1">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.3 }}
              nodesDraggable={false}
              nodesConnectable={false}
              proOptions={{ hideAttribution: true }}
              colorMode="dark"
            >
              <Background color="#333" gap={20} size={1} />
              <Controls showInteractive={false} className="!rounded-lg !border !border-[#2e2e2e]" />
            </ReactFlow>
          </div>

          {/* Right sidebar: full workflow details */}
          <aside className="w-[280px] border-l border-[#2e2e2e] overflow-y-auto flex flex-col" style={{ backgroundColor: "#1e1e1e" }}>
            {/* Stats */}
            <div className="px-4 py-3 border-b border-[#2e2e2e]">
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "Nodos", value: nodeCount, color: "#ededed" },
                  { label: "Acciones", value: actionCount, color: "#3b82f6" },
                  { label: "Condiciones", value: conditionCount, color: "#f59e0b" },
                  { label: "Esperas", value: delayCount, color: "#8b5cf6" },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <p className="text-[16px] font-bold" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-[9px] text-[#666]">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Step-by-step flow */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[#666] mb-3">Flujo paso a paso</h3>
              <div className="space-y-0">
                {artifact.nodes.map((n, i) => {
                  const colors: Record<string, string> = { trigger: "#3ecf8e", action: "#3b82f6", condition: "#f59e0b", delay: "#8b5cf6" };
                  const icons: Record<string, string> = { trigger: "⚡", action: "▶", condition: "◆", delay: "⏱" };
                  const typeLabels: Record<string, string> = { trigger: "Inicio", action: "Accion", condition: "Condicion", delay: "Espera" };
                  const color = colors[n.type] ?? "#888";

                  // Find outgoing edges
                  const outEdges = artifact.edges.filter((e) => e.source === n.id);
                  const isLast = i === artifact.nodes.length - 1;

                  return (
                    <div key={n.id}>
                      <div className="flex gap-3">
                        {/* Timeline */}
                        <div className="flex flex-col items-center">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-[12px] shrink-0"
                            style={{ backgroundColor: color + "20", border: `1px solid ${color}40` }}
                          >
                            {icons[n.type] ?? "•"}
                          </div>
                          {!isLast && <div className="w-px flex-1 min-h-[16px]" style={{ backgroundColor: "#333" }} />}
                        </div>

                        {/* Content */}
                        <div className="pb-4 flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[12px] font-medium text-[#ededed]">{n.data.label}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ backgroundColor: color + "20", color }}>{typeLabels[n.type] ?? n.type}</span>
                          </div>
                          {n.data.description && (
                            <p className="text-[11px] text-[#888] leading-relaxed">{n.data.description}</p>
                          )}
                          {/* Show branching info for conditions */}
                          {outEdges.length > 1 && (
                            <div className="mt-1.5 space-y-1">
                              {outEdges.map((e) => {
                                const targetNode = artifact.nodes.find((t) => t.id === e.target);
                                return (
                                  <div key={e.id} className="flex items-center gap-1.5 text-[10px]">
                                    <span className={e.sourceHandle === "yes" || e.label === "Si" || e.label === "Sí" ? "text-[#3ecf8e]" : "text-[#ef4444]"}>
                                      {e.label || (e.sourceHandle === "yes" ? "Si" : "No")} →
                                    </span>
                                    <span className="text-[#888]">{targetNode?.data.label ?? "?"}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Trigger info */}
            {triggerNode && (
              <div className="px-4 py-3 border-t border-[#2e2e2e]">
                <div className="rounded-lg border border-[#3ecf8e]/20 p-3" style={{ backgroundColor: "#1a2a1e" }}>
                  <p className="text-[10px] font-semibold text-[#3ecf8e] mb-1">Se activa cuando:</p>
                  <p className="text-[11px] text-[#ccc]">{triggerNode.data.description || triggerNode.data.label}</p>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Inline workflow preview (in chat)                                  */
/* ================================================================== */

export function WorkflowPreview({
  artifact,
  onOpenEditor,
}: {
  artifact: WorkflowArtifact["payload"];
  onOpenEditor?: () => void;
}) {
  const [saved, setSaved] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const utils = trpc.useUtils();
  const createWorkflow = trpc.workflow.create.useMutation({
    onSuccess: () => {
      setSaved(true);
      utils.workflow.list.invalidate();
    },
  });

  const { nodes, edges } = buildFlowData(artifact);

  function handleSave() {
    const triggerNode = artifact.nodes.find((n) => n.type === "trigger");
    createWorkflow.mutate({
      name: artifact.name || "Workflow sin nombre",
      trigger: (triggerNode?.data as Record<string, unknown>) || {},
      nodes: artifact.nodes as Record<string, unknown>[],
      edges: artifact.edges as Record<string, unknown>[],
      isActive: false,
    });
  }

  return (
    <>
      <div className="rounded-lg my-2 overflow-hidden relative border border-[#2e2e2e]" style={{ backgroundColor: "#1a1a1a" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#2e2e2e]" style={{ backgroundColor: "#222" }}>
          <span className="text-[11px] font-medium text-[#ededed]">
            {artifact.name}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1 text-[10px] text-[#ccc] px-2 py-1 rounded border border-[#333] hover:border-[#3ecf8e]/40 hover:text-[#3ecf8e] transition-colors"
            >
              <Maximize2 size={10} />
              Inspeccionar
            </button>
            {saved ? (
              <span className="flex items-center gap-1 text-[10px] text-[#3ecf8e]">
                <Check size={10} /> Guardado
              </span>
            ) : (
              <button
                onClick={handleSave}
                disabled={createWorkflow.isPending}
                className="flex items-center gap-1 text-[10px] text-black px-2 py-1 rounded font-medium"
                style={{ backgroundColor: "#3ecf8e" }}
              >
                {createWorkflow.isPending ? (
                  <><Loader2 size={10} className="animate-spin" /> ...</>
                ) : (
                  <><Save size={10} /> Guardar</>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Canvas with click overlay */}
        <div className="relative" style={{ height: 220 }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            panOnDrag={false}
            zoomOnScroll={false}
            zoomOnPinch={false}
            zoomOnDoubleClick={false}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#333" gap={16} size={1} />
          </ReactFlow>
          {/* Transparent click overlay on top of ReactFlow */}
          <div
            className="absolute inset-0 cursor-pointer hover:bg-white/[0.02] transition-colors"
            onClick={() => setModalOpen(true)}
          />
        </div>

        {artifact.description && (
          <div className="px-3 py-1.5 border-t border-[#2e2e2e] text-[10px] text-[#888]">
            {artifact.description}
          </div>
        )}
      </div>

      {/* Full-screen modal */}
      {modalOpen && (
        <WorkflowModal
          artifact={artifact}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
          onOpenEditor={onOpenEditor}
          saved={saved}
          saving={createWorkflow.isPending}
        />
      )}
    </>
  );
}
