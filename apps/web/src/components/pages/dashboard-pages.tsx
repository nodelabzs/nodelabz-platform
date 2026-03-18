"use client";

import React, { useCallback, useState, useMemo, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
} from "recharts";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  BarChart3,
  Target,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Globe,
  Layers,
  Lightbulb,
  Newspaper,
  Plug,
  FileText,
  Megaphone,
  Search,
  Music2,
  Mail,
  MessageCircle,
  CreditCard,
  ShoppingBag,
  X,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  GripVertical,
  Settings,
  RotateCcw,
  LayoutDashboard,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ============================
// SHARED COMPONENTS
// ============================

function StatCard({
  label,
  value,
  change,
  changeType = "neutral",
  icon,
}: {
  label: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: React.ReactNode;
}) {
  return (
    <div
      className="rounded-lg p-4 border border-[#2e2e2e]"
      style={{ backgroundColor: "#1e1e1e" }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] text-[#888]">{label}</span>
        {icon && <span className="text-[#555]">{icon}</span>}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-[22px] font-semibold text-[#ededed]">{value}</span>
        {change && (
          <span
            className={`flex items-center gap-0.5 text-[12px] ${
              changeType === "positive"
                ? "text-[#3ecf8e]"
                : changeType === "negative"
                  ? "text-[#ef4444]"
                  : "text-[#888]"
            }`}
          >
            {changeType === "positive" && <ArrowUpRight size={12} />}
            {changeType === "negative" && <ArrowDownRight size={12} />}
            {changeType === "neutral" && <Minus size={12} />}
            {change}
          </span>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-[20px] font-semibold text-[#ededed]">{title}</h1>
      {description && (
        <p className="text-[13px] text-[#888] mt-1">{description}</p>
      )}
    </div>
  );
}

function EmptyState({ title, description, icon }: { title: string; description: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: "#2a2a2a" }}>
        {icon}
      </div>
      <h3 className="text-[15px] font-medium text-[#ededed] mb-1">{title}</h3>
      <p className="text-[13px] text-[#888] max-w-sm">{description}</p>
    </div>
  );
}

function DataTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | React.ReactNode)[][];
}) {
  return (
    <div className="rounded-lg border border-[#2e2e2e] overflow-hidden">
      <table className="w-full">
        <thead>
          <tr style={{ backgroundColor: "#1e1e1e" }}>
            {headers.map((h) => (
              <th
                key={h}
                className="text-left text-[11px] uppercase tracking-wider text-[#888] font-medium px-4 py-3 border-b border-[#2e2e2e]"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="border-b border-[#2e2e2e] last:border-0 hover:bg-[#1e1e1e] transition-colors"
            >
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-[13px] text-[#ccc]">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProgressBar({ value, max, color = "#3ecf8e" }: { value: number; max: number; color?: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="w-full h-2 rounded-full" style={{ backgroundColor: "#2a2a2a" }}>
      <div
        className="h-2 rounded-full transition-all"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

function Badge({ text, color = "#3ecf8e" }: { text: string; color?: string }) {
  return (
    <span
      className="text-[10px] px-2 py-0.5 rounded-full font-medium"
      style={{ backgroundColor: color + "20", color }}
    >
      {text}
    </span>
  );
}

// ============================
// DASHBOARD SECTION
// ============================

export function HomePage() {
  // ── tRPC queries ──
  const { data: session } = trpc.auth.getSession.useQuery();
  const { data: contactsData, isLoading: contactsLoading } = trpc.contacts.list.useQuery({ page: 1, limit: 1 });
  const { data: dealStats, isLoading: dealsLoading } = trpc.deals.getStats.useQuery();
  const { data: integrations, isLoading: integrationsLoading } = trpc.integrations.list.useQuery();
  const { data: healthScore } = trpc.healthScore.getCurrent.useQuery();
  const { data: usage, isLoading: usageLoading } = trpc.billing.getUsage.useQuery();

  // ── Derived values ──
  const contactCount = contactsData?.total ?? 0;
  const integrationCount = integrations?.length ?? 0;
  const connectedIntegrations = integrations?.filter((i) => i.status === "active") ?? [];
  const totalPipelineValue = dealStats?.totalValue ?? 0;
  const planName = session?.tenant?.plan ?? "INICIO";
  const tenantSlug = session?.tenant?.slug ?? "nodelabz";
  const tenantName = session?.tenant?.name ?? "NodeLabz";

  // Plan display labels
  const planLabels: Record<string, string> = {
    INICIO: "Plan Inicio",
    CRECIMIENTO: "Plan Crecimiento",
    PROFESIONAL: "Plan Profesional",
    AGENCIA: "Plan Agencia",
  };
  const planPrices: Record<string, string> = {
    INICIO: "$39/mes",
    CRECIMIENTO: "$79/mes",
    PROFESIONAL: "$149/mes",
    AGENCIA: "$299/mes",
  };

  // Default pipeline stage colors (fallback for display)
  const stageColors: Record<string, string> = {
    nuevo: "#6366f1",
    contactado: "#8b5cf6",
    calificado: "#f59e0b",
    propuesta: "#3b82f6",
    negociacion: "#f97316",
    ganado: "#22c55e",
    perdido: "#ef4444",
  };

  // Build pipeline stages from real data or fallback
  const pipelineStages = useMemo(() => {
    const defaultStages = [
      { stage: "Nuevo", color: "#6366f1", count: 0 },
      { stage: "Contactado", color: "#8b5cf6", count: 0 },
      { stage: "Calificado", color: "#f59e0b", count: 0 },
      { stage: "Propuesta", color: "#3b82f6", count: 0 },
      { stage: "Negociacion", color: "#f97316", count: 0 },
      { stage: "Ganado", color: "#22c55e", count: 0 },
      { stage: "Perdido", color: "#ef4444", count: 0 },
    ];

    if (!dealStats?.dealsByStage || dealStats.dealsByStage.length === 0) {
      return defaultStages;
    }

    return dealStats.dealsByStage.map((s) => ({
      stage: s.stageName,
      color: stageColors[s.stageName.toLowerCase()] ?? "#888",
      count: s.count,
    }));
  }, [dealStats?.dealsByStage]);

  // Integration catalog with connected status
  const integrationCatalog = useMemo(() => {
    const catalog = [
      { name: "Meta Ads", platform: "meta_ads", desc: "Facebook & Instagram Ads", color: "#1877F2", letter: "M" },
      { name: "Google Ads", platform: "google_ads", desc: "Search, Display & YouTube", color: "#4285F4", letter: "G" },
      { name: "Google Analytics 4", platform: "ga4", desc: "Trafico web y conversiones", color: "#E37400", letter: "A" },
      { name: "TikTok Ads", platform: "tiktok", desc: "Campanas en TikTok", color: "#000", letter: "T" },
      { name: "Stripe", platform: "stripe", desc: "Pagos y revenue tracking", color: "#635BFF", letter: "S" },
    ];

    return catalog.map((ch) => {
      const match = integrations?.find((i) => i.platform === ch.platform);
      return {
        ...ch,
        connected: match?.status === "active",
        status: match?.status ?? null,
      };
    });
  }, [integrations]);

  // Usage meters
  const usageMeters = useMemo(() => {
    return [
      { label: "Contactos", used: usage?.contacts.used ?? 0, limit: usage?.contacts.limit ?? 500 },
      { label: "Emails/mes", used: usage?.emails.used ?? 0, limit: usage?.emails.limit ?? 5000 },
    ];
  }, [usage]);

  // Whether to show onboarding section
  const showOnboarding = connectedIntegrations.length === 0 || contactCount === 0;

  // Loading pulse class
  const pulse = "animate-pulse bg-[#333] rounded text-transparent select-none";

  // Status cards
  const statusCards = [
    {
      icon: <div className="grid grid-cols-3 gap-[3px]">{Array.from({ length: 9 }).map((_, i) => <div key={i} className="w-[5px] h-[5px] rounded-full" style={{ backgroundColor: "#3ecf8e" }} />)}</div>,
      label: "PLATAFORMA",
      value: "Operativa",
      valueColor: "#3ecf8e",
      loading: false,
    },
    {
      icon: <Users size={18} className={contactCount > 0 ? "text-[#3ecf8e]" : "text-[#888]"} />,
      label: "CRM",
      value: `${contactCount} contactos`,
      valueColor: contactCount > 0 ? "#3ecf8e" : "#888",
      loading: contactsLoading,
    },
    {
      icon: <Target size={18} className={connectedIntegrations.length > 0 ? "text-[#3ecf8e]" : "text-[#888]"} />,
      label: "MARKETING",
      value: connectedIntegrations.length > 0 ? `${connectedIntegrations.length} activas` : "Sin campanas",
      valueColor: connectedIntegrations.length > 0 ? "#3ecf8e" : "#888",
      loading: integrationsLoading,
    },
    {
      icon: <Plug size={18} className={integrationCount > 0 ? "text-[#3ecf8e]" : "text-[#888]"} />,
      label: "INTEGRACIONES",
      value: `${integrationCount} conectadas`,
      valueColor: integrationCount > 0 ? "#3ecf8e" : "#888",
      loading: integrationsLoading,
    },
  ];

  return (
    <>
      {/* ── Project header ── */}
      <div className="flex items-center gap-3 mb-5">
        <h1 className="text-[24px] font-semibold text-[#ededed]">{tenantName}</h1>
        <span
          className="text-[10px] font-semibold uppercase tracking-wider px-2 py-[3px] rounded"
          style={{ backgroundColor: "#3ecf8e20", color: "#3ecf8e" }}
        >
          Inicio
        </span>
        {healthScore && (
          <span
            className="text-[10px] font-semibold uppercase tracking-wider px-2 py-[3px] rounded ml-auto"
            style={{
              backgroundColor: healthScore.overallScore >= 60 ? "#3ecf8e20" : "#f59e0b20",
              color: healthScore.overallScore >= 60 ? "#3ecf8e" : "#f59e0b",
            }}
          >
            Health Score: {healthScore.overallScore}/100
          </span>
        )}
      </div>

      {/* Tenant URL */}
      <div className="flex items-center gap-2.5 mb-6">
        <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ backgroundColor: "#252525" }}>
          <Globe size={14} className="text-[#888]" />
        </div>
        <span className="text-[13px] text-[#888] font-mono">nodelabz.app/org/{tenantSlug}</span>
      </div>

      {/* ── Status row: 4 cards + plan card ── */}
      <div className="flex gap-4 mb-8">
        <div className="flex-1 grid grid-cols-2 gap-3">
          {statusCards.map((card) => (
            <div
              key={card.label}
              className="flex items-center gap-3.5 rounded-lg border border-[#2e2e2e] px-5 py-4"
              style={{ backgroundColor: "#1e1e1e" }}
            >
              <div className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#252525" }}>
                {card.icon}
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[#888] font-medium mb-0.5">{card.label}</p>
                <p className={`text-[15px] ${card.loading ? pulse : ""}`} style={{ color: card.loading ? "transparent" : card.valueColor }}>
                  {card.loading ? "Cargando..." : card.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Plan card */}
        <div
          className="w-[280px] flex-shrink-0 rounded-lg border border-[#2e2e2e] p-5 flex flex-col"
          style={{ backgroundColor: "#1e1e1e" }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#3ecf8e20" }}>
              <Layers size={18} className="text-[#3ecf8e]" />
            </div>
            <div>
              <p className="text-[14px] font-medium text-[#ededed]">{planLabels[planName] ?? `Plan ${planName}`}</p>
              <p className="text-[11px] text-[#888]">{planPrices[planName] ?? ""}{session?.tenant?.trialEndsAt ? " · Trial" : ""}</p>
            </div>
          </div>
          <div className="space-y-2.5 flex-1">
            {usageMeters.map((m) => (
              <div key={m.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-[#888]">{m.label}</span>
                  <span className={`text-[11px] text-[#ccc] ${usageLoading ? pulse : ""}`}>
                    {usageLoading ? "..." : `${m.used.toLocaleString()}/${m.limit === -1 ? "ilimitado" : m.limit.toLocaleString()}`}
                  </span>
                </div>
                <ProgressBar value={m.used} max={m.limit === -1 ? 1 : m.limit} color={m.limit !== -1 && m.used / m.limit > 0.8 ? "#f59e0b" : "#3ecf8e"} />
              </div>
            ))}
          </div>
          <button className="w-full mt-3 text-[12px] text-center py-2 rounded-md border border-[#333] text-[#ccc] hover:border-[#3ecf8e]/40 hover:text-[#ededed] transition-colors">
            Ver planes
          </button>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="h-px mb-8" style={{ backgroundColor: "#2e2e2e" }} />

      {/* ── Getting started (conditional) ── */}
      {showOnboarding && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#3ecf8e" }} />
              <h2 className="text-[16px] font-semibold text-[#ededed]">Primeros pasos</h2>
            </div>
            <button className="text-[12px] text-[#888] hover:text-[#ccc] transition-colors">Ocultar</button>
          </div>

          <div className="grid grid-cols-4 gap-4">
            {/* Description */}
            <div
              className="rounded-lg border border-[#2e2e2e] p-6 flex flex-col justify-center"
              style={{ backgroundColor: "#1e1e1e" }}
            >
              <p className="text-[10px] uppercase tracking-wider text-[#888] font-medium mb-3">CONFIGURA TU NEGOCIO</p>
              <p className="text-[13px] text-[#ccc] leading-relaxed">
                Conecta tus canales de marketing, importa tu base de clientes, y deja que la IA analice tus datos para optimizar resultados.
              </p>
            </div>

            {/* 1: Connect ad platforms */}
            <button
              className="rounded-lg border border-[#2e2e2e] p-6 text-left hover:border-[#3ecf8e]/40 transition-colors group"
              style={{ backgroundColor: "#1e1e1e" }}
            >
              <div className="w-10 h-10 rounded-md flex items-center justify-center mb-4" style={{ backgroundColor: "#252525" }}>
                <Plug size={18} className="text-[#888] group-hover:text-[#3ecf8e] transition-colors" />
              </div>
              <p className="text-[14px] font-medium text-[#ededed] mb-1">Conectar canales</p>
              <p className="text-[12px] text-[#888] leading-relaxed">
                Meta Ads, Google Ads, TikTok, GA4, Stripe
              </p>
            </button>

            {/* 2: Import contacts */}
            <button
              className="rounded-lg border border-[#2e2e2e] p-6 text-left hover:border-[#3ecf8e]/40 transition-colors group"
              style={{ backgroundColor: "#1e1e1e" }}
            >
              <div className="w-10 h-10 rounded-md flex items-center justify-center mb-4" style={{ backgroundColor: "#252525" }}>
                <Users size={18} className="text-[#888] group-hover:text-[#3ecf8e] transition-colors" />
              </div>
              <p className="text-[14px] font-medium text-[#ededed] mb-1">Importar clientes</p>
              <p className="text-[12px] text-[#888] leading-relaxed">
                CSV, Excel, o sync desde tus plataformas
              </p>
            </button>

            {/* 3: Ask AI */}
            <button
              className="rounded-lg border border-[#2e2e2e] p-6 text-left hover:border-[#3ecf8e]/40 transition-colors group"
              style={{ backgroundColor: "#1e1e1e" }}
            >
              <div className="w-10 h-10 rounded-md flex items-center justify-center mb-4" style={{ backgroundColor: "#252525" }}>
                <Zap size={18} className="text-[#888] group-hover:text-[#f59e0b] transition-colors" />
              </div>
              <p className="text-[14px] font-medium text-[#ededed] mb-1">Preguntar a la IA</p>
              <p className="text-[12px] text-[#888] leading-relaxed">
                Analisis, reportes y automatizaciones con chat
              </p>
            </button>
          </div>
        </div>
      )}

      {/* ── Divider ── */}
      {showOnboarding && <div className="h-px mb-8" style={{ backgroundColor: "#2e2e2e" }} />}

      {/* ── 3-column overview ── */}
      <div className="grid grid-cols-3 gap-5">
        {/* Pipeline — real data or fallback stages */}
        <div>
          <h3 className="text-[13px] font-medium text-[#ededed] mb-3">Pipeline de ventas</h3>
          <div className="rounded-lg border border-[#2e2e2e] p-4 space-y-3" style={{ backgroundColor: "#1e1e1e" }}>
            {pipelineStages.map((s) => (
              <div key={s.stage} className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-[12px] text-[#ccc] flex-1">{s.stage}</span>
                <span className={`text-[11px] ${s.count > 0 ? "text-[#ccc]" : "text-[#555]"} ${dealsLoading ? pulse : ""}`}>
                  {dealsLoading ? "..." : `${s.count} deals`}
                </span>
              </div>
            ))}
            <div className="pt-2 border-t border-[#2e2e2e] flex items-center justify-between">
              <span className="text-[11px] text-[#888]">Total en pipeline</span>
              <span className={`text-[13px] font-medium text-[#ededed] ${dealsLoading ? pulse : ""}`}>
                {dealsLoading ? "..." : `$${totalPipelineValue.toLocaleString()}`}
              </span>
            </div>
          </div>
        </div>

        {/* Integraciones — real status from API */}
        <div>
          <h3 className="text-[13px] font-medium text-[#ededed] mb-3">Integraciones</h3>
          <div className="rounded-lg border border-[#2e2e2e] divide-y divide-[#2e2e2e]" style={{ backgroundColor: "#1e1e1e" }}>
            {integrationCatalog.map((ch) => (
              <div key={ch.name} className="px-4 py-3 flex items-center gap-3">
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: ch.color }}
                >
                  {ch.letter}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-[#ededed]">{ch.name}</p>
                  <p className="text-[11px] text-[#888] truncate">{ch.desc}</p>
                </div>
                {integrationsLoading ? (
                  <span className={`text-[10px] px-2 py-0.5 ${pulse}`}>...</span>
                ) : ch.connected ? (
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: "#3ecf8e20", color: "#3ecf8e" }}
                  >
                    Conectada
                  </span>
                ) : (
                  <button className="text-[10px] px-2 py-0.5 rounded-full border border-[#333] text-[#888] hover:text-[#ccc] hover:border-[#555] transition-colors">
                    Conectar
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Que puedes hacer con NodeLabz */}
        <div>
          <h3 className="text-[13px] font-medium text-[#ededed] mb-3">Capacidades de la IA</h3>
          <div className="rounded-lg border border-[#2e2e2e] divide-y divide-[#2e2e2e]" style={{ backgroundColor: "#1e1e1e" }}>
            {[
              { icon: <BarChart3 size={13} className="text-[#3ecf8e]" />, title: "Marketing Health Score", desc: "Puntuacion de tu marketing en 5 pilares" },
              { icon: <Target size={13} className="text-[#6366f1]" />, title: "Optimizacion de campanas", desc: "Detecta bajo ROAS y recomienda acciones" },
              { icon: <Users size={13} className="text-[#f59e0b]" />, title: "Lead scoring con IA", desc: "Prioriza leads HOT automaticamente" },
              { icon: <Zap size={13} className="text-[#06b6d4]" />, title: "Workflows inteligentes", desc: "Automatiza seguimiento y nurturing" },
              { icon: <DollarSign size={13} className="text-[#ec4899]" />, title: "Prediccion de revenue", desc: "Proyecciones de LTV, CAC y ROAS" },
            ].map((cap) => (
              <div key={cap.title} className="px-4 py-3 flex items-start gap-3">
                <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: "#252525" }}>
                  {cap.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-[#ededed]">{cap.title}</p>
                  <p className="text-[11px] text-[#888]">{cap.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export function HealthScorePage() {
  const pillars = [
    { label: "Ad Performance", score: 72, color: "#3ecf8e" },
    { label: "Content Engagement", score: 58, color: "#f59e0b" },
    { label: "Email Effectiveness", score: 81, color: "#6366f1" },
    { label: "Lead Conversion", score: 45, color: "#ef4444" },
    { label: "Revenue Attribution", score: 66, color: "#06b6d4" },
  ];

  return (
    <>
      <SectionHeader
        title="Health Score"
        description="Puntuacion general de la salud de tu marketing digital"
      />
      <div className="flex items-center gap-6 mb-8">
        <div
          className="w-32 h-32 rounded-full flex items-center justify-center border-4"
          style={{ borderColor: "#3ecf8e", backgroundColor: "#1e1e1e" }}
        >
          <div className="text-center">
            <span className="text-[32px] font-bold text-[#ededed]">64</span>
            <p className="text-[10px] text-[#888]">/ 100</p>
          </div>
        </div>
        <div>
          <p className="text-[15px] text-[#ededed] font-medium">Bueno</p>
          <p className="text-[13px] text-[#888]">
            Tu marketing esta funcionando bien, pero hay areas de mejora en conversion de leads.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {pillars.map((p) => (
          <div key={p.label} className="rounded-lg border border-[#2e2e2e] p-4" style={{ backgroundColor: "#1e1e1e" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] text-[#ccc]">{p.label}</span>
              <span className="text-[14px] font-medium text-[#ededed]">{p.score}/100</span>
            </div>
            <ProgressBar value={p.score} max={100} color={p.color} />
          </div>
        ))}
      </div>
    </>
  );
}

// ── Metricas Analytics Color Tokens ──
const M_BG = "#171717";
const M_CARD = "#1c1c1c";
const M_BORDER = "#2e2e2e";
const M_TEXT = "#ededed";
const M_TEXT_DIM = "#888888";
const M_TEXT_MUTED = "#999999";
const M_ACCENT = "#3ecf8e";
const M_GRID = "#333333";

// ── Metricas KPI data ──
const metricasKpis: {
  label: string;
  value: string;
  change: string;
  positive: boolean;
  spark: number[];
}[] = [
  {
    label: "Leads este mes",
    value: "1,247",
    change: "+23%",
    positive: true,
    spark: [30, 38, 42, 50, 55, 62, 74],
  },
  {
    label: "Revenue MTD",
    value: "$45,200",
    change: "+12%",
    positive: true,
    spark: [22, 28, 30, 33, 36, 40, 45],
  },
  {
    label: "Costo por Lead",
    value: "$3.42",
    change: "-8%",
    positive: true,
    spark: [5.2, 4.8, 4.5, 4.1, 3.9, 3.6, 3.42],
  },
  {
    label: "ROAS",
    value: "4.2x",
    change: "+15%",
    positive: true,
    spark: [2.8, 3.0, 3.3, 3.5, 3.7, 4.0, 4.2],
  },
];

// ── Metricas Bar chart data ──
const metricasChannelData = [
  { name: "Meta", leads: 450, fill: "#3b82f6" },
  { name: "Google", leads: 380, fill: "#f59e0b" },
  { name: "TikTok", leads: 120, fill: "#ec4899" },
  { name: "Email", leads: 180, fill: "#8b5cf6" },
  { name: "WhatsApp", leads: 85, fill: "#22c55e" },
  { name: "Organico", leads: 32, fill: "#06b6d4" },
];

// ── Metricas Area chart data ──
const metricasRevenueVsGasto = [
  { month: "Ene", revenue: 28000, gasto: 8000 },
  { month: "Feb", revenue: 32000, gasto: 9000 },
  { month: "Mar", revenue: 35000, gasto: 10000 },
  { month: "Abr", revenue: 38000, gasto: 11000 },
  { month: "May", revenue: 42000, gasto: 12000 },
  { month: "Jun", revenue: 45000, gasto: 14000 },
];

// ── Metricas Pie chart data ──
const metricasPipelineData = [
  { name: "Nuevo", value: 40, color: "#3b82f6" },
  { name: "Contactado", value: 25, color: "#8b5cf6" },
  { name: "Calificado", value: 18, color: "#f59e0b" },
  { name: "Propuesta", value: 10, color: "#ec4899" },
  { name: "Cerrado", value: 7, color: "#22c55e" },
];

// ── Metricas Weekly trend data ──
const metricasWeeklyTrend = [
  { week: "S1", leads: 180, conversiones: 12 },
  { week: "S2", leads: 210, conversiones: 15 },
  { week: "S3", leads: 195, conversiones: 14 },
  { week: "S4", leads: 240, conversiones: 18 },
  { week: "S5", leads: 220, conversiones: 16 },
  { week: "S6", leads: 260, conversiones: 20 },
  { week: "S7", leads: 280, conversiones: 22 },
  { week: "S8", leads: 310, conversiones: 25 },
  { week: "S9", leads: 290, conversiones: 23 },
  { week: "S10", leads: 330, conversiones: 28 },
  { week: "S11", leads: 350, conversiones: 30 },
  { week: "S12", leads: 380, conversiones: 34 },
];

// ── Metricas Sparkline ──
function MetricasSparkline({ data, color = M_ACCENT }: { data: number[]; color?: string }) {
  const points = data.map((v) => ({ v }));
  return (
    <div style={{ width: 100, height: 30 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points}>
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Metricas Custom tooltip ──
function MetricasCustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#252525",
        border: `1px solid ${M_BORDER}`,
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 13,
      }}
    >
      <p style={{ color: M_TEXT_DIM, marginBottom: 4, fontWeight: 600 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color, margin: 0 }}>
          {p.name}: {typeof p.value === "number" && p.value >= 1000
            ? `$${(p.value / 1000).toFixed(0)}K`
            : p.value}
        </p>
      ))}
    </div>
  );
}

// ── Metricas Donut center label ──
function MetricasDonutCenterLabel({ viewBox }: any) {
  const { cx, cy } = viewBox;
  return (
    <g>
      <text
        x={cx}
        y={cy - 8}
        textAnchor="middle"
        dominantBaseline="central"
        style={{ fontSize: 22, fontWeight: 700, fill: M_TEXT }}
      >
        1,247
      </text>
      <text
        x={cx}
        y={cy + 16}
        textAnchor="middle"
        dominantBaseline="central"
        style={{ fontSize: 12, fill: M_TEXT_DIM }}
      >
        total
      </text>
    </g>
  );
}

// ── Metricas AI annotation dot ──
function MetricasAIDot(props: any) {
  const { cx, cy, index } = props;
  if (index === 7) {
    return (
      <g>
        <circle cx={cx} cy={cy} r={6} fill={M_ACCENT} stroke={M_BG} strokeWidth={2} />
        <text
          x={cx}
          y={cy - 14}
          textAnchor="middle"
          style={{ fontSize: 10, fill: M_ACCENT, fontWeight: 600 }}
        >
          AI
        </text>
      </g>
    );
  }
  return <circle cx={cx} cy={cy} r={0} />;
}

// ── Metricas Dashboard (react-grid-layout) ──
import GridLayout, { type LayoutItem, noCompactor, type Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";


const METRICAS_STORAGE_KEY = "nodelabz-metricas-layout";

interface WidgetType {
  id: string;
  label: string;
  icon: React.ReactNode;
  defaultW: number;
  defaultH: number;
  description: string;
}

const AVAILABLE_WIDGETS: WidgetType[] = [
  // ── Charts ──
  { id: "kpi", label: "KPI Card", icon: <BarChart3 size={16} />, defaultW: 3, defaultH: 4, description: "Metrica individual con valor y tendencia" },
  { id: "bar-chart", label: "Grafico de Barras", icon: <BarChart3 size={16} />, defaultW: 6, defaultH: 8, description: "Comparar valores entre categorias" },
  { id: "line-chart", label: "Grafico de Lineas", icon: <Activity size={16} />, defaultW: 6, defaultH: 8, description: "Tendencias a lo largo del tiempo" },
  { id: "area-chart", label: "Grafico de Area", icon: <Activity size={16} />, defaultW: 6, defaultH: 8, description: "Volumen y tendencia combinados" },
  { id: "donut", label: "Donut / Pie", icon: <Target size={16} />, defaultW: 6, defaultH: 10, description: "Distribucion porcentual" },
  { id: "table", label: "Tabla", icon: <LayoutDashboard size={16} />, defaultW: 6, defaultH: 8, description: "Datos tabulares con columnas" },
  { id: "text", label: "Nota / Texto", icon: <Zap size={16} />, defaultW: 3, defaultH: 4, description: "Texto libre o anotacion" },
  // ── Marketing Performance ──
  { id: "leads-hoy", label: "Leads Hoy", icon: <Users size={16} />, defaultW: 3, defaultH: 4, description: "Contador en vivo de leads capturados hoy" },
  { id: "roas-canal", label: "ROAS por Canal", icon: <BarChart3 size={16} />, defaultW: 6, defaultH: 8, description: "Comparar ROAS entre Meta, Google y TikTok" },
  { id: "gasto-revenue", label: "Gasto vs Revenue", icon: <Activity size={16} />, defaultW: 6, defaultH: 8, description: "Gasto publicitario vs ingresos generados" },
  { id: "cpl-trend", label: "CPL Trend", icon: <TrendingDown size={16} />, defaultW: 6, defaultH: 8, description: "Costo por lead a lo largo del tiempo" },
  { id: "campaign-status", label: "Estado de Campanas", icon: <Target size={16} />, defaultW: 4, defaultH: 4, description: "Campanas activas, pausadas y finalizadas" },
  // ── CRM & Pipeline ──
  { id: "pipeline-funnel", label: "Pipeline Funnel", icon: <TrendingUp size={16} />, defaultW: 6, defaultH: 10, description: "Embudo visual de etapas de deals" },
  { id: "deals-por-cerrar", label: "Deals por Cerrar", icon: <DollarSign size={16} />, defaultW: 4, defaultH: 8, description: "Deals mas cercanos al cierre" },
  { id: "win-rate", label: "Win Rate", icon: <Target size={16} />, defaultW: 3, defaultH: 4, description: "Tasa de conversion de deals" },
  { id: "leads-calientes", label: "Leads Calientes", icon: <Zap size={16} />, defaultW: 4, defaultH: 8, description: "Leads HOT con mayor puntuacion" },
  { id: "actividad-reciente", label: "Actividad Reciente", icon: <Activity size={16} />, defaultW: 4, defaultH: 8, description: "Ultimas actividades del CRM" },
  // ── Channels ──
  { id: "whatsapp-inbox", label: "WhatsApp Inbox", icon: <MessageCircle size={16} />, defaultW: 4, defaultH: 6, description: "Conversaciones sin leer y ultimos mensajes" },
  { id: "email-open-rate", label: "Email Open Rate", icon: <Mail size={16} />, defaultW: 3, defaultH: 4, description: "Tasa de apertura de emails actual" },
  { id: "social-engagement", label: "Social Engagement", icon: <Globe size={16} />, defaultW: 4, defaultH: 6, description: "Engagement en redes sociales" },
  { id: "integration-status", label: "Estado Integraciones", icon: <Plug size={16} />, defaultW: 4, defaultH: 4, description: "Salud de plataformas conectadas" },
  // ── AI & Insights ──
  { id: "ai-recomendacion", label: "AI Recomendacion", icon: <Lightbulb size={16} />, defaultW: 6, defaultH: 4, description: "Ultima recomendacion de la IA" },
  { id: "health-score", label: "Health Score", icon: <Activity size={16} />, defaultW: 3, defaultH: 6, description: "Puntuacion de salud 0-100" },
  { id: "anomaly-alert", label: "Anomaly Alert", icon: <AlertTriangle size={16} />, defaultW: 4, defaultH: 4, description: "Metricas con desviaciones detectadas" },
  { id: "prediccion-revenue", label: "Prediccion Revenue", icon: <TrendingUp size={16} />, defaultW: 6, defaultH: 8, description: "Proyeccion de ingresos con IA" },
  // ── Financial ──
  { id: "revenue-mtd", label: "Revenue MTD", icon: <DollarSign size={16} />, defaultW: 3, defaultH: 4, description: "Ingresos del mes con tendencia" },
  { id: "mrr-tracker", label: "MRR Tracker", icon: <DollarSign size={16} />, defaultW: 6, defaultH: 8, description: "Revenue recurrente mensual" },
  { id: "top-clientes", label: "Top Clientes", icon: <Users size={16} />, defaultW: 4, defaultH: 8, description: "Clientes con mayor valor" },
];

const defaultGridLayout: LayoutItem[] = [];

interface PlacedWidget {
  layoutItem: LayoutItem;
  widgetType: string;
  title: string;
}

export function MetricasPage() {
  const [widgets, setWidgets] = useState<PlacedWidget[]>([]);
  const gridRef = useRef<HTMLDivElement>(null);
  const [gridWidth, setGridWidth] = useState(1200);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Load from localStorage (handle old format migration)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(METRICAS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Check if it's the new format (array of PlacedWidget with layoutItem)
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.layoutItem?.i) {
          setWidgets(parsed);
        } else {
          // Old format or corrupted — clear it
          localStorage.removeItem(METRICAS_STORAGE_KEY);
        }
      }
    } catch {
      localStorage.removeItem(METRICAS_STORAGE_KEY);
    }
  }, []);

  // Track container width — re-observe when sidebar toggles
  useEffect(() => {
    if (!gridRef.current) return;
    const el = gridRef.current;
    const update = () => {
      const w = el.clientWidth - 32;
      if (w > 100) setGridWidth(w);
    };
    // Delay to let sidebar transition finish
    const timeout = setTimeout(update, 300);
    const observer = new ResizeObserver(() => update());
    observer.observe(el);
    return () => { observer.disconnect(); clearTimeout(timeout); };
  }, [sidebarOpen]);

  const saveWidgets = useCallback((w: PlacedWidget[]) => {
    setWidgets(w);
    try { localStorage.setItem(METRICAS_STORAGE_KEY, JSON.stringify(w)); } catch { /* ignore */ }
  }, []);

  const handleLayoutChange = useCallback((newLayout: readonly LayoutItem[]) => {
    setWidgets((prev) => {
      const updated = prev.map((w) => {
        const found = newLayout.find((l) => l.i === w.layoutItem.i);
        return found ? { ...w, layoutItem: { ...found } } : w;
      });
      try { localStorage.setItem(METRICAS_STORAGE_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    });
  }, []);

  const addWidget = useCallback((widgetType: WidgetType) => {
    const COLS = 12;
    const id = `${widgetType.id}-${Date.now()}`;
    const w = widgetType.defaultW;
    const h = widgetType.defaultH;

    // Build occupancy grid to find first available spot
    const occupied = new Set<string>();
    for (const widget of widgets) {
      const li = widget.layoutItem;
      for (let row = li.y; row < li.y + li.h; row++) {
        for (let col = li.x; col < li.x + li.w; col++) {
          occupied.add(`${col},${row}`);
        }
      }
    }

    // Scan for first position where the new card fits within max rows
    const MAX_ROWS = 24;
    let placeX = 0;
    let placeY = 0;
    let found = false;

    for (let row = 0; row <= MAX_ROWS - h; row++) {
      for (let col = 0; col <= COLS - w; col++) {
        let fits = true;
        for (let dy = 0; dy < h && fits; dy++) {
          for (let dx = 0; dx < w && fits; dx++) {
            if (occupied.has(`${col + dx},${row + dy}`)) fits = false;
          }
        }
        if (fits) {
          placeX = col;
          placeY = row;
          found = true;
          break;
        }
      }
      if (found) break;
    }

    if (!found) return; // Grid is full — don't add

    const newWidget: PlacedWidget = {
      layoutItem: { i: id, x: placeX, y: placeY, w, h },
      widgetType: widgetType.id,
      title: widgetType.label,
    };
    saveWidgets([...widgets, newWidget]);
  }, [widgets, saveWidgets]);

  const removeWidget = useCallback((id: string) => {
    saveWidgets(widgets.filter((w) => w.layoutItem.i !== id));
  }, [widgets, saveWidgets]);

  const handleClear = useCallback(() => {
    saveWidgets([]);
  }, [saveWidgets]);

  const layout = widgets.map((w) => w.layoutItem);
  const widgetMap = Object.fromEntries(widgets.map((w) => [w.layoutItem.i, w]));

  return (
    <div style={{ display: "flex", height: "calc(100vh - 48px)", margin: "-24px" }}>
      {/* Sidebar — Widget Palette (matches DetailSidebar: 240px, same colors) */}
      <aside
        style={{
          width: sidebarOpen ? 240 : 0,
          minWidth: sidebarOpen ? 240 : 0,
          height: "100%",
          borderRight: sidebarOpen ? "1px solid #2e2e2e" : "none",
          backgroundColor: "#1c1c1c",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          overflow: "hidden",
          transition: "width 250ms ease, min-width 250ms ease",
        }}
      >
          <div className="px-5 pt-3 pb-2 border-b border-[#2e2e2e] flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-[#ededed]">Componentes</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              style={{
                width: 24, height: 24, borderRadius: 6,
                display: "flex", alignItems: "center", justifyContent: "center",
                backgroundColor: "transparent", border: "none", color: "#555",
                cursor: "pointer", fontSize: 14,
              }}
              title="Cerrar panel"
            >
              ‹
            </button>
          </div>
          <nav className="flex-1 pt-1 px-3 overflow-y-auto">
            {AVAILABLE_WIDGETS.map((wt, idx) => {
              // Insert section headers based on comments in the array
              const sectionHeaders: Record<number, string> = {
                0: "CHARTS",
                7: "MARKETING",
                12: "CRM & PIPELINE",
                17: "CANALES",
                21: "AI & INSIGHTS",
                25: "FINANCIERO",
              };
              const header = sectionHeaders[idx];
              return (
                <React.Fragment key={wt.id}>
                  {header && (
                    <>
                      {idx > 0 && <div className="h-px mx-auto my-3" style={{ backgroundColor: "#2e2e2e" }} />}
                      <div className="flex space-x-3 mb-2 font-normal px-3">
                        <span className="text-[11px] font-normal uppercase tracking-[0.1em] text-[#666]">
                          {header}
                        </span>
                      </div>
                    </>
                  )}
                  <button
                    onClick={() => addWidget(wt)}
                    className="block w-full text-left text-[14px] py-[6px] px-3 transition-colors text-[#999] hover:text-[#ededed] hover:bg-[#2a2a2a] rounded-md mb-0.5"
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: "#252525", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#666" }}>
                        {wt.icon}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{wt.label}</div>
                        <div style={{ fontSize: 10, color: "#555", lineHeight: 1.2 }}>{wt.description}</div>
                      </div>
                    </div>
                  </button>
                </React.Fragment>
              );
            })}
          </nav>
        </aside>

      {/* Collapsed sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(true)}
        style={{
          width: sidebarOpen ? 0 : 36,
          minWidth: sidebarOpen ? 0 : 36,
          height: "100%",
          backgroundColor: "#1c1c1c",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          cursor: sidebarOpen ? "default" : "pointer",
          border: "none",
          borderRight: sidebarOpen ? "none" : "1px solid #2e2e2e",
          gap: 10,
          overflow: "hidden",
          transition: "width 250ms ease, min-width 250ms ease, opacity 250ms ease",
          opacity: sidebarOpen ? 0 : 1,
          pointerEvents: sidebarOpen ? "none" : "auto",
        }}
        title="Abrir componentes"
      >
        <span style={{ fontSize: 14, color: "#555" }}>›</span>
        <span
          style={{
            writingMode: "vertical-rl",
            transform: "rotate(180deg)",
            fontSize: 11,
            fontWeight: 600,
            color: "#555",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          Componentes
        </span>
      </button>

      {/* Main grid area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        {/* Grid */}
        <div ref={gridRef} style={{ flex: 1, overflow: "auto", padding: "10px 16px", minWidth: 0, position: "relative" }}>
          {/* Floating clear button */}
          {widgets.length > 0 && (
            <button
              onClick={handleClear}
              style={{
                position: "absolute", top: 12, right: 18, zIndex: 20,
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "4px 10px", borderRadius: 6, border: "1px solid #2e2e2e",
                background: "#1c1c1c", color: "#555", fontSize: 10, cursor: "pointer",
              }}
            >
              <RotateCcw size={10} />
              Limpiar
            </button>
          )}
          {widgets.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 12 }}>
              <LayoutDashboard size={40} color="#333" />
              <p style={{ fontSize: 14, color: "#555" }}>Agrega componentes desde el panel izquierdo</p>
              <button
                onClick={() => setSidebarOpen(true)}
                style={{
                  padding: "8px 16px", borderRadius: 8, border: "1px solid #3ecf8e40",
                  background: "#3ecf8e15", color: "#3ecf8e", fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}
              >
                Abrir componentes
              </button>
            </div>
          ) : (
            <GridLayout
              layout={layout}
              gridConfig={{
                cols: 12,
                rowHeight: 30,
                margin: [14, 14] as const,
                containerPadding: [0, 0] as const,
                maxRows: 24,
              }}
              compactor={{
                ...noCompactor,
                allowOverlap: false,
                preventCollision: true,
              }}
              dragConfig={{ enabled: true, handle: ".grid-drag-handle", bounded: true }}
              resizeConfig={{ enabled: true, handles: ["n", "s", "e", "w", "ne", "nw", "se", "sw"] as const }}
              width={gridWidth}
              onLayoutChange={handleLayoutChange}
              style={{ minHeight: 400 }}
            >
              {layout.map((item) => {
                const widget = widgetMap[item.i];
                return (
                  <div key={item.i}>
                    <div
                      style={{
                        backgroundColor: "#1c1c1c",
                        border: "1px solid #2e2e2e",
                        borderRadius: 10,
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                      }}
                    >
                      {/* Header */}
                      <div
                        className="grid-drag-handle"
                        style={{
                          padding: "8px 12px",
                          borderBottom: "1px solid #2e2e2e",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          cursor: "grab",
                          flexShrink: 0,
                        }}
                      >
                        <span style={{ fontSize: 10, fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          {widget?.title || item.i}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <GripVertical size={12} color="#333" />
                          <button
                            onClick={() => removeWidget(item.i)}
                            onMouseDown={(e) => e.stopPropagation()}
                            style={{
                              width: 18, height: 18, borderRadius: 4, border: "none",
                              backgroundColor: "transparent", color: "#444", cursor: "pointer",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 12, lineHeight: 1,
                            }}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                      {/* Body — empty placeholder */}
                      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: 10, color: "#333" }}>{widget?.widgetType}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </GridLayout>
          )}
        </div>
      </div>

      <style>{`
        .react-grid-item.react-grid-placeholder {
          background: #3ecf8e20 !important;
          border: 2px dashed #3ecf8e40 !important;
          border-radius: 10px !important;
          opacity: 1 !important;
        }
        .react-grid-item > .react-resizable-handle {
          background: none !important;
          width: 14px !important;
          height: 14px !important;
        }
        .react-grid-item > .react-resizable-handle::after {
          border-color: #444 !important;
          width: 6px !important;
          height: 6px !important;
        }
        .react-grid-item:hover > .react-resizable-handle::after {
          border-color: #3ecf8e !important;
        }
      `}</style>
    </div>
  );
}

// ── Node Map Types ──────────────────────────────────────────────────────────

type StatusType = "healthy" | "warning" | "broken";

type IntegrationNodeData = {
  label: string;
  icon: keyof typeof nodeMapIconMap;
  status: StatusType;
  subtitle: string;
  metrics?: { label: string; value: string }[];
  description?: string;
};

const nodeMapIconMap = {
  megaphone: Megaphone,
  search: Search,
  music: Music2,
  chart: BarChart3,
  users: Users,
  mail: Mail,
  message: MessageCircle,
  credit: CreditCard,
  shop: ShoppingBag,
} as const;

const statusColor: Record<StatusType, string> = {
  healthy: "#3ecf8e",
  warning: "#f5a623",
  broken: "#ef4444",
};

const statusLabel: Record<StatusType, string> = {
  healthy: "Operativo",
  warning: "Advertencia",
  broken: "Error",
};

const StatusIcon = ({ status }: { status: StatusType }) => {
  if (status === "healthy") return <CheckCircle2 size={14} color="#3ecf8e" />;
  if (status === "warning") return <AlertTriangle size={14} color="#f5a623" />;
  return <XCircle size={14} color="#ef4444" />;
};

// ── Custom Node Component ─────────────────────────────────────────────────

function IntegrationNode({ data, selected }: NodeProps<Node<IntegrationNodeData>>) {
  const IconComponent = nodeMapIconMap[data.icon];

  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        style={{
          width: 8,
          height: 8,
          background: "#3ecf8e",
          border: "2px solid #171717",
        }}
      />
      <div
        style={{
          background: "#1c1c1c",
          border: `1.5px solid ${selected ? "#3ecf8e" : "#2e2e2e"}`,
          borderRadius: 12,
          padding: "14px 18px",
          minWidth: 200,
          cursor: "pointer",
          transition: "all 0.2s ease",
          boxShadow: selected
            ? "0 0 20px rgba(62, 207, 142, 0.15)"
            : "0 2px 8px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: "#252525",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <IconComponent size={18} color="#ededed" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 2,
              }}
            >
              <span
                style={{
                  color: "#ededed",
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                }}
              >
                {data.label}
              </span>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: statusColor[data.status],
                  display: "inline-block",
                  boxShadow: `0 0 6px ${statusColor[data.status]}80`,
                  flexShrink: 0,
                }}
              />
            </div>
            <div
              style={{
                color: "#888",
                fontSize: 11,
                lineHeight: "1.3",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {data.subtitle}
            </div>
          </div>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: 8,
          height: 8,
          background: "#3ecf8e",
          border: "2px solid #171717",
        }}
      />
    </>
  );
}

const nodeMapNodeTypes = { integration: IntegrationNode };

// ── Initial Nodes ─────────────────────────────────────────────────────────

const nodeMapInitialNodes: Node<IntegrationNodeData>[] = [
  {
    id: "meta-ads",
    type: "integration",
    position: { x: 50, y: 60 },
    data: {
      label: "Meta Ads",
      icon: "megaphone",
      status: "healthy",
      subtitle: "2,340 leads | $4,200 spend",
      description:
        "Facebook & Instagram advertising platform. Currently running 12 active campaigns targeting LATAM markets.",
      metrics: [
        { label: "Leads", value: "2,340" },
        { label: "Spend MTD", value: "$4,200" },
        { label: "CPA", value: "$1.79" },
        { label: "ROAS", value: "4.2x" },
        { label: "Active Campaigns", value: "12" },
        { label: "CTR", value: "3.2%" },
      ],
    },
  },
  {
    id: "google-ads",
    type: "integration",
    position: { x: 400, y: 0 },
    data: {
      label: "Google Ads",
      icon: "search",
      status: "healthy",
      subtitle: "1,890 clicks | $3,100 spend",
      description:
        "Search and display campaigns on Google network. Primary source for high-intent leads.",
      metrics: [
        { label: "Clicks", value: "1,890" },
        { label: "Spend MTD", value: "$3,100" },
        { label: "CPC", value: "$1.64" },
        { label: "Conv. Rate", value: "8.4%" },
        { label: "Impressions", value: "45,200" },
        { label: "Quality Score", value: "8/10" },
      ],
    },
  },
  {
    id: "tiktok-ads",
    type: "integration",
    position: { x: 750, y: 60 },
    data: {
      label: "TikTok Ads",
      icon: "music",
      status: "warning",
      subtitle: "450 leads | $1,200 spend",
      description:
        "TikTok advertising platform. CPA is trending higher than other channels — review targeting.",
      metrics: [
        { label: "Leads", value: "450" },
        { label: "Spend MTD", value: "$1,200" },
        { label: "CPA", value: "$2.67" },
        { label: "ROAS", value: "2.1x" },
        { label: "Video Views", value: "128K" },
        { label: "Engagement", value: "4.8%" },
      ],
    },
  },
  {
    id: "ga4",
    type: "integration",
    position: { x: 750, y: 250 },
    data: {
      label: "GA4 Analytics",
      icon: "chart",
      status: "broken",
      subtitle: "Sin datos hace 3 dias",
      description:
        "Google Analytics 4 — data pipeline is broken. Last successful sync was 3 days ago. Likely an API token issue.",
      metrics: [
        { label: "Status", value: "Desconectado" },
        { label: "Ultimo sync", value: "Hace 3 dias" },
        { label: "Error", value: "Token expirado" },
        { label: "Datos pendientes", value: "~72h" },
        { label: "Sesiones (pre-error)", value: "14,200" },
        { label: "Bounce Rate", value: "42%" },
      ],
    },
  },
  {
    id: "crm",
    type: "integration",
    position: { x: 400, y: 260 },
    data: {
      label: "CRM Pipeline",
      icon: "users",
      status: "healthy",
      subtitle: "156 deals activos",
      description:
        "Central CRM managing the full sales pipeline. All ad platforms feed leads here for qualification and nurturing.",
      metrics: [
        { label: "Deals Activos", value: "156" },
        { label: "Pipeline Value", value: "$234K" },
        { label: "Win Rate", value: "32%" },
        { label: "Avg Deal Size", value: "$1,500" },
        { label: "Leads sin asignar", value: "23" },
        { label: "Contactos totales", value: "4,890" },
      ],
    },
  },
  {
    id: "email",
    type: "integration",
    position: { x: 50, y: 280 },
    data: {
      label: "Email Engine",
      icon: "mail",
      status: "healthy",
      subtitle: "12,400 enviados | 24% open rate",
      description:
        "Automated email nurturing system. Handles drip campaigns and transactional emails.",
      metrics: [
        { label: "Enviados MTD", value: "12,400" },
        { label: "Open Rate", value: "24%" },
        { label: "Click Rate", value: "4.1%" },
        { label: "Bounces", value: "0.3%" },
        { label: "Secuencias activas", value: "8" },
        { label: "Delivery Rate", value: "98%" },
      ],
    },
  },
  {
    id: "whatsapp",
    type: "integration",
    position: { x: 50, y: 480 },
    data: {
      label: "WhatsApp",
      icon: "message",
      status: "healthy",
      subtitle: "340 conversaciones",
      description:
        "WhatsApp Business API for direct customer follow-up and support conversations.",
      metrics: [
        { label: "Conversaciones", value: "340" },
        { label: "Response Time", value: "< 2 min" },
        { label: "Satisfaction", value: "4.8/5" },
        { label: "Templates activos", value: "15" },
        { label: "Mensajes hoy", value: "89" },
        { label: "Opt-in Rate", value: "72%" },
      ],
    },
  },
  {
    id: "stripe",
    type: "integration",
    position: { x: 400, y: 500 },
    data: {
      label: "Stripe",
      icon: "credit",
      status: "healthy",
      subtitle: "$45,200 revenue MTD",
      description:
        "Payment processing and revenue tracking. Handles all subscriptions and one-time payments.",
      metrics: [
        { label: "Revenue MTD", value: "$45,200" },
        { label: "Transacciones", value: "342" },
        { label: "MRR", value: "$38,400" },
        { label: "Churn", value: "2.1%" },
        { label: "Avg Ticket", value: "$132" },
        { label: "Refunds", value: "$210" },
      ],
    },
  },
  {
    id: "shopify",
    type: "integration",
    position: { x: 750, y: 480 },
    data: {
      label: "Shopify",
      icon: "shop",
      status: "warning",
      subtitle: "Sync retrasado 2h",
      description:
        "E-commerce storefront. Inventory sync is delayed by 2 hours — may affect order fulfillment.",
      metrics: [
        { label: "Status", value: "Sync retrasado" },
        { label: "Delay", value: "2 horas" },
        { label: "Orders hoy", value: "28" },
        { label: "Revenue hoy", value: "$3,400" },
        { label: "Products", value: "145" },
        { label: "Inventory alerts", value: "3" },
      ],
    },
  },
];

// ── Initial Edges ─────────────────────────────────────────────────────────

const nodeMapInitialEdges: Edge[] = [
  {
    id: "meta-crm",
    source: "meta-ads",
    target: "crm",
    animated: true,
    label: "leads",
    style: { stroke: "#3ecf8e", strokeWidth: 1.5 },
    labelStyle: { fill: "#888", fontSize: 10, fontWeight: 500 },
    labelBgStyle: { fill: "#1c1c1c", fillOpacity: 0.9 },
    labelBgPadding: [6, 4] as [number, number],
    labelBgBorderRadius: 4,
  },
  {
    id: "google-crm",
    source: "google-ads",
    target: "crm",
    animated: true,
    label: "leads",
    style: { stroke: "#3ecf8e", strokeWidth: 1.5 },
    labelStyle: { fill: "#888", fontSize: 10, fontWeight: 500 },
    labelBgStyle: { fill: "#1c1c1c", fillOpacity: 0.9 },
    labelBgPadding: [6, 4] as [number, number],
    labelBgBorderRadius: 4,
  },
  {
    id: "tiktok-crm",
    source: "tiktok-ads",
    target: "crm",
    label: "leads",
    style: { stroke: "#f5a623", strokeWidth: 1.5 },
    labelStyle: { fill: "#888", fontSize: 10, fontWeight: 500 },
    labelBgStyle: { fill: "#1c1c1c", fillOpacity: 0.9 },
    labelBgPadding: [6, 4] as [number, number],
    labelBgBorderRadius: 4,
  },
  {
    id: "crm-email",
    source: "crm",
    target: "email",
    animated: true,
    label: "nurturing",
    style: { stroke: "#3ecf8e", strokeWidth: 1.5 },
    labelStyle: { fill: "#888", fontSize: 10, fontWeight: 500 },
    labelBgStyle: { fill: "#1c1c1c", fillOpacity: 0.9 },
    labelBgPadding: [6, 4] as [number, number],
    labelBgBorderRadius: 4,
  },
  {
    id: "crm-whatsapp",
    source: "crm",
    target: "whatsapp",
    animated: true,
    label: "follow-up",
    style: { stroke: "#3ecf8e", strokeWidth: 1.5 },
    labelStyle: { fill: "#888", fontSize: 10, fontWeight: 500 },
    labelBgStyle: { fill: "#1c1c1c", fillOpacity: 0.9 },
    labelBgPadding: [6, 4] as [number, number],
    labelBgBorderRadius: 4,
  },
  {
    id: "crm-stripe",
    source: "crm",
    target: "stripe",
    animated: true,
    label: "deals cerrados",
    style: { stroke: "#3ecf8e", strokeWidth: 1.5 },
    labelStyle: { fill: "#888", fontSize: 10, fontWeight: 500 },
    labelBgStyle: { fill: "#1c1c1c", fillOpacity: 0.9 },
    labelBgPadding: [6, 4] as [number, number],
    labelBgBorderRadius: 4,
  },
  {
    id: "ga4-crm",
    source: "ga4",
    target: "crm",
    label: "sin datos",
    style: {
      stroke: "#ef4444",
      strokeWidth: 1.5,
      strokeDasharray: "6 4",
    },
    labelStyle: { fill: "#ef4444", fontSize: 10, fontWeight: 500 },
    labelBgStyle: { fill: "#1c1c1c", fillOpacity: 0.9 },
    labelBgPadding: [6, 4] as [number, number],
    labelBgBorderRadius: 4,
  },
  {
    id: "shopify-stripe",
    source: "shopify",
    target: "stripe",
    animated: true,
    label: "orders",
    style: { stroke: "#3ecf8e", strokeWidth: 1.5 },
    labelStyle: { fill: "#888", fontSize: 10, fontWeight: 500 },
    labelBgStyle: { fill: "#1c1c1c", fillOpacity: 0.9 },
    labelBgPadding: [6, 4] as [number, number],
    labelBgBorderRadius: 4,
  },
];

// ── Detail Panel ──────────────────────────────────────────────────────────

function DetailPanel({
  node,
  onClose,
}: {
  node: Node<IntegrationNodeData>;
  onClose: () => void;
}) {
  const data = node.data;
  const IconComponent = nodeMapIconMap[data.icon];

  return (
    <div
      style={{
        width: 320,
        height: "100%",
        background: "#1c1c1c",
        borderLeft: "1px solid #2e2e2e",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "20px 20px 16px",
          borderBottom: "1px solid #2e2e2e",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "#252525",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconComponent size={20} color="#ededed" />
          </div>
          <div>
            <div
              style={{
                color: "#ededed",
                fontSize: 15,
                fontWeight: 600,
                marginBottom: 2,
              }}
            >
              {data.label}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                color: statusColor[data.status],
                fontSize: 12,
              }}
            >
              <StatusIcon status={data.status} />
              {statusLabel[data.status]}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            border: "1px solid #2e2e2e",
            background: "#252525",
            color: "#888",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Description */}
      {data.description && (
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #2e2e2e",
          }}
        >
          <div
            style={{
              color: "#888",
              fontSize: 12,
              lineHeight: "1.5",
            }}
          >
            {data.description}
          </div>
        </div>
      )}

      {/* Metrics */}
      <div style={{ padding: "16px 20px", flex: 1, overflow: "auto" }}>
        <div
          style={{
            color: "#666",
            fontSize: 10,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 12,
          }}
        >
          Metricas
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
          }}
        >
          {data.metrics?.map((metric, i) => (
            <div
              key={i}
              style={{
                background: "#252525",
                borderRadius: 8,
                padding: "12px 14px",
                border: "1px solid #2e2e2e",
              }}
            >
              <div
                style={{
                  color: "#666",
                  fontSize: 10,
                  marginBottom: 4,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {metric.label}
              </div>
              <div
                style={{
                  color: "#ededed",
                  fontSize: 16,
                  fontWeight: 600,
                }}
              >
                {metric.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div
        style={{
          padding: "16px 20px",
          borderTop: "1px solid #2e2e2e",
          display: "flex",
          gap: 8,
        }}
      >
        <button
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: 8,
            border: "1px solid #2e2e2e",
            background: "#252525",
            color: "#ededed",
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <Activity size={13} />
          Ver logs
        </button>
        <button
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: 8,
            border: "none",
            background: "#3ecf8e",
            color: "#171717",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <Zap size={13} />
          Configurar
        </button>
      </div>
    </div>
  );
}

// ── Node Map Page ─────────────────────────────────────────────────────────

export function NodeMapPage() {
  const [nodes, , onNodesChange] = useNodesState(nodeMapInitialNodes);
  const [edges, , onEdgesChange] = useEdgesState(nodeMapInitialEdges);
  const [selectedNode, setSelectedNode] = useState<Node<IntegrationNodeData> | null>(null);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const typedNode = node as Node<IntegrationNodeData>;
      setSelectedNode(typedNode);
    },
    [],
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const healthyCount = nodeMapInitialNodes.filter((n) => n.data.status === "healthy").length;
  const warningCount = nodeMapInitialNodes.filter((n) => n.data.status === "warning").length;
  const brokenCount = nodeMapInitialNodes.filter((n) => n.data.status === "broken").length;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        overflow: "hidden",
      }}
    >
      {/* ── Title Bar ─────────────────────────────────────────────────── */}
      <div
        style={{
          height: 56,
          borderBottom: "1px solid #2e2e2e",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          flexShrink: 0,
          background: "#1c1c1c",
          borderRadius: "12px 12px 0 0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "linear-gradient(135deg, #3ecf8e 0%, #2ba06e 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Zap size={16} color="#fff" />
          </div>
          <div>
            <h1
              style={{
                color: "#ededed",
                fontSize: 15,
                fontWeight: 600,
                margin: 0,
                letterSpacing: "-0.01em",
              }}
            >
              Node Map
            </h1>
            <span style={{ color: "#666", fontSize: 11 }}>
              Marketing Ecosystem
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 12,
                color: "#3ecf8e",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#3ecf8e",
                }}
              />
              {healthyCount} Healthy
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 12,
                color: "#f5a623",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#f5a623",
                }}
              />
              {warningCount} Warning
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 12,
                color: "#ef4444",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#ef4444",
                }}
              />
              {brokenCount} Error
            </div>
          </div>
          <div
            style={{
              width: 1,
              height: 24,
              background: "#2e2e2e",
            }}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 8,
              background: "#252525",
              border: "1px solid #2e2e2e",
              color: "#888",
              fontSize: 12,
            }}
          >
            <TrendingUp size={13} />
            {nodeMapInitialNodes.length} integraciones
          </div>
        </div>
      </div>

      {/* ── Main Area ─────────────────────────────────────────────────── */}
      <div style={{ height: "calc(100vh - 180px)", display: "flex", position: "relative" }}>
        {/* ReactFlow Canvas */}
        <div style={{ flex: 1 }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeMapNodeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            proOptions={{ hideAttribution: true }}
            style={{ background: "#171717" }}
            defaultEdgeOptions={{
              type: "smoothstep",
            }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={24}
              size={1}
              color="#2e2e2e"
            />
            <Controls
              showInteractive={false}
              style={{
                borderRadius: 8,
                border: "1px solid #2e2e2e",
                overflow: "hidden",
              }}
            />
            <MiniMap
              style={{
                background: "#1c1c1c",
                borderRadius: 8,
                border: "1px solid #2e2e2e",
              }}
              maskColor="rgba(23, 23, 23, 0.7)"
              nodeColor={(node) => {
                const n = node as Node<IntegrationNodeData>;
                return statusColor[n.data?.status ?? "healthy"];
              }}
            />
          </ReactFlow>
        </div>

        {/* Detail Panel */}
        {selectedNode && (
          <DetailPanel
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
          />
        )}

        {/* ── AI Suggestion Banner ──────────────────────────────────── */}
        <div
          style={{
            position: "absolute",
            bottom: 16,
            left: 16,
            right: selectedNode ? 336 : 16,
            background: "#1c1c1c",
            border: "1px solid #2e2e2e",
            borderRadius: 12,
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            gap: 14,
            boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
            transition: "right 0.2s ease",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "linear-gradient(135deg, #3ecf8e20, #3ecf8e10)",
              border: "1px solid #3ecf8e30",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontSize: 18,
            }}
          >
            <Zap size={16} color="#3ecf8e" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                color: "#ededed",
                fontSize: 13,
                lineHeight: "1.5",
              }}
            >
              <span style={{ color: "#3ecf8e", fontWeight: 600 }}>
                IA detecto:
              </span>{" "}
              GA4 no sincroniza desde hace 3 dias. TikTok tiene CPA 40%
              mas alto que Meta.{" "}
              <span style={{ color: "#888" }}>
                Quieres que redistribuya el presupuesto?
              </span>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
              flexShrink: 0,
            }}
          >
            <button
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "1px solid #2e2e2e",
                background: "#252525",
                color: "#888",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Ignorar
            </button>
            <button
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "none",
                background: "#3ecf8e",
                color: "#171717",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <DollarSign size={13} />
              Redistribuir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RecomendacionesIAPage() {
  const recommendations = [
    {
      severity: "critical",
      title: "ROAS bajo en TikTok Ads",
      description: "Tu ROAS de 2.9x esta 28% debajo del benchmark. Considera pausar los ad sets con peor rendimiento.",
      action: "Revisar campanas",
    },
    {
      severity: "warning",
      title: "Tasa de conversion en caida",
      description: "La conversion bajo 0.4% esta semana. Revisa los landing pages y formularios.",
      action: "Ver detalles",
    },
    {
      severity: "opportunity",
      title: "Audiencia de alto rendimiento detectada",
      description: "El segmento 'Mujeres 25-34 en San Jose' tiene 2.3x mas conversiones. Aumenta presupuesto.",
      action: "Crear campana",
    },
  ];

  const severityColors: Record<string, string> = {
    critical: "#ef4444",
    warning: "#f59e0b",
    opportunity: "#3ecf8e",
  };

  return (
    <>
      <SectionHeader
        title="Recomendaciones IA"
        description="Acciones sugeridas basadas en el analisis de tus datos"
      />
      <div className="space-y-3">
        {recommendations.map((rec, i) => (
          <div
            key={i}
            className="rounded-lg border p-4 flex items-start gap-4"
            style={{
              backgroundColor: "#1e1e1e",
              borderColor: severityColors[rec.severity] + "40",
            }}
          >
            <div
              className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
              style={{ backgroundColor: severityColors[rec.severity] }}
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-[13px] font-medium text-[#ededed]">{rec.title}</h4>
                <Badge
                  text={rec.severity === "critical" ? "Critico" : rec.severity === "warning" ? "Atencion" : "Oportunidad"}
                  color={severityColors[rec.severity]}
                />
              </div>
              <p className="text-[12px] text-[#888]">{rec.description}</p>
            </div>
            <button
              className="text-[11px] px-3 py-1.5 rounded border border-[#333] text-[#ccc] hover:border-[#555] transition-colors flex-shrink-0"
            >
              {rec.action}
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

export function DigestDiarioPage() {
  return (
    <>
      <SectionHeader
        title="Digest Diario"
        description="Resumen automatico de lo que paso en las ultimas 24 horas"
      />
      <div className="space-y-4">
        <div className="rounded-lg border border-[#2e2e2e] p-4" style={{ backgroundColor: "#1e1e1e" }}>
          <div className="flex items-center gap-2 mb-3">
            <Newspaper size={14} className="text-[#3ecf8e]" />
            <span className="text-[13px] font-medium text-[#ededed]">Hoy, 15 de marzo 2026</span>
          </div>
          <div className="space-y-3 text-[13px] text-[#ccc]">
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#3ecf8e] mt-1.5" />
              <p><strong>+23 leads nuevos</strong> — 8 HOT, 10 WARM, 5 COLD. Fuente principal: Meta Ads (65%)</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] mt-1.5" />
              <p><strong>Campana "Promo Marzo"</strong> alcanzo 15,000 impresiones con CTR de 2.8%</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#6366f1] mt-1.5" />
              <p><strong>3 deals cerrados</strong> por un total de $2,400. Pipeline value: $18,500</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#ef4444] mt-1.5" />
              <p><strong>Alerta:</strong> Email bounce rate subio a 4.2% — verificar lista de contactos</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function ConectarPlataformaPage() {
  const platforms = [
    { name: "Meta Ads", status: "connected", icon: "M", color: "#1877F2" },
    { name: "Google Ads", status: "connected", icon: "G", color: "#4285F4" },
    { name: "TikTok Ads", status: "available", icon: "T", color: "#000000" },
    { name: "Google Analytics 4", status: "available", icon: "A", color: "#E37400" },
    { name: "Stripe", status: "available", icon: "S", color: "#635BFF" },
    { name: "Shopify", status: "available", icon: "S", color: "#95BF47" },
    { name: "WhatsApp Business", status: "available", icon: "W", color: "#25D366" },
    { name: "LinkedIn", status: "available", icon: "L", color: "#0A66C2" },
  ];

  return (
    <>
      <SectionHeader
        title="Conectar Plataforma"
        description="Conecta tus plataformas de marketing para centralizar datos"
      />
      <div className="grid grid-cols-2 gap-3">
        {platforms.map((p) => (
          <div
            key={p.name}
            className="rounded-lg border border-[#2e2e2e] p-4 flex items-center gap-3"
            style={{ backgroundColor: "#1e1e1e" }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-[14px]"
              style={{ backgroundColor: p.color }}
            >
              {p.icon}
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-medium text-[#ededed]">{p.name}</p>
              <p className="text-[11px] text-[#888]">
                {p.status === "connected" ? "Conectado" : "Disponible"}
              </p>
            </div>
            <button
              className={`text-[11px] px-3 py-1.5 rounded transition-colors ${
                p.status === "connected"
                  ? "border border-[#3ecf8e]/30 text-[#3ecf8e]"
                  : "border border-[#333] text-[#ccc] hover:border-[#555]"
              }`}
            >
              {p.status === "connected" ? "Conectado" : "Conectar"}
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

export function GenerarReportePage() {
  return (
    <>
      <SectionHeader
        title="Generar Reporte"
        description="Crea reportes personalizados de tus metricas"
      />
      <div className="grid grid-cols-3 gap-4">
        {[
          { title: "Resumen Ejecutivo", desc: "Vision general de todas las metricas clave", icon: <FileText size={20} /> },
          { title: "Rendimiento de Ads", desc: "Analisis detallado de campanas publicitarias", icon: <BarChart3 size={20} /> },
          { title: "Pipeline de Ventas", desc: "Estado del pipeline y deals activos", icon: <Layers size={20} /> },
        ].map((r) => (
          <button
            key={r.title}
            className="rounded-lg border border-[#2e2e2e] p-6 text-left hover:border-[#3ecf8e]/40 transition-colors"
            style={{ backgroundColor: "#1e1e1e" }}
          >
            <div className="text-[#888] mb-3">{r.icon}</div>
            <h3 className="text-[14px] font-medium text-[#ededed] mb-1">{r.title}</h3>
            <p className="text-[12px] text-[#888]">{r.desc}</p>
          </button>
        ))}
      </div>
    </>
  );
}
