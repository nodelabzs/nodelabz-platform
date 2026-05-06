"use client";

import { useState, useCallback } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { DollarSign, Plus, User, GripVertical } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────

export interface KanbanStage {
  id: string;
  name: string;
  color: string;
  order: number;
}

export interface KanbanCard {
  id: string;
  title: string;
  value?: number | null;
  currency?: string;
  contactName?: string;
  company?: string;
  stageId: string;
  probability?: number | null;
  updatedAt?: string;
}

interface KanbanBoardProps {
  stages: KanbanStage[];
  cards: KanbanCard[];
  onCardMove: (cardId: string, fromStageId: string, toStageId: string, newIndex: number) => void;
  onCardClick?: (card: KanbanCard) => void;
  onAddCard?: (stageId: string) => void;
  loading?: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────

function formatCurrency(value: number | null | undefined, currency = "USD"): string {
  if (value == null) return "";
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

function getCardsByStage(cards: KanbanCard[], stageId: string): KanbanCard[] {
  return cards.filter((c) => c.stageId === stageId);
}

// ── Components ───────────────────────────────────────────────────────────

function StageHeader({ stage, cardCount, totalValue }: { stage: KanbanStage; cardCount: number; totalValue: number }) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#2e2e2e]">
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
        <span className="text-[12px] font-semibold text-[#ededed]">{stage.name}</span>
        <span className="text-[10px] text-[#666] bg-[#252525] px-1.5 py-0.5 rounded-full">{cardCount}</span>
      </div>
      {totalValue > 0 && (
        <span className="text-[10px] text-[#888]">{formatCurrency(totalValue)}</span>
      )}
    </div>
  );
}

function DealCard({ card, index, onClick }: { card: KanbanCard; index: number; onClick?: (card: KanbanCard) => void }) {
  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`rounded-lg border mx-2 mb-2 p-3 cursor-pointer transition-all group ${
            snapshot.isDragging
              ? "border-[#3ecf8e]/50 shadow-[0_4px_20px_rgba(62,207,142,0.15)] scale-[1.02]"
              : "border-[#2e2e2e] hover:border-[#444]"
          }`}
          style={{
            backgroundColor: snapshot.isDragging ? "#222" : "#1e1e1e",
            ...provided.draggableProps.style,
          }}
          onClick={() => onClick?.(card)}
        >
          <div className="flex items-start gap-2">
            <div {...provided.dragHandleProps} className="mt-0.5 text-[#444] opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical size={12} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-[#ededed] truncate">{card.title}</p>
              {card.contactName && (
                <div className="flex items-center gap-1 mt-1.5">
                  <User size={10} className="text-[#666]" />
                  <span className="text-[10px] text-[#888] truncate">{card.contactName}</span>
                </div>
              )}
              {card.company && (
                <span className="text-[10px] text-[#666] truncate block mt-0.5">{card.company}</span>
              )}
            </div>
            {card.value != null && card.value > 0 && (
              <div className="flex items-center gap-0.5 shrink-0">
                <DollarSign size={10} className="text-[#3ecf8e]" />
                <span className="text-[11px] font-medium text-[#3ecf8e]">{formatCurrency(card.value, card.currency)}</span>
              </div>
            )}
          </div>
          {card.probability != null && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1 rounded-full bg-[#252525]">
                <div className="h-full rounded-full transition-all" style={{ width: `${card.probability}%`, backgroundColor: card.probability >= 70 ? "#3ecf8e" : card.probability >= 40 ? "#f59e0b" : "#ef4444" }} />
              </div>
              <span className="text-[9px] text-[#666] shrink-0">{card.probability}%</span>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}

// ── Main Board ───────────────────────────────────────────────────────────

export function KanbanBoard({ stages, cards, onCardMove, onCardClick, onAddCard, loading }: KanbanBoardProps) {
  const sortedStages = [...stages].sort((a, b) => a.order - b.order);

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    const fromStageId = result.source.droppableId;
    const toStageId = result.destination.droppableId;
    const cardId = result.draggableId;
    const newIndex = result.destination.index;
    onCardMove(cardId, fromStageId, toStageId, newIndex);
  }, [onCardMove]);

  if (loading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-4 px-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="w-[260px] shrink-0 rounded-lg border border-[#2e2e2e] h-[400px] animate-pulse" style={{ backgroundColor: "#1a1a1a" }} />
        ))}
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4 px-1" style={{ minHeight: 400 }}>
        {sortedStages.map((stage) => {
          const stageCards = getCardsByStage(cards, stage.id);
          const totalValue = stageCards.reduce((sum, c) => sum + (Number(c.value) || 0), 0);

          return (
            <div key={stage.id} className="w-[260px] shrink-0 rounded-lg border border-[#2e2e2e] flex flex-col" style={{ backgroundColor: "#1a1a1a" }}>
              <StageHeader stage={stage} cardCount={stageCards.length} totalValue={totalValue} />

              <Droppable droppableId={stage.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 py-2 min-h-[100px] transition-colors ${
                      snapshot.isDraggingOver ? "bg-[#3ecf8e]/5" : ""
                    }`}
                  >
                    {stageCards.map((card, idx) => (
                      <DealCard key={card.id} card={card} index={idx} onClick={onCardClick} />
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>

              {onAddCard && (
                <button
                  onClick={() => onAddCard(stage.id)}
                  className="mx-2 mb-2 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-[#333] text-[11px] text-[#666] hover:text-[#999] hover:border-[#555] transition-colors"
                >
                  <Plus size={12} /> Agregar deal
                </button>
              )}
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
