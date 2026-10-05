"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ListChecks } from "lucide-react";
import api from "@/lib/api";
import { longDate } from "@/lib/format";
import type { Assumption } from "@/types/api";

interface AssumptionsCardProps {
  ambitionId: string;
  onChanged: () => void;
}

const MAX_LENGTH = 300;

export function AssumptionsCard({ ambitionId, onChanged }: AssumptionsCardProps) {
  const [assumptions, setAssumptions] = useState<Assumption[]>([]);
  const [draft, setDraft] = useState("");
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

  return (
    <section className="bg-white border border-[#ECE7DF] rounded-2xl p-5 sm:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col">
      <h3 className="flex items-center gap-2 font-ubuntu font-bold text-[17px] sm:text-[19px] text-[#1A1918]">
        <ListChecks className="w-4 h-4 text-[#701A23] sm:w-5 sm:h-5" aria-hidden="true" />
        What your plan assumes
      </h3>
      <p className="text-[12px] text-[#68645E] font-dm-sans mt-1 leading-relaxed">
        State what must stay true for this ambition to work. When a later development gives a specific reason to doubt one,
        it is flagged as needing your attention. Nothing is added for you.
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
            <li key={a.id} className="py-2.5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[12.5px] text-[#1A1918] leading-snug">{a.statement}</p>
                {a.status === "challenged" ? (
                  <p className="text-[11px] text-[#701A23] mt-0.5 leading-snug">
                    Challenged{a.challengedAt ? ` on ${longDate(a.challengedAt) ?? ""}` : ""}
                    {a.challengeReason ? `: ${a.challengeReason}` : ""}
                  </p>
                ) : (
                  <p className="text-[11px] text-[#7A746C] mt-0.5">Holding</p>
                )}
              </div>
              <div className="shrink-0 flex gap-3">
                {a.status === "challenged" && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void run(() => api.restoreAssumption(ambitionId, a.id))}
                    className="text-[11px] font-semibold text-[#701A23] hover:underline cursor-pointer disabled:opacity-50"
                  >
                    Mark as holding
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void run(() => api.deleteAssumption(ambitionId, a.id))}
                  className="text-[11px] font-medium text-[#7A756D] hover:underline cursor-pointer disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
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
          placeholder="Something that must stay true for your plan"
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
    </section>
  );
}
