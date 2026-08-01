"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Check, Info, X } from "lucide-react";

export type ToastTone = "info" | "success" | "error";

export type Toast = {
  id: number;
  tone: ToastTone;
  message: string;
};

const dismissAfter: Record<ToastTone, number> = {
  info: 5000,
  success: 5000,
  error: 8000
};

const toneIcon = {
  info: Info,
  success: Check,
  error: AlertCircle
} as const;

/**
 * Transient feedback for export, checkout and share outcomes. These used to be
 * static paragraphs buried in the export tab, which meant a failed action could
 * report itself into a panel the user was not looking at.
 */
export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (message: string, tone: ToastTone = "info") => {
      const id = nextId.current++;
      setToasts((current) => [...current.slice(-2), { id, tone, message }]);
      timers.current.set(
        id,
        window.setTimeout(() => dismiss(id), dismissAfter[tone])
      );
      return id;
    },
    [dismiss]
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((timer) => window.clearTimeout(timer));
      pending.clear();
    };
  }, []);

  return { toasts, push, dismiss };
}

export function ToastRegion({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="toast-region" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => {
        const Icon = toneIcon[toast.tone];
        return (
          <div key={toast.id} className={`toast ${toast.tone}`} role={toast.tone === "error" ? "alert" : "status"}>
            <Icon size={14} aria-hidden="true" />
            <span className="toast-text">{toast.message}</span>
            <button
              type="button"
              className="toast-dismiss"
              aria-label="Dismiss notification"
              onClick={() => onDismiss(toast.id)}
            >
              <X size={13} aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
