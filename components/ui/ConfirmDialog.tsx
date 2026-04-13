"use client";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  tone?: "default" | "danger";
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  loading = false,
  tone = "default",
}: ConfirmDialogProps) {
  if (!open) {
    return null;
  }

  const confirmButtonClass =
    tone === "danger"
      ? "bg-[#93000a] text-white hover:bg-[#7a0008] shadow-[0_14px_28px_rgba(147,0,10,0.18)]"
      : "bg-gradient-to-br from-[#003ec7] to-[#0052ff] text-white shadow-[0_14px_28px_rgba(0,82,255,0.22)] hover:shadow-[0_18px_36px_rgba(0,82,255,0.32)]";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#111c2d]/35 p-4 backdrop-blur-md"
    >
      <div className="w-full max-w-md rounded-[1.75rem] bg-[#f9f9ff] p-6 shadow-[0_32px_64px_rgba(17,28,45,0.18)] ring-1 ring-[#c3c5d9]/20">
        <div>
          <p className="text-[11px] font-extrabold tracking-[0.24em] text-[#434656]">
            CONFIRM
          </p>
          <h3 className="font-headline mt-1 text-2xl font-extrabold tracking-tight text-[#111c2d]">
            {title}
          </h3>
          <p className="mt-3 text-sm leading-6 text-[#57657a]">{description}</p>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-[#434656] shadow-sm transition hover:bg-[#dee8ff] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={loading}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-55 ${confirmButtonClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
