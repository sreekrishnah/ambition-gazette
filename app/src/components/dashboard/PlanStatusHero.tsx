"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronDown, ExternalLink, Eye } from "lucide-react";
import type { AssumptionDecision, AssumptionEffect, AssumptionState, PlanAmbition, PlanAssumption, PlanStatus } from "@/types/api";
import { Collapse } from "@/components/common/Collapse";
import { dayOfMonth, monthShort } from "@/lib/format";
import { AssumptionDecisionButtons } from "./AssumptionDecisionButtons";

interface PlanStatusHeroProps {
  plan: PlanStatus | null;
  deciding: string | null;
  onDecide: (ambitionId: string, assumptionId: string, decision: AssumptionDecision) => void;
}

const STATE_STYLE: Record<AssumptionState, { label: string; dot: string; pill: string }> = {
  stable: { label: "Looks fine", dot: "bg-[#2F7D3A]", pill: "border-[#CFE3CC] bg-[#F3FAF1] text-[#2F5D2B]" },
  watch: { label: "Keep watch", dot: "bg-[#D18A00]", pill: "border-[#EBD9A8] bg-[#FFF8E3] text-[#7A5600]" },
  reconsider: { label: "Check this", dot: "bg-[#C8301F]", pill: "border-[#F1C5BF] bg-[#FFF1EF] text-[#9B2216]" },
};

const STATE_ICON = { stable: CheckCircle2, watch: Eye, reconsider: AlertTriangle } as const;
const STATE_ICON_COLOR: Record<AssumptionState, string> = { stable: "text-[#2F7D3A]", watch: "text-[#D18A00]", reconsider: "text-[#C8301F]" };

const EFFECT_LABEL: Record<AssumptionEffect, string> = {
  challenges: "Bad news",
  supports: "Good news",
  opportunity: "New chance",
};

// The count is shown as a notification-style badge next to the text, so the text itself stays plural and short.
function headline(plan: PlanStatus): { text: string; count: number } {
  const { reconsider, watch, assumptions } = plan.totals;
  if (assumptions === 0) return { text: "Add what your plan depends on", count: 0 };
  if (reconsider > 0) return { text: "Assumptions need a second look", count: reconsider };
  if (watch > 0) return { text: "Assumptions to keep an eye on", count: watch };
  return { text: "Your plan holds", count: 0 };
}

function shortDate(iso: string): string {
  const day = dayOfMonth(iso);
  const month = monthShort(iso);
  return day && month ? `${day} ${month}` : "";
}

interface RowProps {
  ambition: PlanAmbition;
  assumption: PlanAssumption;
  deciding: string | null;
  onDecide: PlanStatusHeroProps["onDecide"];
}

function AssumptionRow({ ambition, assumption, deciding, onDecide }: RowProps) {
  const [open, setOpen] = useState(assumption.state !== "stable");
  const [history, setHistory] = useState(false);
  const style = STATE_STYLE[assumption.state];

  return (
    <li className="rounded-xl border border-[#ECE7DF] bg-white">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="w-full flex items-center gap-3 px-3 py-2.5 text-left cursor-pointer">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`} aria-hidden="true" />
        <span className="min-w-0 flex-1 text-[12.5px] leading-snug text-[#1A1918] font-ubuntu">{assumption.statement}</span>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold font-dm-sans ${style.pill}`}>{style.label}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-[#948E85] transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      <Collapse open={open}>
        <div className="px-3 pb-3 flex flex-col gap-2.5">
          {assumption.evidence.length === 0 ? (
            <p className="text-[11.5px] text-[#7A756D] font-dm-sans">No news about this yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {assumption.evidence.slice(0, 3).map((e) => (
                <li key={e.developmentId} className={`rounded-lg border px-3 py-2 ${e.counts ? "border-[#ECE7DF] bg-[#FAF8F5]" : "border-dashed border-[#E5DFD7] opacity-60"}`}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#948E85] font-dm-sans">
                    {EFFECT_LABEL[e.effect]}
                    {shortDate(e.occurredAt) ? ` · ${shortDate(e.occurredAt)}` : ""}
                    {e.counts ? "" : " · handled"}
                  </p>
                  <p className="mt-0.5 text-[12px] font-semibold leading-snug text-[#1A1918] font-ubuntu">{e.headline}</p>
                  <p className="mt-0.5 text-[11.5px] leading-snug text-[#4A4742] font-ubuntu line-clamp-2">{e.reason}</p>
                  {e.reconsider && e.effect === "challenges" && e.counts && (
                    <p className="mt-1 text-[11.5px] leading-snug text-[#701A23] font-ubuntu line-clamp-2">{e.reconsider}</p>
                  )}
                  {e.sources.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5 font-dm-sans">
                      {e.sources.slice(0, 2).map((s) => (
                        <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full border border-[#ECE7DF] bg-white px-2 py-0.5 text-[10.5px] font-medium text-[#2C2926] hover:bg-[#F3EFE9]">
                          {s.name}
                          <ExternalLink className="w-3 h-3 text-[#7A756D]" aria-hidden="true" />
                        </a>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          {assumption.state !== "stable" && (
            <AssumptionDecisionButtons ambitionId={ambition.id} assumptionId={assumption.id} busy={deciding === assumption.id} onDecide={onDecide} />
          )}

          <div>
            <button type="button" onClick={() => setHistory((v) => !v)} aria-expanded={history} className="text-[11px] font-medium text-[#701A23] hover:underline cursor-pointer font-dm-sans">
              {history ? "Hide past updates" : "Past updates"}
            </button>
            {history && (
              <ol className="mt-1.5 space-y-1 border-l border-[#D9D2C6] pl-3">
                {assumption.timeline.map((t, i) => (
                  <li key={`${t.at}-${i}`} className="text-[11px] leading-snug text-[#4A4742] font-dm-sans">
                    <span className="text-[#948E85]">{shortDate(t.at)}</span> {t.text}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </Collapse>
    </li>
  );
}

/** The first thing on the dashboard: which assumptions behind the plan still hold, and which are in doubt. */
export function PlanStatusHero({ plan, deciding, onDecide }: PlanStatusHeroProps) {
  if (!plan) return <div className="h-28 rounded-2xl border border-[#ECE7DF] bg-white animate-pulse" aria-hidden="true" />;
  const withAssumptions = plan.ambitions.filter((a) => a.assumptions.length > 0);
  const overall: AssumptionState = plan.totals.reconsider > 0 ? "reconsider" : plan.totals.watch > 0 ? "watch" : "stable";
  const title = headline(plan);
  const Icon = STATE_ICON[overall];

  return (
    <div className="rounded-2xl border border-[#E8D5D2] bg-white p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="flex items-center gap-2.5">
        {plan.totals.assumptions > 0 && <Icon className={`w-6 h-6 shrink-0 ${STATE_ICON_COLOR[overall]}`} aria-hidden="true" />}
        <h3 className="font-ubuntu text-[20px] sm:text-[24px] font-bold leading-tight text-[#1A1918]">{title.text}</h3>
        {title.count > 0 && (
          <span
            className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[12px] font-bold font-dm-sans text-white ${overall === "reconsider" ? "bg-[#C8301F]" : "bg-[#D18A00]"}`}
            aria-label={`${title.count} ${title.count === 1 ? "assumption" : "assumptions"}`}
          >
            {title.count}
          </span>
        )}
      </div>

      {plan.totals.assumptions === 0 ? (
        <Link href="/ambitions" className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#701A23] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#58141B]">
          Add assumptions
          <span aria-hidden="true">&rarr;</span>
        </Link>
      ) : (
        <div className="mt-3 flex flex-col gap-4">
          {withAssumptions.map((ambition) => (
            <div key={ambition.id}>
              <p className="mb-1.5 text-[11.5px] font-semibold text-[#68645E] font-dm-sans line-clamp-1">{ambition.title}</p>
              <ul className="flex flex-col gap-2">
                {ambition.assumptions.map((a) => (
                  <AssumptionRow key={a.id} ambition={ambition} assumption={a} deciding={deciding} onDecide={onDecide} />
                ))}
              </ul>
            </div>
          ))}
          <p className="text-[11px] text-[#7A756D] font-dm-sans">
            We read {plan.checked} news items and ignored {plan.setAside} that do not affect you.
          </p>
        </div>
      )}
    </div>
  );
}
