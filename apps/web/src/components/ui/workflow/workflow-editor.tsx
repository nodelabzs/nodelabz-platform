"use client";

import { useCallback, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { X, Save, Play, ArrowLeft } from "lucide-react";
import { TriggerNode } from "./nodes/trigger-node";
import { ActionNode } from "./nodes/action-node";
import { ConditionNode } from "./nodes/condition-node";
import { DelayNode } from "./nodes/delay-node";
import type { WorkflowArtifact, PlanAutonomy } from "@nodelabz/shared-types";

const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  delay: DelayNode,
};

export function WorkflowEditor({
  draft,
  autonomy,
  onClose,
  onSave,
}: {
  draft: WorkflowArtifact["payload"];
  autonomy: PlanAutonomy;
  onClose: () => void;
  onSave: (data: { name: string; nodes: Node[]; edges: Edge[]; activate: boolean }) => void;
}) {
  const initialNodes: Node[] = draft.nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: n.data,
  }));

  const initialEdges: Edge[] = draft.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle,
    label: e.label,
    style: { stroke: "#555" },
    labelStyle: { fill: "#888", fontSize: 10 },
  }));

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [name, setName] = useState(draft.name);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          { ...connection, style: { stroke: "#555" } },
          eds
        )
      );
    },
    [setEdges]
  );

  const handleSave = (activate: boolean) => {
    onSave({ name, nodes, edges, activate });
  };

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: "#171717" }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#2e2e2e]">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="text-[#888] hover:text-[#ededed] transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-transparent text-[14px] text-[#ededed] font-medium outline-none border-b border-transparent focus:border-[#3ecf8e] px-1"
          />
        </div>
        <div className="flex items-center gap-2">
          {!autonomy.canSaveWorkflows ? (
            <span className="text-[11px] text-[#f59e0b] px-3 py-1.5 rounded border border-[#f59e0b]/30">
              Upgrade para guardar
            </span>
          ) : (
            <>
              <button
                onClick={() => handleSave(false)}
                className="flex items-center gap-1.5 text-[12px] text-[#ededed] px-3 py-1.5 rounded border border-[#333] hover:border-[#555] transition-colors"
              >
                <Save size={13} />
                Guardar borrador
              </button>
              {autonomy.autoActivateWorkflows ? (
                <button
                  onClick={() => handleSave(true)}
                  className="flex items-center gap-1.5 text-[12px] text-black px-3 py-1.5 rounded font-medium"
                  style={{ backgroundColor: "#3ecf8e" }}
                >
                  <Play size={13} />
                  Guardar y activar
                </button>
              ) : (
                <button
                  onClick={() => handleSave(false)}
                  className="flex items-center gap-1.5 text-[12px] text-black px-3 py-1.5 rounded font-medium"
                  style={{ backgroundColor: "#3ecf8e" }}
                >
                  <Save size={13} />
                  {autonomy.requiresApproval ? "Aprobar y guardar" : "Guardar"}
                </button>
              )}
            </>
          )}
          <button
            onClick={onClose}
            className="text-[#666] hover:text-[#999] transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#333" gap={20} size={1} />
          <Controls
            style={{ backgroundColor: "#2a2a2a", borderColor: "#333" }}
          />
          <MiniMap
            style={{ backgroundColor: "#1c1c1c" }}
            nodeColor="#3ecf8e"
            maskColor="rgba(0,0,0,0.7)"
          />
        </ReactFlow>
      </div>
    </div>
  );
}
