"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import api from "@/lib/api";
import type { MemoryItem } from "@/types/api";

interface PersonalizeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export function PersonalizeModal({ isOpen, onClose }: PersonalizeModalProps) {
  const [interests, setInterests] = useState<MemoryItem[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [newTopic, setNewTopic] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || loaded) return;
    let cancelled = false;
    api
      .getMemory()
      .then((res) => {
        if (cancelled) return;
        setInterests(res.interests);
        setChecked(Object.fromEntries(res.interests.map((i) => [i.id, i.status === "active"])));
        setLoaded(true);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err, "Unable to load your interests."));
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, loaded]);

  if (!isOpen) {
    return null;
  }

  const isLoading = !loaded && !error;

  const close = () => {
    setNewTopic("");
    setError(null);
    setLoaded(false);
    onClose();
  };

  const handleAdd = async () => {
    const topic = newTopic.trim();
    if (!topic) return;
    setError(null);
    try {
      await api.addInterest(topic);
      setNewTopic("");
      setLoaded(false);
    } catch (err: unknown) {
      setError(errorMessage(err, "Could not add that topic."));
    }
  };

  const handleSave = async () => {
    const changed = interests.filter((i) => (i.status === "active") !== checked[i.id]);
    setIsSaving(true);
    setError(null);
    try {
      await Promise.all(
        changed.map((i) => api.setMemoryStatus(i.id, checked[i.id] ? "active" : "archived"))
      );
      close();
    } catch (err: unknown) {
      setError(errorMessage(err, "Could not save your preferences."));
      setLoaded(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#FAF8F5] border border-[#E5E0D8] rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col p-5 sm:p-6 shadow-2xl relative font-dm-sans">
        <button
          onClick={close}
          className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 text-[#68645E] hover:text-[#1A1918] p-1.5 rounded-full cursor-pointer hover:bg-[#F2EDE5]/60 transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="font-ubuntu font-bold text-base sm:text-lg text-[#1A1918] mb-1 pr-6">
          Personalize Your Briefing
        </h3>
        <p className="text-xs text-[#68645E] mb-3 sm:mb-4">
          Choose which topics shape the developments you see.
        </p>

        {error && (
          <p role="alert" className="text-xs text-[#B42318] mb-2">
            {error}
          </p>
        )}

        <div className="space-y-2.5 sm:space-y-3 mb-4 flex-1 overflow-y-auto pr-1">
          {isLoading ? (
            <p className="text-xs text-[#68645E]">Loading your interests...</p>
          ) : interests.length === 0 && !error ? (
            <p className="text-xs text-[#68645E]">You have not added any topics yet.</p>
          ) : (
            interests.map((interest) => (
              <label
                key={interest.id}
                className="flex items-center justify-between p-3 bg-white border border-[#ECE7DF] rounded-xl text-xs font-medium text-[#1A1918] cursor-pointer hover:border-[#D5CFC6] transition"
              >
                <span>{interest.topic}</span>
                <input
                  type="checkbox"
                  checked={checked[interest.id] ?? false}
                  onChange={(e) => setChecked((prev) => ({ ...prev, [interest.id]: e.target.checked }))}
                  className="accent-[#701A23] w-4 h-4 cursor-pointer"
                />
              </label>
            ))
          )}
        </div>

        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleAdd();
              }
            }}
            placeholder="Add a topic"
            className="flex-1 min-w-0 bg-white border border-[#D5CFC6] rounded-xl px-3.5 py-2 text-xs text-[#1A1918] focus:outline-none focus:border-[#701A23]"
          />
          <button
            type="button"
            onClick={() => void handleAdd()}
            disabled={!newTopic.trim()}
            className="px-4 py-2 rounded-full border border-[#D5CFC6] text-xs font-medium text-[#1A1918] hover:bg-white transition cursor-pointer disabled:opacity-50"
          >
            Add
          </button>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-[#ECE7DF] shrink-0">
          <button
            onClick={() => void handleSave()}
            disabled={isSaving || isLoading}
            className="px-4 py-2 rounded-full bg-[#701A23] text-white text-xs font-medium hover:bg-[#58141B] transition cursor-pointer min-h-[36px] disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      </div>
    </div>
  );
}
