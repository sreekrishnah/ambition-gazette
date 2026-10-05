"use client";

import React, { useEffect, useRef } from "react";
import { LogOut, X, Loader2 } from "lucide-react";

interface LogoutConfirmModalProps {
  isOpen: boolean;
  isLoggingOut: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function LogoutConfirmModal({
  isOpen,
  isLoggingOut,
  onClose,
  onConfirm,
}: LogoutConfirmModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoggingOut) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoggingOut, onClose]);

  // Prevent background scrolling when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoggingOut) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-title"
      aria-describedby="logout-desc"
    >
      <div
        ref={modalRef}
        className="w-full max-w-md bg-[#FAF8F5] border border-[#ECE7DF] rounded-2xl shadow-2xl p-6 sm:p-7 relative font-dm-sans animate-in zoom-in-95 duration-200"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isLoggingOut}
          className="absolute top-4 right-4 p-1.5 rounded-full text-[#68645E] hover:text-[#1A1918] hover:bg-[#F2EDE5] transition disabled:opacity-50 cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Gazette Icon Emblem */}
        <div className="w-12 h-12 rounded-2xl bg-[#701A23]/10 text-[#701A23] flex items-center justify-center mb-4.5 border border-[#701A23]/15">
          <LogOut className="w-5 h-5" />
        </div>

        {/* Header */}
        <h3
          id="logout-title"
          className="font-serif text-[21px] font-bold text-[#1A1918] tracking-tight mb-2"
        >
          Log out of Ambition Gazette?
        </h3>

        <p
          id="logout-desc"
          className="text-[13.5px] text-[#68645E] leading-relaxed mb-6"
        >
          Are you sure you want to log out? You will need to sign in again to
          access your morning intelligence dispatches and track your ambitions.
        </p>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#ECE7DF]">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoggingOut}
            className="px-4 py-2.5 rounded-xl border border-[#D5CFC6] bg-transparent text-[#524E48] hover:bg-[#F2EDE5] hover:text-[#1A1918] text-[13px] font-medium transition cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoggingOut}
            className="px-5 py-2.5 rounded-xl bg-[#701A23] hover:bg-[#58141B] text-white text-[13px] font-medium transition flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-70"
          >
            {isLoggingOut ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Logging out...</span>
              </>
            ) : (
              <span>Log out</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
