"use client";

import React, { useEffect, useRef, useState } from "react";

type Option = { value: string; label: string };

interface Props {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  id?: string;
}

export default function ListboxClient({ options, value, onChange, className, id }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<number>(() => Math.max(0, options.findIndex((o) => o.value === value)));
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
  }, [value, options]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (e.target instanceof Node && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = options[active];
      if (opt) onChange(opt.value);
      setOpen(false);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const selected = options.find((o) => o.value === value) ?? options[0];

  return (
    <div className={`select-wrapper ${className ?? ""}`} ref={rootRef} id={id}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((s) => !s)}
        onKeyDown={onKeyDown}
        className="listbox-button w-full select-none"
      >
        <span className="block text-left">{selected.label}</span>
      </button>

      {open && (
        <ul className="listbox-options mt-2 w-full rounded-xl border p-1 shadow-lg site-dropdown" role="listbox">
          {options.map((opt, idx) => (
            <li key={opt.value} role="option" aria-selected={opt.value === value}>
              <button
                type="button"
                className={`w-full text-left px-3 py-2 text-sm ${idx === active ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"}`}
                onMouseEnter={() => setActive(idx)}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Expose a safe global for legacy client bundles that may reference `Listbox` as a global identifier.
// This avoids runtime ReferenceErrors while we fully migrate to the dynamic client wrapper.
if (typeof window !== "undefined") {
  try {
    // @ts-ignore - intentionally assigning for backwards compatibility
    (window as any).Listbox = ListboxClient;
  } catch (e) {
    // ignore
  }
}
