"use client";

import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { InlineEdit, InlineSelect, InlineBoolean } from "./inline-edit";
import { ActivityTimeline } from "./activity-timeline";
import {
  X,
  Trash2,
  AlertTriangle,
  Mail,
  Phone,
  Building2,
  MapPin,
  User,
  DollarSign,
  Calendar,
  Tag,
  Handshake,
  ChevronRight,
  ExternalLink,
  Hash,
  Link2,
  ToggleLeft,
  CalendarDays,
  Type,
  List,
} from "lucide-react";

/* ================================================================== */
/*  Shared Primitives                                                  */
/* ================================================================== */

const LABEL_COLORS: Record<string, string> = { HOT: "#ef4444", WARM: "#f59e0b", COLD: "#6366f1" };

function Badge({ text, color = "#3ecf8e" }: { text: string; color?: string }) {
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: color + "20", color }}>
      {text}
    </span>
  );
}

function FieldRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2 min-h-[36px]">
      <div className="w-[18px] flex items-center justify-center text-[#555] flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="w-24 flex-shrink-0">
        <span className="text-[11px] text-[#888] uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function DangerButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 text-[11px] text-red-400 px-2.5 py-1.5 rounded border border-red-500/30 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  );
}

/* ================================================================== */
/*  Custom Fields Renderer                                             */
/* ================================================================== */

const FIELD_TYPE_ICONS: Record<string, React.ReactNode> = {
  TEXT: <Type size={13} />,
  NUMBER: <Hash size={13} />,
  DATE: <CalendarDays size={13} />,
  DROPDOWN: <List size={13} />,
  BOOLEAN: <ToggleLeft size={13} />,
  EMAIL: <Mail size={13} />,
  PHONE: <Phone size={13} />,
  URL: <Link2 size={13} />,
};

function CustomFieldsSection({
  entity,
  customData,
  onUpdateCustomData,
}: {
  entity: "Contact" | "Deal";
  customData: Record<string, unknown> | null;
  onUpdateCustomData: (data: Record<string, unknown>) => void;
}) {
  const { data: fields } = trpc.fieldDefinitions.list.useQuery({ entity });

  if (!fields || fields.length === 0) return null;

  const data = (customData ?? {}) as Record<string, unknown>;

  function handleFieldChange(key: string, value: unknown) {
    const updated = { ...data, [key]: value };
    onUpdateCustomData(updated);
  }

  return (
    <div className="border-t border-[#2e2e2e] pt-3 mt-1">
      <p className="text-[11px] text-[#888] uppercase tracking-wider mb-2">Campos personalizados</p>
      {fields.map((field) => {
        const val = data[field.key];
        const icon = FIELD_TYPE_ICONS[field.type] ?? <Type size={13} />;

        return (
          <FieldRow key={field.id} icon={icon} label={field.name}>
            {field.type === "BOOLEAN" ? (
              <InlineBoolean
                value={val === true}
                onSave={(v) => handleFieldChange(field.key, v)}
              />
            ) : field.type === "DROPDOWN" ? (
              <InlineSelect
                value={String(val ?? "")}
                options={field.options.map((o) => ({ label: o, value: o }))}
                onSave={(v) => handleFieldChange(field.key, v)}
                placeholder={`Seleccionar ${field.name.toLowerCase()}`}
              />
            ) : (
              <InlineEdit
                value={String(val ?? "")}
                onSave={(v) => handleFieldChange(field.key, field.type === "NUMBER" ? (v ? Number(v) : "") : v)}
                type={
                  field.type === "NUMBER" ? "number" :
                  field.type === "DATE" ? "date" :
                  field.type === "EMAIL" ? "email" :
                  field.type === "PHONE" ? "phone" :
                  field.type === "URL" ? "url" : "text"
                }
                placeholder={`Agregar ${field.name.toLowerCase()}`}
              />
            )}
          </FieldRow>
        );
      })}
    </div>
  );
}

/* ================================================================== */
/*  Contact Detail Panel                                               */
/* ================================================================== */

export function ContactDetailPanel({
  contactId,
  onClose,
  onOpenDeal,
}: {
  contactId: string;
  onClose: () => void;
  onOpenDeal?: (dealId: string) => void;
}) {
  const { data: contact, isLoading } = trpc.contacts.get.useQuery({ contactId });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "activity">("details");

  const utils = trpc.useUtils();

  const updateMutation = trpc.contacts.update.useMutation({
    onSuccess: () => {
      utils.contacts.get.invalidate({ contactId });
      utils.contacts.list.invalidate();
    },
  });

  const deleteMutation = trpc.contacts.delete.useMutation({
    onSuccess: () => {
      utils.contacts.list.invalidate();
      onClose();
    },
  });

  function updateField(field: string, value: string | undefined) {
    updateMutation.mutate({ contactId, [field]: value || undefined });
  }

  function updateCustomData(data: Record<string, unknown>) {
    updateMutation.mutate({ contactId, customData: data });
  }

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex justify-end">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="relative w-full max-w-xl border-l border-[#2e2e2e] overflow-y-auto" style={{ backgroundColor: "#1a1a1a" }}>
          <div className="p-5 space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-8 rounded bg-[#2a2a2a] animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="fixed inset-0 z-50 flex justify-end">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="relative w-full max-w-xl border-l border-[#2e2e2e] p-8 text-center" style={{ backgroundColor: "#1a1a1a" }}>
          <p className="text-[13px] text-[#888]">Contacto no encontrado.</p>
        </div>
      </div>
    );
  }

  const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(" ");
  const initials = (contact.firstName[0] ?? "") + (contact.lastName?.[0] ?? "");

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-xl border-l border-[#2e2e2e] overflow-y-auto flex flex-col" style={{ backgroundColor: "#1a1a1a" }}>

        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-[#2e2e2e] px-5 py-4" style={{ backgroundColor: "#1a1a1a" }}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-bold text-[#ededed]"
                style={{ backgroundColor: "#2a2a2a" }}
              >
                {initials.toUpperCase()}
              </div>
              <div>
                <h2 className="text-[16px] font-semibold text-[#ededed]">{fullName}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge text={contact.scoreLabel} color={LABEL_COLORS[contact.scoreLabel] ?? "#888"} />
                  <span className="text-[11px] text-[#888]">Score: {contact.score}</span>
                  {contact.company && (
                    <span className="text-[11px] text-[#888] flex items-center gap-1">
                      <Building2 size={10} /> {contact.company}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="text-[#666] hover:text-[#ccc] transition-colors p-1">
              <X size={18} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mt-4 -mb-[17px]">
            {(["details", "activity"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="text-[12px] pb-2.5 transition-colors relative"
                style={{
                  color: activeTab === tab ? "#ededed" : "#888",
                  fontWeight: activeTab === tab ? 500 : 400,
                }}
              >
                {tab === "details" ? "Detalles" : "Actividad"}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full" style={{ backgroundColor: "#3ecf8e" }} />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-5">
          {activeTab === "details" ? (
            <div>
              {/* Core fields — inline edit */}
              <div className="space-y-0">
                <FieldRow icon={<User size={13} />} label="Nombre">
                  <InlineEdit
                    value={contact.firstName}
                    onSave={(v) => updateField("firstName", v || contact.firstName)}
                    placeholder="Nombre"
                  />
                </FieldRow>
                <FieldRow icon={<User size={13} />} label="Apellido">
                  <InlineEdit
                    value={contact.lastName ?? ""}
                    onSave={(v) => updateField("lastName", v)}
                    placeholder="Agregar apellido"
                  />
                </FieldRow>
                <FieldRow icon={<Mail size={13} />} label="Email">
                  <InlineEdit
                    value={contact.email ?? ""}
                    onSave={(v) => updateField("email", v)}
                    type="email"
                    placeholder="Agregar email"
                  />
                </FieldRow>
                <FieldRow icon={<Phone size={13} />} label="Telefono">
                  <InlineEdit
                    value={contact.phone ?? ""}
                    onSave={(v) => updateField("phone", v)}
                    type="phone"
                    placeholder="Agregar telefono"
                  />
                </FieldRow>
                <FieldRow icon={<Building2 size={13} />} label="Empresa">
                  <InlineEdit
                    value={contact.company ?? ""}
                    onSave={(v) => updateField("company", v)}
                    placeholder="Agregar empresa"
                  />
                </FieldRow>
                <FieldRow icon={<MapPin size={13} />} label="Fuente">
                  <InlineEdit
                    value={contact.source ?? ""}
                    onSave={(v) => updateField("source", v)}
                    placeholder="Agregar fuente"
                  />
                </FieldRow>
                <FieldRow icon={<Tag size={13} />} label="Tags">
                  <div className="flex gap-1 flex-wrap">
                    {contact.tags.length > 0 ? (
                      contact.tags.map((tag) => (
                        <Badge key={tag} text={tag} color="#6366f1" />
                      ))
                    ) : (
                      <span className="text-[12px] text-[#555]">Sin tags</span>
                    )}
                  </div>
                </FieldRow>
                <FieldRow icon={<Calendar size={13} />} label="Creado">
                  <span className="text-[13px] text-[#888]">
                    {new Date(contact.createdAt).toLocaleDateString("es", {
                      year: "numeric", month: "long", day: "numeric",
                    })}
                  </span>
                </FieldRow>
              </div>

              {/* Custom fields */}
              <CustomFieldsSection
                entity="Contact"
                customData={contact.customData as Record<string, unknown> | null}
                onUpdateCustomData={updateCustomData}
              />

              {/* Deals */}
              {contact.deals && contact.deals.length > 0 && (
                <div className="border-t border-[#2e2e2e] pt-3 mt-3">
                  <p className="text-[11px] text-[#888] uppercase tracking-wider mb-2">
                    Deals ({contact.deals.length})
                  </p>
                  <div className="space-y-2">
                    {contact.deals.map((deal) => (
                      <button
                        key={deal.id}
                        onClick={() => onOpenDeal?.(deal.id)}
                        className="w-full rounded-lg border border-[#2e2e2e] p-3 flex items-center justify-between hover:border-[#3ecf8e]/30 transition-colors text-left"
                        style={{ backgroundColor: "#1e1e1e" }}
                      >
                        <div className="flex items-center gap-2">
                          <Handshake size={13} className="text-[#3ecf8e]" />
                          <div>
                            <p className="text-[13px] text-[#ededed]">{deal.title}</p>
                            <p className="text-[11px] text-[#888]">{deal.stageId}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-medium text-[#3ecf8e]">
                            ${deal.value ? Number(deal.value).toLocaleString() : "0"}
                          </span>
                          <ChevronRight size={14} className="text-[#555]" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages preview */}
              {contact.messages && contact.messages.length > 0 && (
                <div className="border-t border-[#2e2e2e] pt-3 mt-3">
                  <p className="text-[11px] text-[#888] uppercase tracking-wider mb-2">
                    Mensajes recientes ({contact.messages.length})
                  </p>
                  <div className="space-y-1.5">
                    {contact.messages.slice(0, 5).map((msg) => (
                      <div key={msg.id} className="flex items-center gap-2 py-1.5 px-3 rounded" style={{ backgroundColor: "#1e1e1e" }}>
                        <Badge
                          text={msg.channel}
                          color={msg.direction === "INBOUND" ? "#3b82f6" : "#3ecf8e"}
                        />
                        <span className="text-[12px] text-[#888] truncate flex-1">
                          {msg.content.slice(0, 80)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Danger zone */}
              <div className="border-t border-[#2e2e2e] pt-3 mt-6">
                {confirmDelete ? (
                  <div className="rounded-lg border border-red-500/30 p-3" style={{ backgroundColor: "rgba(239,68,68,0.06)" }}>
                    <p className="text-[12px] text-red-400 mb-2 flex items-center gap-1.5">
                      <AlertTriangle size={12} /> Se eliminara permanentemente este contacto y sus datos.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => deleteMutation.mutate({ contactId })}
                        disabled={deleteMutation.isPending}
                        className="text-[11px] text-white px-3 py-1.5 rounded font-medium bg-red-600 hover:bg-red-700 disabled:opacity-50"
                      >
                        {deleteMutation.isPending ? "Eliminando..." : "Si, eliminar"}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        className="text-[11px] text-[#888] px-3 py-1.5 rounded border border-[#333] hover:border-[#555]"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <DangerButton onClick={() => setConfirmDelete(true)}>
                    <Trash2 size={12} /> Eliminar contacto
                  </DangerButton>
                )}
              </div>
            </div>
          ) : (
            <ActivityTimeline
              contactId={contactId}
              activities={contact.activities ?? []}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Deal Detail Panel                                                  */
/* ================================================================== */

export function DealDetailPanel({
  dealId,
  onClose,
  onOpenContact,
}: {
  dealId: string;
  onClose: () => void;
  onOpenContact?: (contactId: string) => void;
}) {
  const { data: deal, isLoading } = trpc.deals.get.useQuery({ dealId });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const utils = trpc.useUtils();

  const updateMutation = trpc.deals.update.useMutation({
    onSuccess: () => {
      utils.deals.get.invalidate({ dealId });
      utils.deals.list.invalidate();
    },
  });

  const closeMutation = trpc.deals.close.useMutation({
    onSuccess: () => {
      utils.deals.get.invalidate({ dealId });
      utils.deals.list.invalidate();
    },
  });

  const deleteMutation = trpc.deals.delete.useMutation({
    onSuccess: () => {
      utils.deals.list.invalidate();
      onClose();
    },
  });

  function updateField(field: string, value: unknown) {
    updateMutation.mutate({ dealId, [field]: value } as Parameters<typeof updateMutation.mutate>[0]);
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex justify-end">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="relative w-full max-w-xl border-l border-[#2e2e2e] overflow-y-auto" style={{ backgroundColor: "#1a1a1a" }}>
          <div className="p-5 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-8 rounded bg-[#2a2a2a] animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="fixed inset-0 z-50 flex justify-end">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="relative w-full max-w-xl border-l border-[#2e2e2e] p-8 text-center" style={{ backgroundColor: "#1a1a1a" }}>
          <p className="text-[13px] text-[#888]">Deal no encontrado.</p>
        </div>
      </div>
    );
  }

  const stages = (deal.pipeline?.stages ?? []) as Array<{ id: string; name: string; color?: string }>;
  const currentStage = stages.find((s) => s.id === deal.stageId);
  const isClosed = !!deal.closedAt;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-xl border-l border-[#2e2e2e] overflow-y-auto flex flex-col" style={{ backgroundColor: "#1a1a1a" }}>

        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-[#2e2e2e] px-5 py-4" style={{ backgroundColor: "#1a1a1a" }}>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-[16px] font-semibold text-[#ededed]">{deal.title}</h2>
              <div className="flex items-center gap-2 mt-1">
                {currentStage && (
                  <Badge text={currentStage.name} color={currentStage.color ?? "#3ecf8e"} />
                )}
                {deal.value && (
                  <span className="text-[13px] font-medium text-[#3ecf8e]">
                    ${Number(deal.value).toLocaleString()} {deal.currency}
                  </span>
                )}
                {isClosed && <Badge text="Cerrado" color="#888" />}
              </div>
            </div>
            <button onClick={onClose} className="text-[#666] hover:text-[#ccc] transition-colors p-1">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-5">
          {/* Stage progress bar */}
          {stages.length > 0 && (
            <div className="mb-5">
              <div className="flex gap-1">
                {stages.filter(s => s.id !== "won" && s.id !== "lost").map((stage, idx) => {
                  const currentIdx = stages.findIndex((s) => s.id === deal.stageId);
                  const isActive = idx <= currentIdx;
                  return (
                    <button
                      key={stage.id}
                      onClick={() => !isClosed && updateField("stageId", stage.id)}
                      className="flex-1 h-2 rounded-full transition-colors"
                      style={{
                        backgroundColor: isActive ? (stage.color ?? "#3ecf8e") : "#2a2a2a",
                      }}
                      title={stage.name}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between mt-1.5">
                {stages.filter(s => s.id !== "won" && s.id !== "lost").map((stage) => (
                  <span
                    key={stage.id}
                    className="text-[9px] text-[#888] truncate"
                    style={{ maxWidth: `${100 / stages.filter(s => s.id !== "won" && s.id !== "lost").length}%` }}
                  >
                    {stage.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Core fields */}
          <div className="space-y-0">
            <FieldRow icon={<Handshake size={13} />} label="Titulo">
              <InlineEdit
                value={deal.title}
                onSave={(v) => updateField("title", v || deal.title)}
                placeholder="Titulo del deal"
                disabled={isClosed}
              />
            </FieldRow>
            <FieldRow icon={<DollarSign size={13} />} label="Valor">
              <InlineEdit
                value={deal.value ? String(Number(deal.value)) : ""}
                onSave={(v) => updateField("value", v ? Number(v) : 0)}
                type="number"
                placeholder="Agregar valor"
                disabled={isClosed}
              />
            </FieldRow>
            <FieldRow icon={<Hash size={13} />} label="Probabilidad">
              <InlineEdit
                value={deal.probability != null ? String(deal.probability) : ""}
                onSave={(v) => updateField("probability", v ? Number(v) : 0)}
                type="number"
                placeholder="0-100%"
                disabled={isClosed}
              />
            </FieldRow>
            <FieldRow icon={<List size={13} />} label="Etapa">
              <InlineSelect
                value={deal.stageId}
                options={stages.map((s) => ({ label: s.name, value: s.id }))}
                onSave={(v) => updateField("stageId", v)}
                disabled={isClosed}
              />
            </FieldRow>
            <FieldRow icon={<Calendar size={13} />} label="Creado">
              <span className="text-[13px] text-[#888]">
                {new Date(deal.createdAt).toLocaleDateString("es", {
                  year: "numeric", month: "long", day: "numeric",
                })}
              </span>
            </FieldRow>
            {deal.closedAt && (
              <FieldRow icon={<Calendar size={13} />} label="Cerrado">
                <span className="text-[13px] text-[#888]">
                  {new Date(deal.closedAt).toLocaleDateString("es", {
                    year: "numeric", month: "long", day: "numeric",
                  })}
                </span>
              </FieldRow>
            )}
          </div>

          {/* Contact link */}
          {deal.contact && (
            <div className="border-t border-[#2e2e2e] pt-3 mt-3">
              <p className="text-[11px] text-[#888] uppercase tracking-wider mb-2">Contacto</p>
              <button
                onClick={() => onOpenContact?.(deal.contact.id)}
                className="w-full rounded-lg border border-[#2e2e2e] p-3 flex items-center justify-between hover:border-[#3ecf8e]/30 transition-colors text-left"
                style={{ backgroundColor: "#1e1e1e" }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold text-[#ededed]"
                    style={{ backgroundColor: "#2a2a2a" }}
                  >
                    {(deal.contact.firstName[0] ?? "").toUpperCase()}
                  </div>
                  <div>
                    <p className="text-[13px] text-[#ededed]">
                      {deal.contact.firstName} {deal.contact.lastName ?? ""}
                    </p>
                    {deal.contact.email && (
                      <p className="text-[11px] text-[#888]">{deal.contact.email}</p>
                    )}
                  </div>
                </div>
                <ExternalLink size={13} className="text-[#555]" />
              </button>
            </div>
          )}

          {/* Quick actions */}
          {!isClosed && (
            <div className="border-t border-[#2e2e2e] pt-3 mt-3">
              <p className="text-[11px] text-[#888] uppercase tracking-wider mb-2">Acciones</p>
              <div className="flex gap-2">
                <button
                  onClick={() => closeMutation.mutate({ dealId, won: true })}
                  disabled={closeMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-1.5 text-[12px] text-black py-2 rounded font-medium disabled:opacity-50"
                  style={{ backgroundColor: "#3ecf8e" }}
                >
                  Marcar como Ganado
                </button>
                <button
                  onClick={() => closeMutation.mutate({ dealId, won: false })}
                  disabled={closeMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-1.5 text-[12px] text-[#ccc] py-2 rounded font-medium border border-[#333] hover:border-[#555] disabled:opacity-50"
                >
                  Marcar como Perdido
                </button>
              </div>
            </div>
          )}

          {/* Danger zone */}
          <div className="border-t border-[#2e2e2e] pt-3 mt-6">
            {confirmDelete ? (
              <div className="rounded-lg border border-red-500/30 p-3" style={{ backgroundColor: "rgba(239,68,68,0.06)" }}>
                <p className="text-[12px] text-red-400 mb-2 flex items-center gap-1.5">
                  <AlertTriangle size={12} /> Se eliminara permanentemente este deal.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => deleteMutation.mutate({ dealId })}
                    disabled={deleteMutation.isPending}
                    className="text-[11px] text-white px-3 py-1.5 rounded font-medium bg-red-600 hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleteMutation.isPending ? "Eliminando..." : "Si, eliminar"}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-[11px] text-[#888] px-3 py-1.5 rounded border border-[#333] hover:border-[#555]"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <DangerButton onClick={() => setConfirmDelete(true)}>
                <Trash2 size={12} /> Eliminar deal
              </DangerButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
