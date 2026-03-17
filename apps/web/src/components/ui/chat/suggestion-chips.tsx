"use client";

import { SECTION_SUGGESTIONS } from "@nodelabz/shared-types";
import type { AiSection } from "@nodelabz/shared-types";

export function SuggestionChips({
  section,
  onSelect,
  disabled,
}: {
  section: AiSection;
  onSelect: (text: string) => void;
  disabled?: boolean;
}) {
  const suggestions = SECTION_SUGGESTIONS[section] || [];

  if (suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 px-3 py-2">
      {suggestions.map((text) => (
        <button
          key={text}
          onClick={() => onSelect(text)}
          disabled={disabled}
          className="text-[11px] px-2.5 py-1 rounded-full border border-[#333] text-[#999] hover:text-[#ededed] hover:border-[#3ecf8e]/40 transition-colors disabled:opacity-30"
          style={{ backgroundColor: "#222" }}
        >
          {text}
        </button>
      ))}
    </div>
  );
}
