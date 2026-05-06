"use client";

import React, { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import {
  Filter,
  X,
  Plus,
  Save,
  Trash2,
  Bookmark,
} from "lucide-react";

/* ================================================================== */
/*  Types                                                              */
/* ================================================================== */

export interface FilterState {
  scoreLabel?: "HOT" | "WARM" | "COLD";
  source?: string;
  company?: string;
  hasEmail?: boolean;
  hasPhone?: boolean;
  createdAfter?: string;
  createdBefore?: string;
  tags?: string[];
}

interface FilterBarProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  /** Available sources from filter counts */
  sources?: Array<{ source: string; count: number }>;
  /** Available tags */
  tags?: Array<{ tag: string; count: number }>;
}

/* ================================================================== */
/*  Filter Chip                                                        */
/* ================================================================== */

function FilterChip({
  label,
  value,
  onRemove,
  color,
}: {
  label: string;
  value: string;
  onRemove: () => void;
  color?: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full font-medium"
      style={{
        backgroundColor: (color ?? "var(--nl-accent)") + "18",
        color: color ?? "var(--nl-accent)",
        border: `1px solid ${(color ?? "var(--nl-accent)") + "30"}`,
      }}
    >
      <span className="text-[10px] opacity-70">{label}:</span>
      {value}
      <button
        onClick={onRemove}
        className="ml-0.5 hover:opacity-70 transition-opacity"
      >
        <X size={10} />
      </button>
    </span>
  );
}

/* ================================================================== */
/*  Add Filter Dropdown                                                */
/* ================================================================== */

function AddFilterDropdown({
  filters,
  onFiltersChange,
  sources,
  tags,
}: FilterBarProps) {
  const [open, setOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveFilter(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filterOptions = [
    { key: "scoreLabel", label: "Score", disabled: !!filters.scoreLabel },
    { key: "source", label: "Fuente", disabled: !!filters.source },
    { key: "hasEmail", label: "Tiene email", disabled: filters.hasEmail !== undefined },
    { key: "hasPhone", label: "Tiene telefono", disabled: filters.hasPhone !== undefined },
    { key: "company", label: "Empresa", disabled: !!filters.company },
    { key: "tags", label: "Tag", disabled: false },
    { key: "createdAfter", label: "Creado despues de", disabled: !!filters.createdAfter },
    { key: "createdBefore", label: "Creado antes de", disabled: !!filters.createdBefore },
  ];

  function applyFilter(key: string, value: unknown) {
    onFiltersChange({ ...filters, [key]: value });
    setOpen(false);
    setActiveFilter(null);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(!open); setActiveFilter(null); }}
        className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-md border transition-colors"
        style={{
          color: "var(--nl-text-muted)",
          borderColor: "var(--nl-border-subtle)",
          backgroundColor: "transparent",
        }}
      >
        <Plus size={12} /> Filtro
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1 w-48 rounded-lg border py-1 z-50"
          style={{
            backgroundColor: "var(--nl-bg-primary)",
            borderColor: "var(--nl-border)",
            boxShadow: "var(--nl-shadow-md)",
          }}
        >
          {!activeFilter ? (
            // Filter type selector
            filterOptions
              .filter((f) => !f.disabled)
              .map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => {
                    if (opt.key === "hasEmail") {
                      applyFilter("hasEmail", true);
                    } else if (opt.key === "hasPhone") {
                      applyFilter("hasPhone", true);
                    } else {
                      setActiveFilter(opt.key);
                    }
                  }}
                  className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-[var(--nl-bg-elevated)] transition-colors"
                  style={{ color: "var(--nl-text-secondary)" }}
                >
                  {opt.label}
                </button>
              ))
          ) : activeFilter === "scoreLabel" ? (
            // Score selector
            (["HOT", "WARM", "COLD"] as const).map((label) => (
              <button
                key={label}
                onClick={() => applyFilter("scoreLabel", label)}
                className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-[var(--nl-bg-elevated)] transition-colors"
                style={{ color: label === "HOT" ? "var(--nl-hot)" : label === "WARM" ? "var(--nl-warm)" : "var(--nl-cold)" }}
              >
                {label}
              </button>
            ))
          ) : activeFilter === "source" ? (
            // Source selector
            (sources ?? []).map((s) => (
              <button
                key={s.source}
                onClick={() => applyFilter("source", s.source)}
                className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-[var(--nl-bg-elevated)] transition-colors flex justify-between"
                style={{ color: "var(--nl-text-secondary)" }}
              >
                <span>{s.source}</span>
                <span style={{ color: "var(--nl-text-faint)" }}>{s.count}</span>
              </button>
            ))
          ) : activeFilter === "tags" ? (
            // Tag selector
            (tags ?? []).slice(0, 10).map((t) => (
              <button
                key={t.tag}
                onClick={() => {
                  const current = filters.tags ?? [];
                  if (!current.includes(t.tag)) {
                    applyFilter("tags", [...current, t.tag]);
                  }
                }}
                className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-[var(--nl-bg-elevated)] transition-colors flex justify-between"
                style={{ color: "var(--nl-text-secondary)" }}
              >
                <span>{t.tag}</span>
                <span style={{ color: "var(--nl-text-faint)" }}>{t.count}</span>
              </button>
            ))
          ) : activeFilter === "company" ? (
            // Company text input
            <div className="px-2 py-1">
              <input
                autoFocus
                placeholder="Nombre de empresa..."
                className="w-full h-7 px-2 rounded border text-[12px] outline-none"
                style={{
                  backgroundColor: "var(--nl-bg-tertiary)",
                  borderColor: "var(--nl-border-subtle)",
                  color: "var(--nl-text-primary)",
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const val = (e.target as HTMLInputElement).value.trim();
                    if (val) applyFilter("company", val);
                  }
                }}
              />
            </div>
          ) : activeFilter === "createdAfter" || activeFilter === "createdBefore" ? (
            // Date input
            <div className="px-2 py-1">
              <input
                autoFocus
                type="date"
                className="w-full h-7 px-2 rounded border text-[12px] outline-none"
                style={{
                  backgroundColor: "var(--nl-bg-tertiary)",
                  borderColor: "var(--nl-border-subtle)",
                  color: "var(--nl-text-primary)",
                }}
                onChange={(e) => {
                  if (e.target.value) applyFilter(activeFilter, e.target.value);
                }}
              />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Saved Views Dropdown                                               */
/* ================================================================== */

function SavedViewsDropdown({
  filters,
  onFiltersChange,
}: {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: savedFilters } = trpc.contacts.listSavedFilters.useQuery();
  const utils = trpc.useUtils();

  const saveMutation = trpc.contacts.saveFilter.useMutation({
    onSuccess: () => {
      utils.contacts.listSavedFilters.invalidate();
      setSaveName("");
      setShowSaveInput(false);
    },
  });

  const deleteMutation = trpc.contacts.deleteSavedFilter.useMutation({
    onSuccess: () => utils.contacts.listSavedFilters.invalidate(),
  });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setShowSaveInput(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const hasActiveFilters = Object.values(filters).some(
    (v) => v !== undefined && v !== "" && (!Array.isArray(v) || v.length > 0)
  );

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-md border transition-colors"
        style={{
          color: "var(--nl-text-muted)",
          borderColor: "var(--nl-border-subtle)",
          backgroundColor: "transparent",
        }}
      >
        <Bookmark size={12} /> Vistas
        {savedFilters && savedFilters.length > 0 && (
          <span
            className="text-[9px] px-1 rounded-full"
            style={{ backgroundColor: "var(--nl-accent-subtle)", color: "var(--nl-accent)" }}
          >
            {savedFilters.length}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute top-full right-0 mt-1 w-56 rounded-lg border py-1 z-50"
          style={{
            backgroundColor: "var(--nl-bg-primary)",
            borderColor: "var(--nl-border)",
            boxShadow: "var(--nl-shadow-md)",
          }}
        >
          {/* Save current */}
          {hasActiveFilters && (
            <>
              {showSaveInput ? (
                <div className="px-2 py-1.5 flex gap-1.5">
                  <input
                    autoFocus
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder="Nombre de la vista..."
                    className="flex-1 h-7 px-2 rounded border text-[12px] outline-none"
                    style={{
                      backgroundColor: "var(--nl-bg-tertiary)",
                      borderColor: "var(--nl-border-subtle)",
                      color: "var(--nl-text-primary)",
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && saveName.trim()) {
                        saveMutation.mutate({
                          name: saveName.trim(),
                          filters: filters as Record<string, unknown>,
                        });
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (saveName.trim()) {
                        saveMutation.mutate({
                          name: saveName.trim(),
                          filters: filters as Record<string, unknown>,
                        });
                      }
                    }}
                    disabled={!saveName.trim() || saveMutation.isPending}
                    className="text-[11px] px-2 py-1 rounded font-medium disabled:opacity-50"
                    style={{ backgroundColor: "var(--nl-accent)", color: "black" }}
                  >
                    <Save size={12} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowSaveInput(true)}
                  className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-[var(--nl-bg-elevated)] transition-colors flex items-center gap-2"
                  style={{ color: "var(--nl-accent)" }}
                >
                  <Save size={12} /> Guardar vista actual
                </button>
              )}
              <div className="h-px my-1" style={{ backgroundColor: "var(--nl-border)" }} />
            </>
          )}

          {/* List saved views */}
          {(!savedFilters || savedFilters.length === 0) ? (
            <div className="px-3 py-3 text-center">
              <p className="text-[11px]" style={{ color: "var(--nl-text-faint)" }}>
                Sin vistas guardadas
              </p>
            </div>
          ) : (
            savedFilters.map((view) => (
              <div
                key={view.id}
                className="flex items-center gap-1 px-1 hover:bg-[var(--nl-bg-elevated)] transition-colors"
              >
                <button
                  onClick={() => {
                    onFiltersChange(view.filters as FilterState);
                    setOpen(false);
                  }}
                  className="flex-1 text-left px-2 py-1.5 text-[12px]"
                  style={{ color: "var(--nl-text-secondary)" }}
                >
                  {view.name}
                </button>
                <button
                  onClick={() => deleteMutation.mutate({ name: view.name })}
                  className="p-1 rounded hover:bg-[var(--nl-bg-tertiary)] transition-colors"
                  style={{ color: "var(--nl-text-faint)" }}
                >
                  <Trash2 size={10} />
                </button>
              </div>
            ))
          )}

          {/* Clear all */}
          {hasActiveFilters && (
            <>
              <div className="h-px my-1" style={{ backgroundColor: "var(--nl-border)" }} />
              <button
                onClick={() => {
                  onFiltersChange({});
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-[var(--nl-bg-elevated)] transition-colors"
                style={{ color: "var(--nl-danger)" }}
              >
                Limpiar todos los filtros
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Main Filter Bar                                                    */
/* ================================================================== */

const SCORE_COLORS: Record<string, string> = {
  HOT: "var(--nl-hot)",
  WARM: "var(--nl-warm)",
  COLD: "var(--nl-cold)",
};

export function FilterBar({ filters, onFiltersChange, sources, tags }: FilterBarProps) {
  const activeChips: Array<{ key: string; label: string; value: string; color?: string }> = [];

  if (filters.scoreLabel) {
    activeChips.push({
      key: "scoreLabel",
      label: "Score",
      value: filters.scoreLabel,
      color: SCORE_COLORS[filters.scoreLabel],
    });
  }
  if (filters.source) {
    activeChips.push({ key: "source", label: "Fuente", value: filters.source });
  }
  if (filters.company) {
    activeChips.push({ key: "company", label: "Empresa", value: filters.company });
  }
  if (filters.hasEmail !== undefined) {
    activeChips.push({
      key: "hasEmail",
      label: "Email",
      value: filters.hasEmail ? "Si" : "No",
      color: "var(--nl-info)",
    });
  }
  if (filters.hasPhone !== undefined) {
    activeChips.push({
      key: "hasPhone",
      label: "Telefono",
      value: filters.hasPhone ? "Si" : "No",
      color: "var(--nl-info)",
    });
  }
  if (filters.createdAfter) {
    activeChips.push({
      key: "createdAfter",
      label: "Desde",
      value: new Date(filters.createdAfter).toLocaleDateString("es", { month: "short", day: "numeric" }),
    });
  }
  if (filters.createdBefore) {
    activeChips.push({
      key: "createdBefore",
      label: "Hasta",
      value: new Date(filters.createdBefore).toLocaleDateString("es", { month: "short", day: "numeric" }),
    });
  }
  if (filters.tags && filters.tags.length > 0) {
    for (const tag of filters.tags) {
      activeChips.push({ key: `tag:${tag}`, label: "Tag", value: tag, color: "var(--nl-purple)" });
    }
  }

  function removeFilter(key: string) {
    if (key.startsWith("tag:")) {
      const tag = key.slice(4);
      onFiltersChange({ ...filters, tags: (filters.tags ?? []).filter((t) => t !== tag) });
    } else {
      const updated = { ...filters };
      delete (updated as Record<string, unknown>)[key];
      onFiltersChange(updated);
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Filter size={13} style={{ color: "var(--nl-text-faint)" }} />

      {/* Active filter chips */}
      {activeChips.map((chip) => (
        <FilterChip
          key={chip.key}
          label={chip.label}
          value={chip.value}
          color={chip.color}
          onRemove={() => removeFilter(chip.key)}
        />
      ))}

      {/* Add filter dropdown */}
      <AddFilterDropdown
        filters={filters}
        onFiltersChange={onFiltersChange}
        sources={sources}
        tags={tags}
      />

      {/* Saved views */}
      <SavedViewsDropdown filters={filters} onFiltersChange={onFiltersChange} />
    </div>
  );
}
