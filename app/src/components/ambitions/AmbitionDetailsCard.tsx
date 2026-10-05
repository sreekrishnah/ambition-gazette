import React from "react";
import { Pencil, Target } from "lucide-react";
import { AmbitionData } from "@/types/ambitions";

interface AmbitionDetailsCardProps {
  data: AmbitionData;
  onEdit: () => void;
}

export function AmbitionDetailsCard({ data, onEdit }: AmbitionDetailsCardProps) {
  return (
    <section className="bg-white border border-[#ECE7DF] rounded-2xl p-5 sm:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-2 font-dm-sans">
          <h3 className="flex items-center gap-2 font-ubuntu font-bold text-[17px] sm:text-[19px] text-[#1A1918]">
            <Target className="w-4 h-4 text-[#701A23] sm:w-5 sm:h-5" aria-hidden="true" />
            Ambition Details
          </h3>
          <button
            onClick={onEdit}
            className="bg-white border border-[#ECE7DF] hover:bg-[#FAF8F5] text-[#1A1918] text-xs font-medium px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition shadow-xs cursor-pointer active:scale-95"
          >
            <Pencil className="w-3.5 h-3.5 text-[#524E48]" />
            <span>Edit</span>
          </button>
        </div>

        {/* Table / List */}
        <div className="divide-y divide-[#F2EDE5]">
          {/* Description */}
          <div className="py-2.5 sm:py-3.5 flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
            <span className="w-auto sm:w-[130px] shrink-0 text-[11.5px] sm:text-[12.5px] text-[#7A746C] font-normal pt-0.5 font-dm-sans">
              Description
            </span>
            <span className="flex-1 text-[12px] sm:text-[12.5px] text-[#1A1918] font-medium leading-relaxed font-ubuntu">
              {data.description}
            </span>
          </div>

          {/* Role */}
          {data.role && (
            <div className="py-2.5 sm:py-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
              <span className="w-auto sm:w-[130px] shrink-0 text-[11.5px] sm:text-[12.5px] text-[#7A746C] font-normal font-dm-sans">
                Role
              </span>
              <span className="flex-1 text-[12px] sm:text-[12.5px] text-[#1A1918] font-medium font-ubuntu">
                {data.role}
              </span>
            </div>
          )}

          {/* Activity */}
          {data.activity && (
            <div className="py-2.5 sm:py-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
              <span className="w-auto sm:w-[130px] shrink-0 text-[11.5px] sm:text-[12.5px] text-[#7A746C] font-normal font-dm-sans">
                Activity
              </span>
              <span className="flex-1 text-[12px] sm:text-[12.5px] text-[#1A1918] font-medium font-ubuntu">
                {data.activity}
              </span>
            </div>
          )}

          {/* Topics */}
          {data.topics.length > 0 && (
            <div className="py-2.5 sm:py-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
              <span className="w-auto sm:w-[130px] shrink-0 text-[11.5px] sm:text-[12.5px] text-[#7A746C] font-normal font-dm-sans">
                Topics
              </span>
              <span className="flex-1 text-[12px] sm:text-[12.5px] text-[#1A1918] font-medium font-ubuntu">
                {data.topics.join(", ")}
              </span>
            </div>
          )}

          {/* Time Horizon */}
          <div className="py-2.5 sm:py-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
            <span className="w-auto sm:w-[130px] shrink-0 text-[11.5px] sm:text-[12.5px] text-[#7A746C] font-normal font-dm-sans">
              Time Horizon
            </span>
            <span className="flex-1 text-[12px] sm:text-[12.5px] text-[#1A1918] font-medium font-ubuntu">
              {data.timeHorizon}
            </span>
          </div>

          {/* Location */}
          <div className="pt-2.5 sm:pt-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
            <span className="w-auto sm:w-[130px] shrink-0 text-[11.5px] sm:text-[12.5px] text-[#7A746C] font-normal font-dm-sans">
              Location
            </span>
            <span className="flex-1 text-[12px] sm:text-[12.5px] text-[#1A1918] font-medium font-ubuntu">
              {data.location}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
