"use client";

import React, { useEffect, useState } from "react";
import { ChevronDown, TrendingUp } from "lucide-react";
import api from "@/lib/api";
import { Collapse } from "@/components/common/Collapse";
import { useSingleOpen } from "@/hooks/useSingleOpen";
import { longDate, periodLabel } from "@/lib/format";
import { ATTENTION_LABELS, CONTINUITY_LABELS } from "@/lib/labels";
import type { Evolution, EvolutionPeriod } from "@/types/api";

interface GoalEvolutionCardProps {
  ambitionId: string;
  reloadKey: number;
}

function quietStatement(quiet: Evolution["quiet"]): string {
  if (!quiet.lastCheckedAt) {
    return "This ambition has not been checked against the news yet. Use Refresh developments on the Today page.";
  }
  const checked = longDate(quiet.lastCheckedAt) ?? "recently";
  const days = `${quiet.observedDays} day${quiet.observedDays === 1 ? "" : "s"}`;
  if (quiet.linkedInWindow === 0) {
    return `Checked ${checked}: no development has been linked to this ambition in the ${days} we have observed.`;
  }
  const latest = quiet.lastLinkedAt ? ` The latest was on ${longDate(quiet.lastLinkedAt) ?? "an earlier date"}.` : "";
  return `Checked ${checked}: ${quiet.linkedInWindow} development${quiet.linkedInWindow === 1 ? "" : "s"} linked to this ambition in the ${days} we have observed.${latest}`;
}

const PERIOD_NAMES: Record<EvolutionPeriod["period"], string> = { day: "Day", week: "Week", month: "Month", year: "Year" };

const keyOf = (entry: EvolutionPeriod) => `${entry.period}:${entry.start}`;

// One history entry: the short summary is always visible; the developments behind it open one entry at a time.
function PeriodEntry({ entry, open, onToggle }: { entry: EvolutionPeriod; open: boolean; onToggle: () => void }) {
  const count = entry.developments.length;
  return (
    <li className="pl-4 relative">
      <span className="absolute -left-[4.5px] top-1.5 w-2 h-2 rounded-full bg-[#701A23]" />
      <p className="text-[10.5px] text-[#7A746C]">
        <span className="font-semibold uppercase tracking-wide">{PERIOD_NAMES[entry.period]}</span> · {periodLabel(entry.period, entry.start)}
      </p>
      {entry.summary && <p className="text-[12.5px] text-[#1A1918] leading-snug mt-0.5">{entry.summary}</p>}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-[#701A23] cursor-pointer hover:underline"
      >
        {count} development{count === 1 ? "" : "s"}
        <ChevronDown className="chevron-turn w-3.5 h-3.5" aria-hidden="true" />
      </button>
      <Collapse open={open}>
        <ul className="pt-2 space-y-2">
          {entry.developments.map((d) => (
            <li key={d.developmentId} className="rounded-lg border border-[#F1ECE4] bg-[#FDFCFA] px-3 py-2">
              <p className="text-[10.5px] text-[#7A746C]">
                {longDate(d.occurredAt) ?? ""}
                {d.continuity ? ` · ${CONTINUITY_LABELS[d.continuity]}` : ""}
                {d.attention && d.attention !== "fyi" ? ` · ${ATTENTION_LABELS[d.attention]}` : ""}
              </p>
              <p className="text-[12px] text-[#1A1918] leading-snug">{d.headline}</p>
              {d.whyItMatters && <p className="text-[11.5px] text-[#68645E] leading-snug mt-0.5">{d.whyItMatters}</p>}
            </li>
          ))}
        </ul>
      </Collapse>
    </li>
  );
}

export function GoalEvolutionCard({ ambitionId, reloadKey }: GoalEvolutionCardProps) {
  const [evolution, setEvolution] = useState<Evolution | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { openId, toggle } = useSingleOpen();

  useEffect(() => {
    let cancelled = false;
    api
      .getEvolution(ambitionId)
      .then((res) => {
        if (cancelled) return;
        setEvolution(res.evolution);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load how this ambition has changed.");
      });
    return () => {
      cancelled = true;
    };
  }, [ambitionId, reloadKey]);

  return (
    <section className="bg-white border border-[#ECE7DF] rounded-2xl p-4 sm:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col font-dm-sans">
      <h3 className="flex items-center gap-2 font-ubuntu font-bold text-[17px] sm:text-[19px] text-[#1A1918]">
        <TrendingUp className="w-5 h-5 text-[#701A23]" aria-hidden="true" />
        How this ambition has changed
      </h3>

      {error ? (
        <p role="alert" className="mt-3 text-[12px] text-[#B42318]">
          {error}
        </p>
      ) : !evolution ? (
        <p className="mt-3 text-[12px] text-[#7A746C]">Loading...</p>
      ) : (
        <>
          <p className="mt-2 text-[12.5px] text-[#4A4742] leading-relaxed">{quietStatement(evolution.quiet)}</p>

          {evolution.changedUnderstanding.length > 0 && (
            <div className="mt-4 rounded-xl border border-[#F0D5D3] bg-[#FCF4F3] p-3">
              <h4 className="text-[12.5px] font-bold text-[#701A23]">Your understanding has changed</h4>
              <ul className="mt-1.5 space-y-2">
                {evolution.changedUnderstanding.map((c) => (
                  <li key={c.assumptionId} className="text-[12px] text-[#2C2926] leading-snug">
                    You assumed &ldquo;{c.statement}&rdquo;. Since {longDate(c.challengedAt) ?? "recently"} that is no longer
                    supported{c.reason ? `: ${c.reason}` : "."}
                    {c.headline && <span className="block text-[11px] text-[#68645E]">Prompted by: {c.headline}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {evolution.periods.length > 0 && (
            <ol className="mt-4 border-l border-[#E5DFD7] ml-1.5 space-y-4">
              {evolution.periods.map((entry) => (
                <PeriodEntry key={keyOf(entry)} entry={entry} open={openId === keyOf(entry)} onToggle={() => toggle(keyOf(entry))} />
              ))}
            </ol>
          )}
        </>
      )}
    </section>
  );
}
