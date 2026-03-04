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
    <div className={`relative ${className ?? ""}`} ref={rootRef} id={id}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((s) => !s)}
        onKeyDown={onKeyDown}
        className="listbox-premium-button w-full select-none"
      >
        <span className="block truncate text-left">{selected?.label ?? "Select option"}</span>
        <svg className={`h-4 w-4 text-slate-300 transition-transform duration-200 ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ul className="listbox-premium-options absolute z-[9999] left-0 right-0 mt-1" role="listbox">
          {options.map((opt, idx) => (
            <li key={opt.value} role="option" aria-selected={opt.value === value}>
              <button
                type="button"
                className={`listbox-premium-option ${idx === active ? "listbox-premium-option-active" : ""} ${opt.value === value ? "listbox-premium-option-selected" : ""}`}
                onMouseEnter={() => setActive(idx)}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                <span>{opt.label}</span>
                {opt.value === value ? (
                  <svg className="h-4 w-4 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
                  </svg>
                ) : null}
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
