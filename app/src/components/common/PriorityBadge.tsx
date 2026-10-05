import React from "react";
import type { NextStepPriority as PriorityLevel } from "@/types/api";

interface PriorityBadgeProps {
  priority: PriorityLevel;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  switch (priority) {
    case "High Priority":
      return (
        <span className="bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-[9.5px] sm:text-[10.5px] font-medium px-2 sm:px-2.5 py-0.5 rounded-full whitespace-nowrap font-dm-sans">
          High Priority
        </span>
      );
    case "Medium Priority":
      return (
        <span className="bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] text-[9.5px] sm:text-[10.5px] font-medium px-2 sm:px-2.5 py-0.5 rounded-full whitespace-nowrap font-dm-sans">
          Medium Priority
        </span>
      );
    case "Next Step":
      return (
        <span className="bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8] text-[9.5px] sm:text-[10.5px] font-medium px-2 sm:px-2.5 py-0.5 rounded-full whitespace-nowrap font-dm-sans">
          Next Step
        </span>
      );
    default:
      return null;
  }
}
