"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import { AmbitionData, AmbitionEdit } from "@/types/ambitions";

interface EditAmbitionModalProps {
  isOpen: boolean;
  initialData: AmbitionData;
  isSaving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (data: AmbitionEdit) => void;
}

export function EditAmbitionModal({
  isOpen,
  initialData,
  isSaving,
  error,
  onClose,
  onSave,
}: EditAmbitionModalProps) {
  const [form, setForm] = useState<AmbitionEdit>(initialData);


  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#FAF8F5] border border-[#E5E0D8] rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col p-5 sm:p-6 shadow-2xl relative font-ubuntu">
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 text-[#68645E] hover:text-[#1A1918] p-1.5 rounded-full cursor-pointer hover:bg-[#F2EDE5]/60 transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="font-ubuntu font-bold text-lg sm:text-xl text-[#1A1918] mb-1 pr-6">
          Edit Ambition Details
        </h3>
        <p className="text-xs text-[#68645E] mb-4 font-ubuntu">
          Update key parameters to refine your briefing.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3.5 font-dm-sans flex-1 overflow-y-auto pr-1">
          <div>
            <label className="block text-xs font-semibold text-[#1A1918] mb-1">
              Ambition Title
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full bg-white border border-[#D5CFC6] rounded-xl px-3.5 py-2 text-xs text-[#1A1918] focus:outline-none focus:border-[#701A23] font-ubuntu"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1A1918] mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full bg-white border border-[#D5CFC6] rounded-xl px-3.5 py-2 text-xs text-[#1A1918] focus:outline-none focus:border-[#701A23] resize-none font-ubuntu"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1A1918] mb-1">
              Time Horizon
            </label>
            <input
              type="text"
              value={form.timeHorizon}
              onChange={(e) => setForm({ ...form, timeHorizon: e.target.value })}
              className="w-full bg-white border border-[#D5CFC6] rounded-xl px-3.5 py-2 text-xs text-[#1A1918] focus:outline-none focus:border-[#701A23] font-ubuntu"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1A1918] mb-1">
              Location
            </label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="w-full bg-white border border-[#D5CFC6] rounded-xl px-3.5 py-2 text-xs text-[#1A1918] focus:outline-none focus:border-[#701A23] font-ubuntu"
            />
          </div>

          {error && (
            <p role="alert" className="text-xs text-[#B42318]">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2.5 pt-3 border-t border-[#ECE7DF] shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#D5CFC6] text-xs font-medium text-[#524E48] hover:bg-white transition cursor-pointer min-h-[36px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-[#701A23] hover:bg-[#58141B] text-white text-xs font-medium transition cursor-pointer min-h-[36px] disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
