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
  const [showPlans, setShowPlans] = useState(false);
  const [billingSuccess, setBillingSuccess] = useState(false);

  const utils = trpc.useUtils();

  const syncPlanMutation = trpc.billing.syncPlan.useMutation({
    onSuccess: () => {
      utils.auth.getSession.invalidate();
      utils.billing.getSubscription.invalidate();
      utils.billing.getUsage.invalidate();
    },
  });

  // Show success banner and sync plan after Stripe checkout redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("billing") === "success") {
      setBillingSuccess(true);
      window.history.replaceState({}, "", "/dashboard");

      // Sync plan from Stripe (works even without webhooks)
      syncPlanMutation.mutate();
      // Also refetch after a delay in case webhook processes
      const t1 = setTimeout(() => {
        utils.auth.getSession.invalidate();
        utils.billing.getSubscription.invalidate();
        utils.billing.getUsage.invalidate();
      }, 3000);
      const t2 = setTimeout(() => setBillingSuccess(false), 8000);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const checkoutMutation = trpc.billing.createCheckout.useMutation({
    onSuccess: (data) => { window.location.href = data.url; },
  });
  const portalMutation = trpc.billing.createPortalSession.useMutation({
    onSuccess: (data) => { window.location.href = data.url; },
  });

  // ── Derived values ──
  const contactCount = contactsData?.total ?? 0;
  const integrationCount = integrations?.length ?? 0;
  const connectedIntegrations = integrations?.filter((i) => i.status === "active") ?? [];
  const totalPipelineValue = dealStats?.totalValue ?? 0;
  const planName = session?.tenant?.plan ?? "INICIO";
  const tenantSlug = session?.tenant?.slug ?? "nodelabz";
  const tenantName = session?.tenant?.name ?? "Mi Empresa";

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
      {/* ── Billing success banner ── */}
      {billingSuccess && (
        <div className="rounded-lg border border-[#3ecf8e]/30 px-4 py-3 mb-4 flex items-center gap-3" style={{ backgroundColor: "#1a2a1e" }}>
          <div className="w-6 h-6 rounded-full bg-[#3ecf8e]/20 flex items-center justify-center"><span className="text-[#3ecf8e] text-[14px]">✓</span></div>
          <div className="flex-1">
            <p className="text-[13px] font-medium text-[#3ecf8e]">Suscripcion activada exitosamente</p>
            <p className="text-[11px] text-[#888]">Tu plan ha sido actualizado. Los cambios ya estan activos.</p>
          </div>
          <button onClick={() => setBillingSuccess(false)} className="text-[#666] hover:text-[#ccc]"><X size={16} /></button>
        </div>
      )}

      {/* ── Project header ── */}
      <div className="flex items-center gap-3 mb-5">
        <h1 className="text-[24px] font-semibold text-[#ededed]">{tenantName}</h1>
        <span
          className="text-[10px] font-semibold uppercase tracking-wider px-2 py-[3px] rounded"
          style={{ backgroundColor: "#3ecf8e20", color: "#3ecf8e" }}
        >
          {planLabels[planName] ?? planName}
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
          <button
            onClick={() => setShowPlans(true)}
            className="w-full mt-3 text-[12px] text-center py-2 rounded-md border border-[#333] text-[#ccc] hover:border-[#3ecf8e]/40 hover:text-[#ededed] transition-colors"
          >
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

      {/* Plan selection modal */}
      {showPlans && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowPlans(false)} />
          <div className="relative w-[90vw] max-w-4xl rounded-2xl border border-[#2e2e2e] p-8" style={{ backgroundColor: "#1a1a1a" }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-[20px] font-bold text-[#ededed]">Elige tu plan</h2>
                <p className="text-[13px] text-[#888] mt-1">Plan actual: <Badge text={planLabels[planName] ?? planName} color="#3ecf8e" /></p>
              </div>
              <button onClick={() => setShowPlans(false)} className="text-[#666] hover:text-[#ccc]"><X size={20} /></button>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {([
                { key: "INICIO" as const, name: "Inicio", price: "$79", contacts: "500", emails: "5,000", ai: "Haiku", media: false, workflows: false, popular: false },
                { key: "CRECIMIENTO" as const, name: "Crecimiento", price: "$199", contacts: "5,000", emails: "25,000", ai: "Sonnet", media: false, workflows: true, popular: true },
                { key: "PROFESIONAL" as const, name: "Profesional", price: "$399", contacts: "25,000", emails: "100,000", ai: "Opus", media: true, workflows: true, popular: false },
                { key: "AGENCIA" as const, name: "Agencia", price: "$799", contacts: "Ilimitados", emails: "Ilimitados", ai: "Opus", media: true, workflows: true, popular: false },
              ]).map((plan) => {
                const isCurrent = planName === plan.key;
                return (
                  <div key={plan.key} className={`rounded-xl border p-5 flex flex-col ${plan.popular ? "border-[#3ecf8e]/50" : "border-[#2e2e2e]"}`} style={{ backgroundColor: isCurrent ? "#1e2a22" : "#1e1e1e" }}>
                    {plan.popular && <Badge text="Popular" color="#3ecf8e" />}
                    <h3 className="text-[16px] font-semibold text-[#ededed] mt-1">{plan.name}</h3>
                    <div className="flex items-baseline gap-1 mt-2 mb-4">
                      <span className="text-[28px] font-bold text-[#ededed]">{plan.price}</span>
                      <span className="text-[12px] text-[#888]">/mes</span>
                    </div>
                    <div className="space-y-2 text-[12px] flex-1">
                      <div className="flex items-center gap-2 text-[#ccc]"><span className="text-[#3ecf8e]">✓</span> {plan.contacts} contactos</div>
                      <div className="flex items-center gap-2 text-[#ccc]"><span className="text-[#3ecf8e]">✓</span> {plan.emails} emails/mes</div>
                      <div className="flex items-center gap-2 text-[#ccc]"><span className="text-[#3ecf8e]">✓</span> AI {plan.ai}</div>
                      <div className={`flex items-center gap-2 ${plan.workflows ? "text-[#ccc]" : "text-[#555]"}`}><span className={plan.workflows ? "text-[#3ecf8e]" : "text-[#555]"}>✓</span> Workflows</div>
                      <div className={`flex items-center gap-2 ${plan.media ? "text-[#ccc]" : "text-[#555]"}`}><span className={plan.media ? "text-[#3ecf8e]" : "text-[#555]"}>✓</span> Media generation</div>
                    </div>
                    {isCurrent ? (
                      <button
                        onClick={() => portalMutation.mutate()}
                        disabled={portalMutation.isPending}
                        className="mt-4 text-[12px] py-2.5 rounded-lg border border-[#3ecf8e]/40 text-[#3ecf8e] w-full hover:bg-[#3ecf8e]/10 transition-colors"
                      >
                        Gestionar plan
                      </button>
                    ) : (
                      <button
                        onClick={() => checkoutMutation.mutate({ plan: plan.key })}
                        disabled={checkoutMutation.isPending}
                        className="mt-4 text-[12px] py-2.5 rounded-lg font-medium w-full disabled:opacity-50 transition-colors"
                        style={{ backgroundColor: plan.popular ? "#3ecf8e" : "#ededed", color: "#000" }}
                      >
                        {checkoutMutation.isPending ? "Redirigiendo..." : "Seleccionar"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Health Score Radial Gauge ──
function HealthGauge({ score, color, size = 180 }: { score: number; color: string; size?: number }) {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius * 0.75; // 270 degrees
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const center = size / 2;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#2a2a2a"
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * 0.25}
          transform={`rotate(135 ${center} ${center})`}
        />
        {/* Score arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset + circumference * 0.25}
          transform={`rotate(135 ${center} ${center})`}
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
        {/* Glow effect */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset + circumference * 0.25}
          transform={`rotate(135 ${center} ${center})`}
          opacity={0.2}
          filter="blur(6px)"
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[40px] font-bold text-[#ededed] leading-none">{score}</span>
        <span className="text-[11px] text-[#666] mt-1">de 100</span>
      </div>
    </div>
  );
}

// ── Health Score Mini Gauge ──
function MiniGauge({ score, color, size = 52 }: { score: number; color: string; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius * 0.75;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const center = size / 2;

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={center} cy={center} r={radius}
          fill="none" stroke="#2a2a2a" strokeWidth={4} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={circumference * 0.25}
          transform={`rotate(135 ${center} ${center})`}
        />
        <circle
          cx={center} cy={center} r={radius}
          fill="none" stroke={color} strokeWidth={4} strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset + circumference * 0.25}
          transform={`rotate(135 ${center} ${center})`}
          style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[13px] font-semibold text-[#ededed]">{score}</span>
      </div>
    </div>
  );
}

export function HealthScorePage() {
  const { data: healthScore, isLoading } = trpc.healthScore.getCurrent.useQuery();
  const recalcMutation = trpc.healthScore.recalculate.useMutation({
    onSuccess: () => { utils.healthScore.getCurrent.invalidate(); },
  });
  const utils = trpc.useUtils();

  const overall = healthScore?.overallScore ?? 0;
  const pillarIcons: Record<string, React.ReactNode> = {
    "Rendimiento de Ads": <Megaphone size={16} />,
    "Engagement de Contenido": <BarChart3 size={16} />,
    "Efectividad de Email": <Mail size={16} />,
    "Conversion de Leads": <Target size={16} />,
    "Atribucion de Revenue": <DollarSign size={16} />,
  };
  const pillars = [
    { label: "Rendimiento de Ads", score: healthScore?.adPerformance ?? 0, color: "#3ecf8e" },
    { label: "Engagement de Contenido", score: healthScore?.contentEngagement ?? 0, color: "#f59e0b" },
    { label: "Efectividad de Email", score: healthScore?.emailEffectiveness ?? 0, color: "#6366f1" },
    { label: "Conversion de Leads", score: healthScore?.leadConversion ?? 0, color: "#ef4444" },
    { label: "Atribucion de Revenue", score: healthScore?.revenueAttribution ?? 0, color: "#06b6d4" },
  ];

  const scoreLabel = overall >= 80 ? "Excelente" : overall >= 60 ? "Bueno" : overall >= 40 ? "Regular" : "Necesita atencion";
  const scoreColor = overall >= 80 ? "#3ecf8e" : overall >= 60 ? "#f59e0b" : overall >= 40 ? "#f97316" : "#ef4444";

  const insights = (healthScore?.insights ?? []) as string[];
  const recommendations = (healthScore?.recommendations ?? []) as Array<{ title?: string; description?: string; priority?: string }>;

  const getPillarLabel = (score: number) =>
    score >= 80 ? "Excelente" : score >= 60 ? "Bueno" : score >= 40 ? "Regular" : "Bajo";

  return (
    <>
      <SectionHeader
        title="Health Score"
        description="Puntuacion general de la salud de tu marketing digital"
      />

      {isLoading ? (
        <div className="space-y-4">
          <div className="h-52 rounded-xl bg-[#1e1e1e] animate-pulse" />
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-[#1e1e1e] animate-pulse" />
            ))}
          </div>
        </div>
      ) : !healthScore ? (
        <div className="rounded-xl border border-[#2e2e2e] p-12 text-center" style={{ backgroundColor: "#1e1e1e" }}>
          <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center" style={{ backgroundColor: "#252525" }}>
            <Activity size={28} className="text-[#555]" />
          </div>
          <h3 className="text-[16px] font-medium text-[#ededed] mb-2">Sin datos de Health Score</h3>
          <p className="text-[13px] text-[#888] mb-6 max-w-sm mx-auto">Calcula tu primer health score para obtener un diagnostico completo de tu marketing digital.</p>
          <button
            onClick={() => recalcMutation.mutate()}
            disabled={recalcMutation.isPending}
            className="inline-flex items-center gap-2 text-[13px] text-black px-5 py-2.5 rounded-lg font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "#3ecf8e" }}
          >
            <Zap size={14} />
            {recalcMutation.isPending ? "Calculando..." : "Calcular Health Score"}
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* ── Hero: Overall Score ── */}
          <div className="rounded-xl border border-[#2e2e2e] p-6" style={{ backgroundColor: "#1e1e1e" }}>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <HealthGauge score={overall} color={scoreColor} />
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center gap-2 justify-center sm:justify-start mb-1">
                  <span
                    className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full"
                    style={{ color: scoreColor, backgroundColor: `${scoreColor}15` }}
                  >
                    {scoreLabel}
                  </span>
                </div>
                <h2 className="text-[18px] font-semibold text-[#ededed] mb-2">Salud de Marketing</h2>
                {insights.length > 0 && (
                  <p className="text-[13px] text-[#999] leading-relaxed max-w-md">{insights[0]}</p>
                )}
                {insights.length > 1 && (
                  <p className="text-[12px] text-[#666] mt-1.5 leading-relaxed max-w-md">{insights[1]}</p>
                )}
                <button
                  onClick={() => recalcMutation.mutate()}
                  disabled={recalcMutation.isPending}
                  className="inline-flex items-center gap-1.5 text-[12px] mt-4 px-3.5 py-1.5 rounded-lg border border-[#333] text-[#aaa] hover:text-[#ededed] hover:border-[#555] transition-colors disabled:opacity-50"
                >
                  <RotateCcw size={12} className={recalcMutation.isPending ? "animate-spin" : ""} />
                  {recalcMutation.isPending ? "Recalculando..." : "Recalcular"}
                </button>
              </div>
            </div>
          </div>

          {/* ── Pillar Cards Grid ── */}
          <div>
            <h3 className="text-[13px] font-medium text-[#888] uppercase tracking-wider mb-3">Pilares de rendimiento</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {pillars.map((p) => {
                const pillarStatus = getPillarLabel(p.score);
                return (
                  <div
                    key={p.label}
                    className="rounded-xl border border-[#2e2e2e] p-4 hover:border-[#3a3a3a] transition-colors"
                    style={{ backgroundColor: "#1e1e1e" }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${p.color}15`, color: p.color }}
                        >
                          {pillarIcons[p.label]}
                        </div>
                        <div>
                          <p className="text-[12px] text-[#ccc] font-medium leading-tight">{p.label}</p>
                          <p className="text-[10px] mt-0.5" style={{ color: p.score >= 60 ? "#3ecf8e" : p.score >= 40 ? "#f59e0b" : "#ef4444" }}>
                            {pillarStatus}
                          </p>
                        </div>
                      </div>
                      <MiniGauge score={p.score} color={p.color} />
                    </div>
                    <div className="mt-1">
                      <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: "#2a2a2a" }}>
                        <div
                          className="h-1.5 rounded-full"
                          style={{
                            width: `${Math.min(p.score, 100)}%`,
                            backgroundColor: p.color,
                            transition: "width 0.8s ease-out",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Radar-style Summary Bar ── */}
          <div className="rounded-xl border border-[#2e2e2e] p-5" style={{ backgroundColor: "#1e1e1e" }}>
            <h3 className="text-[13px] font-medium text-[#888] uppercase tracking-wider mb-4">Comparativa de pilares</h3>
            <div className="space-y-3">
              {pillars.map((p) => (
                <div key={p.label} className="flex items-center gap-3">
                  <span className="text-[12px] text-[#888] w-44 flex-shrink-0 truncate">{p.label}</span>
                  <div className="flex-1 h-3 rounded-full relative" style={{ backgroundColor: "#252525" }}>
                    <div
                      className="h-3 rounded-full relative"
                      style={{
                        width: `${Math.min(p.score, 100)}%`,
                        background: `linear-gradient(90deg, ${p.color}88, ${p.color})`,
                        transition: "width 0.8s ease-out",
                      }}
                    >
                      <div
                        className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border-2"
                        style={{ borderColor: p.color, backgroundColor: "#1e1e1e" }}
                      />
                    </div>
                  </div>
                  <span className="text-[13px] font-semibold text-[#ededed] w-8 text-right">{p.score}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Recommendations ── */}
          {recommendations.length > 0 && (
            <div>
              <h3 className="text-[13px] font-medium text-[#888] uppercase tracking-wider mb-3">Recomendaciones</h3>
              <div className="space-y-2">
                {recommendations.map((rec, i) => {
                  const priorityColor = rec.priority === "high" ? "#ef4444" : rec.priority === "medium" ? "#f59e0b" : "#3ecf8e";
                  return (
                    <div
                      key={i}
                      className="rounded-xl border border-[#2e2e2e] p-4 flex items-start gap-3 hover:border-[#3a3a3a] transition-colors"
                      style={{ backgroundColor: "#1e1e1e" }}
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: `${priorityColor}15` }}
                      >
                        <Lightbulb size={14} style={{ color: priorityColor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        {rec.title && <p className="text-[13px] text-[#ededed] font-medium">{rec.title}</p>}
                        {rec.description && <p className="text-[12px] text-[#888] mt-0.5 leading-relaxed">{rec.description}</p>}
                      </div>
                      {rec.priority && (
                        <span
                          className="text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ color: priorityColor, backgroundColor: `${priorityColor}15` }}
                        >
                          {rec.priority === "high" ? "Alta" : rec.priority === "medium" ? "Media" : "Baja"}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Insights ── */}
          {insights.length > 2 && (
            <div className="rounded-xl border border-[#2e2e2e] p-5" style={{ backgroundColor: "#1e1e1e" }}>
              <h3 className="text-[13px] font-medium text-[#888] uppercase tracking-wider mb-3">Insights adicionales</h3>
              <div className="space-y-2">
                {insights.slice(2).map((insight, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#3ecf8e] mt-1.5 flex-shrink-0" />
                    <p className="text-[13px] text-[#ccc] leading-relaxed">{insight}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
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
import { WidgetContent, WIDGET_SIZES } from "./metricas-widgets";


const METRICAS_STORAGE_KEY = "nodelabz-metricas-layout";

interface WidgetType {
  id: string;
  label: string;
  icon: React.ReactNode;
  defaultW: number;
  defaultH: number;
  minW: number;
  minH: number;
  maxW: number;
  maxH: number;
  description: string;
}

// Helper to merge size constraints from WIDGET_SIZES
function ws(id: string, defaults: { defaultW: number; defaultH: number }) {
  const s = WIDGET_SIZES[id] ?? { minW: 2, minH: 2, maxW: 12, maxH: 16 };
  return { ...defaults, ...s };
}

const AVAILABLE_WIDGETS: WidgetType[] = [
  // ── Charts ──
  { id: "kpi", label: "KPI Card", icon: <BarChart3 size={16} />, description: "Metrica individual con valor y tendencia", ...ws("kpi", { defaultW: 3, defaultH: 4 }) },
  { id: "bar-chart", label: "Grafico de Barras", icon: <BarChart3 size={16} />, description: "Comparar valores entre categorias", ...ws("bar-chart", { defaultW: 6, defaultH: 8 }) },
  { id: "line-chart", label: "Grafico de Lineas", icon: <Activity size={16} />, description: "Tendencias a lo largo del tiempo", ...ws("line-chart", { defaultW: 6, defaultH: 8 }) },
  { id: "area-chart", label: "Grafico de Area", icon: <Activity size={16} />, description: "Volumen y tendencia combinados", ...ws("area-chart", { defaultW: 6, defaultH: 8 }) },
  { id: "donut", label: "Donut / Pie", icon: <Target size={16} />, description: "Distribucion porcentual", ...ws("donut", { defaultW: 5, defaultH: 10 }) },
  { id: "table", label: "Tabla", icon: <LayoutDashboard size={16} />, description: "Datos tabulares con columnas", ...ws("table", { defaultW: 6, defaultH: 8 }) },
  { id: "text", label: "Nota / Texto", icon: <Zap size={16} />, description: "Texto libre o anotacion", ...ws("text", { defaultW: 3, defaultH: 4 }) },
  // ── Marketing Performance ──
  { id: "leads-hoy", label: "Leads Hoy", icon: <Users size={16} />, description: "Contador en vivo de leads capturados hoy", ...ws("leads-hoy", { defaultW: 3, defaultH: 4 }) },
  { id: "roas-canal", label: "ROAS por Canal", icon: <BarChart3 size={16} />, description: "Comparar ROAS entre Meta, Google y TikTok", ...ws("roas-canal", { defaultW: 6, defaultH: 8 }) },
  { id: "gasto-revenue", label: "Gasto vs Revenue", icon: <Activity size={16} />, description: "Gasto publicitario vs ingresos generados", ...ws("gasto-revenue", { defaultW: 6, defaultH: 8 }) },
  { id: "cpl-trend", label: "CPL Trend", icon: <TrendingDown size={16} />, description: "Costo por lead a lo largo del tiempo", ...ws("cpl-trend", { defaultW: 6, defaultH: 8 }) },
  { id: "campaign-status", label: "Estado de Campanas", icon: <Target size={16} />, description: "Campanas activas, pausadas y finalizadas", ...ws("campaign-status", { defaultW: 4, defaultH: 5 }) },
  // ── CRM & Pipeline ──
  { id: "pipeline-funnel", label: "Pipeline Funnel", icon: <TrendingUp size={16} />, description: "Embudo visual de etapas de deals", ...ws("pipeline-funnel", { defaultW: 6, defaultH: 10 }) },
  { id: "deals-por-cerrar", label: "Deals por Cerrar", icon: <DollarSign size={16} />, description: "Deals mas cercanos al cierre", ...ws("deals-por-cerrar", { defaultW: 4, defaultH: 8 }) },
  { id: "win-rate", label: "Win Rate", icon: <Target size={16} />, description: "Tasa de conversion de deals", ...ws("win-rate", { defaultW: 3, defaultH: 4 }) },
  { id: "leads-calientes", label: "Leads Calientes", icon: <Zap size={16} />, description: "Leads HOT con mayor puntuacion", ...ws("leads-calientes", { defaultW: 4, defaultH: 8 }) },
  { id: "actividad-reciente", label: "Actividad Reciente", icon: <Activity size={16} />, description: "Ultimas actividades del CRM", ...ws("actividad-reciente", { defaultW: 4, defaultH: 8 }) },
  // ── Channels ──
  { id: "whatsapp-inbox", label: "WhatsApp Inbox", icon: <MessageCircle size={16} />, description: "Conversaciones sin leer y ultimos mensajes", ...ws("whatsapp-inbox", { defaultW: 4, defaultH: 6 }) },
  { id: "email-open-rate", label: "Email Open Rate", icon: <Mail size={16} />, description: "Tasa de apertura de emails actual", ...ws("email-open-rate", { defaultW: 3, defaultH: 4 }) },
  { id: "social-engagement", label: "Social Engagement", icon: <Globe size={16} />, description: "Engagement en redes sociales", ...ws("social-engagement", { defaultW: 4, defaultH: 6 }) },
  { id: "integration-status", label: "Estado Integraciones", icon: <Plug size={16} />, description: "Salud de plataformas conectadas", ...ws("integration-status", { defaultW: 4, defaultH: 5 }) },
  // ── AI & Insights ──
  { id: "ai-recomendacion", label: "AI Recomendacion", icon: <Lightbulb size={16} />, description: "Ultima recomendacion de la IA", ...ws("ai-recomendacion", { defaultW: 6, defaultH: 5 }) },
  { id: "health-score", label: "Health Score", icon: <Activity size={16} />, description: "Puntuacion de salud 0-100", ...ws("health-score", { defaultW: 3, defaultH: 7 }) },
  { id: "anomaly-alert", label: "Anomaly Alert", icon: <AlertTriangle size={16} />, description: "Metricas con desviaciones detectadas", ...ws("anomaly-alert", { defaultW: 4, defaultH: 5 }) },
  { id: "prediccion-revenue", label: "Prediccion Revenue", icon: <TrendingUp size={16} />, description: "Proyeccion de ingresos con IA", ...ws("prediccion-revenue", { defaultW: 6, defaultH: 8 }) },
  // ── Financial ──
  { id: "revenue-mtd", label: "Revenue MTD", icon: <DollarSign size={16} />, description: "Ingresos del mes con tendencia", ...ws("revenue-mtd", { defaultW: 3, defaultH: 4 }) },
  { id: "mrr-tracker", label: "MRR Tracker", icon: <DollarSign size={16} />, description: "Revenue recurrente mensual", ...ws("mrr-tracker", { defaultW: 6, defaultH: 8 }) },
  { id: "top-clientes", label: "Top Clientes", icon: <Users size={16} />, description: "Clientes con mayor valor", ...ws("top-clientes", { defaultW: 4, defaultH: 8 }) },
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
  const [gridHeight, setGridHeight] = useState(800);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dropPreview, setDropPreview] = useState<{
    gridX: number; gridY: number; w: number; h: number; canDrop: boolean; widgetId: string;
  } | null>(null);
  const dragWidgetIdRef = useRef<string | null>(null);

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
      const h = el.clientHeight;
      if (h > 100) setGridHeight(h);
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

  // ── Grid constants ──
  const GRID_COLS = 12;
  const GRID_ROW_HEIGHT = 30;
  const GRID_MARGIN = 14;
  // Compute max rows that fit the visible container (account for padding)
  const maxRows = Math.floor((gridHeight - 20) / (GRID_ROW_HEIGHT + GRID_MARGIN));

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

    // Scan for first position where the new card fits within visible area
    const MAX_ROWS = maxRows;
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
      layoutItem: { i: id, x: placeX, y: placeY, w, h, minW: widgetType.minW, minH: widgetType.minH, maxW: widgetType.maxW, maxH: widgetType.maxH },
      widgetType: widgetType.id,
      title: widgetType.label,
    };
    saveWidgets([...widgets, newWidget]);
  }, [widgets, saveWidgets, maxRows]);

  const removeWidget = useCallback((id: string) => {
    saveWidgets(widgets.filter((w) => w.layoutItem.i !== id));
  }, [widgets, saveWidgets]);

  const handleClear = useCallback(() => {
    saveWidgets([]);
  }, [saveWidgets]);

  // ── Drag-and-drop from sidebar ──

  // Build occupancy set from current widgets
  const buildOccupied = useCallback(() => {
    const occupied = new Set<string>();
    for (const widget of widgets) {
      const li = widget.layoutItem;
      for (let row = li.y; row < li.y + li.h; row++) {
        for (let col = li.x; col < li.x + li.w; col++) {
          occupied.add(`${col},${row}`);
        }
      }
    }
    return occupied;
  }, [widgets]);

  // Convert pixel coords to grid coords
  const pixelToGrid = useCallback((clientX: number, clientY: number) => {
    if (!gridRef.current) return { gx: 0, gy: 0 };
    const rect = gridRef.current.getBoundingClientRect();
    const scrollTop = gridRef.current.scrollTop;
    const colWidth = (gridWidth + GRID_MARGIN) / GRID_COLS;
    const dropX = clientX - rect.left - 16;
    const dropY = clientY - rect.top + scrollTop - 10;
    return {
      gx: Math.floor(dropX / colWidth),
      gy: Math.floor(dropY / (GRID_ROW_HEIGHT + GRID_MARGIN)),
    };
  }, [gridWidth]);

  // Check if a widget fits at a position (within bounds and no overlap)
  const checkFits = useCallback((gx: number, gy: number, w: number, h: number, occupied: Set<string>) => {
    const clampedX = Math.max(0, Math.min(gx, GRID_COLS - w));
    const clampedY = Math.max(0, gy);
    // Check if widget would exceed the visible area
    if (clampedY + h > maxRows) return false;
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        if (occupied.has(`${clampedX + dx},${clampedY + dy}`)) return false;
      }
    }
    return true;
  }, [maxRows]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes("application/x-widget-id")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";

    // Get widget type from ref (dataTransfer.getData not available in dragOver)
    const wId = dragWidgetIdRef.current;
    const wt = wId ? AVAILABLE_WIDGETS.find((w) => w.id === wId) : null;
    if (!wt) return;

    const { gx, gy } = pixelToGrid(e.clientX, e.clientY);
    const clampedX = Math.max(0, Math.min(gx, GRID_COLS - wt.defaultW));
    const clampedY = Math.max(0, gy);

    const occupied = buildOccupied();
    const canDrop = checkFits(clampedX, clampedY, wt.defaultW, wt.defaultH, occupied);

    setDropPreview((prev) => {
      // Only update if position changed to avoid excessive re-renders
      if (prev && prev.gridX === clampedX && prev.gridY === clampedY && prev.widgetId === wt.id) return prev;
      return { gridX: clampedX, gridY: clampedY, w: wt.defaultW, h: wt.defaultH, canDrop, widgetId: wt.id };
    });
  }, [pixelToGrid, buildOccupied, checkFits]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if actually leaving the grid container (not entering a child)
    if (gridRef.current && !gridRef.current.contains(e.relatedTarget as globalThis.Node | null)) {
      setDropPreview(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();

    const widgetId = e.dataTransfer.getData("application/x-widget-id");
    const widgetType = AVAILABLE_WIDGETS.find((w) => w.id === widgetId);
    const preview = dropPreview;
    setDropPreview(null);
    dragWidgetIdRef.current = null;

    if (!widgetType || !preview) return;

    // Don't drop if position is occupied
    if (!preview.canDrop) return;

    const id = `${widgetType.id}-${Date.now()}`;
    const newWidget: PlacedWidget = {
      layoutItem: { i: id, x: preview.gridX, y: preview.gridY, w: widgetType.defaultW, h: widgetType.defaultH, minW: widgetType.minW, minH: widgetType.minH, maxW: widgetType.maxW, maxH: widgetType.maxH },
      widgetType: widgetType.id,
      title: widgetType.label,
    };
    saveWidgets([...widgets, newWidget]);
  }, [dropPreview, widgets, saveWidgets]);

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
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/x-widget-id", wt.id);
                      e.dataTransfer.effectAllowed = "copy";
                      dragWidgetIdRef.current = wt.id;
                    }}
                    onClick={() => addWidget(wt)}
                    className="block w-full text-left text-[14px] py-[6px] px-3 transition-colors text-[#999] hover:text-[#ededed] hover:bg-[#2a2a2a] rounded-md mb-0.5"
                    style={{ cursor: "grab" }}
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
                  </div>
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
        <div
          ref={gridRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{ flex: 1, overflow: "auto", padding: "10px 16px", minWidth: 0, position: "relative" }}
        >
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
          {/* Drop preview ghost */}
          {dropPreview && (
            <div
              style={{
                position: "absolute",
                left: 16 + dropPreview.gridX * ((gridWidth + GRID_MARGIN) / GRID_COLS),
                top: 10 + dropPreview.gridY * (GRID_ROW_HEIGHT + GRID_MARGIN),
                width: dropPreview.w * ((gridWidth + GRID_MARGIN) / GRID_COLS) - GRID_MARGIN,
                height: dropPreview.h * (GRID_ROW_HEIGHT + GRID_MARGIN) - GRID_MARGIN,
                borderRadius: 10,
                border: `2px dashed ${dropPreview.canDrop ? "#3ecf8e" : "#ef4444"}`,
                backgroundColor: dropPreview.canDrop ? "#3ecf8e15" : "#ef444415",
                pointerEvents: "none",
                zIndex: 30,
                transition: "left 150ms ease, top 150ms ease",
              }}
            />
          )}
          {widgets.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 12 }}>
              <LayoutDashboard size={40} color={dropPreview ? "#3ecf8e" : "#333"} />
              <p style={{ fontSize: 14, color: dropPreview ? "#3ecf8e" : "#555" }}>
                {dropPreview ? "Suelta aqui para agregar" : "Arrastra componentes desde el panel izquierdo"}
              </p>
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
                maxRows,
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
                      {/* Body */}
                      <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
                        <WidgetContent widgetType={widget?.widgetType ?? ""} />
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
  const isHub = node.id === "hub";
  const utils = trpc.useUtils();

  const syncMutation = trpc.integrations.syncNow.useMutation({
    onSuccess: () => {
      utils.integrations.list.invalidate();
      utils.dashboard.getSummary.invalidate();
    },
  });

  const disconnectMutation = trpc.integrations.disconnect.useMutation({
    onSuccess: () => {
      utils.integrations.list.invalidate();
      onClose();
    },
  });

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

      {/* Sync status message */}
      {syncMutation.isSuccess && (
        <div style={{ padding: "10px 20px", borderBottom: "1px solid #2e2e2e" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#3ecf8e", fontSize: 12 }}>
            <CheckCircle2 size={13} />
            Sincronizado — {syncMutation.data?.synced ?? 0} registros
          </div>
        </div>
      )}
      {syncMutation.isError && (
        <div style={{ padding: "10px 20px", borderBottom: "1px solid #2e2e2e" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#ef4444", fontSize: 12 }}>
            <XCircle size={13} />
            {syncMutation.error?.message || "Error al sincronizar"}
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
      {!isHub && (
        <div
          style={{
            padding: "16px 20px",
            borderTop: "1px solid #2e2e2e",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => syncMutation.mutate({ integrationId: node.id })}
              disabled={syncMutation.isPending}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: 8,
                border: "none",
                background: "#3ecf8e",
                color: "#171717",
                fontSize: 12,
                fontWeight: 600,
                cursor: syncMutation.isPending ? "wait" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                opacity: syncMutation.isPending ? 0.6 : 1,
              }}
            >
              <RotateCcw size={13} className={syncMutation.isPending ? "animate-spin" : ""} />
              {syncMutation.isPending ? "Sincronizando..." : "Sincronizar ahora"}
            </button>
          </div>
          <button
            onClick={() => {
              if (confirm(`Desconectar ${data.label}?`)) {
                disconnectMutation.mutate({ integrationId: node.id });
              }
            }}
            disabled={disconnectMutation.isPending}
            style={{
              padding: "8px",
              borderRadius: 8,
              border: "1px solid #2e2e2e",
              background: "transparent",
              color: "#888",
              fontSize: 11,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
            }}
          >
            <XCircle size={12} />
            {disconnectMutation.isPending ? "Desconectando..." : "Desconectar"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Node Map Page ─────────────────────────────────────────────────────────

export function NodeMapPage() {
  const { data: session } = trpc.auth.getSession.useQuery();
  const { data: integrations } = trpc.integrations.list.useQuery();

  // Build nodes from real integrations + static fallback nodes
  const dynamicNodes = useMemo((): Node<IntegrationNodeData>[] => {
    if (!integrations || integrations.length === 0) return nodeMapInitialNodes;

    const platformIconMap: Record<string, keyof typeof nodeMapIconMap> = {
      meta_ads: "megaphone",
      google_ads: "search",
      ga4: "chart",
      tiktok: "music",
      shopify: "shop",
    };

    const platformLabels: Record<string, string> = {
      meta_ads: "Meta Ads",
      google_ads: "Google Ads",
      ga4: "Google Analytics 4",
      tiktok: "TikTok Ads",
      shopify: "Shopify",
    };

    // Central hub
    const hubLabel = session?.tenant?.name ?? "Mi Empresa";
    const nodes: Node<IntegrationNodeData>[] = [
      {
        id: "hub",
        type: "integration",
        position: { x: 400, y: 250 },
        data: {
          label: hubLabel,
          icon: "users" as keyof typeof nodeMapIconMap,
          status: "healthy",
          subtitle: "CRM & Data Hub",
          description: "Plataforma central de datos",
        },
      },
    ];

    integrations.forEach((int, i) => {
      const angle = (i / integrations.length) * 2 * Math.PI - Math.PI / 2;
      const radius = 220;
      const x = 400 + Math.cos(angle) * radius;
      const y = 250 + Math.sin(angle) * radius;

      const status: StatusType = int.status === "active" ? "healthy"
        : int.status === "error" ? "broken"
        : "warning";

      nodes.push({
        id: int.id,
        type: "integration",
        position: { x, y },
        data: {
          label: platformLabels[int.platform] ?? int.platform,
          icon: platformIconMap[int.platform] ?? "chart",
          status,
          subtitle: int.status === "active" ? "Sincronizado" : int.status,
          description: int.lastSyncAt ? `Ultimo sync: ${new Date(int.lastSyncAt).toLocaleDateString()}` : "Sin sincronizar",
        },
      });
    });

    return nodes;
  }, [integrations, session]);

  const dynamicEdges = useMemo((): Edge[] => {
    return dynamicNodes
      .filter((n) => n.id !== "hub")
      .map((n) => ({
        id: `hub-${n.id}`,
        source: "hub",
        target: n.id,
        type: "smoothstep",
        animated: n.data.status === "healthy",
        style: { stroke: statusColor[n.data.status], strokeWidth: 2, opacity: 0.6 },
      }));
  }, [dynamicNodes]);

  const [nodes, , onNodesChange] = useNodesState(dynamicNodes);
  const [edges, , onEdgesChange] = useEdgesState(dynamicEdges);
  const [selectedNode, setSelectedNode] = useState<Node<IntegrationNodeData> | null>(null);

  const displayNodes = dynamicNodes.length > 0 ? dynamicNodes : nodes;
  const displayEdges = dynamicEdges.length > 0 ? dynamicEdges : edges;

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

  const healthyCount = displayNodes.filter((n) => n.data.status === "healthy").length;
  const warningCount = displayNodes.filter((n) => n.data.status === "warning").length;
  const brokenCount = displayNodes.filter((n) => n.data.status === "broken").length;

  return (
    <>
      {/* ====== HEADER BAR ====== */}
      <div className="flex items-center gap-4 mb-4">
        <h1 className="text-base font-semibold tracking-tight whitespace-nowrap text-[#ededed]">
          Node Map
        </h1>

        <div className="mx-2 h-5 w-px bg-[#2e2e2e]" />

        <span className="text-xs text-[#666]">Marketing Ecosystem</span>

        <div className="flex-1" />

        {/* Status indicators */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[12px] text-[#3ecf8e]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3ecf8e]" />
            {healthyCount} Healthy
          </div>
          <div className="flex items-center gap-1.5 text-[12px] text-[#f5a623]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f5a623]" />
            {warningCount} Warning
          </div>
          <div className="flex items-center gap-1.5 text-[12px] text-[#ef4444]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
            {brokenCount} Error
          </div>
        </div>

        <div className="mx-2 h-5 w-px bg-[#2e2e2e]" />

        <div className="flex items-center gap-1.5 rounded-md border border-[#2e2e2e] bg-[#252525] px-3 py-1.5 text-[12px] text-[#888]">
          <TrendingUp size={13} />
          {displayNodes.length} integraciones
        </div>
      </div>

      {/* ====== MAIN LAYOUT ====== */}
      <div className="flex overflow-hidden rounded-lg border border-[#2e2e2e] relative" style={{ height: "calc(100vh - 180px)" }}>
        {/* ReactFlow Canvas */}
        <div className="flex-1">
          <ReactFlow
            nodes={displayNodes}
            edges={displayEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeMapNodeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            proOptions={{ hideAttribution: true }}
            style={{ background: "#171717" }}
            defaultEdgeOptions={{ type: "smoothstep" }}
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#2e2e2e" />
            <Controls showInteractive={false} className="!rounded-lg !border !border-[#2e2e2e] !overflow-hidden" />
            <MiniMap
              style={{ background: "#1c1c1c", borderRadius: 8, border: "1px solid #2e2e2e" }}
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
          <DetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
        )}

        {/* AI Suggestion Banner — dynamic based on integration state */}
        {(() => {
          const stale = displayNodes.filter((n) => {
            if (n.id === "hub") return false;
            const desc = n.data.description || "";
            return desc === "Sin sincronizar";
          });
          const broken = displayNodes.filter((n) => n.data.status === "broken");
          const warning = displayNodes.filter((n) => n.data.status === "warning");

          let message: React.ReactNode = null;

          if (broken.length > 0) {
            message = (
              <>
                {broken.map((n) => n.data.label).join(", ")} {broken.length === 1 ? "tiene" : "tienen"} error de conexion.{" "}
                <span className="text-[#888]">Revisa la configuracion de la integracion.</span>
              </>
            );
          } else if (stale.length > 0) {
            message = (
              <>
                {stale.map((n) => n.data.label).join(", ")} {stale.length === 1 ? "no se ha" : "no se han"} sincronizado aun.{" "}
                <span className="text-[#888]">Haz click en Sincronizar para importar datos.</span>
              </>
            );
          } else if (warning.length > 0) {
            message = (
              <>
                {warning.map((n) => n.data.label).join(", ")} {warning.length === 1 ? "necesita" : "necesitan"} atencion.{" "}
                <span className="text-[#888]">Verifica el estado de los tokens.</span>
              </>
            );
          } else if (healthyCount > 1) {
            message = (
              <>
                Todas las integraciones funcionan correctamente.{" "}
                <span className="text-[#888]">{healthyCount - 1} plataformas sincronizando datos.</span>
              </>
            );
          }

          if (!message) return null;

          const isGood = broken.length === 0 && stale.length === 0 && warning.length === 0;
          const bannerColor = broken.length > 0 ? "#ef4444" : stale.length > 0 ? "#f59e0b" : warning.length > 0 ? "#f59e0b" : "#3ecf8e";

          return (
            <div
              className="absolute top-4 left-4 flex items-center gap-3 rounded-xl border border-[#2e2e2e] bg-[#1c1c1c]/90 backdrop-blur-sm px-5 py-3 shadow-2xl transition-all z-10"
              style={{ right: selectedNode ? 336 : 16 }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${bannerColor}15`, border: `1px solid ${bannerColor}30` }}
              >
                {isGood ? <CheckCircle2 size={14} color={bannerColor} /> : <AlertTriangle size={14} color={bannerColor} />}
              </div>
              <div className="flex-1 min-w-0 text-[13px] leading-relaxed text-[#ededed]">
                <span className="font-semibold" style={{ color: bannerColor }}>
                  {isGood ? "Estado:" : "Atencion:"}
                </span>{" "}
                {message}
              </div>
            </div>
          );
        })()}
      </div>
    </>
  );
}

export function RecomendacionesIAPage() {
  const { data: healthScore } = trpc.healthScore.getCurrent.useQuery();
  const { data: insights, isLoading } = trpc.reports.getInsights.useQuery();

  const recommendations = useMemo(() => {
    const recs: Array<{ severity: string; title: string; description: string; action: string }> = [];

    // From health score recommendations
    const hsRecs = (healthScore?.recommendations ?? []) as Array<{ title?: string; description?: string; severity?: string }>;
    for (const r of hsRecs) {
      recs.push({
        severity: r.severity ?? "warning",
        title: r.title ?? "Recomendacion",
        description: r.description ?? "",
        action: "Ver detalles",
      });
    }

    // From AI memory insights
    if (insights) {
      for (const i of insights) {
        recs.push({
          severity: "opportunity",
          title: i.key,
          description: typeof i.value === "string" ? i.value : JSON.stringify(i.value),
          action: "Explorar",
        });
      }
    }

    // If no data, show helpful empty-ish state
    if (recs.length === 0) {
      // Generate recommendations from health score pillars
      if (healthScore) {
        const pillars = [
          { name: "Ad Performance", score: healthScore.adPerformance },
          { name: "Content Engagement", score: healthScore.contentEngagement },
          { name: "Email Effectiveness", score: healthScore.emailEffectiveness },
          { name: "Lead Conversion", score: healthScore.leadConversion },
          { name: "Revenue Attribution", score: healthScore.revenueAttribution },
        ];
        for (const p of pillars) {
          if (p.score < 50) {
            recs.push({
              severity: "critical",
              title: `${p.name} necesita atencion`,
              description: `Tu score de ${p.name} es ${p.score}/100. Revisa esta area para mejorar.`,
              action: "Ver Health Score",
            });
          } else if (p.score < 70) {
            recs.push({
              severity: "warning",
              title: `${p.name} puede mejorar`,
              description: `Tu score de ${p.name} es ${p.score}/100. Hay oportunidad de mejora.`,
              action: "Optimizar",
            });
          }
        }
      }
    }

    return recs;
  }, [healthScore, insights]);

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
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-[#1e1e1e] animate-pulse" />
          ))}
        </div>
      ) : recommendations.length === 0 ? (
        <EmptyState
          title="Sin recomendaciones"
          description="Calcula tu Health Score y conecta plataformas para recibir recomendaciones personalizadas."
          icon={<Lightbulb size={24} className="text-[#888]" />}
        />
      ) : (
        <div className="space-y-3">
          {recommendations.map((rec, i) => (
            <div
              key={i}
              className="rounded-lg border p-4 flex items-start gap-4"
              style={{
                backgroundColor: "#1e1e1e",
                borderColor: (severityColors[rec.severity] ?? "#333") + "40",
              }}
            >
              <div
                className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                style={{ backgroundColor: severityColors[rec.severity] ?? "#888" }}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-[13px] font-medium text-[#ededed]">{rec.title}</h4>
                  <Badge
                    text={rec.severity === "critical" ? "Critico" : rec.severity === "warning" ? "Atencion" : "Oportunidad"}
                    color={severityColors[rec.severity] ?? "#888"}
                  />
                </div>
                <p className="text-[12px] text-[#888]">{rec.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export function DigestDiarioPage() {
  const { data: contactsData } = trpc.contacts.list.useQuery({ page: 1, limit: 1 });
  const { data: dealStats } = trpc.deals.getStats.useQuery();
  const { data: activities } = trpc.activities.list.useQuery({ page: 1, limit: 10 });
  const { data: integrations } = trpc.integrations.list.useQuery();
  const { data: healthScore } = trpc.healthScore.getCurrent.useQuery();
  const { data: notifications } = trpc.notifications.list.useQuery({ limit: 5 });

  const today = new Date().toLocaleDateString("es-CR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const contactCount = contactsData?.total ?? 0;
  const totalDeals = dealStats?.totalDeals ?? 0;
  const totalValue = dealStats?.totalValue ?? 0;
  const winRate = dealStats?.winRate ?? 0;
  const activeIntegrations = integrations?.filter((i) => i.status === "active").length ?? 0;
  const recentActivities = activities?.activities ?? [];

  return (
    <>
      <SectionHeader
        title="Digest Diario"
        description="Resumen de tu plataforma"
      />
      <div className="space-y-4">
        {/* Date header */}
        <div className="rounded-lg border border-[#2e2e2e] p-4" style={{ backgroundColor: "#1e1e1e" }}>
          <div className="flex items-center gap-2 mb-3">
            <Newspaper size={14} className="text-[#3ecf8e]" />
            <span className="text-[13px] font-medium text-[#ededed] capitalize">{today}</span>
          </div>
          <div className="space-y-3 text-[13px] text-[#ccc]">
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#3ecf8e] mt-1.5" />
              <p><strong>{contactCount} contactos</strong> en tu base de datos</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#6366f1] mt-1.5" />
              <p><strong>{totalDeals} deals</strong> activos con valor total de <strong>${totalValue.toLocaleString()}</strong>. Win rate: {(winRate * 100).toFixed(1)}%</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] mt-1.5" />
              <p><strong>{activeIntegrations} integraciones</strong> activas de {integrations?.length ?? 0} conectadas</p>
            </div>
            {healthScore && (
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#06b6d4] mt-1.5" />
                <p>Health Score: <strong>{healthScore.overallScore}/100</strong></p>
              </div>
            )}
          </div>
        </div>

        {/* Recent activity */}
        {recentActivities.length > 0 && (
          <div className="rounded-lg border border-[#2e2e2e] p-4" style={{ backgroundColor: "#1e1e1e" }}>
            <h3 className="text-[13px] font-medium text-[#ededed] mb-3">Actividad reciente</h3>
            <div className="space-y-2">
              {recentActivities.slice(0, 5).map((a) => (
                <div key={a.id} className="flex items-center gap-2 text-[12px] text-[#ccc]">
                  <Activity size={12} className="text-[#555] flex-shrink-0" />
                  <Badge text={a.type.replace(/_/g, " ")} color="#6366f1" />
                  {a.subject && <span className="text-[#888] truncate">{a.subject}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notifications */}
        {notifications && notifications.length > 0 && (
          <div className="rounded-lg border border-[#2e2e2e] p-4" style={{ backgroundColor: "#1e1e1e" }}>
            <h3 className="text-[13px] font-medium text-[#ededed] mb-3">Notificaciones</h3>
            <div className="space-y-2">
              {notifications.map((n) => (
                <div key={n.id} className="flex items-start gap-2 text-[12px]">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${n.read ? "bg-[#555]" : "bg-[#3ecf8e]"}`} />
                  <div>
                    <p className="text-[#ededed] font-medium">{n.title}</p>
                    <p className="text-[#888]">{n.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export function ConectarPlataformaPage() {
  const { data: integrations, isLoading } = trpc.integrations.list.useQuery();
  const utils = trpc.useUtils();

  const startOAuth = trpc.integrations.startOAuth.useMutation({
    onSuccess: (data) => {
      window.open(data.authUrl, "_blank");
    },
  });
  const disconnect = trpc.integrations.disconnect.useMutation({
    onSuccess: () => { utils.integrations.list.invalidate(); },
  });
  const syncNow = trpc.integrations.syncNow.useMutation();

  const connectedMap = useMemo(() => {
    const map = new Map<string, { id: string; status: string; lastSyncAt: Date | null }>();
    for (const i of integrations ?? []) {
      map.set(i.platform, { id: i.id, status: i.status, lastSyncAt: i.lastSyncAt });
    }
    return map;
  }, [integrations]);

  const allPlatforms = [
    { name: "Meta Ads", provider: "meta_ads" as const, icon: "M", color: "#1877F2" },
    { name: "Google Ads", provider: "google_ads" as const, icon: "G", color: "#4285F4" },
    { name: "TikTok Ads", provider: "tiktok" as const, icon: "T", color: "#000000" },
    { name: "Google Analytics 4", provider: "ga4" as const, icon: "A", color: "#E37400" },
    { name: "Shopify", provider: "shopify" as const, icon: "S", color: "#95BF47" },
  ];

  return (
    <>
      <SectionHeader
        title="Conectar Plataforma"
        description="Conecta tus plataformas de marketing para centralizar datos"
      />
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-[#1e1e1e] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {allPlatforms.map((p) => {
            const connected = connectedMap.get(p.provider);
            const isActive = connected?.status === "active";
            return (
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
                    {isActive ? "Conectado" : connected ? "Desconectado" : "Disponible"}
                    {connected?.lastSyncAt && ` · Sync: ${new Date(connected.lastSyncAt).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {isActive ? (
                    <>
                      <button
                        onClick={() => syncNow.mutate({ integrationId: connected!.id })}
                        disabled={syncNow.isPending}
                        className="text-[10px] px-2 py-1 rounded border border-[#333] text-[#ccc] hover:border-[#555] transition-colors"
                      >
                        Sync
                      </button>
                      <button
                        onClick={() => disconnect.mutate({ integrationId: connected!.id })}
                        disabled={disconnect.isPending}
                        className="text-[10px] px-2 py-1 rounded border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        Desconectar
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => startOAuth.mutate({ provider: p.provider })}
                      disabled={startOAuth.isPending}
                      className="text-[11px] px-3 py-1.5 rounded border border-[#333] text-[#ccc] hover:border-[#3ecf8e]/40 hover:text-[#3ecf8e] transition-colors"
                    >
                      {startOAuth.isPending ? "..." : "Conectar"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

export function GenerarReportePage() {
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [generated, setGenerated] = useState(false);

  const generateMutation = trpc.reports.generate.useMutation({
    onSuccess: (data) => {
      setGenerated(true);
      // Download the PDF
      const link = document.createElement("a");
      link.href = `data:application/pdf;base64,${data.pdf}`;
      link.download = data.filename;
      link.click();
    },
  });

  return (
    <>
      <SectionHeader
        title="Generar Reporte"
        description="Crea reportes personalizados de tus metricas"
      />

      {/* Date range selection */}
      <div className="rounded-lg border border-[#2e2e2e] p-4 mb-6" style={{ backgroundColor: "#1e1e1e" }}>
        <h3 className="text-[13px] font-medium text-[#ededed] mb-3">Periodo del reporte</h3>
        <div className="flex items-center gap-4">
          <div>
            <label className="block text-[11px] text-[#888] mb-1">Desde</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-[36px] px-3 rounded-lg border border-[#333] bg-[#222] text-[13px] text-[#ededed] outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] text-[#888] mb-1">Hasta</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-[36px] px-3 rounded-lg border border-[#333] bg-[#222] text-[13px] text-[#ededed] outline-none"
            />
          </div>
          <div className="pt-4">
            <button
              onClick={() => generateMutation.mutate({ from: new Date(fromDate!), to: new Date(toDate!) })}
              disabled={generateMutation.isPending}
              className="flex items-center gap-1.5 text-[12px] text-black px-4 py-2 rounded-lg font-medium disabled:opacity-50"
              style={{ backgroundColor: "#3ecf8e" }}
            >
              {generateMutation.isPending ? "Generando..." : "Generar PDF"}
            </button>
          </div>
        </div>
        {generateMutation.error && (
          <p className="text-[12px] text-red-400 mt-2">{generateMutation.error.message}</p>
        )}
        {generated && (
          <p className="text-[12px] text-[#3ecf8e] mt-2">Reporte descargado exitosamente.</p>
        )}
      </div>

      {/* Quick reports */}
      <h3 className="text-[13px] font-medium text-[#ededed] mb-3">Reportes rapidos</h3>
      <div className="grid grid-cols-3 gap-4">
        {[
          { title: "Resumen Ejecutivo", desc: "Vision general de todas las metricas clave", icon: <FileText size={20} />, days: 30 },
          { title: "Rendimiento de Ads", desc: "Analisis detallado de campanas publicitarias", icon: <BarChart3 size={20} />, days: 7 },
          { title: "Pipeline de Ventas", desc: "Estado del pipeline y deals activos", icon: <Layers size={20} />, days: 30 },
        ].map((r) => (
          <button
            key={r.title}
            onClick={() => {
              const to = new Date();
              const from = new Date();
              from.setDate(from.getDate() - r.days);
              generateMutation.mutate({ from, to });
            }}
            disabled={generateMutation.isPending}
            className="rounded-lg border border-[#2e2e2e] p-6 text-left hover:border-[#3ecf8e]/40 transition-colors disabled:opacity-50"
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
