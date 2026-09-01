"use client";

import { X } from "lucide-react";

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white border border-line rounded-[3px] w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-[0_8px_30px_rgba(0,0,0,0.15)]">
        <div className="flex items-center justify-between px-4 h-12 border-b border-line sticky top-0 bg-white">
          <h3 className="text-[13px] font-semibold text-ink">{title}</h3>
          <button onClick={onClose} className="text-ink-soft hover:text-black" aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
