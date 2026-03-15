"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, ArrowRight, ArrowLeft, Loader2, Check } from "lucide-react";

interface NewProjectWizardProps {
  open: boolean;
  onClose: () => void;
}

const industries = [
  "Tecnologia",
  "E-commerce",
  "Servicios profesionales",
  "Salud",
  "Educacion",
  "Restaurantes & Hospitalidad",
  "Bienes raices",
  "Finanzas",
  "Retail",
  "Manufactura",
  "Otro",
];

const regions = [
  { id: "costa-rica", label: "Costa Rica", flag: "CR" },
  { id: "mexico", label: "Mexico", flag: "MX" },
  { id: "colombia", label: "Colombia", flag: "CO" },
  { id: "panama", label: "Panama", flag: "PA" },
  { id: "usa", label: "Estados Unidos", flag: "US" },
  { id: "other-latam", label: "Otro (LATAM)", flag: "LA" },
];

const plans = [
  { id: "INICIO", name: "Inicio", price: "$39", desc: "Recomendaciones IA, CRM basico, 3 integraciones" },
  { id: "CRECIMIENTO", name: "Crecimiento", price: "$79", desc: "Email marketing, formularios, automatizaciones" },
  { id: "PROFESIONAL", name: "Profesional", price: "$149", desc: "WhatsApp, Node Map, lead automation completa" },
  { id: "AGENCIA", name: "Agencia", price: "$249", desc: "IA autonoma, Voice AI, video ads, white-label" },
];

export function NewProjectWizard({ open, onClose }: NewProjectWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    projectName: "",
    companyName: "",
    industry: "",
    region: "",
    plan: "INICIO",
    language: "es",
  });

  if (!open) return null;

  const updateForm = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const canProceed = () => {
    if (step === 0) return form.projectName.length >= 2 && form.companyName.length >= 2;
    if (step === 1) return form.industry !== "" && form.region !== "";
    if (step === 2) return form.plan !== "";
    return true;
  };

  const handleCreate = async () => {
    setLoading(true);
    // TODO: Call API to create tenant/project
    await new Promise((r) => setTimeout(r, 1500));
    setLoading(false);
    setStep(3);
    setTimeout(() => {
      onClose();
      router.push("/dashboard");
      router.refresh();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg mx-4 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="text-[16px] font-semibold text-white">Nuevo proyecto</h2>
            <p className="text-[12px] text-[#888] mt-0.5">
              {step === 0 && "Paso 1 de 3 — Informacion basica"}
              {step === 1 && "Paso 2 de 3 — Industria y region"}
              {step === 2 && "Paso 3 de 3 — Selecciona tu plan"}
              {step === 3 && "Proyecto creado"}
            </p>
          </div>
          <button onClick={onClose} className="text-[#666] hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-[2px] bg-[#2e2e2e]">
          <div
            className="h-full transition-all duration-500 ease-out"
            style={{ width: `${((step + 1) / 4) * 100}%`, backgroundColor: '#3ecf8e' }}
          />
        </div>

        {/* Content */}
        <div className="px-6 py-5 min-h-[280px]">
          {/* Step 0: Basic info */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] text-[#888] mb-1.5 uppercase tracking-wider">Nombre del proyecto</label>
                <input
                  type="text"
                  value={form.projectName}
                  onChange={(e) => updateForm("projectName", e.target.value)}
                  placeholder="Mi Proyecto"
                  className="w-full h-10 px-3 rounded-lg border border-[#333] bg-black/30 text-[14px] text-white placeholder:text-[#555] focus:outline-none focus:border-[#3ecf8e] transition-colors"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-[12px] text-[#888] mb-1.5 uppercase tracking-wider">Nombre de la empresa</label>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={(e) => updateForm("companyName", e.target.value)}
                  placeholder="Mi Empresa S.A."
                  className="w-full h-10 px-3 rounded-lg border border-[#333] bg-black/30 text-[14px] text-white placeholder:text-[#555] focus:outline-none focus:border-[#3ecf8e] transition-colors"
                />
              </div>
            </div>
          )}

          {/* Step 1: Industry & Region */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] text-[#888] mb-1.5 uppercase tracking-wider">Industria</label>
                <div className="grid grid-cols-2 gap-2">
                  {industries.map((ind) => (
                    <button
                      key={ind}
                      type="button"
                      onClick={() => updateForm("industry", ind)}
                      className={`h-9 px-3 rounded-lg border text-[13px] text-left transition-colors ${
                        form.industry === ind
                          ? "border-[#3ecf8e] text-[#3ecf8e] bg-[#3ecf8e]/10"
                          : "border-[#333] text-[#999] hover:border-[#555] hover:text-white bg-black/20"
                      }`}
                    >
                      {ind}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[12px] text-[#888] mb-1.5 uppercase tracking-wider">Region</label>
                <div className="grid grid-cols-2 gap-2">
                  {regions.map((reg) => (
                    <button
                      key={reg.id}
                      type="button"
                      onClick={() => updateForm("region", reg.id)}
                      className={`h-9 px-3 rounded-lg border text-[13px] text-left transition-colors flex items-center gap-2 ${
                        form.region === reg.id
                          ? "border-[#3ecf8e] text-[#3ecf8e] bg-[#3ecf8e]/10"
                          : "border-[#333] text-[#999] hover:border-[#555] hover:text-white bg-black/20"
                      }`}
                    >
                      <span className="text-[11px] font-mono text-[#666]">{reg.flag}</span>
                      {reg.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Plan selection */}
          {step === 2 && (
            <div className="space-y-2">
              <label className="block text-[12px] text-[#888] mb-2 uppercase tracking-wider">Selecciona un plan</label>
              {plans.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => updateForm("plan", plan.id)}
                  className={`w-full p-3 rounded-lg border text-left transition-colors ${
                    form.plan === plan.id
                      ? "border-[#3ecf8e] bg-[#3ecf8e]/10"
                      : "border-[#333] hover:border-[#555] bg-black/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[14px] font-medium ${form.plan === plan.id ? "text-[#3ecf8e]" : "text-[#ededed]"}`}>
                      {plan.name}
                    </span>
                    <span className="text-[14px] font-semibold text-[#ededed]">{plan.price}<span className="text-[11px] text-[#666] font-normal">/mes</span></span>
                  </div>
                  <p className="text-[12px] text-[#666] mt-1">{plan.desc}</p>
                </button>
              ))}
              <p className="text-[11px] text-[#555] mt-2">7 dias de prueba gratis en todos los planes.</p>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 3 && (
            <div className="flex flex-col items-center justify-center h-[240px] text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#3ecf8e' }}>
                <Check size={24} className="text-white" />
              </div>
              <h3 className="text-[18px] font-semibold text-white mb-2">Proyecto creado</h3>
              <p className="text-[13px] text-[#888]">Redirigiendo al dashboard...</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {step < 3 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/10">
            {step > 0 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-1.5 text-[13px] text-[#888] hover:text-white transition-colors"
              >
                <ArrowLeft size={14} />
                Atras
              </button>
            ) : (
              <div />
            )}
            {step < 2 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-[13px] font-medium text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#3ecf8e' }}
              >
                Siguiente
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                onClick={handleCreate}
                disabled={loading || !canProceed()}
                className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-[13px] font-medium text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#3ecf8e' }}
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    Crear proyecto
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
