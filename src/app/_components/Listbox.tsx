"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Option = { value: string; label: string };

interface Props {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  id?: string;
}

interface DropdownPosition {
  top: number;
  left: number;
  width: number;
}

export default function Listbox({ options, value, onChange, className, id }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState<number>(() =>
    Math.max(
      0,
      options.findIndex((option) => option.value === value),
    ),
  );
  const [position, setPosition] = useState<DropdownPosition>({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setActive(Math.max(0, options.findIndex((option) => option.value === value)));
  }, [options, value]);

  const selected = useMemo(
    () => options.find((option) => option.value === value) ?? options[0],
    [options, value],
  );

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPosition({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  };

  const openDropdown = () => {
    updatePosition();
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    const onViewportChange = () => {
      updatePosition();
    };

    document.addEventListener("keydown", onEscape);
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);

    return () => {
      document.removeEventListener("keydown", onEscape);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [open]);

  const onTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) openDropdown();
      setActive((index) => Math.min(options.length - 1, index + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) openDropdown();
      setActive((index) => Math.max(0, index - 1));
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) {
        const option = options[active];
        if (option) onChange(option.value);
        setOpen(false);
      } else {
        openDropdown();
      }
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  const portalContent =
    mounted && open
      ? createPortal(
          <>
            <div
              aria-hidden="true"
              onClick={() => setOpen(false)}
              style={{ position: "fixed", inset: 0, zIndex: 9998 }}
            />
            <ul
              className="kv-listbox-options"
              role="listbox"
              style={{
                position: "fixed",
                top: position.top,
                left: position.left,
                width: position.width,
                zIndex: 9999,
              }}
            >
              {options.map((option, index) => {
                const isSelected = option.value === value;
                const isActive = index === active;
                return (
                  <li key={option.value} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      className={`kv-listbox-option${isActive ? " is-active" : ""}${isSelected ? " is-selected" : ""}`}
                      onMouseEnter={() => setActive(index)}
                      onClick={() => {
                        onChange(option.value);
                        setOpen(false);
                      }}
                    >
                      <span>{option.label}</span>
                      {isSelected ? (
                        <span aria-hidden="true" style={{ color: "var(--kv-accent-text)" }}>
                          ✓
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>,
          document.body,
        )
      : null;

  return (
    <div className={className ?? ""} id={id}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          if (open) {
            setOpen(false);
            return;
          }
          openDropdown();
        }}
        onKeyDown={onTriggerKeyDown}
        className="kv-field"
        style={{
          display: "flex",
          width: "100%",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span className="block truncate">{selected?.label ?? "Select option"}</span>
        <span aria-hidden="true" style={{ color: "var(--kv-text-tertiary)" }}>
          ▾
        </span>
      </button>

      {portalContent}
    </div>
  );
}
