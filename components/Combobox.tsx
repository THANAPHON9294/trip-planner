"use client";

import { useEffect, useRef, useState } from "react";

export interface ComboItem {
  value: string;
  label: string;
  icon?: string;
}

/**
 * One styled dropdown used everywhere, so Category / Neighborhood / Added-by all
 * look identical (no browser-native <select> or prompt()).
 *
 * Modes:
 *  - default (select): pick one of `items`. Typing filters.
 *  - freeText: the typed text *is* the value (suggestions still shown). For
 *    fields like Neighborhood where any new value is allowed.
 *  - onCreate: shows a "+ Add «text»" row when the typed text matches nothing,
 *    creating a new option (e.g. a new trip member) and selecting it.
 */
export function Combobox({
  items,
  value,
  onChange,
  placeholder,
  freeText = false,
  onCreate,
  ariaLabel,
}: {
  items: ComboItem[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  freeText?: boolean;
  onCreate?: (text: string) => Promise<string> | string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedItem = items.find((i) => i.value === value);
  const inputText = freeText ? value : open ? query : selectedItem?.label ?? "";
  const filterText = (freeText ? value : query).trim().toLowerCase();

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const filtered = filterText
    ? items.filter((i) => i.label.toLowerCase().includes(filterText))
    : items;
  const exact = items.some((i) => i.label.toLowerCase() === filterText);
  const showCreate = !!onCreate && filterText.length > 0 && !exact;

  function pick(item: ComboItem) {
    onChange(item.value);
    setOpen(false);
    setQuery("");
  }

  async function create() {
    if (!onCreate) return;
    const text = (freeText ? value : query).trim();
    if (!text) return;
    setCreating(true);
    try {
      const newValue = await onCreate(text);
      onChange(newValue);
    } finally {
      setCreating(false);
      setOpen(false);
      setQuery("");
    }
  }

  return (
    <div ref={ref} className="relative">
      <div
        className="flex w-full cursor-text items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-sm focus-within:border-river focus-within:ring-2 focus-within:ring-river/20"
        onClick={() => {
          setOpen(true);
          inputRef.current?.focus();
        }}
      >
        {!open && selectedItem?.icon && <span>{selectedItem.icon}</span>}
        <input
          ref={inputRef}
          className="w-full bg-transparent outline-none placeholder:text-ink-soft"
          value={inputText}
          placeholder={placeholder}
          aria-label={ariaLabel}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setOpen(true);
            if (freeText) onChange(e.target.value);
            else setQuery(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (filtered.length >= 1 && filterText && !exact && !freeText && !onCreate) pick(filtered[0]);
              else if (showCreate) create();
              else if (filtered.length === 1) pick(filtered[0]);
              else setOpen(false);
            } else if (e.key === "Escape") {
              setOpen(false);
              setQuery("");
            }
          }}
        />
        <span className="pointer-events-none text-ink-soft">▾</span>
      </div>

      {open && (filtered.length > 0 || showCreate) && (
        <ul className="absolute z-[1100] mt-1 max-h-56 w-full overflow-auto rounded-xl border border-line bg-white py-1 shadow-lg">
          {filtered.map((i) => (
            <li key={i.value}>
              <button
                type="button"
                onClick={() => pick(i)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-river-soft ${
                  i.value === value ? "bg-river-soft/60 font-medium" : ""
                }`}
              >
                {i.icon && <span>{i.icon}</span>}
                {i.label}
              </button>
            </li>
          ))}
          {showCreate && (
            <li>
              <button
                type="button"
                onClick={create}
                disabled={creating}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-river hover:bg-river-soft"
              >
                {creating ? "Adding…" : `+ Add “${(freeText ? value : query).trim()}”`}
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
