"use client";

import { useState, useRef, useCallback, useEffect } from "react";
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
} from "lucide-react";

const STEPS = [
  { id: "welcome", label: "Bienvenida" },
  { id: "platforms", label: "Plataformas" },
  { id: "contacts", label: "Contactos" },
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

type ContactsSubStep = "choose" | "upload" | "mapping" | "preview" | "done";

export function OnboardingWizard({ userName }: { userName: string }) {
  const [step, setStep] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const router = useRouter();

  // --- Platforms ---
  const integrationsQuery = trpc.integrations.list.useQuery(undefined, {
    refetchInterval: 5000, // Poll to detect OAuth completions
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
  const [csvContent, setCsvContent] = useState("");
  const [csvFileName, setCsvFileName] = useState("");
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [csvTotalRows, setCsvTotalRows] = useState(0);
  const [csvPreview, setCsvPreview] = useState<Record<string, string>[]>([]);
  const [csvAllRows, setCsvAllRows] = useState<Record<string, string>[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = trpc.contacts.parseCSV.useMutation({
    onSuccess: (data) => {
      setCsvColumns(data.columns);
      setCsvTotalRows(data.totalRows);
      setCsvPreview(data.preview);

      // Auto-map columns by common names
      const autoMapping: Record<string, string> = {};
      const nameMap: Record<string, string> = {
        name: "firstName",
        nombre: "firstName",
        first_name: "firstName",
        firstname: "firstName",
        "first name": "firstName",
        apellido: "lastName",
        last_name: "lastName",
        lastname: "lastName",
        "last name": "lastName",
        email: "email",
        correo: "email",
        "e-mail": "email",
        phone: "phone",
        telefono: "phone",
        tel: "phone",
        celular: "phone",
        company: "company",
        empresa: "company",
        source: "source",
        origen: "source",
        fuente: "source",
      };
      for (const col of data.columns) {
        const normalized = col.toLowerCase().trim();
        if (nameMap[normalized]) {
          autoMapping[col] = nameMap[normalized];
        }
      }
      setFieldMapping(autoMapping);
      setContactsSubStep("mapping");
    },
    onError: (err) => {
      setImportError(err.message);
    },
  });

  const bulkImport = trpc.contacts.bulkImport.useMutation({
    onSuccess: (data) => {
      setImportedCount(data.imported);
      setContactsSubStep("done");
    },
    onError: (err) => {
      setImportError(err.message);
    },
  });

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setCsvFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text);

      // Parse all rows for later import
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length >= 2) {
        const parseLine = (line: string): string[] => {
          const result: string[] = [];
          let current = "";
          let inQuotes = false;
          const delimiter = line.includes(";") && !line.includes(",") ? ";" : ",";
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
              } else {
                inQuotes = !inQuotes;
              }
            } else if (char === delimiter && !inQuotes) {
              result.push(current.trim());
              current = "";
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result;
        };

        const cols = parseLine(lines[0]!);
        const allRows = lines.slice(1).map((line) => {
          const values = parseLine(line);
          const row: Record<string, string> = {};
          cols.forEach((col, idx) => {
            row[col] = values[idx] || "";
          });
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

    // Map rows to contact objects using the field mapping
    const contacts: Array<{
      firstName: string;
      lastName?: string;
      email?: string;
      phone?: string;
      company?: string;
      source?: string;
      tags?: string[];
    }> = [];

    const rowsToImport = csvAllRows.length > 0 ? csvAllRows : csvPreview;

    for (const row of rowsToImport) {
      const mapped: Record<string, string> = {};
      for (const [csvCol, field] of Object.entries(fieldMapping)) {
        if (field !== "__skip" && row[csvCol]) {
          mapped[field] = row[csvCol];
        }
      }

      if (!mapped.firstName) continue;

      contacts.push({
        firstName: mapped.firstName,
        lastName: mapped.lastName,
        email: mapped.email,
        phone: mapped.phone,
        company: mapped.company,
        source: mapped.source || "csv_import",
        tags: ["csv-import", "onboarding"],
      });
    }

    if (contacts.length === 0) {
      setImportError("No se encontraron contactos validos. Asegurate de mapear al menos la columna 'Nombre'.");
      return;
    }

    bulkImport.mutate({ contacts });
  }, [csvAllRows, csvPreview, fieldMapping, bulkImport]);

  const goNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  // Reset contacts sub-step when navigating to contacts step
  useEffect(() => {
    if (STEPS[step]?.id === "contacts" && contactsSubStep === "done") {
      // Keep done state if returning to contacts step
    }
  }, [step, contactsSubStep]);

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
                  i < step
                    ? "bg-[#3ecf8e] text-black"
                    : i === step
                    ? "bg-[#3ecf8e]/20 text-[#3ecf8e] border border-[#3ecf8e]"
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
              onClick={goNext}
              className="inline-flex items-center gap-2 rounded-lg px-8 py-3 text-[14px] font-semibold text-black hover:opacity-90 transition-opacity"
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
                const isConnected = connectedProviders.includes(p.provider);
                const isLoading = pendingOAuth === p.provider && startOAuth.isPending;
                return (
                  <div
                    key={p.provider}
                    className={`rounded-lg border p-4 flex items-center gap-4 transition-colors ${
                      isConnected ? "border-[#3ecf8e]/40" : "border-[#2e2e2e] hover:border-[#444]"
                    }`}
                    style={{ backgroundColor: "#252525" }}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-[14px] shrink-0"
                      style={{ backgroundColor: p.color }}
                    >
                      {p.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[#ededed]">{p.name}</p>
                      <p className="text-[11px] text-[#888]">{p.desc}</p>
                    </div>
                    {isConnected ? (
                      <span className="flex items-center gap-1 text-[12px] text-[#3ecf8e] shrink-0">
                        <Check size={14} /> Conectado
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          setPendingOAuth(p.provider);
                          startOAuth.mutate({ provider: p.provider });
                        }}
                        disabled={startOAuth.isPending}
                        className="text-[12px] px-4 py-2 rounded-lg border border-[#444] text-[#ccc] hover:border-[#3ecf8e]/40 hover:text-[#3ecf8e] transition-colors disabled:opacity-50 shrink-0"
                      >
                        {isLoading ? (
                          <span className="flex items-center gap-1.5">
                            <Loader2 size={12} className="animate-spin" /> Conectando...
                          </span>
                        ) : (
                          "Conectar"
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between">
              <button
                onClick={goBack}
                className="inline-flex items-center gap-1.5 text-[13px] text-[#888] hover:text-[#ccc] transition-colors"
              >
                <ArrowLeft size={14} /> Atras
              </button>
              <button
                onClick={goNext}
                className="inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-[13px] font-semibold text-black hover:opacity-90 transition-opacity"
                style={{ backgroundColor: "#3ecf8e" }}
              >
                {connectedProviders.length > 0 ? "Siguiente" : "Omitir"} <ArrowRight size={14} />
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

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={handleFileSelect}
            />

            {/* Sub-step: Choose method */}
            {contactsSubStep === "choose" && (
              <>
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-lg border border-dashed border-[#444] p-8 text-center hover:border-[#3ecf8e]/40 transition-colors"
                    style={{ backgroundColor: "#252525" }}
                  >
                    <Upload size={28} className="text-[#888] mx-auto mb-3" />
                    <p className="text-[14px] font-medium text-[#ededed] mb-1">Subir CSV</p>
                    <p className="text-[12px] text-[#888]">Importar desde archivo</p>
                  </button>
                  <button
                    onClick={() => {
                      setImportedCount(0);
                      goNext();
                    }}
                    className="rounded-lg border border-dashed border-[#444] p-8 text-center hover:border-[#3ecf8e]/40 transition-colors"
                    style={{ backgroundColor: "#252525" }}
                  >
                    <Users size={28} className="text-[#888] mx-auto mb-3" />
                    <p className="text-[14px] font-medium text-[#ededed] mb-1">Empezar de cero</p>
                    <p className="text-[12px] text-[#888]">Agregar contactos manualmente</p>
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
              </>
            )}

            {/* Sub-step: Column mapping */}
            {contactsSubStep === "mapping" && (
              <>
                <div className="rounded-lg border border-[#2e2e2e] p-4 mb-4" style={{ backgroundColor: "#252525" }}>
                  <div className="flex items-center gap-2 mb-4">
                    <FileSpreadsheet size={16} className="text-[#3ecf8e]" />
                    <span className="text-[13px] text-[#ededed] font-medium">{csvFileName}</span>
                    <span className="text-[11px] text-[#888]">({csvTotalRows} filas)</span>
                    <button
                      onClick={() => {
                        setContactsSubStep("choose");
                        setCsvContent("");
                        setCsvFileName("");
                        setImportError(null);
                      }}
                      className="ml-auto text-[#666] hover:text-[#ccc] transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <p className="text-[12px] text-[#888] mb-3">
                    Asigna cada columna del CSV a un campo de contacto:
                  </p>

                  <div className="space-y-2">
                    {csvColumns.map((col) => (
                      <div key={col} className="flex items-center gap-3">
                        <span className="text-[12px] text-[#ccc] w-32 truncate shrink-0" title={col}>
                          {col}
                        </span>
                        <ArrowRight size={12} className="text-[#666] shrink-0" />
                        <select
                          value={fieldMapping[col] || "__skip"}
                          onChange={(e) =>
                            setFieldMapping((prev) => ({
                              ...prev,
                              [col]: e.target.value,
                            }))
                          }
                          className="flex-1 text-[12px] rounded-md border border-[#2e2e2e] bg-[#1c1c1c] text-[#ededed] px-2 py-1.5 outline-none focus:border-[#3ecf8e]/40"
                        >
                          {CONTACT_FIELDS.map((f) => (
                            <option key={f.value} value={f.value}>
                              {f.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Preview table */}
                {csvPreview.length > 0 && (
                  <div className="rounded-lg border border-[#2e2e2e] overflow-hidden mb-4" style={{ backgroundColor: "#252525" }}>
                    <div className="px-3 py-2 border-b border-[#2e2e2e]">
                      <p className="text-[11px] text-[#888]">Vista previa (primeras {csvPreview.length} filas)</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="border-b border-[#2e2e2e]">
                            {csvColumns.map((col) => (
                              <th key={col} className="px-3 py-2 text-left text-[#888] font-medium">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {csvPreview.map((row, i) => (
                            <tr key={i} className="border-b border-[#2e2e2e] last:border-0">
                              {csvColumns.map((col) => (
                                <td key={col} className="px-3 py-2 text-[#ccc] max-w-[120px] truncate">
                                  {row[col] || "-"}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {importError && (
                  <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 mb-4">
                    <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                    <p className="text-[12px] text-red-300">{importError}</p>
                  </div>
                )}

                <div className="flex justify-between">
                  <button
                    onClick={() => {
                      setContactsSubStep("choose");
                      setImportError(null);
                    }}
                    className="inline-flex items-center gap-1.5 text-[13px] text-[#888] hover:text-[#ccc] transition-colors"
                  >
                    <ArrowLeft size={14} /> Cambiar archivo
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={bulkImport.isPending}
                    className="inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-[13px] font-semibold text-black hover:opacity-90 transition-opacity disabled:opacity-50"
                    style={{ backgroundColor: "#3ecf8e" }}
                  >
                    {bulkImport.isPending ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Importando...
                      </>
                    ) : (
                      <>
                        Importar {csvTotalRows} contactos <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </div>
              </>
            )}

            {/* Sub-step: Import done */}
            {contactsSubStep === "done" && (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-[#3ecf8e]/20 flex items-center justify-center mx-auto mb-4">
                  <Check size={24} className="text-[#3ecf8e]" />
                </div>
                <p className="text-[16px] font-semibold text-[#ededed] mb-1">
                  {importedCount} contacto{importedCount !== 1 ? "s" : ""} importado{importedCount !== 1 ? "s" : ""}
                </p>
                {bulkImport.data?.skipped ? (
                  <p className="text-[12px] text-[#888] mb-6">
                    {bulkImport.data.skipped} duplicado{bulkImport.data.skipped !== 1 ? "s" : ""} omitido{bulkImport.data.skipped !== 1 ? "s" : ""}
                  </p>
                ) : (
                  <p className="text-[12px] text-[#888] mb-6">Listos para gestionar en tu CRM</p>
                )}
                <button
                  onClick={goNext}
                  className="inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-[13px] font-semibold text-black hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: "#3ecf8e" }}
                >
                  Siguiente <ArrowRight size={14} />
                </button>
              </div>
            )}

            {/* Navigation footer for choose sub-step only */}
            {contactsSubStep === "choose" && !parseCSV.isPending && (
              <div className="flex justify-between">
                <button
                  onClick={goBack}
                  className="inline-flex items-center gap-1.5 text-[13px] text-[#888] hover:text-[#ccc] transition-colors"
                >
                  <ArrowLeft size={14} /> Atras
                </button>
                <button
                  onClick={goNext}
                  className="text-[13px] text-[#888] hover:text-[#ccc] transition-colors"
                >
                  Omitir
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step: Ready */}
        {currentStep?.id === "ready" && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-[#3ecf8e]/20 flex items-center justify-center mx-auto mb-6">
              <Check size={32} className="text-[#3ecf8e]" />
            </div>
            <h2 className="text-[24px] font-bold text-[#ededed] mb-2">Todo listo!</h2>
            <p className="text-[15px] text-[#888] mb-6 max-w-md mx-auto">
              Tu cuenta de NodeLabz esta configurada. Tienes 7 dias de prueba gratuita.
            </p>

            {/* Summary */}
            <div className="rounded-lg border border-[#2e2e2e] p-4 mb-6 text-left max-w-sm mx-auto" style={{ backgroundColor: "#252525" }}>
              <p className="text-[12px] text-[#888] mb-3 font-medium uppercase tracking-wider">Resumen</p>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <Plug size={14} className={connectedProviders.length > 0 ? "text-[#3ecf8e]" : "text-[#666]"} />
                  <span className="text-[13px] text-[#ededed]">
                    {connectedProviders.length > 0
                      ? `${connectedProviders.length} plataforma${connectedProviders.length > 1 ? "s" : ""} conectada${connectedProviders.length > 1 ? "s" : ""}`
                      : "Sin plataformas conectadas"}
                  </span>
                </div>
                {connectedProviders.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 ml-6">
                    {connectedProviders.map((provider) => {
                      const p = PLATFORMS.find((pl) => pl.provider === provider);
                      return p ? (
                        <span
                          key={provider}
                          className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: p.color + "20", color: p.color }}
                        >
                          {p.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Users size={14} className={importedCount > 0 ? "text-[#3ecf8e]" : "text-[#666]"} />
                  <span className="text-[13px] text-[#ededed]">
                    {importedCount > 0
                      ? `${importedCount} contacto${importedCount !== 1 ? "s" : ""} importado${importedCount !== 1 ? "s" : ""}`
                      : "Sin contactos importados"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={goBack}
                className="inline-flex items-center gap-1.5 text-[13px] text-[#888] hover:text-[#ccc] transition-colors"
              >
                <ArrowLeft size={14} /> Atras
              </button>
              <button
                onClick={() => router.push("/dashboard")}
                className="inline-flex items-center gap-2 rounded-lg px-8 py-3 text-[14px] font-semibold text-black hover:opacity-90 transition-opacity"
                style={{ backgroundColor: "#3ecf8e" }}
              >
                Ir al Dashboard <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
