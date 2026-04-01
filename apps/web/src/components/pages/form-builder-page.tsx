"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Type,
  Mail,
  Phone,
  ChevronDown,
  CheckSquare,
  Calendar,
  Upload,
  AlignLeft,
  Hash,
  Star,
  GripVertical,
  X,
  Plus,
  Trash2,
  Sparkles,
  Eye,
  Send,
  Zap,
  ArrowRight,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type FieldType =
  | "text"
  | "email"
  | "phone"
  | "dropdown"
  | "checkbox"
  | "date"
  | "file"
  | "textarea"
  | "number"
  | "rating";

interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder: string;
  required: boolean;
  options?: string[];
  phonePrefix?: string;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
}

/* ------------------------------------------------------------------ */
/*  Palette definition                                                 */
/* ------------------------------------------------------------------ */

const FIELD_PALETTE: { type: FieldType; label: string; icon: React.ElementType }[] = [
  { type: "text", label: "Texto", icon: Type },
  { type: "email", label: "Email", icon: Mail },
  { type: "phone", label: "Telefono", icon: Phone },
  { type: "dropdown", label: "Dropdown", icon: ChevronDown },
  { type: "checkbox", label: "Checkbox", icon: CheckSquare },
  { type: "date", label: "Fecha", icon: Calendar },
  { type: "file", label: "Archivo", icon: Upload },
  { type: "textarea", label: "Textarea", icon: AlignLeft },
  { type: "number", label: "Numero", icon: Hash },
  { type: "rating", label: "Rating", icon: Star },
];

/* ------------------------------------------------------------------ */
/*  Default form fields                                                */
/* ------------------------------------------------------------------ */

const DEFAULT_FIELDS: FormField[] = [
  {
    id: "f1",
    type: "text",
    label: "Nombre completo",
    placeholder: "Ej: Maria Lopez",
    required: true,
  },
  {
    id: "f2",
    type: "email",
    label: "Email",
    placeholder: "correo@ejemplo.com",
    required: true,
  },
  {
    id: "f3",
    type: "phone",
    label: "Telefono",
    placeholder: "8888-8888",
    required: false,
    phonePrefix: "+506",
  },
  {
    id: "f4",
    type: "dropdown",
    label: "Tipo de servicio",
    placeholder: "Selecciona un servicio",
    required: false,
    options: ["Limpieza", "Ortodoncia", "Blanqueamiento", "Implantes", "Otro"],
  },
  {
    id: "f5",
    type: "date",
    label: "Fecha preferida",
    placeholder: "dd/mm/aaaa",
    required: false,
  },
  {
    id: "f6",
    type: "textarea",
    label: "Mensaje",
    placeholder: "Cuentanos sobre tu caso...",
    required: false,
  },
];

/* ------------------------------------------------------------------ */
/*  Sortable Field Component                                           */
/* ------------------------------------------------------------------ */

function SortableField({
  field,
  isSelected,
  onSelect,
  onDelete,
}: {
  field: FormField;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className="group relative"
    >
      <div
        className={`
          flex items-start gap-2 rounded-lg border px-3 py-3 transition-all cursor-pointer
          ${
            isSelected
              ? "border-[#3ecf8e] bg-[#3ecf8e]/5 shadow-[0_0_0_1px_#3ecf8e]"
              : "border-[#e0e0e0] bg-white hover:border-[#b0b0b0]"
          }
        `}
      >
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="mt-1 cursor-grab text-[#999] hover:text-[#666] active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={16} />
        </button>

        {/* Field content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[13px] font-medium text-[#333]">
              {field.label}
            </span>
            {field.required && (
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#3ecf8e] bg-[#3ecf8e]/10 px-1.5 py-0.5 rounded">
                Requerido
              </span>
            )}
          </div>

          {/* Render field preview */}
          {field.type === "textarea" ? (
            <textarea
              placeholder={field.placeholder}
              rows={3}
              className="w-full rounded-md border border-[#ddd] bg-[#fafafa] px-3 py-2 text-[13px] text-[#666] placeholder:text-[#bbb] resize-none focus:outline-none focus:border-[#3ecf8e]"
              readOnly
            />
          ) : field.type === "dropdown" ? (
            <div className="relative">
              <select className="w-full appearance-none rounded-md border border-[#ddd] bg-[#fafafa] px-3 py-2 text-[13px] text-[#999] focus:outline-none focus:border-[#3ecf8e]">
                <option>{field.placeholder}</option>
                {field.options?.map((opt) => (
                  <option key={opt}>{opt}</option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999] pointer-events-none"
              />
            </div>
          ) : field.type === "phone" ? (
            <div className="flex gap-2">
              <div className="flex items-center rounded-md border border-[#ddd] bg-[#f0f0f0] px-3 py-2 text-[13px] text-[#555] font-medium">
                {field.phonePrefix}
              </div>
              <input
                type="tel"
                placeholder={field.placeholder}
                className="flex-1 rounded-md border border-[#ddd] bg-[#fafafa] px-3 py-2 text-[13px] text-[#666] placeholder:text-[#bbb] focus:outline-none focus:border-[#3ecf8e]"
                readOnly
              />
            </div>
          ) : field.type === "checkbox" ? (
            <label className="flex items-center gap-2 text-[13px] text-[#666]">
              <div className="h-4 w-4 rounded border border-[#ddd] bg-[#fafafa]" />
              {field.placeholder}
            </label>
          ) : field.type === "file" ? (
            <div className="flex items-center justify-center rounded-md border-2 border-dashed border-[#ddd] bg-[#fafafa] px-3 py-4 text-[13px] text-[#999]">
              <Upload size={14} className="mr-2" />
              Arrastra o haz clic para subir archivo
            </div>
          ) : field.type === "rating" ? (
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  size={20}
                  className={
                    s <= 3
                      ? "fill-[#f59e0b] text-[#f59e0b]"
                      : "text-[#ddd]"
                  }
                />
              ))}
            </div>
          ) : (
            <input
              type={field.type === "date" ? "date" : field.type}
              placeholder={field.placeholder}
              className="w-full rounded-md border border-[#ddd] bg-[#fafafa] px-3 py-2 text-[13px] text-[#666] placeholder:text-[#bbb] focus:outline-none focus:border-[#3ecf8e]"
              readOnly
            />
          )}
        </div>

        {/* Delete button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="mt-1 opacity-0 group-hover:opacity-100 text-[#ccc] hover:text-red-400 transition-all"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main FormBuilderPage Component                                     */
/* ------------------------------------------------------------------ */

export function FormBuilderPage() {
  const [fields, setFields] = useState<FormField[]>(DEFAULT_FIELDS);
  const [selectedId, setSelectedId] = useState<string | null>("f1");
  const [formTitle, setFormTitle] = useState("Reserva tu Cita");
  const [formSubtitle] = useState(
    "Completa el formulario y te contactaremos en 24 horas"
  );
  const [formName, setFormName] = useState(
    "Formulario de Contacto \u2014 Clinica Dental"
  );
  const [conditionalLogicOn, setConditionalLogicOn] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  const selectedField = fields.find((f) => f.id === selectedId) ?? null;

  /* DnD sensors */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (over && active.id !== over.id) {
        setFields((prev) => {
          const oldIndex = prev.findIndex((f) => f.id === active.id);
          const newIndex = prev.findIndex((f) => f.id === over.id);
          return arrayMove(prev, oldIndex, newIndex);
        });
      }
    },
    []
  );

  /* Add field from palette */
  const addField = useCallback(
    (type: FieldType) => {
      const id = `f${Date.now()}`;
      const paletteItem = FIELD_PALETTE.find((p) => p.type === type)!;
      const newField: FormField = {
        id,
        type,
        label: paletteItem.label,
        placeholder: "",
        required: false,
        options: type === "dropdown" ? ["Opcion 1", "Opcion 2"] : undefined,
      };
      setFields((prev) => [...prev, newField]);
      setSelectedId(id);
    },
    []
  );

  /* Update selected field */
  const updateField = useCallback(
    (patch: Partial<FormField>) => {
      if (!selectedId) return;
      setFields((prev) =>
        prev.map((f) => (f.id === selectedId ? { ...f, ...patch } : f))
      );
    },
    [selectedId]
  );

  /* Delete field */
  const deleteField = useCallback(
    (id: string) => {
      setFields((prev) => prev.filter((f) => f.id !== id));
      if (selectedId === id) setSelectedId(null);
    },
    [selectedId]
  );

  const activeField = fields.find((f) => f.id === activeId);

  return (
    <>
      {/* ====== HEADER BAR ====== */}
      <div className="flex items-center gap-4 mb-4">
        <h1 className="text-base font-semibold tracking-tight whitespace-nowrap text-[#ededed]">
          Form Builder
        </h1>

        <div className="mx-2 h-5 w-px bg-[#2e2e2e]" />

        <input
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
          className="flex-1 rounded-md border border-[#2e2e2e] bg-[#232323] px-3 py-1.5 text-sm text-[#ededed] outline-none focus:border-[#3ecf8e]/60 transition-colors"
        />

        <div className="mx-2 h-5 w-px bg-[#2e2e2e]" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 mr-1">
            <span className="text-[12px] text-[#888]">Logica</span>
            <button
              onClick={() => setConditionalLogicOn(!conditionalLogicOn)}
              className="relative h-5 w-9 rounded-full transition-colors"
              style={{ background: conditionalLogicOn ? "#3ecf8e" : "#444" }}
            >
              <span
                className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform"
                style={{ left: conditionalLogicOn ? "18px" : "2px" }}
              />
            </button>
          </div>
          <button className="flex items-center gap-1.5 rounded-md border border-[#2e2e2e] px-3 py-1.5 text-[12px] text-[#ccc] hover:bg-[#2a2a2a] transition-colors">
            <Eye size={14} />
            Preview
          </button>
          <button className="flex items-center gap-1.5 rounded-md border border-[#2e2e2e] px-3 py-1.5 text-[12px] text-[#ccc] hover:bg-[#2a2a2a] transition-colors">
            <Send size={14} />
            Publicar
          </button>
          <button className="flex items-center gap-1.5 rounded-md border border-[#3ecf8e]/40 bg-[#3ecf8e]/10 px-3 py-1.5 text-[12px] text-[#3ecf8e] hover:bg-[#3ecf8e]/20 transition-colors">
            <Sparkles size={14} />
            Generar con IA
          </button>
        </div>
      </div>

      {/* ====== MAIN THREE-COLUMN LAYOUT ====== */}
      <div className="flex overflow-hidden rounded-lg border border-[#2e2e2e]" style={{ height: "calc(100vh - 180px)" }}>
        {/* ---------------------------------------------------------- */}
        {/*  LEFT PANEL — Campos Disponibles                            */}
        {/* ---------------------------------------------------------- */}
        <aside
          className="flex-shrink-0 overflow-y-auto border-r p-3"
          style={{ width: 200, borderColor: "#2e2e2e", background: "#1c1c1c" }}
        >
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#666" }}>
            Campos Disponibles
          </p>
          <div className="flex flex-col gap-1.5">
            {FIELD_PALETTE.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.type}
                  onClick={() => addField(item.type)}
                  className="flex items-center gap-2.5 rounded-md border px-2.5 py-2 text-left text-[12px] font-medium transition-all cursor-grab active:cursor-grabbing hover:border-[#3ecf8e]/40 hover:bg-[#3ecf8e]/5"
                  style={{ borderColor: "#2e2e2e", color: "#bbb" }}
                >
                  <Icon size={15} style={{ color: "#3ecf8e" }} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </aside>

        {/* ---------------------------------------------------------- */}
        {/*  CENTER — Form Canvas                                       */}
        {/* ---------------------------------------------------------- */}
        <main className="flex-1 overflow-y-auto p-8" style={{ background: "#171717" }}>
          <div
            className="mx-auto rounded-xl shadow-2xl"
            style={{
              maxWidth: 520,
              background: "#fff",
              border: "1px solid #e5e5e5",
            }}
          >
            {/* Form header */}
            <div className="px-7 pt-7 pb-2">
              <input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="w-full text-[22px] font-bold text-[#111] outline-none bg-transparent placeholder:text-[#ccc]"
                placeholder="Titulo del formulario"
              />
              <p className="mt-1 text-[13px] text-[#888] leading-relaxed">
                {formSubtitle}
              </p>
            </div>

            {/* Sortable fields */}
            <div className="px-7 py-4">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={fields.map((f) => f.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="flex flex-col gap-3">
                    {fields.map((field) => (
                      <SortableField
                        key={field.id}
                        field={field}
                        isSelected={field.id === selectedId}
                        onSelect={() => setSelectedId(field.id)}
                        onDelete={() => deleteField(field.id)}
                      />
                    ))}
                  </div>
                </SortableContext>

                <DragOverlay>
                  {activeField ? (
                    <div className="rounded-lg border border-[#3ecf8e] bg-white px-3 py-3 shadow-xl opacity-90">
                      <span className="text-[13px] font-medium text-[#333]">
                        {activeField.label}
                      </span>
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            </div>

            {/* Submit button */}
            <div className="px-7 pb-7 pt-2">
              <button
                className="w-full rounded-lg py-3 text-[14px] font-semibold text-white transition-all hover:brightness-110"
                style={{ background: "#3ecf8e", color: "#fff" }}
              >
                Reservar Cita
              </button>
            </div>
          </div>

          {/* -------------------------------------------------------- */}
          {/*  Conditional Logic Visual                                  */}
          {/* -------------------------------------------------------- */}
          {conditionalLogicOn && (
            <div
              className="mx-auto mt-6 rounded-xl border p-5"
              style={{
                maxWidth: 520,
                background: "#1c1c1c",
                borderColor: "#2e2e2e",
              }}
            >
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#666" }}>
                Logica Condicional
              </p>
              <div className="flex items-center gap-3">
                {/* Source */}
                <div
                  className="rounded-lg border px-4 py-2.5 text-[12px] font-medium"
                  style={{ borderColor: "#3ecf8e", color: "#3ecf8e", background: "#3ecf8e10" }}
                >
                  <Zap size={12} className="inline mr-1.5 mb-0.5" />
                  Si &quot;Tipo de servicio&quot; = &quot;Ortodoncia&quot;
                </div>
                {/* Arrow */}
                <ArrowRight size={18} style={{ color: "#555" }} />
                {/* Target */}
                <div
                  className="rounded-lg border px-4 py-2.5 text-[12px] font-medium"
                  style={{ borderColor: "#2e2e2e", color: "#aaa" }}
                >
                  Mostrar campo &quot;Edad del paciente&quot;
                </div>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------- */}
          {/*  AI Banner                                                 */}
          {/* -------------------------------------------------------- */}
          <div
            className="mx-auto mt-4 rounded-xl border p-4"
            style={{
              maxWidth: 520,
              background: "linear-gradient(135deg, #1c2b22, #1c1c1c)",
              borderColor: "#2e3e2e",
            }}
          >
            <p className="text-[13px] leading-relaxed" style={{ color: "#b0b0b0" }}>
              <span className="mr-1">&#x1f916;</span>{" "}
              <strong style={{ color: "#3ecf8e" }}>Sugerencia:</strong> Para
              clinicas dentales, recomiendo agregar campo &quot;Seguro
              dental&quot; (dropdown: Si/No) y &quot;Horario preferido&quot;
              (ma&ntilde;ana/tarde). Los formularios con 5-7 campos tienen{" "}
              <strong style={{ color: "#3ecf8e" }}>34% mas conversion</strong>{" "}
              que los de 10+.
            </p>
          </div>
        </main>

        {/* ---------------------------------------------------------- */}
        {/*  RIGHT PANEL — Configuracion del Campo                      */}
        {/* ---------------------------------------------------------- */}
        <aside
          className="flex-shrink-0 overflow-y-auto border-l p-4"
          style={{ width: 260, borderColor: "#2e2e2e", background: "#1c1c1c" }}
        >
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#666" }}>
            Configuracion del Campo
          </p>

          {selectedField ? (
            <div className="flex flex-col gap-4">
              {/* Label */}
              <div>
                <label className="mb-1 block text-[11px] font-medium" style={{ color: "#888" }}>
                  Etiqueta
                </label>
                <input
                  value={selectedField.label}
                  onChange={(e) => updateField({ label: e.target.value })}
                  className="w-full rounded-md border px-3 py-2 text-[13px] outline-none focus:border-[#3ecf8e]"
                  style={{
                    background: "#222",
                    borderColor: "#2e2e2e",
                    color: "#ededed",
                  }}
                />
              </div>

              {/* Placeholder */}
              <div>
                <label className="mb-1 block text-[11px] font-medium" style={{ color: "#888" }}>
                  Placeholder
                </label>
                <input
                  value={selectedField.placeholder}
                  onChange={(e) => updateField({ placeholder: e.target.value })}
                  className="w-full rounded-md border px-3 py-2 text-[13px] outline-none focus:border-[#3ecf8e]"
                  style={{
                    background: "#222",
                    borderColor: "#2e2e2e",
                    color: "#ededed",
                  }}
                />
              </div>

              {/* Required toggle */}
              <div className="flex items-center justify-between">
                <span className="text-[12px]" style={{ color: "#aaa" }}>
                  Requerido
                </span>
                <button
                  onClick={() => updateField({ required: !selectedField.required })}
                  className="relative h-5 w-9 rounded-full transition-colors"
                  style={{
                    background: selectedField.required ? "#3ecf8e" : "#444",
                  }}
                >
                  <span
                    className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform"
                    style={{
                      left: selectedField.required ? "18px" : "2px",
                    }}
                  />
                </button>
              </div>

              {/* Field type */}
              <div>
                <label className="mb-1 block text-[11px] font-medium" style={{ color: "#888" }}>
                  Tipo de campo
                </label>
                <select
                  value={selectedField.type}
                  onChange={(e) => updateField({ type: e.target.value as FieldType })}
                  className="w-full appearance-none rounded-md border px-3 py-2 text-[13px] outline-none focus:border-[#3ecf8e]"
                  style={{
                    background: "#222",
                    borderColor: "#2e2e2e",
                    color: "#ededed",
                  }}
                >
                  {FIELD_PALETTE.map((p) => (
                    <option key={p.type} value={p.type}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dropdown options */}
              {selectedField.type === "dropdown" && (
                <div>
                  <label className="mb-1 block text-[11px] font-medium" style={{ color: "#888" }}>
                    Opciones
                  </label>
                  <div className="flex flex-col gap-1.5">
                    {(selectedField.options ?? []).map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <input
                          value={opt}
                          onChange={(e) => {
                            const newOpts = [...(selectedField.options ?? [])];
                            newOpts[idx] = e.target.value;
                            updateField({ options: newOpts });
                          }}
                          className="flex-1 rounded-md border px-2.5 py-1.5 text-[12px] outline-none focus:border-[#3ecf8e]"
                          style={{
                            background: "#222",
                            borderColor: "#2e2e2e",
                            color: "#ededed",
                          }}
                        />
                        <button
                          onClick={() => {
                            const newOpts = (selectedField.options ?? []).filter(
                              (_, i) => i !== idx
                            );
                            updateField({ options: newOpts });
                          }}
                          className="text-[#555] hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() =>
                        updateField({
                          options: [
                            ...(selectedField.options ?? []),
                            `Opcion ${(selectedField.options?.length ?? 0) + 1}`,
                          ],
                        })
                      }
                      className="flex items-center gap-1.5 rounded-md border border-dashed px-2.5 py-1.5 text-[11px] font-medium transition-colors hover:border-[#3ecf8e] hover:text-[#3ecf8e]"
                      style={{ borderColor: "#2e2e2e", color: "#666" }}
                    >
                      <Plus size={12} />
                      Agregar opcion
                    </button>
                  </div>
                </div>
              )}

              {/* Divider */}
              <div className="h-px" style={{ background: "#2e2e2e" }} />

              {/* Validation */}
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#666" }}>
                  Validacion
                </p>
                <div className="flex flex-col gap-3">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="mb-1 block text-[10px]" style={{ color: "#666" }}>
                        Min. length
                      </label>
                      <input
                        type="number"
                        value={selectedField.validation?.minLength ?? ""}
                        onChange={(e) =>
                          updateField({
                            validation: {
                              ...selectedField.validation,
                              minLength: e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            },
                          })
                        }
                        className="w-full rounded-md border px-2.5 py-1.5 text-[12px] outline-none focus:border-[#3ecf8e]"
                        style={{
                          background: "#222",
                          borderColor: "#2e2e2e",
                          color: "#ededed",
                        }}
                        placeholder="0"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="mb-1 block text-[10px]" style={{ color: "#666" }}>
                        Max. length
                      </label>
                      <input
                        type="number"
                        value={selectedField.validation?.maxLength ?? ""}
                        onChange={(e) =>
                          updateField({
                            validation: {
                              ...selectedField.validation,
                              maxLength: e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            },
                          })
                        }
                        className="w-full rounded-md border px-2.5 py-1.5 text-[12px] outline-none focus:border-[#3ecf8e]"
                        style={{
                          background: "#222",
                          borderColor: "#2e2e2e",
                          color: "#ededed",
                        }}
                        placeholder="100"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px]" style={{ color: "#666" }}>
                      Pattern (regex)
                    </label>
                    <input
                      value={selectedField.validation?.pattern ?? ""}
                      onChange={(e) =>
                        updateField({
                          validation: {
                            ...selectedField.validation,
                            pattern: e.target.value || undefined,
                          },
                        })
                      }
                      className="w-full rounded-md border px-2.5 py-1.5 text-[12px] outline-none focus:border-[#3ecf8e] font-mono"
                      style={{
                        background: "#222",
                        borderColor: "#2e2e2e",
                        color: "#ededed",
                      }}
                      placeholder="^[a-zA-Z]+$"
                    />
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px" style={{ background: "#2e2e2e" }} />

              {/* Conditional logic for this field */}
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#666" }}>
                  Logica Condicional
                </p>
                <p className="mb-2 text-[11px]" style={{ color: "#777" }}>
                  Mostrar este campo si...
                </p>
                <select
                  className="mb-2 w-full appearance-none rounded-md border px-2.5 py-1.5 text-[12px] outline-none focus:border-[#3ecf8e]"
                  style={{
                    background: "#222",
                    borderColor: "#2e2e2e",
                    color: "#ededed",
                  }}
                >
                  <option value="">Sin condicion</option>
                  {fields
                    .filter((f) => f.id !== selectedId)
                    .map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label}
                      </option>
                    ))}
                </select>
                <select
                  className="w-full appearance-none rounded-md border px-2.5 py-1.5 text-[12px] outline-none focus:border-[#3ecf8e]"
                  style={{
                    background: "#222",
                    borderColor: "#2e2e2e",
                    color: "#ededed",
                  }}
                >
                  <option>es igual a</option>
                  <option>no es igual a</option>
                  <option>contiene</option>
                  <option>no esta vacio</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div
                className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ background: "#222" }}
              >
                <Type size={18} style={{ color: "#555" }} />
              </div>
              <p className="text-[12px]" style={{ color: "#555" }}>
                Selecciona un campo para
                <br />
                ver su configuracion
              </p>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
