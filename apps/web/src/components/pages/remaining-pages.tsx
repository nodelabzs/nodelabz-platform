"use client";

import { useState } from "react";
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
} from "lucide-react";

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
  const conversations = [
    { name: "Maria Rodriguez", lastMsg: "Hola, me interesa el plan Profesional", time: "Hace 5m", unread: 2 },
    { name: "Carlos Mora", lastMsg: "Gracias por la informacion!", time: "Hace 1h", unread: 0 },
    { name: "Ana Jimenez", lastMsg: "Cuando pueden hacer la demo?", time: "Hace 3h", unread: 1 },
    { name: "Diego Solis", lastMsg: "Perfecto, quedamos asi", time: "Ayer", unread: 0 },
  ];

  return (
    <>
      <SectionHeader title="Conversaciones" description="Mensajes de WhatsApp Business" />
      <div className="flex gap-4" style={{ height: 500 }}>
        <div className="w-[280px] rounded-lg border border-[#2e2e2e] overflow-hidden flex flex-col" style={{ backgroundColor: "#1e1e1e" }}>
          <div className="p-3 border-b border-[#2e2e2e]">
            <div className="flex items-center gap-2 h-[32px] px-2 rounded border border-[#333]" style={{ backgroundColor: "#252525" }}>
              <Search size={12} className="text-[#666]" />
              <input placeholder="Buscar..." className="flex-1 bg-transparent text-[12px] text-[#ededed] placeholder:text-[#555] outline-none" />
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            {conversations.map((c, i) => (
              <div key={i} className={`px-3 py-2.5 border-b border-[#2e2e2e] cursor-pointer hover:bg-[#252525] transition-colors ${i === 0 ? "bg-[#252525]" : ""}`}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[13px] font-medium text-[#ededed]">{c.name}</span>
                  <span className="text-[10px] text-[#888]">{c.time}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#888] truncate max-w-[180px]">{c.lastMsg}</span>
                  {c.unread > 0 && (
                    <span className="w-4 h-4 rounded-full text-[9px] flex items-center justify-center text-white" style={{ backgroundColor: "#3ecf8e" }}>
                      {c.unread}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 rounded-lg border border-[#2e2e2e] flex flex-col" style={{ backgroundColor: "#1e1e1e" }}>
          <div className="px-4 py-3 border-b border-[#2e2e2e] flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: "#25D366" }}>
              <span className="text-[12px] font-bold text-white">MR</span>
            </div>
            <div>
              <p className="text-[13px] font-medium text-[#ededed]">Maria Rodriguez</p>
              <p className="text-[10px] text-[#888]">En linea</p>
            </div>
          </div>
          <div className="flex-1 p-4 space-y-2">
            <div className="flex justify-start">
              <div className="max-w-[70%] rounded-lg px-3 py-2 text-[13px] text-[#ccc]" style={{ backgroundColor: "#252525" }}>
                Hola, me interesa el plan Profesional. Pueden darme mas detalles?
              </div>
            </div>
            <div className="flex justify-end">
              <div className="max-w-[70%] rounded-lg px-3 py-2 text-[13px] text-black" style={{ backgroundColor: "#25D366" }}>
                Hola Maria! Claro, el plan Profesional incluye...
              </div>
            </div>
          </div>
          <div className="px-3 py-3 border-t border-[#2e2e2e]">
            <div className="flex items-center gap-2 h-[36px] px-3 rounded-lg border border-[#333]" style={{ backgroundColor: "#252525" }}>
              <input placeholder="Escribe un mensaje..." className="flex-1 bg-transparent text-[13px] text-[#ededed] placeholder:text-[#555] outline-none" />
              <button className="text-[#25D366]"><Send size={16} /></button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function PlantillasWAPage() {
  const templates = [
    { name: "Bienvenida", status: "approved", category: "Marketing" },
    { name: "Seguimiento Lead", status: "approved", category: "CRM" },
    { name: "Confirmacion de Cita", status: "pending", category: "Utility" },
    { name: "Promocion Especial", status: "rejected", category: "Marketing" },
  ];

  const statusColors: Record<string, string> = { approved: "#3ecf8e", pending: "#f59e0b", rejected: "#ef4444" };

  return (
    <>
      <SectionHeader title="Plantillas WhatsApp" description="Plantillas aprobadas por Meta" />
      <div className="space-y-3">
        {templates.map((t) => (
          <div key={t.name} className="rounded-lg border border-[#2e2e2e] p-4 flex items-center justify-between" style={{ backgroundColor: "#1e1e1e" }}>
            <div>
              <p className="text-[13px] font-medium text-[#ededed]">{t.name}</p>
              <p className="text-[11px] text-[#888]">{t.category}</p>
            </div>
            <Badge text={t.status === "approved" ? "Aprobada" : t.status === "pending" ? "Pendiente" : "Rechazada"} color={statusColors[t.status]} />
          </div>
        ))}
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
  return (
    <>
      <SectionHeader title="Numero Conectado" description="Configuracion de tu numero de WhatsApp Business" />
      <div className="rounded-lg border border-[#2e2e2e] p-4" style={{ backgroundColor: "#1e1e1e" }}>
        <div className="flex items-center gap-3 mb-4">
          <Phone size={20} className="text-[#25D366]" />
          <div>
            <p className="text-[14px] font-medium text-[#ededed]">+506 8888-8888</p>
            <p className="text-[11px] text-[#888]">WhatsApp Business API</p>
          </div>
          <Badge text="Conectado" color="#3ecf8e" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between py-2 px-3 rounded" style={{ backgroundColor: "#252525" }}>
            <span className="text-[12px] text-[#888]">Estado de verificacion</span>
            <Badge text="Verificado" color="#3ecf8e" />
          </div>
          <div className="flex items-center justify-between py-2 px-3 rounded" style={{ backgroundColor: "#252525" }}>
            <span className="text-[12px] text-[#888]">Tier de mensajeria</span>
            <span className="text-[12px] text-[#ededed]">Tier 2 (10K/dia)</span>
          </div>
        </div>
      </div>
    </>
  );
}

export function ReglasWAPage() {
  return (
    <>
      <SectionHeader title="Reglas" description="Reglas de enrutamiento y respuesta" />
      <div className="space-y-3">
        {[
          { rule: "Horario laboral", desc: "Responder automaticamente fuera de horario (8am-6pm)" },
          { rule: "Palabras clave", desc: "Detectar 'precio', 'demo', 'cotizacion' y asignar a ventas" },
          { rule: "Idioma", desc: "Detectar idioma y responder en el mismo" },
        ].map((r) => (
          <div key={r.rule} className="rounded-lg border border-[#2e2e2e] p-4 flex items-center justify-between" style={{ backgroundColor: "#1e1e1e" }}>
            <div>
              <p className="text-[13px] font-medium text-[#ededed]">{r.rule}</p>
              <p className="text-[11px] text-[#888]">{r.desc}</p>
            </div>
            <button className="w-10 h-5 rounded-full relative" style={{ backgroundColor: "#3ecf8e" }}>
              <div className="w-4 h-4 rounded-full bg-white absolute right-0.5 top-0.5" />
            </button>
          </div>
        ))}
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
          <p className="text-[20px] font-semibold text-[#ededed]">2,450</p>
        </div>
        <div className="rounded-lg border border-[#2e2e2e] p-4" style={{ backgroundColor: "#1e1e1e" }}>
          <p className="text-[11px] text-[#888] mb-1">Engagement</p>
          <p className="text-[20px] font-semibold text-[#ededed]">4.2%</p>
        </div>
        <div className="rounded-lg border border-[#2e2e2e] p-4" style={{ backgroundColor: "#1e1e1e" }}>
          <p className="text-[11px] text-[#888] mb-1">Posts este mes</p>
          <p className="text-[20px] font-semibold text-[#ededed]">12</p>
        </div>
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
  const workflows = [
    { name: "Lead HOT Follow-up", status: "active", runs: 145, lastRun: "Hace 2h" },
    { name: "Welcome Email", status: "active", runs: 384, lastRun: "Hace 30m" },
    { name: "Cart Abandoned", status: "paused", runs: 67, lastRun: "Hace 3 dias" },
    { name: "Re-engagement 30d", status: "active", runs: 23, lastRun: "Ayer" },
  ];

  return (
    <>
      <SectionHeader
        title="Todos los Workflows"
        description="Automatizaciones activas"
        action={<button className="flex items-center gap-1.5 text-[12px] text-black px-3 py-1.5 rounded font-medium" style={{ backgroundColor: "#3ecf8e" }}><Plus size={14} />Crear workflow</button>}
      />
      <div className="space-y-3">
        {workflows.map((w) => (
          <div key={w.name} className="rounded-lg border border-[#2e2e2e] p-4 flex items-center justify-between hover:border-[#3ecf8e]/30 transition-colors cursor-pointer" style={{ backgroundColor: "#1e1e1e" }}>
            <div className="flex items-center gap-3">
              <Workflow size={16} className="text-[#6366f1]" />
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-medium text-[#ededed]">{w.name}</p>
                  <Badge text={w.status === "active" ? "Activo" : "Pausado"} color={w.status === "active" ? "#3ecf8e" : "#f59e0b"} />
                </div>
                <p className="text-[11px] text-[#888]">{w.runs} ejecuciones · Ultimo: {w.lastRun}</p>
              </div>
            </div>
            <button className="text-[#888] hover:text-[#ededed]">
              {w.status === "active" ? <Pause size={16} /> : <Play size={16} />}
            </button>
          </div>
        ))}
      </div>
    </>
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
  const executions = [
    { workflow: "Lead HOT Follow-up", status: "success", contact: "Maria Rodriguez", time: "Hace 2h" },
    { workflow: "Welcome Email", status: "success", contact: "Carlos Mora", time: "Hace 30m" },
    { workflow: "Lead HOT Follow-up", status: "error", contact: "Ana Jimenez", time: "Hace 4h" },
    { workflow: "Re-engagement 30d", status: "success", contact: "Laura Hernandez", time: "Ayer" },
  ];

  return (
    <>
      <SectionHeader title="Ejecuciones Recientes" description="Historial de automatizaciones ejecutadas" />
      <div className="space-y-2">
        {executions.map((e, i) => (
          <div key={i} className="rounded-lg border border-[#2e2e2e] p-3 flex items-center gap-3" style={{ backgroundColor: "#1e1e1e" }}>
            {e.status === "success" ? <CheckCircle size={14} className="text-[#3ecf8e]" /> : <AlertTriangle size={14} className="text-[#ef4444]" />}
            <div className="flex-1">
              <p className="text-[13px] text-[#ededed]">
                <span className="font-medium">{e.workflow}</span>
                <span className="text-[#888]"> — {e.contact}</span>
              </p>
            </div>
            <span className="text-[11px] text-[#666]">{e.time}</span>
          </div>
        ))}
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
  return (
    <>
      <SectionHeader title="Resumen Ejecutivo" description="Vista general del rendimiento del negocio" />
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="rounded-lg border border-[#2e2e2e] p-4" style={{ backgroundColor: "#1e1e1e" }}>
          <p className="text-[11px] text-[#888] mb-1">Revenue</p>
          <p className="text-[20px] font-semibold text-[#ededed]">$12,450</p>
        </div>
        <div className="rounded-lg border border-[#2e2e2e] p-4" style={{ backgroundColor: "#1e1e1e" }}>
          <p className="text-[11px] text-[#888] mb-1">Leads</p>
          <p className="text-[20px] font-semibold text-[#ededed]">384</p>
        </div>
        <div className="rounded-lg border border-[#2e2e2e] p-4" style={{ backgroundColor: "#1e1e1e" }}>
          <p className="text-[11px] text-[#888] mb-1">Conversion</p>
          <p className="text-[20px] font-semibold text-[#ededed]">3.2%</p>
        </div>
        <div className="rounded-lg border border-[#2e2e2e] p-4" style={{ backgroundColor: "#1e1e1e" }}>
          <p className="text-[11px] text-[#888] mb-1">ROAS</p>
          <p className="text-[20px] font-semibold text-[#ededed]">4.2x</p>
        </div>
      </div>
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

const rpSummaryCards = [
  { label: "Revenue", value: "$45,200", change: "+12%", up: true },
  { label: "Leads", value: "1,247", change: "+23%", up: true },
  { label: "ROAS", value: "4.2x", change: "+15%", up: true },
  { label: "Win Rate", value: "7.1%", change: "-2%", up: false },
];

const rpFunnelStages = [
  { stage: "Impresiones", value: 125000, width: 100, color: "#3b82f6" },
  { stage: "Clics", value: 8750, width: 70, color: "#06b6d4" },
  { stage: "Leads", value: 1247, width: 50, color: "#22c55e" },
  { stage: "Calificados", value: 450, width: 35, color: "#eab308" },
  { stage: "Deals", value: 156, width: 20, color: "#f97316" },
  { stage: "Cerrados", value: 42, width: 10, color: "#3ecf8e" },
];

const rpChannelData = [
  { channel: "Meta Ads", spend: 4200, revenue: 18500, roas: 4.4 },
  { channel: "Google Ads", spend: 3100, revenue: 14200, roas: 4.6 },
  { channel: "TikTok", spend: 1200, revenue: 4800, roas: 4.0 },
  { channel: "Email", spend: 800, revenue: 5200, roas: 6.5 },
  { channel: "WhatsApp", spend: 400, revenue: 2500, roas: 6.3 },
];

const rpTreemapData = [
  { name: "Meta Ads", size: 4200, color: "#3b82f6" },
  { name: "Google Ads", size: 3100, color: "#f59e0b" },
  { name: "TikTok", size: 1200, color: "#ef4444" },
  { name: "Email Tools", size: 800, color: "#8b5cf6" },
  { name: "WhatsApp", size: 400, color: "#22c55e" },
  { name: "Otros", size: 300, color: "#6b7280" },
];

const rpRevenueData = [
  { month: "Sep", revenue: 28000, predicted: null },
  { month: "Oct", revenue: 31500, predicted: null },
  { month: "Nov", revenue: 35200, predicted: null },
  { month: "Dic", revenue: 38900, predicted: null },
  { month: "Ene", revenue: 40300, predicted: null },
  { month: "Feb", revenue: 45200, predicted: 45200 },
  { month: "Mar", revenue: null, predicted: 51000 },
  { month: "Abr", revenue: null, predicted: 57500 },
];

const rpTreemapColors: Record<string, string> = {
  "Meta Ads": "#3b82f6",
  "Google Ads": "#f59e0b",
  "TikTok": "#ef4444",
  "Email Tools": "#8b5cf6",
  "WhatsApp": "#22c55e",
  "Otros": "#6b7280",
};

function RpCustomTreemapContent(props: {
  x: number;
  y: number;
  width: number;
  height: number;
  name?: string;
  size?: number;
  index?: number;
}) {
  const { x, y, width, height, name, size } = props;
  if (!width || !height || width < 4 || height < 4) return null;
  const color = rpTreemapColors[name || ""] || "#3ecf8e";
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
  const [metrics, setMetrics] = useState(rpMetricGroups);
  const [reportName] = useState("Reporte Ejecutivo - Febrero 2026");
  const [period] = useState("Febrero 2026");

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
      {/* ---- TOP BAR ---- */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 0",
          borderBottom: "1px solid #2e2e2e",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <h1 style={{ fontSize: 16, fontWeight: 700, margin: 0, whiteSpace: "nowrap", color: "#ededed" }}>
            Report Builder{" "}
            <span style={{ color: "#a3a3a3", fontWeight: 400 }}>
              — Reporte Personalizado
            </span>
          </h1>
          <input
            value={reportName}
            readOnly
            style={{
              background: "#171717",
              border: "1px solid #2e2e2e",
              borderRadius: 6,
              padding: "6px 12px",
              color: "#ededed",
              fontSize: 13,
              width: 280,
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <select
            value={period}
            style={{
              background: "#171717",
              border: "1px solid #2e2e2e",
              borderRadius: 6,
              padding: "6px 12px",
              color: "#ededed",
              fontSize: 13,
            }}
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

      {/* ---- BODY ---- */}
      <div style={{ display: "flex", minHeight: "calc(100vh - 180px)" }}>
        {/* ---- LEFT SIDEBAR ---- */}
        <aside
          style={{
            width: 220,
            minWidth: 220,
            borderRight: "1px solid #2e2e2e",
            backgroundColor: "#1c1c1c",
            padding: "16px 12px",
            overflowY: "auto",
            borderRadius: "10px 0 0 10px",
          }}
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
        <main style={{ flex: 1, padding: 24, overflowY: "auto" }}>
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

export function IntegrationPage({ platform, connected }: { platform: string; connected?: boolean }) {
  return (
    <>
      <SectionHeader title={platform} description={connected ? `${platform} conectado a NodeLabz` : `Conectar ${platform}`} />
      <div className="rounded-lg border border-[#2e2e2e] p-4" style={{ backgroundColor: "#1e1e1e" }}>
        {connected ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-[#3ecf8e]" />
                <span className="text-[13px] text-[#ededed]">Conectado</span>
              </div>
              <button className="text-[11px] px-3 py-1 rounded border border-[#333] text-[#888]">Desconectar</button>
            </div>
            <div className="flex items-center justify-between py-2 px-3 rounded" style={{ backgroundColor: "#252525" }}>
              <span className="text-[12px] text-[#888]">Ultima sincronizacion</span>
              <span className="text-[12px] text-[#ededed]">Hace 15 minutos</span>
            </div>
            <div className="flex items-center justify-between py-2 px-3 rounded" style={{ backgroundColor: "#252525" }}>
              <span className="text-[12px] text-[#888]">Datos importados</span>
              <span className="text-[12px] text-[#ededed]">2,450 registros</span>
            </div>
            <button className="flex items-center gap-1.5 text-[12px] text-[#ccc] px-3 py-1.5 rounded border border-[#333]">
              <RefreshCw size={12} />
              Sincronizar ahora
            </button>
          </div>
        ) : (
          <div className="text-center py-8">
            <Plug size={32} className="text-[#555] mx-auto mb-3" />
            <p className="text-[13px] text-[#888] mb-4">Conecta {platform} para importar datos automaticamente</p>
            <button className="text-[12px] text-black px-4 py-2 rounded font-medium" style={{ backgroundColor: "#3ecf8e" }}>
              Conectar {platform}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export function OAuthTokensPage() {
  return (
    <>
      <SectionHeader title="OAuth Tokens" description="Gestion de tokens de autenticacion" />
      <div className="rounded-lg border border-[#2e2e2e] p-4" style={{ backgroundColor: "#1e1e1e" }}>
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck size={14} className="text-[#3ecf8e]" />
          <span className="text-[13px] font-medium text-[#ededed]">Tokens activos</span>
        </div>
        <div className="space-y-2">
          {["Meta Ads", "Google Ads"].map((p) => (
            <div key={p} className="flex items-center justify-between py-2 px-3 rounded" style={{ backgroundColor: "#252525" }}>
              <span className="text-[12px] text-[#ccc]">{p}</span>
              <div className="flex items-center gap-2">
                <Badge text="Activo" color="#3ecf8e" />
                <span className="text-[11px] text-[#888]">Expira en 58 dias</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export function SyncStatusPage() {
  return (
    <>
      <SectionHeader title="Sync Status" description="Estado de sincronizacion de datos" />
      <div className="space-y-2">
        {[
          { platform: "Meta Ads", status: "synced", lastSync: "Hace 15m", records: "2,450" },
          { platform: "Google Ads", status: "syncing", lastSync: "Ahora", records: "1,890" },
          { platform: "GA4", status: "error", lastSync: "Hace 2h", records: "Error" },
        ].map((s) => (
          <div key={s.platform} className="rounded-lg border border-[#2e2e2e] p-3 flex items-center justify-between" style={{ backgroundColor: "#1e1e1e" }}>
            <div>
              <p className="text-[13px] font-medium text-[#ededed]">{s.platform}</p>
              <p className="text-[11px] text-[#888]">Ultima sync: {s.lastSync} · {s.records} registros</p>
            </div>
            <Badge
              text={s.status === "synced" ? "Sincronizado" : s.status === "syncing" ? "Sincronizando..." : "Error"}
              color={s.status === "synced" ? "#3ecf8e" : s.status === "syncing" ? "#f59e0b" : "#ef4444"}
            />
          </div>
        ))}
      </div>
    </>
  );
}

// ============================
// SETTINGS
// ============================

export function PerfilPage() {
  return (
    <>
      <SectionHeader title="Perfil" description="Tu perfil de usuario" />
      <div className="max-w-lg space-y-4">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-[20px] font-bold text-[#ededed]" style={{ backgroundColor: "#2a2a2a" }}>F</div>
          <div>
            <p className="text-[14px] font-medium text-[#ededed]">Federico Tafur</p>
            <p className="text-[12px] text-[#888]">Admin</p>
          </div>
        </div>
        {[
          { label: "Nombre", value: "Federico Tafur" },
          { label: "Email", value: "federico@nodelabz.com" },
        ].map((f) => (
          <div key={f.label}>
            <label className="text-[12px] text-[#888] block mb-1.5">{f.label}</label>
            <input defaultValue={f.value} className="w-full h-[38px] px-3 rounded-lg border border-[#333] text-[13px] text-[#ededed] outline-none" style={{ backgroundColor: "#222" }} />
          </div>
        ))}
        <button className="text-[12px] text-black px-4 py-2 rounded font-medium" style={{ backgroundColor: "#3ecf8e" }}>Guardar</button>
      </div>
    </>
  );
}

export function EquipoPage() {
  const members = [
    { name: "Federico Tafur", email: "federico@nodelabz.com", role: "Admin" },
    { name: "Maria Lopez", email: "maria@nodelabz.com", role: "Editor" },
  ];

  return (
    <>
      <SectionHeader
        title="Equipo"
        description="Miembros de tu organizacion"
        action={<button className="flex items-center gap-1.5 text-[12px] text-black px-3 py-1.5 rounded font-medium" style={{ backgroundColor: "#3ecf8e" }}><Plus size={14} />Invitar</button>}
      />
      <div className="space-y-2">
        {members.map((m) => (
          <div key={m.email} className="rounded-lg border border-[#2e2e2e] p-4 flex items-center justify-between" style={{ backgroundColor: "#1e1e1e" }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold text-[#ededed]" style={{ backgroundColor: "#2a2a2a" }}>
                {m.name[0]}
              </div>
              <div>
                <p className="text-[13px] font-medium text-[#ededed]">{m.name}</p>
                <p className="text-[11px] text-[#888]">{m.email}</p>
              </div>
            </div>
            <Badge text={m.role} color={m.role === "Admin" ? "#f59e0b" : "#6366f1"} />
          </div>
        ))}
      </div>
    </>
  );
}

export function RolesPermisosPage() {
  return (
    <>
      <SectionHeader title="Roles y Permisos" description="Configura roles y permisos del equipo" />
      <div className="space-y-3">
        {["Admin", "Manager", "Editor", "Viewer"].map((role) => (
          <div key={role} className="rounded-lg border border-[#2e2e2e] p-4 flex items-center justify-between" style={{ backgroundColor: "#1e1e1e" }}>
            <div>
              <p className="text-[13px] font-medium text-[#ededed]">{role}</p>
              <p className="text-[11px] text-[#888]">
                {role === "Admin" ? "Acceso total" : role === "Manager" ? "Gestion sin facturacion" : role === "Editor" ? "Crear y editar contenido" : "Solo lectura"}
              </p>
            </div>
            <button className="text-[11px] px-3 py-1 rounded border border-[#333] text-[#888]">Editar</button>
          </div>
        ))}
      </div>
    </>
  );
}

export function PlanActualPage() {
  return (
    <>
      <SectionHeader title="Plan Actual" description="Tu suscripcion actual" />
      <div className="rounded-lg border border-[#3ecf8e]/30 p-6" style={{ backgroundColor: "#1e2a22" }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[18px] font-semibold text-[#ededed]">Plan Inicio</h3>
            <p className="text-[13px] text-[#888]">$39/mes</p>
          </div>
          <Badge text="Activo" color="#3ecf8e" />
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { label: "Contactos", value: "0/500" },
            { label: "Emails/mes", value: "0/5,000" },
            { label: "AI Calls", value: "0/1,000" },
            { label: "Usuarios", value: "2/3" },
          ].map((m) => (
            <div key={m.label} className="py-2 px-3 rounded" style={{ backgroundColor: "#252525" }}>
              <p className="text-[11px] text-[#888]">{m.label}</p>
              <p className="text-[13px] text-[#ededed]">{m.value}</p>
            </div>
          ))}
        </div>
        <button className="text-[12px] text-black px-4 py-2 rounded font-medium w-full text-center" style={{ backgroundColor: "#3ecf8e" }}>
          Upgrade a Crecimiento
        </button>
      </div>
    </>
  );
}

export function MetodoPagoPage() {
  return (
    <>
      <SectionHeader title="Metodo de Pago" description="Gestiona tu metodo de pago" />
      <div className="rounded-lg border border-[#2e2e2e] p-4" style={{ backgroundColor: "#1e1e1e" }}>
        <div className="flex items-center gap-3 mb-4">
          <CreditCard size={20} className="text-[#6366f1]" />
          <div>
            <p className="text-[13px] font-medium text-[#ededed]">**** **** **** 4242</p>
            <p className="text-[11px] text-[#888]">Visa · Expira 12/2027</p>
          </div>
        </div>
        <button className="text-[11px] px-3 py-1.5 rounded border border-[#333] text-[#ccc]">Cambiar metodo de pago</button>
      </div>
    </>
  );
}

export function HistorialPagosPage() {
  return (
    <>
      <SectionHeader title="Historial de Pagos" description="Historial de facturacion" />
      <div className="rounded-lg border border-[#2e2e2e] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr style={{ backgroundColor: "#1e1e1e" }}>
              {["Fecha", "Concepto", "Monto", "Estado"].map((h) => (
                <th key={h} className="text-left text-[11px] uppercase tracking-wider text-[#888] font-medium px-4 py-3 border-b border-[#2e2e2e]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { date: "Mar 1, 2026", concept: "Plan Inicio - Marzo", amount: "$39.00", status: "Pagado" },
              { date: "Feb 1, 2026", concept: "Plan Inicio - Febrero", amount: "$39.00", status: "Pagado" },
              { date: "Jan 1, 2026", concept: "Plan Inicio - Enero", amount: "$39.00", status: "Pagado" },
            ].map((p, i) => (
              <tr key={i} className="border-b border-[#2e2e2e] last:border-0">
                <td className="px-4 py-3 text-[13px] text-[#888]">{p.date}</td>
                <td className="px-4 py-3 text-[13px] text-[#ccc]">{p.concept}</td>
                <td className="px-4 py-3 text-[13px] text-[#ededed]">{p.amount}</td>
                <td className="px-4 py-3"><Badge text={p.status} color="#3ecf8e" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
  return (
    <>
      <SectionHeader title="Notificaciones" description="Preferencias de notificaciones" />
      <div className="max-w-lg space-y-3">
        {[
          { label: "Nuevos leads", desc: "Notificar cuando llega un lead nuevo" },
          { label: "Deals cerrados", desc: "Notificar cuando se cierra un deal" },
          { label: "Recomendaciones IA", desc: "Alertas de la IA sobre oportunidades" },
          { label: "Reportes", desc: "Notificacion de reportes programados" },
        ].map((n) => (
          <div key={n.label} className="rounded-lg border border-[#2e2e2e] p-4 flex items-center justify-between" style={{ backgroundColor: "#1e1e1e" }}>
            <div>
              <p className="text-[13px] font-medium text-[#ededed]">{n.label}</p>
              <p className="text-[11px] text-[#888]">{n.desc}</p>
            </div>
            <button className="w-10 h-5 rounded-full relative" style={{ backgroundColor: "#3ecf8e" }}>
              <div className="w-4 h-4 rounded-full bg-white absolute right-0.5 top-0.5" />
            </button>
          </div>
        ))}
      </div>
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
