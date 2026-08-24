"use client";

import { useEffect, type ReactNode } from "react";
import { AdminIcon } from "./admin-icons";

export default function AdminDialog({
  title,
  children,
  onClose,
  maxWidth = "max-w-2xl",
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  maxWidth?: string;
}) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-dialog-title"
    >
      <div
        className={`flex max-h-[90vh] w-full ${maxWidth} flex-col overflow-hidden rounded-2xl bg-white shadow-2xl`}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-[#e1e7ee] px-5 py-4 sm:px-6">
          <h3 id="admin-dialog-title" className="text-base font-bold text-[#172b4d]">
            {title}
          </h3>
          <button
            type="button"
            autoFocus
            onClick={onClose}
            aria-label="Tutup dialog"
            className="rounded-lg p-1.5 text-[#71829a] hover:bg-slate-100 hover:text-[#172b4d] focus:outline-none focus:ring-2 focus:ring-[#18a84f]/30"
          >
            <AdminIcon name="x" className="h-5 w-5" />
          </button>
        </header>
        <div className="overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
