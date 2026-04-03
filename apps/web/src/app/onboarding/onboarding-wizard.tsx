"use client";

import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useRouter } from "next/navigation";
import {
  Check,
  ArrowRight,
  ArrowLeft,
  Upload,
  Plug,
  BarChart3,
  Users,
  Zap,
  FileSpreadsheet,
  AlertCircle,
  Loader2,
  X,
  Building2,
  CreditCard,
  Crown,
  Rocket,
  Star,
} from "lucide-react";

// ── Steps ──────────────────────────────────────────────────────────────────

const STEPS = [
  { id: "company", label: "Empresa" },
  { id: "platforms", label: "Plataformas" },
  { id: "contacts", label: "Contactos" },
  { id: "plan", label: "Plan" },
  { id: "ready", label: "Listo" },
] as const;

const PLATFORMS = [
  { name: "Meta Ads", provider: "meta_ads" as const, icon: "M", color: "#1877F2", desc: "Facebook & Instagram Ads" },
  { name: "Google Ads", provider: "google_ads" as const, icon: "G", color: "#4285F4", desc: "Busqueda y Display" },
  { name: "TikTok Ads", provider: "tiktok" as const, icon: "T", color: "#000", desc: "Anuncios en TikTok" },
  { name: "Google Analytics", provider: "ga4" as const, icon: "A", color: "#E37400", desc: "Trafico y conversiones" },
  { name: "Shopify", provider: "shopify" as const, icon: "S", color: "#95BF47", desc: "E-commerce" },
];

const CONTACT_FIELDS = [
  { value: "firstName", label: "Nombre" },
  { value: "lastName", label: "Apellido" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Telefono" },
  { value: "company", label: "Empresa" },
  { value: "source", label: "Origen" },
  { value: "__skip", label: "-- Omitir columna --" },
];

const INDUSTRIES = [
  "Marketing y Publicidad",
  "Tecnologia",
  "E-commerce",
  "Servicios Profesionales",
  "Salud",
  "Educacion",
  "Bienes Raices",
  "Restaurantes y Alimentos",
  "Turismo",
  "Finanzas",
  "Otro",
];

const COMPANY_SIZES = [
  { value: "1-5", label: "1-5 empleados" },
  { value: "6-20", label: "6-20 empleados" },
  { value: "21-50", label: "21-50 empleados" },
  { value: "51-200", label: "51-200 empleados" },
  { value: "200+", label: "200+ empleados" },
];

const PLANS = [
  {
    id: "INICIO",
    name: "Inicio",
    price: "Gratis",
    priceNum: 0,
    desc: "Para empezar a explorar",
    icon: Star,
    color: "#888",
    features: ["500 contactos", "5K emails/mes", "AI basico", "1 usuario"],
    cta: "Empezar gratis",
  },
  {
    id: "CRECIMIENTO",
    name: "Crecimiento",
    price: "$79/mes",
    priceNum: 79,
    desc: "Para equipos en crecimiento",
    icon: Rocket,
    color: "#3ecf8e",
    popular: true,
    features: ["5K contactos", "25K emails/mes", "AI avanzado", "5 usuarios", "Workflows"],
    cta: "Seleccionar",
  },
  {
    id: "PROFESIONAL",
    name: "Profesional",
    price: "$199/mes",
    priceNum: 199,
    desc: "Para agencias profesionales",
    icon: Crown,
    color: "#6366f1",
    features: ["25K contactos", "100K emails/mes", "AI premium", "15 usuarios", "Generacion de media", "Broadcasts"],
    cta: "Seleccionar",
  },
  {
    id: "AGENCIA",
    name: "Agencia",
    price: "$399/mes",
    priceNum: 399,
    desc: "Para agencias enterprise",
    icon: Building2,
    color: "#f59e0b",
    features: ["Contactos ilimitados", "Emails ilimitados", "AI premium", "Usuarios ilimitados", "Todo incluido"],
    cta: "Seleccionar",
  },
];

type ContactsSubStep = "choose" | "mapping" | "done";

// ── Component ──────────────────────────────────────────────────────────────

export function OnboardingWizard({ userName }: { userName: string }) {
  const [step, setStep] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const router = useRouter();

  // --- Company Info ---
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");

  const updateTenant = trpc.tenant.update.useMutation();

  // --- Platforms ---
  const integrationsQuery = trpc.integrations.list.useQuery(undefined, {
    refetchInterval: 5000,
  });

  const connectedProviders = (integrationsQuery.data ?? [])
    .filter((i) => i.status === "active" || i.status === "connected")
    .map((i) => i.platform);

  const startOAuth = trpc.integrations.startOAuth.useMutation({
    onSuccess: (data) => {
      window.open(data.authUrl, "_blank", "width=600,height=700");
    },
  });
  const [pendingOAuth, setPendingOAuth] = useState<string | null>(null);

  // --- Contacts CSV ---
  const [contactsSubStep, setContactsSubStep] = useState<ContactsSubStep>("choose");
  const [csvFileName, setCsvFileName] = useState("");
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [csvTotalRows, setCsvTotalRows] = useState(0);
  const [csvPreview, setCsvPreview] = useState<Record<string, string>[]>([]);
  const [csvAllRows, setCsvAllRows] = useState<Record<string, string>[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Plan ---
  const [selectedPlan, setSelectedPlan] = useState("INICIO");
  const checkout = trpc.billing.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
  });

  const parseCSV = trpc.contacts.parseCSV.useMutation({
    onSuccess: (data) => {
      setCsvColumns(data.columns);
      setCsvTotalRows(data.totalRows);
      setCsvPreview(data.preview);

      const autoMapping: Record<string, string> = {};
      const nameMap: Record<string, string> = {
        name: "firstName", nombre: "firstName", first_name: "firstName", firstname: "firstName",
        "first name": "firstName", apellido: "lastName", last_name: "lastName", lastname: "lastName",
        "last name": "lastName", email: "email", correo: "email", "e-mail": "email",
        phone: "phone", telefono: "phone", tel: "phone", celular: "phone",
        company: "company", empresa: "company", source: "source", origen: "source", fuente: "source",
      };
      for (const col of data.columns) {
        const normalized = col.toLowerCase().trim();
        if (nameMap[normalized]) autoMapping[col] = nameMap[normalized]!;
      }
      setFieldMapping(autoMapping);
      setContactsSubStep("mapping");
    },
    onError: (err) => setImportError(err.message),
  });

  const bulkImport = trpc.contacts.bulkImport.useMutation({
    onSuccess: (data) => {
      setImportedCount(data.imported);
      setContactsSubStep("done");
    },
    onError: (err) => setImportError(err.message),
  });

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setCsvFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length >= 2) {
        const parseLine = (line: string): string[] => {
          const result: string[] = [];
          let current = "";
          let inQuotes = false;
          const delimiter = line.includes(";") && !line.includes(",") ? ";" : ",";
          for (let i = 0; i < line.length; i++) {
            const char = line[i]!;
            if (char === '"') {
              if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
              else inQuotes = !inQuotes;
            } else if (char === delimiter && !inQuotes) { result.push(current.trim()); current = ""; }
            else current += char;
          }
          result.push(current.trim());
          return result;
        };
        const cols = parseLine(lines[0]!);
        const allRows = lines.slice(1).map((line) => {
          const values = parseLine(line);
          const row: Record<string, string> = {};
          cols.forEach((col, idx) => { row[col] = values[idx] || ""; });
          return row;
        });
        setCsvAllRows(allRows);
      }
      parseCSV.mutate({ csvContent: text });
    };
    reader.readAsText(file);
  }, [parseCSV]);

  const handleImport = useCallback(() => {
    setImportError(null);
    const contacts: Array<{ firstName: string; lastName?: string; email?: string; phone?: string; company?: string; source?: string; tags?: string[] }> = [];
    const rowsToImport = csvAllRows.length > 0 ? csvAllRows : csvPreview;
    for (const row of rowsToImport) {
      const mapped: Record<string, string> = {};
      for (const [csvCol, field] of Object.entries(fieldMapping)) {
        if (field !== "__skip" && row[csvCol]) mapped[field] = row[csvCol]!;
      }
      if (!mapped.firstName) continue;
      contacts.push({
        firstName: mapped.firstName, lastName: mapped.lastName, email: mapped.email,
        phone: mapped.phone, company: mapped.company, source: mapped.source || "csv_import",
        tags: ["csv-import", "onboarding"],
      });
    }
    if (contacts.length === 0) {
      setImportError("No se encontraron contactos validos. Asegurate de mapear la columna 'Nombre'.");
      return;
    }
    bulkImport.mutate({ contacts });
  }, [csvAllRows, csvPreview, fieldMapping, bulkImport]);

  const goNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleCompanySubmit = () => {
    if (!companyName.trim()) return;
    updateTenant.mutate(
      { name: companyName.trim(), industry: industry || undefined, companySize: companySize || undefined },
      { onSuccess: () => goNext() }
    );
  };

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
    if (planId === "INICIO") {
      goNext(); // Free plan — skip checkout
    } else {
      checkout.mutate({ plan: planId as "INICIO" | "CRECIMIENTO" | "PROFESIONAL" | "AGENCIA" });
    }
  };

  const currentStep = STEPS[step];

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#171717" }}>
      <div className="w-full max-w-2xl rounded-2xl border border-[#2e2e2e] p-8" style={{ backgroundColor: "#1c1c1c" }}>
        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                  i < step ? "bg-[#3ecf8e] text-black"
                    : i === step ? "bg-[#3ecf8e]/20 text-[#3ecf8e] border border-[#3ecf8e]"
                    : "bg-[#252525] text-[#666]"
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

        {/* ═══════ Step 1: Company Info ═══════ */}
        {currentStep?.id === "company" && (
          <div>
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#3ecf8e] to-[#2ba06e] flex items-center justify-center mx-auto mb-4">
                <Building2 size={24} className="text-white" />
              </div>
              <h1 className="text-[22px] font-bold text-[#ededed] mb-1">
                Bienvenido, {userName}!
              </h1>
              <p className="text-[14px] text-[#888]">Cuentanos sobre tu empresa</p>
            </div>

            <div className="space-y-4 mb-8">
              <div>
                <label className="text-[12px] text-[#888] mb-1.5 block">Nombre de tu empresa *</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Ej: Mi Agencia Digital"
                  className="w-full h-11 rounded-lg border border-[#2e2e2e] bg-[#252525] text-[#ededed] px-4 text-[14px] outline-none focus:border-[#3ecf8e]/60 placeholder:text-[#555]"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[12px] text-[#888] mb-1.5 block">Industria</label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full h-11 rounded-lg border border-[#2e2e2e] bg-[#252525] text-[#ededed] px-4 text-[14px] outline-none focus:border-[#3ecf8e]/60"
                >
                  <option value="">Seleccionar...</option>
                  {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[12px] text-[#888] mb-1.5 block">Tamano de empresa</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {COMPANY_SIZES.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setCompanySize(s.value)}
                      className={`h-10 rounded-lg border text-[12px] transition-colors ${
                        companySize === s.value
                          ? "border-[#3ecf8e] text-[#3ecf8e] bg-[#3ecf8e]/10"
                          : "border-[#2e2e2e] text-[#888] hover:border-[#444]"
                      }`}
                    >
                      {s.value}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleCompanySubmit}
              disabled={!companyName.trim() || updateTenant.isPending}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-8 py-3 text-[14px] font-semibold text-black hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{ backgroundColor: "#3ecf8e" }}
            >
              {updateTenant.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
              Continuar <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* ═══════ Step 2: Connect Platforms ═══════ */}
        {currentStep?.id === "platforms" && (
          <div>
            <h2 className="text-[20px] font-bold text-[#ededed] mb-2">Conecta tus plataformas</h2>
            <p className="text-[13px] text-[#888] mb-6">Selecciona las plataformas que usas. Puedes agregar mas despues.</p>
            <div className="space-y-3 mb-8">
              {PLATFORMS.map((p) => {
                const isConnected = connectedProviders.includes(p.provider);
                const isLoading = pendingOAuth === p.provider && startOAuth.isPending;
                return (
                  <div key={p.provider} className={`rounded-lg border p-4 flex items-center gap-4 transition-colors ${isConnected ? "border-[#3ecf8e]/40" : "border-[#2e2e2e] hover:border-[#444]"}`} style={{ backgroundColor: "#252525" }}>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-[14px] shrink-0" style={{ backgroundColor: p.color }}>{p.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[#ededed]">{p.name}</p>
                      <p className="text-[11px] text-[#888]">{p.desc}</p>
                    </div>
                    {isConnected ? (
                      <span className="flex items-center gap-1 text-[12px] text-[#3ecf8e] shrink-0"><Check size={14} /> Conectado</span>
                    ) : (
                      <button
                        onClick={() => { setPendingOAuth(p.provider); startOAuth.mutate({ provider: p.provider }); }}
                        disabled={startOAuth.isPending}
                        className="text-[12px] px-4 py-2 rounded-lg border border-[#444] text-[#ccc] hover:border-[#3ecf8e]/40 hover:text-[#3ecf8e] transition-colors disabled:opacity-50 shrink-0"
                      >
                        {isLoading ? <span className="flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Conectando...</span> : "Conectar"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between">
              <button onClick={goBack} className="inline-flex items-center gap-1.5 text-[13px] text-[#888] hover:text-[#ccc] transition-colors"><ArrowLeft size={14} /> Atras</button>
              <button onClick={goNext} className="inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-[13px] font-semibold text-black hover:opacity-90 transition-opacity" style={{ backgroundColor: "#3ecf8e" }}>
                {connectedProviders.length > 0 ? "Siguiente" : "Omitir"} <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ═══════ Step 3: Import Contacts ═══════ */}
        {currentStep?.id === "contacts" && (
          <div>
            <h2 className="text-[20px] font-bold text-[#ededed] mb-2">Importa tus contactos</h2>
            <p className="text-[13px] text-[#888] mb-6">Agrega tus contactos existentes o empieza desde cero.</p>
            <input ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileSelect} />

            {contactsSubStep === "choose" && (
              <>
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <button onClick={() => fileInputRef.current?.click()} className="rounded-lg border border-dashed border-[#444] p-8 text-center hover:border-[#3ecf8e]/40 transition-colors" style={{ backgroundColor: "#252525" }}>
                    <Upload size={28} className="text-[#888] mx-auto mb-3" />
                    <p className="text-[14px] font-medium text-[#ededed] mb-1">Subir CSV</p>
                    <p className="text-[12px] text-[#888]">Importar desde archivo</p>
                  </button>
                  <button onClick={() => goNext()} className="rounded-lg border border-dashed border-[#444] p-8 text-center hover:border-[#3ecf8e]/40 transition-colors" style={{ backgroundColor: "#252525" }}>
                    <Users size={28} className="text-[#888] mx-auto mb-3" />
                    <p className="text-[14px] font-medium text-[#ededed] mb-1">Empezar de cero</p>
                    <p className="text-[12px] text-[#888]">Agregar contactos despues</p>
                  </button>
                </div>
                {importError && (
                  <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 mb-4">
                    <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                    <p className="text-[12px] text-red-300">{importError}</p>
                  </div>
                )}
                {parseCSV.isPending && (
                  <div className="flex items-center justify-center gap-2 py-4">
                    <Loader2 size={16} className="animate-spin text-[#3ecf8e]" />
                    <span className="text-[13px] text-[#888]">Procesando archivo...</span>
                  </div>
                )}
                {!parseCSV.isPending && (
                  <div className="flex justify-between">
                    <button onClick={goBack} className="inline-flex items-center gap-1.5 text-[13px] text-[#888] hover:text-[#ccc] transition-colors"><ArrowLeft size={14} /> Atras</button>
                    <button onClick={goNext} className="text-[13px] text-[#888] hover:text-[#ccc] transition-colors">Omitir</button>
                  </div>
                )}
              </>
            )}

            {contactsSubStep === "mapping" && (
              <>
                <div className="rounded-lg border border-[#2e2e2e] p-4 mb-4" style={{ backgroundColor: "#252525" }}>
                  <div className="flex items-center gap-2 mb-4">
                    <FileSpreadsheet size={16} className="text-[#3ecf8e]" />
                    <span className="text-[13px] text-[#ededed] font-medium">{csvFileName}</span>
                    <span className="text-[11px] text-[#888]">({csvTotalRows} filas)</span>
                    <button onClick={() => { setContactsSubStep("choose"); setCsvFileName(""); setImportError(null); }} className="ml-auto text-[#666] hover:text-[#ccc] transition-colors"><X size={14} /></button>
                  </div>
                  <p className="text-[12px] text-[#888] mb-3">Asigna cada columna del CSV a un campo de contacto:</p>
                  <div className="space-y-2">
                    {csvColumns.map((col) => (
                      <div key={col} className="flex items-center gap-3">
                        <span className="text-[12px] text-[#ccc] w-32 truncate shrink-0" title={col}>{col}</span>
                        <ArrowRight size={12} className="text-[#666] shrink-0" />
                        <select value={fieldMapping[col] || "__skip"} onChange={(e) => setFieldMapping((prev) => ({ ...prev, [col]: e.target.value }))} className="flex-1 text-[12px] rounded-md border border-[#2e2e2e] bg-[#1c1c1c] text-[#ededed] px-2 py-1.5 outline-none focus:border-[#3ecf8e]/40">
                          {CONTACT_FIELDS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
                {csvPreview.length > 0 && (
                  <div className="rounded-lg border border-[#2e2e2e] overflow-hidden mb-4" style={{ backgroundColor: "#252525" }}>
                    <div className="px-3 py-2 border-b border-[#2e2e2e]"><p className="text-[11px] text-[#888]">Vista previa (primeras {csvPreview.length} filas)</p></div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[11px]">
                        <thead><tr className="border-b border-[#2e2e2e]">{csvColumns.map((col) => <th key={col} className="px-3 py-2 text-left text-[#888] font-medium">{col}</th>)}</tr></thead>
                        <tbody>{csvPreview.map((row, i) => <tr key={i} className="border-b border-[#2e2e2e] last:border-0">{csvColumns.map((col) => <td key={col} className="px-3 py-2 text-[#ccc] max-w-[120px] truncate">{row[col] || "-"}</td>)}</tr>)}</tbody>
                      </table>
                    </div>
                  </div>
                )}
                {importError && <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 mb-4"><AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" /><p className="text-[12px] text-red-300">{importError}</p></div>}
                <div className="flex justify-between">
                  <button onClick={() => { setContactsSubStep("choose"); setImportError(null); }} className="inline-flex items-center gap-1.5 text-[13px] text-[#888] hover:text-[#ccc] transition-colors"><ArrowLeft size={14} /> Cambiar archivo</button>
                  <button onClick={handleImport} disabled={bulkImport.isPending} className="inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-[13px] font-semibold text-black hover:opacity-90 transition-opacity disabled:opacity-50" style={{ backgroundColor: "#3ecf8e" }}>
                    {bulkImport.isPending ? <><Loader2 size={14} className="animate-spin" /> Importando...</> : <>Importar {csvTotalRows} contactos <ArrowRight size={14} /></>}
                  </button>
                </div>
              </>
            )}

            {contactsSubStep === "done" && (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-[#3ecf8e]/20 flex items-center justify-center mx-auto mb-4"><Check size={24} className="text-[#3ecf8e]" /></div>
                <p className="text-[16px] font-semibold text-[#ededed] mb-1">{importedCount} contacto{importedCount !== 1 ? "s" : ""} importado{importedCount !== 1 ? "s" : ""}</p>
                <p className="text-[12px] text-[#888] mb-6">Listos para gestionar en tu CRM</p>
                <button onClick={goNext} className="inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-[13px] font-semibold text-black hover:opacity-90 transition-opacity" style={{ backgroundColor: "#3ecf8e" }}>
                  Siguiente <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ═══════ Step 4: Plan Selection ═══════ */}
        {currentStep?.id === "plan" && (
          <div>
            <div className="text-center mb-6">
              <h2 className="text-[20px] font-bold text-[#ededed] mb-1">Elige tu plan</h2>
              <p className="text-[13px] text-[#888]">Todos los planes incluyen 7 dias de prueba gratuita</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {PLANS.map((plan) => {
                const Icon = plan.icon;
                const isSelected = selectedPlan === plan.id;
                return (
                  <button
                    key={plan.id}
                    onClick={() => handlePlanSelect(plan.id)}
                    disabled={checkout.isPending}
                    className={`relative rounded-xl border p-4 text-left transition-all hover:border-[#444] ${
                      isSelected ? "border-[#3ecf8e] bg-[#3ecf8e]/5" : "border-[#2e2e2e]"
                    }`}
                    style={{ backgroundColor: isSelected ? undefined : "#222" }}
                  >
                    {plan.popular && (
                      <span className="absolute -top-2.5 right-3 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#3ecf8e] text-black">
                        Popular
                      </span>
                    )}
                    <div className="flex items-center gap-2 mb-2">
                      <Icon size={16} style={{ color: plan.color }} />
                      <span className="text-[14px] font-semibold text-[#ededed]">{plan.name}</span>
                    </div>
                    <p className="text-[18px] font-bold mb-1" style={{ color: plan.color }}>{plan.price}</p>
                    <p className="text-[11px] text-[#888] mb-3">{plan.desc}</p>
                    <div className="space-y-1">
                      {plan.features.map((f) => (
                        <div key={f} className="flex items-center gap-1.5 text-[11px] text-[#999]">
                          <Check size={10} className="text-[#3ecf8e] shrink-0" />
                          {f}
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>

            {checkout.isPending && (
              <div className="flex items-center justify-center gap-2 py-4">
                <Loader2 size={16} className="animate-spin text-[#3ecf8e]" />
                <span className="text-[13px] text-[#888]">Redirigiendo a pago...</span>
              </div>
            )}

            <div className="flex justify-between">
              <button onClick={goBack} className="inline-flex items-center gap-1.5 text-[13px] text-[#888] hover:text-[#ccc] transition-colors"><ArrowLeft size={14} /> Atras</button>
              <button onClick={goNext} className="text-[13px] text-[#888] hover:text-[#ccc] transition-colors">Continuar con plan gratuito</button>
            </div>
          </div>
        )}

        {/* ═══════ Step 5: Ready ═══════ */}
        {currentStep?.id === "ready" && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-[#3ecf8e]/20 flex items-center justify-center mx-auto mb-6">
              <Check size={32} className="text-[#3ecf8e]" />
            </div>
            <h2 className="text-[24px] font-bold text-[#ededed] mb-2">Todo listo!</h2>
            <p className="text-[15px] text-[#888] mb-6 max-w-md mx-auto">
              {companyName || "Tu empresa"} esta configurada. Tienes 7 dias de prueba gratuita.
            </p>

            <div className="rounded-lg border border-[#2e2e2e] p-4 mb-6 text-left max-w-sm mx-auto" style={{ backgroundColor: "#252525" }}>
              <p className="text-[12px] text-[#888] mb-3 font-medium uppercase tracking-wider">Resumen</p>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <Building2 size={14} className="text-[#3ecf8e]" />
                  <span className="text-[13px] text-[#ededed]">{companyName || "Mi empresa"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard size={14} className="text-[#3ecf8e]" />
                  <span className="text-[13px] text-[#ededed]">Plan {PLANS.find((p) => p.id === selectedPlan)?.name || "Inicio"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Plug size={14} className={connectedProviders.length > 0 ? "text-[#3ecf8e]" : "text-[#666]"} />
                  <span className="text-[13px] text-[#ededed]">
                    {connectedProviders.length > 0 ? `${connectedProviders.length} plataforma${connectedProviders.length > 1 ? "s" : ""} conectada${connectedProviders.length > 1 ? "s" : ""}` : "Sin plataformas conectadas"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users size={14} className={importedCount > 0 ? "text-[#3ecf8e]" : "text-[#666]"} />
                  <span className="text-[13px] text-[#ededed]">
                    {importedCount > 0 ? `${importedCount} contacto${importedCount !== 1 ? "s" : ""} importado${importedCount !== 1 ? "s" : ""}` : "Sin contactos importados"}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => router.push("/dashboard")}
              className="inline-flex items-center gap-2 rounded-lg px-8 py-3 text-[14px] font-semibold text-black hover:opacity-90 transition-opacity"
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
