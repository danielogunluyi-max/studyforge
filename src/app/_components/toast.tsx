"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { onToast } from "~/lib/toast";

type ToastType = "success" | "error" | "info";

type ToastItem = {
  id: string;
  message: string;
  type: ToastType;
};

type ToastContextType = {
  showToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

let toastSetState: Dispatch<SetStateAction<ToastItem[]>> | null = null;

function makeToastId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  toastSetState = setToasts;

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = makeToastId();
    setToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => removeToast(id), 3000);
  }, [removeToast]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-viewport fixed right-4 top-4 z-[9999] flex w-[min(90vw,360px)] flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast-item rounded-lg border px-4 py-3 text-sm shadow-xl ${
              toast.type === "success"
                ? "border-emerald-400/60 bg-emerald-500/95 text-white"
                : toast.type === "error"
                  ? "border-red-400/60 bg-red-500/95 text-white"
                  : "border-blue-400/60 bg-blue-500/95 text-white"
            }`}
            role="status"
            aria-live="polite"
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function ToastViewport() {
  return null;
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      showToast: (message: string, type: ToastType = "info") => {
        if (!toastSetState) return;
        const id = makeToastId();
        toastSetState((prev) => [...prev, { id, message, type }]);
        window.setTimeout(() => {
          toastSetState?.((prev) => prev.filter((toast) => toast.id !== id));
        }, 3000);
      },
    };
  }
  return ctx;
}

// ─── Global event-based ToastContainer ───────────────────────────────────────

type GlobalToast = {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'achievement';
  emoji?: string;
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<GlobalToast[]>([]);

  useEffect(() => {
    const unsub = onToast((event) => {
      const id = makeToastId();
      setToasts((prev) => [...prev, { id, ...event }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    });
    return unsub;
  }, []);

  const remove = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 9998,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        alignItems: 'flex-end',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => {
        const isAchievement = t.type === 'achievement';
        const borderColor = isAchievement
          ? 'rgba(240,180,41,0.5)'
          : t.type === 'success'
          ? 'rgba(45,212,191,0.4)'
          : t.type === 'error'
          ? 'rgba(239,68,68,0.4)'
          : 'rgba(99,179,237,0.4)';
        const accentColor = isAchievement
          ? '#f0b429'
          : t.type === 'success'
          ? '#2dd4bf'
          : t.type === 'error'
          ? '#ef4444'
          : '#63b3ed';

        return (
          <div
            key={t.id}
            role="status"
            aria-live="polite"
            style={{
              pointerEvents: 'auto',
              background: 'var(--bg-card)',
              border: `1px solid ${borderColor}`,
              borderLeft: `4px solid ${accentColor}`,
              borderRadius: 12,
              padding: isAchievement ? '12px 16px' : '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              minWidth: 240,
              maxWidth: 340,
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
              animation: 'slideInToast 0.25s ease',
            }}
          >
            {isAchievement && (
              <span style={{ fontSize: 22, lineHeight: 1 }}>{t.emoji ?? '🏆'}</span>
            )}
            {!isAchievement && (
              <span style={{ fontSize: 16, lineHeight: 1 }}>
                {t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'}
              </span>
            )}
            <span style={{
              flex: 1,
              fontSize: isAchievement ? 13 : 13,
              fontWeight: isAchievement ? 700 : 500,
              color: 'var(--text-primary)',
              lineHeight: 1.4,
            }}>
              {isAchievement && (
                <span style={{ display: 'block', fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', color: accentColor, textTransform: 'uppercase', marginBottom: 2 }}>
                  Achievement Unlocked
                </span>
              )}
              {t.message}
            </span>
            <button
              type="button"
              onClick={() => remove(t.id)}
              aria-label="Dismiss"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                fontSize: 14,
                padding: 0,
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
        );
      })}
      <style>{`
        @keyframes slideInToast {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
