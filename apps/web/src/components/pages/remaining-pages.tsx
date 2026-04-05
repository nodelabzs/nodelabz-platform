"use client";

import { useState, useCallback, useEffect } from "react";
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
  Sparkles,
  Loader2,
  Instagram,
  Linkedin,
  Image,
  Upload,
  ChevronLeft,
  ChevronRight,
  AtSign,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Save,
  Radio,
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
  const [aiResult, setAiResult] = useState<{
    scoreLabel: "HOT" | "WARM" | "COLD";
    reasoning: string;
    suggestDeal: boolean;
    dealTitle?: string;
    dealValue?: number;
  } | null>(null);

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

  const qualifyMutation = trpc.whatsapp.qualifyLead.useMutation({
    onSuccess: (data) => setAiResult(data),
  });

  const { data: pipelines } = trpc.pipeline.list.useQuery();
  const defaultPipeline = pipelines?.find((p) => p.isDefault) ?? pipelines?.[0];

  const createDealMutation = trpc.deals.create.useMutation({
    onSuccess: () => {
      setAiResult((prev) => prev ? { ...prev, suggestDeal: false } : prev);
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
                    onClick={() => { setSelectedContactId(c.contact.id); setAiResult(null); }}
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
                  <div className="flex-1">
                    <p className="text-[13px] font-medium text-[#ededed]">{selected.contact.firstName} {selected.contact.lastName ?? ""}</p>
                    <p className="text-[10px] text-[#888]">{selected.contact.phone}</p>
                  </div>
                  <button
                    onClick={() => {
                      setAiResult(null);
                      qualifyMutation.mutate({ contactId: selected.contact.id });
                    }}
                    disabled={qualifyMutation.isPending}
                    className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-md border border-[#333] text-[#ededed] hover:bg-[#252525] transition-colors disabled:opacity-50"
                  >
                    {qualifyMutation.isPending ? <Loader2 size={13} className="animate-spin text-[#f59e0b]" /> : <Sparkles size={13} className="text-[#f59e0b]" />}
                    Calificar con IA
                  </button>
                </div>
                {qualifyMutation.isPending && (
                  <div className="px-4 py-3 border-b border-[#2e2e2e] flex items-center gap-2" style={{ backgroundColor: "#1a1a2e" }}>
                    <Loader2 size={14} className="animate-spin text-[#f59e0b]" />
                    <span className="text-[12px] text-[#888]">Analizando conversacion...</span>
                  </div>
                )}
                {aiResult && (
                  <div className="px-4 py-3 border-b border-[#2e2e2e] space-y-2" style={{ backgroundColor: "#1a1a2e" }}>
                    <div className="flex items-center gap-2">
                      <Sparkles size={13} className="text-[#f59e0b]" />
                      <span className="text-[12px] font-medium text-[#ededed]">Calificacion IA</span>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: aiResult.scoreLabel === "HOT" ? "#dc2626" : aiResult.scoreLabel === "WARM" ? "#f59e0b" : "#6b7280",
                          color: "#fff",
                        }}
                      >
                        {aiResult.scoreLabel}
                      </span>
                      <button onClick={() => setAiResult(null)} className="ml-auto text-[#555] hover:text-[#888] text-[11px]">Cerrar</button>
                    </div>
                    <p className="text-[12px] text-[#aaa]">{aiResult.reasoning}</p>
                    {aiResult.suggestDeal && defaultPipeline && (
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-[11px] text-[#888]">
                          Deal sugerido: {aiResult.dealTitle} {aiResult.dealValue ? `($${aiResult.dealValue.toLocaleString()})` : ""}
                        </span>
                        <button
                          onClick={() => {
                            const stages = (defaultPipeline.stages as Array<{ id: string; name: string }>);
                            const firstStageId = stages?.[0]?.id ?? "new";
                            createDealMutation.mutate({
                              contactId: selected.contact.id,
                              pipelineId: defaultPipeline.id,
                              title: aiResult.dealTitle ?? "Nuevo deal",
                              value: aiResult.dealValue,
                              stageId: firstStageId,
                            });
                          }}
                          disabled={createDealMutation.isPending}
                          className="flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-[#3ecf8e] text-black font-medium hover:opacity-90 disabled:opacity-50"
                        >
                          {createDealMutation.isPending ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                          Crear Deal
                        </button>
                        {createDealMutation.isSuccess && <span className="text-[10px] text-[#3ecf8e]">Deal creado</span>}
                      </div>
                    )}
                    {qualifyMutation.isError && (
                      <p className="text-[11px] text-red-400">Error: {qualifyMutation.error.message}</p>
                    )}
                  </div>
                )}
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
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [filterScore, setFilterScore] = useState<"" | "HOT" | "WARM" | "COLD">("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: contactsData, isLoading: loadingContacts } = trpc.contacts.list.useQuery({
    limit: 100,
    tags: filterTag ? [filterTag] : undefined,
    scoreLabel: filterScore || undefined,
  });
  const contacts = contactsData?.contacts ?? [];
  const totalContacts = contactsData?.total ?? 0;

  const utils = trpc.useUtils();
  const broadcastMutation = trpc.whatsapp.broadcast.useMutation({
    onSuccess: () => {
      setShowForm(false);
      setMessage("");
      setSelectedIds([]);
      setFilterTag("");
      setFilterScore("");
    },
  });

  const toggleContact = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const selectAll = () => {
    if (selectedIds.length === contacts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(contacts.map((c) => c.id));
    }
  };

  return (
    <>
      <SectionHeader
        title="Broadcasts"
        description="Enviar mensajes masivos por WhatsApp"
        action={
          <div className="flex items-center gap-3">
            <Badge text="PROFESIONAL+" color="#a78bfa" />
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-1.5 text-[12px] text-black px-3 py-1.5 rounded font-medium"
              style={{ backgroundColor: "#25D366" }}
            >
              <Plus size={14} />Nuevo broadcast
            </button>
          </div>
        }
      />

      {showForm && (
        <div className="rounded-lg border border-[#2e2e2e] p-4 mb-4" style={{ backgroundColor: "#1e1e1e" }}>
          <h3 className="text-[14px] font-medium text-[#ededed] mb-3">Crear Broadcast</h3>

          {/* Message */}
          <div className="mb-3">
            <label className="text-[11px] text-[#888] block mb-1">Mensaje</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escribe tu mensaje de broadcast..."
              className="w-full rounded border border-[#2e2e2e] bg-[#252525] text-[13px] text-[#ededed] p-2 placeholder-[#555] resize-none focus:outline-none focus:border-[#25D366]"
              rows={3}
            />
          </div>

          {/* Filters */}
          <div className="flex gap-3 mb-3">
            <div className="flex-1">
              <label className="text-[11px] text-[#888] block mb-1">Filtrar por tag</label>
              <input
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                placeholder="ej: newsletter, vip"
                className="w-full rounded border border-[#2e2e2e] bg-[#252525] text-[13px] text-[#ededed] p-2 placeholder-[#555] focus:outline-none focus:border-[#25D366]"
              />
            </div>
            <div className="flex-1">
              <label className="text-[11px] text-[#888] block mb-1">Filtrar por score</label>
              <select
                value={filterScore}
                onChange={(e) => setFilterScore(e.target.value as "" | "HOT" | "WARM" | "COLD")}
                className="w-full rounded border border-[#2e2e2e] bg-[#252525] text-[13px] text-[#ededed] p-2 focus:outline-none focus:border-[#25D366]"
              >
                <option value="">Todos</option>
                <option value="HOT">HOT</option>
                <option value="WARM">WARM</option>
                <option value="COLD">COLD</option>
              </select>
            </div>
          </div>

          {/* Contact list */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-[#888]">
                {loadingContacts ? "Cargando..." : `${totalContacts} contactos encontrados`}
              </span>
              {contacts.length > 0 && (
                <button onClick={selectAll} className="text-[11px] text-[#25D366] hover:underline">
                  {selectedIds.length === contacts.length ? "Deseleccionar todos" : "Seleccionar todos"}
                </button>
              )}
            </div>
            <div className="max-h-[200px] overflow-y-auto rounded border border-[#2e2e2e] bg-[#252525]">
              {loadingContacts ? (
                <div className="p-4 text-center"><Loader2 size={16} className="animate-spin mx-auto text-[#888]" /></div>
              ) : contacts.length === 0 ? (
                <p className="p-4 text-center text-[12px] text-[#666]">No se encontraron contactos con estos filtros</p>
              ) : (
                contacts.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 px-3 py-2 hover:bg-[#2e2e2e] cursor-pointer border-b border-[#2e2e2e] last:border-0">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(c.id)}
                      onChange={() => toggleContact(c.id)}
                      className="accent-[#25D366]"
                    />
                    <span className="text-[12px] text-[#ededed] flex-1">
                      {c.firstName} {c.lastName}
                    </span>
                    <span className="text-[11px] text-[#666]">{c.phone ?? "sin tel."}</span>
                    {c.scoreLabel && (
                      <Badge
                        text={c.scoreLabel}
                        color={c.scoreLabel === "HOT" ? "#ef4444" : c.scoreLabel === "WARM" ? "#f59e0b" : "#6b7280"}
                      />
                    )}
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Send */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#888]">{selectedIds.length} contactos seleccionados</span>
            <div className="flex gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="text-[12px] text-[#888] px-3 py-1.5 rounded border border-[#2e2e2e] hover:bg-[#252525]"
              >
                Cancelar
              </button>
              <button
                disabled={!message.trim() || selectedIds.length === 0 || broadcastMutation.isPending}
                onClick={() => broadcastMutation.mutate({
                  contactIds: selectedIds,
                  templateName: message.trim(),
                })}
                className="flex items-center gap-1.5 text-[12px] text-black px-3 py-1.5 rounded font-medium disabled:opacity-40"
                style={{ backgroundColor: "#25D366" }}
              >
                {broadcastMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Enviar broadcast
              </button>
            </div>
          </div>

          {broadcastMutation.isSuccess && (
            <div className="mt-3 rounded p-2 text-[12px] text-[#3ecf8e]" style={{ backgroundColor: "#3ecf8e15" }}>
              <CheckCircle size={14} className="inline mr-1" />
              Broadcast enviado: {broadcastMutation.data.sent} enviados, {broadcastMutation.data.failed} fallidos, {broadcastMutation.data.skipped} omitidos
            </div>
          )}

          {broadcastMutation.isError && (
            <div className="mt-3 rounded p-2 text-[12px] text-[#ef4444]" style={{ backgroundColor: "#ef444415" }}>
              <AlertTriangle size={14} className="inline mr-1" />
              {broadcastMutation.error.message}
            </div>
          )}
        </div>
      )}

      {/* Broadcast history empty state */}
      <div className="rounded-lg border border-[#2e2e2e] p-8 text-center" style={{ backgroundColor: "#1e1e1e" }}>
        <Radio size={32} className="text-[#555] mx-auto mb-2" />
        <p className="text-[13px] text-[#888]">Sin broadcasts anteriores</p>
        <p className="text-[11px] text-[#666] mt-1">Los broadcasts enviados apareceran aqui</p>
      </div>
    </>
  );
}

export function RespuestasIAPage() {
  const { data: rulesData, isLoading } = trpc.whatsapp.getAutoReplyRules.useQuery();
  const [rules, setRules] = useState<Array<{ id: string; keywords: string[]; response: string; businessHoursOnly: boolean; enabled: boolean }>>([]);
  const [initialized, setInitialized] = useState(false);
  const [globalEnabled, setGlobalEnabled] = useState(true);

  // Sync from server once
  if (rulesData && !initialized) {
    setRules(rulesData.rules.length > 0 ? rulesData.rules : [
      { id: crypto.randomUUID(), keywords: ["precio"], response: "Gracias por tu interes! Un asesor te contactara pronto.", businessHoursOnly: false, enabled: true },
    ]);
    setGlobalEnabled(rulesData.rules.some((r) => r.enabled));
    setInitialized(true);
  }

  const utils = trpc.useUtils();
  const updateMutation = trpc.whatsapp.updateAutoReplyRules.useMutation({
    onSuccess: () => utils.whatsapp.getAutoReplyRules.invalidate(),
  });

  const addRule = () => {
    setRules((prev) => [...prev, {
      id: crypto.randomUUID(),
      keywords: [""],
      response: "",
      businessHoursOnly: false,
      enabled: true,
    }]);
  };

  const removeRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const updateRule = (id: string, field: string, value: unknown) => {
    setRules((prev) => prev.map((r) => r.id === id ? { ...r, [field]: value } : r));
  };

  const toggleGlobal = () => {
    const next = !globalEnabled;
    setGlobalEnabled(next);
    setRules((prev) => prev.map((r) => ({ ...r, enabled: next })));
  };

  const handleSave = () => {
    updateMutation.mutate({ rules });
  };

  return (
    <>
      <SectionHeader
        title="Respuestas IA"
        description="Respuestas automaticas inteligentes para WhatsApp"
        action={
          <div className="flex items-center gap-3">
            <button onClick={addRule} className="flex items-center gap-1.5 text-[12px] text-[#ededed] px-3 py-1.5 rounded border border-[#2e2e2e] hover:bg-[#252525]">
              <Plus size={14} />Agregar regla
            </button>
            <button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="flex items-center gap-1.5 text-[12px] text-black px-3 py-1.5 rounded font-medium disabled:opacity-40"
              style={{ backgroundColor: "#25D366" }}
            >
              {updateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Guardar
            </button>
          </div>
        }
      />

      {/* Global toggle */}
      <div className="rounded-lg border border-[#2e2e2e] p-4 mb-4" style={{ backgroundColor: "#1e1e1e" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot size={16} className="text-[#f59e0b]" />
            <span className="text-[13px] font-medium text-[#ededed]">Auto-respuestas IA</span>
          </div>
          <button onClick={toggleGlobal} className="flex items-center gap-2">
            <span className="text-[11px] text-[#888]">{globalEnabled ? "Activado" : "Desactivado"}</span>
            <div
              className="w-9 h-5 rounded-full relative transition-colors"
              style={{ backgroundColor: globalEnabled ? "#25D366" : "#333" }}
            >
              <div
                className="w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all"
                style={{ left: globalEnabled ? "18px" : "2px" }}
              />
            </div>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="h-32 rounded-lg bg-[#1e1e1e] animate-pulse" />
      ) : rules.length === 0 ? (
        <div className="rounded-lg border border-[#2e2e2e] p-8 text-center" style={{ backgroundColor: "#1e1e1e" }}>
          <Bot size={32} className="text-[#555] mx-auto mb-2" />
          <p className="text-[13px] text-[#888]">Sin reglas de auto-respuesta</p>
          <p className="text-[11px] text-[#666] mt-1">Agrega reglas de keyword-respuesta para automatizar tus respuestas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule, idx) => (
            <div key={rule.id} className="rounded-lg border border-[#2e2e2e] p-4" style={{ backgroundColor: "#1e1e1e" }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12px] font-medium text-[#888]">Regla {idx + 1}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateRule(rule.id, "enabled", !rule.enabled)}
                    className="flex items-center gap-1"
                  >
                    <div
                      className="w-7 h-4 rounded-full relative transition-colors"
                      style={{ backgroundColor: rule.enabled ? "#25D366" : "#333" }}
                    >
                      <div
                        className="w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all"
                        style={{ left: rule.enabled ? "14px" : "2px" }}
                      />
                    </div>
                  </button>
                  <button onClick={() => removeRule(rule.id)} className="text-[#555] hover:text-[#ef4444]">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-[#888] block mb-1">Keywords (separadas por coma)</label>
                  <input
                    value={rule.keywords.join(", ")}
                    onChange={(e) => updateRule(rule.id, "keywords", e.target.value.split(",").map((k) => k.trim()).filter(Boolean))}
                    placeholder="precio, costo, valor"
                    className="w-full rounded border border-[#2e2e2e] bg-[#252525] text-[13px] text-[#ededed] p-2 placeholder-[#555] focus:outline-none focus:border-[#25D366]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#888] block mb-1">Respuesta automatica</label>
                  <input
                    value={rule.response}
                    onChange={(e) => updateRule(rule.id, "response", e.target.value)}
                    placeholder="Gracias por tu interes! Un asesor te contactara pronto."
                    className="w-full rounded border border-[#2e2e2e] bg-[#252525] text-[13px] text-[#ededed] p-2 placeholder-[#555] focus:outline-none focus:border-[#25D366]"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rule.businessHoursOnly}
                  onChange={(e) => updateRule(rule.id, "businessHoursOnly", e.target.checked)}
                  className="accent-[#25D366]"
                />
                <span className="text-[11px] text-[#888]">Solo en horario laboral</span>
              </label>
            </div>
          ))}
        </div>
      )}

      {updateMutation.isSuccess && (
        <div className="mt-4 rounded p-2 text-[12px] text-[#3ecf8e]" style={{ backgroundColor: "#3ecf8e15" }}>
          <CheckCircle size={14} className="inline mr-1" />
          Reglas guardadas correctamente ({updateMutation.data.rulesCount} reglas)
        </div>
      )}

      {updateMutation.isError && (
        <div className="mt-4 rounded p-2 text-[12px] text-[#ef4444]" style={{ backgroundColor: "#ef444415" }}>
          <AlertTriangle size={14} className="inline mr-1" />
          {updateMutation.error.message}
        </div>
      )}
    </>
  );
}

export function SecuenciasWAPage() {
  const [showForm, setShowForm] = useState(false);
  const [seqName, setSeqName] = useState("");
  const [steps, setSteps] = useState<Array<{ delayHours: number; message: string }>>([
    { delayHours: 0, message: "" },
  ]);

  const { data: sequences, isLoading } = trpc.sequences.list.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.sequences.create.useMutation({
    onSuccess: () => {
      setShowForm(false);
      setSeqName("");
      setSteps([{ delayHours: 0, message: "" }]);
      utils.sequences.list.invalidate();
    },
  });

  const toggleMutation = trpc.sequences.update.useMutation({
    onSuccess: () => utils.sequences.list.invalidate(),
  });

  const addStep = () => {
    setSteps((prev) => [...prev, { delayHours: 24, message: "" }]);
  };

  const removeStep = (idx: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateStep = (idx: number, field: "delayHours" | "message", value: string | number) => {
    setSteps((prev) => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const handleCreate = () => {
    createMutation.mutate({
      name: seqName.trim(),
      steps: steps.map((s) => ({
        templateId: crypto.randomUUID(),
        delayHours: s.delayHours,
      })),
    });
  };

  return (
    <>
      <SectionHeader
        title="Secuencias WhatsApp"
        description="Secuencias automatizadas de mensajes"
        action={
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 text-[12px] text-black px-3 py-1.5 rounded font-medium"
            style={{ backgroundColor: "#25D366" }}
          >
            <Plus size={14} />Crear secuencia
          </button>
        }
      />

      {/* Create form */}
      {showForm && (
        <div className="rounded-lg border border-[#2e2e2e] p-4 mb-4" style={{ backgroundColor: "#1e1e1e" }}>
          <h3 className="text-[14px] font-medium text-[#ededed] mb-3">Nueva Secuencia</h3>

          <div className="mb-3">
            <label className="text-[11px] text-[#888] block mb-1">Nombre de la secuencia</label>
            <input
              value={seqName}
              onChange={(e) => setSeqName(e.target.value)}
              placeholder="ej: Bienvenida nuevos leads"
              className="w-full rounded border border-[#2e2e2e] bg-[#252525] text-[13px] text-[#ededed] p-2 placeholder-[#555] focus:outline-none focus:border-[#25D366]"
            />
          </div>

          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] text-[#888]">Pasos</label>
              <button onClick={addStep} className="text-[11px] text-[#25D366] hover:underline flex items-center gap-1">
                <Plus size={12} />Agregar paso
              </button>
            </div>
            <div className="space-y-2">
              {steps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2 rounded p-3" style={{ backgroundColor: "#252525" }}>
                  <div className="flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold text-[#25D366] border border-[#25D366] shrink-0 mt-1">
                    {idx + 1}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Clock size={12} className="text-[#888]" />
                      <span className="text-[11px] text-[#888]">Esperar</span>
                      <input
                        type="number"
                        min={0}
                        value={step.delayHours}
                        onChange={(e) => updateStep(idx, "delayHours", parseInt(e.target.value) || 0)}
                        className="w-16 rounded border border-[#2e2e2e] bg-[#1e1e1e] text-[12px] text-[#ededed] px-2 py-1 focus:outline-none focus:border-[#25D366]"
                      />
                      <span className="text-[11px] text-[#888]">horas</span>
                    </div>
                    <textarea
                      value={step.message}
                      onChange={(e) => updateStep(idx, "message", e.target.value)}
                      placeholder="Mensaje del paso..."
                      rows={2}
                      className="w-full rounded border border-[#2e2e2e] bg-[#1e1e1e] text-[12px] text-[#ededed] p-2 placeholder-[#555] resize-none focus:outline-none focus:border-[#25D366]"
                    />
                  </div>
                  {steps.length > 1 && (
                    <button onClick={() => removeStep(idx)} className="text-[#555] hover:text-[#ef4444] mt-1">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="text-[12px] text-[#888] px-3 py-1.5 rounded border border-[#2e2e2e] hover:bg-[#252525]"
            >
              Cancelar
            </button>
            <button
              disabled={!seqName.trim() || steps.length === 0 || createMutation.isPending}
              onClick={handleCreate}
              className="flex items-center gap-1.5 text-[12px] text-black px-3 py-1.5 rounded font-medium disabled:opacity-40"
              style={{ backgroundColor: "#25D366" }}
            >
              {createMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
              Crear secuencia
            </button>
          </div>

          {createMutation.isError && (
            <div className="mt-3 rounded p-2 text-[12px] text-[#ef4444]" style={{ backgroundColor: "#ef444415" }}>
              <AlertTriangle size={14} className="inline mr-1" />
              {createMutation.error.message}
            </div>
          )}
        </div>
      )}

      {/* Sequences list */}
      {isLoading ? (
        <div className="h-32 rounded-lg bg-[#1e1e1e] animate-pulse" />
      ) : !sequences || sequences.length === 0 ? (
        <div className="rounded-lg border border-[#2e2e2e] p-8 text-center" style={{ backgroundColor: "#1e1e1e" }}>
          <Workflow size={32} className="text-[#555] mx-auto mb-2" />
          <p className="text-[13px] text-[#888]">Sin secuencias de WhatsApp. Crea tu primera secuencia automatizada.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sequences.map((seq) => {
            const stepsArr = (seq.steps as Array<Record<string, unknown>>) ?? [];
            return (
              <div key={seq.id} className="rounded-lg border border-[#2e2e2e] p-4" style={{ backgroundColor: "#1e1e1e" }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Workflow size={16} className="text-[#25D366]" />
                    <div>
                      <p className="text-[13px] font-medium text-[#ededed]">{seq.name}</p>
                      <p className="text-[11px] text-[#666]">{stepsArr.length} paso{stepsArr.length !== 1 ? "s" : ""} &middot; {seq._count?.enrollments ?? 0} inscritos</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      text={seq.isActive ? "Activa" : "Pausada"}
                      color={seq.isActive ? "#3ecf8e" : "#888"}
                    />
                    <button
                      onClick={() => toggleMutation.mutate({ sequenceId: seq.id, isActive: !seq.isActive })}
                      disabled={toggleMutation.isPending}
                      className="flex items-center gap-1 text-[11px] px-2 py-1 rounded border border-[#2e2e2e] hover:bg-[#252525]"
                      style={{ color: seq.isActive ? "#ef4444" : "#3ecf8e" }}
                    >
                      {seq.isActive ? <Pause size={12} /> : <Play size={12} />}
                      {seq.isActive ? "Pausar" : "Activar"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

export function NumeroConectadoPage() {
  const utils = trpc.useUtils();
  const { data: connection, isLoading } = trpc.whatsapp.getConnection.useQuery();
  const connectMutation = trpc.whatsapp.connect.useMutation({
    onSuccess: () => {
      utils.whatsapp.getConnection.invalidate();
      utils.integrations.list.invalidate();
      setShowManual(false);
      setPhoneNumberId("");
      setAccessToken("");
      setDisplayPhone("");
    },
  });
  const disconnectMutation = trpc.whatsapp.disconnect.useMutation({
    onSuccess: () => {
      utils.whatsapp.getConnection.invalidate();
      utils.integrations.list.invalidate();
    },
  });

  const [showManual, setShowManual] = useState(false);
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [displayPhone, setDisplayPhone] = useState("");
  const [embeddedLoading, setEmbeddedLoading] = useState(false);
  const [embeddedError, setEmbeddedError] = useState("");

  // Load Facebook SDK on mount
  useEffect(() => {
    if (document.getElementById("facebook-jssdk")) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).fbAsyncInit = function () {
      const appId = process.env.NEXT_PUBLIC_WHATSAPP_APP_ID;
      if (!appId) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).FB.init({
        appId,
        cookie: true,
        xfbml: true,
        version: "v22.0",
      });
    };

    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    document.body.appendChild(script);
  }, []);

  const handleEmbeddedSignup = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const FB = (window as any).FB;
    const configId = process.env.NEXT_PUBLIC_WHATSAPP_CONFIG_ID;

    if (!FB || !configId) {
      setEmbeddedError("WhatsApp Embedded Signup no esta disponible. Usa la conexion manual.");
      return;
    }

    setEmbeddedLoading(true);
    setEmbeddedError("");

    // Captured from the session info listener
    let capturedWabaId = "";
    let capturedPhoneNumberId = "";

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== "https://www.facebook.com" && event.origin !== "https://web.facebook.com") return;
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data.type === "WA_EMBEDDED_SIGNUP") {
          if (data.data?.waba_id) capturedWabaId = data.data.waba_id;
          if (data.data?.phone_number_id) capturedPhoneNumberId = data.data.phone_number_id;
        }
      } catch {
        // ignore non-JSON messages
      }
    };

    window.addEventListener("message", handleMessage);

    FB.login(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (response: any) => {
        window.removeEventListener("message", handleMessage);

        if (!response.authResponse?.code) {
          setEmbeddedLoading(false);
          setEmbeddedError("Conexion cancelada o fallida.");
          return;
        }

        const code = response.authResponse.code;

        if (!capturedWabaId || !capturedPhoneNumberId) {
          setEmbeddedLoading(false);
          setEmbeddedError("No se recibieron los datos de WhatsApp. Intenta de nuevo.");
          return;
        }

        // Exchange code for token on our backend
        fetch("/api/whatsapp/exchange-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            wabaId: capturedWabaId,
            phoneNumberId: capturedPhoneNumberId,
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              utils.whatsapp.getConnection.invalidate();
              utils.integrations.list.invalidate();
            } else {
              setEmbeddedError(data.error || "Error al conectar.");
            }
          })
          .catch(() => {
            setEmbeddedError("Error de red. Intenta de nuevo.");
          })
          .finally(() => {
            setEmbeddedLoading(false);
          });
      },
      {
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          sessionInfoVersion: 2,
        },
      }
    );
  };

  const handleManualConnect = () => {
    if (!phoneNumberId.trim() || !accessToken.trim()) return;
    connectMutation.mutate({
      phoneNumberId: phoneNumberId.trim(),
      accessToken: accessToken.trim(),
      displayPhone: displayPhone.trim() || undefined,
    });
  };

  return (
    <>
      <SectionHeader title="Numero Conectado" description="Configuracion de tu numero de WhatsApp Business" />
      {isLoading ? (
        <div className="h-24 rounded-lg bg-[#1e1e1e] animate-pulse" />
      ) : connection?.connected ? (
        <div className="rounded-lg border border-[#2e2e2e] p-4" style={{ backgroundColor: "#1e1e1e" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Phone size={20} className="text-[#25D366]" />
              <div>
                <p className="text-[14px] font-medium text-[#ededed]">
                  {connection.displayPhone || connection.phoneNumberId}
                </p>
                <p className="text-[11px] text-[#888]">Phone Number ID: {connection.phoneNumberId}</p>
              </div>
              <Badge text="Conectado" color="#3ecf8e" />
            </div>
            <button
              onClick={() => {
                if (confirm("¿Desconectar WhatsApp? Se dejaran de recibir mensajes.")) {
                  disconnectMutation.mutate();
                }
              }}
              className="text-[12px] text-red-400 hover:text-red-300 px-3 py-1.5 rounded border border-[#2e2e2e] hover:border-red-400/30 transition-colors"
            >
              Desconectar
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Embedded Signup — Primary */}
          <div className="rounded-lg border border-[#2e2e2e] p-6" style={{ backgroundColor: "#1e1e1e" }}>
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: "#25D36615" }}>
                <Phone size={24} className="text-[#25D366]" />
              </div>
              <p className="text-[15px] text-[#ededed] font-medium mb-1">Conectar WhatsApp Business</p>
              <p className="text-[12px] text-[#888] mb-5 max-w-md mx-auto">
                Conecta tu numero de WhatsApp en un clic. Se abrira una ventana de Meta donde podras seleccionar o crear tu cuenta de WhatsApp Business.
              </p>
              <button
                onClick={handleEmbeddedSignup}
                disabled={embeddedLoading}
                className="inline-flex items-center gap-2 text-[13px] text-white px-6 py-2.5 rounded-lg font-medium disabled:opacity-50 transition-colors"
                style={{ backgroundColor: "#25D366" }}
              >
                {embeddedLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Conectando...
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    Conectar con WhatsApp
                  </>
                )}
              </button>
              {embeddedError && (
                <p className="text-[11px] text-red-400 mt-3">{embeddedError}</p>
              )}
            </div>
          </div>

          {/* Manual Fallback */}
          <div className="rounded-lg border border-[#2e2e2e]" style={{ backgroundColor: "#1e1e1e" }}>
            <button
              onClick={() => setShowManual(!showManual)}
              className="w-full flex items-center justify-between px-4 py-3 text-left"
            >
              <span className="text-[12px] text-[#888]">Conexion manual (avanzado)</span>
              <ChevronRight
                size={14}
                className={`text-[#555] transition-transform ${showManual ? "rotate-90" : ""}`}
              />
            </button>
            {showManual && (
              <div className="px-4 pb-4 space-y-3 border-t border-[#2e2e2e] pt-3">
                <p className="text-[11px] text-[#666]">
                  Si prefieres configurar manualmente, ingresa tu Phone Number ID y Access Token de la{" "}
                  <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="text-[#3ecf8e] hover:underline">
                    consola de Meta
                  </a>.
                </p>
                <div>
                  <label className="block text-[12px] text-[#888] mb-1">Phone Number ID *</label>
                  <input
                    type="text"
                    value={phoneNumberId}
                    onChange={(e) => setPhoneNumberId(e.target.value)}
                    placeholder="Ej: 1063189020210775"
                    className="w-full px-3 py-2 rounded border border-[#2e2e2e] bg-[#141414] text-[13px] text-[#ededed] placeholder:text-[#555] focus:outline-none focus:border-[#3ecf8e]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] text-[#888] mb-1">Access Token *</label>
                  <input
                    type="password"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder="Token permanente de Meta Business"
                    className="w-full px-3 py-2 rounded border border-[#2e2e2e] bg-[#141414] text-[13px] text-[#ededed] placeholder:text-[#555] focus:outline-none focus:border-[#3ecf8e]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] text-[#888] mb-1">Numero (opcional)</label>
                  <input
                    type="text"
                    value={displayPhone}
                    onChange={(e) => setDisplayPhone(e.target.value)}
                    placeholder="Ej: +506 7121-6429"
                    className="w-full px-3 py-2 rounded border border-[#2e2e2e] bg-[#141414] text-[13px] text-[#ededed] placeholder:text-[#555] focus:outline-none focus:border-[#3ecf8e]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleManualConnect}
                    disabled={connectMutation.isPending || !phoneNumberId.trim() || !accessToken.trim()}
                    className="text-[12px] text-black px-4 py-2 rounded font-medium disabled:opacity-50"
                    style={{ backgroundColor: "#3ecf8e" }}
                  >
                    {connectMutation.isPending ? "Guardando..." : "Conectar"}
                  </button>
                  {connectMutation.isError && (
                    <p className="text-[11px] text-red-400">{connectMutation.error.message}</p>
                  )}
                </div>
              </div>
            )}
          </div>
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
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const dayNames = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
  const today = new Date();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday-based
  const daysInMonth = lastDay.getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <>
      <SectionHeader
        title="Calendario Social"
        description="Planifica y programa publicaciones"
        action={
          <button className="flex items-center gap-1.5 text-[12px] text-black px-4 py-2 rounded font-medium" style={{ backgroundColor: "#3ecf8e" }}>
            <Plus size={14} /> Crear publicacion
          </button>
        }
      />

      {/* Banner */}
      <div className="flex items-center gap-3 rounded-lg border border-[#3ecf8e]/20 px-4 py-3 mb-6" style={{ backgroundColor: "#3ecf8e10" }}>
        <Plug size={16} className="text-[#3ecf8e] shrink-0" />
        <p className="text-[12px] text-[#aaa]">
          Conecta tus redes sociales para programar publicaciones.{" "}
          <span className="text-[#3ecf8e] cursor-pointer hover:underline">Ir a integraciones</span>
        </p>
      </div>

      {/* Calendar */}
      <div className="rounded-lg border border-[#2e2e2e] overflow-hidden" style={{ backgroundColor: "#1e1e1e" }}>
        {/* Month navigation */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2e2e2e]">
          <button onClick={prevMonth} className="p-1.5 rounded hover:bg-[#2a2a2a] text-[#888] transition-colors">
            <ChevronLeft size={18} />
          </button>
          <h2 className="text-[15px] font-semibold text-[#ededed]">{monthNames[month]} {year}</h2>
          <button onClick={nextMonth} className="p-1.5 rounded hover:bg-[#2a2a2a] text-[#888] transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-[#2e2e2e]">
          {dayNames.map((d) => (
            <div key={d} className="text-center py-2.5 text-[11px] font-medium text-[#666] uppercase tracking-wide">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            const isToday = day !== null && day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            return (
              <div
                key={i}
                className={`min-h-[90px] border-b border-r border-[#2e2e2e] p-2 transition-colors ${day ? "hover:bg-[#252525] cursor-pointer" : ""}`}
                style={{ borderRight: (i + 1) % 7 === 0 ? "none" : undefined }}
              >
                {day && (
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[12px] ${
                      isToday ? "bg-[#3ecf8e] text-black font-semibold" : "text-[#999]"
                    }`}
                  >
                    {day}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

export function CrearPublicacionPage() {
  const [content, setContent] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // AI Image Generation state
  const [showImageGen, setShowImageGen] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageSize, setImageSize] = useState<"1024x1024" | "1024x1536" | "1536x1024">("1024x1024");
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [generatedRevisedPrompt, setGeneratedRevisedPrompt] = useState<string | null>(null);

  const generateImageMutation = trpc.mediaGen.generateImage.useMutation({
    onSuccess: (data) => {
      setGeneratedImageUrl(data.url);
      setGeneratedRevisedPrompt(data.revisedPrompt);
    },
    onError: (error) => {
      setToastMsg(error.message);
      setTimeout(() => setToastMsg(null), 4000);
    },
  });
  const maxChars = 2200;

  const platformsList = [
    { name: "Facebook", icon: Facebook, color: "#1877f2" },
    { name: "Instagram", icon: Instagram, color: "#e4405f" },
    { name: "TikTok", icon: Globe, color: "#00f2ea" },
    { name: "LinkedIn", icon: Linkedin, color: "#0a66c2" },
  ];

  const togglePlatform = (name: string) =>
    setSelectedPlatforms((prev) => prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]);

  const showToast = () => {
    setToastMsg("Proximamente — conecta tus redes sociales");
    setTimeout(() => setToastMsg(null), 3000);
  };

  return (
    <>
      <SectionHeader title="Crear Publicacion" description="Publica en multiples redes sociales" />

      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 rounded-lg border border-[#3ecf8e]/30 px-4 py-3 text-[13px] text-[#ededed] shadow-lg" style={{ backgroundColor: "#1e1e1e" }}>
          {toastMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-5">
          {/* Platform selector */}
          <div>
            <label className="text-[12px] text-[#888] block mb-2">Plataformas</label>
            <div className="flex gap-2 flex-wrap">
              {platformsList.map(({ name, icon: Icon, color }) => {
                const active = selectedPlatforms.includes(name);
                return (
                  <button
                    key={name}
                    onClick={() => togglePlatform(name)}
                    className="flex items-center gap-2 text-[12px] px-3 py-2 rounded-lg border transition-all"
                    style={{
                      borderColor: active ? color + "80" : "#333",
                      backgroundColor: active ? color + "15" : "transparent",
                      color: active ? color : "#999",
                    }}
                  >
                    <Icon size={14} />
                    {name}
                    {active && <CheckCircle size={12} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content textarea */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[12px] text-[#888]">Contenido</label>
              <span className={`text-[11px] ${content.length > maxChars ? "text-red-400" : "text-[#666]"}`}>
                {content.length}/{maxChars}
              </span>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Escribe tu publicacion..."
              className="w-full h-40 px-4 py-3 rounded-lg border border-[#333] text-[13px] text-[#ededed] placeholder:text-[#555] outline-none resize-none focus:border-[#3ecf8e]/40 transition-colors"
              style={{ backgroundColor: "#222" }}
            />
          </div>

          {/* Multimedia: upload or AI generate */}
          <div>
            <label className="text-[12px] text-[#888] block mb-2">Multimedia</label>

            {/* Show generated image if we have one */}
            {generatedImageUrl ? (
              <div className="space-y-3">
                <div className="relative rounded-lg overflow-hidden border border-[#2e2e2e]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={generatedImageUrl}
                    alt="Imagen generada con IA"
                    className="w-full max-h-[400px] object-contain"
                    style={{ backgroundColor: "#1a1a1a" }}
                  />
                </div>
                {generatedRevisedPrompt && generatedRevisedPrompt !== imagePrompt && (
                  <p className="text-[11px] text-[#666] italic">Prompt revisado: {generatedRevisedPrompt}</p>
                )}
                <div className="flex gap-2">
                  <a
                    href={generatedImageUrl}
                    download={`nodelabz-ai-${Date.now()}.png`}
                    className="flex items-center gap-1.5 text-[11px] text-[#ccc] px-3 py-1.5 rounded-lg border border-[#333] hover:border-[#3ecf8e]/40 transition-colors"
                  >
                    <Download size={12} /> Descargar
                  </a>
                  <button
                    onClick={() => {
                      setGeneratedImageUrl(null);
                      setGeneratedRevisedPrompt(null);
                      setShowImageGen(false);
                    }}
                    className="flex items-center gap-1.5 text-[11px] text-[#999] px-3 py-1.5 rounded-lg border border-[#333] hover:border-red-400/40 transition-colors"
                  >
                    <Trash2 size={12} /> Quitar
                  </button>
                </div>
              </div>
            ) : !showImageGen ? (
              <div className="space-y-3">
                <div className="flex items-center justify-center h-36 rounded-lg border-2 border-dashed border-[#333] hover:border-[#3ecf8e]/30 transition-colors cursor-pointer" style={{ backgroundColor: "#1a1a1a" }}>
                  <div className="text-center">
                    <Upload size={24} className="text-[#555] mx-auto mb-2" />
                    <p className="text-[12px] text-[#777]">Arrastra imagenes o haz clic para subir</p>
                    <p className="text-[10px] text-[#555] mt-1">PNG, JPG, MP4 — max 10MB</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowImageGen(true)}
                  className="flex items-center gap-1.5 text-[12px] text-[#3ecf8e] px-3 py-2 rounded-lg border border-[#3ecf8e]/30 hover:bg-[#3ecf8e]/10 transition-colors w-full justify-center"
                >
                  <Sparkles size={14} /> Generar imagen con IA
                </button>
              </div>
            ) : (
              /* AI Image Generation Panel */
              <div className="rounded-lg border border-[#3ecf8e]/20 p-4 space-y-3" style={{ backgroundColor: "#1a1a1a" }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[13px] text-[#3ecf8e] font-medium">
                    <Sparkles size={14} /> Generar imagen con IA
                  </div>
                  <button
                    onClick={() => setShowImageGen(false)}
                    className="text-[11px] text-[#666] hover:text-[#999] transition-colors"
                  >
                    Cancelar
                  </button>
                </div>

                {/* Prompt */}
                <textarea
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  placeholder="Describe la imagen que quieres generar... Ej: Un producto de skincare minimalista sobre fondo rosa pastel"
                  className="w-full h-24 px-3 py-2 rounded-lg border border-[#333] text-[12px] text-[#ededed] placeholder:text-[#555] outline-none resize-none focus:border-[#3ecf8e]/40 transition-colors"
                  style={{ backgroundColor: "#222" }}
                />

                {/* Size selector */}
                <div>
                  <label className="text-[11px] text-[#888] block mb-1.5">Tamano</label>
                  <div className="flex gap-2">
                    {([
                      { value: "1024x1024" as const, label: "Cuadrado", icon: "1:1" },
                      { value: "1024x1536" as const, label: "Vertical", icon: "2:3" },
                      { value: "1536x1024" as const, label: "Horizontal", icon: "3:2" },
                    ]).map(({ value, label, icon }) => (
                      <button
                        key={value}
                        onClick={() => setImageSize(value)}
                        className="flex-1 text-center px-2 py-1.5 rounded-lg border text-[11px] transition-all"
                        style={{
                          borderColor: imageSize === value ? "#3ecf8e80" : "#333",
                          backgroundColor: imageSize === value ? "#3ecf8e15" : "transparent",
                          color: imageSize === value ? "#3ecf8e" : "#999",
                        }}
                      >
                        <span className="block font-medium">{icon}</span>
                        <span className="block text-[10px] mt-0.5 opacity-70">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Generate button */}
                <button
                  onClick={() => {
                    if (!imagePrompt.trim()) return;
                    generateImageMutation.mutate({
                      prompt: imagePrompt.trim(),
                      size: imageSize,
                    });
                  }}
                  disabled={generateImageMutation.isPending || !imagePrompt.trim()}
                  className="flex items-center gap-1.5 text-[12px] text-black px-4 py-2.5 rounded-lg font-medium transition-opacity hover:opacity-90 w-full justify-center disabled:opacity-50"
                  style={{ backgroundColor: "#3ecf8e" }}
                >
                  {generateImageMutation.isPending ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Generando...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} /> Generar imagen
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Schedule */}
          <div>
            <label className="text-[12px] text-[#888] block mb-2">Programar</label>
            <div className="flex gap-3">
              <input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="px-3 py-2 rounded-lg border border-[#333] text-[12px] text-[#ededed] outline-none focus:border-[#3ecf8e]/40 transition-colors"
                style={{ backgroundColor: "#222" }}
              />
              <input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="px-3 py-2 rounded-lg border border-[#333] text-[12px] text-[#ededed] outline-none focus:border-[#3ecf8e]/40 transition-colors"
                style={{ backgroundColor: "#222" }}
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <button onClick={showToast} className="flex items-center gap-1.5 text-[12px] text-black px-5 py-2.5 rounded-lg font-medium transition-opacity hover:opacity-90" style={{ backgroundColor: "#3ecf8e" }}>
              <Send size={13} /> Publicar ahora
            </button>
            <button onClick={showToast} className="flex items-center gap-1.5 text-[12px] text-[#ccc] px-5 py-2.5 rounded-lg font-medium border border-[#333] hover:border-[#3ecf8e]/40 transition-colors">
              <Clock size={13} /> Programar
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="lg:col-span-2">
          <label className="text-[12px] text-[#888] block mb-2">Vista previa</label>
          <div className="rounded-lg border border-[#2e2e2e] overflow-hidden" style={{ backgroundColor: "#1e1e1e" }}>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[#2e2e2e]">
              <div className="w-9 h-9 rounded-full bg-[#3ecf8e]/20 flex items-center justify-center">
                <Globe size={16} className="text-[#3ecf8e]" />
              </div>
              <div>
                <p className="text-[13px] text-[#ededed] font-medium">Tu Marca</p>
                <p className="text-[10px] text-[#666]">Ahora</p>
              </div>
            </div>
            <div className="px-4 py-3">
              <p className="text-[13px] text-[#ccc] min-h-[60px] whitespace-pre-wrap">
                {content || <span className="text-[#555] italic">Tu publicacion aparecera aqui...</span>}
              </p>
            </div>
            <div className="mx-4 mb-3 h-40 rounded-lg flex items-center justify-center overflow-hidden" style={{ backgroundColor: "#252525" }}>
              {generatedImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={generatedImageUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <Image size={28} className="text-[#444]" />
              )}
            </div>
            <div className="flex items-center gap-6 px-4 py-3 border-t border-[#2e2e2e] text-[#666]">
              <ThumbsUp size={14} />
              <MessageCircle size={14} />
              <Share2 size={14} />
            </div>
          </div>
        </div>
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
  const [activeTab, setActiveTab] = useState<"Todos" | "Facebook" | "Instagram">("Todos");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [messageText, setMessageText] = useState("");

  const tabs = ["Todos", "Facebook", "Instagram"] as const;

  const channelFilter =
    activeTab === "Facebook"
      ? ("FACEBOOK_DM" as const)
      : activeTab === "Instagram"
        ? ("INSTAGRAM_DM" as const)
        : undefined;

  const { data: convData, isLoading } = trpc.socialMessages.listConversations.useQuery({
    channel: channelFilter,
    search: searchTerm || undefined,
    limit: 30,
  });

  const { data: msgData } = trpc.socialMessages.getMessages.useQuery(
    { contactId: selectedContactId!, channel: channelFilter },
    { enabled: !!selectedContactId }
  );

  const utils = trpc.useUtils();
  const sendMutation = trpc.socialMessages.send.useMutation({
    onSuccess: () => {
      setMessageText("");
      if (selectedContactId) {
        utils.socialMessages.getMessages.invalidate({ contactId: selectedContactId });
        utils.socialMessages.listConversations.invalidate();
      }
    },
  });

  const conversations = convData?.conversations ?? [];
  const messages = [...(msgData?.messages ?? [])].reverse();

  const selectedConv = conversations.find((c) => c.contact.id === selectedContactId);
  const selectedChannel = selectedConv?.lastMessage?.channel as "INSTAGRAM_DM" | "FACEBOOK_DM" | undefined;

  const handleSend = () => {
    if (!selectedContactId || !messageText.trim() || !selectedChannel) return;
    if (selectedChannel !== "INSTAGRAM_DM" && selectedChannel !== "FACEBOOK_DM") return;
    sendMutation.mutate({
      contactId: selectedContactId,
      channel: selectedChannel,
      message: messageText.trim(),
    });
  };

  const getChannelIcon = (channel?: string) => {
    if (channel === "INSTAGRAM_DM") return <Instagram size={12} className="text-pink-400" />;
    if (channel === "FACEBOOK_DM") return <Facebook size={12} className="text-blue-400" />;
    return <MessageCircle size={12} className="text-[#555]" />;
  };

  return (
    <>
      <SectionHeader title="Bandeja de Entrada" description="Mensajes directos de todas las plataformas" />

      {/* Tab filters */}
      <div className="flex gap-1 mb-4 border-b border-[#2e2e2e] pb-px">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setSelectedContactId(null); }}
            className="px-4 py-2 text-[12px] rounded-t-lg transition-colors"
            style={{
              color: activeTab === tab ? "#3ecf8e" : "#888",
              backgroundColor: activeTab === tab ? "#1e1e1e" : "transparent",
              borderBottom: activeTab === tab ? "2px solid #3ecf8e" : "2px solid transparent",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Split view */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 rounded-lg border border-[#2e2e2e] overflow-hidden" style={{ backgroundColor: "#1e1e1e", minHeight: 480 }}>
        {/* Left sidebar — conversation list */}
        <div className="md:col-span-1 border-r border-[#2e2e2e]">
          {/* Search */}
          <div className="p-3 border-b border-[#2e2e2e]">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#333]" style={{ backgroundColor: "#222" }}>
              <Search size={13} className="text-[#555]" />
              <input
                type="text"
                placeholder="Buscar conversaciones..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent text-[12px] text-[#ededed] placeholder:text-[#555] outline-none flex-1"
              />
            </div>
          </div>

          {/* Conversation list */}
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={20} className="text-[#555] animate-spin" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <MessageCircle size={28} className="text-[#444] mb-3" />
              <p className="text-[12px] text-[#666] text-center">Sin conversaciones</p>
            </div>
          ) : (
            <div className="overflow-y-auto" style={{ maxHeight: 420 }}>
              {conversations.map((conv) => {
                const isActive = conv.contact.id === selectedContactId;
                const name = [conv.contact.firstName, conv.contact.lastName].filter(Boolean).join(" ");
                return (
                  <button
                    key={conv.contact.id}
                    onClick={() => setSelectedContactId(conv.contact.id)}
                    className="w-full text-left px-4 py-3 border-b border-[#2e2e2e] transition-colors hover:bg-[#252525]"
                    style={{ backgroundColor: isActive ? "#252525" : "transparent" }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {getChannelIcon(conv.lastMessage?.channel)}
                        <span className="text-[13px] text-[#ededed] font-medium truncate max-w-[140px]">{name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {conv.unreadCount > 0 && (
                          <span className="w-5 h-5 rounded-full bg-[#3ecf8e] text-[10px] text-black font-bold flex items-center justify-center">
                            {conv.unreadCount}
                          </span>
                        )}
                        {conv.lastMessage?.createdAt && (
                          <span className="text-[10px] text-[#555]">
                            {new Date(conv.lastMessage.createdAt).toLocaleDateString("es", { day: "2-digit", month: "short" })}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-[#888] truncate">
                      {conv.lastMessage?.direction === "OUTBOUND" && "Tu: "}
                      {conv.lastMessage?.content ?? ""}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right panel — message thread */}
        {selectedContactId && messages.length > 0 ? (
          <div className="md:col-span-2 flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[#2e2e2e]">
              {getChannelIcon(selectedChannel)}
              <span className="text-[13px] text-[#ededed] font-medium">
                {[selectedConv?.contact.firstName, selectedConv?.contact.lastName].filter(Boolean).join(" ")}
              </span>
              <span className="text-[10px] text-[#555] ml-auto">
                {selectedChannel === "INSTAGRAM_DM" ? "Instagram DM" : selectedChannel === "FACEBOOK_DM" ? "Facebook Messenger" : ""}
              </span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ maxHeight: 360 }}>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.direction === "OUTBOUND" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className="max-w-[70%] px-3 py-2 rounded-lg text-[12px]"
                    style={{
                      backgroundColor: msg.direction === "OUTBOUND" ? "#3ecf8e20" : "#252525",
                      color: msg.direction === "OUTBOUND" ? "#3ecf8e" : "#ededed",
                    }}
                  >
                    <p>{msg.content}</p>
                    <p className="text-[9px] mt-1 opacity-50">
                      {new Date(msg.createdAt).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Send input */}
            {(selectedChannel === "INSTAGRAM_DM" || selectedChannel === "FACEBOOK_DM") && (
              <div className="border-t border-[#2e2e2e] p-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Escribe un mensaje..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                    className="flex-1 px-3 py-2 rounded-lg border border-[#333] bg-[#222] text-[12px] text-[#ededed] placeholder:text-[#555] outline-none focus:border-[#3ecf8e]/50"
                  />
                  <button
                    onClick={handleSend}
                    disabled={sendMutation.isPending || !messageText.trim()}
                    className="px-3 py-2 rounded-lg transition-colors disabled:opacity-40"
                    style={{ backgroundColor: "#3ecf8e20" }}
                  >
                    {sendMutation.isPending ? (
                      <Loader2 size={14} className="text-[#3ecf8e] animate-spin" />
                    ) : (
                      <Send size={14} className="text-[#3ecf8e]" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="md:col-span-2 flex flex-col items-center justify-center px-6">
            <div className="w-16 h-16 rounded-full bg-[#252525] flex items-center justify-center mb-4">
              <Mail size={24} className="text-[#444]" />
            </div>
            <p className="text-[14px] text-[#888] font-medium mb-1">
              {selectedContactId ? "Sin mensajes" : "Selecciona una conversacion"}
            </p>
            <p className="text-[12px] text-[#666] text-center max-w-xs">
              Los mensajes de Facebook e Instagram apareceran aqui.
            </p>
            {conversations.length === 0 && (
              <div className="flex items-center gap-2 mt-5 px-4 py-2.5 rounded-lg border border-[#3ecf8e]/20 cursor-pointer hover:border-[#3ecf8e]/40 transition-colors" style={{ backgroundColor: "#3ecf8e10" }}>
                <Plug size={14} className="text-[#3ecf8e]" />
                <span className="text-[12px] text-[#3ecf8e]">Conectar redes sociales</span>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export function MencionesSocialPage() {
  const [activeTab, setActiveTab] = useState("Todas");
  const tabs = [
    { label: "Todas", icon: AtSign },
    { label: "Positivas", icon: ThumbsUp },
    { label: "Neutras", icon: Minus },
    { label: "Negativas", icon: ThumbsDown },
  ];

  return (
    <>
      <SectionHeader title="Menciones" description="Monitoreo de menciones de tu marca" />

      {/* Banner */}
      <div className="flex items-center gap-3 rounded-lg border border-[#3ecf8e]/20 px-4 py-3 mb-6" style={{ backgroundColor: "#3ecf8e10" }}>
        <Plug size={16} className="text-[#3ecf8e] shrink-0" />
        <p className="text-[12px] text-[#aaa]">
          Conecta tus redes para monitorear menciones.{" "}
          <span className="text-[#3ecf8e] cursor-pointer hover:underline">Ir a integraciones</span>
        </p>
      </div>

      {/* Tab filters */}
      <div className="flex gap-1 mb-6 border-b border-[#2e2e2e] pb-px">
        {tabs.map(({ label, icon: Icon }) => (
          <button
            key={label}
            onClick={() => setActiveTab(label)}
            className="flex items-center gap-1.5 px-4 py-2 text-[12px] rounded-t-lg transition-colors"
            style={{
              color: activeTab === label ? "#3ecf8e" : "#888",
              backgroundColor: activeTab === label ? "#1e1e1e" : "transparent",
              borderBottom: activeTab === label ? "2px solid #3ecf8e" : "2px solid transparent",
            }}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      {/* Placeholder mention card — shows what a mention looks like */}
      <div className="rounded-lg border border-[#2e2e2e] p-4 mb-4 opacity-50" style={{ backgroundColor: "#1e1e1e" }}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#252525] flex items-center justify-center">
              <AtSign size={15} className="text-[#555]" />
            </div>
            <div>
              <p className="text-[13px] text-[#999]">@usuario_ejemplo</p>
              <p className="text-[10px] text-[#666]">hace 2 horas  ·  Instagram</p>
            </div>
          </div>
          <span className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-[#3ecf8e]/10 text-[#3ecf8e]">
            <ThumbsUp size={10} /> Positiva
          </span>
        </div>
        <p className="text-[12px] text-[#888] ml-12">
          &quot;Excelente servicio de <span className="text-[#3ecf8e]">@tumarca</span>, super recomendado! 🚀&quot;
        </p>
      </div>

      {/* Empty state */}
      <div className="rounded-lg border border-[#2e2e2e] p-12 text-center" style={{ backgroundColor: "#1e1e1e" }}>
        <div className="w-14 h-14 rounded-full bg-[#252525] flex items-center justify-center mx-auto mb-4">
          <Hash size={24} className="text-[#444]" />
        </div>
        <p className="text-[14px] text-[#888] font-medium mb-1">Sin menciones detectadas</p>
        <p className="text-[12px] text-[#666] max-w-sm mx-auto">
          Cuando alguien mencione tu marca en redes sociales, las menciones apareceran aqui con analisis de sentimiento.
        </p>
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

const WORKFLOW_TRIGGERS_LIST = [
  { key: "nuevo_contacto", label: "Nuevo contacto", desc: "Se activa cuando se crea un nuevo contacto" },
  { key: "lead_hot", label: "Lead calificado (HOT)", desc: "Cuando un lead alcanza calificacion HOT" },
  { key: "deal_creado", label: "Deal creado", desc: "Cuando se crea un nuevo deal" },
  { key: "deal_etapa_cambiada", label: "Deal etapa cambiada", desc: "Cuando un deal cambia de etapa" },
  { key: "deal_ganado", label: "Deal ganado", desc: "Cuando un deal se marca como ganado" },
] as const;

const WORKFLOW_ACTIONS_LIST = [
  { key: "enviar_email", label: "Enviar email", icon: "mail" },
  { key: "actualizar_contacto", label: "Actualizar contacto", icon: "users" },
  { key: "crear_actividad", label: "Crear actividad", icon: "calendar" },
  { key: "esperar", label: "Esperar X horas", icon: "clock" },
] as const;

const EMAIL_TEMPLATES_LIST = [
  "Bienvenida", "Seguimiento lead", "Propuesta enviada", "Recordatorio reunion", "Agradecimiento post-compra",
];

const CONTACT_FIELDS_LIST = [
  "Nombre", "Email", "Telefono", "Empresa", "Etapa", "Score", "Etiqueta", "Propietario",
];

const ACTIVITY_TYPES_LIST = ["Llamada", "Reunion", "Email", "Tarea", "Nota"];

interface WorkflowStepItem {
  id: string;
  type: string;
  config: Record<string, string>;
}

export function CrearWorkflowPage() {
  const [workflowName, setWorkflowName] = useState("");
  const [trigger, setTrigger] = useState("");
  const [steps, setSteps] = useState<WorkflowStepItem[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [wfSaved, setWfSaved] = useState(false);

  const createWorkflow = trpc.workflow.create.useMutation({
    onSuccess: () => { setSaving(false); setWfSaved(true); },
    onError: () => { setSaving(false); },
  });

  function addStep(type: string) {
    setSteps([...steps, { id: crypto.randomUUID(), type, config: {} }]);
  }

  function updateStepConfig(id: string, key: string, value: string) {
    setSteps(steps.map((s) => s.id === id ? { ...s, config: { ...s.config, [key]: value } } : s));
  }

  function removeStep(id: string) {
    setSteps(steps.filter((s) => s.id !== id));
  }

  function handleSave() {
    if (!workflowName.trim() || !trigger) return;
    setSaving(true);
    const wfNodes = steps.map((s, i) => ({ id: s.id, type: s.type, position: i, config: s.config }));
    const wfEdges = steps.slice(1).map((s, i) => ({ source: steps[i]!.id, target: s.id }));
    createWorkflow.mutate({
      name: workflowName,
      trigger: { type: trigger },
      nodes: wfNodes,
      edges: wfEdges,
      isActive,
    });
  }

  if (wfSaved) {
    return (
      <>
        <SectionHeader title="Crear Workflow" description="Crea una nueva automatizacion" />
        <div className="max-w-2xl">
          <div className="rounded-lg border border-[#3ecf8e]/30 p-8 text-center" style={{ backgroundColor: "#1e2a22" }}>
            <CheckCircle size={40} className="text-[#3ecf8e] mx-auto mb-4" />
            <h2 className="text-[18px] font-semibold text-[#ededed] mb-2">Workflow guardado</h2>
            <p className="text-[13px] text-[#aaa]">
              <span className="text-[#ededed] font-medium">{workflowName}</span> ha sido creado {isActive ? "y activado" : ""} exitosamente.
            </p>
            <button
              onClick={() => { setWfSaved(false); setWorkflowName(""); setTrigger(""); setSteps([]); setIsActive(false); }}
              className="mt-6 text-[12px] px-4 py-2 rounded border border-[#333] text-[#ccc] hover:border-[#3ecf8e]/40 transition-colors"
            >
              Crear otro workflow
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SectionHeader title="Crear Workflow" description="Crea una nueva automatizacion" />
      <div className="max-w-2xl space-y-6">
        {/* Workflow name */}
        <div>
          <label className="text-[12px] text-[#888] block mb-1.5">Nombre del workflow</label>
          <input
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            placeholder="Ej: Seguimiento de leads calientes"
            className="w-full h-[38px] px-3 rounded-lg border border-[#333] text-[13px] text-[#ededed] placeholder:text-[#555] outline-none focus:border-[#3ecf8e]"
            style={{ backgroundColor: "#222" }}
          />
        </div>

        {/* Trigger selector */}
        <div>
          <label className="text-[12px] text-[#888] block mb-2">Trigger (evento que inicia el workflow)</label>
          <div className="space-y-2">
            {WORKFLOW_TRIGGERS_LIST.map((t) => (
              <button
                key={t.key}
                onClick={() => setTrigger(t.key)}
                className={`w-full rounded-lg border p-3 text-left transition-colors flex items-center gap-3 ${
                  trigger === t.key ? "border-[#3ecf8e] bg-[#3ecf8e]/5" : "border-[#2e2e2e] hover:border-[#555]"
                }`}
                style={{ backgroundColor: trigger === t.key ? undefined : "#1e1e1e" }}
              >
                <Zap size={14} className={trigger === t.key ? "text-[#3ecf8e]" : "text-[#666]"} />
                <div>
                  <span className={`text-[13px] font-medium ${trigger === t.key ? "text-[#ededed]" : "text-[#ccc]"}`}>{t.label}</span>
                  <p className="text-[11px] text-[#888]">{t.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Timeline / Steps */}
        <div>
          <label className="text-[12px] text-[#888] block mb-2">Acciones</label>
          <div className="space-y-0">
            {steps.map((step, idx) => (
              <div key={step.id}>
                {/* Connector line */}
                {idx > 0 && (
                  <div className="flex justify-center py-1">
                    <div className="w-px h-6 bg-[#3ecf8e]/40" />
                  </div>
                )}
                {/* Step card */}
                <div className="rounded-lg border border-[#2e2e2e] p-4" style={{ backgroundColor: "#1e1e1e" }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-[#3ecf8e]/20 flex items-center justify-center text-[10px] text-[#3ecf8e] font-medium">{idx + 1}</div>
                      <span className="text-[12px] text-[#ededed] font-medium">
                        {WORKFLOW_ACTIONS_LIST.find((a) => a.key === step.type)?.label ?? step.type}
                      </span>
                    </div>
                    <button onClick={() => removeStep(step.id)} className="text-[#666] hover:text-[#ef4444] transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Config fields per type */}
                  {step.type === "enviar_email" && (
                    <div>
                      <label className="text-[11px] text-[#888] block mb-1">Template de email</label>
                      <select
                        value={step.config.template ?? ""}
                        onChange={(e) => updateStepConfig(step.id, "template", e.target.value)}
                        className="w-full h-[34px] px-3 rounded border border-[#333] text-[12px] text-[#ededed] outline-none focus:border-[#3ecf8e] appearance-none"
                        style={{ backgroundColor: "#252525" }}
                      >
                        <option value="">Seleccionar template...</option>
                        {EMAIL_TEMPLATES_LIST.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  )}

                  {step.type === "actualizar_contacto" && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-[#888] block mb-1">Campo</label>
                        <select
                          value={step.config.field ?? ""}
                          onChange={(e) => updateStepConfig(step.id, "field", e.target.value)}
                          className="w-full h-[34px] px-3 rounded border border-[#333] text-[12px] text-[#ededed] outline-none focus:border-[#3ecf8e] appearance-none"
                          style={{ backgroundColor: "#252525" }}
                        >
                          <option value="">Seleccionar campo...</option>
                          {CONTACT_FIELDS_LIST.map((f) => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] text-[#888] block mb-1">Valor</label>
                        <input
                          value={step.config.value ?? ""}
                          onChange={(e) => updateStepConfig(step.id, "value", e.target.value)}
                          placeholder="Nuevo valor"
                          className="w-full h-[34px] px-3 rounded border border-[#333] text-[12px] text-[#ededed] placeholder:text-[#555] outline-none focus:border-[#3ecf8e]"
                          style={{ backgroundColor: "#252525" }}
                        />
                      </div>
                    </div>
                  )}

                  {step.type === "crear_actividad" && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-[#888] block mb-1">Asunto</label>
                        <input
                          value={step.config.subject ?? ""}
                          onChange={(e) => updateStepConfig(step.id, "subject", e.target.value)}
                          placeholder="Asunto de la actividad"
                          className="w-full h-[34px] px-3 rounded border border-[#333] text-[12px] text-[#ededed] placeholder:text-[#555] outline-none focus:border-[#3ecf8e]"
                          style={{ backgroundColor: "#252525" }}
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-[#888] block mb-1">Tipo</label>
                        <select
                          value={step.config.activityType ?? ""}
                          onChange={(e) => updateStepConfig(step.id, "activityType", e.target.value)}
                          className="w-full h-[34px] px-3 rounded border border-[#333] text-[12px] text-[#ededed] outline-none focus:border-[#3ecf8e] appearance-none"
                          style={{ backgroundColor: "#252525" }}
                        >
                          <option value="">Seleccionar tipo...</option>
                          {ACTIVITY_TYPES_LIST.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>
                  )}

                  {step.type === "esperar" && (
                    <div>
                      <label className="text-[11px] text-[#888] block mb-1">Horas de espera</label>
                      <input
                        type="number"
                        min="1"
                        value={step.config.hours ?? ""}
                        onChange={(e) => updateStepConfig(step.id, "hours", e.target.value)}
                        placeholder="24"
                        className="w-32 h-[34px] px-3 rounded border border-[#333] text-[12px] text-[#ededed] placeholder:text-[#555] outline-none focus:border-[#3ecf8e]"
                        style={{ backgroundColor: "#252525" }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Add action buttons */}
            {steps.length > 0 && (
              <div className="flex justify-center py-1">
                <div className="w-px h-6 bg-[#333]" />
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {WORKFLOW_ACTIONS_LIST.map((a) => (
                <button
                  key={a.key}
                  onClick={() => addStep(a.key)}
                  className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded border border-dashed border-[#444] text-[#888] hover:border-[#3ecf8e]/40 hover:text-[#ccc] transition-colors"
                >
                  <Plus size={12} />
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Activar toggle + Save */}
        <div className="flex items-center justify-between pt-4 border-t border-[#2e2e2e]">
          <label className="flex items-center gap-2 cursor-pointer">
            <button
              onClick={() => setIsActive(!isActive)}
              className={`w-9 h-5 rounded-full transition-colors relative ${isActive ? "bg-[#3ecf8e]" : "bg-[#444]"}`}
            >
              <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] transition-transform ${isActive ? "translate-x-[18px]" : "translate-x-[3px]"}`} />
            </button>
            <span className="text-[12px] text-[#ccc]">{isActive ? "Activo" : "Inactivo"}</span>
          </label>
          <button
            onClick={handleSave}
            disabled={!workflowName.trim() || !trigger || saving}
            className="flex items-center gap-1.5 text-[12px] text-black px-4 py-2 rounded font-medium disabled:opacity-50 transition-colors"
            style={{ backgroundColor: "#3ecf8e" }}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? "Guardando..." : "Guardar workflow"}
          </button>
        </div>
      </div>
    </>
  );
}

export function TriggersPage({ type }: { type: string }) {
  const { data: workflows } = trpc.workflow.list.useQuery();

  const triggerTypes = [
    { key: "nuevo_contacto", label: "Nuevo contacto", desc: "Se activa cuando se crea un nuevo contacto en el CRM.", icon: <Users size={16} /> },
    { key: "lead_hot", label: "Lead calificado (HOT)", desc: "Cuando un lead alcanza la calificacion HOT basado en su score.", icon: <Zap size={16} /> },
    { key: "deal_creado", label: "Deal creado", desc: "Cuando se crea un nuevo deal en el pipeline.", icon: <Plus size={16} /> },
    { key: "deal_etapa_cambiada", label: "Deal etapa cambiada", desc: "Cuando un deal se mueve a una nueva etapa del pipeline.", icon: <RefreshCw size={16} /> },
    { key: "deal_ganado", label: "Deal ganado", desc: "Cuando un deal se marca como ganado/cerrado.", icon: <CheckCircle size={16} /> },
  ];

  function workflowsUsingTrigger(triggerKey: string) {
    if (!workflows) return [];
    return workflows.filter((w) => {
      const t = w.trigger as { type?: string } | null;
      return t?.type === triggerKey;
    });
  }

  return (
    <>
      <SectionHeader
        title="Triggers"
        description="Eventos que inician automatizaciones"
        action={
          <a href="/dashboard/automatizacion/crear" className="flex items-center gap-1.5 text-[12px] text-black px-3 py-1.5 rounded font-medium" style={{ backgroundColor: "#3ecf8e" }}>
            <Plus size={14} />
            Nuevo workflow
          </a>
        }
      />
      <div className="space-y-3">
        {triggerTypes.map((t) => {
          const using = workflowsUsingTrigger(t.key);
          return (
            <div key={t.key} className="rounded-lg border border-[#2e2e2e] p-4" style={{ backgroundColor: "#1e1e1e" }}>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#3ecf8e]/10 flex items-center justify-center text-[#3ecf8e] shrink-0 mt-0.5">
                  {t.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-[13px] font-medium text-[#ededed]">{t.label}</h3>
                    {using.length > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: "#3ecf8e20", color: "#3ecf8e" }}>
                        {using.length} workflow{using.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-[#888] mb-2">{t.desc}</p>
                  {using.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {using.map((w) => (
                        <span key={w.id} className="text-[10px] px-2 py-0.5 rounded bg-[#2a2a2a] text-[#aaa] border border-[#333]">
                          {w.name}
                        </span>
                      ))}
                    </div>
                  )}
                  {using.length === 0 && (
                    <p className="text-[11px] text-[#666] italic">Ningun workflow usa este trigger</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
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
      <div className="rounded-lg border border-[#3ecf8e]/30 p-12 text-center" style={{ backgroundColor: "#1e2a22" }}>
        <CheckCircle size={40} className="text-[#3ecf8e] mx-auto mb-4" />
        <h2 className="text-[16px] font-semibold text-[#ededed] mb-2">Sin errores recientes</h2>
        <p className="text-[13px] text-[#888]">Tus automatizaciones estan funcionando correctamente.</p>
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
  const [showCreate, setShowCreate] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const utils = trpc.useUtils();
  const keysQuery = trpc.apiKeys.list.useQuery();
  const scopesQuery = trpc.apiKeys.availableScopes.useQuery();
  const createMutation = trpc.apiKeys.create.useMutation({
    onSuccess: (data) => {
      setNewKey(data.key);
      setKeyName("");
      setSelectedScopes([]);
      utils.apiKeys.list.invalidate();
    },
  });
  const revokeMutation = trpc.apiKeys.revoke.useMutation({
    onSuccess: () => {
      utils.apiKeys.list.invalidate();
    },
  });

  const handleCreate = () => {
    if (!keyName.trim() || selectedScopes.length === 0) return;
    createMutation.mutate({ name: keyName.trim(), permissions: selectedScopes });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  };

  return (
    <>
      <SectionHeader
        title="API Keys"
        description="Claves de acceso a la API publica de NodeLabz"
        action={
          !showCreate && !newKey ? (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg text-white"
              style={{ backgroundColor: "#3ecf8e" }}
            >
              <Plus size={13} /> Crear API Key
            </button>
          ) : undefined
        }
      />

      {/* New Key Display (shown ONCE after creation) */}
      {newKey && (
        <div className="max-w-2xl mb-6 rounded-lg border border-[#f59e0b]/40 p-5" style={{ backgroundColor: "#1e1e1e" }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-[#f59e0b]" />
            <span className="text-[13px] font-semibold text-[#f59e0b]">
              Guarda esta clave ahora. No podras verla de nuevo.
            </span>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <code
              className="flex-1 text-[12px] text-[#3ecf8e] px-3 py-2.5 rounded font-mono select-all break-all"
              style={{ backgroundColor: "#252525" }}
            >
              {newKey}
            </code>
            <button
              onClick={() => handleCopy(newKey)}
              className="text-[11px] px-3 py-1.5 rounded border border-[#333] text-[#ccc] hover:border-[#3ecf8e] transition-colors shrink-0"
            >
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
          <button
            onClick={() => setNewKey(null)}
            className="text-[11px] text-[#888] hover:text-[#ededed] transition-colors"
          >
            Entendido, ya la guarde
          </button>
        </div>
      )}

      {/* Create Form */}
      {showCreate && !newKey && (
        <div className="max-w-2xl mb-6 rounded-lg border border-[#2e2e2e] p-5" style={{ backgroundColor: "#1e1e1e" }}>
          <h3 className="text-[14px] font-semibold text-[#ededed] mb-4">Nueva API Key</h3>

          <div className="mb-4">
            <label className="text-[12px] text-[#888] block mb-1.5">Nombre</label>
            <input
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder="Ej: Integracion Zapier, MCP Server..."
              className="w-full h-[38px] px-3 rounded-lg border border-[#333] text-[13px] text-[#ededed] outline-none focus:border-[#3ecf8e] transition-colors"
              style={{ backgroundColor: "#222" }}
            />
          </div>

          <div className="mb-4">
            <label className="text-[12px] text-[#888] block mb-2">Permisos</label>
            <div className="grid grid-cols-2 gap-2">
              {(scopesQuery.data || []).map((scope) => (
                <button
                  key={scope.id}
                  type="button"
                  onClick={() => toggleScope(scope.id)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border text-[12px] transition-colors text-left"
                  style={{
                    backgroundColor: selectedScopes.includes(scope.id) ? "#3ecf8e20" : "#222",
                    borderColor: selectedScopes.includes(scope.id) ? "#3ecf8e" : "#333",
                    color: selectedScopes.includes(scope.id) ? "#3ecf8e" : "#888",
                  }}
                >
                  <CheckCircle
                    size={14}
                    style={{ opacity: selectedScopes.includes(scope.id) ? 1 : 0.3 }}
                  />
                  {scope.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCreate}
              disabled={!keyName.trim() || selectedScopes.length === 0 || createMutation.isPending}
              className="text-[12px] px-4 py-2 rounded-lg text-white disabled:opacity-40 transition-opacity"
              style={{ backgroundColor: "#3ecf8e" }}
            >
              {createMutation.isPending ? "Generando..." : "Generar API Key"}
            </button>
            <button
              onClick={() => {
                setShowCreate(false);
                setKeyName("");
                setSelectedScopes([]);
              }}
              className="text-[12px] px-4 py-2 rounded-lg border border-[#333] text-[#888] hover:text-[#ededed] transition-colors"
            >
              Cancelar
            </button>
          </div>

          {createMutation.error && (
            <p className="mt-3 text-[12px] text-red-400">{createMutation.error.message}</p>
          )}
        </div>
      )}

      {/* Existing Keys List */}
      <div className="max-w-2xl space-y-3">
        {keysQuery.isLoading && (
          <div className="text-[13px] text-[#888] py-8 text-center">
            <Loader2 size={16} className="animate-spin inline mr-2" />
            Cargando API keys...
          </div>
        )}

        {keysQuery.data?.length === 0 && !keysQuery.isLoading && (
          <div className="text-[13px] text-[#888] py-8 text-center rounded-lg border border-[#2e2e2e]" style={{ backgroundColor: "#1e1e1e" }}>
            No hay API keys creadas. Crea una para empezar a usar la API publica.
          </div>
        )}

        {(keysQuery.data || []).map((apiKey) => (
          <div
            key={apiKey.id}
            className="rounded-lg border border-[#2e2e2e] p-4"
            style={{ backgroundColor: "#1e1e1e" }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Key size={14} className="text-[#f59e0b] shrink-0" />
                  <span className="text-[13px] font-medium text-[#ededed]">{apiKey.name}</span>
                </div>

                <code
                  className="text-[12px] text-[#888] px-2 py-1 rounded font-mono inline-block mb-2"
                  style={{ backgroundColor: "#252525" }}
                >
                  {apiKey.maskedKey}
                </code>

                <div className="flex flex-wrap gap-1.5 mb-2">
                  {apiKey.permissions.map((perm) => (
                    <span
                      key={perm}
                      className="text-[10px] px-2 py-0.5 rounded-full border border-[#333] text-[#888]"
                    >
                      {perm === "*" ? "todos" : perm}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-3 text-[11px] text-[#666]">
                  <span>
                    Creada: {new Date(apiKey.createdAt).toLocaleDateString("es")}
                  </span>
                  {apiKey.lastUsedAt && (
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      Ultimo uso: {new Date(apiKey.lastUsedAt).toLocaleDateString("es")}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => {
                  if (confirm("Revocar esta API key? Las integraciones que la usen dejaran de funcionar.")) {
                    revokeMutation.mutate({ id: apiKey.id });
                  }
                }}
                disabled={revokeMutation.isPending}
                className="text-[11px] px-3 py-1.5 rounded border border-red-800/50 text-red-400 hover:border-red-500 hover:text-red-300 transition-colors shrink-0"
              >
                <Trash2 size={12} className="inline mr-1" />
                Revocar
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* API Documentation Hint */}
      <div className="max-w-2xl mt-6 rounded-lg border border-[#2e2e2e] p-4" style={{ backgroundColor: "#1a1a1a" }}>
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck size={14} className="text-[#3ecf8e]" />
          <span className="text-[13px] font-medium text-[#ededed]">Uso de la API</span>
        </div>
        <div className="text-[12px] text-[#888] space-y-1.5">
          <p>Base URL: <code className="text-[#ccc] bg-[#252525] px-1.5 py-0.5 rounded">/api/v1</code></p>
          <p>Autenticacion: <code className="text-[#ccc] bg-[#252525] px-1.5 py-0.5 rounded">Authorization: Bearer nlab_sk_xxxx</code></p>
          <p className="pt-1">Endpoints disponibles:</p>
          <ul className="list-disc list-inside ml-2 space-y-0.5 text-[#666]">
            <li><code className="text-[#888]">GET/POST /api/v1/contacts</code> — Contactos</li>
            <li><code className="text-[#888]">GET/POST /api/v1/deals</code> — Negocios</li>
            <li><code className="text-[#888]">POST /api/v1/ai/generate-image</code> — Generar imagenes</li>
            <li><code className="text-[#888]">POST /api/v1/ai/generate-copy</code> — Generar copy</li>
            <li><code className="text-[#888]">GET/POST /api/v1/health-score</code> — Health Score</li>
          </ul>
        </div>
      </div>
    </>
  );
}

// ============================
// BUSINESS CONTEXT / AI KNOWLEDGE BASE
// ============================

type ServiceItem = { name: string; description: string; price?: string };
type FaqItem = { question: string; answer: string };
type ToneOption = "professional" | "friendly" | "casual" | "formal";

function ToggleSwitch({ enabled, onChange, label }: { enabled: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className="flex items-center gap-3 w-full py-2"
    >
      <div
        className="relative w-[42px] h-[24px] rounded-full transition-colors shrink-0"
        style={{ backgroundColor: enabled ? "#3ecf8e" : "#444" }}
      >
        <div
          className="absolute top-[2px] w-[20px] h-[20px] rounded-full bg-white transition-transform"
          style={{ left: enabled ? "20px" : "2px" }}
        />
      </div>
      <span className="text-[13px] text-[#ededed]">{label}</span>
    </button>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-[12px] text-[#888] block mb-1.5">{children}</label>;
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-[38px] px-3 rounded-lg border border-[#333] text-[13px] text-[#ededed] outline-none focus:border-[#3ecf8e] transition-colors"
      style={{ backgroundColor: "#222" }}
    />
  );
}

function TextArea({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2 rounded-lg border border-[#333] text-[13px] text-[#ededed] outline-none resize-none focus:border-[#3ecf8e] transition-colors"
      style={{ backgroundColor: "#222" }}
    />
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[#2e2e2e] p-5" style={{ backgroundColor: "#1e1e1e" }}>
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h3 className="text-[14px] font-semibold text-[#ededed]">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export function BusinessContextPage() {
  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [services, setServices] = useState<ServiceItem[]>([{ name: "", description: "", price: "" }]);
  const [weekdays, setWeekdays] = useState("9:00 - 18:00");
  const [weekends, setWeekends] = useState("Cerrado");
  const [timezone, setTimezone] = useState("America/Mexico_City");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [faqs, setFaqs] = useState<FaqItem[]>([{ question: "", answer: "" }]);
  const [tone, setTone] = useState<ToneOption>("professional");
  const [language, setLanguage] = useState<"es" | "en">("es");
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [qualifyLeads, setQualifyLeads] = useState(true);
  const [createDeals, setCreateDeals] = useState(true);
  const [customInstructions, setCustomInstructions] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data: loadedData, isLoading } = trpc.businessContext.get.useQuery();

  useEffect(() => {
    if (!loadedData) return;
    setBusinessName(loadedData.businessName);
    setDescription(loadedData.description);
    setServices(
      loadedData.services.length > 0
        ? loadedData.services.map((s) => ({ name: s.name, description: s.description, price: s.price ?? "" }))
        : [{ name: "", description: "", price: "" }]
    );
    setWeekdays(loadedData.businessHours.weekdays);
    setWeekends(loadedData.businessHours.weekends);
    setTimezone(loadedData.businessHours.timezone);
    setPhone(loadedData.contactInfo.phone ?? "");
    setEmail(loadedData.contactInfo.email ?? "");
    setWebsite(loadedData.contactInfo.website ?? "");
    setAddress(loadedData.contactInfo.address ?? "");
    setFaqs(
      loadedData.faqs.length > 0
        ? loadedData.faqs.map((f) => ({ question: f.question, answer: f.answer }))
        : [{ question: "", answer: "" }]
    );
    setTone(loadedData.tone);
    setLanguage(loadedData.language);
    setAutoReplyEnabled(loadedData.autoReplyEnabled);
    setQualifyLeads(loadedData.qualifyLeads);
    setCreateDeals(loadedData.createDeals);
    setCustomInstructions(loadedData.customInstructions);
  }, [loadedData]);

  const saveMutation = trpc.businessContext.save.useMutation({
    onSuccess: () => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
    onError: () => {
      setSaving(false);
    },
  });

  const handleSave = () => {
    setSaving(true);
    saveMutation.mutate({
      businessName,
      description,
      services: services.filter((s) => s.name.trim() !== ""),
      businessHours: { weekdays, weekends, timezone },
      contactInfo: {
        phone: phone || undefined,
        email: email || undefined,
        website: website || undefined,
        address: address || undefined,
      },
      faqs: faqs.filter((f) => f.question.trim() !== ""),
      tone,
      language,
      autoReplyEnabled,
      qualifyLeads,
      createDeals,
      customInstructions,
    });
  };

  const addService = () => setServices([...services, { name: "", description: "", price: "" }]);
  const removeService = (i: number) => setServices(services.filter((_, idx) => idx !== i));
  const updateService = (i: number, field: keyof ServiceItem, val: string) => {
    setServices((prev) =>
      prev.map((s, idx) => (idx === i ? { name: s.name, description: s.description, price: s.price, [field]: val } : s))
    );
  };

  const addFaq = () => setFaqs([...faqs, { question: "", answer: "" }]);
  const removeFaq = (i: number) => setFaqs(faqs.filter((_, idx) => idx !== i));
  const updateFaq = (i: number, field: keyof FaqItem, val: string) => {
    setFaqs((prev) =>
      prev.map((f, idx) => (idx === i ? { question: f.question, answer: f.answer, [field]: val } : f))
    );
  };

  const toneOptions: { value: ToneOption; label: string; desc: string }[] = [
    { value: "professional", label: "Profesional", desc: "Corporativo y serio" },
    { value: "friendly", label: "Amigable", desc: "Cercano y calido" },
    { value: "casual", label: "Casual", desc: "Relajado e informal" },
    { value: "formal", label: "Formal", desc: "Respetuoso y protocolar" },
  ];

  if (isLoading) {
    return (
      <>
        <SectionHeader title="Contexto de Negocio" description="Base de conocimiento para respuestas automaticas de IA" />
        <div className="max-w-2xl space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-lg bg-[#1e1e1e] animate-pulse" />
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <SectionHeader
        title="Contexto de Negocio"
        description="Base de conocimiento para respuestas automaticas de IA"
        action={
          <button
            onClick={handleSave}
            disabled={saving || !businessName.trim()}
            className="flex items-center gap-1.5 text-[12px] text-black px-4 py-1.5 rounded font-medium disabled:opacity-50 transition-opacity"
            style={{ backgroundColor: saved ? "#3ecf8e" : "#3ecf8e" }}
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : saved ? (
              <CheckCircle size={14} />
            ) : (
              <Save size={14} />
            )}
            {saving ? "Guardando..." : saved ? "Guardado" : "Guardar"}
          </button>
        }
      />

      <div className="max-w-2xl space-y-5 pb-10">
        {/* Business Info */}
        <SectionCard title="Informacion del Negocio" icon={<Bot size={16} className="text-[#3ecf8e]" />}>
          <div className="space-y-3">
            <div>
              <FieldLabel>Nombre del negocio *</FieldLabel>
              <TextInput value={businessName} onChange={setBusinessName} placeholder="Mi Empresa S.A." />
            </div>
            <div>
              <FieldLabel>Descripcion (2-3 oraciones sobre que hace tu negocio) *</FieldLabel>
              <TextArea
                value={description}
                onChange={setDescription}
                placeholder="Somos una empresa de tecnologia que ofrece soluciones de software para PYMEs..."
              />
            </div>
          </div>
        </SectionCard>

        {/* Services */}
        <SectionCard title="Servicios y Productos" icon={<Sparkles size={16} className="text-[#6366f1]" />}>
          <div className="space-y-3">
            {services.map((s, i) => (
              <div key={i} className="rounded-lg border border-[#2a2a2a] p-3 space-y-2" style={{ backgroundColor: "#252525" }}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#666]">Servicio {i + 1}</span>
                  {services.length > 1 && (
                    <button onClick={() => removeService(i)} className="text-[#888] hover:text-red-400 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
                <TextInput value={s.name} onChange={(v) => updateService(i, "name", v)} placeholder="Nombre del servicio" />
                <TextInput value={s.description} onChange={(v) => updateService(i, "description", v)} placeholder="Descripcion breve" />
                <TextInput value={s.price ?? ""} onChange={(v) => updateService(i, "price", v)} placeholder="Precio (opcional, ej: $500 USD/mes)" />
              </div>
            ))}
            <button
              onClick={addService}
              className="flex items-center gap-1.5 text-[12px] text-[#3ecf8e] hover:text-[#5ae0a8] transition-colors"
            >
              <Plus size={14} /> Agregar servicio
            </button>
          </div>
        </SectionCard>

        {/* Business Hours */}
        <SectionCard title="Horario de Atencion" icon={<Clock size={16} className="text-[#f59e0b]" />}>
          <div className="space-y-3">
            <div>
              <FieldLabel>Lunes a Viernes</FieldLabel>
              <TextInput value={weekdays} onChange={setWeekdays} placeholder="9:00 - 18:00" />
            </div>
            <div>
              <FieldLabel>Fines de semana</FieldLabel>
              <TextInput value={weekends} onChange={setWeekends} placeholder="Cerrado" />
            </div>
            <div>
              <FieldLabel>Zona horaria</FieldLabel>
              <TextInput value={timezone} onChange={setTimezone} placeholder="America/Mexico_City" />
            </div>
          </div>
        </SectionCard>

        {/* Contact Info */}
        <SectionCard title="Informacion de Contacto" icon={<Phone size={16} className="text-[#888]" />}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Telefono</FieldLabel>
              <TextInput value={phone} onChange={setPhone} placeholder="+52 55 1234 5678" />
            </div>
            <div>
              <FieldLabel>Email</FieldLabel>
              <TextInput value={email} onChange={setEmail} placeholder="contacto@miempresa.com" />
            </div>
            <div>
              <FieldLabel>Sitio web</FieldLabel>
              <TextInput value={website} onChange={setWebsite} placeholder="https://miempresa.com" />
            </div>
            <div>
              <FieldLabel>Direccion</FieldLabel>
              <TextInput value={address} onChange={setAddress} placeholder="Ciudad de Mexico, CDMX" />
            </div>
          </div>
        </SectionCard>

        {/* FAQs */}
        <SectionCard title="Preguntas Frecuentes" icon={<MessageCircle size={16} className="text-[#6366f1]" />}>
          <div className="space-y-3">
            {faqs.map((f, i) => (
              <div key={i} className="rounded-lg border border-[#2a2a2a] p-3 space-y-2" style={{ backgroundColor: "#252525" }}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#666]">FAQ {i + 1}</span>
                  {faqs.length > 1 && (
                    <button onClick={() => removeFaq(i)} className="text-[#888] hover:text-red-400 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
                <TextInput value={f.question} onChange={(v) => updateFaq(i, "question", v)} placeholder="Pregunta frecuente" />
                <TextArea value={f.answer} onChange={(v) => updateFaq(i, "answer", v)} placeholder="Respuesta" rows={2} />
              </div>
            ))}
            <button
              onClick={addFaq}
              className="flex items-center gap-1.5 text-[12px] text-[#3ecf8e] hover:text-[#5ae0a8] transition-colors"
            >
              <Plus size={14} /> Agregar pregunta
            </button>
          </div>
        </SectionCard>

        {/* Tone & Language */}
        <SectionCard title="Tono y Lenguaje" icon={<Languages size={16} className="text-[#3ecf8e]" />}>
          <div className="space-y-4">
            <div>
              <FieldLabel>Tono de comunicacion</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                {toneOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTone(opt.value)}
                    className="rounded-lg border p-3 text-left transition-colors"
                    style={{
                      backgroundColor: tone === opt.value ? "#2a2a2a" : "#222",
                      borderColor: tone === opt.value ? "#3ecf8e" : "#333",
                    }}
                  >
                    <p className="text-[13px] font-medium" style={{ color: tone === opt.value ? "#3ecf8e" : "#ededed" }}>
                      {opt.label}
                    </p>
                    <p className="text-[11px] text-[#888]">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <FieldLabel>Idioma de respuestas</FieldLabel>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setLanguage("es")}
                  className="px-4 py-2 rounded-lg border text-[13px] transition-colors"
                  style={{
                    backgroundColor: language === "es" ? "#2a2a2a" : "#222",
                    borderColor: language === "es" ? "#3ecf8e" : "#333",
                    color: language === "es" ? "#3ecf8e" : "#ededed",
                  }}
                >
                  Espanol
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage("en")}
                  className="px-4 py-2 rounded-lg border text-[13px] transition-colors"
                  style={{
                    backgroundColor: language === "en" ? "#2a2a2a" : "#222",
                    borderColor: language === "en" ? "#3ecf8e" : "#333",
                    color: language === "en" ? "#3ecf8e" : "#ededed",
                  }}
                >
                  English
                </button>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* AI Settings */}
        <SectionCard title="Configuracion de IA" icon={<Zap size={16} className="text-[#f59e0b]" />}>
          <div className="space-y-1">
            <ToggleSwitch
              enabled={autoReplyEnabled}
              onChange={setAutoReplyEnabled}
              label="Respuestas automaticas activadas"
            />
            <ToggleSwitch
              enabled={qualifyLeads}
              onChange={setQualifyLeads}
              label="Calificar y puntuar leads automaticamente"
            />
            <ToggleSwitch
              enabled={createDeals}
              onChange={setCreateDeals}
              label="Crear deals automaticamente al calificar un lead"
            />
          </div>
          <div className="mt-4">
            <FieldLabel>Instrucciones personalizadas (opcional)</FieldLabel>
            <TextArea
              value={customInstructions}
              onChange={setCustomInstructions}
              placeholder="Instrucciones adicionales para la IA, ej: 'Siempre ofrece una demo gratuita', 'Menciona nuestra garantia de 30 dias'..."
              rows={4}
            />
          </div>
        </SectionCard>

        {/* Bottom save button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={handleSave}
            disabled={saving || !businessName.trim()}
            className="flex items-center gap-1.5 text-[13px] text-black px-5 py-2 rounded-lg font-medium disabled:opacity-50 transition-opacity"
            style={{ backgroundColor: "#3ecf8e" }}
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : saved ? (
              <CheckCircle size={14} />
            ) : (
              <Save size={14} />
            )}
            {saving ? "Guardando..." : saved ? "Guardado" : "Guardar configuracion"}
          </button>
        </div>
      </div>
    </>
  );
}
