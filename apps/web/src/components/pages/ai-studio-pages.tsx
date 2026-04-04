"use client";

import { useState, useEffect } from "react";
import {
  Sparkles,
  Image,
  Video,
  FileText,
  Download,
  Loader2,
  AlertCircle,
  Lock,
  MessageSquare,
  Paintbrush,
  ArrowRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { usePlan } from "@/hooks/use-plan";
import { UpgradeModal } from "@/components/ui/upgrade-modal";

/* ------------------------------------------------------------------ */
/*  Shared helpers                                                     */
/* ------------------------------------------------------------------ */

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

function UsageBadge({ used, total, label }: { used: number; total: number; label: string }) {
  const pct = total === -1 ? 0 : Math.min((used / total) * 100, 100);
  const isUnlimited = total === -1;
  return (
    <div className="flex items-center gap-3 px-4 py-2 rounded-lg border border-[#2e2e2e]" style={{ backgroundColor: "#1e1e1e" }}>
      <div className="flex-1">
        <p className="text-[12px] text-[#888]">{label}</p>
        <p className="text-[14px] font-medium text-[#ededed]">
          {isUnlimited ? `${used} (ilimitado)` : `${used} de ${total}`}
        </p>
      </div>
      {!isUnlimited && (
        <div className="w-24 h-1.5 rounded-full bg-[#2a2a2a]">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: pct >= 90 ? "#ef4444" : "#3ecf8e" }}
          />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  AI Image Page                                                      */
/* ------------------------------------------------------------------ */

const IMAGE_SIZES = [
  { label: "Cuadrado (1:1)", value: "1024x1024" as const, desc: "Feed, perfil" },
  { label: "Vertical (9:16)", value: "1024x1792" as const, desc: "Stories, Reels" },
  { label: "Horizontal (16:9)", value: "1792x1024" as const, desc: "Banners, portada" },
  { label: "Post (4:5)", value: "1024x1536" as const, desc: "Instagram post" },
];

const IMAGE_STYLES = [
  { label: "Natural", value: "natural" as const, desc: "Fotorrealista" },
  { label: "Vivido", value: "vivid" as const, desc: "Colores intensos" },
];

export function AIImagePage() {
  const { plan, limits, canAccess, requiredPlanFor, isTrialExpired } = usePlan();
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState<(typeof IMAGE_SIZES)[number]["value"]>("1024x1024");
  const [style, setStyle] = useState<"natural" | "vivid">("natural");
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [revisedPrompt, setRevisedPrompt] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [showUpgrade, setShowUpgrade] = useState(false);

  const { data: usage } = trpc.billing.getUsage.useQuery();
  const imageUsed = usage?.aiImages?.used ?? 0;
  const imageLimit = limits.aiImages;

  const generateMutation = trpc.mediaGen.generateImage.useMutation({
    onSuccess: (data) => {
      setGeneratedUrl(data.url);
      setRevisedPrompt(data.revisedPrompt ?? null);
      setError("");
    },
    onError: (err) => {
      if (err.data?.code === "FORBIDDEN") {
        setShowUpgrade(true);
      } else {
        setError(err.message);
      }
    },
  });

  // Fetch recent generations from AiMemory
  const { data: recentImages } = trpc.aiMemory.list.useQuery(
    { category: "ai_image_gen", limit: 5 },
    { refetchOnWindowFocus: false },
  );

  function handleGenerate() {
    if (!prompt.trim()) return;
    if (!canAccess("ai_images")) {
      setShowUpgrade(true);
      return;
    }
    setError("");
    setGeneratedUrl(null);
    setRevisedPrompt(null);
    generateMutation.mutate({ prompt: prompt.trim(), size, style });
  }

  function handleUsarEnPublicacion() {
    if (!generatedUrl) return;
    window.dispatchEvent(
      new CustomEvent("dashboard:navigate", {
        detail: { section: "social", item: "Crear publicacion" },
      }),
    );
  }

  function handleDownload() {
    if (!generatedUrl) return;
    const a = document.createElement("a");
    a.href = generatedUrl;
    a.download = `nodelabz-ai-image-${Date.now()}.png`;
    a.target = "_blank";
    a.click();
  }

  return (
    <>
      <UpgradeModal
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        feature="ai_images"
        requiredPlan={requiredPlanFor("ai_images") ?? "CRECIMIENTO"}
        isTrialExpired={isTrialExpired}
      />

      <SectionHeader
        title="Generar Imagen con IA"
        description="Crea imagenes profesionales con inteligencia artificial para tus publicaciones y campanas."
      />

      {/* Usage counter */}
      <div className="mb-6">
        <UsageBadge used={imageUsed} total={imageLimit} label="Imagenes generadas este mes" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: controls */}
        <div className="space-y-5">
          {/* Prompt */}
          <div>
            <label className="block text-[13px] font-medium text-[#ccc] mb-2">Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder='Ej: "Foto profesional de un cafe artesanal con latte art, luz natural, fondo minimalista de madera"'
              rows={4}
              className="w-full rounded-lg border border-[#2e2e2e] bg-[#1e1e1e] text-[#ededed] text-[13px] px-4 py-3 placeholder:text-[#555] focus:outline-none focus:border-[#3ecf8e] resize-none"
            />
          </div>

          {/* Size selector */}
          <div>
            <label className="block text-[13px] font-medium text-[#ccc] mb-2">Tamano</label>
            <div className="grid grid-cols-2 gap-2">
              {IMAGE_SIZES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSize(s.value)}
                  className={`flex flex-col items-start px-3 py-2.5 rounded-lg border text-left transition-colors ${
                    size === s.value
                      ? "border-[#3ecf8e] bg-[#3ecf8e]/10"
                      : "border-[#2e2e2e] bg-[#1e1e1e] hover:border-[#444]"
                  }`}
                >
                  <span className={`text-[13px] font-medium ${size === s.value ? "text-[#3ecf8e]" : "text-[#ededed]"}`}>
                    {s.label}
                  </span>
                  <span className="text-[11px] text-[#666]">{s.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Style selector */}
          <div>
            <label className="block text-[13px] font-medium text-[#ccc] mb-2">Estilo</label>
            <div className="flex gap-2">
              {IMAGE_STYLES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStyle(s.value)}
                  className={`flex-1 flex flex-col items-center px-3 py-2.5 rounded-lg border transition-colors ${
                    style === s.value
                      ? "border-[#3ecf8e] bg-[#3ecf8e]/10"
                      : "border-[#2e2e2e] bg-[#1e1e1e] hover:border-[#444]"
                  }`}
                >
                  <span className={`text-[13px] font-medium ${style === s.value ? "text-[#3ecf8e]" : "text-[#ededed]"}`}>
                    {s.label}
                  </span>
                  <span className="text-[11px] text-[#666]">{s.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Generate button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generateMutation.isPending || !prompt.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-[14px] font-semibold text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#3ecf8e" }}
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generando imagen...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Generar Imagen
              </>
            )}
          </button>

          {error && (
            <div className="flex items-center gap-2 text-[13px] text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">
              <AlertCircle size={14} />
              {error}
            </div>
          )}
        </div>

        {/* Right: preview & results */}
        <div className="space-y-4">
          {/* Generated image preview */}
          <div
            className="relative rounded-lg border border-[#2e2e2e] overflow-hidden flex items-center justify-center"
            style={{ backgroundColor: "#1e1e1e", minHeight: "320px" }}
          >
            {generateMutation.isPending ? (
              <div className="flex flex-col items-center gap-3">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-2 border-[#3ecf8e]/30 animate-ping" />
                  <div className="absolute inset-0 rounded-full border-2 border-t-[#3ecf8e] animate-spin" />
                  <Sparkles size={20} className="absolute inset-0 m-auto text-[#3ecf8e]" />
                </div>
                <p className="text-[13px] text-[#888]">Generando tu imagen...</p>
                <div className="w-48 h-1 rounded-full bg-[#2a2a2a] overflow-hidden">
                  <div className="h-full rounded-full bg-[#3ecf8e] animate-pulse" style={{ width: "60%" }} />
                </div>
              </div>
            ) : generatedUrl ? (
              <img src={generatedUrl} alt="Imagen generada por IA" className="w-full h-auto object-contain max-h-[500px]" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-[#555]">
                <Image size={40} />
                <p className="text-[13px]">Tu imagen aparecera aqui</p>
              </div>
            )}
          </div>

          {/* Revised prompt */}
          {revisedPrompt && (
            <div className="px-3 py-2 rounded-lg border border-[#2e2e2e] bg-[#1e1e1e]">
              <p className="text-[11px] text-[#666] mb-1">Prompt revisado por IA:</p>
              <p className="text-[12px] text-[#999]">{revisedPrompt}</p>
            </div>
          )}

          {/* Actions */}
          {generatedUrl && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDownload}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-[#2e2e2e] text-[13px] text-[#ededed] hover:bg-[#2a2a2a] transition-colors"
              >
                <Download size={14} />
                Descargar
              </button>
              <button
                type="button"
                onClick={handleUsarEnPublicacion}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-medium text-black transition-colors"
                style={{ backgroundColor: "#3ecf8e" }}
              >
                <ArrowRight size={14} />
                Usar en publicacion
              </button>
            </div>
          )}

          {/* Recent gallery */}
          {recentImages && recentImages.length > 0 && (
            <div>
              <p className="text-[12px] text-[#666] mb-2">Imagenes recientes</p>
              <div className="grid grid-cols-5 gap-2">
                {recentImages.map((item: { id: string; value: string }) => {
                  let url = "";
                  try {
                    const parsed = JSON.parse(item.value);
                    url = parsed.url;
                  } catch {
                    /* skip */
                  }
                  if (!url) return null;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => { setGeneratedUrl(url); setRevisedPrompt(null); }}
                      className="rounded-md border border-[#2e2e2e] overflow-hidden hover:border-[#3ecf8e] transition-colors aspect-square"
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  AI Video Page                                                      */
/* ------------------------------------------------------------------ */

const VIDEO_DURATIONS = [
  { label: "5s", value: 5 as const },
  { label: "10s", value: 10 as const },
  { label: "15s", value: 15 as const },
];

export function AIVideoPage() {
  const { plan, limits, canAccess, requiredPlanFor, isTrialExpired } = usePlan();
  const [type, setType] = useState<"text-to-video" | "image-to-video">("text-to-video");
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [duration, setDuration] = useState<5 | 10 | 15>(5);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [showUpgrade, setShowUpgrade] = useState(false);

  const { data: usage } = trpc.billing.getUsage.useQuery();
  const videoUsed = usage?.aiVideos?.used ?? 0;
  const videoLimit = limits.aiVideos;

  const generateMutation = trpc.mediaGen.generateVideo.useMutation({
    onSuccess: (data) => {
      setActiveJobId(data.jobId);
      setError("");
    },
    onError: (err) => {
      if (err.data?.code === "FORBIDDEN") {
        setShowUpgrade(true);
      } else {
        setError(err.message);
      }
    },
  });

  // Poll for video status
  const { data: jobStatus } = trpc.mediaGen.checkVideoStatus.useQuery(
    { jobId: activeJobId! },
    {
      enabled: !!activeJobId && !videoUrl,
      refetchInterval: 5000,
    },
  );

  useEffect(() => {
    if (jobStatus?.status === "completed" && jobStatus.videoUrl) {
      setVideoUrl(jobStatus.videoUrl);
      setActiveJobId(null);
    } else if (jobStatus?.status === "failed") {
      setError(jobStatus.error || "Error generando el video. Intenta de nuevo.");
      setActiveJobId(null);
    }
  }, [jobStatus]);

  function handleGenerate() {
    if (!prompt.trim()) return;
    if (!canAccess("ai_videos")) {
      setShowUpgrade(true);
      return;
    }
    setError("");
    setVideoUrl(null);
    setActiveJobId(null);
    generateMutation.mutate({
      prompt: prompt.trim(),
      type,
      imageUrl: type === "image-to-video" ? imageUrl : undefined,
      duration,
    });
  }

  function handleDownload() {
    if (!videoUrl) return;
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = `nodelabz-ai-video-${Date.now()}.mp4`;
    a.target = "_blank";
    a.click();
  }

  const isGenerating = generateMutation.isPending || !!activeJobId;
  const needsUpgrade = !canAccess("ai_videos");

  return (
    <>
      <UpgradeModal
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        feature="ai_videos"
        requiredPlan={requiredPlanFor("ai_videos") ?? "CRECIMIENTO"}
        isTrialExpired={isTrialExpired}
      />

      <SectionHeader
        title="Generar Video con IA"
        description="Crea videos cortos con inteligencia artificial desde texto o imagenes."
      />

      {/* Plan gate banner for INICIO */}
      {needsUpgrade && (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-lg border border-[#f59e0b]/30 bg-[#f59e0b]/10">
          <Lock size={16} className="text-[#f59e0b]" />
          <div className="flex-1">
            <p className="text-[13px] text-[#ededed] font-medium">Requiere plan Crecimiento o superior</p>
            <p className="text-[12px] text-[#888]">Actualiza tu plan para generar videos con IA.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowUpgrade(true)}
            className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-black"
            style={{ backgroundColor: "#3ecf8e" }}
          >
            Actualizar plan
          </button>
        </div>
      )}

      {/* Usage counter */}
      {!needsUpgrade && (
        <div className="mb-6">
          <UsageBadge used={videoUsed} total={videoLimit} label="Videos generados este mes" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: controls */}
        <div className="space-y-5">
          {/* Type selector */}
          <div>
            <label className="block text-[13px] font-medium text-[#ccc] mb-2">Tipo de generacion</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType("text-to-video")}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border transition-colors ${
                  type === "text-to-video"
                    ? "border-[#3ecf8e] bg-[#3ecf8e]/10 text-[#3ecf8e]"
                    : "border-[#2e2e2e] bg-[#1e1e1e] text-[#ededed] hover:border-[#444]"
                }`}
              >
                <FileText size={14} />
                Desde texto
              </button>
              <button
                type="button"
                onClick={() => setType("image-to-video")}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border transition-colors ${
                  type === "image-to-video"
                    ? "border-[#3ecf8e] bg-[#3ecf8e]/10 text-[#3ecf8e]"
                    : "border-[#2e2e2e] bg-[#1e1e1e] text-[#ededed] hover:border-[#444]"
                }`}
              >
                <Image size={14} />
                Desde imagen
              </button>
            </div>
          </div>

          {/* Prompt */}
          <div>
            <label className="block text-[13px] font-medium text-[#ccc] mb-2">Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder='Ej: "Un cafe humeante en camara lenta, luz dorada de la manana, estilo cinematografico"'
              rows={4}
              className="w-full rounded-lg border border-[#2e2e2e] bg-[#1e1e1e] text-[#ededed] text-[13px] px-4 py-3 placeholder:text-[#555] focus:outline-none focus:border-[#3ecf8e] resize-none"
            />
          </div>

          {/* Image URL input (for image-to-video) */}
          {type === "image-to-video" && (
            <div>
              <label className="block text-[13px] font-medium text-[#ccc] mb-2">URL de imagen</label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://ejemplo.com/mi-imagen.jpg"
                className="w-full rounded-lg border border-[#2e2e2e] bg-[#1e1e1e] text-[#ededed] text-[13px] px-4 py-2.5 placeholder:text-[#555] focus:outline-none focus:border-[#3ecf8e]"
              />
            </div>
          )}

          {/* Duration selector */}
          <div>
            <label className="block text-[13px] font-medium text-[#ccc] mb-2">Duracion</label>
            <div className="flex gap-2">
              {VIDEO_DURATIONS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDuration(d.value)}
                  className={`flex-1 px-3 py-2.5 rounded-lg border text-center transition-colors ${
                    duration === d.value
                      ? "border-[#3ecf8e] bg-[#3ecf8e]/10 text-[#3ecf8e]"
                      : "border-[#2e2e2e] bg-[#1e1e1e] text-[#ededed] hover:border-[#444]"
                  }`}
                >
                  <span className="text-[13px] font-medium">{d.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Generate button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim() || needsUpgrade}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-[14px] font-semibold text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#3ecf8e" }}
          >
            {isGenerating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {activeJobId ? "Procesando video..." : "Enviando..."}
              </>
            ) : (
              <>
                <Video size={16} />
                Generar Video
              </>
            )}
          </button>

          {error && (
            <div className="flex items-center gap-2 text-[13px] text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">
              <AlertCircle size={14} />
              {error}
            </div>
          )}
        </div>

        {/* Right: preview */}
        <div className="space-y-4">
          <div
            className="relative rounded-lg border border-[#2e2e2e] overflow-hidden flex items-center justify-center"
            style={{ backgroundColor: "#1e1e1e", minHeight: "320px" }}
          >
            {isGenerating ? (
              <div className="flex flex-col items-center gap-3">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-2 border-[#3ecf8e]/30 animate-ping" />
                  <div className="absolute inset-0 rounded-full border-2 border-t-[#3ecf8e] animate-spin" />
                  <Video size={20} className="absolute inset-0 m-auto text-[#3ecf8e]" />
                </div>
                <p className="text-[13px] text-[#888]">
                  {activeJobId ? "Procesando video, puede tomar unos minutos..." : "Enviando solicitud..."}
                </p>
                <div className="w-48 h-1 rounded-full bg-[#2a2a2a] overflow-hidden">
                  <div className="h-full rounded-full bg-[#3ecf8e] animate-pulse" style={{ width: "40%" }} />
                </div>
              </div>
            ) : videoUrl ? (
              <video
                src={videoUrl}
                controls
                className="w-full h-auto max-h-[500px]"
                style={{ backgroundColor: "#000" }}
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-[#555]">
                <Video size={40} />
                <p className="text-[13px]">Tu video aparecera aqui</p>
              </div>
            )}
          </div>

          {/* Download button */}
          {videoUrl && (
            <button
              type="button"
              onClick={handleDownload}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-[#2e2e2e] text-[13px] text-[#ededed] hover:bg-[#2a2a2a] transition-colors"
            >
              <Download size={14} />
              Descargar video
            </button>
          )}
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Brand Editor Page (coming soon placeholder)                        */
/* ------------------------------------------------------------------ */

export function BrandEditorPage() {
  const [showUpgrade, setShowUpgrade] = useState(false);
  const { isTrialExpired } = usePlan();

  return (
    <>
      <UpgradeModal
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        feature="brand_editing"
        requiredPlan="PROFESIONAL"
        isTrialExpired={isTrialExpired}
      />

      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        {/* Icon */}
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
          style={{ backgroundColor: "#3ecf8e20" }}
        >
          <Paintbrush size={36} className="text-[#3ecf8e]" />
        </div>

        {/* Title */}
        <h1 className="text-[24px] font-semibold text-[#ededed] mb-2">Editor de Marca</h1>
        <span className="inline-block px-3 py-1 rounded-full text-[11px] font-medium mb-4" style={{ backgroundColor: "#f59e0b20", color: "#f59e0b" }}>
          Proximamente
        </span>

        {/* Description */}
        <p className="text-[14px] text-[#888] max-w-md mb-6 leading-relaxed">
          Edita imagenes generadas para que coincidan con tu marca. Colores, logos y estilo consistente en todas tus piezas graficas.
        </p>

        {/* Plan badge */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#2e2e2e] mb-8" style={{ backgroundColor: "#1e1e1e" }}>
          <Lock size={14} className="text-[#f59e0b]" />
          <span className="text-[12px] text-[#888]">Requiere plan <span className="text-[#f59e0b] font-medium">Profesional</span></span>
        </div>

        {/* Mockup preview */}
        <div className="w-full max-w-lg rounded-xl border border-[#2e2e2e] overflow-hidden" style={{ backgroundColor: "#1e1e1e" }}>
          <div className="px-4 py-3 border-b border-[#2e2e2e] flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ef4444]" />
            <div className="w-3 h-3 rounded-full bg-[#f59e0b]" />
            <div className="w-3 h-3 rounded-full bg-[#22c55e]" />
            <span className="text-[11px] text-[#555] ml-2">editor-de-marca.app</span>
          </div>
          <div className="p-6 space-y-4">
            {/* Mockup toolbar */}
            <div className="flex gap-2">
              {["Colores", "Logo", "Tipografia", "Estilo"].map((tab) => (
                <div
                  key={tab}
                  className="px-3 py-1.5 rounded-md text-[11px] text-[#666] border border-[#2e2e2e]"
                  style={{ backgroundColor: "#252525" }}
                >
                  {tab}
                </div>
              ))}
            </div>
            {/* Mockup canvas */}
            <div className="flex gap-4">
              <div className="flex-1 h-32 rounded-lg border border-dashed border-[#333] flex items-center justify-center">
                <Image size={24} className="text-[#444]" />
              </div>
              <div className="w-32 space-y-2">
                <div className="h-6 rounded bg-[#2a2a2a]" />
                <div className="h-6 rounded bg-[#2a2a2a]" />
                <div className="flex gap-1">
                  <div className="w-6 h-6 rounded-full" style={{ backgroundColor: "#3ecf8e" }} />
                  <div className="w-6 h-6 rounded-full" style={{ backgroundColor: "#3b82f6" }} />
                  <div className="w-6 h-6 rounded-full" style={{ backgroundColor: "#f59e0b" }} />
                </div>
                <div className="h-6 rounded bg-[#2a2a2a]" />
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowUpgrade(true)}
          className="mt-6 px-6 py-2.5 rounded-lg text-[13px] font-medium text-black transition-colors"
          style={{ backgroundColor: "#3ecf8e" }}
        >
          Notificarme cuando este disponible
        </button>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  AI Chat Page                                                       */
/* ------------------------------------------------------------------ */

export function AIChatPage() {
  useEffect(() => {
    // Dispatch event to open the sidebar AI chat panel
    window.dispatchEvent(new CustomEvent("toggle-ai-chat"));
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
        style={{ backgroundColor: "#f59e0b20" }}
      >
        <MessageSquare size={36} className="text-[#f59e0b]" />
      </div>

      <h1 className="text-[24px] font-semibold text-[#ededed] mb-2">Chat IA</h1>
      <p className="text-[14px] text-[#888] max-w-md mb-6 leading-relaxed">
        Tu asistente de inteligencia artificial esta disponible en el panel lateral. Preguntale sobre tus campanas,
        genera contenido o recibe recomendaciones personalizadas.
      </p>

      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent("toggle-ai-chat"))}
        className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-[13px] font-medium text-black transition-colors"
        style={{ backgroundColor: "#3ecf8e" }}
      >
        <Sparkles size={14} />
        Abrir Chat IA
      </button>
    </div>
  );
}
