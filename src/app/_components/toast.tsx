"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

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
