import React from "react";
import { Bookmark } from "lucide-react";
import { TrackedStory } from "@/types/api";
import { dayOfMonth, monthShort } from "@/lib/format";

interface TrackedStoriesWidgetProps {
  stories: TrackedStory[];
  pendingIds: Set<string>;
  onUntrack: (storyId: string) => void;
}

export function TrackedStoriesWidget({ stories, pendingIds, onUntrack }: TrackedStoriesWidgetProps) {
  return (
    <section className="bg-white border border-[#ECE7DF] rounded-2xl p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-1 font-dm-sans">
        <h4 className="flex items-center gap-1.5 text-[13.5px] font-bold text-[#1A1918]">
          <Bookmark className="w-4 h-4 text-[#701A23] " aria-hidden="true" />
          Tracked Stories
        </h4>
      </div>

      {/* Story Rows */}
      <div className="space-y-3 mt-3">
        {stories.length === 0 ? (
          <div className="py-6 text-center text-[#7A746C] text-xs font-dm-sans bg-[#FAF8F5] rounded-xl border border-[#F0EBE3]">
            You are not tracking any stories yet.
          </div>
        ) : (
          stories.map((story) => (
            <div key={story.id} className="flex items-center justify-between gap-2.5 sm:gap-3">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="bg-[#FDF2F0] border border-[#FCDAD5] rounded-xl w-9 sm:w-10 h-10 sm:h-11 flex flex-col items-center justify-center shrink-0 font-dm-sans">
                  <span className="text-[8px] sm:text-[8.5px] font-bold text-[#DE6A52] tracking-wider uppercase leading-none">
                    {monthShort(story.latestAt) ?? ""}
                  </span>
                  <span className="text-[12.5px] sm:text-[13.5px] font-bold text-[#1A1918] leading-none mt-0.5">
                    {dayOfMonth(story.latestAt) ?? "-"}
                  </span>
                </div>
                <div className="min-w-0">
                  <h6 className="text-[12px] sm:text-[12.5px] font-semibold text-[#1A1918] leading-tight truncate font-ubuntu">
                    {story.title}
                    {story.hasUpdates && (
                      <span className="ml-1.5 text-[10px] font-medium text-[#701A23] font-dm-sans">Updated</span>
                    )}
                  </h6>
                  {story.latestHeadline && (
                    <p className="text-[10.5px] sm:text-[11px] text-[#68645E] leading-tight truncate mt-0.5 font-dm-sans">
                      {story.latestHeadline}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => onUntrack(story.storyId)}
                disabled={pendingIds.has(story.storyId)}
                className="text-[11px] sm:text-xs font-medium px-2.5 sm:px-3.5 py-1 min-h-[32px] rounded-full transition shrink-0 cursor-pointer font-dm-sans bg-white border border-[#D5CFC6] text-[#1A1918] hover:bg-[#F9F7F4] disabled:opacity-50"
              >
                Untrack
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
