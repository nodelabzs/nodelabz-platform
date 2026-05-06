"use client";

import { useEffect, useRef } from "react";

type HotkeyHandler = (e: KeyboardEvent) => void;

interface HotkeyBinding {
  key: string;
  meta?: boolean;
  ctrl?: boolean;
  shift?: boolean;
  handler: HotkeyHandler;
  /** Allow triggering while focused in text inputs (default: false) */
  allowInInput?: boolean;
}

function isTextInput(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  return false;
}

/**
 * Register global keyboard shortcuts. Bindings are stable via ref to avoid
 * re-registering on every render.
 */
export function useHotkeys(bindings: HotkeyBinding[]) {
  const bindingsRef = useRef(bindings);
  bindingsRef.current = bindings;

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      for (const binding of bindingsRef.current) {
        const metaMatch = binding.meta
          ? e.metaKey || e.ctrlKey
          : !e.metaKey && !e.ctrlKey;
        const shiftMatch = binding.shift ? e.shiftKey : !e.shiftKey;

        if (e.key.toLowerCase() === binding.key.toLowerCase() && metaMatch && shiftMatch) {
          if (!binding.allowInInput && isTextInput(e.target)) continue;
          e.preventDefault();
          e.stopPropagation();
          binding.handler(e);
          return;
        }
      }
    }

    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, []);
}

/**
 * Simple hook for a single "Escape" binding (common pattern).
 */
export function useEscapeKey(handler: () => void) {
  useHotkeys([{ key: "Escape", handler, allowInInput: true }]);
}
