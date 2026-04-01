"use client";

import React, { useCallback, useMemo, useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  type NodeTypes,
  type NodeProps,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Users,
  Building2,
  Upload,
  GitBranch,
  Handshake,
  Activity,
  Tags,
  List,
  Sparkles,
  Search,
  Plus,
  ChevronRight,
  ArrowUpRight,
  X,
  Trash2,
  Edit3,
  Check,
  AlertTriangle,
  FileText,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";

/* ================================================================== */
/*  Shared UI Primitives                                               */
/* ================================================================== */

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

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl border border-[#2e2e2e] p-6 shadow-2xl" style={{ backgroundColor: "#1a1a1a" }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[16px] font-semibold text-[#ededed]">{title}</h2>
          <button onClick={onClose} className="text-[#666] hover:text-[#ccc] transition-colors"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function SlideOver({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md border-l border-[#2e2e2e] overflow-y-auto" style={{ backgroundColor: "#1a1a1a" }}>
        <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b border-[#2e2e2e]" style={{ backgroundColor: "#1a1a1a" }}>
          <h2 className="text-[16px] font-semibold text-[#ededed]">{title}</h2>
          <button onClick={onClose} className="text-[#666] hover:text-[#ccc] transition-colors"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="block text-[12px] text-[#888] mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-[36px] px-3 rounded-lg border border-[#333] bg-[#222] text-[13px] text-[#ededed] placeholder:text-[#555] outline-none focus:border-[#3ecf8e]/50 transition-colors"
    />
  );
}

function PrimaryButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 text-[12px] text-black px-4 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
      style={{ backgroundColor: "#3ecf8e" }}
    >
      {children}
    </button>
  );
}

function DangerButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 text-[12px] text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-opacity bg-red-600 hover:bg-red-700"
    >
      {children}
    </button>
  );
}

function SecondaryButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-[12px] text-[#ccc] px-4 py-2 rounded-lg font-medium border border-[#333] hover:border-[#555] transition-colors"
    >
      {children}
    </button>
  );
}

const LABEL_COLORS: Record<string, string> = { HOT: "#ef4444", WARM: "#f59e0b", COLD: "#6366f1" };

/* ================================================================== */
/*  Create Contact Modal                                               */
/* ================================================================== */

function CreateContactModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [source, setSource] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  const utils = trpc.useUtils();
  const createMutation = trpc.contacts.create.useMutation({
    onSuccess: () => {
      utils.contacts.list.invalidate();
      onClose();
      resetForm();
    },
  });

  function resetForm() {
    setFirstName(""); setLastName(""); setEmail(""); setPhone(""); setCompany(""); setSource(""); setTagsInput("");
  }

  function handleSubmit() {
    if (!firstName.trim()) return;
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    createMutation.mutate({
      firstName: firstName.trim(),
      lastName: lastName.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      company: company.trim() || undefined,
      source: source.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Agregar Contacto">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Nombre *">
          <Input value={firstName} onChange={setFirstName} placeholder="Juan" />
        </FormField>
        <FormField label="Apellido">
          <Input value={lastName} onChange={setLastName} placeholder="Perez" />
        </FormField>
      </div>
      <FormField label="Email">
        <Input value={email} onChange={setEmail} placeholder="juan@ejemplo.com" type="email" />
      </FormField>
      <FormField label="Telefono">
        <Input value={phone} onChange={setPhone} placeholder="+506 8888-8888" />
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Empresa">
          <Input value={company} onChange={setCompany} placeholder="TechCR" />
        </FormField>
        <FormField label="Fuente">
          <Input value={source} onChange={setSource} placeholder="Website, Referido..." />
        </FormField>
      </div>
      <FormField label="Tags (separados por coma)">
        <Input value={tagsInput} onChange={setTagsInput} placeholder="VIP, Newsletter" />
      </FormField>

      {createMutation.error && (
        <p className="text-[12px] text-red-400 mb-3">{createMutation.error.message}</p>
      )}

      <div className="flex justify-end gap-2 mt-2">
        <SecondaryButton onClick={onClose}>Cancelar</SecondaryButton>
        <PrimaryButton onClick={handleSubmit} disabled={!firstName.trim() || createMutation.isPending}>
          {createMutation.isPending ? "Guardando..." : "Crear contacto"}
        </PrimaryButton>
      </div>
    </Modal>
  );
}

/* ================================================================== */
/*  Contact Detail Slide-Over                                          */
/* ================================================================== */

function ContactDetailPanel({ contactId, onClose }: { contactId: string; onClose: () => void }) {
  const { data: contact, isLoading } = trpc.contacts.get.useQuery({ contactId });
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editCompany, setEditCompany] = useState("");

  const utils = trpc.useUtils();

  const updateMutation = trpc.contacts.update.useMutation({
    onSuccess: () => {
      utils.contacts.get.invalidate({ contactId });
      utils.contacts.list.invalidate();
      setEditing(false);
    },
  });

  const deleteMutation = trpc.contacts.delete.useMutation({
    onSuccess: () => {
      utils.contacts.list.invalidate();
      onClose();
    },
  });

  function startEditing() {
    if (!contact) return;
    setEditFirstName(contact.firstName);
    setEditLastName(contact.lastName ?? "");
    setEditEmail(contact.email ?? "");
    setEditPhone(contact.phone ?? "");
    setEditCompany(contact.company ?? "");
    setEditing(true);
  }

  function handleSave() {
    updateMutation.mutate({
      contactId,
      firstName: editFirstName.trim(),
      lastName: editLastName.trim() || undefined,
      email: editEmail.trim() || undefined,
      phone: editPhone.trim() || undefined,
      company: editCompany.trim() || undefined,
    });
  }

  if (isLoading) {
    return (
      <SlideOver open title="Cargando..." onClose={onClose}>
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 rounded bg-[#2a2a2a] animate-pulse" />
          ))}
        </div>
      </SlideOver>
    );
  }

  if (!contact) {
    return (
      <SlideOver open title="No encontrado" onClose={onClose}>
        <p className="text-[13px] text-[#888]">El contacto no fue encontrado.</p>
      </SlideOver>
    );
  }

  return (
    <SlideOver open title={`${contact.firstName} ${contact.lastName ?? ""}`} onClose={onClose}>
      {/* Actions */}
      <div className="flex gap-2 mb-5">
        {!editing ? (
          <>
            <SecondaryButton onClick={startEditing}><Edit3 size={13} /> Editar</SecondaryButton>
            <DangerButton onClick={() => setConfirmDelete(true)} disabled={deleteMutation.isPending}>
              <Trash2 size={13} /> Eliminar
            </DangerButton>
          </>
        ) : (
          <>
            <PrimaryButton onClick={handleSave} disabled={updateMutation.isPending}>
              <Check size={13} /> {updateMutation.isPending ? "Guardando..." : "Guardar"}
            </PrimaryButton>
            <SecondaryButton onClick={() => setEditing(false)}>Cancelar</SecondaryButton>
          </>
        )}
      </div>

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="rounded-lg border border-red-500/30 p-4 mb-5" style={{ backgroundColor: "rgba(239,68,68,0.08)" }}>
          <p className="text-[13px] text-red-400 mb-3 flex items-center gap-2">
            <AlertTriangle size={14} /> Estas seguro? Se eliminara permanentemente.
          </p>
          <div className="flex gap-2">
            <DangerButton onClick={() => deleteMutation.mutate({ contactId })} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Eliminando..." : "Si, eliminar"}
            </DangerButton>
            <SecondaryButton onClick={() => setConfirmDelete(false)}>Cancelar</SecondaryButton>
          </div>
        </div>
      )}

      {/* Contact Info */}
      <div className="space-y-4">
        {editing ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Nombre"><Input value={editFirstName} onChange={setEditFirstName} /></FormField>
              <FormField label="Apellido"><Input value={editLastName} onChange={setEditLastName} /></FormField>
            </div>
            <FormField label="Email"><Input value={editEmail} onChange={setEditEmail} type="email" /></FormField>
            <FormField label="Telefono"><Input value={editPhone} onChange={setEditPhone} /></FormField>
            <FormField label="Empresa"><Input value={editCompany} onChange={setEditCompany} /></FormField>
          </>
        ) : (
          <div className="rounded-lg border border-[#2e2e2e] p-4 space-y-3" style={{ backgroundColor: "#1e1e1e" }}>
            {contact.email && (
              <div className="flex items-center gap-2 text-[13px]">
                <Mail size={13} className="text-[#666]" />
                <span className="text-[#ccc]">{contact.email}</span>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center gap-2 text-[13px]">
                <Phone size={13} className="text-[#666]" />
                <span className="text-[#ccc]">{contact.phone}</span>
              </div>
            )}
            {contact.company && (
              <div className="flex items-center gap-2 text-[13px]">
                <Building2 size={13} className="text-[#666]" />
                <span className="text-[#ccc]">{contact.company}</span>
              </div>
            )}
            {contact.source && (
              <div className="flex items-center gap-2 text-[13px]">
                <MapPin size={13} className="text-[#666]" />
                <span className="text-[#888]">Fuente: {contact.source}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Badge text={contact.scoreLabel} color={LABEL_COLORS[contact.scoreLabel] ?? "#888"} />
              <span className="text-[11px] text-[#888]">Score: {contact.score}</span>
            </div>
            {contact.tags.length > 0 && (
              <div className="flex gap-1 flex-wrap pt-1">
                {contact.tags.map((tag) => (
                  <Badge key={tag} text={tag} color="#6366f1" />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Deals */}
        {contact.deals && contact.deals.length > 0 && (
          <div>
            <h3 className="text-[13px] font-medium text-[#ededed] mb-2">Deals ({contact.deals.length})</h3>
            <div className="space-y-2">
              {contact.deals.map((deal) => (
                <div key={deal.id} className="rounded-lg border border-[#2e2e2e] p-3 flex items-center justify-between" style={{ backgroundColor: "#1e1e1e" }}>
                  <div>
                    <p className="text-[13px] text-[#ededed]">{deal.title}</p>
                    <p className="text-[11px] text-[#888]">{deal.stageId}</p>
                  </div>
                  <span className="text-[13px] font-medium text-[#3ecf8e]">
                    ${deal.value ? Number(deal.value).toLocaleString() : "0"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Activities */}
        {contact.activities && contact.activities.length > 0 && (
          <div>
            <h3 className="text-[13px] font-medium text-[#ededed] mb-2">Actividades recientes</h3>
            <div className="space-y-1.5">
              {contact.activities.slice(0, 10).map((a) => (
                <div key={a.id} className="flex items-center gap-2 py-1.5 px-3 rounded" style={{ backgroundColor: "#1e1e1e" }}>
                  <Activity size={12} className="text-[#666] flex-shrink-0" />
                  <Badge text={a.type.replace(/_/g, " ")} color="#6366f1" />
                  {a.subject && <span className="text-[12px] text-[#888] truncate">{a.subject}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </SlideOver>
  );
}

/* ================================================================== */
/*  Todos los Contactos — Full CRUD                                    */
/* ================================================================== */

export function TodosContactosPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [scoreFilter, setScoreFilter] = useState<string | undefined>();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  const { data, isLoading } = trpc.contacts.list.useQuery({
    page,
    limit: 20,
    search: search || undefined,
    scoreLabel: scoreFilter as "HOT" | "WARM" | "COLD" | undefined,
  });

  const contacts = data?.contacts ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <>
      <SectionHeader
        title="Todos los Contactos"
        description={`${total} contactos en tu base de datos`}
        action={
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 text-[12px] text-black px-3 py-1.5 rounded font-medium"
            style={{ backgroundColor: "#3ecf8e" }}
          >
            <Plus size={14} />
            Agregar contacto
          </button>
        }
      />
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-2 flex-1 h-[36px] px-3 rounded-lg border border-[#333]" style={{ backgroundColor: "#222" }}>
          <Search size={14} className="text-[#666]" />
          <input
            placeholder="Buscar contactos..."
            className="flex-1 bg-transparent text-[13px] text-[#ededed] placeholder:text-[#555] outline-none"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        {(["HOT", "WARM", "COLD"] as const).map((label) => (
          <button
            key={label}
            onClick={() => { setScoreFilter(scoreFilter === label ? undefined : label); setPage(1); }}
            className="text-[12px] px-3 py-2 rounded border transition-colors"
            style={{
              borderColor: scoreFilter === label ? LABEL_COLORS[label] : "#333",
              color: scoreFilter === label ? LABEL_COLORS[label] : "#ccc",
              backgroundColor: scoreFilter === label ? LABEL_COLORS[label] + "15" : "transparent",
            }}
          >
            {label}
          </button>
        ))}
        <button
          onClick={() => { setScoreFilter(undefined); setPage(1); }}
          className="text-[12px] px-3 py-2 rounded border transition-colors"
          style={{
            borderColor: !scoreFilter ? "#3ecf8e" : "#333",
            color: !scoreFilter ? "#3ecf8e" : "#ccc",
          }}
        >
          All
        </button>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-[#2e2e2e] overflow-hidden">
          <div className="space-y-0">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-4 px-4 py-3 border-b border-[#2e2e2e] last:border-0" style={{ backgroundColor: "#1e1e1e" }}>
                <div className="h-4 w-28 rounded bg-[#2a2a2a] animate-pulse" />
                <div className="h-4 w-36 rounded bg-[#2a2a2a] animate-pulse" />
                <div className="h-4 w-20 rounded bg-[#2a2a2a] animate-pulse" />
                <div className="h-4 w-12 rounded bg-[#2a2a2a] animate-pulse" />
                <div className="h-4 w-14 rounded bg-[#2a2a2a] animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      ) : contacts.length === 0 ? (
        <div className="rounded-lg border border-[#2e2e2e] p-12 text-center" style={{ backgroundColor: "#1e1e1e" }}>
          <Users size={32} className="text-[#555] mx-auto mb-3" />
          <p className="text-[14px] text-[#ededed] font-medium mb-1">No tienes contactos</p>
          <p className="text-[12px] text-[#888] mb-4">Importa o crea tu primer contacto.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 text-[12px] text-black px-3 py-1.5 rounded font-medium"
            style={{ backgroundColor: "#3ecf8e" }}
          >
            <Plus size={14} /> Agregar contacto
          </button>
        </div>
      ) : (
        <div className="rounded-lg border border-[#2e2e2e] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: "#1e1e1e" }}>
                {["Nombre", "Email", "Telefono", "Empresa", "Score", "Tags"].map((h) => (
                  <th key={h} className="text-left text-[11px] uppercase tracking-wider text-[#888] font-medium px-4 py-3 border-b border-[#2e2e2e]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setSelectedContactId(c.id)}
                  className="border-b border-[#2e2e2e] last:border-0 hover:bg-[#1e1e1e] transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 text-[13px] text-[#ededed] font-medium">
                    {c.firstName} {c.lastName ?? ""}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-[#888]">{c.email ?? "—"}</td>
                  <td className="px-4 py-3 text-[13px] text-[#888]">{c.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-[13px] text-[#ccc]">{c.company ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-1.5 rounded-full" style={{ backgroundColor: "#2a2a2a" }}>
                        <div className="h-1.5 rounded-full" style={{ width: `${c.score}%`, backgroundColor: c.score >= 80 ? "#3ecf8e" : c.score >= 50 ? "#f59e0b" : "#ef4444" }} />
                      </div>
                      <Badge text={c.scoreLabel} color={LABEL_COLORS[c.scoreLabel] ?? "#888"} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {c.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} text={tag} color="#6366f1" />
                      ))}
                      {c.tags.length > 3 && <span className="text-[10px] text-[#888]">+{c.tags.length - 3}</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-[12px] text-[#888]">
            Pagina {page} de {totalPages} ({total} contactos)
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="text-[12px] px-3 py-1.5 rounded border border-[#333] text-[#ccc] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="text-[12px] px-3 py-1.5 rounded border border-[#333] text-[#ccc] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <CreateContactModal open={showCreate} onClose={() => setShowCreate(false)} />

      {/* Detail Panel */}
      {selectedContactId && (
        <ContactDetailPanel contactId={selectedContactId} onClose={() => setSelectedContactId(null)} />
      )}
    </>
  );
}

/* ================================================================== */
/*  Empresas — Aggregated from real contacts                           */
/* ================================================================== */

export function EmpresasPage() {
  const { data, isLoading } = trpc.contacts.list.useQuery({ page: 1, limit: 100 });

  const companies = useMemo(() => {
    if (!data?.contacts) return [];
    const map = new Map<string, { name: string; contacts: number; emails: string[] }>();
    for (const c of data.contacts) {
      const name = c.company?.trim();
      if (!name) continue;
      const existing = map.get(name);
      if (existing) {
        existing.contacts += 1;
        if (c.email) existing.emails.push(c.email);
      } else {
        map.set(name, { name, contacts: 1, emails: c.email ? [c.email] : [] });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.contacts - a.contacts);
  }, [data]);

  if (isLoading) {
    return (
      <>
        <SectionHeader title="Empresas" description="Empresas asociadas a tus contactos" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-[#2e2e2e] p-4 h-16 animate-pulse" style={{ backgroundColor: "#1e1e1e" }} />
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <SectionHeader title="Empresas" description={`${companies.length} empresas encontradas`} />
      {companies.length === 0 ? (
        <div className="rounded-lg border border-[#2e2e2e] p-12 text-center" style={{ backgroundColor: "#1e1e1e" }}>
          <Building2 size={32} className="text-[#555] mx-auto mb-3" />
          <p className="text-[14px] text-[#ededed] font-medium mb-1">Sin empresas</p>
          <p className="text-[12px] text-[#888]">Agrega el campo empresa a tus contactos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {companies.map((c) => (
            <div key={c.name} className="rounded-lg border border-[#2e2e2e] p-4 flex items-center justify-between hover:border-[#3ecf8e]/30 transition-colors cursor-pointer" style={{ backgroundColor: "#1e1e1e" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-[14px] font-bold text-[#ededed]" style={{ backgroundColor: "#2a2a2a" }}>
                  {c.name[0]}
                </div>
                <div>
                  <p className="text-[13px] font-medium text-[#ededed]">{c.name}</p>
                  <p className="text-[11px] text-[#888]">{c.contacts} contacto{c.contacts !== 1 ? "s" : ""}</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-[#555]" />
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ================================================================== */
/*  Importar Contactos — Wired to CSV import API                       */
/* ================================================================== */

export function ImportarContactosPage() {
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [step, setStep] = useState<"upload" | "mapping" | "importing" | "done">("upload");
  const [columns, setColumns] = useState<string[]>([]);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: Array<{ row: number; error: string }> } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();

  const parseMutation = trpc.contacts.parseCSV.useMutation({
    onSuccess: (result) => {
      setColumns(result.columns);
      setPreview(result.preview);
      setTotalRows(result.totalRows);

      // Auto-map common column names
      const autoMapping: Record<string, string> = {};
      const fieldMap: Record<string, string[]> = {
        firstName: ["firstname", "first_name", "nombre", "first name", "name"],
        lastName: ["lastname", "last_name", "apellido", "last name", "surname"],
        email: ["email", "correo", "e-mail", "mail"],
        phone: ["phone", "telefono", "tel", "mobile", "celular"],
        company: ["company", "empresa", "organization", "org", "compania"],
        source: ["source", "fuente", "origen"],
      };
      for (const col of result.columns) {
        const lower = col.toLowerCase().trim();
        for (const [field, aliases] of Object.entries(fieldMap)) {
          if (aliases.includes(lower)) {
            autoMapping[col] = field;
            break;
          }
        }
      }
      setFieldMapping(autoMapping);
      setStep("mapping");
    },
  });

  const importMutation = trpc.contacts.importMapped.useMutation({
    onSuccess: (result) => {
      setImportResult(result);
      setStep("done");
      utils.contacts.list.invalidate();
    },
  });

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvContent(text);
      parseMutation.mutate({ csvContent: text });
    };
    reader.readAsText(file);
  }

  function handleImport() {
    if (!csvContent) return;
    setStep("importing");

    // Re-parse to get all rows and import with mapping
    const lines = csvContent.split(/\n/).filter((l) => l.trim().length > 0);
    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      const delimiter = line.includes(";") && !line.includes(",") ? ";" : ",";
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
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
    const rows = lines.slice(1).map((line) => {
      const values = parseLine(line);
      const row: Record<string, string> = {};
      cols.forEach((col, idx) => { row[col] = values[idx] || ""; });
      return row;
    });

    importMutation.mutate({ rows, fieldMapping });
  }

  function reset() {
    setCsvContent(null); setFileName(""); setStep("upload"); setColumns([]);
    setPreview([]); setTotalRows(0); setFieldMapping({}); setImportResult(null);
  }

  const crmFields = ["firstName", "lastName", "email", "phone", "company", "source"];

  return (
    <>
      <SectionHeader title="Importar Contactos" description="Importa contactos desde archivo CSV" />

      {step === "upload" && (
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg border border-dashed border-[#333] p-8 text-center hover:border-[#3ecf8e]/40 transition-colors"
            style={{ backgroundColor: "#1e1e1e" }}
          >
            <Upload size={32} className="text-[#888] mx-auto mb-3" />
            <p className="text-[14px] text-[#ededed] font-medium mb-1">Subir archivo CSV</p>
            <p className="text-[12px] text-[#888]">Selecciona tu archivo .csv</p>
          </button>
          <div className="rounded-lg border border-dashed border-[#333] p-8 text-center opacity-50" style={{ backgroundColor: "#1e1e1e" }}>
            <ArrowUpRight size={32} className="text-[#888] mx-auto mb-3" />
            <p className="text-[14px] text-[#ededed] font-medium mb-1">Desde plataforma</p>
            <p className="text-[12px] text-[#888]">Proximamente</p>
          </div>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
        </div>
      )}

      {parseMutation.isPending && (
        <div className="rounded-lg border border-[#2e2e2e] p-8 text-center" style={{ backgroundColor: "#1e1e1e" }}>
          <p className="text-[14px] text-[#ededed] animate-pulse">Analizando archivo...</p>
        </div>
      )}

      {step === "mapping" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-[#2e2e2e] p-4" style={{ backgroundColor: "#1e1e1e" }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[13px] font-medium text-[#ededed]">{fileName}</p>
                <p className="text-[11px] text-[#888]">{totalRows} filas encontradas · {columns.length} columnas</p>
              </div>
              <SecondaryButton onClick={reset}>Cambiar archivo</SecondaryButton>
            </div>

            <h3 className="text-[12px] font-medium text-[#ededed] mb-2">Mapeo de columnas</h3>
            <div className="space-y-2">
              {columns.map((col) => (
                <div key={col} className="flex items-center gap-3">
                  <span className="text-[12px] text-[#ccc] w-36 truncate">{col}</span>
                  <ChevronRight size={12} className="text-[#555]" />
                  <select
                    value={fieldMapping[col] ?? ""}
                    onChange={(e) => setFieldMapping({ ...fieldMapping, [col]: e.target.value })}
                    className="flex-1 h-[32px] px-2 rounded border border-[#333] bg-[#222] text-[12px] text-[#ededed] outline-none"
                  >
                    <option value="">— Ignorar —</option>
                    {crmFields.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <div className="rounded-lg border border-[#2e2e2e] overflow-hidden" style={{ backgroundColor: "#1e1e1e" }}>
              <div className="px-4 py-2 border-b border-[#2e2e2e]">
                <p className="text-[11px] text-[#888]">Vista previa (primeras {preview.length} filas)</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      {columns.map((col) => (
                        <th key={col} className="text-left text-[10px] uppercase tracking-wider text-[#888] font-medium px-3 py-2 border-b border-[#2e2e2e]">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-b border-[#2e2e2e] last:border-0">
                        {columns.map((col) => (
                          <td key={col} className="px-3 py-2 text-[12px] text-[#ccc] truncate max-w-[150px]">{row[col] ?? ""}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <PrimaryButton
              onClick={handleImport}
              disabled={!Object.values(fieldMapping).includes("firstName")}
            >
              Importar {totalRows} contactos
            </PrimaryButton>
            <SecondaryButton onClick={reset}>Cancelar</SecondaryButton>
          </div>
          {!Object.values(fieldMapping).includes("firstName") && (
            <p className="text-[11px] text-[#f59e0b]">Mapea al menos una columna a &quot;firstName&quot; para continuar.</p>
          )}
        </div>
      )}

      {step === "importing" && (
        <div className="rounded-lg border border-[#2e2e2e] p-8 text-center" style={{ backgroundColor: "#1e1e1e" }}>
          <p className="text-[14px] text-[#ededed] animate-pulse">Importando contactos...</p>
        </div>
      )}

      {step === "done" && importResult && (
        <div className="space-y-4">
          <div className="rounded-lg border border-[#3ecf8e]/30 p-6 text-center" style={{ backgroundColor: "rgba(62,207,142,0.06)" }}>
            <Check size={32} className="text-[#3ecf8e] mx-auto mb-3" />
            <p className="text-[16px] font-medium text-[#ededed] mb-1">Importacion completada</p>
            <p className="text-[13px] text-[#888]">
              {importResult.imported} importados · {importResult.skipped} duplicados omitidos
              {importResult.errors.length > 0 && ` · ${importResult.errors.length} errores`}
            </p>
          </div>
          {importResult.errors.length > 0 && (
            <div className="rounded-lg border border-[#f59e0b]/30 p-4" style={{ backgroundColor: "rgba(245,158,11,0.06)" }}>
              <p className="text-[12px] font-medium text-[#f59e0b] mb-2">Errores:</p>
              {importResult.errors.slice(0, 10).map((err, i) => (
                <p key={i} className="text-[11px] text-[#888]">Fila {err.row}: {err.error}</p>
              ))}
            </div>
          )}
          <PrimaryButton onClick={reset}>Importar mas</PrimaryButton>
        </div>
      )}
    </>
  );
}

/* ================================================================== */
/*  Pipeline Builder — Types & Palette                                 */
/* ================================================================== */

interface PipelineStageData {
  [key: string]: unknown;
  label: string;
  dealCount: number;
  totalValue: number;
  color: string;
  barData: [number, number, number];
}

type StageNodeType = Node<PipelineStageData>;

const PC = {
  bg: "#171717",
  card: "#1c1c1c",
  cardHover: "#222222",
  border: "#2e2e2e",
  text: "#ededed",
  textMuted: "#888888",
  accent: "#3ecf8e",
  blue: "#3b82f6",
  cyan: "#22d3ee",
  yellow: "#eab308",
  orange: "#f97316",
  purple: "#a855f7",
  green: "#22c55e",
} as const;

const STAGE_COLOR_MAP: string[] = [PC.blue, PC.cyan, PC.yellow, PC.orange, PC.purple, PC.green, "#ec4899"];

function pipelineFmtFull(n: number) {
  return `$${n.toLocaleString()}`;
}

/* ================================================================== */
/*  Pipeline Builder — Mini Bar Chart (pure SVG)                       */
/* ================================================================== */

function PipelineMiniBarChart({
  data,
  color,
}: {
  data: [number, number, number];
  color: string;
}) {
  const max = Math.max(...data, 1);
  const labels = ["0-7d", "7-14d", "14+d"];
  const barW = 28;
  const gap = 8;
  const h = 36;
  const totalW = labels.length * barW + (labels.length - 1) * gap;

  return (
    <svg
      width={totalW}
      height={h + 16}
      viewBox={`0 0 ${totalW} ${h + 16}`}
      style={{ display: "block", margin: "0 auto" }}
    >
      {data.map((v, i) => {
        const barH = (v / max) * h;
        const x = i * (barW + gap);
        return (
          <g key={i}>
            <rect
              x={x}
              y={h - barH}
              width={barW}
              height={barH}
              rx={3}
              fill={color}
              opacity={0.7 + (i === 0 ? 0.3 : i === 1 ? 0.15 : 0)}
            />
            <text
              x={x + barW / 2}
              y={h + 12}
              textAnchor="middle"
              fontSize="8"
              fill={PC.textMuted}
            >
              {labels[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ================================================================== */
/*  Pipeline Builder — StageNode                                       */
/* ================================================================== */

function PipelineStageNode({ data }: NodeProps<StageNodeType>) {
  return (
    <div
      style={{
        width: 200,
        background: PC.card,
        border: `1px solid ${PC.border}`,
        borderRadius: 12,
        overflow: "hidden",
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
      }}
    >
      <div style={{ height: 4, background: data.color, borderRadius: "12px 12px 0 0" }} />
      <div style={{ padding: "14px 16px 16px" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: PC.text, marginBottom: 8, letterSpacing: "0.01em" }}>
          {data.label}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 28, fontWeight: 700, color: data.color }}>{data.dealCount}</span>
          <span style={{ fontSize: 12, color: PC.textMuted }}>deals</span>
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: PC.text, marginBottom: 14 }}>
          {pipelineFmtFull(data.totalValue)}
        </div>
        <PipelineMiniBarChart data={data.barData} color={data.color} />
      </div>
      <Handle type="target" position={Position.Left} style={{ width: 8, height: 8, background: PC.border, border: "none" }} />
      <Handle type="source" position={Position.Right} style={{ width: 8, height: 8, background: PC.border, border: "none" }} />
    </div>
  );
}

/* ================================================================== */
/*  Pipeline Builder — Deal Card (side panel)                          */
/* ================================================================== */

interface PipelineDeal {
  id: string;
  title: string;
  value: number;
  contactName: string;
  stageId: string;
}

function PipelineDealCard({ deal }: { deal: PipelineDeal }) {
  return (
    <div
      style={{
        background: PC.card,
        border: `1px solid ${PC.border}`,
        borderRadius: 10,
        padding: "12px 14px",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div
        style={{
          width: 34, height: 34, borderRadius: "50%", background: PC.purple,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0,
        }}
      >
        {deal.contactName.slice(0, 2).toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: PC.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {deal.title}
        </div>
        <div style={{ fontSize: 12, color: PC.textMuted, marginTop: 2 }}>
          {deal.contactName} &middot; {pipelineFmtFull(deal.value)}
        </div>
      </div>
    </div>
  );
}

const pipelineNodeTypes: NodeTypes = { stage: PipelineStageNode };

/* ================================================================== */
/*  Pipeline Builder — Main Component (wired to real data)             */
/* ================================================================== */

export function PipelinePage() {
  const { data: pipelines } = trpc.pipeline.list.useQuery();
  const defaultPipeline = pipelines?.[0];
  const pipelineId = defaultPipeline?.id;

  const { data: pipelineDetail } = trpc.pipeline.get.useQuery(
    { pipelineId: pipelineId! },
    { enabled: !!pipelineId }
  );

  const { data: deals } = trpc.deals.list.useQuery(
    { pipelineId: pipelineId },
    { enabled: !!pipelineId }
  );

  const { data: stats } = trpc.deals.getStats.useQuery();

  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);

  const stages = useMemo(() => {
    const rawStages = (defaultPipeline?.stages ?? []) as Array<{ id: string; name: string; order: number; color?: string }>;
    const stageStats = pipelineDetail?.stageStats ?? [];
    const statsMap = new Map(stageStats.map((s) => [s.stageId, s]));

    return rawStages
      .sort((a, b) => a.order - b.order)
      .map((s, i) => {
        const stat = statsMap.get(s.id);
        return {
          label: s.name,
          stageId: s.id,
          dealCount: stat?.count ?? 0,
          totalValue: stat?.totalValue ?? 0,
          color: s.color ?? STAGE_COLOR_MAP[i % STAGE_COLOR_MAP.length] ?? PC.blue,
          barData: [Math.max(stat?.count ?? 0, 0), 0, 0] as [number, number, number],
        };
      });
  }, [defaultPipeline, pipelineDetail]);

  const nodes: StageNodeType[] = useMemo(() => {
    return stages.map((s, i) => ({
      id: `stage-${s.stageId}`,
      type: "stage",
      position: { x: 40 + i * 280, y: 120 },
      data: s,
      draggable: true,
    }));
  }, [stages]);

  const edges: Edge[] = useMemo(() => {
    return stages.slice(0, -1).map((_, i) => ({
      id: `e-${i}`,
      source: `stage-${stages[i]!.stageId}`,
      target: `stage-${stages[i + 1]!.stageId}`,
      type: "default",
      animated: true,
      style: { stroke: PC.border, strokeWidth: 2 },
      markerEnd: { type: "arrowclosed" as const, color: PC.border, width: 16, height: 16 },
    }));
  }, [stages]);

  const [flowNodes, , onNodesChange] = useNodesState(nodes);
  const [flowEdges, , onEdgesChange] = useEdgesState(edges);

  // Update nodes when data changes
  const displayNodes = nodes.length > 0 ? nodes : flowNodes;
  const displayEdges = edges.length > 0 ? edges : flowEdges;

  const sidebarDeals = useMemo((): PipelineDeal[] => {
    if (!deals) return [];
    const toDeal = (d: (typeof deals)[number]): PipelineDeal => ({
      id: d.id,
      title: d.title,
      value: d.value ? Number(d.value) : 0,
      contactName: d.contact ? `${d.contact.firstName} ${d.contact.lastName ?? ""}`.trim() : "—",
      stageId: d.stageId,
    });
    const targetStage = selectedStageId ?? stages[stages.length - 2]?.stageId;
    if (!targetStage) return deals.slice(0, 5).map(toDeal);
    return deals.filter((d) => d.stageId === targetStage).map(toDeal);
  }, [deals, selectedStageId, stages]);

  const sidebarStage = selectedStageId
    ? stages.find((s) => s.stageId === selectedStageId)
    : stages[stages.length - 2];

  const liveSummaryStats = [
    { label: "Total Deals", value: stats ? String(stats.totalDeals) : "—" },
    { label: "Pipeline Value", value: stats ? `$${stats.totalValue.toLocaleString()}` : "—" },
    { label: "Win Rate", value: stats ? `${(stats.winRate * 100).toFixed(1)}%` : "—" },
    { label: "Avg Deal Size", value: stats ? `$${Math.round(stats.avgDealSize).toLocaleString()}` : "—" },
  ];

  return (
    <>
      {/* ====== HEADER BAR (same pattern as Email Builder) ====== */}
      <div className="flex items-center gap-4 mb-4">
        <h1 className="text-base font-semibold tracking-tight whitespace-nowrap text-[#ededed]">
          Pipeline Builder
        </h1>

        <div className="mx-2 h-5 w-px bg-[#2e2e2e]" />

        {/* Pipeline name */}
        <span className="text-xs text-[#666]">{defaultPipeline?.name ?? "Funnel de Ventas"}</span>

        <div className="flex-1" />

        {/* Summary stats */}
        <div className="flex items-center gap-5">
          {liveSummaryStats.map((s) => (
            <div key={s.label} className="flex items-baseline gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-[#666]">{s.label}</span>
              <span className="text-[13px] font-bold text-[#ededed]">{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ====== MAIN LAYOUT (matching Email Builder's full-height bordered container) ====== */}
      <div className="flex overflow-hidden rounded-lg border border-[#2e2e2e]" style={{ height: "calc(100vh - 180px)" }}>
        {/* ------ LEFT: ReactFlow Canvas ------ */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={displayNodes}
            edges={displayEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={pipelineNodeTypes}
            onNodeClick={(_, node) => {
              const sid = node.id.replace("stage-", "");
              setSelectedStageId(sid === selectedStageId ? null : sid);
            }}
            fitView
            fitViewOptions={{ padding: 0.25 }}
            proOptions={{ hideAttribution: true }}
            minZoom={0.3}
            maxZoom={1.5}
            colorMode="dark"
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#2a2a2a" />
            <Controls showInteractive={false} className="!rounded-lg !border !border-[#2e2e2e] !overflow-hidden" />
          </ReactFlow>
        </div>

        {/* ------ RIGHT: Deals Sidebar ------ */}
        <aside className="flex w-[240px] shrink-0 flex-col border-l border-[#2e2e2e] bg-[#1c1c1c]">
          {/* Sidebar header */}
          <div className="px-4 py-3 border-b border-[#2e2e2e]">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#666] mb-2">
              {sidebarStage?.label ?? "Pipeline"}
            </h2>
            <div className="flex items-baseline gap-2">
              <span className="text-[18px] font-bold text-[#ededed]">{sidebarDeals.length}</span>
              <span className="text-[11px] text-[#666]">
                deal{sidebarDeals.length !== 1 ? "s" : ""}
                {sidebarDeals.length > 0 && ` · $${sidebarDeals.reduce((s, d) => s + d.value, 0).toLocaleString()}`}
              </span>
            </div>
          </div>

          {/* Stage filter chips */}
          <div className="px-4 py-2.5 border-b border-[#2e2e2e] flex gap-1.5 flex-wrap">
            {stages.map((s) => (
              <button
                key={s.stageId}
                onClick={() => setSelectedStageId(s.stageId === selectedStageId ? null : s.stageId)}
                className="text-[10px] px-2 py-1 rounded-md border transition-colors cursor-pointer"
                style={{
                  borderColor: s.stageId === selectedStageId ? s.color : "#2e2e2e",
                  color: s.stageId === selectedStageId ? s.color : "#888",
                  background: s.stageId === selectedStageId ? s.color + "15" : "transparent",
                }}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Deal list */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            {sidebarDeals.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-[12px] text-[#555] text-center">Sin deals en esta etapa</p>
              </div>
            ) : (
              sidebarDeals.map((deal) => (
                <div
                  key={deal.id}
                  className="rounded-lg border border-[#2e2e2e] p-3 hover:border-[#3ecf8e]/30 transition-colors cursor-pointer"
                  style={{ background: "#232323" }}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                      style={{ background: PC.purple }}
                    >
                      {deal.contactName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-[#ededed] truncate">{deal.title}</p>
                      <p className="text-[10px] text-[#666] truncate">{deal.contactName}</p>
                    </div>
                    <span className="text-[11px] font-semibold text-[#3ecf8e] shrink-0">
                      ${deal.value.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </>
  );
}

/* ================================================================== */
/*  Create Deal Modal                                                  */
/* ================================================================== */

function CreateDealModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [probability, setProbability] = useState("50");
  const [contactId, setContactId] = useState("");
  const [stageId, setStageId] = useState("");

  const { data: contactsData } = trpc.contacts.list.useQuery({ page: 1, limit: 50 });
  const { data: pipelines } = trpc.pipeline.list.useQuery();
  const defaultPipeline = pipelines?.[0];
  const stages = (defaultPipeline?.stages ?? []) as Array<{ id: string; name: string; order: number }>;

  const utils = trpc.useUtils();
  const createMutation = trpc.deals.create.useMutation({
    onSuccess: () => {
      utils.deals.list.invalidate();
      utils.deals.getStats.invalidate();
      utils.pipeline.get.invalidate();
      onClose();
      setTitle(""); setValue(""); setProbability("50"); setContactId(""); setStageId("");
    },
  });

  function handleSubmit() {
    if (!title.trim() || !contactId || !stageId || !defaultPipeline) return;
    createMutation.mutate({
      title: title.trim(),
      contactId,
      pipelineId: defaultPipeline.id,
      stageId,
      value: value ? parseFloat(value) : undefined,
      probability: probability ? parseInt(probability) : undefined,
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Nuevo Deal">
      <FormField label="Titulo *">
        <Input value={title} onChange={setTitle} placeholder="Ej: Contrato anual TechCR" />
      </FormField>
      <FormField label="Contacto *">
        <select
          value={contactId}
          onChange={(e) => setContactId(e.target.value)}
          className="w-full h-[36px] px-3 rounded-lg border border-[#333] bg-[#222] text-[13px] text-[#ededed] outline-none"
        >
          <option value="">Seleccionar contacto...</option>
          {contactsData?.contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.firstName} {c.lastName ?? ""} {c.company ? `(${c.company})` : ""}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="Etapa *">
        <select
          value={stageId}
          onChange={(e) => setStageId(e.target.value)}
          className="w-full h-[36px] px-3 rounded-lg border border-[#333] bg-[#222] text-[13px] text-[#ededed] outline-none"
        >
          <option value="">Seleccionar etapa...</option>
          {stages.sort((a, b) => a.order - b.order).map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Valor ($)">
          <Input value={value} onChange={setValue} placeholder="10000" type="number" />
        </FormField>
        <FormField label="Probabilidad (%)">
          <Input value={probability} onChange={setProbability} placeholder="50" type="number" />
        </FormField>
      </div>

      {createMutation.error && (
        <p className="text-[12px] text-red-400 mb-3">{createMutation.error.message}</p>
      )}

      <div className="flex justify-end gap-2 mt-2">
        <SecondaryButton onClick={onClose}>Cancelar</SecondaryButton>
        <PrimaryButton onClick={handleSubmit} disabled={!title.trim() || !contactId || !stageId || createMutation.isPending}>
          {createMutation.isPending ? "Creando..." : "Crear deal"}
        </PrimaryButton>
      </div>
    </Modal>
  );
}

/* ================================================================== */
/*  Deal Detail Slide-Over                                             */
/* ================================================================== */

function DealDetailPanel({ dealId, onClose }: { dealId: string; onClose: () => void }) {
  const { data: deal, isLoading } = trpc.deals.get.useQuery({ dealId });
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [editTitle, setEditTitle] = useState("");
  const [editValue, setEditValue] = useState("");
  const [editProbability, setEditProbability] = useState("");
  const [editStageId, setEditStageId] = useState("");

  const { data: pipelines } = trpc.pipeline.list.useQuery();
  const stages = (pipelines?.[0]?.stages ?? []) as Array<{ id: string; name: string; order: number }>;

  const utils = trpc.useUtils();

  const updateMutation = trpc.deals.update.useMutation({
    onSuccess: () => {
      utils.deals.get.invalidate({ dealId });
      utils.deals.list.invalidate();
      utils.deals.getStats.invalidate();
      utils.pipeline.get.invalidate();
      setEditing(false);
    },
  });

  const closeMutation = trpc.deals.close.useMutation({
    onSuccess: () => {
      utils.deals.get.invalidate({ dealId });
      utils.deals.list.invalidate();
      utils.deals.getStats.invalidate();
      utils.pipeline.get.invalidate();
    },
  });

  const deleteMutation = trpc.deals.delete.useMutation({
    onSuccess: () => {
      utils.deals.list.invalidate();
      utils.deals.getStats.invalidate();
      utils.pipeline.get.invalidate();
      onClose();
    },
  });

  function startEditing() {
    if (!deal) return;
    setEditTitle(deal.title);
    setEditValue(deal.value ? String(Number(deal.value)) : "");
    setEditProbability(deal.probability ? String(deal.probability) : "");
    setEditStageId(deal.stageId);
    setEditing(true);
  }

  function handleSave() {
    updateMutation.mutate({
      dealId,
      title: editTitle.trim() || undefined,
      value: editValue ? parseFloat(editValue) : undefined,
      probability: editProbability ? parseInt(editProbability) : undefined,
      stageId: editStageId || undefined,
    });
  }

  if (isLoading) {
    return (
      <SlideOver open title="Cargando..." onClose={onClose}>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8 rounded bg-[#2a2a2a] animate-pulse" />
          ))}
        </div>
      </SlideOver>
    );
  }

  if (!deal) {
    return (
      <SlideOver open title="No encontrado" onClose={onClose}>
        <p className="text-[13px] text-[#888]">El deal no fue encontrado.</p>
      </SlideOver>
    );
  }

  const value = deal.value ? Number(deal.value) : 0;
  const isClosed = !!deal.closedAt;
  const contactName = deal.contact ? `${deal.contact.firstName} ${deal.contact.lastName ?? ""}`.trim() : "—";

  return (
    <SlideOver open title={deal.title} onClose={onClose}>
      {/* Actions */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {!editing ? (
          <>
            <SecondaryButton onClick={startEditing}><Edit3 size={13} /> Editar</SecondaryButton>
            {!isClosed && (
              <>
                <PrimaryButton onClick={() => closeMutation.mutate({ dealId, won: true })} disabled={closeMutation.isPending}>
                  <Check size={13} /> Ganado
                </PrimaryButton>
                <DangerButton onClick={() => closeMutation.mutate({ dealId, won: false })} disabled={closeMutation.isPending}>
                  <X size={13} /> Perdido
                </DangerButton>
              </>
            )}
            <DangerButton onClick={() => setConfirmDelete(true)} disabled={deleteMutation.isPending}>
              <Trash2 size={13} /> Eliminar
            </DangerButton>
          </>
        ) : (
          <>
            <PrimaryButton onClick={handleSave} disabled={updateMutation.isPending}>
              <Check size={13} /> {updateMutation.isPending ? "Guardando..." : "Guardar"}
            </PrimaryButton>
            <SecondaryButton onClick={() => setEditing(false)}>Cancelar</SecondaryButton>
          </>
        )}
      </div>

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="rounded-lg border border-red-500/30 p-4 mb-5" style={{ backgroundColor: "rgba(239,68,68,0.08)" }}>
          <p className="text-[13px] text-red-400 mb-3 flex items-center gap-2">
            <AlertTriangle size={14} /> Eliminar deal permanentemente?
          </p>
          <div className="flex gap-2">
            <DangerButton onClick={() => deleteMutation.mutate({ dealId })} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Eliminando..." : "Si, eliminar"}
            </DangerButton>
            <SecondaryButton onClick={() => setConfirmDelete(false)}>Cancelar</SecondaryButton>
          </div>
        </div>
      )}

      {/* Deal Info */}
      {editing ? (
        <div className="space-y-4">
          <FormField label="Titulo"><Input value={editTitle} onChange={setEditTitle} /></FormField>
          <FormField label="Etapa">
            <select
              value={editStageId}
              onChange={(e) => setEditStageId(e.target.value)}
              className="w-full h-[36px] px-3 rounded-lg border border-[#333] bg-[#222] text-[13px] text-[#ededed] outline-none"
            >
              {stages.sort((a, b) => a.order - b.order).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Valor ($)"><Input value={editValue} onChange={setEditValue} type="number" /></FormField>
            <FormField label="Probabilidad (%)"><Input value={editProbability} onChange={setEditProbability} type="number" /></FormField>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-[#2e2e2e] p-4" style={{ backgroundColor: "#1e1e1e" }}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] text-[#888] mb-1">Valor</p>
                <p className="text-[18px] font-bold text-[#3ecf8e]">${value.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[11px] text-[#888] mb-1">Probabilidad</p>
                <p className="text-[18px] font-bold text-[#ededed]">{deal.probability ?? 0}%</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-[#2e2e2e] p-4 space-y-3" style={{ backgroundColor: "#1e1e1e" }}>
            <div className="flex justify-between text-[13px]">
              <span className="text-[#888]">Contacto</span>
              <span className="text-[#ccc]">{contactName}</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-[#888]">Etapa</span>
              <Badge text={deal.stageId} color={PC.accent} />
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-[#888]">Pipeline</span>
              <span className="text-[#ccc]">{deal.pipeline?.name ?? "—"}</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-[#888]">Creado</span>
              <span className="text-[#ccc]">{new Date(deal.createdAt).toLocaleDateString()}</span>
            </div>
            {deal.closedAt && (
              <div className="flex justify-between text-[13px]">
                <span className="text-[#888]">Cerrado</span>
                <span className="text-[#ccc]">{new Date(deal.closedAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </SlideOver>
  );
}

/* ================================================================== */
/*  Deals Page — Full CRUD                                             */
/* ================================================================== */

const STAGE_COLORS: Record<string, string> = {
  nuevo: "#3b82f6",
  contactado: "#22d3ee",
  calificado: "#eab308",
  propuesta: "#f97316",
  negociacion: "#a855f7",
  won: "#22c55e",
  lost: "#ef4444",
};

function stageColor(stageId: string): string {
  return STAGE_COLORS[stageId.toLowerCase()] ?? "#888";
}

export function DealsPage() {
  const { data: deals, isLoading } = trpc.deals.list.useQuery({});
  const [showCreate, setShowCreate] = useState(false);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);

  return (
    <>
      <SectionHeader
        title="Deals"
        description={`${deals?.length ?? 0} deals activos`}
        action={
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 text-[12px] text-black px-3 py-1.5 rounded font-medium"
            style={{ backgroundColor: "#3ecf8e" }}
          >
            <Plus size={14} />
            Nuevo deal
          </button>
        }
      />

      {isLoading ? (
        <div className="rounded-lg border border-[#2e2e2e] overflow-hidden">
          <div className="space-y-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4 px-4 py-3 border-b border-[#2e2e2e] last:border-0" style={{ backgroundColor: "#1e1e1e" }}>
                <div className="h-4 w-32 rounded bg-[#2a2a2a] animate-pulse" />
                <div className="h-4 w-28 rounded bg-[#2a2a2a] animate-pulse" />
                <div className="h-4 w-16 rounded bg-[#2a2a2a] animate-pulse" />
                <div className="h-4 w-20 rounded bg-[#2a2a2a] animate-pulse" />
                <div className="h-4 w-14 rounded bg-[#2a2a2a] animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      ) : !deals || deals.length === 0 ? (
        <div className="rounded-lg border border-[#2e2e2e] p-12 text-center" style={{ backgroundColor: "#1e1e1e" }}>
          <Handshake size={32} className="text-[#555] mx-auto mb-3" />
          <p className="text-[14px] text-[#ededed] font-medium mb-1">No hay deals</p>
          <p className="text-[12px] text-[#888] mb-4">Crea tu primer deal.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 text-[12px] text-black px-3 py-1.5 rounded font-medium"
            style={{ backgroundColor: "#3ecf8e" }}
          >
            <Plus size={14} /> Nuevo deal
          </button>
        </div>
      ) : (
        <div className="rounded-lg border border-[#2e2e2e] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: "#1e1e1e" }}>
                {["Deal", "Contacto", "Valor", "Etapa", "Probabilidad", "Creado"].map((h) => (
                  <th key={h} className="text-left text-[11px] uppercase tracking-wider text-[#888] font-medium px-4 py-3 border-b border-[#2e2e2e]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deals.map((d) => {
                const prob = d.probability ?? 0;
                const dealValue = d.value ? Number(d.value) : 0;
                const contactName = d.contact
                  ? `${d.contact.firstName} ${d.contact.lastName ?? ""}`.trim()
                  : "—";
                return (
                  <tr
                    key={d.id}
                    onClick={() => setSelectedDealId(d.id)}
                    className="border-b border-[#2e2e2e] last:border-0 hover:bg-[#1e1e1e] transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 text-[13px] text-[#ededed] font-medium">{d.title}</td>
                    <td className="px-4 py-3 text-[13px] text-[#888]">{contactName}</td>
                    <td className="px-4 py-3 text-[13px] text-[#3ecf8e] font-medium">${dealValue.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <Badge text={d.stageId} color={stageColor(d.stageId)} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 rounded-full" style={{ backgroundColor: "#2a2a2a" }}>
                          <div className="h-1.5 rounded-full" style={{ width: `${prob}%`, backgroundColor: prob >= 70 ? "#3ecf8e" : prob >= 40 ? "#f59e0b" : "#ef4444" }} />
                        </div>
                        <span className="text-[11px] text-[#888]">{prob}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-[#888]">
                      {new Date(d.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      <CreateDealModal open={showCreate} onClose={() => setShowCreate(false)} />

      {/* Detail Panel */}
      {selectedDealId && (
        <DealDetailPanel dealId={selectedDealId} onClose={() => setSelectedDealId(null)} />
      )}
    </>
  );
}

/* ================================================================== */
/*  Activities — Already wired                                         */
/* ================================================================== */

function activityTypeColor(type: string): string {
  if (type.includes("won")) return "#22c55e";
  if (type.includes("lost")) return "#ef4444";
  if (type.includes("deal")) return "#a855f7";
  if (type === "email") return "#3b82f6";
  if (type === "call") return "#22d3ee";
  return "#3ecf8e";
}

function formatRelativeTime(dateStr: string | Date): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Ahora";
  if (diffMins < 60) return `Hace ${diffMins}m`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `Hace ${diffHrs}h`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `Hace ${diffDays}d`;
  return date.toLocaleDateString();
}

export function ActividadesPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = trpc.activities.list.useQuery({ page, limit: 30 });

  const activities = data?.activities ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  return (
    <>
      <SectionHeader title="Actividades" description={`${total} interacciones recientes`} />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-[#2e2e2e] p-3 flex items-center gap-3" style={{ backgroundColor: "#1e1e1e" }}>
              <div className="w-5 h-5 rounded bg-[#2a2a2a] animate-pulse flex-shrink-0" />
              <div className="flex-1 flex gap-3">
                <div className="h-4 w-48 rounded bg-[#2a2a2a] animate-pulse" />
                <div className="h-4 w-24 rounded bg-[#2a2a2a] animate-pulse" />
              </div>
              <div className="h-4 w-16 rounded bg-[#2a2a2a] animate-pulse" />
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="rounded-lg border border-[#2e2e2e] p-12 text-center" style={{ backgroundColor: "#1e1e1e" }}>
          <Activity size={32} className="text-[#555] mx-auto mb-3" />
          <p className="text-[14px] text-[#ededed] font-medium mb-1">Sin actividades recientes</p>
          <p className="text-[12px] text-[#888]">Las interacciones con contactos apareceran aqui.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activities.map((a) => (
            <div key={a.id} className="rounded-lg border border-[#2e2e2e] p-3 flex items-center gap-3" style={{ backgroundColor: "#1e1e1e" }}>
              <Activity size={14} style={{ color: activityTypeColor(a.type) }} className="flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-[#ededed] truncate">
                  <Badge text={a.type.replace(/_/g, " ")} color={activityTypeColor(a.type)} />
                  {a.subject && <span className="text-[#ccc] ml-2">{a.subject}</span>}
                </p>
              </div>
              <span className="text-[11px] text-[#666] flex-shrink-0">
                {formatRelativeTime(a.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-[12px] text-[#888]">
            Pagina {page} de {totalPages} ({total} actividades)
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="text-[12px] px-3 py-1.5 rounded border border-[#333] text-[#ccc] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="text-[12px] px-3 py-1.5 rounded border border-[#333] text-[#ccc] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* ================================================================== */
/*  Etiquetas — Aggregated from real contacts                          */
/* ================================================================== */

const TAG_COLORS = ["#f59e0b", "#3ecf8e", "#ef4444", "#6366f1", "#06b6d4", "#ec4899", "#a855f7", "#3b82f6"];

export function EtiquetasPage() {
  const { data, isLoading } = trpc.contacts.list.useQuery({ page: 1, limit: 100 });

  const tags = useMemo(() => {
    if (!data?.contacts) return [];
    const map = new Map<string, number>();
    for (const c of data.contacts) {
      for (const tag of c.tags) {
        map.set(tag, (map.get(tag) ?? 0) + 1);
      }
    }
    return Array.from(map.entries())
      .map(([name, count], i) => ({ name, count, color: TAG_COLORS[i % TAG_COLORS.length] }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  if (isLoading) {
    return (
      <>
        <SectionHeader title="Etiquetas" description="Organiza tus contactos con etiquetas" />
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-[#2e2e2e] p-4 h-14 animate-pulse" style={{ backgroundColor: "#1e1e1e" }} />
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <SectionHeader title="Etiquetas" description={`${tags.length} etiquetas en uso`} />
      {tags.length === 0 ? (
        <div className="rounded-lg border border-[#2e2e2e] p-12 text-center" style={{ backgroundColor: "#1e1e1e" }}>
          <Tags size={32} className="text-[#555] mx-auto mb-3" />
          <p className="text-[14px] text-[#ededed] font-medium mb-1">Sin etiquetas</p>
          <p className="text-[12px] text-[#888]">Agrega tags a tus contactos para organizarlos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {tags.map((t) => (
            <div key={t.name} className="rounded-lg border border-[#2e2e2e] p-4 flex items-center justify-between hover:border-[#3ecf8e]/30 transition-colors cursor-pointer" style={{ backgroundColor: "#1e1e1e" }}>
              <div className="flex items-center gap-2">
                <Tags size={14} style={{ color: t.color }} />
                <span className="text-[13px] text-[#ededed]">{t.name}</span>
              </div>
              <span className="text-[12px] text-[#888]">{t.count}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ================================================================== */
/*  Listas Inteligentes — Still placeholder (needs backend)            */
/* ================================================================== */

export function ListasInteligentesPage() {
  const lists = [
    { name: "Leads HOT sin contactar", count: 5, description: "Score > 80, sin actividad en 7 dias" },
    { name: "Clientes recurrentes", count: 18, description: "Mas de 2 compras en los ultimos 6 meses" },
    { name: "En riesgo de churn", count: 8, description: "Sin interaccion en 30 dias, deal abierto" },
    { name: "Nuevos esta semana", count: 23, description: "Creados en los ultimos 7 dias" },
  ];

  return (
    <>
      <SectionHeader title="Listas Inteligentes" description="Segmentos dinamicos basados en reglas" />
      <div className="space-y-3">
        {lists.map((l) => (
          <div key={l.name} className="rounded-lg border border-[#2e2e2e] p-4 flex items-center justify-between hover:border-[#3ecf8e]/30 transition-colors cursor-pointer" style={{ backgroundColor: "#1e1e1e" }}>
            <div className="flex items-center gap-3">
              <List size={16} className="text-[#6366f1]" />
              <div>
                <p className="text-[13px] font-medium text-[#ededed]">{l.name}</p>
                <p className="text-[11px] text-[#888]">{l.description}</p>
              </div>
            </div>
            <Badge text={`${l.count} contactos`} color="#6366f1" />
          </div>
        ))}
      </div>
    </>
  );
}

/* ================================================================== */
/*  Lead Scoring — Config page (still placeholder)                     */
/* ================================================================== */

export function LeadScoringPage() {
  return (
    <>
      <SectionHeader title="Lead Scoring" description="Configuracion del scoring automatico de leads" />
      <div className="space-y-4">
        <div className="rounded-lg border border-[#2e2e2e] p-4" style={{ backgroundColor: "#1e1e1e" }}>
          <h3 className="text-[13px] font-medium text-[#ededed] mb-3">Reglas de Scoring</h3>
          <div className="space-y-2">
            {[
              { rule: "Abrio email", points: "+5" },
              { rule: "Visito pagina de precios", points: "+15" },
              { rule: "Descargo recurso", points: "+10" },
              { rule: "Solicito demo", points: "+25" },
              { rule: "Sin actividad 30 dias", points: "-10" },
            ].map((r) => (
              <div key={r.rule} className="flex items-center justify-between py-2 px-3 rounded" style={{ backgroundColor: "#252525" }}>
                <span className="text-[13px] text-[#ccc]">{r.rule}</span>
                <span className={`text-[13px] font-medium ${r.points.startsWith("+") ? "text-[#3ecf8e]" : "text-[#ef4444]"}`}>
                  {r.points} pts
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-[#2e2e2e] p-4" style={{ backgroundColor: "#1e1e1e" }}>
          <h3 className="text-[13px] font-medium text-[#ededed] mb-3">Umbrales</h3>
          <div className="flex gap-4">
            <div className="flex-1 text-center py-3 rounded" style={{ backgroundColor: "#252525" }}>
              <Badge text="HOT" color="#ef4444" />
              <p className="text-[12px] text-[#888] mt-2">Score &ge; 80</p>
            </div>
            <div className="flex-1 text-center py-3 rounded" style={{ backgroundColor: "#252525" }}>
              <Badge text="WARM" color="#f59e0b" />
              <p className="text-[12px] text-[#888] mt-2">50 &le; Score &lt; 80</p>
            </div>
            <div className="flex-1 text-center py-3 rounded" style={{ backgroundColor: "#252525" }}>
              <Badge text="COLD" color="#6366f1" />
              <p className="text-[12px] text-[#888] mt-2">Score &lt; 50</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
