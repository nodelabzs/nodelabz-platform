"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  EdgeLabelRenderer,
  getBezierPath,
  BaseEdge,
  type Connection,
  type Node,
  type Edge,
  type EdgeProps,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  X,
  Save,
  Play,
  ArrowLeft,
  Plus,
  Trash2,
  Zap,
  PlayCircle,
  GitBranch,
  Clock,
  ChevronRight,
} from "lucide-react";
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

// ── Custom Edge with hover buttons ───────────────────────────────────────

function EditableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  label,
}: EdgeProps) {
  const [hovered, setHovered] = useState(false);
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition,
  });

  return (
    <>
      <path d={edgePath} fill="none" stroke="transparent" strokeWidth={20}
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} />
      <BaseEdge id={id} path={edgePath}
        style={{ ...style, stroke: hovered ? "#3ecf8e" : "#444", strokeWidth: hovered ? 2 : 1.5, transition: "stroke 0.15s, stroke-width 0.15s" }} />
      {label && (
        <EdgeLabelRenderer>
          <div style={{ position: "absolute", transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`, pointerEvents: "none" }}
            className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-[#252525] border border-[#333] text-[#999]">
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
      {hovered && (
        <EdgeLabelRenderer>
          <div style={{ position: "absolute", transform: `translate(-50%, -50%) translate(${labelX}px,${labelY + (label ? 16 : 0)}px)` }}
            className="flex items-center gap-1" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
            <button className="w-5 h-5 rounded-full bg-[#3ecf8e] flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
              onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent("wf:insert", { detail: { edgeId: id, x: labelX, y: labelY } })); }}
              title="Insertar paso">
              <Plus size={10} className="text-black" />
            </button>
            <button className="w-5 h-5 rounded-full bg-[#ef4444] flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
              onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent("wf:del-edge", { detail: { edgeId: id } })); }}
              title="Eliminar conexion">
              <Trash2 size={9} className="text-white" />
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const edgeTypes = { editable: EditableEdge };

const NODE_TYPE_OPTIONS = [
  { type: "action", label: "Accion", icon: PlayCircle, color: "#6366f1" },
  { type: "condition", label: "Condicion", icon: GitBranch, color: "#f59e0b" },
  { type: "delay", label: "Espera", icon: Clock, color: "#06b6d4" },
];

// ── Side Panel ───────────────────────────────────────────────────────────

function NodePanel({ node, onUpdate, onClose }: { node: Node; onUpdate: (id: string, data: Record<string, unknown>) => void; onClose: () => void }) {
  const d = node.data as Record<string, string | undefined>;
  const cfg: Record<string, { label: string; color: string; icon: typeof Zap }> = {
    trigger: { label: "Trigger", color: "#3ecf8e", icon: Zap },
    action: { label: "Accion", color: "#6366f1", icon: PlayCircle },
    condition: { label: "Condicion", color: "#f59e0b", icon: GitBranch },
    delay: { label: "Espera", color: "#06b6d4", icon: Clock },
  };
  const c = cfg[node.type || "action"] || cfg.action!;
  const Icon = c.icon;
  const up = (k: string, v: string) => onUpdate(node.id, { ...d, [k]: v });

  return (
    <div className="w-[280px] border-l border-[#2e2e2e] flex flex-col h-full" style={{ backgroundColor: "#1c1c1c" }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2e2e2e]">
        <div className="flex items-center gap-2">
          <Icon size={14} style={{ color: c.color }} />
          <span className="text-[12px] font-medium text-[#ededed]">{c.label}</span>
        </div>
        <button onClick={onClose} className="text-[#666] hover:text-[#999]"><X size={14} /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <Field label="Nombre" value={d.label || ""} onChange={(v) => up("label", v)} />
        <div>
          <label className="text-[10px] text-[#888] uppercase tracking-wider block mb-1.5">Descripcion</label>
          <textarea value={d.description || ""} onChange={(e) => up("description", e.target.value)} rows={3}
            className="w-full rounded-md border border-[#333] bg-[#252525] text-[12px] text-[#ededed] px-2.5 py-2 outline-none focus:border-[#3ecf8e]/50 resize-none" />
        </div>
        {node.type === "action" && (
          <div>
            <label className="text-[10px] text-[#888] uppercase tracking-wider block mb-1.5">Tipo de accion</label>
            <select value={d.actionType || "send_email"} onChange={(e) => up("actionType", e.target.value)}
              className="w-full h-8 rounded-md border border-[#333] bg-[#252525] text-[12px] text-[#ededed] px-2 outline-none focus:border-[#3ecf8e]/50">
              <option value="send_email">Enviar email</option>
              <option value="send_whatsapp">Enviar WhatsApp</option>
              <option value="update_contact">Actualizar contacto</option>
              <option value="create_activity">Crear actividad</option>
            </select>
          </div>
        )}
        {node.type === "condition" && (
          <>
            <Field label="Campo" value={d.conditionField || ""} onChange={(v) => up("conditionField", v)} placeholder="scoreLabel" />
            <div>
              <label className="text-[10px] text-[#888] uppercase tracking-wider block mb-1.5">Operador</label>
              <select value={d.conditionOperator || "equals"} onChange={(e) => up("conditionOperator", e.target.value)}
                className="w-full h-8 rounded-md border border-[#333] bg-[#252525] text-[12px] text-[#ededed] px-2 outline-none focus:border-[#3ecf8e]/50">
                <option value="equals">Es igual a</option>
                <option value="not_equals">No es igual a</option>
                <option value="contains">Contiene</option>
                <option value="gt">Mayor que</option>
                <option value="lt">Menor que</option>
              </select>
            </div>
            <Field label="Valor" value={d.conditionValue || ""} onChange={(v) => up("conditionValue", v)} placeholder="HOT" />
          </>
        )}
        {node.type === "delay" && (
          <Field label="Horas de espera" value={d.delayHours || "24"} onChange={(v) => up("delayHours", v)} type="number" />
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="text-[10px] text-[#888] uppercase tracking-wider block mb-1.5">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full h-8 rounded-md border border-[#333] bg-[#252525] text-[12px] text-[#ededed] px-2.5 outline-none focus:border-[#3ecf8e]/50" />
    </div>
  );
}

// ── Main Editor ──────────────────────────────────────────────────────────

export function WorkflowEditor({
  draft, autonomy, onClose, onSave,
}: {
  draft: WorkflowArtifact["payload"];
  autonomy: PlanAutonomy;
  onClose: () => void;
  onSave: (data: { name: string; nodes: Node[]; edges: Edge[]; activate: boolean }) => void;
}) {
  const initialNodes: Node[] = draft.nodes.map((n) => ({ id: n.id, type: n.type, position: n.position, data: n.data }));
  const initialEdges: Edge[] = draft.edges.map((e) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle, label: e.label, type: "editable" }));

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [name, setName] = useState(draft.name);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [insertMenu, setInsertMenu] = useState<{ edgeId: string; x: number; y: number } | null>(null);
  const nextId = useRef(100);

  // Edge button events
  useEffect(() => {
    const onInsert = (e: Event) => setInsertMenu((e as CustomEvent).detail);
    const onDelEdge = (e: Event) => {
      const id = (e as CustomEvent).detail.edgeId;
      setEdges((eds) => eds.filter((edge) => edge.id !== id));
    };
    window.addEventListener("wf:insert", onInsert);
    window.addEventListener("wf:del-edge", onDelEdge);
    return () => { window.removeEventListener("wf:insert", onInsert); window.removeEventListener("wf:del-edge", onDelEdge); };
  }, [setEdges]);

  const onConnect = useCallback((c: Connection) => { setEdges((eds) => addEdge({ ...c, type: "editable" }, eds)); }, [setEdges]);
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => { setSelectedNode(node); setInsertMenu(null); }, []);
  const onPaneClick = useCallback(() => { setSelectedNode(null); setInsertMenu(null); }, []);

  const insertNode = useCallback((type: string, edgeId: string, x: number, y: number) => {
    const edge = edges.find((e) => e.id === edgeId);
    if (!edge) return;
    const nid = `n-${nextId.current++}`;
    const newNode: Node = { id: nid, type, position: { x: x - 70, y }, data: { label: type === "condition" ? "Nueva condicion" : type === "delay" ? "Esperar" : "Nueva accion" } };
    setNodes((nds) => [...nds, newNode]);
    setEdges((eds) => [
      ...eds.filter((e) => e.id !== edgeId),
      { id: `e-${edge.source}-${nid}`, source: edge.source, target: nid, sourceHandle: edge.sourceHandle, type: "editable" },
      { id: `e-${nid}-${edge.target}`, source: nid, target: edge.target, type: "editable" },
    ]);
    setInsertMenu(null);
    setSelectedNode(newNode);
  }, [edges, setNodes, setEdges]);

  const updateNodeData = useCallback((nodeId: string, data: Record<string, unknown>) => {
    setNodes((nds) => nds.map((n) => n.id === nodeId ? { ...n, data } : n));
    setSelectedNode((prev) => prev?.id === nodeId ? { ...prev, data } : prev);
  }, [setNodes]);

  return (
    <div className="flex h-full" style={{ backgroundColor: "#171717" }}>
      <div className="flex flex-col flex-1">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#2e2e2e]">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="text-[#888] hover:text-[#ededed] transition-colors"><ArrowLeft size={16} /></button>
            <input value={name} onChange={(e) => setName(e.target.value)}
              className="bg-transparent text-[14px] text-[#ededed] font-medium outline-none border-b border-transparent focus:border-[#3ecf8e] px-1" />
          </div>
          <div className="flex items-center gap-2">
            {!autonomy.canSaveWorkflows ? (
              <span className="text-[11px] text-[#f59e0b] px-3 py-1.5 rounded border border-[#f59e0b]/30">Upgrade para guardar</span>
            ) : (
              <>
                <button onClick={() => onSave({ name, nodes, edges, activate: false })}
                  className="flex items-center gap-1.5 text-[12px] text-[#ededed] px-3 py-1.5 rounded border border-[#333] hover:border-[#555] transition-colors">
                  <Save size={13} /> Guardar
                </button>
                <button onClick={() => onSave({ name, nodes, edges, activate: autonomy.autoActivateWorkflows || false })}
                  className="flex items-center gap-1.5 text-[12px] text-black px-3 py-1.5 rounded font-medium" style={{ backgroundColor: "#3ecf8e" }}>
                  {autonomy.autoActivateWorkflows ? <><Play size={13} /> Activar</> : <><Save size={13} /> {autonomy.requiresApproval ? "Aprobar" : "Guardar"}</>}
                </button>
              </>
            )}
            <button onClick={onClose} className="text-[#666] hover:text-[#999] transition-colors"><X size={16} /></button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative">
          <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
            onConnect={onConnect} onNodeClick={onNodeClick} onPaneClick={onPaneClick}
            nodeTypes={nodeTypes} edgeTypes={edgeTypes} defaultEdgeOptions={{ type: "editable" }}
            fitView proOptions={{ hideAttribution: true }} selectNodesOnDrag={false}>
            <Background color="#333" gap={20} size={1} variant={BackgroundVariant.Dots} />
            <Controls style={{ backgroundColor: "#2a2a2a", borderColor: "#333" }} />
            <MiniMap style={{ backgroundColor: "#1c1c1c" }} nodeColor="#3ecf8e" maskColor="rgba(0,0,0,0.7)" />
          </ReactFlow>

          {/* Insert node popup */}
          {insertMenu && (
            <div className="absolute z-50 rounded-lg border border-[#2e2e2e] shadow-xl p-1.5"
              style={{ backgroundColor: "#1c1c1c", left: insertMenu.x + 20, top: insertMenu.y - 40 }}>
              <p className="text-[9px] text-[#666] uppercase tracking-wider px-2 py-1">Insertar paso</p>
              {NODE_TYPE_OPTIONS.map((opt) => {
                const Ic = opt.icon;
                return (
                  <button key={opt.type} onClick={() => insertNode(opt.type, insertMenu.edgeId, insertMenu.x, insertMenu.y)}
                    className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-left hover:bg-white/5 transition-colors">
                    <Ic size={12} style={{ color: opt.color }} />
                    <span className="text-[11px] text-[#ededed]">{opt.label}</span>
                    <ChevronRight size={10} className="text-[#555] ml-auto" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Side panel for selected node */}
      {selectedNode && <NodePanel node={selectedNode} onUpdate={updateNodeData} onClose={() => setSelectedNode(null)} />}
    </div>
  );
}
