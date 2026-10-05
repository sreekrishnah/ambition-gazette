import React from "react";
import { Eye } from "lucide-react";
import type { Lens, LensItem } from "@/types/api";

interface LensPanelProps {
  lens: Lens | null;
  pendingIds: Set<string>;
  onRestore: (memoryId: string) => void;
}

function Group({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <div className="mt-3 first:mt-0">
      <h5 className="text-[11.5px] font-bold text-[#1A1918] font-ubuntu">{title}</h5>
      <p className="text-[10.5px] text-[#7A746C] font-dm-sans mt-0.5">{note}</p>
      <ul className="mt-1.5 space-y-1.5">{children}</ul>
    </div>
  );
}

function ItemRow({ item }: { item: LensItem }) {
  return (
    <li className="text-[11.5px] text-[#2C2926] leading-snug font-dm-sans">
      {item.headline}
    </li>
  );
}

export function LensPanel({ lens, pendingIds, onRestore }: LensPanelProps) {
  if (!lens || lens.checked === 0) return null;

  return (
    <section className="bg-white border border-[#ECE7DF] rounded-2xl p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      <h4 className="flex items-center gap-1.5 text-[13.5px] font-bold text-[#1A1918] font-dm-sans">
        <Eye className="w-4 h-4 text-[#701A23] " aria-hidden="true" />
        Your Lens
      </h4>
      <p className="text-[11px] text-[#68645E] font-dm-sans mt-1 leading-relaxed">
        {lens.checked} recent development{lens.checked === 1 ? "" : "s"} checked, {lens.setAside} set aside because they
        do not touch your goals.
      </p>

      <dl className="mt-2 grid grid-cols-4 gap-1 text-center font-dm-sans">
        {[
          ["Checked", lens.funnel.checked],
          ["Shown", lens.funnel.shown],
          ["Important", lens.funnel.important],
          ["Attention", lens.funnel.needsAttention],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg bg-[#FAF8F5] border border-[#F2ECE4] py-1.5">
            <dd className="text-[14px] font-bold text-[#1A1918]">{value}</dd>
            <dt className="text-[9.5px] text-[#7A746C]">{label}</dt>
          </div>
        ))}
      </dl>

      <div className="mt-3 border-t border-[#F2ECE4] pt-3">
        {lens.bigInWorld.length > 0 && (
          <Group title="Big in the world, not for you" note="Widely covered, but no link to your goals.">
            {lens.bigInWorld.map((item) => (
              <ItemRow key={item.developmentId} item={item} />
            ))}
          </Group>
        )}
        {lens.quietButYours.length > 0 && (
          <Group title="Quiet in the news, important to you" note="Little coverage, strong link to your goals.">
            {lens.quietButYours.map((item) => (
              <ItemRow key={item.developmentId} item={item} />
            ))}
          </Group>
        )}
        {lens.hidden.length > 0 && (
          <Group title="Hidden, and why" note="Set aside because of what you told us. Show again brings one back.">
            {lens.hidden.map((item) => (
              <li key={item.developmentId} className="text-[11.5px] leading-snug font-dm-sans">
                <span className="text-[#2C2926]">{item.headline}</span>
                <span className="block text-[10.5px] text-[#701A23]">{item.reason}</span>
                {item.memoryId && (
                  <button
                    type="button"
                    onClick={() => item.memoryId && onRestore(item.memoryId)}
                    disabled={pendingIds.has(item.memoryId)}
                    className="text-[10.5px] font-semibold text-[#701A23] hover:underline cursor-pointer disabled:opacity-50"
                  >
                    Show again
                  </button>
                )}
              </li>
            ))}
          </Group>
        )}
        {lens.bigInWorld.length === 0 && lens.quietButYours.length === 0 && lens.hidden.length === 0 && (
          <p className="text-[11px] text-[#7A746C] font-dm-sans">Nothing stands out between the world and your goals yet.</p>
        )}
      </div>
    </section>
  );
}
