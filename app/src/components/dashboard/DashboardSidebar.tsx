"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Home, Target, LogOut } from "lucide-react";
import { logoutUser } from "@/app/actions";
import { clearClientSession } from "@/lib/auth";
import { LogoutConfirmModal } from "@/components/dashboard/LogoutConfirmModal";

interface DashboardSidebarProps {
  activeNav?: "home" | "ambitions" | "agent";
}

export function DashboardSidebar({ activeNav = "home" }: DashboardSidebarProps) {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleInitiateLogout = () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logoutUser();
    } catch (err: unknown) {
      console.error("Logout error:", err);
    } finally {
      clearClientSession();
      window.location.replace("/login");
    }
  };

  return (
    <>
      {/* 1. Mobile Top App Bar (Visible only on < md screens, without hamburger menu) */}
      <header className="md:hidden w-full bg-[#FAF8F5] border-b border-[#ECE7DF] px-4 py-2.5 flex items-center justify-between sticky top-0 z-30">
        <Link href="/today" className="flex items-center group">
          <Image
            src="/images/logo.png"
            alt="Ambition Gazette"
            width={130}
            height={50}
            className="w-[120px] h-auto max-h-[42px] object-contain object-left mix-blend-multiply transition-transform group-hover:scale-[1.02]"
            priority
          />
        </Link>
      </header>

      {/* 2. Mobile Bottom Navigation Bar (Fixed at bottom on < md screens) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FAF8F5]/95 backdrop-blur-md border-t border-[#ECE7DF] px-2 py-1.5 flex items-center justify-around shadow-[0_-2px_8px_rgba(0,0,0,0.03)]"
      >
        {/* Home */}
        <Link
          href="/today"
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg min-w-[64px] transition ${
            activeNav === "home" ? "text-[#701A23] font-semibold" : "text-[#68645E] hover:text-[#1A1918]"
          }`}
        >
          <Home className={`w-5 h-5 ${activeNav === "home" ? "fill-[#701A23] stroke-[#701A23]" : ""}`} />
          <span className="text-[10px] mt-0.5 font-dm-sans">Home</span>
        </Link>

        {/* Ambitions */}
        <Link
          href="/ambitions"
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg min-w-[64px] transition ${
            activeNav === "ambitions" ? "text-[#701A23] font-semibold" : "text-[#68645E] hover:text-[#1A1918]"
          }`}
        >
          <Target className={`w-5 h-5 ${activeNav === "ambitions" ? "fill-[#701A23] stroke-[#701A23]" : ""}`} />
          <span className="text-[10px] mt-0.5 font-dm-sans">Ambitions</span>
        </Link>

        {/* Agent */}
        <Link
          href="/agent"
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg min-w-[64px] transition ${
            activeNav === "agent" ? "text-[#701A23] font-semibold" : "text-[#68645E] hover:text-[#1A1918]"
          }`}
        >
          <svg
            className={`w-5 h-5 ${activeNav === "agent" ? "text-[#701A23]" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3" />
            <path d="M12 19v3" />
            <path d="M2 12h3" />
            <path d="M19 12h3" />
            <path d="m4.93 4.93 2.12 2.12" />
            <path d="m16.95 16.95 2.12 2.12" />
            <path d="m4.93 19.07 2.12-2.12" />
            <path d="m16.95 7.05 2.12-2.12" />
          </svg>
          <span className="text-[10px] mt-0.5 font-dm-sans">Agent</span>
        </Link>

        {/* Log Out */}
        <button
          onClick={handleInitiateLogout}
          type="button"
          className="flex flex-col items-center justify-center py-1 px-3 rounded-lg min-w-[64px] text-[#68645E] hover:text-[#701A23] transition cursor-pointer group"
          aria-label="Log out"
        >
          <LogOut className="w-5 h-5 text-[#68645E] group-hover:text-[#701A23] transition-colors" />
          <span className="text-[10px] mt-0.5 font-dm-sans">Log out</span>
        </button>
      </nav>

      {/* 3. Desktop Sidebar (md and above) */}
      <aside className="hidden md:flex w-[220px] lg:w-[230px] shrink-0 border-r border-[#ECE7DF] bg-[#FAF8F5] px-5 py-5 flex-col justify-between sticky top-0 h-screen z-30">
        <div>
          {/* Brand Logo - Centered with controllable width & tight gap */}
          <div className="w-full flex justify-center items-center">
            <Link href="/today" className="flex items-center justify-center group">
              <Image
                src="/images/logo.png"
                alt="Ambition Gazette"
                width={170}
                height={75}
                className="w-[160px] h-auto max-h-[58px] object-contain object-center mix-blend-multiply transition-transform group-hover:scale-[1.02]"
                style={{ width: "160px", height: "auto" }}
                priority
              />
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="mt-3.5 space-y-1.5 font-dm-sans" aria-label="Desktop Main Navigation">
            {/* Home */}
            <Link
              href="/today"
              className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-[13px] transition ${
                activeNav === "home"
                  ? "bg-[#F8EAE7] text-[#701A23] font-semibold"
                  : "text-[#524E48] hover:text-[#1A1918] hover:bg-[#F2EDE5]/60 font-medium"
              }`}
            >
              <Home className={`w-[18px] h-[18px] ${activeNav === "home" ? "fill-[#701A23] stroke-[#701A23]" : "text-[#524E48]"}`} />
              <span>Home</span>
            </Link>

            {/* My Ambitions */}
            <Link
              href="/ambitions"
              className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-[13px] transition ${
                activeNav === "ambitions"
                  ? "bg-[#F8EAE7] text-[#701A23] font-semibold"
                  : "text-[#524E48] hover:text-[#1A1918] hover:bg-[#F2EDE5]/60 font-medium"
              }`}
            >
              <Target className={`w-[18px] h-[18px] ${activeNav === "ambitions" ? "fill-[#701A23] stroke-[#701A23]" : "text-[#524E48]"}`} />
              <span>My Ambitions</span>
            </Link>

            {/* Agent */}
            <Link
              href="/agent"
              className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-[13px] transition ${
                activeNav === "agent"
                  ? "bg-[#F8EAE7] text-[#701A23] font-semibold"
                  : "text-[#524E48] hover:text-[#1A1918] hover:bg-[#F2EDE5]/60 font-medium"
              }`}
            >
              <svg
                className={`w-[18px] h-[18px] ${activeNav === "agent" ? "text-[#701A23]" : "text-[#524E48]"}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v3" />
                <path d="M12 19v3" />
                <path d="M2 12h3" />
                <path d="M19 12h3" />
                <path d="m4.93 4.93 2.12 2.12" />
                <path d="m16.95 16.95 2.12 2.12" />
                <path d="m4.93 19.07 2.12-2.12" />
                <path d="m16.95 7.05 2.12-2.12" />
              </svg>
              <span>Agent</span>
            </Link>
          </nav>
        </div>

        {/* Bottom Section - Logout */}
        <div className="pt-3 border-t border-[#ECE7DF] mt-auto font-dm-sans">
          <button
            type="button"
            onClick={handleInitiateLogout}
            className="w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-[#524E48] hover:text-[#701A23] hover:bg-[#F8EAE7]/70 font-medium text-[13px] transition text-left cursor-pointer group"
          >
            <LogOut className="w-[18px] h-[18px] text-[#524E48] group-hover:text-[#701A23] transition-colors" />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={showLogoutConfirm}
        isLoggingOut={isLoggingOut}
        onClose={() => {
          if (!isLoggingOut) setShowLogoutConfirm(false);
        }}
        onConfirm={handleConfirmLogout}
      />
    </>
  );
}
