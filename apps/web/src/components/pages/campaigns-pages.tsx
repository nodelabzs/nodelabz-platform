"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Plus, Search, Play, Pause, TrendingUp, BarChart3, Sparkles, Calendar, Image, ChevronLeft, ChevronRight, CheckCircle, Loader2 } from "lucide-react";

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

export function TodasCampanasPage() {
  const { data: campaigns, isLoading } = trpc.campaigns.listCampaigns.useQuery({});

  return (
    <>
      <SectionHeader
        title="Todas las Campanas"
        description={`${campaigns?.length ?? 0} campanas`}
        action={
          <button className="flex items-center gap-1.5 text-[12px] text-black px-3 py-1.5 rounded font-medium" style={{ backgroundColor: "#3ecf8e" }}>
            <Plus size={14} />
            Crear campana
          </button>
        }
      />
      {isLoading ? (
        <div className="rounded-lg border border-[#2e2e2e] overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-4 px-4 py-3 border-b border-[#2e2e2e] last:border-0" style={{ backgroundColor: "#1e1e1e" }}>
              <div className="h-4 w-32 rounded bg-[#2a2a2a] animate-pulse" />
              <div className="h-4 w-20 rounded bg-[#2a2a2a] animate-pulse" />
              <div className="h-4 w-16 rounded bg-[#2a2a2a] animate-pulse" />
            </div>
          ))}
        </div>
      ) : !campaigns || campaigns.length === 0 ? (
        <div className="rounded-lg border border-[#2e2e2e] p-12 text-center" style={{ backgroundColor: "#1e1e1e" }}>
          <BarChart3 size={32} className="text-[#555] mx-auto mb-3" />
          <p className="text-[14px] text-[#ededed] font-medium mb-1">Sin campanas</p>
          <p className="text-[12px] text-[#888]">Conecta una plataforma de ads para ver campanas aqui.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-[#2e2e2e] overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr style={{ backgroundColor: "#1e1e1e" }}>
                {["Campana", "Plataforma", "Gasto", "Conversiones", "Revenue", "ROAS"].map((h) => (
                  <th key={h} className="text-left text-[11px] uppercase tracking-wider text-[#888] font-medium px-4 py-3 border-b border-[#2e2e2e]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.campaignId} className="border-b border-[#2e2e2e] last:border-0 hover:bg-[#1e1e1e] transition-colors cursor-pointer">
                  <td className="px-4 py-3 text-[13px] text-[#ededed] font-medium">{c.campaignName}</td>
                  <td className="px-4 py-3 text-[13px] text-[#888]">{c.platform}</td>
                  <td className="px-4 py-3 text-[13px] text-[#ccc]">${c.totalSpend.toLocaleString()}</td>
                  <td className="px-4 py-3 text-[13px] text-[#ccc]">{c.totalConversions}</td>
                  <td className="px-4 py-3 text-[13px] text-[#3ecf8e] font-medium">${c.totalRevenue.toLocaleString()}</td>
                  <td className="px-4 py-3 text-[13px] text-[#ededed] font-medium">{c.roas.toFixed(1)}x</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

const PLATFORMS = [
  { key: "meta_ads", label: "Meta Ads", color: "#1877f2" },
  { key: "google_ads", label: "Google Ads", color: "#fbbc04" },
  { key: "tiktok", label: "TikTok", color: "#fe2c55" },
] as const;

const BUDGET_TYPES = ["Diario", "Total"] as const;

const WIZARD_STEPS = ["Plataforma", "Presupuesto", "Anuncio", "Revision"] as const;

export function CrearCampanaPage() {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Step 1
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState("");

  // Step 2
  const [budgetType, setBudgetType] = useState<"Diario" | "Total">("Diario");
  const [budget, setBudget] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [audience, setAudience] = useState("");

  // Step 3
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [cta, setCta] = useState("Mas informacion");
  const [generatingCopy, setGeneratingCopy] = useState(false);

  const platformLabel = PLATFORMS.find((p) => p.key === platform)?.label ?? platform;

  const canNext =
    step === 0 ? name.trim() && platform :
    step === 1 ? budget && startDate :
    step === 2 ? headline.trim() && description.trim() :
    true;

  async function handleGenerateCopy() {
    if (!name.trim()) return;
    setGeneratingCopy(true);
    try {
      const resp = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "ad_copy",
          context: `Campana: ${name}. Plataforma: ${platformLabel}. Audiencia: ${audience || "general"}.`,
          tone: "professional",
          platform: platform === "meta_ads" ? "meta" : platform === "google_ads" ? "google" : "tiktok",
          language: "es",
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const content = data.content || "";
        const lines = content.split("\n").filter((l: string) => l.trim());
        if (lines.length >= 2) {
          setHeadline(lines[0].replace(/^#*\s*/, "").slice(0, 80));
          setDescription(lines.slice(1).join(" ").slice(0, 200));
        } else {
          setDescription(content.slice(0, 200));
        }
      }
    } catch {
      // silent — user can write manually
    }
    setGeneratingCopy(false);
  }

  function handleLaunch() {
    setSaving(true);
    // Simulate save delay
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
    }, 1200);
  }

  if (saved) {
    return (
      <>
        <SectionHeader title="Crear Campana" description="Configura una nueva campana publicitaria" />
        <div className="max-w-2xl">
          <div className="rounded-lg border border-[#3ecf8e]/30 p-8 text-center" style={{ backgroundColor: "#1e2a22" }}>
            <CheckCircle size={40} className="text-[#3ecf8e] mx-auto mb-4" />
            <h2 className="text-[18px] font-semibold text-[#ededed] mb-2">Campana guardada</h2>
            <p className="text-[13px] text-[#aaa] mb-1">
              <span className="text-[#ededed] font-medium">{name}</span> ha sido creada exitosamente.
            </p>
            <p className="text-[12px] text-[#888] mt-3">
              La sincronizacion con <span className="text-[#ccc] font-medium">{platformLabel}</span> estara disponible pronto.
            </p>
            <button
              onClick={() => { setSaved(false); setStep(0); setName(""); setPlatform(""); setBudget(""); setStartDate(""); setEndDate(""); setAudience(""); setHeadline(""); setDescription(""); setCta("Mas informacion"); }}
              className="mt-6 text-[12px] px-4 py-2 rounded border border-[#333] text-[#ccc] hover:border-[#3ecf8e]/40 transition-colors"
            >
              Crear otra campana
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SectionHeader title="Crear Campana" description="Configura una nueva campana publicitaria" />
      <div className="max-w-2xl">
        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-8">
          {WIZARD_STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className="flex items-center gap-2 flex-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium shrink-0 transition-colors ${
                    i < step ? "bg-[#3ecf8e] text-black" :
                    i === step ? "border-2 border-[#3ecf8e] text-[#3ecf8e]" :
                    "border border-[#444] text-[#666]"
                  }`}
                >
                  {i < step ? <CheckCircle size={14} /> : i + 1}
                </div>
                <span className={`text-[11px] hidden sm:block ${i === step ? "text-[#ededed]" : "text-[#666]"}`}>{s}</span>
              </div>
              {i < WIZARD_STEPS.length - 1 && (
                <div className={`h-px flex-1 min-w-4 ${i < step ? "bg-[#3ecf8e]" : "bg-[#333]"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Platform */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className="text-[12px] text-[#888] block mb-1.5">Nombre de la campana</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Promo Semana Santa 2026"
                className="w-full h-[38px] px-3 rounded-lg border border-[#333] text-[13px] text-[#ededed] placeholder:text-[#555] outline-none focus:border-[#3ecf8e]"
                style={{ backgroundColor: "#222" }}
              />
            </div>
            <div>
              <label className="text-[12px] text-[#888] block mb-1.5">Plataforma</label>
              <div className="grid grid-cols-3 gap-3">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => setPlatform(p.key)}
                    className={`rounded-lg border p-4 text-left transition-colors ${
                      platform === p.key ? "border-[#3ecf8e]" : "border-[#333] hover:border-[#555]"
                    }`}
                    style={{ backgroundColor: platform === p.key ? "#3ecf8e10" : "#1e1e1e" }}
                  >
                    <div className="w-3 h-3 rounded-full mb-2" style={{ backgroundColor: p.color }} />
                    <span className="text-[13px] text-[#ededed] font-medium">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Budget & Audience */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="text-[12px] text-[#888] block mb-1.5">Tipo de presupuesto</label>
              <div className="flex gap-2">
                {BUDGET_TYPES.map((bt) => (
                  <button
                    key={bt}
                    onClick={() => setBudgetType(bt)}
                    className={`text-[12px] px-3 py-1.5 rounded border transition-colors ${
                      budgetType === bt ? "border-[#3ecf8e] text-[#3ecf8e] bg-[#3ecf8e]/10" : "border-[#333] text-[#ccc] hover:border-[#555]"
                    }`}
                  >
                    {bt}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[12px] text-[#888] block mb-1.5">Presupuesto {budgetType.toLowerCase()} ($)</label>
              <input
                value={budget}
                onChange={(e) => setBudget(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="0.00"
                className="w-full h-[38px] px-3 rounded-lg border border-[#333] text-[13px] text-[#ededed] placeholder:text-[#555] outline-none focus:border-[#3ecf8e]"
                style={{ backgroundColor: "#222" }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] text-[#888] block mb-1.5">Fecha de inicio</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full h-[38px] px-3 rounded-lg border border-[#333] text-[13px] text-[#ededed] outline-none focus:border-[#3ecf8e] [color-scheme:dark]"
                  style={{ backgroundColor: "#222" }}
                />
              </div>
              <div>
                <label className="text-[12px] text-[#888] block mb-1.5">Fecha de fin (opcional)</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full h-[38px] px-3 rounded-lg border border-[#333] text-[13px] text-[#ededed] outline-none focus:border-[#3ecf8e] [color-scheme:dark]"
                  style={{ backgroundColor: "#222" }}
                />
              </div>
            </div>
            <div>
              <label className="text-[12px] text-[#888] block mb-1.5">Audiencia objetivo</label>
              <textarea
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="Ej: Hombres y mujeres 25-45, interesados en tecnologia, Costa Rica"
                className="w-full h-20 px-3 py-2 rounded-lg border border-[#333] text-[13px] text-[#ededed] placeholder:text-[#555] outline-none resize-none focus:border-[#3ecf8e]"
                style={{ backgroundColor: "#222" }}
              />
            </div>
          </div>
        )}

        {/* Step 3: Ad Copy */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[12px] text-[#888]">Contenido del anuncio</label>
              <button
                onClick={handleGenerateCopy}
                disabled={generatingCopy}
                className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded border border-[#6366f1]/40 text-[#6366f1] hover:bg-[#6366f1]/10 transition-colors disabled:opacity-50"
              >
                {generatingCopy ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                {generatingCopy ? "Generando..." : "Generar con IA"}
              </button>
            </div>
            <div>
              <label className="text-[12px] text-[#888] block mb-1.5">Titulo</label>
              <input
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Titulo principal del anuncio"
                maxLength={80}
                className="w-full h-[38px] px-3 rounded-lg border border-[#333] text-[13px] text-[#ededed] placeholder:text-[#555] outline-none focus:border-[#3ecf8e]"
                style={{ backgroundColor: "#222" }}
              />
              <span className="text-[10px] text-[#555] mt-1 block text-right">{headline.length}/80</span>
            </div>
            <div>
              <label className="text-[12px] text-[#888] block mb-1.5">Descripcion</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Texto descriptivo del anuncio..."
                maxLength={200}
                className="w-full h-24 px-3 py-2 rounded-lg border border-[#333] text-[13px] text-[#ededed] placeholder:text-[#555] outline-none resize-none focus:border-[#3ecf8e]"
                style={{ backgroundColor: "#222" }}
              />
              <span className="text-[10px] text-[#555] mt-1 block text-right">{description.length}/200</span>
            </div>
            <div>
              <label className="text-[12px] text-[#888] block mb-1.5">Call to Action</label>
              <select
                value={cta}
                onChange={(e) => setCta(e.target.value)}
                className="w-full h-[38px] px-3 rounded-lg border border-[#333] text-[13px] text-[#ededed] outline-none focus:border-[#3ecf8e] appearance-none"
                style={{ backgroundColor: "#222" }}
              >
                {["Mas informacion", "Comprar ahora", "Registrarse", "Contactar", "Descargar", "Ver oferta"].map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-lg border border-[#2e2e2e] divide-y divide-[#2e2e2e] overflow-hidden" style={{ backgroundColor: "#1e1e1e" }}>
              {[
                { label: "Campana", value: name },
                { label: "Plataforma", value: platformLabel },
                { label: "Presupuesto", value: `$${budget} ${budgetType.toLowerCase()}` },
                { label: "Inicio", value: startDate },
                { label: "Fin", value: endDate || "Sin fecha de fin" },
                { label: "Audiencia", value: audience || "Sin especificar" },
                { label: "Titulo", value: headline },
                { label: "Descripcion", value: description },
                { label: "CTA", value: cta },
              ].map((row) => (
                <div key={row.label} className="flex items-start px-4 py-3">
                  <span className="text-[12px] text-[#888] w-28 shrink-0">{row.label}</span>
                  <span className="text-[13px] text-[#ededed]">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-4 border-t border-[#2e2e2e]">
          <button
            onClick={() => setStep(step - 1)}
            disabled={step === 0}
            className="flex items-center gap-1.5 text-[12px] px-3 py-2 rounded text-[#ccc] hover:text-[#ededed] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={14} />
            Atras
          </button>
          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canNext}
              className="flex items-center gap-1.5 text-[12px] text-black px-4 py-2 rounded font-medium disabled:opacity-50 transition-colors"
              style={{ backgroundColor: "#3ecf8e" }}
            >
              Siguiente
              <ChevronRight size={14} />
            </button>
          ) : (
            <button
              onClick={handleLaunch}
              disabled={saving}
              className="flex items-center gap-1.5 text-[12px] text-black px-4 py-2 rounded font-medium disabled:opacity-50 transition-colors"
              style={{ backgroundColor: "#3ecf8e" }}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              {saving ? "Guardando..." : "Lanzar campana"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

export function PlatformAdsPage({ platform }: { platform: string }) {
  const platformMap: Record<string, string> = { "Meta Ads": "meta_ads", "Google Ads": "google_ads", "TikTok Ads": "tiktok" };
  const platformKey = platformMap[platform];

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const { data: metrics, isLoading } = trpc.campaigns.listMetrics.useQuery(
    { platform: platformKey, from: thirtyDaysAgo, to: now, groupBy: "day" },
    { enabled: !!platformKey }
  );

  const { data: campaigns } = trpc.campaigns.listCampaigns.useQuery(
    { platform: platformKey },
    { enabled: !!platformKey }
  );

  const totals = (metrics ?? []).reduce(
    (acc, m) => ({
      spend: acc.spend + m.spend,
      impressions: acc.impressions + m.impressions,
      clicks: acc.clicks + m.clicks,
      conversions: acc.conversions + m.conversions,
      revenue: acc.revenue + m.revenue,
    }),
    { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 }
  );

  const ctr = totals.impressions > 0 ? ((totals.clicks / totals.impressions) * 100).toFixed(1) : "0";
  const roas = totals.spend > 0 ? (totals.revenue / totals.spend).toFixed(1) : "0";

  const summaryCards = [
    { label: "Gasto Total", value: `$${totals.spend.toLocaleString()}` },
    { label: "Impresiones", value: totals.impressions >= 1000 ? `${(totals.impressions / 1000).toFixed(0)}K` : String(totals.impressions) },
    { label: "CTR", value: `${ctr}%` },
    { label: "ROAS", value: `${roas}x` },
  ];

  return (
    <>
      <SectionHeader title={platform} description={`Rendimiento de ${platform} — ultimos 30 dias`} />
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-20 rounded-lg bg-[#1e1e1e] animate-pulse" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
            {summaryCards.map((m) => (
              <div key={m.label} className="rounded-lg border border-[#2e2e2e] p-4" style={{ backgroundColor: "#1e1e1e" }}>
                <p className="text-[11px] text-[#888] mb-1">{m.label}</p>
                <p className="text-[20px] font-semibold text-[#ededed]">{m.value}</p>
              </div>
            ))}
          </div>

          {campaigns && campaigns.length > 0 ? (
            <div className="rounded-lg border border-[#2e2e2e] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: "#1e1e1e" }}>
                    {["Campana", "Gasto", "Conversiones", "Revenue", "ROAS"].map((h) => (
                      <th key={h} className="text-left text-[11px] uppercase tracking-wider text-[#888] font-medium px-4 py-3 border-b border-[#2e2e2e]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => (
                    <tr key={c.campaignId} className="border-b border-[#2e2e2e] last:border-0 hover:bg-[#1e1e1e] transition-colors">
                      <td className="px-4 py-3 text-[13px] text-[#ededed]">{c.campaignName}</td>
                      <td className="px-4 py-3 text-[13px] text-[#ccc]">${c.totalSpend.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[13px] text-[#ccc]">{c.totalConversions}</td>
                      <td className="px-4 py-3 text-[13px] text-[#3ecf8e]">${c.totalRevenue.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[13px] text-[#ededed]">{c.roas.toFixed(1)}x</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-[#2e2e2e] p-8 text-center" style={{ backgroundColor: "#1e1e1e" }}>
              <BarChart3 size={32} className="text-[#555] mx-auto mb-2" />
              <p className="text-[13px] text-[#888]">Sin datos de campanas</p>
              <p className="text-[11px] text-[#666]">Conecta tu cuenta de {platform} para ver datos</p>
            </div>
          )}
        </>
      )}
    </>
  );
}

const COPY_TYPES = [
  { key: "ad_copy", label: "Ad Copy" },
  { key: "email", label: "Email" },
  { key: "social_post", label: "Social Post" },
  { key: "blog", label: "Blog" },
] as const;

const TONE_OPTIONS = ["professional", "casual", "urgente", "inspiracional", "humoristico"] as const;

export function GeneradorCopyPage() {
  const [type, setType] = useState("ad_copy");
  const [context, setContext] = useState("");
  const [tone, setTone] = useState("professional");
  const [platform, setPlatform] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ content: string; variants: string[] } | null>(null);
  const [error, setError] = useState("");

  async function handleGenerate() {
    if (!context.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const resp = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, context: context.trim(), tone, platform: platform || undefined, language: "es" }),
      });
      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "Error generando copy");
      }
      const data = await resp.json();
      setResult({ content: data.content, variants: data.variants || [] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    }
    setLoading(false);
  }

  return (
    <>
      <SectionHeader title="Generador de Copy IA" description="Genera texto publicitario con inteligencia artificial" />
      <div className="max-w-3xl space-y-4">
        {/* Type selector */}
        <div>
          <label className="text-[12px] text-[#888] block mb-1.5">Tipo de contenido</label>
          <div className="flex gap-2">
            {COPY_TYPES.map((t) => (
              <button
                key={t.key}
                onClick={() => setType(t.key)}
                className={`text-[12px] px-3 py-1.5 rounded border transition-colors ${type === t.key ? "border-[#3ecf8e] text-[#3ecf8e] bg-[#3ecf8e]/10" : "border-[#333] text-[#ccc] hover:border-[#3ecf8e]/40"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tone selector */}
        <div>
          <label className="text-[12px] text-[#888] block mb-1.5">Tono</label>
          <div className="flex flex-wrap gap-2">
            {TONE_OPTIONS.map((t) => (
              <button
                key={t}
                onClick={() => setTone(t)}
                className={`text-[12px] px-3 py-1.5 rounded border transition-colors capitalize ${tone === t ? "border-[#6366f1] text-[#6366f1] bg-[#6366f1]/10" : "border-[#333] text-[#ccc] hover:border-[#555]"}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Platform (optional) */}
        {(type === "ad_copy" || type === "social_post") && (
          <div>
            <label className="text-[12px] text-[#888] block mb-1.5">Plataforma (opcional)</label>
            <div className="flex gap-2">
              {["Meta", "Google", "TikTok", "LinkedIn", "Instagram"].map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatform(platform === p.toLowerCase() ? "" : p.toLowerCase())}
                  className={`text-[12px] px-3 py-1.5 rounded border transition-colors ${platform === p.toLowerCase() ? "border-[#f59e0b] text-[#f59e0b] bg-[#f59e0b]/10" : "border-[#333] text-[#ccc] hover:border-[#555]"}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Context */}
        <div>
          <label className="text-[12px] text-[#888] block mb-1.5">Describe tu producto o servicio</label>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Ej: Somos una agencia de marketing digital en Costa Rica que ayuda a PYMEs a crecer con estrategias basadas en datos..."
            className="w-full h-28 px-3 py-2 rounded-lg border border-[#333] text-[13px] text-[#ededed] placeholder:text-[#555] outline-none resize-none focus:border-[#3ecf8e]"
            style={{ backgroundColor: "#222" }}
          />
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={loading || !context.trim()}
          className="flex items-center gap-1.5 text-[12px] text-black px-4 py-2 rounded font-medium disabled:opacity-50"
          style={{ backgroundColor: "#3ecf8e" }}
        >
          <Sparkles size={14} />
          {loading ? "Generando..." : "Generar copy"}
        </button>

        {error && <p className="text-[12px] text-red-400">{error}</p>}

        {/* Results */}
        {result && (
          <div className="space-y-4 mt-6">
            <div className="rounded-lg border border-[#3ecf8e]/30 p-4" style={{ backgroundColor: "#1e2a22" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-[#3ecf8e] uppercase tracking-wider">Resultado principal</span>
                <button
                  onClick={() => navigator.clipboard.writeText(result.content)}
                  className="text-[10px] px-2 py-1 rounded border border-[#333] text-[#888] hover:text-[#ccc]"
                >
                  Copiar
                </button>
              </div>
              <p className="text-[13px] text-[#ededed] whitespace-pre-wrap leading-relaxed">{result.content}</p>
            </div>

            {result.variants.length > 0 && (
              <div>
                <span className="text-[11px] font-medium text-[#888] uppercase tracking-wider block mb-2">Variantes</span>
                <div className="space-y-3">
                  {result.variants.map((v, i) => (
                    <div key={i} className="rounded-lg border border-[#2e2e2e] p-4" style={{ backgroundColor: "#1e1e1e" }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-[#666]">Variante {i + 1}</span>
                        <button
                          onClick={() => navigator.clipboard.writeText(v)}
                          className="text-[10px] px-2 py-1 rounded border border-[#333] text-[#888] hover:text-[#ccc]"
                        >
                          Copiar
                        </button>
                      </div>
                      <p className="text-[13px] text-[#ccc] whitespace-pre-wrap leading-relaxed">{v}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export function CreativosPage() {
  return (
    <>
      <SectionHeader title="Creativos" description="Biblioteca de imagenes y videos publicitarios" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-[#2e2e2e] aspect-square flex items-center justify-center" style={{ backgroundColor: "#1e1e1e" }}>
            <Image size={24} className="text-[#555]" />
          </div>
        ))}
      </div>
    </>
  );
}

export function CalendarioPage() {
  const days = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
  return (
    <>
      <SectionHeader title="Calendario" description="Calendario de campanas y contenido" />
      <div className="rounded-lg border border-[#2e2e2e] p-4" style={{ backgroundColor: "#1e1e1e" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[14px] font-medium text-[#ededed]">Marzo 2026</h3>
          <div className="flex gap-2">
            <button className="text-[12px] px-2 py-1 rounded text-[#888] hover:text-[#ededed]">&larr;</button>
            <button className="text-[12px] px-2 py-1 rounded text-[#888] hover:text-[#ededed]">&rarr;</button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => (
            <div key={d} className="text-center text-[11px] text-[#888] py-2">{d}</div>
          ))}
          {Array.from({ length: 31 }).map((_, i) => (
            <div
              key={i}
              className={`text-center text-[12px] py-2 rounded cursor-pointer transition-colors ${
                i === 14 ? "text-[#ededed] font-medium" : "text-[#888] hover:bg-[#2a2a2a]"
              }`}
              style={i === 14 ? { backgroundColor: "#3ecf8e20" } : {}}
            >
              {i + 1}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
