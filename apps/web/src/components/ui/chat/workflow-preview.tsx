"use client";

import {
  ReactFlow,
  Background,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { WorkflowArtifact } from "@nodelabz/shared-types";
import { Maximize2 } from "lucide-react";
import { TriggerNode } from "@/components/ui/workflow/nodes/trigger-node";
import { ActionNode } from "@/components/ui/workflow/nodes/action-node";
import { ConditionNode } from "@/components/ui/workflow/nodes/condition-node";
import { DelayNode } from "@/components/ui/workflow/nodes/delay-node";

const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  delay: DelayNode,
};

export function WorkflowPreview({
  artifact,
  onOpenEditor,
}: {
  artifact: WorkflowArtifact["payload"];
  onOpenEditor?: () => void;
}) {
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
    style: { stroke: "#555" },
    labelStyle: { fill: "#888", fontSize: 10 },
  }));

  return (
    <div
      className="rounded-lg my-1 overflow-hidden relative"
      style={{ backgroundColor: "#1a1a1a", height: 200 }}
    >
      <div className="absolute top-2 left-2 z-10 flex items-center gap-2">
        <span className="text-[10px] text-[#888] px-1.5 py-0.5 rounded" style={{ backgroundColor: "#252525" }}>
          {artifact.name}
        </span>
      </div>
      {onOpenEditor && (
        <button
          onClick={onOpenEditor}
          className="absolute top-2 right-2 z-10 flex items-center gap-1 text-[10px] text-[#3ecf8e] px-2 py-1 rounded hover:bg-[#3ecf8e]/10 transition-colors"
          style={{ backgroundColor: "#252525" }}
        >
          <Maximize2 size={10} />
          Abrir en editor
        </button>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
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
    </div>
  );
}
