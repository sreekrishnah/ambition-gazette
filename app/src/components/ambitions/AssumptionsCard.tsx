"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ListChecks, Sparkles } from "lucide-react";
import api from "@/lib/api";
import { longDate } from "@/lib/format";
import type { Assumption, AssumptionState, AssumptionSuggestion } from "@/types/api";

interface AssumptionsCardProps {
  ambitionId: string;
  onChanged: () => void;
}

const MAX_LENGTH = 300;

const STATE_LABEL: Record<AssumptionState, { text: string; className: string }> = {
  stable: { text: "Looks fine", className: "text-[#2F5D2B]" },
  watch: { text: "Keep watch", className: "text-[#7A5600]" },
  reconsider: { text: "Check this", className: "text-[#9B2216]" },
};

export function AssumptionsCard({ ambitionId, onChanged }: AssumptionsCardProps) {
  const [assumptions, setAssumptions] = useState<Assumption[]>([]);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [suggestions, setSuggestions] = useState<AssumptionSuggestion[] | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    () =>
      api
        .getAssumptions(ambitionId)
        .then((res) => {
          setAssumptions(res.assumptions);
          setError(null);
        })
        .catch((err: unknown) => setError(err instanceof Error ? err.message : "Unable to load your assumptions."))
        .finally(() => setLoading(false)),
    [ambitionId],
  );

  useEffect(() => {
    // The promise settles asynchronously, so state is never set synchronously inside the effect.
    load();
  }, [load]);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await load();
      onChanged();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not save your change.");
    } finally {
      setBusy(false);
    }
  };

  const add = (event: React.FormEvent) => {
    event.preventDefault();
    const statement = draft.trim();
    if (statement.length < 5) return;
    void run(async () => {
      await api.addAssumption(ambitionId, statement);
      setDraft("");
    });
  };

  const saveEdit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing || editing.text.trim().length < 5) return;
    const { id, text } = editing;
    void run(async () => {
      await api.updateAssumption(ambitionId, id, text.trim());
      setEditing(null);
    });
  };

  const suggest = async () => {
    setSuggesting(true);
    setError(null);
    try {
      setSuggestions((await api.suggestAssumptions(ambitionId)).suggestions);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not suggest assumptions right now.");
    } finally {
      setSuggesting(false);
    }
  };

  // A suggestion is only a candidate: it becomes an assumption when the person adds it.
  const accept = (suggestion: AssumptionSuggestion) =>
    void run(async () => {
      await api.addAssumption(ambitionId, suggestion.statement);
      setSuggestions((prev) => (prev ? prev.filter((s) => s.statement !== suggestion.statement) : prev));
    });

  return (
    <section className="bg-white border border-[#ECE7DF] rounded-2xl p-5 sm:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col">
      <h3 className="flex items-center gap-2 font-ubuntu font-bold text-[17px] sm:text-[19px] text-[#1A1918]">
        <ListChecks className="w-4 h-4 text-[#701A23] sm:w-5 sm:h-5" aria-hidden="true" />
        What your plan depends on
      </h3>
      <p className="text-[12px] text-[#68645E] font-dm-sans mt-1 leading-relaxed">
        Write down what has to stay true for your plan to work. We watch the news and tell you when something changes.
        Only assumptions you add are tested.
      </p>

      {loading ? (
        <p className="text-[12px] text-[#7A746C] font-dm-sans mt-4">Loading...</p>
      ) : assumptions.length === 0 ? (
        <p className="text-[12px] text-[#7A746C] font-dm-sans mt-4">
          No assumptions yet. Example: &ldquo;Government subsidies for rooftop solar continue through 2027.&rdquo;
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-[#F2EDE5] font-dm-sans">
          {assumptions.map((a) => (
            <li key={a.id} className="py-2.5">
              {editing?.id === a.id ? (
                <form onSubmit={saveEdit} className="flex flex-col sm:flex-row gap-2">
                  <label htmlFor={`edit-${a.id}`} className="sr-only">
                    Edit assumption
                  </label>
                  <input
                    id={`edit-${a.id}`}
                    value={editing.text}
                    maxLength={MAX_LENGTH}
                    onChange={(e) => setEditing({ id: a.id, text: e.target.value })}
                    className="flex-1 min-w-0 rounded-xl border border-[#E5DFD7] bg-[#FAF8F5] px-3 py-2 text-[12.5px] text-[#1A1918] outline-none focus:border-[#701A23]"
                  />
                  <button type="submit" disabled={busy || editing.text.trim().length < 5} className="rounded-full bg-[#701A23] text-white text-[12px] font-medium px-4 py-2 cursor-pointer disabled:opacity-50">
                    Save
                  </button>
                  <button type="button" onClick={() => setEditing(null)} className="text-[11px] font-medium text-[#7A756D] hover:underline cursor-pointer">
                    Cancel
                  </button>
                </form>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[12.5px] text-[#1A1918] leading-snug">{a.statement}</p>
                    <p className={`text-[11px] mt-0.5 leading-snug ${STATE_LABEL[a.state].className}`}>
                      {STATE_LABEL[a.state].text}
                      {a.state !== "stable" && a.challengedAt ? ` since ${longDate(a.challengedAt) ?? ""}` : ""}
                      {a.state !== "stable" && a.challengeReason ? `: ${a.challengeReason}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 flex gap-3">
                    {a.state !== "stable" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void run(() => api.restoreAssumption(ambitionId, a.id))}
                        className="text-[11px] font-semibold text-[#701A23] hover:underline cursor-pointer disabled:opacity-50"
                      >
                        Still true
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setEditing({ id: a.id, text: a.statement })}
                      className="text-[11px] font-medium text-[#701A23] hover:underline cursor-pointer disabled:opacity-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void run(() => api.deleteAssumption(ambitionId, a.id))}
                      className="text-[11px] font-medium text-[#7A756D] hover:underline cursor-pointer disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p role="alert" className="mt-3 text-[11.5px] text-[#B42318] font-dm-sans">
          {error}
        </p>
      )}

      <form onSubmit={add} className="mt-4 flex flex-col sm:flex-row gap-2 font-dm-sans">
        <label htmlFor="assumption-input" className="sr-only">
          New assumption
        </label>
        <input
          id="assumption-input"
          value={draft}
          maxLength={MAX_LENGTH}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Something your plan depends on"
          className="flex-1 min-w-0 rounded-xl border border-[#E5DFD7] bg-[#FAF8F5] px-3 py-2 text-[12.5px] text-[#1A1918] outline-none focus:border-[#701A23]"
        />
        <button
          type="submit"
          disabled={busy || draft.trim().length < 5}
          className="rounded-full bg-[#701A23] hover:bg-[#58141B] text-white text-[12px] font-medium px-4 py-2 cursor-pointer disabled:opacity-50"
        >
          Add assumption
        </button>
      </form>

      <div className="mt-3 font-dm-sans">
        <button
          type="button"
          onClick={() => void suggest()}
          disabled={suggesting || busy}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#701A23] px-3.5 py-1.5 text-[12px] font-medium text-[#701A23] hover:bg-[#FCF4F3] cursor-pointer disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
          {suggesting ? "Thinking..." : "Suggest ideas"}
        </button>
        {suggestions && (
          <div className="mt-3">
            {suggestions.length === 0 ? (
              <p className="text-[12px] text-[#7A746C]">Nothing new to suggest.</p>
            ) : (
              <>
                <p className="text-[11px] text-[#7A746C] leading-snug">Suggestions from our AI, based only on your ambition. Add the ones that are true for you.</p>
                <ul className="mt-2 flex flex-col gap-2">
                  {suggestions.map((s) => (
                    <li key={s.statement} className="flex items-start justify-between gap-3 rounded-xl border border-[#ECE7DF] bg-[#FAF8F5] px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#948E85]">{s.area}</p>
                        <p className="text-[12.5px] text-[#1A1918] leading-snug">{s.statement}</p>
                      </div>
                      <button type="button" disabled={busy} onClick={() => accept(s)} className="shrink-0 rounded-full border border-[#701A23] px-3 py-1 text-[11px] font-semibold text-[#701A23] hover:bg-[#FCF4F3] cursor-pointer disabled:opacity-50">
                        Add
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
