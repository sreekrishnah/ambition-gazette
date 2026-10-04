"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { AlertCircle, RefreshCw, Home } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log unexpected errors for monitoring
    console.error("Application error captured by boundary:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1918] flex flex-col justify-between selection:bg-[#701A23]/15 selection:text-[#701A23] font-ubuntu">
      {/* Top Header Bar */}
      <header className="px-4 sm:px-6 py-3 sm:py-4 border-b border-[#ECE7DF] bg-[#FAF8F5]/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <Link href="/today" className="flex items-center gap-2 group">
            <Image
              src="/images/logo.png"
              alt="Ambition Gazette"
              width={140}
              height={45}
              className="h-7 sm:h-9 w-auto object-contain mix-blend-multiply transition-transform group-hover:scale-[1.02]"
              priority
            />
          </Link>
          <span className="text-[11px] sm:text-xs font-semibold text-[#8C867E] font-dm-sans uppercase tracking-wider">
            System Notice
          </span>
        </div>
      </header>

      {/* Main Error Card Content */}
      <main className="flex-1 flex items-center justify-center px-3.5 sm:px-6 py-6 sm:py-12">
        <div className="w-full max-w-[560px] bg-white border border-[#E8E2D8] rounded-2xl sm:rounded-[24px] p-5 sm:p-8 md:p-10 shadow-[0_8px_30px_rgba(0,0,0,0.04)] text-center relative overflow-hidden">
          {/* Subtle Burgundy Top Accent */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#701A23]" />

          {/* Icon Badge */}
          <div className="w-16 h-16 rounded-2xl bg-[#FCF4F3] border border-[#F0D5D3] text-[#701A23] flex items-center justify-center mx-auto mb-5 shadow-xs">
            <AlertCircle className="w-8 h-8 stroke-[1.7]" />
          </div>

          {/* Category Eyebrow */}
          <p className="text-[11px] font-bold tracking-[0.2em] text-[#701A23] uppercase mb-2 font-dm-sans">
            Feed Disruption
          </p>

          {/* Headline */}
          <h1 className="font-serif text-[26px] sm:text-[32px] text-[#1A1918] font-normal leading-tight tracking-tight mb-3">
            Unable to Complete This Dispatch
          </h1>

          {/* Safe User Explanation */}
          <p className="text-[13px] sm:text-[14px] text-[#68645E] leading-relaxed max-w-[440px] mx-auto mb-6 font-dm-sans">
            A temporary disruption interrupted the intelligence engine while formatting this screen. No tracked ambition data was lost.
          </p>

          {/* Error Digest (if available, for support reference) */}
          {error.digest && (
            <div className="mb-6 p-2.5 rounded-lg bg-[#FAF8F5] border border-[#ECE7DF] inline-block font-mono text-[11px] text-[#7A746C]">
              Reference code: {error.digest}
            </div>
          )}

          {/* Actions: Retry & Home */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 font-dm-sans">
            <button
              onClick={() => reset()}
              type="button"
              className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-[#701A23] hover:bg-[#58141B] text-white text-[13px] font-medium transition shadow-sm hover:shadow flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Analysis</span>
            </button>

            <Link
              href="/today"
              className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-white hover:bg-[#FAF8F5] border border-[#D5CFC6] text-[#2C2926] text-[13px] font-medium transition flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4 text-[#7A746C]" />
              <span>Return to Dashboard</span>
            </Link>
          </div>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="py-4 text-center text-xs text-[#8C867E] border-t border-[#ECE7DF] font-dm-sans">
        Ambition Gazette · Real-world events tracked and connected to what matters
      </footer>
    </div>
  );
}
