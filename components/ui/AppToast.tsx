"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useEffect } from "react";

export default function AppToast({
  message,
  tone = "success",
  onClose,
}: {
  message: string | null;
  tone?: "success" | "error";
  onClose: () => void;
}) {
  useEffect(() => {
    if (!message) {
      return;
    }

    const timer = window.setTimeout(() => {
      onClose();
    }, 2600);

    return () => {
      window.clearTimeout(timer);
    };
  }, [message, onClose]);

  if (!message) {
    return null;
  }

  const isError = tone === "error";
  const Icon = isError ? AlertCircle : CheckCircle2;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[70] flex max-w-sm items-start gap-3 rounded-2xl bg-[var(--surface-container-lowest)] px-4 py-3 shadow-[0_24px_48px_rgba(17,28,45,0.18)] ring-1 ring-[color:color-mix(in_srgb,var(--outline-variant)_24%,transparent)]">
      <div
        className={`mt-0.5 rounded-full p-1 ${
          isError
            ? "bg-[var(--error-container)] text-[var(--error)]"
            : "bg-[var(--secondary-container)] text-[var(--primary)]"
        }`}
      >
        <Icon className="h-4 w-4" strokeWidth={1.9} />
      </div>
      <p className="text-sm font-semibold text-[var(--on-surface)]">{message}</p>
    </div>
  );
}
