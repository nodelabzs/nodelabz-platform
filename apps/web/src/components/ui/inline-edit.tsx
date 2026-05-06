"use client";

import React, { useState, useRef, useEffect } from "react";
import { Check, X, Pencil } from "lucide-react";

/* ================================================================== */
/*  InlineEdit — Click-to-edit field with auto-save                    */
/* ================================================================== */

interface InlineEditProps {
  value: string;
  onSave: (value: string) => void;
  type?: "text" | "email" | "phone" | "url" | "number" | "date";
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function InlineEdit({
  value,
  onSave,
  type = "text",
  placeholder = "—",
  className = "",
  disabled = false,
}: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function commit() {
    const trimmed = draft.trim();
    if (trimmed !== value) {
      onSave(trimmed);
    }
    setEditing(false);
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") cancel();
  }

  if (disabled) {
    return (
      <span className={`text-[13px] text-[#888] ${className}`}>
        {value || placeholder}
      </span>
    );
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5 -ml-1.5">
        <input
          ref={inputRef}
          type={type === "phone" ? "tel" : type}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commit}
          className="h-[28px] px-1.5 rounded border border-[#3ecf8e]/50 bg-[#222] text-[13px] text-[#ededed] outline-none min-w-0 flex-1"
          style={{ maxWidth: 220 }}
        />
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={commit}
          className="p-0.5 rounded hover:bg-[#2a2a2a] text-[#3ecf8e]"
        >
          <Check size={12} />
        </button>
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={cancel}
          className="p-0.5 rounded hover:bg-[#2a2a2a] text-[#666]"
        >
          <X size={12} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className={`group flex items-center gap-1.5 text-left rounded px-1.5 -ml-1.5 py-0.5 hover:bg-[#2a2a2a] transition-colors ${className}`}
    >
      <span className={`text-[13px] ${value ? "text-[#ededed]" : "text-[#555]"}`}>
        {value || placeholder}
      </span>
      <Pencil size={10} className="text-[#555] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
    </button>
  );
}

/* ================================================================== */
/*  InlineSelect — Click-to-edit dropdown                              */
/* ================================================================== */

interface InlineSelectProps {
  value: string;
  options: { label: string; value: string }[];
  onSave: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function InlineSelect({
  value,
  options,
  onSave,
  placeholder = "Seleccionar...",
  disabled = false,
}: InlineSelectProps) {
  const [editing, setEditing] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (editing) selectRef.current?.focus();
  }, [editing]);

  function handleChange(newVal: string) {
    if (newVal !== value) onSave(newVal);
    setEditing(false);
  }

  if (disabled) {
    const label = options.find((o) => o.value === value)?.label ?? value;
    return <span className="text-[13px] text-[#888]">{label || placeholder}</span>;
  }

  if (editing) {
    return (
      <select
        ref={selectRef}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={() => setEditing(false)}
        className="h-[28px] px-1.5 rounded border border-[#3ecf8e]/50 bg-[#222] text-[13px] text-[#ededed] outline-none"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }

  const label = options.find((o) => o.value === value)?.label ?? value;
  return (
    <button
      onClick={() => setEditing(true)}
      className="group flex items-center gap-1.5 text-left rounded px-1.5 -ml-1.5 py-0.5 hover:bg-[#2a2a2a] transition-colors"
    >
      <span className={`text-[13px] ${value ? "text-[#ededed]" : "text-[#555]"}`}>
        {label || placeholder}
      </span>
      <Pencil size={10} className="text-[#555] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
    </button>
  );
}

/* ================================================================== */
/*  InlineBoolean — Toggle switch                                      */
/* ================================================================== */

interface InlineBooleanProps {
  value: boolean;
  onSave: (value: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function InlineBoolean({ value, onSave, label, disabled = false }: InlineBooleanProps) {
  return (
    <button
      onClick={() => !disabled && onSave(!value)}
      className="flex items-center gap-2 rounded px-1.5 -ml-1.5 py-0.5 hover:bg-[#2a2a2a] transition-colors"
      disabled={disabled}
    >
      <div
        className="w-7 h-4 rounded-full relative transition-colors"
        style={{ backgroundColor: value ? "#3ecf8e" : "#333" }}
      >
        <div
          className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform"
          style={{ left: value ? 14 : 2 }}
        />
      </div>
      {label && (
        <span className="text-[13px] text-[#ccc]">{label}</span>
      )}
    </button>
  );
}
