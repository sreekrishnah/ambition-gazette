"use client";

import React, { useState } from "react";
import { Newspaper } from "lucide-react";

interface ThumbnailProps {
  src: string | null | undefined;
  size?: "sm" | "md";
}

const SIZES = { sm: "w-12 h-12 rounded-lg", md: "w-16 h-16 sm:w-20 sm:h-20 rounded-xl" } as const;

/** The picture a publisher supplied for the event, or a neutral tile when there is none or it fails to load. */
export function Thumbnail({ src, size = "md" }: ThumbnailProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const shown = Boolean(src) && !failed;

  return (
    <div className={`${SIZES[size]} shrink-0 overflow-hidden bg-[#F3EEE6] border border-[#ECE7DF] flex items-center justify-center`}>
      {shown ? (
        // Publisher images come from many hosts, so they are not routed through the image optimiser.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src ?? undefined}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`w-full h-full object-cover transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      ) : (
        <Newspaper className="w-5 h-5 text-[#B8AFA2]" aria-hidden="true" />
      )}
    </div>
  );
}
