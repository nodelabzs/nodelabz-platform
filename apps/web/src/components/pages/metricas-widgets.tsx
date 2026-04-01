// @ts-nocheck
"use client";

import React, { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
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
} from "recharts";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Target,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  MessageCircle,
  Mail,
  Globe,
  Plug,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  XCircle,
} from "lucide-react";

// ── Theme Colors ──
const C = {
  green: "#3ecf8e",
  indigo: "#6366f1",
  amber: "#f59e0b",
  red: "#ef4444",
  cyan: "#06b6d4",
  pink: "#ec4899",
  purple: "#a855f7",
};
const PIE_COLORS = [C.green, C.indigo, C.amber, C.cyan, C.pink, C.purple];

// ── Shared Styles ──
const tooltipStyle = {
  contentStyle: {
    background: "#1c1c1c",
    border: "1px solid #2e2e2e",
    borderRadius: 8,
    fontSize: 11,
    color: "#ccc",
  },
  labelStyle: { color: "#999" },
};
const axisProps = {
  tick: { fill: "#555", fontSize: 10 },
  axisLine: false,
  tickLine: false,
};


// ── Helpers ──
function useDateRange(days: number) {
  return useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    return { from, to };
  }, [days]);
}

function fmt$(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n.toFixed(0)}`;
}

function fmtDate(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("es", { month: "short", day: "numeric" });
}

// ── Shared Components ──
function Loading() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
      }}
    >
      <div
        style={{
          width: 16,
          height: 16,
          border: "2px solid #2e2e2e",
          borderTopColor: C.green,
          borderRadius: "50%",
          animation: "widget-spin 0.6s linear infinite",
        }}
      />
      <style>{`@keyframes widget-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Empty({ msg = "Sin datos" }: { msg?: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        color: "#444",
        fontSize: 11,
      }}
    >
      {msg}
    </div>
  );
}

function emptyDataMsg(connectedPlatforms?: number): string {
  if (connectedPlatforms && connectedPlatforms > 0) {
    return "Sin datos de campanas — los datos se sincronizaran pronto";
  }
  return "Conecta una plataforma para ver datos";
}

// ── Shared: Mini sparkline for KPI cards ──
function Sparkline({ data, color, height = 28 }: { data: number[]; color: string; height?: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 100;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${height - ((v - min) / range) * (height - 2) - 1}`).join(" ");
  const fillPoints = `0,${height} ${points} ${w},${height}`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} style={{ width: "100%", height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`spark-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.2} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={fillPoints} fill={`url(#spark-${color.replace("#", "")})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Shared: Circular progress ring ──
function ProgressRing({ value, size = 56, strokeWidth = 5, color }: { value: number; size?: number; strokeWidth?: number; color: string }) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(value, 100) / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#252525" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
    </svg>
  );
}

// ── Shared: Trend badge ──
function TrendBadge({ value, positive, neutral }: { value: string; positive?: boolean; neutral?: boolean }) {
  const bg = neutral ? "#ffffff08" : positive ? "#3ecf8e15" : "#ef444415";
  const fg = neutral ? "#888" : positive ? C.green : C.red;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 500,
      backgroundColor: bg, color: fg,
    }}>
      {!neutral && (positive ? <ArrowUpRight size={9} /> : <ArrowDownRight size={9} />)}
      {value}
    </span>
  );
}

// stale time shared across KPI widgets (all use the same summary query)
const SUMMARY_OPTS = { staleTime: 60_000 } as const;

// ════════════════════════════════════════════════
// KPI WIDGETS
// ════════════════════════════════════════════════

function KpiCardWidget() {
  const { data, isLoading } = trpc.dashboard.getSummary.useQuery(undefined, SUMMARY_OPTS);
  if (isLoading) return <Loading />;
  const total = data?.totalContacts ?? 0;
  const today = data?.leadsToday ?? 0;
  const hot = data?.hotLeadsCount ?? 0;
  // Build sparkline from daily conversions (proxy for new contacts)
  const spark = (data?.dailyMetrics ?? []).slice(-14).map((d) => d.conversions);

  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%", padding: "12px 14px 8px" }}>
      {/* Top row: icon + trend */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: "#3ecf8e12", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Users size={15} color={C.green} />
        </div>
        {today > 0 && <TrendBadge value={`+${today} hoy`} positive />}
      </div>

      {/* Big value */}
      <div>
        <div style={{ fontSize: 28, fontWeight: 700, color: "#ededed", lineHeight: 1, letterSpacing: "-0.02em" }}>
          {fmtNum(total)}
        </div>
        <div style={{ fontSize: 11, color: "#666", marginTop: 3 }}>Total Contactos</div>
      </div>

      {/* Bottom: sparkline + hot leads badge */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Sparkline data={spark.length >= 2 ? spark : [0, 0]} color={C.green} height={22} />
        </div>
        {hot > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 9, color: C.amber, flexShrink: 0 }}>
            <Zap size={9} />
            <span>{hot} HOT</span>
          </div>
        )}
      </div>
    </div>
  );
}

function LeadsHoyWidget() {
  const { data, isLoading } = trpc.dashboard.getSummary.useQuery(undefined, SUMMARY_OPTS);
  if (isLoading) return <Loading />;
  const today = data?.leadsToday ?? 0;
  const total = data?.totalContacts ?? 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%", padding: "12px 14px 10px" }}>
      {/* Top: icon with pulse dot */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: "#3ecf8e12", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Users size={15} color={C.green} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: "#666" }}>
          <div style={{
            width: 6, height: 6, borderRadius: 3, backgroundColor: C.green,
            boxShadow: `0 0 6px ${C.green}80`,
            animation: "widget-pulse 2s ease-in-out infinite",
          }} />
          EN VIVO
        </div>
      </div>
      <style>{`@keyframes widget-pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }`}</style>

      {/* Big number */}
      <div>
        <div style={{ fontSize: 32, fontWeight: 700, color: C.green, lineHeight: 1, letterSpacing: "-0.02em" }}>
          {today}
        </div>
        <div style={{ fontSize: 11, color: "#666", marginTop: 3 }}>Leads Capturados Hoy</div>
      </div>

      {/* Progress vs total */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#555", marginBottom: 3 }}>
          <span>del total</span>
          <span>{total > 0 ? ((today / total) * 100).toFixed(1) : 0}%</span>
        </div>
        <div style={{ height: 3, borderRadius: 2, backgroundColor: "#252525", overflow: "hidden" }}>
          <div style={{
            width: `${total > 0 ? Math.min((today / total) * 100, 100) : 0}%`,
            height: "100%", borderRadius: 2, backgroundColor: C.green,
            transition: "width 0.6s ease",
          }} />
        </div>
      </div>
    </div>
  );
}

function WinRateWidget() {
  const { data, isLoading } = trpc.dashboard.getSummary.useQuery(undefined, SUMMARY_OPTS);
  if (isLoading) return <Loading />;
  const wr = data?.winRate ?? 0;
  const wrPct = Math.round(wr * 100);
  const totalDeals = data?.totalDeals ?? 0;
  const stages = data?.dealsByStage ?? [];
  const won = stages.find((s) => /ganado|won/i.test(s.stageName))?.count ?? 0;
  const lost = stages.find((s) => /perdido|lost/i.test(s.stageName))?.count ?? 0;
  const color = wrPct >= 50 ? C.green : wrPct >= 25 ? C.amber : C.red;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: "10px 14px", gap: 6 }}>
      {/* Ring with percentage */}
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <ProgressRing value={wrPct} size={64} strokeWidth={5} color={color} />
        <div style={{ position: "absolute", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <span style={{ fontSize: 18, fontWeight: 700, color, lineHeight: 1 }}>{wrPct}%</span>
        </div>
      </div>

      <div style={{ fontSize: 11, color: "#666", fontWeight: 500 }}>Win Rate</div>

      {/* Won / Lost / Total */}
      <div style={{ display: "flex", gap: 12, fontSize: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <div style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: C.green }} />
          <span style={{ color: "#888" }}>{won} won</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <div style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: C.red }} />
          <span style={{ color: "#888" }}>{lost} lost</span>
        </div>
        <span style={{ color: "#555" }}>{totalDeals} total</span>
      </div>
    </div>
  );
}

function EmailOpenRateWidget() {
  const { data, isLoading } = trpc.dashboard.getSummary.useQuery(undefined, SUMMARY_OPTS);
  if (isLoading) return <Loading />;
  const openRate = data?.avgOpenRate ?? 0;
  const clickRate = data?.avgClickRate ?? 0;
  const sent = data?.emailCampaignsSent ?? 0;
  const openPct = Math.round(openRate * 100);
  const clickPct = Math.round(clickRate * 100);
  const color = openPct >= 25 ? C.green : openPct >= 15 ? C.amber : C.red;

  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%", padding: "12px 14px 10px" }}>
      {/* Top */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: "#6366f112", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Mail size={15} color={C.indigo} />
        </div>
        <TrendBadge value={`${sent} enviadas`} neutral />
      </div>

      {/* Main metric */}
      <div>
        <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1, letterSpacing: "-0.02em" }}>
          {openPct}%
        </div>
        <div style={{ fontSize: 11, color: "#666", marginTop: 3 }}>Tasa de Apertura</div>
      </div>

      {/* Bars: Open rate + Click rate */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#555", marginBottom: 2 }}>
            <span>Apertura</span>
            <span style={{ color }}>{openPct}%</span>
          </div>
          <div style={{ height: 4, borderRadius: 2, backgroundColor: "#252525", overflow: "hidden" }}>
            <div style={{ width: `${openPct}%`, height: "100%", borderRadius: 2, backgroundColor: color, transition: "width 0.6s ease" }} />
          </div>
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#555", marginBottom: 2 }}>
            <span>Click</span>
            <span style={{ color: C.cyan }}>{clickPct}%</span>
          </div>
          <div style={{ height: 4, borderRadius: 2, backgroundColor: "#252525", overflow: "hidden" }}>
            <div style={{ width: `${clickPct}%`, height: "100%", borderRadius: 2, backgroundColor: C.cyan, transition: "width 0.6s ease" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function RevenueMtdWidget() {
  const { data, isLoading } = trpc.dashboard.getSummary.useQuery(undefined, SUMMARY_OPTS);
  if (isLoading) return <Loading />;
  const revenue = data?.totalRevenue ?? 0;
  const spend = data?.totalSpend ?? 0;
  const roas = data?.overallRoas ?? 0;
  const spark = (data?.dailyMetrics ?? []).slice(-14).map((d) => d.revenue);
  const profit = revenue - spend;

  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%", padding: "12px 14px 8px" }}>
      {/* Top */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: "#3ecf8e12", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <DollarSign size={15} color={C.green} />
        </div>
        {roas > 0 && <TrendBadge value={`${roas.toFixed(1)}x ROAS`} positive={roas >= 1} />}
      </div>

      {/* Big value */}
      <div>
        <div style={{ fontSize: 28, fontWeight: 700, color: "#ededed", lineHeight: 1, letterSpacing: "-0.02em" }}>
          {fmt$(revenue)}
        </div>
        <div style={{ fontSize: 11, color: "#666", marginTop: 3 }}>Revenue MTD</div>
      </div>

      {/* Sparkline + profit/spend */}
      <div>
        <Sparkline data={spark.length >= 2 ? spark : [0, 0]} color={C.green} height={20} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, marginTop: 3 }}>
          <span style={{ color: "#555" }}>Gasto: <span style={{ color: C.red }}>{fmt$(spend)}</span></span>
          <span style={{ color: profit >= 0 ? C.green : C.red }}>{profit >= 0 ? "+" : ""}{fmt$(profit)}</span>
        </div>
      </div>
    </div>
  );
}

function CampaignStatusWidget() {
  const { data: summary, isLoading: sumLoading } = trpc.dashboard.getSummary.useQuery(undefined, SUMMARY_OPTS);
  const { data, isLoading } = trpc.campaigns.listCampaigns.useQuery({});
  if (isLoading || sumLoading) return <Loading />;
  const campaigns = data ?? [];
  const totalConv = summary?.totalConversions ?? 0;
  const totalSpend = summary?.totalSpend ?? 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%", padding: "12px 14px 10px" }}>
      {/* Top: icon + count badge */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: "#f59e0b12", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Target size={15} color={C.amber} />
        </div>
        <div style={{
          padding: "2px 8px", borderRadius: 10, backgroundColor: "#3ecf8e15",
          fontSize: 11, fontWeight: 600, color: C.green,
        }}>
          {campaigns.length} activas
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 14 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#ededed", lineHeight: 1 }}>{fmtNum(totalConv)}</div>
          <div style={{ fontSize: 9, color: "#666", marginTop: 2 }}>Conversiones</div>
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#ededed", lineHeight: 1 }}>{fmt$(totalSpend)}</div>
          <div style={{ fontSize: 9, color: "#666", marginTop: 2 }}>Invertido</div>
        </div>
      </div>

      {/* Campaign list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {campaigns.length === 0 ? (
          <div style={{ fontSize: 10, color: "#444", fontStyle: "italic" }}>Sin campanas activas</div>
        ) : (
          campaigns.slice(0, 3).map((c, i) => (
            <div key={c.campaignId} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10 }}>
              <div style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
              <span style={{ color: "#888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                {c.campaignName}
              </span>
              <span style={{ color: C.green, fontWeight: 500, flexShrink: 0 }}>{fmt$(c.totalRevenue)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════
// CHART WIDGETS
// ════════════════════════════════════════════════

function BarChartWidget() {
  const { data, isLoading } = trpc.dashboard.getSummary.useQuery(undefined, SUMMARY_OPTS);
  if (isLoading) return <Loading />;
  const metrics = data?.dailyMetrics ?? [];
  if (!metrics.length) return <Empty msg={emptyDataMsg(data?.connectedPlatforms)} />;
  const weekly: Record<string, { date: string; revenue: number; spend: number }> = {};
  for (const d of metrics) {
    const dt = new Date(d.date);
    const week = `S${Math.ceil(dt.getDate() / 7)}`;
    if (!weekly[week]) weekly[week] = { date: week, revenue: 0, spend: 0 };
    weekly[week].revenue += d.revenue;
    weekly[week].spend += d.spend;
  }
  const chartData = Object.values(weekly);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        margin={{ top: 8, right: 8, bottom: 0, left: -10 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#2e2e2e" />
        <XAxis dataKey="date" {...axisProps} />
        <YAxis {...axisProps} />
        <RechartsTooltip {...tooltipStyle} />
        <Bar
          dataKey="revenue"
          fill={C.green}
          radius={[4, 4, 0, 0]}
          name="Revenue"
        />
        <Bar
          dataKey="spend"
          fill={C.indigo}
          radius={[4, 4, 0, 0]}
          name="Gasto"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

function LineChartWidget() {
  const { data, isLoading } = trpc.dashboard.getSummary.useQuery(undefined, SUMMARY_OPTS);
  if (isLoading) return <Loading />;
  const raw = data?.dailyMetrics ?? [];
  if (!raw.length) return <Empty msg={emptyDataMsg(data?.connectedPlatforms)} />;
  const metrics = raw.map((d) => ({ ...d, date: fmtDate(d.date) }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={metrics}
        margin={{ top: 8, right: 8, bottom: 0, left: -10 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#2e2e2e" />
        <XAxis dataKey="date" {...axisProps} />
        <YAxis {...axisProps} />
        <RechartsTooltip {...tooltipStyle} />
        <Line
          type="monotone"
          dataKey="clicks"
          stroke={C.green}
          strokeWidth={2}
          dot={false}
          name="Clicks"
        />
        <Line
          type="monotone"
          dataKey="impressions"
          stroke={C.indigo}
          strokeWidth={2}
          dot={false}
          name="Impresiones"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function AreaChartWidget() {
  const { data, isLoading } = trpc.dashboard.getSummary.useQuery(undefined, SUMMARY_OPTS);
  if (isLoading) return <Loading />;
  const raw = data?.dailyMetrics ?? [];
  if (!raw.length) return <Empty msg={emptyDataMsg(data?.connectedPlatforms)} />;
  const metrics = raw.map((d) => ({ ...d, date: fmtDate(d.date) }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={metrics}
        margin={{ top: 8, right: 8, bottom: 0, left: -10 }}
      >
        <defs>
          <linearGradient id="wg-area-green" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.green} stopOpacity={0.3} />
            <stop offset="100%" stopColor={C.green} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#2e2e2e" />
        <XAxis dataKey="date" {...axisProps} />
        <YAxis {...axisProps} />
        <RechartsTooltip {...tooltipStyle} />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke={C.green}
          fill="url(#wg-area-green)"
          strokeWidth={2}
          name="Revenue"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function DonutWidget() {
  const { data, isLoading } = trpc.dashboard.getSummary.useQuery(undefined, SUMMARY_OPTS);
  if (isLoading) return <Loading />;
  const channels = data?.channelBreakdown ?? [];
  if (!channels.length) return <Empty msg={emptyDataMsg(data?.connectedPlatforms)} />;
  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <ResponsiveContainer width="100%" height="80%">
        <PieChart>
          <Pie
            data={channels}
            dataKey="revenue"
            nameKey="platform"
            cx="50%"
            cy="50%"
            innerRadius="40%"
            outerRadius="70%"
            paddingAngle={3}
            strokeWidth={0}
          >
            {channels.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <RechartsTooltip {...tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 12,
          padding: "0 8px 8px",
          flexWrap: "wrap",
        }}
      >
        {channels.map((ch, i) => (
          <div
            key={ch.platform}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 9,
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
              }}
            />
            <span style={{ color: "#888", textTransform: "capitalize" }}>
              {ch.platform.replace(/_/g, " ")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RoasCanalWidget() {
  const { data, isLoading } = trpc.dashboard.getSummary.useQuery(undefined, SUMMARY_OPTS);
  if (isLoading) return <Loading />;
  const raw = data?.channelBreakdown ?? [];
  if (!raw.length) return <Empty msg={emptyDataMsg(data?.connectedPlatforms)} />;
  const channels = raw.map((ch) => ({ ...ch, platform: ch.platform.replace(/_/g, " ") }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={channels}
        margin={{ top: 8, right: 8, bottom: 0, left: -10 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#2e2e2e" />
        <XAxis dataKey="platform" {...axisProps} />
        <YAxis {...axisProps} />
        <RechartsTooltip {...tooltipStyle} />
        <Bar dataKey="roas" fill={C.green} radius={[4, 4, 0, 0]} name="ROAS" />
      </BarChart>
    </ResponsiveContainer>
  );
}

function GastoRevenueWidget() {
  const { data, isLoading } = trpc.dashboard.getSummary.useQuery(undefined, SUMMARY_OPTS);
  if (isLoading) return <Loading />;
  const raw = data?.dailyMetrics ?? [];
  if (!raw.length) return <Empty msg={emptyDataMsg(data?.connectedPlatforms)} />;
  const metrics = raw.map((d) => ({ ...d, date: fmtDate(d.date) }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={metrics}
        margin={{ top: 8, right: 8, bottom: 0, left: -10 }}
      >
        <defs>
          <linearGradient id="wg-spend" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.red} stopOpacity={0.15} />
            <stop offset="100%" stopColor={C.red} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="wg-rev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.green} stopOpacity={0.15} />
            <stop offset="100%" stopColor={C.green} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#2e2e2e" />
        <XAxis dataKey="date" {...axisProps} />
        <YAxis {...axisProps} />
        <RechartsTooltip {...tooltipStyle} />
        <Area
          type="monotone"
          dataKey="spend"
          stroke={C.red}
          fill="url(#wg-spend)"
          strokeWidth={2}
          name="Gasto"
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke={C.green}
          fill="url(#wg-rev)"
          strokeWidth={2}
          name="Revenue"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function CplTrendWidget() {
  const { data, isLoading } = trpc.dashboard.getSummary.useQuery(undefined, SUMMARY_OPTS);
  if (isLoading) return <Loading />;
  const raw = data?.dailyMetrics ?? [];
  if (!raw.length) return <Empty msg={emptyDataMsg(data?.connectedPlatforms)} />;
  const metrics = raw.map((d) => ({
    date: fmtDate(d.date),
    cpl: d.conversions > 0 ? d.spend / d.conversions : 0,
  }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={metrics}
        margin={{ top: 8, right: 8, bottom: 0, left: -10 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#2e2e2e" />
        <XAxis dataKey="date" {...axisProps} />
        <YAxis {...axisProps} />
        <RechartsTooltip {...tooltipStyle} />
        <Line
          type="monotone"
          dataKey="cpl"
          stroke={C.amber}
          strokeWidth={2}
          dot={false}
          name="CPL"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function PipelineFunnelWidget() {
  const { data, isLoading } = trpc.dashboard.getSummary.useQuery(undefined, SUMMARY_OPTS);
  if (isLoading) return <Loading />;
  const stages = data?.dealsByStage ?? [];
  if (!stages.length) return <Empty msg="Crea un pipeline para ver el embudo" />;
  const maxCount = Math.max(...stages.map((s) => s.count), 1);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        height: "100%",
        padding: "8px 12px",
        gap: 6,
      }}
    >
      {stages.map((stage, i) => {
        const pct = (stage.count / maxCount) * 100;
        return (
          <div
            key={stage.stageId}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 10,
            }}
          >
            <span
              style={{
                width: 70,
                color: "#888",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flexShrink: 0,
                fontSize: 9,
              }}
            >
              {stage.stageName}
            </span>
            <div
              style={{
                flex: 1,
                height: 20,
                borderRadius: 4,
                overflow: "hidden",
                backgroundColor: "#252525",
              }}
            >
              <div
                style={{
                  width: `${Math.max(pct, 8)}%`,
                  height: "100%",
                  backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                  borderRadius: 4,
                  display: "flex",
                  alignItems: "center",
                  paddingLeft: 6,
                  fontSize: 9,
                  color: "#fff",
                  fontWeight: 600,
                  transition: "width 500ms ease",
                }}
              >
                {stage.count}
              </div>
            </div>
            <span style={{ color: "#666", minWidth: 50, textAlign: "right" }}>
              {fmt$(stage.value)}
            </span>
          </div>
        );
      })}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 4,
          paddingTop: 6,
          borderTop: "1px solid #2e2e2e",
          fontSize: 10,
        }}
      >
        <span style={{ color: "#666" }}>Total</span>
        <span style={{ color: C.green, fontWeight: 600 }}>
          {fmt$(data?.totalDealValue ?? 0)}
        </span>
      </div>
    </div>
  );
}

function PrediccionRevenueWidget() {
  const { data, isLoading } = trpc.dashboard.getSummary.useQuery(undefined, SUMMARY_OPTS);
  if (isLoading) return <Loading />;
  const raw = data?.dailyMetrics ?? [];
  if (!raw.length) return <Empty msg={data?.connectedPlatforms ? "Sin datos de campanas — los datos se sincronizaran pronto" : "Conecta una plataforma para ver proyecciones"} />;

  // Group into weekly, then project 2 more weeks
  const weekly: Record<string, { date: string; revenue: number }> = {};
  for (const d of raw) {
    const dt = new Date(d.date);
    const weekNum = Math.ceil(dt.getDate() / 7);
    const key = `S${weekNum}`;
    if (!weekly[key]) weekly[key] = { date: key, revenue: 0 };
    weekly[key].revenue += d.revenue;
  }
  const actual = Object.values(weekly);
  const last = actual[actual.length - 1]?.revenue ?? 0;
  const prev = actual.length >= 2 ? actual[actual.length - 2]?.revenue ?? 0 : last;
  const trend = last - prev;

  const projected = [
    ...actual.map((d) => ({ ...d, projected: null as number | null })),
    {
      date: "Proj 1",
      revenue: null as number | null,
      projected: Math.max(0, last + trend),
    },
    {
      date: "Proj 2",
      revenue: null as number | null,
      projected: Math.max(0, last + trend * 2),
    },
  ];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={projected}
        margin={{ top: 8, right: 8, bottom: 0, left: -10 }}
      >
        <defs>
          <linearGradient id="wg-pred" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.green} stopOpacity={0.2} />
            <stop offset="100%" stopColor={C.green} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="wg-pred-proj" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.cyan} stopOpacity={0.15} />
            <stop offset="100%" stopColor={C.cyan} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#2e2e2e" />
        <XAxis dataKey="date" {...axisProps} />
        <YAxis {...axisProps} />
        <RechartsTooltip {...tooltipStyle} />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke={C.green}
          fill="url(#wg-pred)"
          strokeWidth={2}
          name="Actual"
          connectNulls={false}
        />
        <Area
          type="monotone"
          dataKey="projected"
          stroke={C.cyan}
          fill="url(#wg-pred-proj)"
          strokeWidth={2}
          strokeDasharray="5 5"
          name="Proyeccion"
          connectNulls={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function MrrTrackerWidget() {
  const { from, to } = useDateRange(90);
  const { data, isLoading } = trpc.campaigns.listMetrics.useQuery({ from, to, groupBy: "month" });
  if (isLoading) return <Loading />;
  const metrics = (data ?? []).map((d) => ({ ...d, date: fmtDate(d.date) }));
  if (!metrics.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={metrics}
        margin={{ top: 8, right: 8, bottom: 0, left: -10 }}
      >
        <defs>
          <linearGradient id="wg-mrr" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.cyan} stopOpacity={0.25} />
            <stop offset="100%" stopColor={C.cyan} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#2e2e2e" />
        <XAxis dataKey="date" {...axisProps} />
        <YAxis {...axisProps} />
        <RechartsTooltip {...tooltipStyle} />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke={C.cyan}
          fill="url(#wg-mrr)"
          strokeWidth={2}
          name="MRR"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ════════════════════════════════════════════════
// LIST / TABLE WIDGETS
// ════════════════════════════════════════════════

function TableWidget() {
  const { data: summary, isLoading } = trpc.dashboard.getSummary.useQuery(undefined, SUMMARY_OPTS);
  if (isLoading) return <Loading />;
  const deals = summary?.recentDeals ?? [];
  if (!deals.length) return <Empty msg="Crea deals para ver la tabla" />;
  return (
    <div style={{ height: "100%", overflow: "auto" }}>
      <table
        style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}
      >
        <thead>
          <tr style={{ color: "#666", borderBottom: "1px solid #2e2e2e" }}>
            <th
              style={{
                textAlign: "left",
                padding: "4px 8px",
                fontWeight: 500,
                position: "sticky",
                top: 0,
                backgroundColor: "#1c1c1c",
              }}
            >
              Deal
            </th>
            <th
              style={{
                textAlign: "left",
                padding: "4px 8px",
                fontWeight: 500,
                position: "sticky",
                top: 0,
                backgroundColor: "#1c1c1c",
              }}
            >
              Contacto
            </th>
            <th
              style={{
                textAlign: "right",
                padding: "4px 8px",
                fontWeight: 500,
                position: "sticky",
                top: 0,
                backgroundColor: "#1c1c1c",
              }}
            >
              Valor
            </th>
          </tr>
        </thead>
        <tbody>
          {deals.slice(0, 15).map((d) => (
            <tr key={d.id} style={{ borderBottom: "1px solid #1e1e1e" }}>
              <td style={{ padding: "5px 8px", color: "#ccc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140 }}>
                {d.title}
              </td>
              <td style={{ padding: "5px 8px", color: "#888" }}>
                {d.contactName}
              </td>
              <td style={{ padding: "5px 8px", color: C.green, textAlign: "right", fontWeight: 500 }}>
                {d.value != null ? fmt$(Number(d.value)) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DealsPorCerrarWidget() {
  const { data, isLoading } = trpc.dashboard.getSummary.useQuery(undefined, SUMMARY_OPTS);
  if (isLoading) return <Loading />;
  const deals = data?.recentDeals ?? [];
  if (!deals.length) return <Empty msg="Sin deals por cerrar" />;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "auto",
        padding: "2px 8px",
        gap: 2,
      }}
    >
      {deals.map((d) => (
        <div
          key={d.id}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "6px 4px",
            borderBottom: "1px solid #1e1e1e",
            fontSize: 11,
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                color: "#ccc",
                fontWeight: 500,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {d.title}
            </div>
            <div style={{ color: "#666", fontSize: 9 }}>{d.contactName}</div>
          </div>
          <div
            style={{
              textAlign: "right",
              flexShrink: 0,
              marginLeft: 8,
            }}
          >
            <div style={{ color: C.green, fontWeight: 600 }}>
              {d.value != null ? fmt$(d.value) : "—"}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function LeadsCalientesWidget() {
  const { data, isLoading } = trpc.contacts.list.useQuery({ page: 1, limit: 10, scoreLabel: "HOT" });
  if (isLoading) return <Loading />;
  const contacts = data?.contacts ?? [];
  if (!contacts.length) return <Empty msg="Sin leads HOT" />;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "auto",
        padding: "2px 8px",
        gap: 2,
      }}
    >
      {contacts.map((c) => (
        <div
          key={c.id}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "5px 4px",
            borderBottom: "1px solid #1e1e1e",
            fontSize: 11,
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <span style={{ color: "#ccc" }}>
              {c.firstName} {c.lastName ?? ""}
            </span>
            {c.company && (
              <span
                style={{
                  color: "#555",
                  fontSize: 9,
                  marginLeft: 6,
                }}
              >
                {c.company}
              </span>
            )}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 3,
              flexShrink: 0,
            }}
          >
            <Zap size={10} color={C.amber} />
            <span
              style={{
                fontSize: 10,
                color: C.amber,
                fontWeight: 600,
              }}
            >
              {c.score}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ActividadRecienteWidget() {
  const { data, isLoading } = trpc.activities.list.useQuery({ page: 1, limit: 10 });
  if (isLoading) return <Loading />;
  const activities = data?.activities ?? [];
  if (!activities.length) return <Empty msg="Sin actividad reciente" />;

  const typeColors: Record<string, string> = {
    deal_created: C.green,
    deal_won: C.green,
    deal_lost: C.red,
    deal_stage_changed: C.cyan,
    email_sent: C.indigo,
    call: C.amber,
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "auto",
        padding: "2px 8px",
        gap: 2,
      }}
    >
      {activities.map((a) => (
        <div
          key={a.id}
          style={{
            padding: "5px 4px",
            borderBottom: "1px solid #1e1e1e",
            fontSize: 10,
          }}
        >
          <div
            style={{ display: "flex", justifyContent: "space-between" }}
          >
            <span
              style={{
                color: typeColors[a.type] ?? "#888",
                fontWeight: 500,
                textTransform: "capitalize",
              }}
            >
              {a.type.replace(/_/g, " ")}
            </span>
            <span style={{ color: "#555", fontSize: 9 }}>
              {fmtDate(a.createdAt)}
            </span>
          </div>
          {a.subject && (
            <div
              style={{
                color: "#666",
                fontSize: 9,
                marginTop: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {a.subject}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function WhatsappInboxWidget() {
  const { data, isLoading } = trpc.whatsapp.listConversations.useQuery({ page: 1, limit: 6 });
  if (isLoading) return <Loading />;
  const convos = data?.conversations ?? [];
  if (!convos.length) return <Empty msg="Sin conversaciones" />;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "auto",
        padding: "2px 8px",
        gap: 2,
      }}
    >
      {convos.map((c) => (
        <div
          key={c.contact.id}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "5px 4px",
            borderBottom: "1px solid #1e1e1e",
            fontSize: 11,
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ color: "#ccc", display: "flex", alignItems: "center", gap: 4 }}>
              <MessageCircle size={10} color={C.green} />
              {c.contact.firstName} {c.contact.lastName ?? ""}
            </div>
            {c.lastMessage && (
              <div
                style={{
                  color: "#555",
                  fontSize: 9,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: 180,
                  marginTop: 1,
                }}
              >
                {c.lastMessage.content}
              </div>
            )}
          </div>
          {c.unreadCount > 0 && (
            <div
              style={{
                minWidth: 18,
                height: 18,
                borderRadius: 9,
                backgroundColor: C.green,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 9,
                color: "#000",
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {c.unreadCount}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function TopClientesWidget() {
  const { data, isLoading } = trpc.contacts.list.useQuery({ page: 1, limit: 8 });
  if (isLoading) return <Loading />;
  const rawContacts = data?.contacts ?? [];
  if (!rawContacts.length) return <Empty msg="Sin contactos" />;
  const contacts = [...rawContacts].sort((a, b) => b.score - a.score).slice(0, 6);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "auto",
        padding: "2px 8px",
        gap: 2,
      }}
    >
      {contacts.map((c, i) => (
        <div
          key={c.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "5px 4px",
            borderBottom: "1px solid #1e1e1e",
            fontSize: 11,
          }}
        >
          <span
            style={{
              color: i < 3 ? C.amber : "#444",
              fontSize: 10,
              fontWeight: 600,
              width: 16,
            }}
          >
            #{i + 1}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ color: "#ccc" }}>
              {c.firstName} {c.lastName ?? ""}
            </span>
            {c.company && (
              <span
                style={{ color: "#555", fontSize: 9, marginLeft: 6 }}
              >
                {c.company}
              </span>
            )}
          </div>
          <span
            style={{
              color: C.green,
              fontSize: 10,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {c.score}
          </span>
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════
// SPECIAL WIDGETS
// ════════════════════════════════════════════════

function TextWidget() {
  const [text, setText] = useState(() => {
    try {
      return localStorage.getItem("nodelabz-widget-note") ?? "";
    } catch {
      return "";
    }
  });
  return (
    <textarea
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        try {
          localStorage.setItem("nodelabz-widget-note", e.target.value);
        } catch {
          /* ignore */
        }
      }}
      placeholder="Escribe una nota..."
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "transparent",
        border: "none",
        outline: "none",
        resize: "none",
        color: "#ccc",
        fontSize: 12,
        padding: 12,
        lineHeight: 1.5,
        fontFamily: "inherit",
      }}
    />
  );
}

function SocialEngagementWidget() {
  const { data, isLoading } = trpc.dashboard.getSummary.useQuery(undefined, SUMMARY_OPTS);
  if (isLoading) return <Loading />;
  const metrics = data?.dailyMetrics ?? [];
  const totalClicks = metrics.reduce((s, d) => s + d.clicks, 0);
  const totalImpressions = metrics.reduce((s, d) => s + d.impressions, 0);
  const engRate =
    totalImpressions > 0 ? totalClicks / totalImpressions : 0;

  // Mini sparkline data (last 7 entries)
  const sparkData = metrics.slice(-7).map((d) => ({ v: d.clicks }));

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        height: "100%",
        padding: 12,
        gap: 12,
      }}
    >
      <div
        style={{ display: "flex", alignItems: "center", gap: 6 }}
      >
        <Globe size={14} color={C.cyan} />
        <span style={{ fontSize: 10, color: "#666" }}>Ultimos 30 dias</span>
      </div>
      <div style={{ display: "flex", gap: 16 }}>
        <div>
          <div
            style={{ fontSize: 20, fontWeight: 700, color: "#ededed" }}
          >
            {fmtNum(totalClicks)}
          </div>
          <div style={{ fontSize: 9, color: "#666" }}>Clicks</div>
        </div>
        <div>
          <div
            style={{ fontSize: 20, fontWeight: 700, color: "#ededed" }}
          >
            {fmtNum(totalImpressions)}
          </div>
          <div style={{ fontSize: 9, color: "#666" }}>Impresiones</div>
        </div>
        <div>
          <div
            style={{ fontSize: 20, fontWeight: 700, color: C.green }}
          >
            {(engRate * 100).toFixed(2)}%
          </div>
          <div style={{ fontSize: 9, color: "#666" }}>Engagement</div>
        </div>
      </div>
      {sparkData.length > 0 && (
        <div style={{ height: 30 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <Area
                type="monotone"
                dataKey="v"
                stroke={C.cyan}
                fill={C.cyan}
                fillOpacity={0.1}
                strokeWidth={1.5}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function IntegrationStatusWidget() {
  const { data, isLoading } = trpc.integrations.list.useQuery();
  if (isLoading) return <Loading />;
  const integrations = data ?? [];
  if (!integrations.length) return <Empty msg="Sin integraciones conectadas" />;

  const platformIcons: Record<string, string> = {
    meta_ads: "Meta",
    google_ads: "Google",
    ga4: "GA4",
    tiktok: "TikTok",
    shopify: "Shopify",
    whatsapp: "WA",
    stripe: "Stripe",
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "auto",
        padding: "4px 8px",
        gap: 4,
      }}
    >
      {integrations.map((int) => (
        <div
          key={int.id}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "5px 4px",
            borderBottom: "1px solid #1e1e1e",
            fontSize: 10,
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: 4,
                backgroundColor: "#252525",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 7,
                color: "#888",
                fontWeight: 700,
              }}
            >
              {(platformIcons[int.platform] ?? int.platform).slice(
                0,
                2,
              )}
            </div>
            <span
              style={{ color: "#ccc", textTransform: "capitalize" }}
            >
              {(platformIcons[int.platform] ?? int.platform).replace(
                /_/g,
                " ",
              )}
            </span>
          </div>
          <div
            style={{ display: "flex", alignItems: "center", gap: 4 }}
          >
            {int.status === "active" ? (
              <CheckCircle2 size={10} color={C.green} />
            ) : (
              <XCircle size={10} color={C.red} />
            )}
            <span
              style={{
                color:
                  int.status === "active" ? C.green : C.red,
                fontSize: 9,
                fontWeight: 500,
              }}
            >
              {int.status === "active" ? "Activo" : "Inactivo"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function AiRecomendacionWidget() {
  const { data, isLoading } = trpc.healthScore.getCurrent.useQuery();
  if (isLoading) return <Loading />;
  const recs = (data?.recommendations ?? []) as Array<{ title: string; description: string; impact: string }>;
  if (!recs.length) return <Empty msg="Sin recomendaciones aun" />;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "auto",
        padding: "6px 12px",
        gap: 6,
      }}
    >
      {recs.slice(0, 3).map((r, i) => (
        <div
          key={i}
          style={{
            padding: "6px 0",
            borderBottom: "1px solid #1e1e1e",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 3,
            }}
          >
            <Lightbulb
              size={11}
              color={r.impact === "high" ? C.amber : C.cyan}
            />
            <span
              style={{
                fontSize: 11,
                color: "#ccc",
                fontWeight: 500,
              }}
            >
              {r.title}
            </span>
            <span
              style={{
                fontSize: 8,
                padding: "1px 4px",
                borderRadius: 3,
                backgroundColor:
                  r.impact === "high" ? "#f59e0b20" : "#06b6d420",
                color: r.impact === "high" ? C.amber : C.cyan,
                fontWeight: 600,
                textTransform: "uppercase",
              }}
            >
              {r.impact}
            </span>
          </div>
          <div
            style={{
              fontSize: 10,
              color: "#666",
              lineHeight: 1.4,
            }}
          >
            {r.description}
          </div>
        </div>
      ))}
    </div>
  );
}

function HealthScoreWidget() {
  const { data, isLoading } = trpc.healthScore.getCurrent.useQuery();
  if (isLoading) return <Loading />;
  if (!data) return <Empty />;
  const hs = data;
  const score = hs.overallScore;
  const color = score >= 70 ? C.green : score >= 40 ? C.amber : C.red;

  const r = 38;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  const categories = [
    { label: "Ads", value: hs.adPerformance },
    { label: "Content", value: hs.contentEngagement },
    { label: "Email", value: hs.emailEffectiveness },
    { label: "Leads", value: hs.leadConversion },
    { label: "Revenue", value: hs.revenueAttribution },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        gap: 8,
        padding: 8,
      }}
    >
      <svg width={80} height={80} viewBox="0 0 100 100">
        <circle
          cx={50}
          cy={50}
          r={r}
          fill="none"
          stroke="#252525"
          strokeWidth={7}
        />
        <circle
          cx={50}
          cy={50}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={7}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
        <text
          x={50}
          y={48}
          textAnchor="middle"
          dominantBaseline="central"
          fill={color}
          fontSize={22}
          fontWeight={700}
        >
          {score}
        </text>
        <text
          x={50}
          y={66}
          textAnchor="middle"
          fill="#666"
          fontSize={8}
        >
          / 100
        </text>
      </svg>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "4px 10px",
          justifyContent: "center",
        }}
      >
        {categories.map((cat) => {
          const c =
            cat.value >= 70 ? C.green : cat.value >= 40 ? C.amber : C.red;
          return (
            <div
              key={cat.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 3,
                fontSize: 9,
              }}
            >
              <div
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: c,
                }}
              />
              <span style={{ color: "#666" }}>{cat.label}</span>
              <span style={{ color: c, fontWeight: 600 }}>
                {cat.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AnomalyAlertWidget() {
  const { data, isLoading } = trpc.healthScore.getCurrent.useQuery();
  if (isLoading) return <Loading />;
  const insights = (data?.insights ?? []) as string[];
  if (!insights.length) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 4, color: C.green }}>
      <CheckCircle2 size={20} />
      <span style={{ fontSize: 11 }}>Sin anomalias detectadas</span>
    </div>
  );
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "auto",
        padding: "6px 12px",
        gap: 4,
      }}
    >
      {insights.slice(0, 5).map((insight, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 6,
            padding: "5px 0",
            borderBottom: "1px solid #1e1e1e",
          }}
        >
          <AlertTriangle
            size={10}
            color={C.amber}
            style={{ flexShrink: 0, marginTop: 2 }}
          />
          <span
            style={{
              fontSize: 10,
              color: "#999",
              lineHeight: 1.4,
            }}
          >
            {insight}
          </span>
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════
// SIZE CONSTRAINTS (exported for dashboard-pages)
// ════════════════════════════════════════════════

export const WIDGET_SIZES: Record<
  string,
  { minW: number; minH: number; maxW: number; maxH: number }
> = {
  // KPI cards (compact)
  kpi: { minW: 2, minH: 3, maxW: 4, maxH: 6 },
  "leads-hoy": { minW: 2, minH: 3, maxW: 4, maxH: 6 },
  "win-rate": { minW: 2, minH: 3, maxW: 4, maxH: 6 },
  "email-open-rate": { minW: 2, minH: 3, maxW: 4, maxH: 6 },
  "revenue-mtd": { minW: 2, minH: 3, maxW: 4, maxH: 6 },
  "campaign-status": { minW: 3, minH: 3, maxW: 6, maxH: 8 },
  // Charts (need room for axes)
  "bar-chart": { minW: 4, minH: 6, maxW: 12, maxH: 16 },
  "line-chart": { minW: 4, minH: 6, maxW: 12, maxH: 16 },
  "area-chart": { minW: 4, minH: 6, maxW: 12, maxH: 16 },
  donut: { minW: 3, minH: 6, maxW: 8, maxH: 14 },
  "roas-canal": { minW: 4, minH: 6, maxW: 12, maxH: 14 },
  "gasto-revenue": { minW: 4, minH: 6, maxW: 12, maxH: 16 },
  "cpl-trend": { minW: 4, minH: 6, maxW: 12, maxH: 14 },
  "pipeline-funnel": { minW: 4, minH: 6, maxW: 8, maxH: 16 },
  "prediccion-revenue": { minW: 4, minH: 6, maxW: 12, maxH: 16 },
  "mrr-tracker": { minW: 4, minH: 6, maxW: 12, maxH: 16 },
  // Tables / Lists
  table: { minW: 4, minH: 6, maxW: 12, maxH: 16 },
  "deals-por-cerrar": { minW: 3, minH: 5, maxW: 6, maxH: 14 },
  "leads-calientes": { minW: 3, minH: 5, maxW: 6, maxH: 14 },
  "actividad-reciente": { minW: 3, minH: 5, maxW: 6, maxH: 14 },
  "whatsapp-inbox": { minW: 3, minH: 5, maxW: 6, maxH: 12 },
  "top-clientes": { minW: 3, minH: 5, maxW: 6, maxH: 14 },
  // Special
  text: { minW: 2, minH: 2, maxW: 12, maxH: 14 },
  "social-engagement": { minW: 3, minH: 4, maxW: 6, maxH: 10 },
  "integration-status": { minW: 3, minH: 3, maxW: 6, maxH: 10 },
  "ai-recomendacion": { minW: 4, minH: 3, maxW: 12, maxH: 10 },
  "health-score": { minW: 2, minH: 5, maxW: 4, maxH: 12 },
  "anomaly-alert": { minW: 3, minH: 3, maxW: 6, maxH: 10 },
};

// ════════════════════════════════════════════════
// MAIN RENDERER
// ════════════════════════════════════════════════

const WIDGET_COMPONENTS: Record<string, React.FC> = {
  kpi: KpiCardWidget,
  "bar-chart": BarChartWidget,
  "line-chart": LineChartWidget,
  "area-chart": AreaChartWidget,
  donut: DonutWidget,
  table: TableWidget,
  text: TextWidget,
  "leads-hoy": LeadsHoyWidget,
  "roas-canal": RoasCanalWidget,
  "gasto-revenue": GastoRevenueWidget,
  "cpl-trend": CplTrendWidget,
  "campaign-status": CampaignStatusWidget,
  "pipeline-funnel": PipelineFunnelWidget,
  "deals-por-cerrar": DealsPorCerrarWidget,
  "win-rate": WinRateWidget,
  "leads-calientes": LeadsCalientesWidget,
  "actividad-reciente": ActividadRecienteWidget,
  "whatsapp-inbox": WhatsappInboxWidget,
  "email-open-rate": EmailOpenRateWidget,
  "social-engagement": SocialEngagementWidget,
  "integration-status": IntegrationStatusWidget,
  "ai-recomendacion": AiRecomendacionWidget,
  "health-score": HealthScoreWidget,
  "anomaly-alert": AnomalyAlertWidget,
  "prediccion-revenue": PrediccionRevenueWidget,
  "revenue-mtd": RevenueMtdWidget,
  "mrr-tracker": MrrTrackerWidget,
  "top-clientes": TopClientesWidget,
};

export function WidgetContent({ widgetType }: { widgetType: string }) {
  const Component = WIDGET_COMPONENTS[widgetType];
  if (!Component)
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "#444",
          fontSize: 10,
        }}
      >
        {widgetType}
      </div>
    );
  return <Component />;
}
