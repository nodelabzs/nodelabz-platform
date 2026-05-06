"use client";

import React, { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

/* ================================================================== */
/*  VirtualTable — Virtualized table for large datasets                */
/* ================================================================== */

interface Column<T> {
  key: string;
  header: string;
  width?: string;
  render: (row: T, index: number) => React.ReactNode;
}

interface VirtualTableProps<T> {
  data: T[];
  columns: Column<T>[];
  rowHeight?: number;
  onRowClick?: (row: T, index: number) => void;
  emptyState?: React.ReactNode;
  isLoading?: boolean;
}

export function VirtualTable<T>({
  data,
  columns,
  rowHeight = 44,
  onRowClick,
  emptyState,
  isLoading,
}: VirtualTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 10,
  });

  if (isLoading) {
    return (
      <div
        className="rounded-lg border overflow-hidden"
        style={{ borderColor: "var(--nl-border)" }}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex gap-4 px-4 py-3 border-b last:border-0"
            style={{
              backgroundColor: "var(--nl-bg-secondary)",
              borderColor: "var(--nl-border)",
            }}
          >
            {columns.map((col) => (
              <div
                key={col.key}
                className="h-4 rounded animate-pulse"
                style={{
                  backgroundColor: "var(--nl-bg-elevated)",
                  width: col.width ?? "100px",
                }}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{ borderColor: "var(--nl-border)" }}
    >
      {/* Header */}
      <div
        className="flex"
        style={{ backgroundColor: "var(--nl-bg-secondary)" }}
      >
        {columns.map((col) => (
          <div
            key={col.key}
            className="text-left text-[11px] uppercase tracking-wider font-medium px-4 py-3 border-b"
            style={{
              color: "var(--nl-text-muted)",
              borderColor: "var(--nl-border)",
              width: col.width,
              flex: col.width ? "none" : 1,
            }}
          >
            {col.header}
          </div>
        ))}
      </div>

      {/* Virtualized body */}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ maxHeight: "calc(100vh - 320px)" }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const row = data[virtualRow.index]!;
            return (
              <div
                key={virtualRow.index}
                className="flex border-b last:border-0 hover:bg-[var(--nl-bg-secondary)] transition-colors"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                  borderColor: "var(--nl-border)",
                  cursor: onRowClick ? "pointer" : "default",
                }}
                onClick={() => onRowClick?.(row, virtualRow.index)}
              >
                {columns.map((col) => (
                  <div
                    key={col.key}
                    className="px-4 flex items-center"
                    style={{
                      width: col.width,
                      flex: col.width ? "none" : 1,
                    }}
                  >
                    {col.render(row, virtualRow.index)}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
