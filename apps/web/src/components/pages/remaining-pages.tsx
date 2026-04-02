"use client";

import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { MarkdownContent } from "@/components/ui/chat/markdown-content";
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { TriggerNode } from "@/components/ui/workflow/nodes/trigger-node";
import { ActionNode } from "@/components/ui/workflow/nodes/action-node";
import { ConditionNode } from "@/components/ui/workflow/nodes/condition-node";
import { DelayNode } from "@/components/ui/workflow/nodes/delay-node";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ComposedChart,
  Line,
  Treemap,
} from "recharts";
import {
  MessageCircle,
  Share2,
  Workflow,
  BarChart3,
  Plug,
  Settings,
  Plus,
  Search,
  Play,
  Pause,
  Send,
  Bot,
  Hash,
  Phone,
  ShieldCheck,
  Calendar,
  Facebook,
  Globe,
  FileText,
  Download,
  Mail,
  CreditCard,
  Users,
  Key,
  Bell,
  Languages,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Zap,
  Trash2,
} from "lucide-react";

const workflowNodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  delay: DelayNode,
};

function SectionHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-[20px] font-semibold text-[#ededed]">{title}</h1>
        {description && <p className="text-[13px] text-[#888] mt-1">{description}</p>}
      </div>
      {action}
    </div>
  );
}

function Badge({ text, color = "#3ecf8e" }: { text: string; color?: string }) {
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: color + "20", color }}>
      {text}
    </span>
  );
}

// ============================
// WHATSAPP
// ============================

export function ConversacionesWAPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");

  const { data: convData, isLoading } = trpc.whatsapp.listConversations.useQuery({ search: searchTerm || undefined, limit: 30 });
  const conversations = convData?.conversations ?? [];

  const { data: msgData } = trpc.whatsapp.getMessages.useQuery(
    { contactId: selectedContactId! },
    { enabled: !!selectedContactId }
  );
  const messages = msgData?.messages ?? [];

  const utils = trpc.useUtils();
  const sendMutation = trpc.whatsapp.send.useMutation({
    onSuccess: () => {
      setNewMessage("");
      if (selectedContactId) utils.whatsapp.getMessages.invalidate({ contactId: selectedContactId });
      utils.whatsapp.listConversations.invalidate();
    },
  });

  const selected = conversations.find((c) => c.contact.id === selectedContactId);

  return (
    <>
      <SectionHeader title="Conversaciones" description="Mensajes de WhatsApp Business" />
      {isLoading ? (
        <div className="h-[500px] rounded-lg bg-[#1e1e1e] animate-pulse" />
      ) : conversations.length === 0 ? (
        <div className="rounded-lg border border-[#2e2e2e] p-12 text-center" style={{ backgroundColor: "#1e1e1e" }}>
          <MessageCircle size={32} className="text-[#555] mx-auto mb-3" />
          <p className="text-[14px] text-[#ededed] font-medium mb-1">Sin conversaciones</p>
          <p className="text-[12px] text-[#888]">Conecta WhatsApp Business para ver conversaciones aqui.</p>
        </div>
      ) : (
        <div className="flex gap-4" style={{ height: 500 }}>
          <div className="w-[280px] rounded-lg border border-[#2e2e2e] overflow-hidden flex flex-col" style={{ backgroundColor: "#1e1e1e" }}>
            <div className="p-3 border-b border-[#2e2e2e]">
              <div className="flex items-center gap-2 h-[32px] px-2 rounded border border-[#333]" style={{ backgroundColor: "#252525" }}>
                <Search size={12} className="text-[#666]" />
                <input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 bg-transparent text-[12px] text-[#ededed] placeholder:text-[#555] outline-none" />
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              {conversations.map((c) => {
                const name = `${c.contact.firstName} ${c.contact.lastName ?? ""}`.trim();
                return (
                  <div
                    key={c.contact.id}
                    onClick={() => setSelectedContactId(c.contact.id)}
                    className={`px-3 py-2.5 border-b border-[#2e2e2e] cursor-pointer hover:bg-[#252525] transition-colors ${c.contact.id === selectedContactId ? "bg-[#252525]" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[13px] font-medium text-[#ededed]">{name || c.contact.phone}</span>
                      {c.lastMessage && <span className="text-[10px] text-[#888]">{new Date(c.lastMessage.createdAt).toLocaleDateString()}</span>}
                    </div>
                    <div className="flex items-center justify-between">
                      {c.lastMessage && <span className="text-[11px] text-[#888] truncate max-w-[180px]">{c.lastMessage.content}</span>}
                      {c.unreadCount > 0 && (
                        <span className="w-4 h-4 rounded-full text-[9px] flex items-center justify-center text-white" style={{ backgroundColor: "#3ecf8e" }}>{c.unreadCount}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex-1 rounded-lg border border-[#2e2e2e] flex flex-col" style={{ backgroundColor: "#1e1e1e" }}>
            {selected ? (
              <>
                <div className="px-4 py-3 border-b border-[#2e2e2e] flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: "#25D366" }}>
                    <span className="text-[12px] font-bold text-white">{selected.contact.firstName[0]?.toUpperCase() ?? "?"}</span>
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-[#ededed]">{selected.contact.firstName} {selected.contact.lastName ?? ""}</p>
                    <p className="text-[10px] text-[#888]">{selected.contact.phone}</p>
                  </div>
                </div>
                <div className="flex-1 p-4 space-y-2 overflow-auto">
                  {messages.map((m) => (
                    <div key={m.id} className={`flex ${m.direction === "OUTBOUND" ? "justify-end" : "justify-start"}`}>
                      <div
                        className="max-w-[70%] rounded-lg px-3 py-2 text-[13px]"
                        style={{ backgroundColor: m.direction === "OUTBOUND" ? "#25D366" : "#252525", color: m.direction === "OUTBOUND" ? "#000" : "#ccc" }}
                      >
                        {m.content}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-3 py-3 border-t border-[#2e2e2e]">
                  <div className="flex items-center gap-2 h-[36px] px-3 rounded-lg border border-[#333]" style={{ backgroundColor: "#252525" }}>
                    <input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newMessage.trim()) {
                          sendMutation.mutate({ contactId: selected.contact.id, message: newMessage.trim() });
                        }
                      }}
                      placeholder="Escribe un mensaje..."
                      className="flex-1 bg-transparent text-[13px] text-[#ededed] placeholder:text-[#555] outline-none"
                    />
                    <button
                      onClick={() => newMessage.trim() && sendMutation.mutate({ contactId: selected.contact.id, message: newMessage.trim() })}
                      disabled={sendMutation.isPending}
                      className="text-[#25D366]"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-[13px] text-[#555]">
                Selecciona una conversacion
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export function PlantillasWAPage() {
  return (
    <>
      <SectionHeader title="Plantillas WhatsApp" description="Plantillas aprobadas por Meta" />
      <div className="rounded-lg border border-[#2e2e2e] p-12 text-center" style={{ backgroundColor: "#1e1e1e" }}>
        <FileText size={32} className="text-[#555] mx-auto mb-3" />
        <p className="text-[14px] text-[#ededed] font-medium mb-1">Sin plantillas de WhatsApp configuradas</p>
        <p className="text-[12px] text-[#888]">Las plantillas aprobadas por Meta apareceran aqui.</p>
      </div>
    </>
  );
}

export function BroadcastsPage() {
  return (
    <>
      <SectionHeader
        title="Broadcasts"
        description="Enviar mensajes masivos por WhatsApp"
        action={<button className="flex items-center gap-1.5 text-[12px] text-black px-3 py-1.5 rounded font-medium" style={{ backgroundColor: "#25D366" }}><Plus size={14} />Nuevo broadcast</button>}
      />
      <div className="rounded-lg border border-[#2e2e2e] p-8 text-center" style={{ backgroundColor: "#1e1e1e" }}>
        <MessageCircle size={32} className="text-[#555] mx-auto mb-2" />
        <p className="text-[13px] text-[#888]">No hay broadcasts recientes</p>
        <p className="text-[11px] text-[#666] mt-1">Crea un broadcast para enviar mensajes masivos</p>
      </div>
    </>
  );
}

export function RespuestasIAPage() {
  return (
    <>
      <SectionHeader title="Respuestas IA" description="Respuestas automaticas inteligentes para WhatsApp" />
      <div className="rounded-lg border border-[#2e2e2e] p-4" style={{ backgroundColor: "#1e1e1e" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bot size={16} className="text-[#f59e0b]" />
            <span className="text-[13px] font-medium text-[#ededed]">Asistente IA</span>
          </div>
          <Badge text="Activo" color="#3ecf8e" />
        </div>
        <div className="space-y-2 text-[13px] text-[#888]">
          <p>El asistente IA responde automaticamente a preguntas frecuentes basandose en tu base de conocimiento.</p>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="rounded p-3" style={{ backgroundColor: "#252525" }}>
              <p className="text-[11px] text-[#888]">Mensajes respondidos hoy</p>
              <p className="text-[18px] font-semibold text-[#ededed]">23</p>
            </div>
            <div className="rounded p-3" style={{ backgroundColor: "#252525" }}>
              <p className="text-[11px] text-[#888]">Tasa de resolucion</p>
              <p className="text-[18px] font-semibold text-[#ededed]">78%</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function SecuenciasWAPage() {
  return (
    <>
      <SectionHeader title="Secuencias WhatsApp" description="Secuencias automatizadas de mensajes" />
      <div className="rounded-lg border border-[#2e2e2e] p-8 text-center" style={{ backgroundColor: "#1e1e1e" }}>
        <Workflow size={32} className="text-[#555] mx-auto mb-2" />
        <p className="text-[13px] text-[#888]">Crea secuencias de mensajes automatizados</p>
      </div>
    </>
  );
}

export function NumeroConectadoPage() {
  const { data: integrations, isLoading } = trpc.integrations.list.useQuery();
  const waIntegration = integrations?.find((i) => i.platform === "whatsapp" && i.status === "active");

  return (
    <>
      <SectionHeader title="Numero Conectado" description="Configuracion de tu numero de WhatsApp Business" />
      {isLoading ? (
        <div className="h-24 rounded-lg bg-[#1e1e1e] animate-pulse" />
      ) : waIntegration ? (
        <div className="rounded-lg border border-[#2e2e2e] p-4" style={{ backgroundColor: "#1e1e1e" }}>
          <div className="flex items-center gap-3 mb-4">
            <Phone size={20} className="text-[#25D366]" />
            <div>
              <p className="text-[14px] font-medium text-[#ededed]">{waIntegration.accountId ?? "Numero conectado"}</p>
              <p className="text-[11px] text-[#888]">WhatsApp Business API</p>
            </div>
            <Badge text="Conectado" color="#3ecf8e" />
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-[#2e2e2e] p-12 text-center" style={{ backgroundColor: "#1e1e1e" }}>
          <Phone size={32} className="text-[#555] mx-auto mb-3" />
          <p className="text-[14px] text-[#ededed] font-medium mb-1">Sin numero conectado</p>
          <p className="text-[12px] text-[#888]">Conecta tu numero de WhatsApp Business para comenzar.</p>
        </div>
      )}
    </>
  );
}

export function ReglasWAPage() {
  return (
    <>
      <SectionHeader title="Reglas" description="Reglas de enrutamiento y respuesta" />
      <div className="rounded-lg border border-[#2e2e2e] p-12 text-center" style={{ backgroundColor: "#1e1e1e" }}>
        <Settings size={32} className="text-[#555] mx-auto mb-3" />
        <p className="text-[14px] text-[#ededed] font-medium mb-1">Sin reglas de automatizacion configuradas</p>
        <p className="text-[12px] text-[#888]">Crea reglas para enrutar y responder mensajes automaticamente.</p>
      </div>
    </>
  );
}

// ============================
// SOCIAL MEDIA
// ============================

export function CalendarioSocialPage() {
  return (
    <>
      <SectionHeader title="Calendario Social" description="Planifica y programa publicaciones" />
      <div className="rounded-lg border border-[#2e2e2e] p-8 text-center" style={{ backgroundColor: "#1e1e1e", height: 400 }}>
        <Calendar size={32} className="text-[#555] mx-auto mb-2" />
        <p className="text-[13px] text-[#888]">Calendario de publicaciones</p>
        <p className="text-[11px] text-[#666] mt-1">Arrastra y programa publicaciones en el calendario</p>
      </div>
    </>
  );
}

export function CrearPublicacionPage() {
  return (
    <>
      <SectionHeader title="Crear Publicacion" description="Publica en multiples redes sociales" />
      <div className="max-w-2xl space-y-4">
        <div>
          <label className="text-[12px] text-[#888] block mb-1.5">Plataformas</label>
          <div className="flex gap-2">
            {["Facebook", "Instagram", "TikTok", "LinkedIn"].map((p) => (
              <button key={p} className="text-[12px] px-3 py-1.5 rounded border border-[#333] text-[#ccc] hover:border-[#3ecf8e]/40 transition-colors">{p}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[12px] text-[#888] block mb-1.5">Contenido</label>
          <textarea placeholder="Escribe tu publicacion..." className="w-full h-32 px-3 py-2 rounded-lg border border-[#333] text-[13px] text-[#ededed] placeholder:text-[#555] outline-none resize-none" style={{ backgroundColor: "#222" }} />
        </div>
        <button className="text-[12px] text-black px-4 py-2 rounded font-medium" style={{ backgroundColor: "#3ecf8e" }}>Publicar</button>
      </div>
    </>
  );
}

export function CanalSocialPage({ canal }: { canal: string }) {
  return (
    <>
      <SectionHeader title={canal} description={`Metricas y publicaciones de ${canal}`} />
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-lg border border-[#2e2e2e] p-4" style={{ backgroundColor: "#1e1e1e" }}>
          <p className="text-[11px] text-[#888] mb-1">Seguidores</p>
          <p className="text-[20px] font-semibold text-[#555]">—</p>
        </div>
        <div className="rounded-lg border border-[#2e2e2e] p-4" style={{ backgroundColor: "#1e1e1e" }}>
          <p className="text-[11px] text-[#888] mb-1">Engagement</p>
          <p className="text-[20px] font-semibold text-[#555]">—</p>
        </div>
        <div className="rounded-lg border border-[#2e2e2e] p-4" style={{ backgroundColor: "#1e1e1e" }}>
          <p className="text-[11px] text-[#888] mb-1">Posts este mes</p>
          <p className="text-[20px] font-semibold text-[#555]">—</p>
        </div>
      </div>
      <div className="rounded-lg border border-[#2e2e2e] p-8 text-center" style={{ backgroundColor: "#1e1e1e" }}>
        <Share2 size={32} className="text-[#555] mx-auto mb-2" />
        <p className="text-[13px] text-[#888]">Sin datos</p>
        <p className="text-[11px] text-[#666] mt-1">Conecta tu cuenta de {canal} para ver metricas reales</p>
      </div>
    </>
  );
}

export function BandejaSocialPage() {
  return (
    <>
      <SectionHeader title="Bandeja de Entrada" description="Mensajes directos de todas las plataformas" />
      <div className="rounded-lg border border-[#2e2e2e] p-8 text-center" style={{ backgroundColor: "#1e1e1e" }}>
        <MessageCircle size={32} className="text-[#555] mx-auto mb-2" />
        <p className="text-[13px] text-[#888]">Bandeja unificada de DMs</p>
        <p className="text-[11px] text-[#666] mt-1">Conecta tus redes sociales para ver mensajes</p>
      </div>
    </>
  );
}

export function MencionesSocialPage() {
  return (
    <>
      <SectionHeader title="Menciones" description="Monitoreo de menciones de tu marca" />
      <div className="rounded-lg border border-[#2e2e2e] p-8 text-center" style={{ backgroundColor: "#1e1e1e" }}>
        <Hash size={32} className="text-[#555] mx-auto mb-2" />
        <p className="text-[13px] text-[#888]">Monitor de menciones</p>
        <p className="text-[11px] text-[#666] mt-1">Configura alertas para cuando mencionen tu marca</p>
      </div>
    </>
  );
}

// ============================
// AUTOMATIONS
// ============================

export function TodosWorkflowsPage() {
  const { data: workflows, isLoading } = trpc.workflow.list.useQuery();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const toggleMutation = trpc.workflow.update.useMutation({
    onSuccess: () => { utils.workflow.list.invalidate(); },
  });
  const updateMutation = trpc.workflow.update.useMutation({
    onSuccess: () => { utils.workflow.list.invalidate(); setEditingId(null); },
  });
  const deleteMutation = trpc.workflow.delete.useMutation({
    onSuccess: () => { utils.workflow.list.invalidate(); setConfirmDeleteId(null); },
  });

  const editingWorkflow = workflows?.find((w) => w.id === editingId);

  return (
    <>
      {/* ── Full-screen editor overlay ── */}
      {editingWorkflow && (
        <WorkflowEditorModal
          workflow={editingWorkflow}
          onClose={() => setEditingId(null)}
          onSave={(data) => {
            updateMutation.mutate({
              workflowId: editingWorkflow.id,
              name: data.name,
              nodes: data.nodes as unknown as Record<string, unknown>[],
              edges: data.edges as unknown as Record<string, unknown>[],
              isActive: data.activate,
            });
          }}
          saving={updateMutation.isPending}
        />
      )}

      <SectionHeader
        title="Todos los Workflows"
        description={`${workflows?.length ?? 0} automatizaciones`}
        action={<button className="flex items-center gap-1.5 text-[12px] text-black px-3 py-1.5 rounded font-medium" style={{ backgroundColor: "#3ecf8e" }}><Plus size={14} />Crear workflow</button>}
      />
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-lg bg-[#1e1e1e] animate-pulse" />)}
        </div>
      ) : !workflows || workflows.length === 0 ? (
        <div className="rounded-lg border border-[#2e2e2e] p-12 text-center" style={{ backgroundColor: "#1e1e1e" }}>
          <Workflow size={32} className="text-[#555] mx-auto mb-3" />
          <p className="text-[14px] text-[#ededed] font-medium mb-1">Sin workflows</p>
          <p className="text-[12px] text-[#888]">Crea tu primera automatizacion.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {workflows.map((w) => (
            <div key={w.id} className="rounded-lg border border-[#2e2e2e] p-4 hover:border-[#3ecf8e]/30 transition-colors" style={{ backgroundColor: "#1e1e1e" }}>
              <div className="flex items-center justify-between">
                <div
                  className="flex items-center gap-3 flex-1 cursor-pointer"
                  onClick={() => setEditingId(w.id)}
                >
                  <Workflow size={16} className="text-[#6366f1]" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-medium text-[#ededed]">{w.name}</p>
                      <Badge text={w.isActive ? "Activo" : "Pausado"} color={w.isActive ? "#3ecf8e" : "#f59e0b"} />
                    </div>
                    <p className="text-[11px] text-[#888]">
                      {(w.nodes as unknown[])?.length ?? 0} nodos · Creado: {new Date(w.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleMutation.mutate({ workflowId: w.id, isActive: !w.isActive }); }}
                    disabled={toggleMutation.isPending}
                    className="text-[#888] hover:text-[#ededed] p-1"
                    title={w.isActive ? "Pausar" : "Activar"}
                  >
                    {w.isActive ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                  {confirmDeleteId === w.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => deleteMutation.mutate({ workflowId: w.id })}
                        disabled={deleteMutation.isPending}
                        className="text-[10px] px-2 py-1 rounded bg-red-600 text-white"
                      >
                        {deleteMutation.isPending ? "..." : "Eliminar"}
                      </button>
                      <button onClick={() => setConfirmDeleteId(null)} className="text-[10px] px-2 py-1 rounded border border-[#333] text-[#888]">
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(w.id); }}
                      className="text-[#555] hover:text-red-400 p-1"
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ================================================================== */
/*  Workflow Editor Modal (full-screen, for editing saved workflows)   */
/* ================================================================== */

function WorkflowEditorModal({
  workflow,
  onClose,
  onSave,
  saving,
}: {
  workflow: { id: string; name: string; nodes: unknown; edges: unknown; isActive: boolean };
  onClose: () => void;
  onSave: (data: { name: string; nodes: unknown[]; edges: unknown[]; activate: boolean }) => void;
  saving: boolean;
}) {
  const initNodes = (Array.isArray(workflow.nodes) ? workflow.nodes : []) as Node[];
  const initEdges = (Array.isArray(workflow.edges) ? workflow.edges : []).map((e: Record<string, unknown>) => ({
    ...e,
    style: { stroke: "#555", strokeWidth: 2 },
    labelStyle: { fill: "#888", fontSize: 10 },
  })) as Edge[];

  const [wfName, setWfName] = useState(workflow.name);
  const [nodes, setNodes, onNodesChange] = useNodesState(initNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initEdges);
  const [saved, setSaved] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge({ ...params, style: { stroke: "#555", strokeWidth: 2 } }, eds));
    setSaved(false);
  }, [setEdges]);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  const nodeColors: Record<string, string> = { trigger: "#3ecf8e", action: "#3b82f6", condition: "#f59e0b", delay: "#8b5cf6" };
  const nodeIcons: Record<string, string> = { trigger: "⚡", action: "▶", condition: "◆", delay: "⏱" };
  const nodeLabels: Record<string, string> = { trigger: "Inicio", action: "Accion", condition: "Condicion", delay: "Espera" };

  function addNode(type: string) {
    const lastNode = nodes[nodes.length - 1];
    const newId = String(Date.now());
    const newNode: Node = {
      id: newId,
      type,
      position: { x: lastNode ? lastNode.position.x : 250, y: lastNode ? lastNode.position.y + 140 : 140 },
      data: { label: nodeLabels[type] ?? type, description: "" },
    };
    setNodes((nds) => [...nds, newNode]);
    if (lastNode) {
      setEdges((eds) => [...eds, { id: `e-${lastNode.id}-${newId}`, source: lastNode.id, target: newId, style: { stroke: "#555", strokeWidth: 2 } }]);
    }
    setSaved(false);
  }

  function deleteNode(nodeId: string) {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
    setSaved(false);
  }

  function updateNodeData(nodeId: string, field: string, value: string) {
    setNodes((nds) => nds.map((n) =>
      n.id === nodeId ? { ...n, data: { ...n.data, [field]: value } } : n
    ));
    setSaved(false);
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col" style={{ backgroundColor: "#171717" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#2e2e2e] shrink-0" style={{ backgroundColor: "#1c1c1c" }}>
        <div className="flex items-center gap-3">
          <Workflow size={18} className="text-[#6366f1]" />
          <input
            value={wfName}
            onChange={(e) => { setWfName(e.target.value); setSaved(false); }}
            className="text-[14px] font-semibold text-[#ededed] bg-transparent outline-none border-b border-transparent focus:border-[#3ecf8e]/50 w-[300px]"
          />
          <Badge text={workflow.isActive ? "Activo" : "Pausado"} color={workflow.isActive ? "#3ecf8e" : "#f59e0b"} />
        </div>
        <div className="flex items-center gap-2">
          {saved ? (
            <span className="flex items-center gap-1.5 text-[12px] text-[#3ecf8e]">
              <CheckCircle size={14} /> Guardado
            </span>
          ) : (
            <button
              onClick={() => { onSave({ name: wfName, nodes: nodes.map((n) => ({ id: n.id, type: n.type, position: n.position, data: n.data })), edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle, label: typeof e.label === "string" ? e.label : undefined })), activate: workflow.isActive }); setSaved(true); }}
              disabled={saving}
              className="flex items-center gap-1.5 text-[12px] text-black px-4 py-2 rounded-lg font-medium disabled:opacity-50"
              style={{ backgroundColor: "#3ecf8e" }}
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          )}
          <button onClick={onClose} className="flex items-center gap-1.5 text-[12px] text-[#ccc] px-3 py-2 rounded-lg border border-[#333] hover:border-[#555] transition-colors">
            Cerrar
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: Node sidebar */}
        <aside className="w-[240px] border-r border-[#2e2e2e] overflow-y-auto flex flex-col" style={{ backgroundColor: "#1e1e1e" }}>
          {selectedNode ? (
            <div className="flex-1 px-4 py-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[#666]">Editar nodo</h3>
                <button onClick={() => setSelectedNodeId(null)} className="text-[10px] text-[#888] hover:text-[#ccc]">Volver</button>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[14px]">{nodeIcons[selectedNode.type as string] ?? "•"}</span>
                <span className="text-[10px] px-2 py-0.5 rounded font-medium" style={{ backgroundColor: (nodeColors[selectedNode.type as string] ?? "#888") + "20", color: nodeColors[selectedNode.type as string] ?? "#888" }}>
                  {nodeLabels[selectedNode.type as string] ?? selectedNode.type}
                </span>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-[#888] block mb-1">Nombre</label>
                  <input value={(selectedNode.data as Record<string, string>).label ?? ""} onChange={(e) => updateNodeData(selectedNode.id, "label", e.target.value)} className="w-full text-[12px] text-[#ededed] bg-[#252525] outline-none border border-[#333] focus:border-[#3ecf8e]/50 rounded-md px-2 py-1.5" />
                </div>
                <div>
                  <label className="text-[10px] text-[#888] block mb-1">Descripcion</label>
                  <textarea value={(selectedNode.data as Record<string, string>).description ?? ""} onChange={(e) => updateNodeData(selectedNode.id, "description", e.target.value)} placeholder="Describe que hace este paso..." className="w-full text-[11px] text-[#ccc] bg-[#252525] outline-none border border-[#333] focus:border-[#3ecf8e]/50 rounded-md px-2 py-1.5 h-20 resize-none" />
                </div>
                {selectedNode.type !== "trigger" && (
                  <button onClick={() => deleteNode(selectedNode.id)} className="flex items-center gap-1.5 text-[11px] text-red-400 hover:text-red-300 mt-2"><Trash2 size={12} /> Eliminar nodo</button>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-[#2e2e2e]">
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[#666]">{nodes.length} nodos</h3>
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
                {nodes.map((n, i) => (
                  <button key={n.id} onClick={() => setSelectedNodeId(n.id)} className="w-full text-left rounded-md p-2 border border-[#2e2e2e] hover:border-[#3ecf8e]/30 transition-colors" style={{ backgroundColor: "#252525" }}>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px]">{nodeIcons[n.type as string] ?? "•"}</span>
                      <span className="text-[11px] font-medium text-[#ededed] truncate">{(n.data as Record<string, string>).label}</span>
                      <span className="text-[9px] text-[#666] ml-auto">#{i + 1}</span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
          <div className="px-3 py-3 border-t border-[#2e2e2e]">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-[#666] mb-2">Agregar</p>
            <div className="grid grid-cols-3 gap-1">
              {(["action", "condition", "delay"] as const).map((type) => (
                <button key={type} onClick={() => addNode(type)} className="flex flex-col items-center gap-0.5 text-[9px] px-1 py-1.5 rounded border border-[#333] text-[#ccc] hover:border-[#3ecf8e]/40 transition-colors">
                  <span className="text-[12px]">{nodeIcons[type]}</span>{nodeLabels[type]}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* CENTER: Interactive Canvas */}
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={(changes) => { onNodesChange(changes); setSaved(false); }}
            onEdgesChange={(changes) => { onEdgesChange(changes); setSaved(false); }}
            onConnect={onConnect}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            onPaneClick={() => setSelectedNodeId(null)}
            nodeTypes={workflowNodeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            proOptions={{ hideAttribution: true }}
            colorMode="dark"
            snapToGrid
            snapGrid={[20, 20]}
          >
            <Background color="#333" gap={20} size={1} />
            <Controls className="!rounded-lg !border !border-[#2e2e2e]" />
          </ReactFlow>
        </div>

        {/* RIGHT: AI Chat for workflow editing */}
        <WorkflowAIChat
          nodes={nodes}
          edges={edges}
          workflowName={wfName}
          onApplyChanges={(newNodes, newEdges) => {
            setNodes(newNodes as Node[]);
            setEdges((newEdges as Edge[]).map((e) => ({ ...e, style: { stroke: "#555", strokeWidth: 2 } })));
            setSaved(false);
          }}
        />
      </div>
    </div>
  );
}

/* ================================================================== */
/*  AI Chat for Workflow Editing                                       */
/* ================================================================== */

function WorkflowAIChat({
  nodes,
  edges,
  workflowName,
  onApplyChanges,
}: {
  nodes: Node[];
  edges: Edge[];
  workflowName: string;
  onApplyChanges: (nodes: unknown[], edges: unknown[]) => void;
}) {
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([
    { role: "assistant", content: "Puedo ayudarte a modificar este workflow. Dime que quieres cambiar, agregar, o eliminar." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      // Build current workflow state as context
      const currentWorkflow = JSON.stringify({
        name: workflowName,
        nodes: nodes.map((n) => ({ id: n.id, type: n.type, position: n.position, data: n.data })),
        edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle, label: typeof e.label === "string" ? e.label : undefined })),
      });

      const resp = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `El usuario esta editando un workflow llamado "${workflowName}". Este es el estado actual del workflow:\n${currentWorkflow}\n\nEl usuario dice: "${userMsg}"\n\nModifica el workflow segun lo que pide. Usa la herramienta create_workflow_artifact con los nodos y edges actualizados. Mantiene los nodos existentes que no se modifican.`,
          section: "automations",
          plan: "PROFESIONAL",
          history: messages.slice(-6),
        }),
      });

      if (!resp.ok) {
        setMessages((prev) => [...prev, { role: "assistant", content: "Error al conectar con la IA." }]);
        setLoading(false);
        return;
      }

      // Parse SSE stream
      const reader = resp.body?.getReader();
      if (!reader) { setLoading(false); return; }

      const decoder = new TextDecoder();
      let buffer = "";
      let assistantText = "";
      let applied = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "token") {
              assistantText += event.content;
            } else if (event.type === "artifact" && event.artifactType === "workflow" && !applied) {
              onApplyChanges(event.payload.nodes, event.payload.edges);
              applied = true;
              assistantText += "\n\n✅ Workflow actualizado.";
            }
          } catch { /* skip */ }
        }
      }

      setMessages((prev) => [...prev, { role: "assistant", content: assistantText || (applied ? "✅ Workflow actualizado." : "No pude procesar la solicitud.") }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Error de conexion." }]);
    }
    setLoading(false);
  }

  return (
    <aside className="w-[300px] border-l border-[#2e2e2e] flex flex-col" style={{ backgroundColor: "#1c1c1c" }}>
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-[#2e2e2e] flex items-center gap-2">
        <Zap size={14} className="text-[#3ecf8e]" />
        <span className="text-[12px] font-semibold text-[#ededed]">AI Workflow Editor</span>
        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#3ecf8e]/15 text-[#3ecf8e] font-medium">BETA</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[90%] rounded-lg px-3 py-2 text-[12px] leading-relaxed ${
                m.role === "user" ? "text-black" : "text-[#ccc]"
              }`}
              style={{ backgroundColor: m.role === "user" ? "#3ecf8e" : "#252525" }}
            >
              {m.role === "user" ? m.content : <MarkdownContent content={m.content} />}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-lg px-3 py-2 text-[12px] text-[#888]" style={{ backgroundColor: "#252525" }}>
              <span className="inline-flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3ecf8e] animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#3ecf8e] animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#3ecf8e] animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Suggestions */}
      <div className="px-3 py-2 border-t border-[#2e2e2e] flex gap-1 flex-wrap">
        {["Agrega un delay de 1 dia", "Agrega condicion de email abierto", "Agrega accion de WhatsApp"].map((s) => (
          <button
            key={s}
            onClick={() => { setInput(s); }}
            className="text-[9px] px-2 py-1 rounded-full border border-[#333] text-[#888] hover:border-[#3ecf8e]/40 hover:text-[#3ecf8e] transition-colors"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="px-3 py-2.5 border-t border-[#2e2e2e]">
        <div className="flex items-center gap-2 h-[36px] px-3 rounded-lg border border-[#333]" style={{ backgroundColor: "#252525" }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Modifica el workflow..."
            disabled={loading}
            className="flex-1 bg-transparent text-[12px] text-[#ededed] placeholder:text-[#555] outline-none"
          />
          <button onClick={handleSend} disabled={loading || !input.trim()} className="text-[#3ecf8e] disabled:text-[#555]">
            <Send size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}

export function CrearWorkflowPage() {
  return (
    <>
      <SectionHeader title="Crear Workflow" description="Crea una nueva automatizacion" />
      <div className="grid grid-cols-3 gap-4">
        {[
          { name: "Desde cero", desc: "Crea un workflow personalizado", icon: <Plus size={24} /> },
          { name: "Lead Nurture", desc: "Seguimiento automatico de leads", icon: <Zap size={24} /> },
          { name: "Welcome Series", desc: "Serie de bienvenida para nuevos contactos", icon: <Mail size={24} /> },
        ].map((t) => (
          <button key={t.name} className="rounded-lg border border-[#2e2e2e] p-6 text-left hover:border-[#3ecf8e]/40 transition-colors" style={{ backgroundColor: "#1e1e1e" }}>
            <div className="text-[#888] mb-3">{t.icon}</div>
            <h3 className="text-[14px] font-medium text-[#ededed] mb-1">{t.name}</h3>
            <p className="text-[12px] text-[#888]">{t.desc}</p>
          </button>
        ))}
      </div>
    </>
  );
}

export function TriggersPage({ type }: { type: string }) {
  return (
    <>
      <SectionHeader title={type} description={`Configurar triggers de ${type.toLowerCase()}`} />
      <div className="rounded-lg border border-[#2e2e2e] p-4" style={{ backgroundColor: "#1e1e1e" }}>
        <p className="text-[13px] text-[#888]">Configura cuando se activan tus automatizaciones basandose en eventos de {type.toLowerCase()}.</p>
      </div>
    </>
  );
}

export function EjecucionesRecientesPage() {
  return (
    <>
      <SectionHeader title="Ejecuciones Recientes" description="Historial de automatizaciones ejecutadas" />
      <div className="rounded-lg border border-[#2e2e2e] p-12 text-center" style={{ backgroundColor: "#1e1e1e" }}>
        <RefreshCw size={32} className="text-[#555] mx-auto mb-3" />
        <p className="text-[14px] text-[#ededed] font-medium mb-1">Sin ejecuciones recientes</p>
        <p className="text-[12px] text-[#888]">Las ejecuciones de workflows apareceran aqui.</p>
      </div>
    </>
  );
}

export function ErroresAutomationPage() {
  return (
    <>
      <SectionHeader title="Errores" description="Errores recientes en automatizaciones" />
      <div className="space-y-2">
        <div className="rounded-lg border border-[#ef4444]/20 p-3 flex items-center gap-3" style={{ backgroundColor: "#1e1e1e" }}>
          <AlertTriangle size={14} className="text-[#ef4444]" />
          <div className="flex-1">
            <p className="text-[13px] text-[#ededed]">Lead HOT Follow-up falllo para Ana Jimenez</p>
            <p className="text-[11px] text-[#888]">Error: Email bounce — direccion invalida</p>
          </div>
          <span className="text-[11px] text-[#666]">Hace 4h</span>
        </div>
      </div>
    </>
  );
}

// ============================
// REPORTS
// ============================

export function ResumenEjecutivoPage() {
  const { data: summary, isLoading } = trpc.dashboard.getSummary.useQuery();

  const fmtCurrency = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${n}`;
  const conversionRate = summary && summary.totalContacts > 0
    ? ((summary.totalConversions / summary.totalContacts) * 100).toFixed(1)
    : "0.0";

  return (
    <>
      <SectionHeader title="Resumen Ejecutivo" description="Vista general del rendimiento del negocio" />
      {isLoading ? (
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-20 rounded-lg bg-[#1e1e1e] animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="rounded-lg border border-[#2e2e2e] p-4" style={{ backgroundColor: "#1e1e1e" }}>
            <p className="text-[11px] text-[#888] mb-1">Revenue</p>
            <p className="text-[20px] font-semibold text-[#ededed]">{fmtCurrency(summary?.totalRevenue ?? 0)}</p>
          </div>
          <div className="rounded-lg border border-[#2e2e2e] p-4" style={{ backgroundColor: "#1e1e1e" }}>
            <p className="text-[11px] text-[#888] mb-1">Leads</p>
            <p className="text-[20px] font-semibold text-[#ededed]">{summary?.totalContacts ?? 0}</p>
          </div>
          <div className="rounded-lg border border-[#2e2e2e] p-4" style={{ backgroundColor: "#1e1e1e" }}>
            <p className="text-[11px] text-[#888] mb-1">Conversion</p>
            <p className="text-[20px] font-semibold text-[#ededed]">{conversionRate}%</p>
          </div>
          <div className="rounded-lg border border-[#2e2e2e] p-4" style={{ backgroundColor: "#1e1e1e" }}>
            <p className="text-[11px] text-[#888] mb-1">ROAS</p>
            <p className="text-[20px] font-semibold text-[#ededed]">{summary?.overallRoas?.toFixed(1) ?? "0.0"}x</p>
          </div>
        </div>
      )}
      <div className="rounded-lg border border-[#2e2e2e] p-4" style={{ backgroundColor: "#1e1e1e", height: 300 }}>
        <BarChart3 size={32} className="text-[#555] mx-auto mb-2" />
        <p className="text-[13px] text-[#888] text-center">Grafico de tendencias del negocio</p>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  REPORT BUILDER DATA                                                */
/* ------------------------------------------------------------------ */

const rpMetricGroups: {
  group: string;
  color: string;
  items: { label: string; checked: boolean }[];
}[] = [
  {
    group: "MARKETING",
    color: "#3b82f6",
    items: [
      { label: "Leads", checked: true },
      { label: "CPL", checked: true },
      { label: "ROAS", checked: true },
      { label: "Impresiones", checked: true },
      { label: "Clics", checked: false },
      { label: "CTR", checked: false },
    ],
  },
  {
    group: "VENTAS",
    color: "#3ecf8e",
    items: [
      { label: "Deals", checked: true },
      { label: "Revenue", checked: true },
      { label: "Ticket Promedio", checked: false },
      { label: "Win Rate", checked: true },
      { label: "Ciclo de Venta", checked: false },
    ],
  },
  {
    group: "ENGAGEMENT",
    color: "#f59e0b",
    items: [
      { label: "Emails Enviados", checked: true },
      { label: "Open Rate", checked: true },
      { label: "Click Rate", checked: false },
      { label: "WhatsApp Msgs", checked: true },
    ],
  },
  {
    group: "FINANCIERO",
    color: "#ef4444",
    items: [
      { label: "Revenue", checked: true },
      { label: "Gasto", checked: true },
      { label: "ROI", checked: true },
      { label: "MRR", checked: false },
      { label: "Churn", checked: false },
    ],
  },
];

// rpSummaryCards, rpFunnelStages, rpChannelData, rpTreemapData, rpRevenueData
// are now derived from real data inside ReportePersonalizadoPage

const rpTreemapColors: Record<string, string> = {};

function RpCustomTreemapContent(props: {
  x: number;
  y: number;
  width: number;
  height: number;
  name?: string;
  size?: number;
  color?: string;
  index?: number;
}) {
  const { x, y, width, height, name, size } = props;
  if (!width || !height || width < 4 || height < 4) return null;
  const color = props.color || rpTreemapColors[name || ""] || "#3ecf8e";
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={6}
        fill={color}
        stroke="#2e2e2e"
        strokeWidth={2}
        style={{ opacity: 0.9 }}
      />
      {width > 50 && height > 40 && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - 8}
            textAnchor="middle"
            fill="#ededed"
            fontSize={12}
            fontWeight={600}
          >
            {name}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + 12}
            textAnchor="middle"
            fill="#a3a3a3"
            fontSize={11}
          >
            ${(size ?? 0).toLocaleString()}
          </text>
        </>
      )}
    </g>
  );
}

function RpSectionTitle({ title }: { title: string }) {
  return (
    <h2
      style={{
        fontSize: 15,
        fontWeight: 700,
        marginBottom: 14,
        color: "#ededed",
        borderLeft: "3px solid #3ecf8e",
        paddingLeft: 10,
      }}
    >
      {title}
    </h2>
  );
}

const rpCardStyle: React.CSSProperties = {
  backgroundColor: "#1c1c1c",
  border: "1px solid #2e2e2e",
  borderRadius: 10,
  padding: "16px 20px",
};

const rpBtnStyle: React.CSSProperties = {
  background: "#171717",
  border: "1px solid #2e2e2e",
  borderRadius: 6,
  padding: "6px 14px",
  color: "#ededed",
  fontSize: 13,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const rpBtnAccent: React.CSSProperties = {
  background: "linear-gradient(135deg, #3ecf8e 0%, #2ba86e 100%)",
  border: "none",
  borderRadius: 6,
  padding: "6px 14px",
  color: "#fff",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

export function ReportePersonalizadoPage() {
  const { data: summary, isLoading } = trpc.dashboard.getSummary.useQuery();
  const [metrics, setMetrics] = useState(rpMetricGroups);
  const [reportName] = useState("Reporte Ejecutivo - Febrero 2026");
  const [period] = useState("Febrero 2026");

  const fmtCurrency = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${n}`;

  const channelBreakdown = summary?.channelBreakdown ?? [];
  const dailyMetrics = summary?.dailyMetrics ?? [];

  const rpSummaryCards = [
    { label: "Revenue", value: fmtCurrency(summary?.totalRevenue ?? 0), change: "--", up: true },
    { label: "Leads", value: String(summary?.totalContacts ?? 0), change: "--", up: true },
    { label: "ROAS", value: `${summary?.overallRoas?.toFixed(1) ?? "0.0"}x`, change: "--", up: true },
    { label: "Win Rate", value: summary?.totalContacts ? `${((summary.totalConversions / summary.totalContacts) * 100).toFixed(1)}%` : "0.0%", change: "--", up: true },
  ];

  const totalLeads = summary?.totalContacts ?? 0;
  const totalDeals = summary?.totalDeals ?? 0;
  const rpFunnelStages = [
    { stage: "Leads", value: totalLeads, width: 100, color: "#22c55e" },
    { stage: "Deals", value: totalDeals, width: totalLeads > 0 ? Math.round((totalDeals / totalLeads) * 100) : 0, color: "#f97316" },
    { stage: "Conversiones", value: summary?.totalConversions ?? 0, width: totalLeads > 0 ? Math.round(((summary?.totalConversions ?? 0) / totalLeads) * 100) : 0, color: "#3ecf8e" },
  ];

  const rpChannelData = channelBreakdown.map((ch) => ({
    channel: ch.platform,
    spend: ch.spend,
    revenue: ch.revenue,
    roas: ch.roas,
  }));

  const channelColors = ["#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#22c55e", "#6b7280"];
  const rpTreemapData = channelBreakdown.map((ch, i) => ({
    name: ch.platform,
    size: ch.spend,
    color: channelColors[i % channelColors.length] as string,
  }));

  // Build dynamic treemap color map
  rpTreemapData.forEach((t) => { rpTreemapColors[t.name] = t.color; });

  const rpRevenueData = dailyMetrics.map((d: { date: string; revenue: number }) => ({
    month: new Date(d.date).toLocaleDateString("es", { month: "short", day: "numeric" }),
    revenue: d.revenue,
    predicted: null,
  }));

  const toggleMetric = (groupIdx: number, itemIdx: number) => {
    setMetrics((prev) => {
      const next = prev.map((g, gi) => ({
        ...g,
        items: g.items.map((m, mi) =>
          gi === groupIdx && mi === itemIdx ? { ...m, checked: !m.checked } : m
        ),
      }));
      return next;
    });
  };

  return (
    <>
      {/* ====== HEADER BAR ====== */}
      <div className="flex items-center gap-4 mb-4">
        <h1 className="text-base font-semibold tracking-tight whitespace-nowrap text-[#ededed]">
          Report Builder
        </h1>

        <div className="mx-2 h-5 w-px bg-[#2e2e2e]" />

        <input
          value={reportName}
          readOnly
          className="flex-1 rounded-md border border-[#2e2e2e] bg-[#232323] px-3 py-1.5 text-sm text-[#ededed] outline-none"
        />

        <div className="mx-2 h-5 w-px bg-[#2e2e2e]" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          <select
            value={period}
            className="rounded-md border border-[#2e2e2e] bg-[#232323] px-3 py-1.5 text-[13px] text-[#ededed] outline-none"
          >
            <option>Febrero 2026</option>
            <option>Enero 2026</option>
            <option>Diciembre 2025</option>
          </select>
          <button style={rpBtnStyle}>Exportar PDF</button>
          <button style={rpBtnStyle}>Enviar por Email</button>
          <button style={{ ...rpBtnAccent }}>Generar con IA</button>
        </div>
      </div>

      {/* ====== MAIN LAYOUT ====== */}
      <div className="flex overflow-hidden rounded-lg border border-[#2e2e2e]" style={{ height: "calc(100vh - 180px)" }}>
        {/* ---- LEFT SIDEBAR ---- */}
        <aside
          className="shrink-0 overflow-y-auto border-r border-[#2e2e2e] bg-[#1c1c1c] p-3"
          style={{ width: 200 }}
        >
          <h2
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 1,
              color: "#a3a3a3",
              marginBottom: 16,
            }}
          >
            Metricas Disponibles
          </h2>

          {metrics.map((g, gi) => (
            <div key={g.group} style={{ marginBottom: 18 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                  color: g.color,
                  marginBottom: 8,
                }}
              >
                {g.group}
              </div>
              {g.items.map((m, mi) => (
                <label
                  key={m.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "4px 0",
                    cursor: "pointer",
                    fontSize: 13,
                    color: m.checked ? "#ededed" : "#6b6b6b",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={m.checked}
                    onChange={() => toggleMetric(gi, mi)}
                    style={{ accentColor: g.color }}
                  />
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      backgroundColor: m.checked ? g.color : "#3a3a3a",
                      flexShrink: 0,
                    }}
                  />
                  {m.label}
                </label>
              ))}
            </div>
          ))}
        </aside>

        {/* ---- MAIN CONTENT ---- */}
        <main className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="space-y-6">
              {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-lg bg-[#1e1e1e] animate-pulse" />)}
            </div>
          ) : (
          <>
          {/* Section 1 — Resumen Ejecutivo */}
          <RpSectionTitle title="Resumen Ejecutivo" />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 16,
              marginBottom: 32,
            }}
          >
            {rpSummaryCards.map((c) => (
              <div key={c.label} style={rpCardStyle}>
                <div style={{ fontSize: 12, color: "#a3a3a3", marginBottom: 4 }}>
                  {c.label}
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>
                  {c.value}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: c.up ? "#3ecf8e" : "#ef4444",
                  }}
                >
                  {c.change}
                </div>
              </div>
            ))}
          </div>

          {/* Section 2 — Embudo de Conversion */}
          <RpSectionTitle title="Embudo de Conversion" />
          <div style={{ ...rpCardStyle, padding: 24, marginBottom: 32 }}>
            {rpFunnelStages.map((s, i) => {
              const convPct =
                i < rpFunnelStages.length - 1
                  ? ((rpFunnelStages[i + 1]!.value / s.value) * 100).toFixed(1)
                  : null;
              return (
                <div
                  key={s.stage}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: i < rpFunnelStages.length - 1 ? 6 : 0,
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 100,
                      fontSize: 12,
                      color: "#a3a3a3",
                      textAlign: "right",
                      flexShrink: 0,
                    }}
                  >
                    {s.stage}
                  </div>
                  <div style={{ flex: 1, position: "relative" }}>
                    <div
                      style={{
                        width: `${s.width}%`,
                        height: 32,
                        backgroundColor: s.color,
                        borderRadius: 4,
                        display: "flex",
                        alignItems: "center",
                        paddingLeft: 10,
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#fff",
                        transition: "width 0.4s ease",
                        margin: "0 auto 0 0",
                      }}
                    >
                      {s.value.toLocaleString()}
                    </div>
                  </div>
                  <div
                    style={{
                      width: 60,
                      fontSize: 11,
                      color: "#6b6b6b",
                      textAlign: "left",
                      flexShrink: 0,
                    }}
                  >
                    {convPct ? `${convPct}% ↓` : ""}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Section 3 — Performance por Canal */}
          <RpSectionTitle title="Performance por Canal" />
          <div style={{ ...rpCardStyle, padding: 24, marginBottom: 32 }}>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={rpChannelData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2e2e2e" />
                <XAxis dataKey="channel" tick={{ fill: "#a3a3a3", fontSize: 12 }} />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: "#a3a3a3", fontSize: 12 }}
                  tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: "#a3a3a3", fontSize: 12 }}
                  tickFormatter={(v: number) => `${v}x`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1c1c1c",
                    border: "1px solid #2e2e2e",
                    borderRadius: 8,
                    color: "#ededed",
                    fontSize: 12,
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, color: "#a3a3a3" }}
                />
                <Bar
                  yAxisId="left"
                  dataKey="spend"
                  name="Gasto"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                  barSize={28}
                />
                <Bar
                  yAxisId="left"
                  dataKey="revenue"
                  name="Revenue"
                  fill="#3ecf8e"
                  radius={[4, 4, 0, 0]}
                  barSize={28}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="roas"
                  name="ROAS"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ fill: "#f59e0b", r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Section 4 — Treemap — Distribucion de Gasto */}
          <RpSectionTitle title="Treemap — Distribucion de Gasto" />
          <div style={{ ...rpCardStyle, padding: 24, marginBottom: 32 }}>
            <ResponsiveContainer width="100%" height={280}>
              <Treemap
                data={rpTreemapData}
                dataKey="size"
                nameKey="name"
                content={<RpCustomTreemapContent x={0} y={0} width={0} height={0} />}
              />
            </ResponsiveContainer>
          </div>

          {/* Section 5 — Tendencia de Revenue */}
          <RpSectionTitle title="Tendencia de Revenue" />
          <div style={{ ...rpCardStyle, padding: 24, marginBottom: 32 }}>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={rpRevenueData}>
                <defs>
                  <linearGradient id="rpRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3ecf8e" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3ecf8e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="rpPredGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2e2e2e" />
                <XAxis dataKey="month" tick={{ fill: "#a3a3a3", fontSize: 12 }} />
                <YAxis
                  tick={{ fill: "#a3a3a3", fontSize: 12 }}
                  tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1c1c1c",
                    border: "1px solid #2e2e2e",
                    borderRadius: 8,
                    color: "#ededed",
                    fontSize: 12,
                  }}
                  formatter={(value) =>
                    value ? `$${Number(value).toLocaleString()}` : "—"
                  }
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3ecf8e"
                  strokeWidth={2}
                  fill="url(#rpRevGrad)"
                  connectNulls={false}
                  dot={{ fill: "#3ecf8e", r: 4 }}
                />
                <Area
                  type="monotone"
                  dataKey="predicted"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  fill="url(#rpPredGrad)"
                  connectNulls={false}
                  dot={{ fill: "#3b82f6", r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: 8,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: "#3b82f6",
                  backgroundColor: "#3b82f620",
                  padding: "3px 10px",
                  borderRadius: 4,
                  fontWeight: 600,
                }}
              >
                IA Prediccion
              </span>
            </div>
          </div>

          {/* AI BANNER */}
          <div
            style={{
              background: "linear-gradient(135deg, #1c1c1c 0%, #1a2a1f 100%)",
              border: "1px solid #3ecf8e40",
              borderRadius: 10,
              padding: "16px 20px",
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              marginBottom: 32,
            }}
          >
            <span style={{ fontSize: 22, flexShrink: 0 }}>🤖</span>
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#3ecf8e",
                  marginBottom: 6,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Reporte generado
              </div>
              <p style={{ fontSize: 13, color: "#c5c5c5", margin: 0, lineHeight: 1.6 }}>
                Hallazgos clave: <strong style={{ color: "#ededed" }}>Meta Ads</strong>{" "}
                tiene el mejor ROI (5.2x). El embudo pierde{" "}
                <strong style={{ color: "#ef4444" }}>86%</strong> entre Impresiones y
                Clics — optimizar creativos. Revenue trending{" "}
                <strong style={{ color: "#3ecf8e" }}>+12% MoM</strong>, proyectado{" "}
                <strong style={{ color: "#ededed" }}>$51K</strong> para marzo.
              </p>
            </div>
          </div>
          </>
          )}
        </main>
      </div>
    </>
  );
}

export function ReportesProgramadosPage({ frequency }: { frequency: string }) {
  return (
    <>
      <SectionHeader title={`Reportes ${frequency}`} description={`Reportes automaticos ${frequency.toLowerCase()}`} />
      <div className="rounded-lg border border-[#2e2e2e] p-4" style={{ backgroundColor: "#1e1e1e" }}>
        <div className="flex items-center gap-2 mb-3">
          <Clock size={14} className="text-[#6366f1]" />
          <span className="text-[13px] font-medium text-[#ededed]">Programacion actual</span>
        </div>
        <p className="text-[13px] text-[#888]">Los reportes {frequency.toLowerCase()} se envian automaticamente a tu email cada {frequency === "Diarios" ? "dia a las 8am" : frequency === "Semanales" ? "lunes a las 9am" : "1ro del mes a las 9am"}.</p>
      </div>
    </>
  );
}

export function ExportarPage({ type }: { type: string }) {
  return (
    <>
      <SectionHeader title={type} description={type === "Descargar PDF" ? "Exportar reportes como PDF" : "Enviar reportes por email"} />
      <div className="rounded-lg border border-[#2e2e2e] p-8 text-center" style={{ backgroundColor: "#1e1e1e" }}>
        {type === "Descargar PDF" ? <Download size={32} className="text-[#555] mx-auto mb-2" /> : <Mail size={32} className="text-[#555] mx-auto mb-2" />}
        <p className="text-[13px] text-[#888]">{type}</p>
        <button className="mt-4 text-[12px] text-black px-4 py-2 rounded font-medium" style={{ backgroundColor: "#3ecf8e" }}>
          {type === "Descargar PDF" ? "Generar PDF" : "Configurar envio"}
        </button>
      </div>
    </>
  );
}

// ============================
// INTEGRATIONS
// ============================

export function IntegrationPage({ platform }: { platform: string; connected?: boolean }) {
  const { data: integrations, isLoading } = trpc.integrations.list.useQuery();
  const utils = trpc.useUtils();
  const platformToDb: Record<string, string> = {
    "meta ads": "meta_ads",
    "google ads": "google_ads",
    "google analytics 4": "ga4",
    stripe: "stripe",
    shopify: "shopify",
    tiktok: "tiktok",
    linkedin: "linkedin",
    "whatsapp business": "whatsapp",
    mercadolibre: "mercadolibre",
  };
  const dbPlatform = platformToDb[platform.toLowerCase()];
  const integration = integrations?.find((i) => dbPlatform ? i.platform === dbPlatform : i.platform.toLowerCase().includes(platform.toLowerCase()));

  const disconnectMutation = trpc.integrations.disconnect.useMutation({
    onSuccess: () => { utils.integrations.list.invalidate(); },
  });

  const syncMutation = trpc.integrations.syncNow.useMutation({
    onSuccess: () => { utils.integrations.list.invalidate(); },
  });

  const startOAuthMutation = trpc.integrations.startOAuth.useMutation({
    onSuccess: (data) => { window.location.href = data.authUrl; },
  });

  const providerMap: Record<string, "meta_ads" | "google_ads" | "ga4" | "tiktok" | "shopify"> = {
    "google analytics": "ga4",
    meta: "meta_ads",
    facebook: "meta_ads",
    "google ads": "google_ads",
    google: "google_ads",
    ga4: "ga4",
    tiktok: "tiktok",
    shopify: "shopify",
  };

  const handleConnect = () => {
    const key = Object.keys(providerMap).find((k) => platform.toLowerCase().includes(k));
    if (key) {
      startOAuthMutation.mutate({ provider: providerMap[key]! });
    }
  };

  if (isLoading) {
    return (
      <>
        <SectionHeader title={platform} description={`Cargando ${platform}...`} />
        <div className="h-40 rounded-lg border border-[#2e2e2e] animate-pulse" style={{ backgroundColor: "#1e1e1e" }} />
      </>
    );
  }

  return (
    <>
      <SectionHeader title={platform} description={integration ? `${platform} conectado a tu cuenta` : `Conectar ${platform}`} />
      <div className="rounded-lg border border-[#2e2e2e] p-4" style={{ backgroundColor: "#1e1e1e" }}>
        {integration ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-[#3ecf8e]" />
                <span className="text-[13px] text-[#ededed]">Conectada</span>
                <Badge text="Conectada" color="#3ecf8e" />
              </div>
              <button
                onClick={() => disconnectMutation.mutate({ integrationId: integration.id })}
                disabled={disconnectMutation.isPending}
                className="text-[11px] px-3 py-1 rounded border border-[#333] text-[#888] hover:text-red-400 hover:border-red-400/40 transition-colors disabled:opacity-50"
              >
                {disconnectMutation.isPending ? "Desconectando..." : "Desconectar"}
              </button>
            </div>
            <div className="flex items-center justify-between py-2 px-3 rounded" style={{ backgroundColor: "#252525" }}>
              <span className="text-[12px] text-[#888]">Ultima sincronizacion</span>
              <span className="text-[12px] text-[#ededed]">
                {integration.lastSyncAt ? new Date(integration.lastSyncAt).toLocaleString() : "Nunca"}
              </span>
            </div>
            {integration.accountId && (
              <div className="flex items-center justify-between py-2 px-3 rounded" style={{ backgroundColor: "#252525" }}>
                <span className="text-[12px] text-[#888]">Account ID</span>
                <span className="text-[12px] text-[#ededed]">{integration.accountId}</span>
              </div>
            )}
            <button
              onClick={() => syncMutation.mutate({ integrationId: integration.id })}
              disabled={syncMutation.isPending}
              className="flex items-center gap-1.5 text-[12px] text-[#ccc] px-3 py-1.5 rounded border border-[#333] disabled:opacity-50"
            >
              <RefreshCw size={12} className={syncMutation.isPending ? "animate-spin" : ""} />
              {syncMutation.isPending ? "Sincronizando..." : "Sincronizar ahora"}
            </button>
          </div>
        ) : (
          <div className="text-center py-8">
            <Plug size={32} className="text-[#555] mx-auto mb-3" />
            <p className="text-[13px] text-[#888] mb-1">No conectada</p>
            <Badge text="No conectada" color="#888" />
            <p className="text-[13px] text-[#888] mb-4 mt-3">Conecta {platform} para importar datos automaticamente</p>
            <button
              onClick={handleConnect}
              disabled={startOAuthMutation.isPending}
              className="text-[12px] text-black px-4 py-2 rounded font-medium disabled:opacity-50"
              style={{ backgroundColor: "#3ecf8e" }}
            >
              {startOAuthMutation.isPending ? "Redirigiendo..." : `Conectar ${platform}`}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export function OAuthTokensPage() {
  const { data: integrations, isLoading } = trpc.integrations.list.useQuery();

  const statusColors: Record<string, string> = { active: "#3ecf8e", error: "#ef4444", expired: "#f59e0b" };
  const statusLabels: Record<string, string> = { active: "Activo", error: "Error", expired: "Expirado" };

  return (
    <>
      <SectionHeader title="OAuth Tokens" description="Gestion de tokens de autenticacion" />
      <div className="rounded-lg border border-[#2e2e2e] p-4" style={{ backgroundColor: "#1e1e1e" }}>
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck size={14} className="text-[#3ecf8e]" />
          <span className="text-[13px] font-medium text-[#ededed]">Tokens activos</span>
        </div>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-10 rounded animate-pulse" style={{ backgroundColor: "#252525" }} />
            ))}
          </div>
        ) : !integrations || integrations.length === 0 ? (
          <p className="text-[13px] text-[#888] text-center py-4">No hay integraciones conectadas</p>
        ) : (
          <div className="space-y-2">
            {integrations.map((integration) => (
              <div key={integration.id} className="flex items-center justify-between py-2 px-3 rounded" style={{ backgroundColor: "#252525" }}>
                <div>
                  <span className="text-[12px] text-[#ccc]">{integration.platform}</span>
                  {integration.accountId && (
                    <span className="text-[11px] text-[#888] ml-2">({integration.accountId})</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge text={statusLabels[integration.status] ?? integration.status} color={statusColors[integration.status] ?? "#888"} />
                  <span className="text-[11px] text-[#888]">
                    {integration.lastSyncAt ? `Sync: ${new Date(integration.lastSyncAt).toLocaleString()}` : "Sin sync"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export function SyncStatusPage() {
  const { data: integrations, isLoading } = trpc.integrations.list.useQuery();

  const statusColors: Record<string, string> = { active: "#3ecf8e", error: "#ef4444", expired: "#f59e0b" };
  const statusLabels: Record<string, string> = { active: "Activo", error: "Error", expired: "Expirado" };

  return (
    <>
      <SectionHeader title="Sync Status" description="Estado de sincronizacion de datos" />
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-lg border border-[#2e2e2e] animate-pulse" style={{ backgroundColor: "#1e1e1e" }} />
          ))}
        </div>
      ) : !integrations || integrations.length === 0 ? (
        <div className="rounded-lg border border-[#2e2e2e] p-8 text-center" style={{ backgroundColor: "#1e1e1e" }}>
          <RefreshCw size={32} className="text-[#555] mx-auto mb-2" />
          <p className="text-[13px] text-[#888]">No hay integraciones conectadas para sincronizar</p>
        </div>
      ) : (
        <div className="space-y-2">
          {integrations.map((integration) => (
            <div key={integration.id} className="rounded-lg border border-[#2e2e2e] p-3 flex items-center justify-between" style={{ backgroundColor: "#1e1e1e" }}>
              <div>
                <p className="text-[13px] font-medium text-[#ededed]">{integration.platform}</p>
                <p className="text-[11px] text-[#888]">
                  Ultima sync: {integration.lastSyncAt ? new Date(integration.lastSyncAt).toLocaleString() : "Nunca"}
                </p>
              </div>
              <Badge
                text={statusLabels[integration.status] ?? integration.status}
                color={statusColors[integration.status] ?? "#888"}
              />
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ============================
// SETTINGS
// ============================

export function PerfilPage() {
  const { data: session, isLoading } = trpc.auth.getSession.useQuery();
  const user = session?.user;
  const tenant = session?.tenant;

  return (
    <>
      <SectionHeader title="Perfil" description="Tu perfil de usuario" />
      {isLoading ? (
        <div className="max-w-lg space-y-4">
          <div className="h-16 rounded-lg bg-[#1e1e1e] animate-pulse" />
          <div className="h-10 rounded-lg bg-[#1e1e1e] animate-pulse" />
          <div className="h-10 rounded-lg bg-[#1e1e1e] animate-pulse" />
        </div>
      ) : (
        <div className="max-w-lg space-y-4">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-[20px] font-bold text-[#ededed]" style={{ backgroundColor: "#2a2a2a" }}>
              {(user?.name ?? user?.email)?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div>
              <p className="text-[14px] font-medium text-[#ededed]">{user?.name ?? "Sin nombre"}</p>
              <p className="text-[12px] text-[#888]">{user?.email ?? ""}</p>
              {user?.isSuperAdmin && <Badge text="Super Admin" color="#f59e0b" />}
            </div>
          </div>
          <div>
            <label className="text-[12px] text-[#888] block mb-1.5">Nombre</label>
            <input defaultValue={user?.name ?? ""} readOnly className="w-full h-[38px] px-3 rounded-lg border border-[#333] text-[13px] text-[#ededed] outline-none" style={{ backgroundColor: "#222" }} />
          </div>
          <div>
            <label className="text-[12px] text-[#888] block mb-1.5">Email</label>
            <input defaultValue={user?.email ?? ""} readOnly className="w-full h-[38px] px-3 rounded-lg border border-[#333] text-[13px] text-[#888] outline-none" style={{ backgroundColor: "#222" }} />
          </div>
          {tenant && (
            <div className="rounded-lg border border-[#2e2e2e] p-4 mt-4" style={{ backgroundColor: "#1e1e1e" }}>
              <p className="text-[11px] text-[#888] mb-1">Organizacion</p>
              <p className="text-[13px] font-medium text-[#ededed]">{tenant.name}</p>
              <p className="text-[11px] text-[#888] mt-1">Plan: <Badge text={tenant.plan} color="#3ecf8e" /></p>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export function EquipoPage() {
  const { data: members, isLoading } = trpc.team.listMembers.useQuery();

  const roleColors: Record<string, string> = { Admin: "#f59e0b", Manager: "#6366f1", Editor: "#3ecf8e", Viewer: "#888" };

  return (
    <>
      <SectionHeader
        title="Equipo"
        description="Miembros de tu organizacion"
        action={<button className="flex items-center gap-1.5 text-[12px] text-black px-3 py-1.5 rounded font-medium" style={{ backgroundColor: "#3ecf8e" }}><Plus size={14} />Invitar</button>}
      />
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 rounded-lg border border-[#2e2e2e] animate-pulse" style={{ backgroundColor: "#1e1e1e" }} />
          ))}
        </div>
      ) : !members || members.length === 0 ? (
        <div className="rounded-lg border border-[#2e2e2e] p-8 text-center" style={{ backgroundColor: "#1e1e1e" }}>
          <Users size={32} className="text-[#555] mx-auto mb-2" />
          <p className="text-[13px] text-[#888]">No hay miembros en tu equipo</p>
        </div>
      ) : (
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.id} className="rounded-lg border border-[#2e2e2e] p-4 flex items-center justify-between" style={{ backgroundColor: "#1e1e1e" }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold text-[#ededed]" style={{ backgroundColor: "#2a2a2a" }}>
                  {(m.name ?? m.email)?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div>
                  <p className="text-[13px] font-medium text-[#ededed]">{m.name ?? "Sin nombre"}</p>
                  <p className="text-[11px] text-[#888]">{m.email}</p>
                  <p className="text-[10px] text-[#666]">Desde {new Date(m.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <Badge text={m.role} color={roleColors[m.role] ?? "#888"} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export function RolesPermisosPage() {
  const { data: roles, isLoading } = trpc.team.listRoles.useQuery();

  return (
    <>
      <SectionHeader title="Roles y Permisos" description="Configura roles y permisos del equipo" />
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 rounded-lg bg-[#1e1e1e] animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {(roles ?? []).map((role) => {
            const perms = role.permissions as Record<string, boolean> | null;
            const permCount = perms ? Object.values(perms).filter(Boolean).length : 0;
            return (
              <div key={role.id} className="rounded-lg border border-[#2e2e2e] p-4 flex items-center justify-between" style={{ backgroundColor: "#1e1e1e" }}>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-medium text-[#ededed]">{role.name}</p>
                    {role.isSystem && <Badge text="Sistema" color="#6366f1" />}
                  </div>
                  <p className="text-[11px] text-[#888]">{permCount} permisos activos</p>
                </div>
                {!role.isSystem && (
                  <button className="text-[11px] px-3 py-1 rounded border border-[#333] text-[#888]">Editar</button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

const PLAN_DISPLAY = [
  { key: "INICIO" as const, name: "Inicio", price: "$79", contacts: "500", emails: "5,000", ai: "Haiku", media: false, workflows: false },
  { key: "CRECIMIENTO" as const, name: "Crecimiento", price: "$199", contacts: "5,000", emails: "25,000", ai: "Sonnet", media: false, workflows: true, popular: true },
  { key: "PROFESIONAL" as const, name: "Profesional", price: "$399", contacts: "25,000", emails: "100,000", ai: "Opus", media: true, workflows: true },
  { key: "AGENCIA" as const, name: "Agencia", price: "$799", contacts: "Ilimitados", emails: "Ilimitados", ai: "Opus", media: true, workflows: true },
];

export function PlanActualPage() {
  const { data: subscription, isLoading: subLoading } = trpc.billing.getSubscription.useQuery();
  const { data: usage, isLoading: usageLoading } = trpc.billing.getUsage.useQuery();
  const checkoutMutation = trpc.billing.createCheckout.useMutation({
    onSuccess: (data) => { window.location.href = data.url; },
  });
  const portalMutation = trpc.billing.createPortalSession.useMutation({
    onSuccess: (data) => { window.location.href = data.url; },
  });

  const isLoading = subLoading || usageLoading;

  const statusColors: Record<string, string> = { active: "#3ecf8e", trialing: "#6366f1", no_subscription: "#888", error: "#ef4444", canceled: "#ef4444" };
  const statusLabels: Record<string, string> = { active: "Activo", trialing: "Prueba", no_subscription: "Sin suscripcion", error: "Error", canceled: "Cancelado" };

  const currentPlan = subscription?.plan ?? "INICIO";

  return (
    <>
      <SectionHeader title="Plan Actual" description="Tu suscripcion y planes disponibles" />

      {isLoading ? (
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-64 rounded-lg bg-[#1e1e1e] animate-pulse" />)}
        </div>
      ) : (
        <>
          {/* Current usage */}
          {usage && (
            <div className="grid grid-cols-4 gap-3 mb-6">
              <div className="rounded-lg border border-[#2e2e2e] p-3" style={{ backgroundColor: "#1e1e1e" }}>
                <p className="text-[11px] text-[#888]">Contactos</p>
                <p className="text-[14px] font-semibold text-[#ededed]">{usage.contacts.used.toLocaleString()}<span className="text-[#888] font-normal">/{usage.contacts.limit === -1 ? "∞" : usage.contacts.limit.toLocaleString()}</span></p>
              </div>
              <div className="rounded-lg border border-[#2e2e2e] p-3" style={{ backgroundColor: "#1e1e1e" }}>
                <p className="text-[11px] text-[#888]">Emails/mes</p>
                <p className="text-[14px] font-semibold text-[#ededed]">{usage.emails.used.toLocaleString()}<span className="text-[#888] font-normal">/{usage.emails.limit === -1 ? "∞" : usage.emails.limit.toLocaleString()}</span></p>
              </div>
              <div className="rounded-lg border border-[#2e2e2e] p-3" style={{ backgroundColor: "#1e1e1e" }}>
                <p className="text-[11px] text-[#888]">AI Tier</p>
                <p className="text-[14px] font-semibold text-[#ededed] capitalize">{usage.features.aiTier}</p>
              </div>
              <div className="rounded-lg border border-[#2e2e2e] p-3" style={{ backgroundColor: "#1e1e1e" }}>
                <p className="text-[11px] text-[#888]">Estado</p>
                <Badge text={statusLabels[subscription?.status ?? "no_subscription"] ?? "Sin plan"} color={statusColors[subscription?.status ?? "no_subscription"] ?? "#888"} />
              </div>
            </div>
          )}

          {/* Plan grid */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {PLAN_DISPLAY.map((plan) => {
              const isCurrent = currentPlan === plan.key;
              return (
                <div
                  key={plan.key}
                  className={`rounded-lg border p-5 flex flex-col ${plan.popular ? "border-[#3ecf8e]/50" : "border-[#2e2e2e]"}`}
                  style={{ backgroundColor: isCurrent ? "#1e2a22" : "#1e1e1e" }}
                >
                  {plan.popular && (
                    <Badge text="Popular" color="#3ecf8e" />
                  )}
                  <h3 className="text-[16px] font-semibold text-[#ededed] mt-1">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mt-2 mb-4">
                    <span className="text-[28px] font-bold text-[#ededed]">{plan.price}</span>
                    <span className="text-[12px] text-[#888]">/mes</span>
                  </div>
                  <div className="space-y-2 text-[12px] flex-1">
                    <div className="flex items-center gap-2 text-[#ccc]">
                      <CheckCircle size={12} className="text-[#3ecf8e] flex-shrink-0" /> {plan.contacts} contactos
                    </div>
                    <div className="flex items-center gap-2 text-[#ccc]">
                      <CheckCircle size={12} className="text-[#3ecf8e] flex-shrink-0" /> {plan.emails} emails/mes
                    </div>
                    <div className="flex items-center gap-2 text-[#ccc]">
                      <CheckCircle size={12} className="text-[#3ecf8e] flex-shrink-0" /> AI {plan.ai}
                    </div>
                    <div className={`flex items-center gap-2 ${plan.workflows ? "text-[#ccc]" : "text-[#555]"}`}>
                      <CheckCircle size={12} className={plan.workflows ? "text-[#3ecf8e]" : "text-[#555]"} /> Workflows
                    </div>
                    <div className={`flex items-center gap-2 ${plan.media ? "text-[#ccc]" : "text-[#555]"}`}>
                      <CheckCircle size={12} className={plan.media ? "text-[#3ecf8e]" : "text-[#555]"} /> Media generation
                    </div>
                  </div>
                  {isCurrent ? (
                    <button
                      onClick={() => portalMutation.mutate()}
                      disabled={portalMutation.isPending}
                      className="mt-4 text-[12px] py-2 rounded-lg border border-[#3ecf8e]/40 text-[#3ecf8e] w-full"
                    >
                      Plan actual — Gestionar
                    </button>
                  ) : (
                    <button
                      onClick={() => checkoutMutation.mutate({ plan: plan.key })}
                      disabled={checkoutMutation.isPending}
                      className="mt-4 text-[12px] py-2 rounded-lg font-medium w-full disabled:opacity-50 text-black"
                      style={{ backgroundColor: plan.popular ? "#3ecf8e" : "#ededed" }}
                    >
                      {checkoutMutation.isPending ? "..." : isCurrent ? "Actual" : "Seleccionar"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {subscription?.currentPeriodEnd && (
            <p className="text-[12px] text-[#888]">
              Proximo cobro: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
            </p>
          )}
        </>
      )}
    </>
  );
}

export function MetodoPagoPage() {
  const { data: subscription } = trpc.billing.getSubscription.useQuery();
  const portalMutation = trpc.billing.createPortalSession.useMutation({
    onSuccess: (data) => { window.location.href = data.url; },
  });

  return (
    <>
      <SectionHeader title="Metodo de Pago" description="Gestiona tu metodo de pago a traves de Stripe" />
      <div className="rounded-lg border border-[#2e2e2e] p-4" style={{ backgroundColor: "#1e1e1e" }}>
        <div className="flex items-center gap-3 mb-4">
          <CreditCard size={20} className="text-[#6366f1]" />
          <div>
            <p className="text-[13px] font-medium text-[#ededed]">
              {subscription?.status === "active" ? "Suscripcion activa" : "Sin metodo de pago"}
            </p>
            <p className="text-[11px] text-[#888]">
              {subscription?.plan ? `Plan ${subscription.plan}` : "Configura tu metodo de pago en Stripe"}
            </p>
          </div>
        </div>
        <button
          onClick={() => portalMutation.mutate()}
          disabled={portalMutation.isPending}
          className="text-[12px] text-black px-4 py-2 rounded font-medium disabled:opacity-50"
          style={{ backgroundColor: "#3ecf8e" }}
        >
          {portalMutation.isPending ? "Redirigiendo..." : "Gestionar en Stripe"}
        </button>
        {portalMutation.error && (
          <p className="text-[12px] text-red-400 mt-2">{portalMutation.error.message}</p>
        )}
      </div>
    </>
  );
}

export function HistorialPagosPage() {
  const { data: subscription, isLoading } = trpc.billing.getSubscription.useQuery();
  const portalMutation = trpc.billing.createPortalSession.useMutation({
    onSuccess: (data) => { window.location.href = data.url; },
  });

  return (
    <>
      <SectionHeader
        title="Historial de Pagos"
        description="Historial de facturacion"
        action={
          <button
            onClick={() => portalMutation.mutate()}
            disabled={portalMutation.isPending}
            className="text-[11px] px-3 py-1.5 rounded border border-[#333] text-[#ccc] hover:border-[#555] transition-colors"
          >
            Ver facturas en Stripe
          </button>
        }
      />
      {isLoading ? (
        <div className="h-48 rounded-lg bg-[#1e1e1e] animate-pulse" />
      ) : !subscription || subscription.status === "no_subscription" ? (
        <div className="rounded-lg border border-[#2e2e2e] p-8 text-center" style={{ backgroundColor: "#1e1e1e" }}>
          <CreditCard size={32} className="text-[#555] mx-auto mb-3" />
          <p className="text-[14px] text-[#ededed] font-medium mb-1">Sin historial de pagos</p>
          <p className="text-[12px] text-[#888]">Suscribete a un plan para ver tu historial aqui.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-[#2e2e2e] p-4" style={{ backgroundColor: "#1e1e1e" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[13px] font-medium text-[#ededed]">Plan {subscription.plan}</p>
              <p className="text-[11px] text-[#888]">Estado: <Badge text={subscription.status === "active" ? "Activo" : subscription.status} color={subscription.status === "active" ? "#3ecf8e" : "#f59e0b"} /></p>
            </div>
            {subscription.currentPeriodEnd && (
              <p className="text-[12px] text-[#888]">Proximo cobro: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</p>
            )}
          </div>
          <p className="text-[12px] text-[#888]">Para ver facturas detalladas, abre el portal de Stripe.</p>
          <button
            onClick={() => portalMutation.mutate()}
            disabled={portalMutation.isPending}
            className="mt-3 text-[12px] text-black px-4 py-2 rounded font-medium disabled:opacity-50"
            style={{ backgroundColor: "#3ecf8e" }}
          >
            {portalMutation.isPending ? "Abriendo..." : "Abrir Portal de Stripe"}
          </button>
        </div>
      )}
    </>
  );
}

export function IdiomaPage() {
  return (
    <>
      <SectionHeader title="Idioma" description="Configuracion de idioma de la plataforma" />
      <div className="max-w-lg">
        <div className="space-y-2">
          {[
            { label: "Espanol", code: "es", active: true },
            { label: "English", code: "en", active: false },
          ].map((l) => (
            <button key={l.code} className={`w-full rounded-lg border p-4 flex items-center justify-between transition-colors ${l.active ? "border-[#3ecf8e]/40" : "border-[#2e2e2e] hover:border-[#333]"}`} style={{ backgroundColor: "#1e1e1e" }}>
              <div className="flex items-center gap-2">
                <Languages size={16} className={l.active ? "text-[#3ecf8e]" : "text-[#888]"} />
                <span className="text-[13px] text-[#ededed]">{l.label}</span>
              </div>
              {l.active && <CheckCircle size={16} className="text-[#3ecf8e]" />}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

export function NotificacionesPage() {
  const { data: notifications, isLoading } = trpc.notifications.list.useQuery({ limit: 50 });
  const { data: unreadData } = trpc.notifications.getUnreadCount.useQuery();
  const utils = trpc.useUtils();
  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => { utils.notifications.list.invalidate(); utils.notifications.getUnreadCount.invalidate(); },
  });
  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => { utils.notifications.list.invalidate(); utils.notifications.getUnreadCount.invalidate(); },
  });

  const unreadCount = unreadData?.count ?? 0;
  const typeIcons: Record<string, string> = { ai_digest: "🤖", integration_error: "⚠️", lead_alert: "🔥", health_drop: "📉" };

  return (
    <>
      <SectionHeader
        title="Notificaciones"
        description={unreadCount > 0 ? `${unreadCount} sin leer` : "Todas leidas"}
        action={unreadCount > 0 ? (
          <button
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="text-[11px] px-3 py-1.5 rounded border border-[#333] text-[#ccc] hover:border-[#555] transition-colors"
          >
            Marcar todas como leidas
          </button>
        ) : undefined}
      />
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-lg bg-[#1e1e1e] animate-pulse" />)}
        </div>
      ) : !notifications || notifications.length === 0 ? (
        <div className="rounded-lg border border-[#2e2e2e] p-12 text-center" style={{ backgroundColor: "#1e1e1e" }}>
          <Bell size={32} className="text-[#555] mx-auto mb-3" />
          <p className="text-[14px] text-[#ededed] font-medium mb-1">Sin notificaciones</p>
          <p className="text-[12px] text-[#888]">Las notificaciones apareceran aqui.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.read && markRead.mutate({ notificationId: n.id })}
              className={`rounded-lg border p-4 flex items-start gap-3 transition-colors ${n.read ? "border-[#2e2e2e]" : "border-[#3ecf8e]/30 cursor-pointer hover:bg-[#1e1e1e]"}`}
              style={{ backgroundColor: n.read ? "#1e1e1e" : "#1a2a1e" }}
            >
              <span className="text-[16px] mt-0.5">{typeIcons[n.type] ?? "📋"}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-[13px] font-medium text-[#ededed]">{n.title}</p>
                  {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-[#3ecf8e]" />}
                </div>
                <p className="text-[12px] text-[#888]">{n.body}</p>
                <p className="text-[10px] text-[#666] mt-1">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export function ApiKeysPage() {
  return (
    <>
      <SectionHeader title="API Keys" description="Claves de acceso a la API de NodeLabz" />
      <div className="max-w-lg">
        <div className="rounded-lg border border-[#2e2e2e] p-4" style={{ backgroundColor: "#1e1e1e" }}>
          <div className="flex items-center gap-2 mb-3">
            <Key size={14} className="text-[#f59e0b]" />
            <span className="text-[13px] font-medium text-[#ededed]">API Key de produccion</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-[12px] text-[#888] px-3 py-2 rounded font-mono" style={{ backgroundColor: "#252525" }}>
              nlz_live_••••••••••••••••
            </code>
            <button className="text-[11px] px-3 py-1.5 rounded border border-[#333] text-[#ccc]">Copiar</button>
          </div>
        </div>
      </div>
    </>
  );
}
