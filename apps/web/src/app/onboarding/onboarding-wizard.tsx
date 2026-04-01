"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useRouter } from "next/navigation";
import { Check, ArrowRight, Upload, Plug, BarChart3, Users, Zap } from "lucide-react";

const STEPS = [
  { id: "welcome", label: "Bienvenida" },
  { id: "platforms", label: "Plataformas" },
  { id: "contacts", label: "Contactos" },
  { id: "ready", label: "Listo" },
];

const PLATFORMS = [
  { name: "Meta Ads", provider: "meta_ads" as const, icon: "M", color: "#1877F2", desc: "Facebook & Instagram Ads" },
  { name: "Google Ads", provider: "google_ads" as const, icon: "G", color: "#4285F4", desc: "Busqueda y Display" },
  { name: "TikTok Ads", provider: "tiktok" as const, icon: "T", color: "#000", desc: "Anuncios en TikTok" },
  { name: "Google Analytics", provider: "ga4" as const, icon: "A", color: "#E37400", desc: "Trafico y conversiones" },
  { name: "Shopify", provider: "shopify" as const, icon: "S", color: "#95BF47", desc: "E-commerce" },
];

export function OnboardingWizard({ userName }: { userName: string }) {
  const [step, setStep] = useState(0);
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);
  const router = useRouter();

  const startOAuth = trpc.integrations.startOAuth.useMutation({
    onSuccess: (data) => {
      window.open(data.authUrl, "_blank");
    },
  });

  const currentStep = STEPS[step];

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#171717" }}>
      <div className="w-full max-w-2xl rounded-2xl border border-[#2e2e2e] p-8" style={{ backgroundColor: "#1c1c1c" }}>
        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  i < step ? "bg-[#3ecf8e] text-black" : i === step ? "bg-[#3ecf8e]/20 text-[#3ecf8e] border border-[#3ecf8e]" : "bg-[#252525] text-[#666]"
                }`}
              >
                {i < step ? <Check size={14} /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 ${i < step ? "bg-[#3ecf8e]" : "bg-[#2e2e2e]"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step: Welcome */}
        {currentStep?.id === "welcome" && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#3ecf8e] to-[#2ba06e] flex items-center justify-center mx-auto mb-6">
              <Zap size={28} className="text-white" />
            </div>
            <h1 className="text-[24px] font-bold text-[#ededed] mb-2">
              Bienvenido, {userName}!
            </h1>
            <p className="text-[15px] text-[#888] mb-8 max-w-md mx-auto">
              Vamos a configurar tu cuenta en menos de 2 minutos. Conecta tus plataformas y empieza a ver tus datos.
            </p>
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="rounded-lg border border-[#2e2e2e] p-4 text-center" style={{ backgroundColor: "#252525" }}>
                <Plug size={20} className="text-[#3ecf8e] mx-auto mb-2" />
                <p className="text-[12px] text-[#ccc]">Conecta plataformas</p>
              </div>
              <div className="rounded-lg border border-[#2e2e2e] p-4 text-center" style={{ backgroundColor: "#252525" }}>
                <Users size={20} className="text-[#6366f1] mx-auto mb-2" />
                <p className="text-[12px] text-[#ccc]">Importa contactos</p>
              </div>
              <div className="rounded-lg border border-[#2e2e2e] p-4 text-center" style={{ backgroundColor: "#252525" }}>
                <BarChart3 size={20} className="text-[#f59e0b] mx-auto mb-2" />
                <p className="text-[12px] text-[#ccc]">Ve tus insights</p>
              </div>
            </div>
            <button
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-2 rounded-lg px-8 py-3 text-[14px] font-semibold text-black"
              style={{ backgroundColor: "#3ecf8e" }}
            >
              Empezar <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* Step: Connect Platforms */}
        {currentStep?.id === "platforms" && (
          <div>
            <h2 className="text-[20px] font-bold text-[#ededed] mb-2">Conecta tus plataformas</h2>
            <p className="text-[13px] text-[#888] mb-6">
              Selecciona las plataformas que usas. Puedes agregar mas despues.
            </p>
            <div className="space-y-3 mb-8">
              {PLATFORMS.map((p) => {
                const isConnected = connectedPlatforms.includes(p.provider);
                return (
                  <div
                    key={p.provider}
                    className={`rounded-lg border p-4 flex items-center gap-4 transition-colors ${
                      isConnected ? "border-[#3ecf8e]/40" : "border-[#2e2e2e] hover:border-[#444]"
                    }`}
                    style={{ backgroundColor: "#252525" }}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-[14px]"
                      style={{ backgroundColor: p.color }}
                    >
                      {p.icon}
                    </div>
                    <div className="flex-1">
                      <p className="text-[13px] font-medium text-[#ededed]">{p.name}</p>
                      <p className="text-[11px] text-[#888]">{p.desc}</p>
                    </div>
                    {isConnected ? (
                      <span className="flex items-center gap-1 text-[12px] text-[#3ecf8e]">
                        <Check size={14} /> Conectado
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          startOAuth.mutate({ provider: p.provider });
                          setConnectedPlatforms([...connectedPlatforms, p.provider]);
                        }}
                        disabled={startOAuth.isPending}
                        className="text-[12px] px-4 py-2 rounded-lg border border-[#444] text-[#ccc] hover:border-[#3ecf8e]/40 hover:text-[#3ecf8e] transition-colors"
                      >
                        Conectar
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between">
              <button onClick={() => setStep(0)} className="text-[13px] text-[#888] hover:text-[#ccc]">
                Atras
              </button>
              <button
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-[13px] font-semibold text-black"
                style={{ backgroundColor: "#3ecf8e" }}
              >
                {connectedPlatforms.length > 0 ? "Siguiente" : "Saltar por ahora"} <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Step: Import Contacts */}
        {currentStep?.id === "contacts" && (
          <div>
            <h2 className="text-[20px] font-bold text-[#ededed] mb-2">Importa tus contactos</h2>
            <p className="text-[13px] text-[#888] mb-6">
              Agrega tus contactos existentes o empieza desde cero.
            </p>
            <div className="grid grid-cols-2 gap-4 mb-8">
              <button
                onClick={() => {
                  // Will redirect to import page after onboarding
                  setStep(3);
                }}
                className="rounded-lg border border-dashed border-[#444] p-8 text-center hover:border-[#3ecf8e]/40 transition-colors"
                style={{ backgroundColor: "#252525" }}
              >
                <Upload size={28} className="text-[#888] mx-auto mb-3" />
                <p className="text-[14px] font-medium text-[#ededed] mb-1">Subir CSV</p>
                <p className="text-[12px] text-[#888]">Importar desde archivo</p>
              </button>
              <button
                onClick={() => setStep(3)}
                className="rounded-lg border border-dashed border-[#444] p-8 text-center hover:border-[#3ecf8e]/40 transition-colors"
                style={{ backgroundColor: "#252525" }}
              >
                <Users size={28} className="text-[#888] mx-auto mb-3" />
                <p className="text-[14px] font-medium text-[#ededed] mb-1">Empezar de cero</p>
                <p className="text-[12px] text-[#888]">Agregar contactos manualmente</p>
              </button>
            </div>
            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="text-[13px] text-[#888] hover:text-[#ccc]">
                Atras
              </button>
              <button
                onClick={() => setStep(3)}
                className="text-[13px] text-[#888] hover:text-[#ccc]"
              >
                Saltar por ahora
              </button>
            </div>
          </div>
        )}

        {/* Step: Ready */}
        {currentStep?.id === "ready" && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-[#3ecf8e]/20 flex items-center justify-center mx-auto mb-6">
              <Check size={32} className="text-[#3ecf8e]" />
            </div>
            <h2 className="text-[24px] font-bold text-[#ededed] mb-2">Todo listo!</h2>
            <p className="text-[15px] text-[#888] mb-2 max-w-md mx-auto">
              Tu cuenta de NodeLabz esta configurada. Tienes 7 dias de prueba gratuita.
            </p>
            {connectedPlatforms.length > 0 && (
              <p className="text-[13px] text-[#3ecf8e] mb-6">
                {connectedPlatforms.length} plataforma{connectedPlatforms.length > 1 ? "s" : ""} conectada{connectedPlatforms.length > 1 ? "s" : ""}
              </p>
            )}
            <button
              onClick={() => router.push("/dashboard")}
              className="inline-flex items-center gap-2 rounded-lg px-8 py-3 text-[14px] font-semibold text-black"
              style={{ backgroundColor: "#3ecf8e" }}
            >
              Ir al Dashboard <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
